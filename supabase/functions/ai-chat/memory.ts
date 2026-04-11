// Background user-memory updater. Runs via EdgeRuntime.waitUntil after the
// SSE response has flushed, so it never affects chat latency. Any failure is
// swallowed — the old memory row is preserved.

import type { SupabaseClient } from "@supabase/supabase-js";

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
  // Hard summary cap first — never let trait pressure eat the whole summary.
  let s = summary.slice(0, MAX_SUMMARY_CHARS);
  let t = { ...traits };
  const size = () => JSON.stringify({ summary: s, traits: t }).length;

  while (size() > MAX_MEMORY_CHARS) {
    // drop the longest trait value
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

async function callGroqJson(
  groqKey: string,
  prompt: string,
): Promise<unknown> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      stream: false,
      max_tokens: 800,
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`groq_${res.status}`);
  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("groq_empty");
  return JSON.parse(content);
}

export interface RecentTurn {
  role: "user" | "assistant";
  content: string;
}

function buildPrompt(
  existing: UserMemoryRow | null,
  recentTurns: RecentTurn[],
): string {
  const existingJson = existing
    ? JSON.stringify({ summary: existing.summary, traits: existing.traits })
    : "none";
  const turnsBlock = recentTurns.map((t) => `${t.role}: ${t.content}`).join("\n");
  return `You maintain a short memory about a user of a relationship-advice app. Merge new insights from their recent turns into the existing memory. Keep durable facts (personality, values, recurring patterns, goals, fears, likes, dislikes, pain points, preferences, past experiences). Drop ephemeral details.

Output JSON only with this exact shape:
{"summary": string, "traits": {"personality": string, "likes": string, "dislikes": string, "fears": string, "experiences": string, "pain_points": string, "preferences": string, "goals": string}}

Rules:
- Total output must be under 3000 characters.
- Leave any trait value as "" if unknown or not yet observed.
- summary is a single short paragraph (max 400 chars) capturing who this person is.
- Never invent facts. Only write what the conversation actually supports.

EXISTING MEMORY:
${existingJson}

RECENT TURNS:
${turnsBlock}`;
}

export interface UpdateMemoryArgs {
  supabase: SupabaseClient;
  groqKey: string;
  userId: string;
  existingMemory: UserMemoryRow | null;
  recentTurns: RecentTurn[];
}

export async function updateMemory(args: UpdateMemoryArgs): Promise<void> {
  const { supabase, groqKey, userId, existingMemory, recentTurns } = args;
  try {
    const raw = await callGroqJson(
      groqKey,
      buildPrompt(existingMemory, recentTurns),
    );
    const validated = validateParsed(raw);
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
  } catch (err) {
    const name = err instanceof Error ? err.message : "unknown";
    console.warn(`memory update failed: ${name}`);
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
