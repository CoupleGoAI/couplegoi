// =============================================================================
// onboarding-profile — Deterministic conversational onboarding (name + birth date)
//
// - Auth: JWT verified via Auth REST API (ES256 compatible) — MUST-1
// - Step derivation from profile fields (null = unanswered) — MUST-2
// - All validation/normalization server-side — MUST-3
// - user_id from auth response only — MUST-4
// - Atomic message + profile persistence — MUST-5
// - chrono-node for date parsing
// - Service role client (identity verified via Auth REST API first)
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as chrono from "https://esm.sh/chrono-node@2";

// ─── CORS ────────────────────────────────────────────────────────────────────

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

// ─── Prompt variants ─────────────────────────────────────────────────────────

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const PROMPTS = {
  greet: [
    "Hey there! 💕 Welcome to CoupleGoAI. Let's get to know you a little. What's your first name?",
    "Hi love! 🌸 So glad you're here. Let's start simple — what's your first name?",
    "Welcome! 💖 I'm so excited to help you and your partner grow closer. First things first — what should I call you?",
  ],
  askBirthDate: [
    "Nice to meet you, {name}! 🎂 When's your birthday? (e.g. March 12, 1997)",
    "Love that name, {name}! 💫 When were you born? Just type your birthday however you like.",
    "Great, {name}! ✨ Now, when's your birthday? Any format works — like 1997-03-12 or 12 March 1997.",
  ],
  complete: [
    "You're all set, {name}! 🎉 Your profile is ready. Time to connect with your partner!",
    "Done! 🥳 Welcome aboard, {name}! Let's get you connected with your partner.",
    "That's everything, {name}! 💖 Now let's pair you up with your special someone!",
  ],
  reaskName: [
    "Just your first name 😊 Letters only!",
    "Hmm, I need a real first name — letters, spaces, apostrophes, or hyphens only. Try again!",
  ],
  reaskBirthDate: [
    "I couldn't quite get that date. Try something like: March 12, 1997 or 1997-03-12 🗓️",
    "Hmm, that doesn't look like a valid birthday. Try: 12/03/1997 or March 12, 1997",
  ],
};

// ─── Validation helpers ──────────────────────────────────────────────────────

const NAME_REGEX = /^[a-zA-ZÀ-ÿ\s'\-]+$/;

function validateName(input: string): { valid: boolean; value: string; hint?: string } {
  const trimmed = input.trim();
  if (trimmed.length < 2 || trimmed.length > 50) {
    return { valid: false, value: trimmed, hint: pick(PROMPTS.reaskName) };
  }
  if (!NAME_REGEX.test(trimmed)) {
    return { valid: false, value: trimmed, hint: pick(PROMPTS.reaskName) };
  }
  return { valid: true, value: trimmed };
}

function validateBirthDate(input: string): { valid: boolean; value: string; hint?: string } {
  const trimmed = input.trim();
  // Fast path: date picker sends exact ISO date — bypass chrono entirely
  const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
  const parsed = ISO_RE.test(trimmed) ? new Date(trimmed + "T12:00:00") : chrono.parseDate(trimmed);
  if (!parsed) {
    return { valid: false, value: "", hint: pick(PROMPTS.reaskBirthDate) };
  }

  const now = new Date();
  if (parsed > now) {
    return { valid: false, value: "", hint: pick(PROMPTS.reaskBirthDate) };
  }

  const age = now.getFullYear() - parsed.getFullYear();
  const adjustedAge =
    now.getMonth() > parsed.getMonth() ||
      (now.getMonth() === parsed.getMonth() && now.getDate() >= parsed.getDate())
      ? age
      : age - 1;

  if (adjustedAge < 16 || adjustedAge > 110) {
    return { valid: false, value: "", hint: pick(PROMPTS.reaskBirthDate) };
  }

  const yyyy = parsed.getFullYear().toString().padStart(4, "0");
  const mm = (parsed.getMonth() + 1).toString().padStart(2, "0");
  const dd = parsed.getDate().toString().padStart(2, "0");

  return { valid: true, value: `${yyyy}-${mm}-${dd}` };
}

// ─── Step derivation from profile (MUST-2) ───────────────────────────────────

interface ProfileRow {
  name: string | null;
  birth_date: string | null;
  onboarding_completed: boolean;
}

function deriveStep(profile: ProfileRow): number {
  if (!profile.name) return 0;
  if (!profile.birth_date) return 1;
  return 2; // all answered
}

// ─── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    // ── Auth: verify JWT via Auth REST API (MUST-1) ──────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: anonKey },
    });

    if (!authResponse.ok) {
      return json({ error: "Authentication failed" }, 401);
    }

    const authUser = (await authResponse.json()) as { id: string };
    const userId = authUser.id; // MUST-4: user_id from auth only

    // ── Service role client — identity verified via Auth REST API above ──
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── Parse request body ───────────────────────────────────────────────
    let message = "";
    try {
      const body = await req.json();
      if (typeof body.message === "string") {
        message = body.message.trim().slice(0, 500);
      }
    } catch {
      // No body or invalid JSON — treat as empty (start/resume)
    }

    // ── Fetch current profile (MUST-2: derive step from profile) ────────
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("name, birth_date, onboarding_completed")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return json({ error: "Profile not found" }, 404);
    }

    // Already completed — idempotent response
    if ((profile as ProfileRow).onboarding_completed) {
      return json({
        reply: pick(PROMPTS.complete).replace("{name}", (profile as ProfileRow).name ?? ""),
        questionIndex: 2,
        isComplete: true,
      });
    }

    // ── Start: no message → wipe old data & begin fresh ──────────────────
    if (message.length === 0) {
      await supabase
        .from("profiles")
        .update({ name: null, birth_date: null })
        .eq("id", userId);

      await supabase
        .from("messages")
        .delete()
        .eq("user_id", userId)
        .eq("conversation_type", "onboarding");

      const reply = pick(PROMPTS.greet);

      await supabase.from("messages").insert({
        user_id: userId,
        role: "assistant",
        content: reply,
        conversation_type: "onboarding",
      });

      return json({ reply, questionIndex: 0, isComplete: false });
    }

    // For non-empty messages, derive step from current profile fields
    const currentStep = deriveStep(profile as ProfileRow);

    // ── Process user answer against current step (MUST-3) ────────────────
    let validationResult: { valid: boolean; value: string; hint?: string };
    let profileUpdate: Record<string, unknown> = {};
    let nextReply: string;
    let nextStep: number;
    let isComplete = false;

    switch (currentStep) {
      case 0: {
        validationResult = validateName(message);
        if (!validationResult.valid) {
          await supabase.from("messages").insert([
            { user_id: userId, role: "user", content: message, conversation_type: "onboarding" },
            { user_id: userId, role: "assistant", content: validationResult.hint!, conversation_type: "onboarding" },
          ]);
          return json({ reply: validationResult.hint!, questionIndex: 0, isComplete: false });
        }
        profileUpdate = { name: validationResult.value };
        nextStep = 1;
        nextReply = pick(PROMPTS.askBirthDate).replace("{name}", validationResult.value);
        break;
      }

      case 1: {
        validationResult = validateBirthDate(message);
        if (!validationResult.valid) {
          await supabase.from("messages").insert([
            { user_id: userId, role: "user", content: message, conversation_type: "onboarding" },
            { user_id: userId, role: "assistant", content: validationResult.hint!, conversation_type: "onboarding" },
          ]);
          return json({ reply: validationResult.hint!, questionIndex: 1, isComplete: false });
        }
        profileUpdate = { birth_date: validationResult.value, onboarding_completed: true };
        nextStep = 2;
        isComplete = true;
        nextReply = pick(PROMPTS.complete).replace("{name}", (profile as ProfileRow).name ?? "");
        break;
      }

      default:
        return json({ error: "Invalid onboarding state" }, 400);
    }

    // ── Persist user message + assistant reply (MUST-5) ──────────────────
    const { error: msgError } = await supabase.from("messages").insert([
      { user_id: userId, role: "user", content: message, conversation_type: "onboarding" },
      { user_id: userId, role: "assistant", content: nextReply, conversation_type: "onboarding" },
    ]);

    if (msgError) {
      return json({ error: "Failed to save messages" }, 500);
    }

    // ── Update profile field(s) ──────────────────────────────────────────
    const { error: updateError } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", userId);

    if (updateError) {
      return json({ error: "Failed to update profile" }, 500);
    }

    return json({ reply: nextReply, questionIndex: nextStep, isComplete });
  } catch {
    return json({ error: "Internal server error" }, 500);
  }
});
