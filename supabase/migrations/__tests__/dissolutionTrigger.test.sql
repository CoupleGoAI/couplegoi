-- Verification queries for the couple dissolution trigger.
-- Run these manually in the Supabase SQL editor after applying the migration.

-- 1. Verify trigger exists
SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger
WHERE tgname = 'on_couple_deactivated';

-- 2. Verify function exists and is SECURITY DEFINER
SELECT proname, prosecdef
FROM pg_proc
WHERE proname = '_on_couple_deactivated';

-- 3. Verify function is NOT callable by public/anon/authenticated
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = '_on_couple_deactivated'
  AND grantee IN ('public', 'anon', 'authenticated');
-- Expected: 0 rows (all revoked)

-- 4. Smoke test: create test data, deactivate couple, verify cleanup
-- (Run in a transaction so it rolls back)
BEGIN;
  -- Insert test couple
  INSERT INTO public.couples (id, partner1_id, partner2_id, is_active)
  VALUES ('test-couple-diss', 'test-user-a', 'test-user-b', true);

  -- Insert pending invitation
  INSERT INTO public.game_invitations (id, couple_id, game_type, status, created_by)
  VALUES ('test-inv-1', 'test-couple-diss', 'truth_or_dare', 'pending', 'test-user-a');

  -- Insert active session
  INSERT INTO public.game_sessions (id, couple_id, game_type, status)
  VALUES ('test-sess-1', 'test-couple-diss', 'truth_or_dare', 'active');

  -- Deactivate couple (should fire trigger)
  UPDATE public.couples SET is_active = false WHERE id = 'test-couple-diss';

  -- Check: invitation should be deleted
  SELECT count(*) AS pending_invitations FROM public.game_invitations
  WHERE couple_id = 'test-couple-diss' AND status = 'pending';
  -- Expected: 0

  -- Check: session should be cancelled
  SELECT status FROM public.game_sessions WHERE id = 'test-sess-1';
  -- Expected: 'cancelled'

ROLLBACK;
