-- Security & performance hardening migration.
-- Consolidates several advisor-flagged fixes:
--   1. Wrap auth.uid() in (select ...) for RLS initplan optimization
--   2. Restrict avatars bucket listing to own folder
--   3. Consolidate multiple permissive policies on messages/profiles
--   4. Add missing FK indexes
--   5. Explicit deny-all policy on rate_limits
--   6. Fix storage RLS initplan

-- ── 1. Fix RLS initplan on game tables ──────────────────────────────────────

DROP POLICY IF EXISTS "Session participants can view answers" ON public.game_answers;
DROP POLICY IF EXISTS "Answers visible to session members (own always, others after reveal)" ON public.game_answers;
CREATE POLICY "Session participants can view answers" ON public.game_answers
  FOR SELECT USING (
    session_id IN (
      SELECT gs.id FROM game_sessions gs
      JOIN couples c ON c.id = gs.couple_id
      WHERE c.partner1_id = (select auth.uid()) OR c.partner2_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Session participants can view rounds" ON public.game_rounds;
DROP POLICY IF EXISTS "Session members can read rounds" ON public.game_rounds;
CREATE POLICY "Session participants can view rounds" ON public.game_rounds
  FOR SELECT USING (
    session_id IN (
      SELECT gs.id FROM game_sessions gs
      JOIN couples c ON c.id = gs.couple_id
      WHERE c.partner1_id = (select auth.uid()) OR c.partner2_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Session participants can view players" ON public.game_session_players;
DROP POLICY IF EXISTS "Session members can read players" ON public.game_session_players;
CREATE POLICY "Session participants can view players" ON public.game_session_players
  FOR SELECT USING (
    session_id IN (
      SELECT gs.id FROM game_sessions gs
      JOIN couples c ON c.id = gs.couple_id
      WHERE c.partner1_id = (select auth.uid()) OR c.partner2_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Couple members can view their sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Couple members can read sessions" ON public.game_sessions;
CREATE POLICY "Couple members can view their sessions" ON public.game_sessions
  FOR SELECT USING (
    couple_id IN (
      SELECT c.id FROM couples c
      WHERE c.partner1_id = (select auth.uid()) OR c.partner2_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Couple members can view their invitations" ON public.game_invitations;
DROP POLICY IF EXISTS "Couple members can read invitations" ON public.game_invitations;
CREATE POLICY "Couple members can view their invitations" ON public.game_invitations
  FOR SELECT USING (
    couple_id IN (
      SELECT c.id FROM couples c
      WHERE c.partner1_id = (select auth.uid()) OR c.partner2_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Couple members can view their results" ON public.game_session_results;
DROP POLICY IF EXISTS "Couple members can read results" ON public.game_session_results;
CREATE POLICY "Couple members can view their results" ON public.game_session_results
  FOR SELECT USING (
    couple_id IN (
      SELECT c.id FROM couples c
      WHERE c.partner1_id = (select auth.uid()) OR c.partner2_id = (select auth.uid())
    )
  );

-- ── 2. Restrict avatars bucket listing ──────────────────────────────────────

DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Users can view own avatar" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars'
    AND (select auth.uid()) IS NOT NULL
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ── 3. Consolidate messages SELECT policies ─────────────────────────────────

DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Partners can view couple chat messages" ON public.messages;
DROP POLICY IF EXISTS "Partners can view couple setup messages" ON public.messages;

CREATE POLICY "Users can view authorized messages" ON public.messages
  FOR SELECT USING (
    (select auth.uid()) = user_id
    OR (
      conversation_type IN ('couple_chat', 'couple_setup')
      AND user_id = get_partner_id()
    )
  );

-- ── 4. Consolidate profiles SELECT policies ─────────────────────────────────

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view partner profile" ON public.profiles;

CREATE POLICY "Users can view own or partner profile" ON public.profiles
  FOR SELECT USING (
    (select auth.uid()) = id
    OR id = get_partner_id()
  );

-- ── 5. Missing FK indexes ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_game_answers_session_id ON public.game_answers (session_id);
CREATE INDEX IF NOT EXISTS idx_game_answers_user_id ON public.game_answers (user_id);
CREATE INDEX IF NOT EXISTS idx_game_invitations_session_id ON public.game_invitations (session_id);
CREATE INDEX IF NOT EXISTS idx_game_invitations_from_user_id ON public.game_invitations (from_user_id);
CREATE INDEX IF NOT EXISTS idx_game_invitations_to_user_id ON public.game_invitations (to_user_id);
CREATE INDEX IF NOT EXISTS idx_game_session_players_user_id ON public.game_session_players (user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_by ON public.game_sessions (created_by);
CREATE INDEX IF NOT EXISTS idx_game_sessions_invitation_id ON public.game_sessions (invitation_id);
CREATE INDEX IF NOT EXISTS idx_pairing_tokens_couple_id ON public.pairing_tokens (couple_id);
CREATE INDEX IF NOT EXISTS idx_pairing_tokens_used_by ON public.pairing_tokens (used_by);

-- ── 6. Explicit deny-all on rate_limits ─────────────────────────────────────

CREATE POLICY "Deny all direct access" ON public.rate_limits
  FOR ALL USING (false);
