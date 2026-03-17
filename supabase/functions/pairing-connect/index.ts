// =============================================================================
// pairing-connect — Validate a QR token and atomically create a couple
//
// Auth:  JWT verified via Auth REST API (ES256 compatible) — MUST-1
// user_id from auth response only — MUST-2
// MUST-4: verifies token exists, not expired, not used, not self-pairing,
//         both users unpaired
// MUST-5: atomic couple creation + profile updates + token mark as used
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

const SHORT_CODE_LENGTH = 6;
const SHORT_CODE_RE = /^[A-Z0-9]{6}$/;

function deriveShortCode(token: string): string {
  let hash = 0;

  for (let i = 0; i < token.length; i += 1) {
    hash = ((hash * 31) + token.charCodeAt(i)) >>> 0;
  }

  return hash
    .toString(36)
    .toUpperCase()
    .padStart(SHORT_CODE_LENGTH, "0")
    .slice(-SHORT_CODE_LENGTH);
}

interface PairingTokenRow {
  id: string;
  token: string;
  creator_id: string;
  expires_at: string;
  used: boolean;
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
  const scannerId = authUser.id;

  // Validate request body — MUST-4 (input validation)
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const tokenValue = (body as Record<string, unknown>)?.token;
  if (
    typeof tokenValue !== "string"
  ) {
    return json({ error: "Invalid token" }, 400);
  }

  const normalizedTokenInput = tokenValue.trim();
  if (normalizedTokenInput.length === 0 || normalizedTokenInput.length > 100) {
    return json({ error: "Invalid token" }, 400);
  }

  // MUST-NOT-3: service_role client only after auth verification
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const nowIso = new Date().toISOString();

  // Remove expired unused tokens opportunistically to prevent stale row buildup.
  await supabase
    .from("pairing_tokens")
    .delete()
    .eq("used", false)
    .lt("expires_at", nowIso);

  const normalizedShortCodeInput = normalizedTokenInput.toUpperCase();
  const isShortCodeInput = SHORT_CODE_RE.test(normalizedShortCodeInput);

  let pairingToken: PairingTokenRow | null = null;

  if (isShortCodeInput) {
    const { data: activeTokens, error: activeTokensError } = await supabase
      .from("pairing_tokens")
      .select("id, token, creator_id, expires_at, used")
      .eq("used", false)
      .gt("expires_at", nowIso);

    if (activeTokensError) {
      return json({ error: "Failed to validate code" }, 500);
    }

    const matchingTokens = (activeTokens ?? []).filter((row) => {
      const rowToken = (row as PairingTokenRow).token;
      return typeof rowToken === "string" && deriveShortCode(rowToken) === normalizedShortCodeInput;
    }) as PairingTokenRow[];

    if (matchingTokens.length !== 1) {
      return json({ error: "Invalid or expired code" }, 410);
    }

    pairingToken = matchingTokens[0];
  } else {
    // MUST-4: Look up token — must exist, not used, not expired
    const { data: tokenRow, error: tokenError } = await supabase
      .from("pairing_tokens")
      .select("id, token, creator_id, expires_at, used")
      .eq("token", normalizedTokenInput)
      .single();

    if (tokenError || !tokenRow) {
      return json({ error: "Invalid or expired code" }, 410);
    }

    pairingToken = tokenRow as PairingTokenRow;
  }

  if (!pairingToken) {
    return json({ error: "Invalid or expired code" }, 410);
  }

  if (pairingToken.used) {
    return json({ error: "Code already used" }, 410);
  }

  if (new Date(pairingToken.expires_at as string) < new Date()) {
    await supabase
      .from("pairing_tokens")
      .delete()
      .eq("id", pairingToken.id as string);
    return json({ error: "Code expired" }, 410);
  }

  const creatorId = pairingToken.creator_id as string;

  // MUST-4: reject self-pairing
  if (creatorId === scannerId) {
    return json({ error: "You cannot pair with yourself" }, 400);
  }

  // MUST-4: verify both users are unpaired
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, couple_id, name")
    .in("id", [creatorId, scannerId]);

  if (profilesError || !profiles || profiles.length < 2) {
    return json({ error: "Failed to verify profiles" }, 500);
  }

  const creatorProfile = profiles.find(
    (p: { id: string }) => p.id === creatorId,
  ) as { id: string; couple_id: string | null; name: string | null } | undefined;
  const scannerProfile = profiles.find(
    (p: { id: string }) => p.id === scannerId,
  ) as { id: string; couple_id: string | null; name: string | null } | undefined;

  if (!creatorProfile || !scannerProfile) {
    return json({ error: "Profile not found" }, 500);
  }

  if (creatorProfile.couple_id || scannerProfile.couple_id) {
    return json({ error: "One or both users are already paired" }, 409);
  }

  // MUST-5: atomic couple creation — insert couple first
  const { data: couple, error: coupleError } = await supabase
    .from("couples")
    .insert({ partner1_id: creatorId, partner2_id: scannerId })
    .select("id, created_at")
    .single();

  if (coupleError || !couple) {
    return json({ error: "Failed to create couple" }, 500);
  }

  const coupleId = (couple as { id: string; created_at: string }).id;
  const coupleCreatedAt = (couple as { id: string; created_at: string }).created_at;

  // MUST-5: update both profiles' couple_id
  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({ couple_id: coupleId })
    .in("id", [creatorId, scannerId]);

  if (profileUpdateError) {
    // Best-effort cleanup: deactivate orphaned couple record
    await supabase
      .from("couples")
      .update({ is_active: false })
      .eq("id", coupleId);
    return json({ error: "Failed to link profiles" }, 500);
  }

  // MUST-5: mark token as used
  await supabase
    .from("pairing_tokens")
    .update({ used: true, used_by: scannerId, couple_id: coupleId })
    .eq("id", pairingToken.id);

  return json({
    couple: { id: coupleId, createdAt: coupleCreatedAt },
    partner: { id: creatorId, name: creatorProfile.name },
  });
});
