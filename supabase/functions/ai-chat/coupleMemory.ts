// Background couple-memory updater. Two-step pipeline: deterministic redaction
// (no LLM) → policy-bounded JSON merge via Groq → strict validation → upsert.
// Runs via EdgeRuntime.waitUntil after the SSE response has flushed, so it
// never affects chat latency. Any failure is swallowed; the old row is kept.

import type { SupabaseClient } from "@supabase/supabase-js";

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
const MAX_TURN_CHARS = 800;

// ─── Step 1: deterministic redaction ─────────────────────────────────────────

const REDACT_PATTERNS: Array<{ re: RegExp; replacement: string }> = [
  // emails
  { re: /[\w.+-]+@[\w-]+\.[\w.-]+/g, replacement: "[redacted]" },
  // urls
  { re: /https?:\/\/\S+/gi, replacement: "[redacted]" },
  // IPv4
  { re: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: "[redacted]" },
  // long hex / api-key-like tokens
  { re: /\b(?:sk|pk|rk)_[A-Za-z0-9_-]{8,}\b/g, replacement: "[redacted]" },
  { re: /\b[A-Fa-f0-9]{20,}\b/g, replacement: "[redacted]" },
  // IBAN-ish (country code + 13+ alphanumerics)
  { re: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g, replacement: "[redacted]" },
  // phone (loose: 7+ digits with optional separators / leading +)
  { re: /\+?\d[\d\s().-]{7,}\d/g, replacement: "[redacted]" },
  // long bare digit runs (account numbers, card-like)
  { re: /\b\d{9,}\b/g, replacement: "[redacted]" },
];

export function redact(
  text: string,
  knownNames: ReadonlyArray<string>,
): { text: string; droppedAnything: boolean } {
  let out = text.length > MAX_TURN_CHARS ? text.slice(0, MAX_TURN_CHARS) : text;
  let dropped = out.length !== text.length;

  for (const { re, replacement } of REDACT_PATTERNS) {
    if (re.test(out)) {
      dropped = true;
      out = out.replace(re, replacement);
    }
  }

  // Mask third-party proper nouns: any Capitalized word that isn't sentence-start
  // and isn't one of the partners' names. Crude on purpose.
  const allowed = new Set(
    knownNames
      .filter((n): n is string => typeof n === "string" && n.length > 0)
      .map((n) => n.toLowerCase()),
  );
  out = out.replace(/(?<=\S\s)([A-Z][a-z]{2,})/g, (match) => {
    if (allowed.has(match.toLowerCase())) return match;
    dropped = true;
    return "someone";
  });

  return { text: out, droppedAnything: dropped };
}

// ─── Step 2: merge via Groq with explicit policy ─────────────────────────────

const MERGER_SYSTEM_PROMPT = `You maintain a SHARED memory for a couple using a relationship-advice app.
BOTH partners will see anything you save. Your job is to record ONLY facts about THEM AS A COUPLE that are safe and neutral for both to see.

DO SAVE:
- Shared values, stated shared goals, rituals they already do together, shared wins, recurring relationship topics framed neutrally (e.g. "money conversations are tense").

NEVER SAVE:
- Anything that could embarrass or expose either partner: health, mental health, substance use, sexual content, money shame, past relationships, infidelity hints, legal issues, workplace issues, family secrets.
- One partner's private feelings about the other ("A resents B for X").
- Anything that takes sides or assigns blame.
- Names of third parties.
- Any secrets, addresses, account numbers, phone numbers, URLs, tokens.
- Anything you are unsure about. When in doubt, omit it.

Output JSON only with this exact shape, no extra keys:
{"summary": string, "traits": {"shared_values": string, "communication_style": string, "recurring_topics": string, "shared_goals": string, "rituals": string, "shared_wins": string}}

Rules:
- summary: max 400 characters, neutral third-person, about the pair as a whole.
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
  nameA: string,
  nameB: string,
): string {
  const existingJson = existing
    ? JSON.stringify({ summary: existing.summary, traits: existing.traits })
    : "none";
  const turnsBlock = redactedTurns
    .map((t) => {
      const label =
        t.speaker === "A" ? `[${nameA}]` : t.speaker === "B" ? `[${nameB}]` : "assistant";
      return `${label}: ${t.text}`;
    })
    .join("\n");
  return `EXISTING MEMORY:
${existingJson}

RECENT COUPLE TURNS (already redacted — do not infer beyond these):
${turnsBlock}`;
}

async function callGroqJson(
  groqKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<unknown> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
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

export interface UpdateCoupleMemoryArgs {
  supabase: SupabaseClient;
  groqKey: string;
  coupleId: string;
  existingMemory: CoupleMemoryRow | null;
  rawTurns: Array<{ speaker: "A" | "B" | "assistant"; text: string }>;
  nameA: string;
  nameB: string;
}

export async function updateCoupleMemory(args: UpdateCoupleMemoryArgs): Promise<void> {
  const { supabase, groqKey, coupleId, existingMemory, rawTurns, nameA, nameB } = args;
  try {
    // Step 1: redact every turn before anything leaves Deno.
    const redactedTurns: RedactedTurn[] = rawTurns.map((t) => ({
      speaker: t.speaker,
      text: redact(t.text, [nameA, nameB]).text,
    }));

    // Step 2: merge.
    const raw = await callGroqJson(
      groqKey,
      MERGER_SYSTEM_PROMPT,
      buildUserPrompt(existingMemory, redactedTurns, nameA, nameB),
    );
    const validated = validateParsed(raw);
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
  } catch (err) {
    const name = err instanceof Error ? err.message : "unknown";
    console.warn(`couple memory update failed: ${name}`);
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
