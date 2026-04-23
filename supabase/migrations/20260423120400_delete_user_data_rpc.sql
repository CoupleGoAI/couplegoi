-- GDPR Article 17 — Right to erasure.
-- Called by account-delete edge function with service_role after JWT verification.

CREATE OR REPLACE FUNCTION public.delete_user_data(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_couple_id uuid;
BEGIN
  SELECT id INTO v_couple_id
    FROM public.couples
    WHERE (partner1_id = target_user_id OR partner2_id = target_user_id)
      AND is_active = true
    LIMIT 1;

  IF v_couple_id IS NOT NULL THEN
    UPDATE public.couples SET is_active = false WHERE id = v_couple_id;
    UPDATE public.profiles SET couple_id = NULL WHERE couple_id = v_couple_id;
  END IF;

  DELETE FROM public.messages WHERE user_id = target_user_id;
  DELETE FROM public.user_memory WHERE user_id = target_user_id;
  DELETE FROM public.memory_corrections WHERE created_by = target_user_id;
  DELETE FROM public.pairing_tokens WHERE creator_id = target_user_id;
  DELETE FROM public.game_answers WHERE user_id = target_user_id;
  DELETE FROM public.game_session_players WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_user_data(uuid) FROM public, anon, authenticated;
