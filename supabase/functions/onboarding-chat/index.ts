// =============================================================================
// onboarding-chat — deterministic 4-question onboarding state machine
//
// Auth pattern:
//   - verify_jwt = false (ES256 project — gateway cannot validate user JWTs)
//   - Auth is verified internally via the Supabase Auth REST API
//   - DB operations use a service-role client (bypasses RLS safely after auth)
//
// Flow:
//   message="" → return current question (start or resume)
//   message="…" → validate → persist → return next question or completion
//
// Output: { reply: string, questionIndex: number, isComplete: boolean }
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as chrono from "https://esm.sh/chrono-node@2";

// ─── CORS ─────────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ─── Prompt Variants ──────────────────────────────────────────────────────────

const pick = (arr: string[]): string =>
  arr[Math.floor(Math.random() * arr.length)];

const PROMPTS = {
  greeting: [
    "Hey! 👋 Welcome to CoupleGoAI. I'm here to help you and your partner thrive together. First things first — what's your first name?",
    "Hi there! 💕 So excited to meet you! I'm your relationship guide. Quick question to kick things off — what should I call you?",
    "Welcome! 🌸 Let's get you set up. To start, what's your first name?",
  ],
  nameReask: [
    "Hmm, I didn't quite catch that 😊 Just your first name — letters only, please!",
    "Let's try that again! What's your first name? (Letters and hyphens only 😄)",
  ],
  birthDate: [
    "Nice to meet you, {name}! 🎂 When were you born? (You can type something like 'March 12, 1997' or '1997-03-12')",
    "Love that name, {name}! 🎉 What's your birthday? Try something like 'Dec 5, 1995' or '05/12/1995'",
    "Great, {name}! 🌟 What's your date of birth? Any format works — 'Jan 1, 2000', '2000-01-01', etc.",
  ],
  birthDateReask: [
    "Hmm, I couldn't parse that date 🤔 Try something like '1997-03-12' or 'March 12, 1997'",
    "Let me try again — what's your birth date? Format like 'Dec 5, 1995' or '05/12/95' works great!",
  ],
  datingStart: [
    "Aw, that's so sweet 🥰 When did you and your partner start dating? (Same deal — any date format works!)",
    "Love it! 💑 When did your relationship officially begin? Type it however you like!",
    "Amazing! 🌹 When did you two become official? Any date format is fine!",
  ],
  datingStartReask: [
    "Hmm, couldn't read that date 🤔 Try something like 'June 2020' or '2020-06-15'",
    "Let me try again — when did you start dating? A format like 'Jan 2022' or '15/06/2020' works!",
  ],
  helpType: [
    "You two sound amazing together! 💖 Last question — what area would you most like to work on as a couple?",
    "Almost done! 🎊 What kind of support are you looking for most in your relationship?",
    "So close! 🌈 What would you love to focus on together?",
  ],
  helpTypeReask: [
    "Please pick one of the options above! 😊 Which area feels most important to you?",
    "Tap one of the options — which one resonates most with you right now?",
  ],
  complete: [
    "You're all set, {name}! 🎉 Your profile is ready. Time to connect with your partner and start your journey together!",
    "That's a wrap, {name}! 🚀 Everything looks great. Let's get you connected with your partner!",
    "Perfect, {name}! 💫 You're all set up. Let's bring you and your partner together!",
  ],
};

const VALID_HELP_OPTIONS = new Set([
  "communication",
  "conflict",
  "trust",
  "emotional_connection",
  "intimacy",
  "other",
]);

// ─── Validation ───────────────────────────────────────────────────────────────

const NAME_RE = /^[a-zA-Z\s'\-]{2,50}$/;

function validateName(value: string): string | null {
  const trimmed = value.trim();
  if (!NAME_RE.test(trimmed)) return null;
  return trimmed;
}

interface ParsedDate {
  iso: string; // YYYY-MM-DD
  jsDate: Date;
}

function parseDate(value: string): ParsedDate | null {
  const results = chrono.parse(value, new Date(), { forwardDate: false });
  if (!results.length) return null;
  const d = results[0].start.date();
  if (isNaN(d.getTime())) return null;
  const iso = d.toISOString().split("T")[0];
  return { iso, jsDate: d };
}

function ageFromDate(birth: Date): number {
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function validateHelpType(value: string): string | null {
  const normalised = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (VALID_HELP_OPTIONS.has(normalised)) return normalised;
  return null;
}

// ─── Step derivation ──────────────────────────────────────────────────────────
// Derive current onboarding step from profile fields.
// Returns 0-based index of the next question to ask.

interface Profile {
  name: string | null;
  birth_date: string | null;
  dating_start_date: string | null;
  help_focus: string | null;
}

function deriveStep(profile: Profile): number {
  if (!profile.name) return 0;
  if (!profile.birth_date) return 1;
  if (!profile.dating_start_date) return 2;
  if (!profile.help_focus) return 3;
  return 4; // complete
}

// ─── Main ─────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing authorization header" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Verify JWT via Auth REST API (handles ES256 — gateway only supports HS256)
  const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: anonKey },
  });
  if (!authRes.ok) return json({ error: "Auth failed" }, 401);

  const authUser = (await authRes.json()) as { id: string };
  const userId = authUser.id;
  if (!userId) return json({ error: "Auth failed: no user id" }, 401);

  // ── DB client (service role — RLS bypassed after identity verification) ─────
  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // ── Parse request body ──────────────────────────────────────────────────────
  let body: { message?: string } = {};
  try {
    body = (await req.json()) as { message?: string };
  } catch {
    // empty body is fine — treated as empty message (start/resume)
  }
  const rawMessage = typeof body.message === "string" ? body.message.trim() : "";

  // ── Load current profile ────────────────────────────────────────────────────
  const { data: profileRow, error: profileError } = await db
    .from("profiles")
    .select("name, birth_date, dating_start_date, help_focus, onboarding_completed")
    .eq("id", userId)
    .single();

  if (profileError || !profileRow) {
    return json({ error: "Profile not found" }, 404);
  }

  const profile = profileRow as Profile & { onboarding_completed: boolean };

  // Already complete — idempotent
  if (profile.onboarding_completed) {
    return json({ reply: "You're already all set! 🎉", questionIndex: 4, isComplete: true });
  }

  const step = deriveStep(profile);

  // ── Empty message = start/resume: return current question ──────────────────
  if (!rawMessage) {
    const reply = buildPrompt(step, profile.name);
    await persistMessage(db, userId, "assistant", reply);
    return json({ reply, questionIndex: step, isComplete: false });
  }

  // ── Process answer for current step ────────────────────────────────────────
  switch (step) {
    case 0: {
      // Question: first name
      const validName = validateName(rawMessage);
      if (!validName) {
        const reply = pick(PROMPTS.nameReask);
        await persistBoth(db, userId, rawMessage, reply);
        return json({ reply, questionIndex: 0, isComplete: false });
      }
      await db.from("profiles").update({ name: validName }).eq("id", userId);
      await persistMessage(db, userId, "user", rawMessage);
      const reply = pick(PROMPTS.birthDate).replace("{name}", validName);
      await persistMessage(db, userId, "assistant", reply);
      return json({ reply, questionIndex: 1, isComplete: false });
    }

    case 1: {
      // Question: birth date
      const parsed = parseDate(rawMessage);
      const now = new Date();
      if (!parsed || parsed.jsDate >= now) {
        const reply = pick(PROMPTS.birthDateReask);
        await persistBoth(db, userId, rawMessage, reply);
        return json({ reply, questionIndex: 1, isComplete: false });
      }
      const age = ageFromDate(parsed.jsDate);
      if (age < 16 || age > 110) {
        const reply = pick(PROMPTS.birthDateReask);
        await persistBoth(db, userId, rawMessage, reply);
        return json({ reply, questionIndex: 1, isComplete: false });
      }
      await db
        .from("profiles")
        .update({ birth_date: parsed.iso })
        .eq("id", userId);
      await persistMessage(db, userId, "user", rawMessage);
      const reply = pick(PROMPTS.datingStart);
      await persistMessage(db, userId, "assistant", reply);
      return json({ reply, questionIndex: 2, isComplete: false });
    }

    case 2: {
      // Question: dating start date
      const parsed = parseDate(rawMessage);
      const now = new Date();
      if (!parsed || parsed.jsDate >= now) {
        const reply = pick(PROMPTS.datingStartReask);
        await persistBoth(db, userId, rawMessage, reply);
        return json({ reply, questionIndex: 2, isComplete: false });
      }
      // Must be after birth date
      if (profile.birth_date) {
        const birthParsed = parseDate(profile.birth_date);
        if (birthParsed && parsed.jsDate <= birthParsed.jsDate) {
          const reply = pick(PROMPTS.datingStartReask);
          await persistBoth(db, userId, rawMessage, reply);
          return json({ reply, questionIndex: 2, isComplete: false });
        }
      }
      await db
        .from("profiles")
        .update({ dating_start_date: parsed.iso })
        .eq("id", userId);
      await persistMessage(db, userId, "user", rawMessage);
      const reply = pick(PROMPTS.helpType);
      await persistMessage(db, userId, "assistant", reply);
      return json({ reply, questionIndex: 3, isComplete: false });
    }

    case 3: {
      // Question: help focus
      const helpType = validateHelpType(rawMessage);
      if (!helpType) {
        const reply = pick(PROMPTS.helpTypeReask);
        await persistBoth(db, userId, rawMessage, reply);
        return json({ reply, questionIndex: 3, isComplete: false });
      }
      await db
        .from("profiles")
        .update({ help_focus: helpType, onboarding_completed: true })
        .eq("id", userId);
      await persistMessage(db, userId, "user", rawMessage);
      const name = profile.name ?? "there";
      const reply = pick(PROMPTS.complete).replace("{name}", name);
      await persistMessage(db, userId, "assistant", reply);
      return json({ reply, questionIndex: 4, isComplete: true });
    }

    default:
      return json({ reply: "You're already all set! 🎉", questionIndex: 4, isComplete: true });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPrompt(step: number, name: string | null): string {
  switch (step) {
    case 0:
      return pick(PROMPTS.greeting);
    case 1:
      return pick(PROMPTS.birthDate).replace("{name}", name ?? "there");
    case 2:
      return pick(PROMPTS.datingStart);
    case 3:
      return pick(PROMPTS.helpType);
    default:
      return pick(PROMPTS.complete).replace("{name}", name ?? "there");
  }
}

async function persistMessage(
  db: ReturnType<typeof createClient>,
  userId: string,
  role: "user" | "assistant",
  content: string,
): Promise<void> {
  await db.from("messages").insert({
    user_id: userId,
    role,
    content,
    conversation_type: "onboarding",
  });
}

async function persistBoth(
  db: ReturnType<typeof createClient>,
  userId: string,
  userContent: string,
  assistantReply: string,
): Promise<void> {
  await persistMessage(db, userId, "user", userContent);
  await persistMessage(db, userId, "assistant", assistantReply);
}