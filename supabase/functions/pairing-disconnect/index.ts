// =============================================================================
// pairing-disconnect — Deactivate couple and clear couple_id on both profiles
//
// Auth:  JWT verified via Auth REST API (ES256 compatible) — MUST-1
// user_id from auth response only — MUST-2
// MUST-6: verifies authenticated user is partner1 or partner2 before acting
// Idempotent: already-disconnected couple returns success
// service_role client after auth verification — MUST-NOT-3
// =============================================================================

import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // MUST-1: Verify JWT via Auth REST API — never client.auth.getUser()
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: supabaseAnonKey },
  });
  if (!authResp.ok) return json({ error: "Unauthorized" }, 401);

  // MUST-2: derive user identity from auth response only — never request body
  const authUser = await authResp.json() as { id: string };
  const userId = authUser.id;

  // MUST-NOT-3: service_role client only after auth verification
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Rate limiting: 5 requests per minute per user
  const { data: withinLimit, error: rateLimitError } = await supabase.rpc("check_rate_limit", {
    p_user_id: userId,
    p_endpoint: "pairing-disconnect",
    p_max_per_minute: 5,
  });
  if (rateLimitError || !withinLimit) {
    return json({ error: "Too many requests. Please wait a moment." }, 429);
  }

  // Read the user's current couple_id
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("couple_id")
    .eq("id", userId)
    .single();

  if (profileError) return json({ error: "Failed to read profile" }, 500);
  if (!profile?.couple_id) return json({ error: "Not paired" }, 409);

  const coupleId = profile.couple_id as string;

  // MUST-6: verify couple exists and user is a partner
  const { data: couple, error: coupleError } = await supabase
    .from("couples")
    .select("id, partner1_id, partner2_id, is_active")
    .eq("id", coupleId)
    .single();

  if (coupleError || !couple) return json({ error: "Couple not found" }, 404);

  const c = couple as {
    id: string;
    partner1_id: string;
    partner2_id: string;
    is_active: boolean;
  };

  // MUST-6: reject if user is not a member of this couple
  if (c.partner1_id !== userId && c.partner2_id !== userId) {
    return json({ error: "Forbidden" }, 403);
  }

  // Idempotent: already disconnected → success
  if (!c.is_active) {
    return json({ ok: true });
  }

  const otherId = c.partner1_id === userId ? c.partner2_id : c.partner1_id;

  // Deactivate couple
  const { error: coupleUpdateError } = await supabase
    .from("couples")
    .update({ is_active: false, disconnected_at: new Date().toISOString() })
    .eq("id", coupleId);

  if (coupleUpdateError) return json({ error: "Failed to deactivate couple" }, 500);

  // Wipe shared couple memory so it can never resurface on a future reconnect.
  // Best-effort: failure here must not block disconnect.
  await supabase.from("couple_memory").delete().eq("couple_id", coupleId);

  // Clear couple_id on both profiles
  await supabase
    .from("profiles")
    .update({ couple_id: null })
    .in("id", [userId, otherId]);

  return json({ ok: true });
});
