// =============================================================================
// CoupleGoAI — Onboarding Chat Edge Function (Deterministic)
// =============================================================================
// A state-machine that walks new users through 4 profile questions:
//   0 → first name   1 → birth date   2 → dating start   3 → help focus
//
// No AI. Validation + persistence + predefined assistant prompts.
// Resumable: current step is derived from profile columns, not message count.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS ─────────────────────────────────────────────────────────────────────

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_QUESTIONS = 4;
const MAX_MESSAGE_LENGTH = 500;

const HELP_OPTIONS = [
  "communication",
  "conflict",
  "trust",
  "emotional_connection",
  "intimacy",
  "other",
] as const;

type HelpFocus = (typeof HELP_OPTIONS)[number];

// ─── Assistant Prompts ────────────────────────────────────────────────────────

function greetingPrompt(): string {
  return (
    "Hey there! 💕 Welcome to CoupleGoAI — so happy you're here! " +
    "Let's personalize things real quick.\n\nWhat's your first name?"
  );
}

function birthDatePrompt(name: string): string {
  return (
    `Love that, ${name}! ✨ Now, when's your birthday? ` +
    "You can type it however you like — like 1997-03-12 or March 12, 1997."
  );
}

function datingStartPrompt(): string {
  return (
    "Amazing! 🎂 And when did you and your partner start dating? " +
    "Same thing — any format works!"
  );
}

function helpFocusPrompt(): string {
  return (
    "Almost done! 🌟 What kind of support would help you two the most? Pick one:\n\n" +
    "• communication\n• conflict\n• trust\n• emotional_connection\n• intimacy\n• other"
  );
}

function completionMsg(name: string): string {
  return `You're all set, ${name}! 🎉 Your profile is ready — let's start your couple journey together!`;
}

const REASK: Record<number, string> = {
  0: "Just your first name would be perfect 😊 Letters, spaces, apostrophes, and hyphens only — no numbers or emojis!",
  1: "Hmm, I couldn't quite get that date 🤔 Try something like: 1997-03-12 or March 12, 1997",
  2: "I couldn't parse that one 😅 Try: 2023-06-15 or June 15, 2023. It should be after your birthday and not in the future!",
  3: "Please pick one of these exactly:\n\n• communication\n• conflict\n• trust\n• emotional_connection\n• intimacy\n• other",
};

// ─── Validation Helpers ───────────────────────────────────────────────────────

interface ValidationOk {
  valid: true;
  value: string;
}
interface ValidationFail {
  valid: false;
}
type ValidationResult = ValidationOk | ValidationFail;

// ── Name ──────────────────────────────────────────────────────────────────────

function validateName(input: string): ValidationResult {
  const trimmed = input.trim();
  if (trimmed.length < 2 || trimmed.length > 50) return { valid: false };
  // Allow letters (any script via Unicode categories), spaces, apostrophes, hyphens
  if (!/^[\p{L}\s'\-]+$/u.test(trimmed)) return { valid: false };
  return { valid: true, value: trimmed };
}

// ── Date parsing ──────────────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/** Guard against JS Date silent overflow (e.g. Feb 30 → Mar 2). */
function isDateComponents(d: Date, y: number, m: number, day: number): boolean {
  return d.getFullYear() === y && d.getMonth() === m && d.getDate() === day;
}

function tryBuild(y: number, m: number, d: number): Date | null {
  const dt = new Date(y, m, d);
  return isDateComponents(dt, y, m, d) ? dt : null;
}

function parseDate(input: string): Date | null {
  const s = input.trim();

  // ISO: YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const d = tryBuild(+iso[1], +iso[2] - 1, +iso[3]);
    if (d) return d;
  }

  // US: MM/DD/YYYY
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) {
    const d = tryBuild(+us[3], +us[1] - 1, +us[2]);
    if (d) return d;
  }

  // EU: DD.MM.YYYY
  const eu = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (eu) {
    const d = tryBuild(+eu[3], +eu[2] - 1, +eu[1]);
    if (d) return d;
  }

  // "Month DD, YYYY" or "Month DD YYYY"
  const m1 = s.match(/^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m1) {
    const mn = MONTHS[m1[1].toLowerCase()];
    if (mn !== undefined) {
      const d = tryBuild(+m1[3], mn, +m1[2]);
      if (d) return d;
    }
  }

  // "DD Month YYYY"
  const m2 = s.match(/^(\d{1,2})\s+([a-zA-Z]+),?\s+(\d{4})$/);
  if (m2) {
    const mn = MONTHS[m2[2].toLowerCase()];
    if (mn !== undefined) {
      const d = tryBuild(+m2[3], mn, +m2[1]);
      if (d) return d;
    }
  }

  return null;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ── Birth date ────────────────────────────────────────────────────────────────

function validateBirthDate(input: string): ValidationResult {
  const date = parseDate(input);
  if (!date) return { valid: false };
  const now = new Date();
  if (date >= now) return { valid: false };
  const age = now.getFullYear() - date.getFullYear();
  if (age < 16 || age > 110) return { valid: false };
  return { valid: true, value: toISODate(date) };
}

// ── Dating start date ─────────────────────────────────────────────────────────

function validateDatingStart(
  input: string,
  birthDateISO: string,
): ValidationResult {
  const date = parseDate(input);
  if (!date) return { valid: false };
  const now = new Date();
  if (date >= now) return { valid: false };
  const birth = new Date(birthDateISO + "T00:00:00");
  if (date <= birth) return { valid: false };
  return { valid: true, value: toISODate(date) };
}

// ── Help focus ────────────────────────────────────────────────────────────────

function validateHelpFocus(input: string): ValidationResult {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, "_");
  if ((HELP_OPTIONS as readonly string[]).includes(normalized)) {
    return { valid: true, value: normalized as HelpFocus };
  }
  return { valid: false };
}

// ─── Profile State & Step Derivation ──────────────────────────────────────────

interface ProfileFields {
  name: string | null;
  birth_date: string | null;
  dating_start_date: string | null;
  help_focus: string | null;
  onboarding_completed: boolean;
}

function deriveStep(p: ProfileFields): number {
  if (!p.name) return 0;
  if (!p.birth_date) return 1;
  if (!p.dating_start_date) return 2;
  if (!p.help_focus) return 3;
  return TOTAL_QUESTIONS; // 4 — all done
}

function promptForStep(step: number, profile: ProfileFields): string {
  switch (step) {
    case 0:
      return greetingPrompt();
    case 1:
      return birthDatePrompt(profile.name ?? "");
    case 2:
      return datingStartPrompt();
    case 3:
      return helpFocusPrompt();
    default:
      return completionMsg(profile.name ?? "friend");
  }
}

// ─── Message Persistence ──────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
type AdminClient = ReturnType<typeof createClient<any>>;

async function storeMessage(
  admin: AdminClient,
  userId: string,
  role: "user" | "assistant",
  content: string,
): Promise<{ ok: boolean }> {
  const { error } = await admin.from("messages").insert({
    user_id: userId,
    role,
    content,
    conversation_type: "onboarding",
  });
  return { ok: !error };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    // ── 1. Authenticate ────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return json({ error: "Missing auth token" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User-scoped client — only for JWT verification
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return json({ error: "Invalid auth token" }, 401);
    }

    // Admin client — bypasses RLS for controlled writes
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // ── 2. Parse body ──────────────────────────────────────────────────────
    let message = "";
    try {
      const body = await req.json();
      if (typeof body?.message === "string") {
        message = body.message;
      }
    } catch {
      // Empty / unparsable body → treat as resume/start
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return json({ error: "Message too long" }, 400);
    }

    // ── 3. Load profile ────────────────────────────────────────────────────
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select(
        "name, birth_date, dating_start_date, help_focus, onboarding_completed",
      )
      .eq("id", user.id)
      .single();

    if (profileErr || !profile) {
      return json({ error: "Profile not found" }, 500);
    }

    const fields: ProfileFields = {
      name: profile.name ?? null,
      birth_date: profile.birth_date ?? null,
      dating_start_date: profile.dating_start_date ?? null,
      help_focus: profile.help_focus ?? null,
      onboarding_completed: profile.onboarding_completed === true,
    };

    const step = deriveStep(fields);

    // ── 4. Already complete → short-circuit ────────────────────────────────
    if (fields.onboarding_completed || step >= TOTAL_QUESTIONS) {
      return json({
        reply: completionMsg(fields.name ?? "friend"),
        questionIndex: TOTAL_QUESTIONS,
        isComplete: true,
      });
    }

    // ── 5. Empty message → return current question (start / resume) ───────
    if (!message.trim()) {
      const prompt = promptForStep(step, fields);

      // Persist greeting only if no onboarding messages exist yet
      const { count } = await admin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("conversation_type", "onboarding");

      if ((count ?? 0) === 0) {
        const stored = await storeMessage(admin, user.id, "assistant", prompt);
        if (!stored.ok) {
          return json({ error: "Internal server error" }, 500);
        }
      }

      return json({
        reply: prompt,
        questionIndex: step,
        isComplete: false,
      });
    }

    // ── 6. Non-empty message → validate & advance ─────────────────────────

    // Store user message
    const userMsgResult = await storeMessage(admin, user.id, "user", message);
    if (!userMsgResult.ok) {
      return json({ error: "Internal server error" }, 500);
    }

    // Validate against current step
    let validation: ValidationResult;
    let profileUpdate: Record<string, unknown> = {};

    switch (step) {
      case 0:
        validation = validateName(message);
        if (validation.valid) profileUpdate = { name: validation.value };
        break;
      case 1:
        validation = validateBirthDate(message);
        if (validation.valid) profileUpdate = { birth_date: validation.value };
        break;
      case 2:
        validation = validateDatingStart(message, fields.birth_date!);
        if (validation.valid)
          profileUpdate = { dating_start_date: validation.value };
        break;
      case 3:
        validation = validateHelpFocus(message);
        if (validation.valid) profileUpdate = { help_focus: validation.value };
        break;
      default:
        validation = { valid: false };
    }

    // ── Invalid → re-ask ──────────────────────────────────────────────────
    if (!validation.valid) {
      const reask =
        REASK[step] ?? "Sorry, I didn't get that. Could you try again?";
      const reaskResult = await storeMessage(admin, user.id, "assistant", reask);
      if (!reaskResult.ok) {
        return json({ error: "Internal server error" }, 500);
      }
      return json({
        reply: reask,
        questionIndex: step,
        isComplete: false,
      });
    }

    // ── Valid → update profile & advance ──────────────────────────────────
    const nextStep = step + 1;
    const isComplete = nextStep >= TOTAL_QUESTIONS;

    if (isComplete) {
      profileUpdate.onboarding_completed = true;
    }

    const { error: updateErr } = await admin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", user.id);

    if (updateErr) {
      return json({ error: "Internal server error" }, 500);
    }

    // Build the next assistant message
    const updatedFields: ProfileFields = {
      ...fields,
      ...(profileUpdate as Partial<ProfileFields>),
      onboarding_completed: isComplete,
    };

    const reply = isComplete
      ? completionMsg(updatedFields.name ?? "friend")
      : promptForStep(nextStep, updatedFields);

    const replyResult = await storeMessage(admin, user.id, "assistant", reply);
    if (!replyResult.ok) {
      return json({ error: "Internal server error" }, 500);
    }

    return json({
      reply,
      questionIndex: nextStep,
      isComplete,
    });
  } catch (_err) {
    // Generic error — never expose internals
    return json({ error: "Internal server error" }, 500);
  }
});