// =============================================================================
// couple-setup — Deterministic chat collecting dating start date + help focus
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

function errorResponse(error: string, status = 500, details?: unknown): Response {
    return json(
        {
            error,
            ...(details ? { details } : {}),
        },
        status,
    );
}

function logError(label: string, error: unknown, extra?: Record<string, unknown>) {
    console.error(
        JSON.stringify({
            label,
            error,
            extra,
            ts: new Date().toISOString(),
        }),
    );
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

// ─── Step derivation from profile ────────────────────────────────────────────

interface ProfileRow {
    birth_date: string | null;
    dating_start_date: string | null;
    help_focus: string | null;
}

function deriveStep(profile: ProfileRow): number {
    if (!profile.dating_start_date) return 0;
    if (!profile.help_focus) return 1;
    return 2;
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

async function insertMessages(
    supabase: ReturnType<typeof createClient>,
    userId: string,
    messages: Array<{ role: "user" | "assistant"; content: string }>,
) {
    const payload = messages.map((m) => ({
        user_id: userId,
        role: m.role,
        content: m.content,
        conversation_type: "couple_setup",
    }));

    const { error } = await supabase.from("messages").insert(payload);
    return { error };
}

// ─── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: CORS_HEADERS });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return errorResponse("Missing authorization", 401);
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !anonKey || !serviceRoleKey) {
            logError("ENV_MISSING", {
                hasSupabaseUrl: !!supabaseUrl,
                hasAnonKey: !!anonKey,
                hasServiceRoleKey: !!serviceRoleKey,
            });

            return errorResponse("Server configuration error", 500);
        }

        const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                Authorization: authHeader,
                apikey: anonKey,
            },
        });

        if (!authResponse.ok) {
            const authText = await authResponse.text();
            logError("AUTH_FAILED", authText, { status: authResponse.status });
            return errorResponse("Authentication failed", 401);
        }

        const authUser = (await authResponse.json()) as { id: string };
        const userId = authUser.id;

        const supabase = createClient(supabaseUrl, serviceRoleKey);

        let message = "";
        try {
            const body = await req.json();
            if (typeof body.message === "string") {
                message = body.message.trim().slice(0, 500);
            }
        } catch {
            message = "";
        }

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("birth_date, dating_start_date, help_focus")
            .eq("id", userId)
            .single();

        if (profileError || !profile) {
            logError("PROFILE_FETCH_FAILED", profileError, { userId });
            return errorResponse("Profile not found", 404, profileError);
        }

        const typedProfile = profile as ProfileRow;

        if (!typedProfile.birth_date) {
            return errorResponse("Onboarding profile not complete", 400);
        }

        if (typedProfile.dating_start_date && typedProfile.help_focus) {
            return json({
                reply: pick(PROMPTS.complete),
                questionIndex: 2,
                isComplete: true,
            });
        }

        // ── Start flow ──────────────────────────────────────────────────────────
        if (message.length === 0) {
            const { error: resetProfileError } = await supabase
                .from("profiles")
                .update({
                    dating_start_date: null,
                    help_focus: null,
                })
                .eq("id", userId);

            if (resetProfileError) {
                logError("RESET_PROFILE_FAILED", resetProfileError, { userId });
                return errorResponse("Failed to reset couple setup profile", 500, resetProfileError);
            }

            const reply = pick(PROMPTS.greet);

            const { error: insertGreetingError } = await insertMessages(supabase, userId, [
                { role: "assistant", content: reply },
            ]);

            if (insertGreetingError) {
                logError("INSERT_GREETING_FAILED", insertGreetingError, { userId, reply });
                return errorResponse("Failed to save greeting message", 500, insertGreetingError);
            }

            return json({
                reply,
                questionIndex: 0,
                isComplete: false,
            });
        }

        // ── Progress flow ───────────────────────────────────────────────────────
        const currentStep = deriveStep(typedProfile);

        if (currentStep === 0) {
            const result = validateDatingStartDate(message, typedProfile.birth_date);

            if (!result.valid) {
                const { error: insertError } = await insertMessages(supabase, userId, [
                    { role: "user", content: message },
                    { role: "assistant", content: result.hint! },
                ]);

                if (insertError) {
                    logError("INSERT_REASK_DATING_FAILED", insertError, { userId, message });
                    return errorResponse("Failed to save messages", 500, insertError);
                }

                return json({
                    reply: result.hint!,
                    questionIndex: 0,
                    isComplete: false,
                });
            }

            const nextReply = pick(PROMPTS.askHelpType);

            const { error: msgError } = await insertMessages(supabase, userId, [
                { role: "user", content: message },
                { role: "assistant", content: nextReply },
            ]);

            if (msgError) {
                logError("INSERT_STEP0_MESSAGES_FAILED", msgError, { userId, message });
                return errorResponse("Failed to save messages", 500, msgError);
            }

            const { error: updateError } = await supabase
                .from("profiles")
                .update({ dating_start_date: result.value })
                .eq("id", userId);

            if (updateError) {
                logError("UPDATE_DATING_START_FAILED", updateError, {
                    userId,
                    dating_start_date: result.value,
                });
                return errorResponse("Failed to update profile", 500, updateError);
            }

            return json({
                reply: nextReply,
                questionIndex: 1,
                isComplete: false,
            });
        }

        if (currentStep === 1) {
            const result = validateHelpFocus(message);

            if (!result.valid) {
                const { error: insertError } = await insertMessages(supabase, userId, [
                    { role: "user", content: message },
                    { role: "assistant", content: result.hint! },
                ]);

                if (insertError) {
                    logError("INSERT_REASK_HELP_FAILED", insertError, { userId, message });
                    return errorResponse("Failed to save messages", 500, insertError);
                }

                return json({
                    reply: result.hint!,
                    questionIndex: 1,
                    isComplete: false,
                });
            }

            const nextReply = pick(PROMPTS.complete);

            const { error: msgError } = await insertMessages(supabase, userId, [
                { role: "user", content: message },
                { role: "assistant", content: nextReply },
            ]);

            if (msgError) {
                logError("INSERT_STEP1_MESSAGES_FAILED", msgError, { userId, message });
                return errorResponse("Failed to save messages", 500, msgError);
            }

            const { error: updateError } = await supabase
                .from("profiles")
                .update({ help_focus: result.value })
                .eq("id", userId);

            if (updateError) {
                logError("UPDATE_HELP_FOCUS_FAILED", updateError, {
                    userId,
                    help_focus: result.value,
                });
                return errorResponse("Failed to update profile", 500, updateError);
            }

            return json({
                reply: nextReply,
                questionIndex: 2,
                isComplete: true,
            });
        }

        return errorResponse("Invalid couple setup state", 400);
    } catch (err) {
        logError(
            "UNHANDLED_COUPLE_SETUP_ERROR",
            err instanceof Error
                ? {
                    name: err.name,
                    message: err.message,
                    stack: err.stack,
                }
                : err,
        );

        return errorResponse(
            "Internal server error",
            500,
            err instanceof Error
                ? {
                    name: err.name,
                    message: err.message,
                    stack: err.stack,
                }
                : String(err),
        );
    }
});