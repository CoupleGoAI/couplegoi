// =============================================================================
// couple-setup — Deterministic chat collecting dating start date + help focus
// Answers are stored in the couples table (shared between both partners).
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
        "Congrats on connecting! 💑 Pick your dating start date below.",
        "You two are official! 🥰 Choose the date you started dating.",
        "Amazing, you're paired up! 💕 Select your dating start date.",
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
        "Hmm, that date didn't work. Please use the date picker to choose when you started dating.",
        "Something went wrong with that date. Try picking it again from the picker below.",
    ],
    reaskHelpType: [
        "Please pick one of: communication, conflict, trust, emotional_connection, intimacy, or other 🎯",
        "I need one of the options: communication, conflict, trust, emotional_connection, intimacy, or other",
    ],
};

// ─── Validation helpers ──────────────────────────────────────────────────────

function validateDatingStartDate(
    input: string,
): { valid: boolean; value: string; hint?: string } {
    const trimmed = input.trim();
    const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
    let normalizedDate = "";
    const dateOnlyMatch = DATE_ONLY_RE.exec(trimmed);

    if (dateOnlyMatch) {
        const year = Number(dateOnlyMatch[1]);
        const month = Number(dateOnlyMatch[2]);
        const day = Number(dateOnlyMatch[3]);
        const parsedDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

        const isExactDate = parsedDate.getUTCFullYear() === year &&
            parsedDate.getUTCMonth() === month - 1 &&
            parsedDate.getUTCDate() === day;

        if (!isExactDate) {
            return { valid: false, value: "", hint: pick(PROMPTS.reaskDatingStart) };
        }

        normalizedDate = trimmed;
    } else {
        const parsedFromIsoLike = new Date(trimmed);
        if (Number.isNaN(parsedFromIsoLike.getTime())) {
            return { valid: false, value: "", hint: pick(PROMPTS.reaskDatingStart) };
        }
        normalizedDate = parsedFromIsoLike.toISOString().slice(0, 10);
    }

    const parsed = new Date(normalizedDate + "T12:00:00Z");

    if (Number.isNaN(parsed.getTime())) {
        return { valid: false, value: "", hint: pick(PROMPTS.reaskDatingStart) };
    }

    if (parsed.getFullYear() < 1900) {
        return { valid: false, value: "", hint: pick(PROMPTS.reaskDatingStart) };
    }

    // Allow today — compare date-only (ignore time)
    const nowDate = new Date().toISOString().split("T")[0];
    if (normalizedDate > nowDate) {
        return { valid: false, value: "", hint: pick(PROMPTS.reaskDatingStart) };
    }

    return { valid: true, value: normalizedDate };
}

function validateHelpFocus(input: string): { valid: boolean; value: string; hint?: string } {
    const normalized = input.trim().toLowerCase().replace(/\s+/g, "_");

    if (!HELP_FOCUS_VALUES.has(normalized)) {
        return { valid: false, value: "", hint: pick(PROMPTS.reaskHelpType) };
    }

    return { valid: true, value: normalized };
}

// ─── Step derivation from couple row ─────────────────────────────────────────

interface CoupleRow {
    id: string;
    dating_start_date: string | null;
    help_focus: string | null;
}

interface ProfileRow {
    birth_date: string | null;
    couple_id: string | null;
}

function deriveStep(couple: CoupleRow): number {
    if (!couple.dating_start_date) return 0;
    if (!couple.help_focus) return 1;
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

        // ── Verify identity ─────────────────────────────────────────────────
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

        // ── Rate limiting: 10 requests per minute per user ─────────────────
        const { data: withinLimit, error: rateLimitError } = await supabase.rpc("check_rate_limit", {
            p_user_id: userId,
            p_endpoint: "couple-setup",
            p_max_per_minute: 10,
        });
        if (rateLimitError || !withinLimit) {
            return errorResponse("Too many requests. Please wait a moment.", 429);
        }

        // ── Parse body ──────────────────────────────────────────────────────
        let message = "";
        try {
            const body = await req.json();
            if (typeof body.message === "string") {
                message = body.message.trim().slice(0, 500);
            }
        } catch {
            message = "";
        }

        // ── Fetch profile (birth_date + couple_id) ─────────────────────────
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("birth_date, couple_id")
            .eq("id", userId)
            .single();

        if (profileError || !profile) {
            logError("PROFILE_FETCH_FAILED", profileError, { userId });
            return errorResponse("Profile not found", 404);
        }

        const typedProfile = profile as ProfileRow;

        if (!typedProfile.couple_id) {
            return errorResponse("Not paired with a partner yet", 400);
        }

        const coupleId = typedProfile.couple_id;

        // ── Fetch couple row (shared setup state) ──────────────────────────
        const { data: coupleData, error: coupleError } = await supabase
            .from("couples")
            .select("id, dating_start_date, help_focus")
            .eq("id", coupleId)
            .single();

        if (coupleError || !coupleData) {
            logError("COUPLE_FETCH_FAILED", coupleError, { userId, coupleId });
            return errorResponse("Couple not found", 404);
        }

        const couple = coupleData as CoupleRow;

        // ── Already complete ────────────────────────────────────────────────
        if (couple.dating_start_date && couple.help_focus) {
            return json({
                reply: pick(PROMPTS.complete),
                questionIndex: 2,
                isComplete: true,
            });
        }

        // ── Start flow (empty message = greeting for fresh start, or resume) ─
        if (message.length === 0) {
            const currentStep = deriveStep(couple);

            // Only reset when no progress has been made yet.
            // If setup is in progress, resume at the current step instead of
            // wiping data that the other partner may have already submitted.
            if (currentStep > 0) {
                const resumeReply = currentStep === 1
                    ? pick(PROMPTS.askHelpType)
                    : pick(PROMPTS.greet);
                return json({
                    reply: resumeReply,
                    questionIndex: currentStep,
                    isComplete: false,
                });
            }

            const { error: resetError } = await supabase
                .from("couples")
                .update({
                    dating_start_date: null,
                    help_focus: null,
                })
                .eq("id", coupleId);

            if (resetError) {
                logError("RESET_COUPLE_FAILED", resetError, { userId, coupleId });
                return errorResponse("Failed to reset couple setup", 500);
            }

            const reply = pick(PROMPTS.greet);

            const { error: insertGreetingError } = await insertMessages(supabase, userId, [
                { role: "assistant", content: reply },
            ]);

            if (insertGreetingError) {
                logError("INSERT_GREETING_FAILED", insertGreetingError, { userId });
                return errorResponse("Failed to save greeting message", 500);
            }

            return json({
                reply,
                questionIndex: 0,
                isComplete: false,
            });
        }

        // ── Progress flow ───────────────────────────────────────────────────
        const currentStep = deriveStep(couple);

        if (currentStep === 0) {
            const result = validateDatingStartDate(message);

            if (!result.valid) {
                const { error: insertError } = await insertMessages(supabase, userId, [
                    { role: "user", content: message },
                    { role: "assistant", content: result.hint! },
                ]);

                if (insertError) {
                    logError("INSERT_REASK_DATING_FAILED", insertError, { userId, message });
                    return errorResponse("Failed to save messages", 500);
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
                return errorResponse("Failed to save messages", 500);
            }

            const { error: updateError } = await supabase
                .from("couples")
                .update({ dating_start_date: result.value })
                .eq("id", coupleId);

            if (updateError) {
                logError("UPDATE_DATING_START_FAILED", updateError, {
                    userId,
                    coupleId,
                    dating_start_date: result.value,
                });
                return errorResponse("Failed to update couple", 500);
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
                    return errorResponse("Failed to save messages", 500);
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
                return errorResponse("Failed to save messages", 500);
            }

            const { error: updateError } = await supabase
                .from("couples")
                .update({ help_focus: result.value })
                .eq("id", coupleId);

            if (updateError) {
                logError("UPDATE_HELP_FOCUS_FAILED", updateError, {
                    userId,
                    coupleId,
                    help_focus: result.value,
                });
                return errorResponse("Failed to update couple", 500);
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

        return errorResponse("Internal server error", 500);
    }
});
