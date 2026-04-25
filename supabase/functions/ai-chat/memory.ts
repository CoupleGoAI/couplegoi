// Background user-memory updater. Runs via EdgeRuntime.waitUntil after the
// SSE response has flushed, so it never affects chat latency. Any failure is
// swallowed — the old memory row is preserved.
//
// Provider-agnostic: routes all LLM calls through the shared LLMProvider
// interface so swapping Groq ↔ Claude ↔ future providers is zero-code here.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LLMProvider } from "../_shared/llm/types.ts";
import { memoryProfile, withJsonModel } from "../_shared/llm/profiles.ts";
import { redact } from "../_shared/redact.ts";
import { logWarn } from "../_shared/log.ts";

export interface UserMemoryRow {
  summary: string;
  traits: Record<string, string>;
  message_count: number;
}

const TRAIT_KEYS = [
  "personality",
  "likes",
  "dislikes",
  "fears",
  "experiences",
  "pain_points",
  "preferences",
  "goals",
] as const;

const MAX_MEMORY_CHARS = 3000;
const MAX_SUMMARY_CHARS = 400;

function clamp(summary: string, traits: Record<string, string>): {
  summary: string;
  traits: Record<string, string>;
} {
  let s = summary.slice(0, MAX_SUMMARY_CHARS);
  let t = { ...traits };
  const size = () => JSON.stringify({ summary: s, traits: t }).length;

  while (size() > MAX_MEMORY_CHARS) {
    const entries = Object.entries(t);
    if (entries.length === 0) break;
    entries.sort((a, b) => b[1].length - a[1].length);
    const [longestKey] = entries[0];
    delete t[longestKey];
  }
  if (size() > MAX_MEMORY_CHARS) {
    s = s.slice(0, Math.max(0, MAX_MEMORY_CHARS - 100));
  }
  return { summary: s, traits: t };
}

function validateParsed(raw: unknown): {
  summary: string;
  traits: Record<string, string>;
} | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const summary = typeof obj.summary === "string" ? obj.summary : null;
  if (summary === null) return null;
  const traitsIn = obj.traits;
  if (typeof traitsIn !== "object" || traitsIn === null) return null;
  const traits: Record<string, string> = {};
  for (const key of TRAIT_KEYS) {
    const v = (traitsIn as Record<string, unknown>)[key];
    if (typeof v === "string" && v.trim().length > 0) {
      traits[key] = v.trim();
    }
  }
  return { summary: summary.trim(), traits };
}

export interface RecentTurn {
  role: "user" | "assistant";
  content: string;
}

interface CorrectionRow {
  id: string;
  target_kind: string | null;
  target_key: string | null;
  instruction: string;
}

// Build the prompt. User content is redacted and referenced by role token
// only — raw names, emails, and identifying data never reach the LLM here.
function buildPrompt(
  existing: UserMemoryRow | null,
  recentTurns: RecentTurn[],
  corrections: CorrectionRow[] = [],
): string {
  const existingJson = existing
    ? JSON.stringify({ summary: existing.summary, traits: existing.traits })
    : "none";
  const turnsBlock = recentTurns
    .map((t) => {
      const speaker = t.role === "user" ? "Partner A" : "assistant";
      const clean = redact(t.content).text;
      return `${speaker}: ${clean}`;
    })
    .join("\n");
  const correctionsBlock = corrections.length > 0
    ? `\n\nPENDING USER CORRECTIONS (apply these — the user wants to fix the memory):\n${corrections.map((c) => `- ${redact(c.instruction).text}`).join("\n")}`
    : "";
  return `You maintain a short memory about the user (Partner A) of a relationship-advice app. Merge new insights from their recent turns into the existing memory. Keep durable facts (personality, values, recurring patterns, goals, fears, likes, dislikes, pain points, preferences, past experiences). Drop ephemeral details.

Never mention any real names, emails, phone numbers, addresses, or third-party identifiers. If you see any, omit them.

Output JSON only with this exact shape:
{"summary": string, "traits": {"personality": string, "likes": string, "dislikes": string, "fears": string, "experiences": string, "pain_points": string, "preferences": string, "goals": string}}

Rules:
- Total output must be under 3000 characters.
- Leave any trait value as "" if unknown or not yet observed.
- summary is a single short paragraph (max 400 chars) capturing who this person is.
- Never invent facts. Only write what the conversation actually supports.

EXISTING MEMORY:
${existingJson}

RECENT TURNS (already sanitized — do not infer beyond these):
${turnsBlock}${correctionsBlock}`;
}

export interface UpdateMemoryArgs {
  supabase: SupabaseClient;
  provider: LLMProvider;
  model: string;
  userId: string;
  existingMemory: UserMemoryRow | null;
  recentTurns: RecentTurn[];
}

export async function updateMemory(args: UpdateMemoryArgs): Promise<void> {
  const { supabase, provider, model, userId, existingMemory, recentTurns } = args;
  try {
    // Fetch pending corrections before building the prompt.
    const { data: correctionRows } = await supabase
      .from("memory_corrections")
      .select("id, target_kind, target_key, instruction")
      .eq("scope", "user")
      .eq("owner_id", userId)
      .is("applied_at", null)
      .limit(5);

    const corrections = (correctionRows ?? []) as CorrectionRow[];

    const prompt = buildPrompt(existingMemory, recentTurns, corrections);
    const raw = await provider.complete(
      [{ role: "user", content: prompt }],
      withJsonModel(memoryProfile, model),
    );
    const parsed = JSON.parse(raw);
    const validated = validateParsed(parsed);
    if (!validated) throw new Error("invalid_shape");
    const clamped = clamp(validated.summary, validated.traits);

    const { error } = await supabase.from("user_memory").upsert(
      {
        user_id: userId,
        summary: clamped.summary,
        traits: clamped.traits,
        message_count: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error("upsert_failed");

    if (corrections.length > 0) {
      await supabase
        .from("memory_corrections")
        .update({ applied_at: new Date().toISOString() })
        .in("id", corrections.map((c) => c.id));
    }
  } catch (err) {
    const code = err instanceof Error ? err.message : "unknown";
    logWarn({ feature: "ai-chat", event: "memory_update_failed", code, userId });
  }
}

export async function bumpMessageCount(
  supabase: SupabaseClient,
  userId: string,
  hasExisting: boolean,
  currentCount: number,
  by: number,
): Promise<void> {
  try {
    if (hasExisting) {
      await supabase
        .from("user_memory")
        .update({
          message_count: currentCount + by,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    } else {
      await supabase.from("user_memory").insert({
        user_id: userId,
        summary: "",
        traits: {},
        message_count: by,
      });
    }
  } catch {
    // swallow
  }
}
