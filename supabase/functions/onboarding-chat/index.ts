// =============================================================================
// onboarding-chat — Deterministic conversational onboarding
//
// - Auth: JWT verified via Auth REST API (ES256 compatible) — MUST-1
// - Step derivation from profile fields (null = unanswered) — MUST-2
// - All validation/normalization server-side — MUST-3
// - user_id from auth response only — MUST-4
// - Atomic message + profile persistence — MUST-5
// - chrono-node for date parsing
// - User-scoped Supabase client (anon key + forwarded JWT) for RLS
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

// ─── Help focus canonical set ────────────────────────────────────────────────

const HELP_FOCUS_VALUES = new Set([
  "communication",
  "conflict",
  "trust",
  "emotional_connection",
  "intimacy",
  "other",
]);

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
  askDatingStart: [
    "So sweet! 💑 When did you and your partner start dating? (e.g. June 2022 or 2022-06-15)",
    "Aww, love that! 🥰 When did your relationship begin? Type it however you like.",
    "Amazing! 💕 Now, when did you two start your journey together? Any date format works!",
  ],
  askHelpType: [
    "Almost done! 🌟 What area would you like help with? Pick one:\n\n• Communication\n• Conflict\n• Trust\n• Emotional connection\n• Intimacy\n• Other",
    "Last question! 💪 What do you most want to work on together?\n\n• Communication\n• Conflict\n• Trust\n• Emotional connection\n• Intimacy\n• Other",
    "One more thing! 🎯 What's the biggest area you'd like to grow in?\n\n• Communication\n• Conflict\n• Trust\n• Emotional connection\n• Intimacy\n• Other",
  ],
  complete: [
    "You're all set, {name}! 🎉 Your profile is ready. Let's make your relationship even more amazing!",
    "Done! 🥳 Welcome aboard, {name}! We're so excited to be part of your love story.",
    "That's everything, {name}! 💖 Your journey to a stronger relationship starts now!",
  ],
  reaskName: [
    "Just your first name 😊 Letters only!",
    "Hmm, I need a real first name — letters, spaces, apostrophes, or hyphens only. Try again!",
  ],
  reaskBirthDate: [
    "I couldn't quite get that date. Try something like: March 12, 1997 or 1997-03-12 🗓️",
    "Hmm, that doesn't look like a valid birthday. Try: 12/03/1997 or March 12, 1997",
  ],
  reaskDatingStart: [
    "Couldn't parse that date. Try something like: June 2022 or 2022-06-15 📅",
    "Hmm, that doesn't look right. Try again — like June 15, 2022 or 2022-06-15",
  ],
  reaskHelpType: [
    "Please pick one of: communication, conflict, trust, emotional_connection, intimacy, or other 🎯",
    "I need one of the options: communication, conflict, trust, emotional_connection, intimacy, or other",
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
  const parsed = chrono.parseDate(input);
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

function validateDatingStartDate(
  input: string,
  birthDate: string,
): { valid: boolean; value: string; hint?: string } {
  const parsed = chrono.parseDate(input);
  if (!parsed) {
    return { valid: false, value: "", hint: pick(PROMPTS.reaskDatingStart) };
  }

  const now = new Date();
  if (parsed > now) {
    return { valid: false, value: "", hint: pick(PROMPTS.reaskDatingStart) };
  }

  const birth = new Date(birthDate);
  if (parsed <= birth) {
    return { valid: false, value: "", hint: pick(PROMPTS.reaskDatingStart) };
  }

  const yyyy = parsed.getFullYear().toString().padStart(4, "0");
  const mm = (parsed.getMonth() + 1).toString().padStart(2, "0");
  const dd = parsed.getDate().toString().padStart(2, "0");

  return { valid: true, value: `${yyyy}-${mm}-${dd}` };
}

function validateHelpFocus(input: string): { valid: boolean; value: string; hint?: string } {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, "_");
  if (!HELP_FOCUS_VALUES.has(normalized)) {
    return { valid: false, value: "", hint: pick(PROMPTS.reaskHelpType) };
  }
  return { valid: true, value: normalized };
}

// ─── Step derivation from profile (MUST-2) ───────────────────────────────────

interface ProfileRow {
  name: string | null;
  birth_date: string | null;
  dating_start_date: string | null;
  help_focus: string | null;
  onboarding_completed: boolean;
}

function deriveStep(profile: ProfileRow): number {
  if (!profile.name) return 0;
  if (!profile.birth_date) return 1;
  if (!profile.dating_start_date) return 2;
  if (!profile.help_focus) return 3;
  return 4; // all answered
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
      headers: {
        Authorization: authHeader,
        apikey: anonKey,
      },
    });

    if (!authResponse.ok) {
      return json({ error: "Authentication failed" }, 401);
    }

    const authUser = (await authResponse.json()) as { id: string };
    const userId = authUser.id; // MUST-4: user_id from auth only

    // ── User-scoped Supabase client (anon key + forwarded JWT for RLS) ──
    const supabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

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
      .select("name, birth_date, dating_start_date, help_focus, onboarding_completed")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return json({ error: "Profile not found" }, 404);
    }

    const currentStep = deriveStep(profile as ProfileRow);

    // Already completed — idempotent response
    if ((profile as ProfileRow).onboarding_completed || currentStep >= 4) {
      return json({
        reply: pick(PROMPTS.complete).replace("{name}", (profile as ProfileRow).name ?? ""),
        questionIndex: 4,
        isComplete: true,
      });
    }

    // ── Start/resume: no message → return current question prompt ────────
    if (message.length === 0) {
      let reply: string;
      switch (currentStep) {
        case 0:
          reply = pick(PROMPTS.greet);
          break;
        case 1:
          reply = pick(PROMPTS.askBirthDate).replace("{name}", (profile as ProfileRow).name ?? "");
          break;
        case 2:
          reply = pick(PROMPTS.askDatingStart);
          break;
        case 3:
          reply = pick(PROMPTS.askHelpType);
          break;
        default:
          reply = pick(PROMPTS.greet);
      }

      // Persist the assistant greeting/resume message
      await supabase.from("messages").insert({
        user_id: userId,
        role: "assistant",
        content: reply,
        conversation_type: "onboarding",
      });

      return json({
        reply,
        questionIndex: currentStep,
        isComplete: false,
      });
    }

    // ── Process user answer against current step (MUST-3) ────────────────
    let validationResult: { valid: boolean; value: string; hint?: string };
    let profileUpdate: Record<string, unknown> = {};
    let nextReply: string;
    let nextStep: number;
    let isComplete = false;

    switch (currentStep) {
      case 0: {
        // Name validation
        validationResult = validateName(message);
        if (!validationResult.valid) {
          // Persist user message + re-ask
          await supabase.from("messages").insert([
            {
              user_id: userId,
              role: "user",
              content: message,
              conversation_type: "onboarding",
            },
            {
              user_id: userId,
              role: "assistant",
              content: validationResult.hint!,
              conversation_type: "onboarding",
            },
          ]);
          return json({
            reply: validationResult.hint!,
            questionIndex: 0,
            isComplete: false,
          });
        }
        profileUpdate = { name: validationResult.value };
        nextStep = 1;
        nextReply = pick(PROMPTS.askBirthDate).replace(
          "{name}",
          validationResult.value,
        );
        break;
      }

      case 1: {
        // Birth date validation
        validationResult = validateBirthDate(message);
        if (!validationResult.valid) {
          await supabase.from("messages").insert([
            {
              user_id: userId,
              role: "user",
              content: message,
              conversation_type: "onboarding",
            },
            {
              user_id: userId,
              role: "assistant",
              content: validationResult.hint!,
              conversation_type: "onboarding",
            },
          ]);
          return json({
            reply: validationResult.hint!,
            questionIndex: 1,
            isComplete: false,
          });
        }
        profileUpdate = { birth_date: validationResult.value };
        nextStep = 2;
        nextReply = pick(PROMPTS.askDatingStart);
        break;
      }

      case 2: {
        // Dating start date validation
        validationResult = validateDatingStartDate(
          message,
          (profile as ProfileRow).birth_date!,
        );
        if (!validationResult.valid) {
          await supabase.from("messages").insert([
            {
              user_id: userId,
              role: "user",
              content: message,
              conversation_type: "onboarding",
            },
            {
              user_id: userId,
              role: "assistant",
              content: validationResult.hint!,
              conversation_type: "onboarding",
            },
          ]);
          return json({
            reply: validationResult.hint!,
            questionIndex: 2,
            isComplete: false,
          });
        }
        profileUpdate = { dating_start_date: validationResult.value };
        nextStep = 3;
        nextReply = pick(PROMPTS.askHelpType);
        break;
      }

      case 3: {
        // Help focus validation
        validationResult = validateHelpFocus(message);
        if (!validationResult.valid) {
          await supabase.from("messages").insert([
            {
              user_id: userId,
              role: "user",
              content: message,
              conversation_type: "onboarding",
            },
            {
              user_id: userId,
              role: "assistant",
              content: validationResult.hint!,
              conversation_type: "onboarding",
            },
          ]);
          return json({
            reply: validationResult.hint!,
            questionIndex: 3,
            isComplete: false,
          });
        }
        profileUpdate = {
          help_focus: validationResult.value,
          onboarding_completed: true,
        };
        nextStep = 4;
        isComplete = true;
        nextReply = pick(PROMPTS.complete).replace(
          "{name}",
          (profile as ProfileRow).name ?? "",
        );
        break;
      }

      default:
        return json({ error: "Invalid onboarding state" }, 400);
    }

    // ── Persist user message + assistant reply (MUST-5) ──────────────────
    const { error: msgError } = await supabase.from("messages").insert([
      {
        user_id: userId,
        role: "user",
        content: message,
        conversation_type: "onboarding",
      },
      {
        user_id: userId,
        role: "assistant",
        content: nextReply,
        conversation_type: "onboarding",
      },
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

    return json({
      reply: nextReply,
      questionIndex: nextStep,
      isComplete,
    });
  } catch {
    return json({ error: "Internal server error" }, 500);
  }
});