// get-messages — Decrypted message history endpoint.
//
// Replaces direct PostgREST queries from the client, which would return
// ciphertext. Decrypts content using MESSAGES_ENCRYPTION_KEY before returning.
// Falls back to plaintext for rows that pre-date encryption.
//
// Params (JSON body or query): conversation_type, partner_id?, limit?, before_id?

import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { makeCorsHeaders } from "../_shared/cors.ts";
import { decrypt } from "../_shared/crypto.ts";
import { logError, logInfo, newCorrelationId } from "../_shared/log.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...makeCorsHeaders(), "Content-Type": "application/json" },
  });
}

const VALID_TYPES = ["chat", "couple_chat", "couple_setup", "onboarding"] as const;
type ConvType = typeof VALID_TYPES[number];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: makeCorsHeaders() });
  }

  const correlationId = newCorrelationId();
  const feature = "get-messages";

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const encKey = (Deno.env.get("MESSAGES_ENCRYPTION_KEY") ?? "").trim();

  const authResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: supabaseAnonKey },
  });
  if (!authResp.ok) return json({ error: "Unauthorized" }, 401);

  const authUser = (await authResp.json()) as { id: string };
  const userId = authUser.id;

  // Parse params from body or query string.
  let params: Record<string, unknown> = {};
  if (req.method === "POST") {
    try { params = (await req.json()) as Record<string, unknown>; } catch { /* ok */ }
  } else {
    const url = new URL(req.url);
    url.searchParams.forEach((v, k) => { params[k] = v; });
  }

  const conversationType = typeof params.conversation_type === "string"
    ? params.conversation_type
    : "chat";

  if (!(VALID_TYPES as readonly string[]).includes(conversationType)) {
    return json({ error: "Invalid conversation_type" }, 400);
  }

  const rawLimit = Number(params.limit ?? 30);
  const limit = Math.min(Number.isFinite(rawLimit) ? Math.max(1, Math.floor(rawLimit)) : 30, 100);

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const rawPartnerId = typeof params.partner_id === "string" ? params.partner_id : null;
  const partnerId = rawPartnerId && UUID_RE.test(rawPartnerId) ? rawPartnerId : null;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Ownership verification: service_role bypasses RLS, so we check manually.
  // For solo chat: only the user's own messages.
  // For couple_chat: user's messages + verified partner's messages.
  let query = supabase
    .from("messages")
    .select("id, role, content, created_at, user_id, conversation_type")
    .eq("conversation_type", conversationType as ConvType)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (conversationType === "chat" || conversationType === "onboarding") {
    query = query.eq("user_id", userId);
  } else if (partnerId) {
    // Verify partner relationship before exposing their messages.
    // Use a single .or() expression to check BOTH users belong to the same couple
    // (prevents the second .or() from silently overwriting the first in PostgREST).
    const { data: couple } = await supabase
      .from("couples")
      .select("id")
      .or(
        `and(partner1_id.eq.${userId},partner2_id.eq.${partnerId}),` +
        `and(partner1_id.eq.${partnerId},partner2_id.eq.${userId})`
      )
      .eq("is_active", true)
      .maybeSingle();

    if (!couple) return json({ error: "Not in an active couple with this partner" }, 403);
    query = query.or(`user_id.eq.${userId},user_id.eq.${partnerId}`);
  } else {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    logError({ feature, event: "fetch_failed", code: error.code, correlationId, userId });
    return json({ error: "Failed to fetch messages" }, 500);
  }

  type RawRow = { id: string; role: string; content: string; created_at: string; user_id: string; conversation_type: string };
  const rows = (data ?? []) as RawRow[];

  // Decrypt content — gracefully handles plaintext legacy rows.
  const decrypted = encKey
    ? await Promise.all(rows.map(async (r) => ({ ...r, content: await decrypt(r.content, encKey) })))
    : rows;

  logInfo({ feature, event: "fetched", correlationId, userId, status: 200 });

  return json({ messages: decrypted.reverse() });
});
