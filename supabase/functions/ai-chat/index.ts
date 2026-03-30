import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

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

// ─── LLM Provider ────────────────────────────────────────────────────────────

interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LLMProvider {
  stream(messages: LLMMessage[]): AsyncIterable<string>;
}

class GroqProvider implements LLMProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async *stream(messages: LLMMessage[]): AsyncIterable<string> {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          stream: true,
          max_tokens: 200,
          temperature: 0.75,
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API error ${response.status}: ${errText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6).trim();
          if (data === "[DONE]") return;

          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const content = parsed.choices?.[0]?.delta?.content;
            if (typeof content === "string" && content.length > 0) {
              yield content;
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

// ─── System Prompts ───────────────────────────────────────────────────────────

interface ProfileInfo {
  name: string | null;
  coupled: boolean;
  datingStartDate: string | null;
  helpFocus: string | null;
}

function buildSystemPrompt(profile: ProfileInfo): string {
  const name = profile.name ?? "friend";
  const relationship = profile.coupled
    ? `in a relationship${profile.datingStartDate ? ` since ${profile.datingStartDate}` : ""}`
    : "single or exploring";
  const focus = profile.helpFocus
    ? ` Their focus right now: ${profile.helpFocus}.`
    : "";
  const today = new Date().toISOString().slice(0, 10);

  return `You are ${name}'s trusted companion in CoupleGoAI — warm, perceptive, and precise. Think of yourself as the brilliant friend who notices what's really happening and always finds the right words.

Keep every reply under 3 sentences. Start by naming what ${name} is actually feeling or experiencing, using their own words back to them. Then offer one honest insight — something that goes a little deeper than the surface. If it feels natural, end with one question that opens something new for ${name} to sit with.

Be warm but not saccharine. Be specific, never generic. Never give advice unless explicitly asked. Never use comfort clichés like "I hear you" or "that must be hard". Never ask more than one question.

About ${name}: ${relationship}.${focus} Today: ${today}.`;
}

function buildCoupleSystemPrompt(
  myName: string,
  partnerName: string,
  datingStartDate: string | null,
  helpFocus: string | null,
): string {
  const since = datingStartDate ? ` since ${datingStartDate}` : "";
  const focus = helpFocus ? ` Their shared focus: ${helpFocus}.` : "";
  const today = new Date().toISOString().slice(0, 10);

  return `You are the trusted companion of ${myName} and ${partnerName} in CoupleGoAI — warm, perceptive, and completely non-judgmental. You're here for both of them equally.

Keep every reply under 3 sentences. Start by naming what was just shared — acknowledge it precisely without taking sides. Then offer one insight that helps both of them see the situation a little more clearly. If it fits naturally, close with one question they can both sit with together.

Be warm, specific, and honest. Never take sides, never use generic reassurances, never give unsolicited advice, and never ask more than one question.

Their context: couple${since}.${focus} Today: ${today}.`;
}

// ─── Prompt Logging (local dev only) ─────────────────────────────────────────

async function logPrompt(systemPrompt: string, mode: "solo" | "couple"): Promise<void> {
  try {
    const separator = "─".repeat(60);
    const entry = `\n${separator}\n[${new Date().toISOString()}] mode=${mode}\n\n${systemPrompt}\n`;
    await Deno.writeTextFile("./prompt.log", entry, { append: true });
  } catch {
    // Silent in production — only works during local dev (supabase functions serve)
  }
}

// ─── Content Validation ──────────────────────────────────────────────────────

const MAX_CONTENT_LENGTH = 2000;

function validateContent(
  body: unknown,
): { ok: true; content: string; mode: string | null } | { ok: false; error: string } {
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).content !== "string"
  ) {
    return { ok: false, error: "Missing or invalid content" };
  }

  const content = ((body as Record<string, unknown>).content as string).trim();
  if (content.length === 0 || content.length > MAX_CONTENT_LENGTH) {
    return { ok: false, error: "Content must be 1-2000 characters" };
  }

  const rawMode = (body as Record<string, unknown>).mode;
  const mode = typeof rawMode === "string" ? rawMode : null;
  return { ok: true, content, mode };
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const groqKey = Deno.env.get("GROQ_API_KEY") ?? "";

  if (!groqKey) {
    return json({ error: "AI service unavailable" }, 503);
  }

  // Verify JWT via Auth REST API
  const authResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: supabaseAnonKey },
  });
  if (!authResp.ok) return json({ error: "Unauthorized" }, 401);

  const authUser = (await authResp.json()) as { id: string };
  const userId = authUser.id;

  // Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const validation = validateContent(body);
  if (!validation.ok) return json({ error: validation.error }, 400);

  const content = validation.content;
  const requestMode = validation.mode;

  // Service role client — only after auth verification
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch profile and history in parallel
  const [profileResult, historyResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("name, help_focus, dating_start_date, couple_id")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("role, content")
      .eq("user_id", userId)
      .eq("conversation_type", "chat")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const profile = profileResult.data as {
    name: string | null;
    help_focus: string | null;
    dating_start_date: string | null;
    couple_id: string | null;
  } | null;

  const historyRows = (historyResult.data ?? []) as Array<{
    role: "user" | "assistant";
    content: string;
  }>;

  // Build LLM context — couple or solo
  const isCouple = requestMode === "couple" && !!profile?.couple_id;
  let conversationType: "chat" | "couple_chat" = "chat";
  let llmMessages: LLMMessage[] = [];
  let systemPromptForLog = "";

  if (isCouple) {
    const coupleId = profile!.couple_id!;
    const { data: coupleRow } = await supabase
      .from("couples")
      .select("partner1_id, partner2_id")
      .eq("id", coupleId)
      .eq("is_active", true)
      .maybeSingle();

    if (coupleRow) {
      const c = coupleRow as { partner1_id: string; partner2_id: string };
      const partnerId = c.partner1_id === userId ? c.partner2_id : c.partner1_id;

      const [partnerProfileResult, coupleHistResult] = await Promise.all([
        supabase.from("profiles").select("name, help_focus").eq("id", partnerId).maybeSingle(),
        supabase
          .from("messages")
          .select("role, content, user_id")
          .or(`user_id.eq.${userId},user_id.eq.${partnerId}`)
          .eq("conversation_type", "couple_chat")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      conversationType = "couple_chat";
      const myName = profile?.name ?? "Partner 1";
      const partnerProfile = partnerProfileResult.data as { name: string | null; help_focus: string | null } | null;
      const partnerName = partnerProfile?.name ?? "Partner 2";
      const focus = profile?.help_focus ?? partnerProfile?.help_focus ?? null;
      const couplePrompt = buildCoupleSystemPrompt(myName, partnerName, profile?.dating_start_date ?? null, focus);
      systemPromptForLog = couplePrompt;

      const coupleHistory = (coupleHistResult.data ?? []) as Array<{ role: string; content: string; user_id: string }>;

      llmMessages = [
        { role: "system", content: couplePrompt },
        ...coupleHistory.reverse().map((row): LLMMessage =>
          row.role === "assistant"
            ? { role: "assistant", content: row.content }
            : { role: "user", content: `[${row.user_id === userId ? myName : partnerName}]: ${row.content}` }
        ),
        { role: "user", content: `[${myName}]: ${content}` },
      ];
    }
  }

  // Solo fallback (or primary)
  if (llmMessages.length === 0) {
    conversationType = "chat";
    const soloPrompt = buildSystemPrompt({
      name: profile?.name ?? null,
      coupled: !!profile?.couple_id,
      datingStartDate: profile?.dating_start_date ?? null,
      helpFocus: profile?.help_focus ?? null,
    });
    systemPromptForLog = soloPrompt;

    llmMessages = [
      { role: "system", content: soloPrompt },
      ...historyRows.reverse().map((row) => ({
        role: row.role as "user" | "assistant",
        content: row.content,
      })),
      { role: "user", content },
    ];
  }

  // Log prompt for local development inspection
  const logMode = isCouple ? "couple" : "solo";
  void logPrompt(systemPromptForLog, logMode);

  // Save user message
  await supabase.from("messages").insert({
    user_id: userId,
    role: "user",
    content,
    conversation_type: conversationType,
  });

  // Stream response via SSE
  const provider = new GroqProvider(groqKey);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = "";
      try {
        for await (const chunk of provider.stream(llmMessages)) {
          fullText += chunk;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ t: chunk })}\n\n`),
          );
        }
        await supabase.from("messages").insert({
          user_id: userId,
          role: "assistant",
          content: fullText,
          conversation_type: conversationType,
        });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ e: "AI error" })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
});
