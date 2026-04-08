import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { bumpMessageCount, updateMemory, type UserMemoryRow } from "./memory.ts";

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

async function fetchPromptTemplate(
  supabaseUrl: string,
  serviceKey: string,
  filename: "chat_solo.txt" | "chat_couple.txt",
): Promise<string> {
  const url = `${supabaseUrl}/storage/v1/object/prompts/${filename}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
  });
  if (!res.ok) throw new Error(`Failed to fetch prompt template: ${filename}`);
  return res.text();
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

interface ProfileInfo {
  name: string | null;
  coupled: boolean;
  datingStartDate: string | null;
  helpFocus: string | null;
  memory: UserMemoryRow | null;
}

function formatMemoryBlock(memory: UserMemoryRow | null, name: string): string {
  if (!memory) return "";
  const hasSummary = memory.summary && memory.summary.trim().length > 0;
  const traitEntries = Object.entries(memory.traits ?? {}).filter(
    ([, v]) => typeof v === "string" && v.trim().length > 0,
  );
  if (!hasSummary && traitEntries.length === 0) return "";

  const lines: string[] = ["", `WHAT YOU KNOW ABOUT ${name}`];
  if (hasSummary) lines.push(memory.summary.trim());
  for (const [k, v] of traitEntries) lines.push(`- ${k}: ${v}`);
  lines.push(
    `Use this to personalize tone and examples. Never mention that you "remember" things — just act like you know them.`,
  );
  return lines.join("\n");
}

async function buildSystemPrompt(
  supabaseUrl: string,
  serviceKey: string,
  profile: ProfileInfo,
): Promise<string> {
  const template = await fetchPromptTemplate(supabaseUrl, serviceKey, "chat_solo.txt");
  const name = profile.name ?? "friend";
  return interpolate(template, {
    NAME: name,
    RELATIONSHIP_STATUS: profile.coupled
      ? `in a relationship${profile.datingStartDate ? ` since ${profile.datingStartDate}` : ""}`
      : "single or exploring",
    FOCUS: profile.helpFocus ?? "general relationship support",
    TODAY_DATE: new Date().toISOString().slice(0, 10),
    USER_MEMORY: formatMemoryBlock(profile.memory, name),
  });
}

async function buildCoupleSystemPrompt(
  supabaseUrl: string,
  serviceKey: string,
  myName: string,
  partnerName: string,
  datingStartDate: string | null,
  helpFocus: string | null,
): Promise<string> {
  const template = await fetchPromptTemplate(supabaseUrl, serviceKey, "chat_couple.txt");
  return interpolate(template, {
    NAME: myName,
    PARTNER_NAME: partnerName,
    RELATIONSHIP_STATUS: datingStartDate ? `together since ${datingStartDate}` : "together",
    FOCUS: helpFocus ?? "general relationship support",
    TODAY_DATE: new Date().toISOString().slice(0, 10),
  });
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

  // Rate limiting: 20 requests per minute per user
  const { data: withinLimit, error: rateLimitError } = await supabase.rpc("check_rate_limit", {
    p_user_id: userId,
    p_endpoint: "ai-chat",
    p_max_per_minute: 20,
  });
  if (rateLimitError || !withinLimit) {
    return json({ error: "Too many requests. Please wait a moment." }, 429);
  }

  // Fetch profile, history, and user memory in parallel
  const [profileResult, historyResult, memoryResult] = await Promise.all([
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
    supabase
      .from("user_memory")
      .select("summary, traits, message_count")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const memory = (memoryResult.data ?? null) as UserMemoryRow | null;

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
      const couplePrompt = await buildCoupleSystemPrompt(supabaseUrl, supabaseServiceKey, myName, partnerName, profile?.dating_start_date ?? null, focus);

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
    const soloPrompt = await buildSystemPrompt(supabaseUrl, supabaseServiceKey, {
      name: profile?.name ?? null,
      coupled: !!profile?.couple_id,
      datingStartDate: profile?.dating_start_date ?? null,
      helpFocus: profile?.help_focus ?? null,
      memory,
    });

    llmMessages = [
      { role: "system", content: soloPrompt },
      ...historyRows.reverse().map((row) => ({
        role: row.role as "user" | "assistant",
        content: row.content,
      })),
      { role: "user", content },
    ];
  }

  // Save user message
  await supabase.from("messages").insert({
    user_id: userId,
    role: "user",
    content,
    conversation_type: conversationType,
  });

  // Memory update bookkeeping (solo only)
  const isSolo = conversationType === "chat";
  const soloMemoryCount = memory?.message_count ?? 0;
  const shouldUpdateMemory = isSolo && soloMemoryCount + 2 >= 6;

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

        // Background: update or bump memory counter. Never blocks the stream.
        if (isSolo) {
          const bgTask = shouldUpdateMemory
            ? updateMemory({
                supabase,
                groqKey,
                userId,
                existingMemory: memory,
                lastUserMessage: content,
                lastAssistantMessage: fullText,
              })
            : bumpMessageCount(supabase, userId, memory !== null, soloMemoryCount, 2);

          const er = (globalThis as {
            EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void };
          }).EdgeRuntime;
          if (er?.waitUntil) {
            er.waitUntil(bgTask.catch(() => {}));
          } else {
            // Local/dev fallback — fire and forget.
            bgTask.catch(() => {});
          }
        }
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
