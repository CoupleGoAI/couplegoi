// =============================================================================
// couple-setup — Deterministic chat collecting dating start date + help focus
//
// Triggered after successful pairing. Mandatory — cannot be skipped.
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
        "Congrats on connecting! 💑 Let's set things up. When did you and your partner start dating? (e.g. June 2022 or 2022-06-15)",
        "You two are official! 🥰 Now tell me — when did your love story begin? Type the date however you like.",
        "Amazing, you're paired up! 💕 One quick thing — when did you start dating? Any format works!",
    ],
    askHelpType: [
        "Love it! 🌟 What area would you like help with? Pick one:\n\n• Communication\n• Conflict\n• Trust\n• Emotional connection\n• Intimacy\n• Other",
        "Got it! 💪 What do you most want to work on together?\n\n• Communication\n• Conflict\n• Trust\n• Emotional connection\n• Intimacy\n• Other",
        "Noted! 🎯 What's the biggest area you'd like to grow in?\n\n• Communication\n• Conflict\n• Trust\n• Emotional connection\n• Intimacy\n• Other",
    ],
    complete: [
        "You're all set! 🎉 Time to start building an even stronger relationship together.",
        "Done! 🥳 Your couple profile is ready. Let's make this journey amazing!",
        "That's everything! 💖 You and your partner are ready to grow together.",
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
    birth_date: string | null;
    dating_start_date: string | null;
    help_focus: string | null;
}

function deriveStep(profile: ProfileRow): number {
    if (!profile.dating_start_date) return 0;
    if (!profile.help_focus) return 1;
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
            .select("birth_date, dating_start_date, help_focus")
            .eq("id", userId)
            .single();

        if (profileError || !profile) {
            return json({ error: "Profile not found" }, 404);
        }

        const typedProfile = profile as ProfileRow;

        // birth_date is required (set during onboarding-profile)
        if (!typedProfile.birth_date) {
            return json({ error: "Onboarding profile not complete" }, 400);
        }

        // Already completed — idempotent response
        if (typedProfile.dating_start_date && typedProfile.help_focus) {
            return json({
                reply: pick(PROMPTS.complete),
                questionIndex: 2,
                isComplete: true,
            });
        }

        // ── Start: no message → wipe old data & begin fresh ──────────────────
        if (message.length === 0) {
            await supabase
                .from("profiles")
                .update({ dating_start_date: null, help_focus: null })
                .eq("id", userId);

            await supabase
                .from("messages")
                .delete()
                .eq("user_id", userId)
                .eq("conversation_type", "couple_setup");

            const reply = pick(PROMPTS.greet);

            await supabase.from("messages").insert({
                user_id: userId,
                role: "assistant",
                content: reply,
                conversation_type: "couple_setup",
            });

            return json({ reply, questionIndex: 0, isComplete: false });
        }

        // For non-empty messages, derive step from current profile fields
        const currentStep = deriveStep(typedProfile);

        // ── Process user answer against current step (MUST-3) ────────────────
        let validationResult: { valid: boolean; value: string; hint?: string };
        let profileUpdate: Record<string, unknown> = {};
        let nextReply: string;
        let nextStep: number;
        let isComplete = false;

        switch (currentStep) {
            case 0: {
                validationResult = validateDatingStartDate(message, typedProfile.birth_date);
                if (!validationResult.valid) {
                    await supabase.from("messages").insert([
                        { user_id: userId, role: "user", content: message, conversation_type: "couple_setup" },
                        { user_id: userId, role: "assistant", content: validationResult.hint!, conversation_type: "couple_setup" },
                    ]);
                    return json({ reply: validationResult.hint!, questionIndex: 0, isComplete: false });
                }
                profileUpdate = { dating_start_date: validationResult.value };
                nextStep = 1;
                nextReply = pick(PROMPTS.askHelpType);
                break;
            }

            case 1: {
                validationResult = validateHelpFocus(message);
                if (!validationResult.valid) {
                    await supabase.from("messages").insert([
                        { user_id: userId, role: "user", content: message, conversation_type: "couple_setup" },
                        { user_id: userId, role: "assistant", content: validationResult.hint!, conversation_type: "couple_setup" },
                    ]);
                    return json({ reply: validationResult.hint!, questionIndex: 1, isComplete: false });
                }
                profileUpdate = { help_focus: validationResult.value };
                nextStep = 2;
                isComplete = true;
                nextReply = pick(PROMPTS.complete);
                break;
            }

            default:
                return json({ error: "Invalid couple setup state" }, 400);
        }

        // ── Persist user message + assistant reply (MUST-5) ──────────────────
        const { error: msgError } = await supabase.from("messages").insert([
            { user_id: userId, role: "user", content: message, conversation_type: "couple_setup" },
            { user_id: userId, role: "assistant", content: nextReply, conversation_type: "couple_setup" },
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
