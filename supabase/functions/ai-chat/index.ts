// ai-chat edge function — streaming couples/solo chat.
//
// Architecture notes:
// - LLM calls go through the shared LLMProvider interface (see _shared/llm).
//   Switching between Groq and Claude is purely an env-var change; no code
//   in this file knows which provider is active.
// - Real user/partner names NEVER reach the LLM. Prompts and turn labels
//   use the stable role labels "Partner A" (the authenticated user) and
//   "Partner B" (their partner, in couple mode). The client is responsible
//   for splicing real display names into assistant output for warmth —
//   this server never sees or sends raw names.
// - JWT is verified against the Auth REST API because the project uses
//   ES256 signing which the Supabase gateway cannot validate.
// - Logging goes through _shared/log.ts. Raw message content, AI responses,
//   prompt payloads, and JWTs are never logged.

import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import {
  bumpMessageCount,
  updateMemory,
  type RecentTurn,
  type UserMemoryRow,
} from "./memory.ts";
import {
  bumpCoupleMessageCount,
  updateCoupleMemory,
  type CoupleMemoryRow,
} from "./coupleMemory.ts";
import { tryGetProvider } from "../_shared/llm/factory.ts";
import { chatProfile, withModel } from "../_shared/llm/profiles.ts";
import type { LLMMessage } from "../_shared/llm/types.ts";
import { logError, logWarn, newCorrelationId } from "../_shared/log.ts";
import { makeCorsHeaders } from "../_shared/cors.ts";
import { encrypt, decrypt } from "../_shared/crypto.ts";

function json(body: unknown, status = 200): Response {
  const CORS = makeCorsHeaders();
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
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

// ─── Memory blocks ───────────────────────────────────────────────────────────

function formatMemoryBlock(memory: UserMemoryRow | null): string {
  if (!memory) return "";
  const hasSummary = memory.summary && memory.summary.trim().length > 0;
  const traitEntries = Object.entries(memory.traits ?? {}).filter(
    ([, v]) => typeof v === "string" && v.trim().length > 0,
  );
  if (!hasSummary && traitEntries.length === 0) return "";

  const lines: string[] = ["", "WHAT YOU KNOW ABOUT PARTNER A"];
  if (hasSummary) lines.push(memory.summary.trim());
  for (const [k, v] of traitEntries) lines.push(`- ${k}: ${v}`);
  lines.push(
    `Use this to personalize tone and examples. Never mention that you "remember" things — just act like you know them.`,
  );
  return lines.join("\n");
}

function formatCoupleMemoryBlock(memory: CoupleMemoryRow | null): string {
  if (!memory) return "";
  const hasSummary = memory.summary && memory.summary.trim().length > 0;
  const traitEntries = Object.entries(memory.traits ?? {}).filter(
    ([, v]) => typeof v === "string" && v.trim().length > 0,
  );
  if (!hasSummary && traitEntries.length === 0) return "";

  const lines: string[] = [
    "",
    "WHAT YOU KNOW ABOUT PARTNER A & PARTNER B TOGETHER",
  ];
  if (hasSummary) lines.push(memory.summary.trim());
  for (const [k, v] of traitEntries) lines.push(`- ${k}: ${v}`);
  lines.push(
    `Use this to personalize tone and examples for the couple. Never say you "remember" things — just act like you know them.`,
  );
  return lines.join("\n");
}

interface SoloPromptInput {
  coupled: boolean;
  datingStartDate: string | null;
  helpFocus: string | null;
  memory: UserMemoryRow | null;
}

async function buildSystemPrompt(
  supabaseUrl: string,
  serviceKey: string,
  input: SoloPromptInput,
): Promise<string> {
  const template = await fetchPromptTemplate(
    supabaseUrl,
    serviceKey,
    "chat_solo.txt",
  );
  return interpolate(template, {
    RELATIONSHIP_STATUS: input.coupled
      ? `in a relationship${input.datingStartDate ? ` since ${input.datingStartDate}` : ""}`
      : "single or exploring",
    FOCUS: input.helpFocus ?? "general relationship support",
    TODAY_DATE: new Date().toISOString().slice(0, 10),
    USER_MEMORY: formatMemoryBlock(input.memory),
  });
}

async function buildCoupleSystemPrompt(
  supabaseUrl: string,
  serviceKey: string,
  datingStartDate: string | null,
  helpFocus: string | null,
  coupleMemory: CoupleMemoryRow | null,
): Promise<string> {
  const template = await fetchPromptTemplate(
    supabaseUrl,
    serviceKey,
    "chat_couple.txt",
  );
  return interpolate(template, {
    RELATIONSHIP_STATUS: datingStartDate
      ? `together since ${datingStartDate}`
      : "together",
    FOCUS: helpFocus ?? "general relationship support",
    TODAY_DATE: new Date().toISOString().slice(0, 10),
    COUPLE_MEMORY: formatCoupleMemoryBlock(coupleMemory),
  });
}

// ─── Content Validation ──────────────────────────────────────────────────────

const MAX_CONTENT_LENGTH = 2000;

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /forget\s+(everything|all)\s+(above|previous)/i,
  /you\s+are\s+now\s+(?!my\s+partner\b)(?!(?:a\s+)?partner\b)(?:an?\s+)?/i,
  /\[system\]/i,
  /\}\}\s*\{\{/,
  /<\|.*?\|>/,
];

function validateContent(
  body: unknown,
):
  | { ok: true; content: string; mode: string | null }
  | { ok: false; error: string } {
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

  if (INJECTION_PATTERNS.some((re) => re.test(content))) {
    return { ok: false, error: "Message contains disallowed content." };
  }

  const rawMode = (body as Record<string, unknown>).mode;
  const mode = typeof rawMode === "string" ? rawMode : null;
  return { ok: true, content, mode };
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: makeCorsHeaders() });
  }

  const correlationId = newCorrelationId();
  const feature = "ai-chat";

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const encKey = (Deno.env.get("MESSAGES_ENCRYPTION_KEY") ?? "").trim();

  // Resolve LLM provider. Fails closed (503) if key is missing.
  const resolved = tryGetProvider();
  if (!resolved) {
    logError({ feature, event: "provider_unconfigured", correlationId });
    return json({ error: "AI service unavailable" }, 503);
  }
  const { provider, models } = resolved;

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
  const { data: withinLimit, error: rateLimitError } = await supabase.rpc(
    "check_rate_limit",
    {
      p_user_id: userId,
      p_endpoint: "ai-chat",
      p_max_per_minute: 20,
    },
  );
  if (rateLimitError || !withinLimit) {
    logWarn({
      feature,
      event: "rate_limited",
      correlationId,
      userId,
      status: 429,
    });
    return json({ error: "Too many requests. Please wait a moment." }, 429);
  }

  // Fetch profile, history, and user memory in parallel.
  // NOTE: `name` is pulled only for the redactor's name allowlist in the
  // background couple-memory pipeline; it never reaches the LLM.
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
      .limit(10),
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

  const rawHistoryRows = (historyResult.data ?? []) as Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  const historyRows = encKey
    ? await Promise.all(
        rawHistoryRows.map(async (r) => ({
          ...r,
          content: await decrypt(r.content, encKey),
        })),
      )
    : rawHistoryRows;

  // Build LLM context — couple or solo
  const isCouple = requestMode === "couple" && !!profile?.couple_id;
  let conversationType: "chat" | "couple_chat" = "chat";
  let llmMessages: LLMMessage[] = [];
  let coupleMemory: CoupleMemoryRow | null = null;
  let activeCoupleId: string | null = null;
  // These names only feed the redactor allowlist for couple-memory distillation.
  let coupleNameA = "";
  let coupleNameB = "";
  let coupleHistoryRows: Array<{
    role: string;
    content: string;
    user_id: string;
  }> = [];

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
      const partnerId =
        c.partner1_id === userId ? c.partner2_id : c.partner1_id;

      const [partnerProfileResult, coupleHistResult, coupleMemoryResult] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("name, help_focus")
            .eq("id", partnerId)
            .maybeSingle(),
          supabase
            .from("messages")
            .select("role, content, user_id")
            .or(`user_id.eq.${userId},user_id.eq.${partnerId}`)
            .eq("conversation_type", "couple_chat")
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("couple_memory")
            .select("summary, traits, message_count")
            .eq("couple_id", coupleId)
            .maybeSingle(),
        ]);

      conversationType = "couple_chat";
      activeCoupleId = coupleId;
      coupleMemory = (coupleMemoryResult.data ?? null) as CoupleMemoryRow | null;
      coupleNameA = profile?.name ?? "";
      const partnerProfile = partnerProfileResult.data as {
        name: string | null;
        help_focus: string | null;
      } | null;
      coupleNameB = partnerProfile?.name ?? "";
      const focus =
        profile?.help_focus ?? partnerProfile?.help_focus ?? null;

      const couplePrompt = await buildCoupleSystemPrompt(
        supabaseUrl,
        supabaseServiceKey,
        profile?.dating_start_date ?? null,
        focus,
        coupleMemory,
      );

      const rawCoupleHistory = (coupleHistResult.data ?? []) as Array<{
        role: string;
        content: string;
        user_id: string;
      }>;
      const coupleHistory = encKey
        ? await Promise.all(
            rawCoupleHistory.map(async (r) => ({
              ...r,
              content: await decrypt(r.content, encKey),
            })),
          )
        : rawCoupleHistory;
      coupleHistoryRows = coupleHistory;

      // Role-label labeling: current user is "Partner A", other is "Partner B".
      // No real names interpolated into the message stream.
      llmMessages = [
        { role: "system", content: couplePrompt },
        ...coupleHistory.reverse().map((row): LLMMessage =>
          row.role === "assistant"
            ? { role: "assistant", content: row.content }
            : {
                role: "user",
                content: `${row.user_id === userId ? "Partner A" : "Partner B"}: ${row.content}`,
              },
        ),
        { role: "user", content: `Partner A: ${content}` },
      ];
    }
  }

  // Solo fallback (or primary)
  if (llmMessages.length === 0) {
    conversationType = "chat";
    const soloPrompt = await buildSystemPrompt(
      supabaseUrl,
      supabaseServiceKey,
      {
        coupled: !!profile?.couple_id,
        datingStartDate: profile?.dating_start_date ?? null,
        helpFocus: profile?.help_focus ?? null,
        memory,
      },
    );

    llmMessages = [
      { role: "system", content: soloPrompt },
      ...historyRows.reverse().map((row): LLMMessage => ({
        role: row.role as "user" | "assistant",
        content: row.content,
      })),
      { role: "user", content },
    ];
  }

  // Save user message (encrypted if key is set)
  const encContent = encKey ? await encrypt(content, encKey) : content;
  await supabase.from("messages").insert({
    user_id: userId,
    role: "user",
    content: encContent,
    conversation_type: conversationType,
  });

  // Memory update bookkeeping (inline for now; Phase 9 moves this out-of-band)
  const isSolo = conversationType === "chat";
  const soloMemoryCount = memory?.message_count ?? 0;
  const shouldUpdateMemory = isSolo && soloMemoryCount + 2 >= 6;
  const coupleMemoryCount = coupleMemory?.message_count ?? 0;
  const shouldUpdateCoupleMemory = !isSolo && coupleMemoryCount + 2 >= 6;

  // Stream response via SSE
  const encoder = new TextEncoder();
  const streamOpts = withModel(chatProfile, models.chat);

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = "";
      try {
        for await (const chunk of provider.stream(llmMessages, streamOpts)) {
          fullText += chunk;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ t: chunk })}\n\n`),
          );
        }
        const encFullText = encKey ? await encrypt(fullText, encKey) : fullText;
        await supabase.from("messages").insert({
          user_id: userId,
          role: "assistant",
          content: encFullText,
          conversation_type: conversationType,
        });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));

        // Background: update or bump memory counter. Never blocks the stream.
        let bgTask: Promise<void> | null = null;
        if (isSolo) {
          if (shouldUpdateMemory) {
            const recentTurns: RecentTurn[] = [
              ...historyRows
                .slice(0, 4)
                .reverse()
                .map((r) => ({ role: r.role, content: r.content })),
              { role: "user", content },
              { role: "assistant", content: fullText },
            ];
            bgTask = updateMemory({
              supabase,
              provider,
              model: models.memory,
              userId,
              existingMemory: memory,
              recentTurns,
            });
          } else {
            bgTask = bumpMessageCount(
              supabase,
              userId,
              memory !== null,
              soloMemoryCount,
              2,
            );
          }
        } else if (activeCoupleId) {
          if (shouldUpdateCoupleMemory) {
            const recent = coupleHistoryRows
              .slice(0, 5)
              .reverse()
              .map((r) => ({
                speaker:
                  r.role === "assistant"
                    ? ("assistant" as const)
                    : r.user_id === userId
                      ? ("A" as const)
                      : ("B" as const),
                text: r.content,
              }));
            recent.push({ speaker: "A" as const, text: content });
            recent.push({ speaker: "assistant" as const, text: fullText });

            bgTask = updateCoupleMemory({
              supabase,
              provider,
              model: models.memory,
              coupleId: activeCoupleId,
              existingMemory: coupleMemory,
              rawTurns: recent,
              nameA: coupleNameA,
              nameB: coupleNameB,
            });
          } else {
            bgTask = bumpCoupleMessageCount(
              supabase,
              activeCoupleId,
              coupleMemory !== null,
              coupleMemoryCount,
              2,
            );
          }
        }

        if (bgTask) {
          const er = (globalThis as {
            EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void };
          }).EdgeRuntime;
          if (er?.waitUntil) {
            er.waitUntil(bgTask.catch(() => {}));
          } else {
            bgTask.catch(() => {});
          }
        }
      } catch (err) {
        const code = err instanceof Error ? err.message : "unknown";
        logError({
          feature,
          event: "stream_failed",
          code,
          correlationId,
          userId,
        });
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
      ...makeCorsHeaders(),
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
});
