// Background couple-memory updater. Two-step pipeline: deterministic redaction
// (no LLM) → policy-bounded JSON merge via the shared LLM provider → strict
// validation → upsert. Runs via EdgeRuntime.waitUntil after the SSE response
// has flushed, so it never affects chat latency. Any failure is swallowed.
//
// Provider-agnostic: uses the shared LLMProvider interface. The deterministic
// redaction is the security floor — it runs regardless of which provider is
// active, and runs BEFORE any provider call.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LLMProvider } from "../_shared/llm/types.ts";
import { coupleMemoryProfile, withJsonModel } from "../_shared/llm/profiles.ts";
import { redact } from "../_shared/redact.ts";
import { logWarn } from "../_shared/log.ts";

export interface CoupleMemoryRow {
  summary: string;
  traits: Record<string, string>;
  message_count: number;
}

const COUPLE_TRAIT_KEYS = [
  "shared_values",
  "communication_style",
  "recurring_topics",
  "shared_goals",
  "rituals",
  "shared_wins",
] as const;

type CoupleTraitKey = typeof COUPLE_TRAIT_KEYS[number];

const MAX_MEMORY_CHARS = 3000;
const MAX_SUMMARY_CHARS = 400;
const MAX_TRAIT_CHARS = 300;

// ─── Merger prompt ───────────────────────────────────────────────────────────

const MERGER_SYSTEM_PROMPT = `You maintain a SHARED memory for a couple using a relationship-advice app.
Partners are referenced as Partner A and Partner B. You will never see their real names.
BOTH partners will see anything you save. Your job is to record ONLY facts about THEM AS A COUPLE that are safe and neutral for both to see.

DO SAVE:
- Shared values, stated shared goals, rituals they already do together, shared wins, recurring relationship topics framed neutrally (e.g. "money conversations are tense").

NEVER SAVE:
- Anything that could embarrass or expose either partner: health, mental health, substance use, sexual content, money shame, past relationships, infidelity hints, legal issues, workplace issues, family secrets.
- One partner's private feelings about the other ("Partner A resents Partner B for X").
- Anything that takes sides or assigns blame.
- Names, emails, phone numbers, addresses, tokens, or any identifying detail.
- Anything you are unsure about. When in doubt, omit it.

Output JSON only with this exact shape, no extra keys:
{"summary": string, "traits": {"shared_values": string, "communication_style": string, "recurring_topics": string, "shared_goals": string, "rituals": string, "shared_wins": string}}

Rules:
- summary: max 400 characters, neutral third-person, about the pair as a whole. Never use real names — refer to them as "the couple" or via the role labels ("Partner A" / "Partner B").
- Each trait value: max 300 characters or empty string "".
- Merge new turns into existing memory. Preserve durable facts, drop ephemeral details, drop anything that on re-read looks unsafe.
- Total output must be under 3000 characters.
- If the new turns contain nothing safe to add, return the existing memory unchanged.
- Never invent facts.`;

export interface RedactedTurn {
  speaker: "A" | "B" | "assistant";
  text: string;
}

function buildUserPrompt(
  existing: CoupleMemoryRow | null,
  redactedTurns: RedactedTurn[],
): string {
  const existingJson = existing
    ? JSON.stringify({ summary: existing.summary, traits: existing.traits })
    : "none";
  const turnsBlock = redactedTurns
    .map((t) => {
      const label =
        t.speaker === "A"
          ? "Partner A"
          : t.speaker === "B"
            ? "Partner B"
            : "assistant";
      return `${label}: ${t.text}`;
    })
    .join("\n");
  return `EXISTING MEMORY:
${existingJson}

RECENT COUPLE TURNS (already redacted — do not infer beyond these):
${turnsBlock}`;
}

// ─── Validation + clamp ──────────────────────────────────────────────────────

function validateParsed(raw: unknown): {
  summary: string;
  traits: Record<string, string>;
} | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.summary !== "string") return null;
  if (typeof obj.traits !== "object" || obj.traits === null) return null;

  const traitsIn = obj.traits as Record<string, unknown>;
  // Strict: any unknown key → reject the entire output (policy drift signal).
  for (const k of Object.keys(traitsIn)) {
    if (!(COUPLE_TRAIT_KEYS as readonly string[]).includes(k)) return null;
  }
  const traits: Record<string, string> = {};
  for (const key of COUPLE_TRAIT_KEYS) {
    const v = traitsIn[key];
    if (typeof v === "string" && v.trim().length > 0) {
      traits[key as CoupleTraitKey] = v.trim().slice(0, MAX_TRAIT_CHARS);
    }
  }
  return { summary: obj.summary.trim().slice(0, MAX_SUMMARY_CHARS), traits };
}

function clampJsonSize(
  summary: string,
  traits: Record<string, string>,
): { summary: string; traits: Record<string, string> } {
  let s = summary;
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

// ─── Public API ──────────────────────────────────────────────────────────────

interface CoupleCorrectionRow {
  id: string;
  instruction: string;
}

export interface UpdateCoupleMemoryArgs {
  supabase: SupabaseClient;
  provider: LLMProvider;
  model: string;
  coupleId: string;
  existingMemory: CoupleMemoryRow | null;
  rawTurns: Array<{ speaker: "A" | "B" | "assistant"; text: string }>;
  nameA: string;
  nameB: string;
}

export async function updateCoupleMemory(
  args: UpdateCoupleMemoryArgs,
): Promise<void> {
  const {
    supabase,
    provider,
    model,
    coupleId,
    existingMemory,
    rawTurns,
    nameA,
    nameB,
  } = args;
  void nameA;
  void nameB;
  try {
    // Step 1: redact every turn before anything leaves Deno.
    const redactedTurns: RedactedTurn[] = rawTurns.map((t) => ({
      speaker: t.speaker,
      text: redact(t.text).text,
    }));

    // Step 2: fetch pending couple corrections.
    const { data: correctionRows } = await supabase
      .from("memory_corrections")
      .select("id, instruction")
      .eq("scope", "couple")
      .eq("owner_id", coupleId)
      .is("applied_at", null)
      .limit(5);

    const corrections = (correctionRows ?? []) as CoupleCorrectionRow[];

    const correctionsBlock = corrections.length > 0
      ? `\n\nPENDING CORRECTIONS (apply these — both partners want to fix the memory):\n${
        corrections.map((c) => `- ${redact(c.instruction).text}`).join("\n")
      }`
      : "";

    // Step 3: merge via provider.
    const raw = await provider.complete(
      [
        { role: "system", content: MERGER_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildUserPrompt(existingMemory, redactedTurns) + correctionsBlock,
        },
      ],
      withJsonModel(coupleMemoryProfile, model),
    );
    const parsed = JSON.parse(raw);
    const validated = validateParsed(parsed);
    if (!validated) throw new Error("invalid_shape");
    const clamped = clampJsonSize(validated.summary, validated.traits);

    const { error } = await supabase.from("couple_memory").upsert(
      {
        couple_id: coupleId,
        summary: clamped.summary,
        traits: clamped.traits,
        message_count: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "couple_id" },
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
    logWarn({
      feature: "ai-chat",
      event: "couple_memory_update_failed",
      code,
      coupleId,
    });
  }
}

export async function bumpCoupleMessageCount(
  supabase: SupabaseClient,
  coupleId: string,
  hasExisting: boolean,
  currentCount: number,
  by: number,
): Promise<void> {
  try {
    if (hasExisting) {
      await supabase
        .from("couple_memory")
        .update({
          message_count: currentCount + by,
          updated_at: new Date().toISOString(),
        })
        .eq("couple_id", coupleId);
    } else {
      await supabase.from("couple_memory").insert({
        couple_id: coupleId,
        summary: "",
        traits: {},
        message_count: by,
      });
    }
  } catch {
    // swallow
  }
}
