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

// ─── LLM Provider Abstraction ────────────────────────────────────────────────

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
          max_tokens: 250,
          temperature: 0.8,
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

// ─── System Prompt ───────────────────────────────────────────────────────────

interface ProfileInfo {
  name: string | null;
  coupled: boolean;
  datingStartDate: string | null;
  helpFocus: string | null;
}

function buildSystemPrompt(profile: ProfileInfo): string {
  const userName = profile.name ?? "this user";
  const relationship = profile.coupled
    ? `in a relationship${profile.datingStartDate ? ` since ${profile.datingStartDate}` : ""}`
    : "single or exploring";
  const focus = profile.helpFocus ? ` Focus: ${profile.helpFocus}.` : "";
  const today = new Date().toISOString().slice(0, 10);

  return (
    `You are a warm, empathetic AI companion in CoupleGoAI for ${userName}. ` +
    `Keep every reply to 2-4 sentences. Be warm, specific, and never generic. ` +
    `Ask one meaningful follow-up question when natural. ` +
    `Relationship: ${relationship}.${focus} ` +
    `Today: ${today}.`
  );
}

// ─── Content Validation ──────────────────────────────────────────────────────

const MAX_CONTENT_LENGTH = 2000;

function validateContent(
  body: unknown,
): { ok: true; content: string } | { ok: false; error: string } {
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

  return { ok: true, content };
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

  // Graceful degradation: proceed with defaults on fetch failure
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

  // Save user message
  await supabase.from("messages").insert({
    user_id: userId,
    role: "user",
    content,
    conversation_type: "chat",
  });

  // Build LLM message array
  const systemPrompt = buildSystemPrompt({
    name: profile?.name ?? null,
    coupled: !!profile?.couple_id,
    datingStartDate: profile?.dating_start_date ?? null,
    helpFocus: profile?.help_focus ?? null,
  });

  const llmMessages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    ...historyRows.reverse().map((row) => ({
      role: row.role as "user" | "assistant",
      content: row.content,
    })),
    { role: "user", content },
  ];

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
        // Persist AI reply before signaling done
        await supabase.from("messages").insert({
          user_id: userId,
          role: "assistant",
          content: fullText,
          conversation_type: "chat",
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
