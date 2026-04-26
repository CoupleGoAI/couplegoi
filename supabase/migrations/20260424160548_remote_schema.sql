create type "public"."game_invitation_status" as enum ('pending', 'accepted', 'declined', 'cancelled', 'expired');

create type "public"."game_player_state" as enum ('joined', 'ready', 'playing', 'disconnected');

create type "public"."game_round_status" as enum ('pending', 'open', 'revealed');

create type "public"."game_session_status" as enum ('waiting', 'active', 'completed', 'cancelled');

create type "public"."game_type" as enum ('would_you_rather', 'who_is_more_likely', 'this_or_that', 'never_have_i_ever');

drop policy if exists "Answers visible to session members (own always, others after re" on "public"."game_answers";

drop policy if exists "Couple members can read invitations" on "public"."game_invitations";

drop policy if exists "Session members can read rounds" on "public"."game_rounds";

drop policy if exists "Session members can read players" on "public"."game_session_players";

drop policy if exists "Couple members can read results" on "public"."game_session_results";

drop policy if exists "Couple members can read sessions" on "public"."game_sessions";

alter table "public"."couple_memory" drop constraint if exists "couple_memory_updated_by_check";

alter table "public"."game_invitations" drop constraint if exists "game_invitations_category_key_check";

alter table "public"."game_invitations" drop constraint if exists "game_invitations_game_type_check";

alter table "public"."game_invitations" drop constraint if exists "game_invitations_session_id_fkey";

alter table "public"."game_invitations" drop constraint if exists "game_invitations_status_check";

alter table "public"."game_rounds" drop constraint if exists "game_rounds_status_check";

alter table "public"."game_session_players" drop constraint if exists "game_session_players_session_id_user_id_key";

alter table "public"."game_session_players" drop constraint if exists "game_session_players_state_check";

alter table "public"."game_session_results" drop constraint if exists "game_session_results_session_id_key";

alter table "public"."game_sessions" drop constraint if exists "game_sessions_status_check";

alter table "public"."user_memory" drop constraint if exists "user_memory_updated_by_check";

alter table "public"."game_answers" drop constraint if exists "game_answers_user_id_fkey";

alter table "public"."game_invitations" drop constraint if exists "game_invitations_from_user_id_fkey";

alter table "public"."game_invitations" drop constraint if exists "game_invitations_to_user_id_fkey";

alter table "public"."game_session_players" drop constraint if exists "game_session_players_user_id_fkey";

alter table "public"."game_sessions" drop constraint if exists "game_sessions_created_by_fkey";

alter table "public"."game_sessions" drop constraint if exists "game_sessions_invitation_id_fkey";

alter table "public"."memory_corrections" drop constraint if exists "memory_corrections_instruction_check";

drop function if exists "public"."_is_member_of_session_couple"(p_session_id uuid);

drop trigger if exists "on_auth_user_deleted" on "auth"."users";

drop function if exists "public"."_on_auth_user_deleted"();

drop function if exists "public"."_wipe_couple_chat_for_user"(p_uid uuid);

drop function if exists "public"."delete_user_data"(p_uid uuid);

alter table "public"."game_session_players" drop constraint if exists "game_session_players_pkey";

alter table "public"."game_session_results" drop constraint if exists "game_session_results_pkey";

drop index if exists "public"."game_session_players_session_id_user_id_key";

drop index if exists "public"."game_session_results_session_id_key";

drop index if exists "public"."idx_game_answers_session";

drop index if exists "public"."idx_game_invitations_couple_status";

drop index if exists "public"."idx_game_invitations_to_user";

drop index if exists "public"."idx_game_rounds_session_index";

drop index if exists "public"."idx_game_session_players_session";

drop index if exists "public"."idx_game_sessions_couple_status";

drop index if exists "public"."idx_game_sessions_last_activity";

drop index if exists "public"."game_session_players_pkey";

drop index if exists "public"."game_session_results_pkey";

alter table "public"."couple_memory" drop column "last_summarized_message_id";

alter table "public"."couple_memory" drop column "recent_episodes";

alter table "public"."couple_memory" drop column "updated_by";

alter table "public"."couple_memory" drop column "version";

alter table "public"."game_invitations" alter column "category_key" set default 'mixed'::text;

alter table "public"."game_invitations" alter column "expires_at" set default (now() + '24:00:00'::interval);

alter table "public"."game_invitations" alter column "game_type" set data type public.game_type using "game_type"::public.game_type;

alter table "public"."game_invitations" alter column "status" set default 'pending'::public.game_invitation_status;

alter table "public"."game_invitations" alter column "status" set data type public.game_invitation_status using "status"::public.game_invitation_status;

alter table "public"."game_rounds" drop column "created_at";

alter table "public"."game_rounds" alter column "category_key" set default 'mixed'::text;

alter table "public"."game_rounds" alter column "status" set default 'pending'::public.game_round_status;

alter table "public"."game_rounds" alter column "status" set data type public.game_round_status using "status"::public.game_round_status;

alter table "public"."game_session_players" drop column "created_at";

alter table "public"."game_session_players" drop column "id";

alter table "public"."game_session_players" add column "disconnected_at" timestamp with time zone;

alter table "public"."game_session_players" add column "joined_at" timestamp with time zone not null default now();

alter table "public"."game_session_players" add column "ready_at" timestamp with time zone;

alter table "public"."game_session_players" alter column "state" set default 'joined'::public.game_player_state;

alter table "public"."game_session_players" alter column "state" set data type public.game_player_state using "state"::public.game_player_state;

alter table "public"."game_session_results" drop column "id";

alter table "public"."game_session_results" alter column "category_key" set default 'mixed'::text;

alter table "public"."game_session_results" alter column "game_type" set data type public.game_type using "game_type"::public.game_type;

alter table "public"."game_session_results" alter column "round_count" set default 10;

alter table "public"."game_sessions" drop column "created_at";

alter table "public"."game_sessions" add column "version" integer not null default 1;

alter table "public"."game_sessions" alter column "category_key" set default 'mixed'::text;

alter table "public"."game_sessions" alter column "game_type" set data type public.game_type using "game_type"::public.game_type;

alter table "public"."game_sessions" alter column "status" set default 'waiting'::public.game_session_status;

alter table "public"."game_sessions" alter column "status" set data type public.game_session_status using "status"::public.game_session_status;

alter table "public"."game_sessions" alter column "total_rounds" set default 10;

alter table "public"."user_memory" drop column "last_summarized_message_id";

alter table "public"."user_memory" drop column "recent_episodes";

alter table "public"."user_memory" drop column "updated_by";

alter table "public"."user_memory" drop column "version";

CREATE INDEX idx_game_invitations_couple ON public.game_invitations USING btree (couple_id, status);

CREATE UNIQUE INDEX idx_game_invitations_one_pending_per_couple ON public.game_invitations USING btree (couple_id) WHERE (status = 'pending'::public.game_invitation_status);

CREATE INDEX idx_game_rounds_session ON public.game_rounds USING btree (session_id, round_index);

CREATE INDEX idx_game_sessions_couple ON public.game_sessions USING btree (couple_id, status);

CREATE UNIQUE INDEX idx_game_sessions_one_active_per_couple ON public.game_sessions USING btree (couple_id) WHERE (status = ANY (ARRAY['waiting'::public.game_session_status, 'active'::public.game_session_status]));

CREATE UNIQUE INDEX game_session_players_pkey ON public.game_session_players USING btree (session_id, user_id);

CREATE UNIQUE INDEX game_session_results_pkey ON public.game_session_results USING btree (session_id);

alter table "public"."game_session_players" add constraint "game_session_players_pkey" PRIMARY KEY using index "game_session_players_pkey";

alter table "public"."game_session_results" add constraint "game_session_results_pkey" PRIMARY KEY using index "game_session_results_pkey";

alter table "public"."game_invitations" add constraint "fk_game_invitations_session" FOREIGN KEY (session_id) REFERENCES public.game_sessions(id) ON DELETE CASCADE not valid;

alter table "public"."game_invitations" validate constraint "fk_game_invitations_session";

alter table "public"."game_invitations" add constraint "game_invitations_different_users" CHECK ((from_user_id <> to_user_id)) not valid;

alter table "public"."game_invitations" validate constraint "game_invitations_different_users";

alter table "public"."game_answers" add constraint "game_answers_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) not valid;

alter table "public"."game_answers" validate constraint "game_answers_user_id_fkey";

alter table "public"."game_invitations" add constraint "game_invitations_from_user_id_fkey" FOREIGN KEY (from_user_id) REFERENCES public.profiles(id) not valid;

alter table "public"."game_invitations" validate constraint "game_invitations_from_user_id_fkey";

alter table "public"."game_invitations" add constraint "game_invitations_to_user_id_fkey" FOREIGN KEY (to_user_id) REFERENCES public.profiles(id) not valid;

alter table "public"."game_invitations" validate constraint "game_invitations_to_user_id_fkey";

alter table "public"."game_session_players" add constraint "game_session_players_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) not valid;

alter table "public"."game_session_players" validate constraint "game_session_players_user_id_fkey";

alter table "public"."game_sessions" add constraint "game_sessions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."game_sessions" validate constraint "game_sessions_created_by_fkey";

alter table "public"."game_sessions" add constraint "game_sessions_invitation_id_fkey" FOREIGN KEY (invitation_id) REFERENCES public.game_invitations(id) not valid;

alter table "public"."game_sessions" validate constraint "game_sessions_invitation_id_fkey";

alter table "public"."memory_corrections" add constraint "memory_corrections_instruction_check" CHECK (((char_length(instruction) >= 1) AND (char_length(instruction) <= 500))) not valid;

alter table "public"."memory_corrections" validate constraint "memory_corrections_instruction_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.delete_user_data(target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_couple_id uuid;
BEGIN
  -- Find couple (if any)
  SELECT id INTO v_couple_id
    FROM public.couples
    WHERE (partner1_id = target_user_id OR partner2_id = target_user_id)
      AND is_active = true
    LIMIT 1;

  -- Deactivate couple (triggers _on_couple_deactivated for game cleanup)
  IF v_couple_id IS NOT NULL THEN
    UPDATE public.couples SET is_active = false WHERE id = v_couple_id;

    -- Clear couple_id from both partner profiles
    UPDATE public.profiles SET couple_id = NULL WHERE couple_id = v_couple_id;
  END IF;

  -- Delete user's messages
  DELETE FROM public.messages WHERE user_id = target_user_id;

  -- Delete user's memory
  DELETE FROM public.user_memory WHERE user_id = target_user_id;

  -- Delete memory corrections created by this user
  DELETE FROM public.memory_corrections WHERE created_by = target_user_id;

  -- Delete pairing tokens
  DELETE FROM public.pairing_tokens WHERE creator_id = target_user_id;

  -- Delete game answers by this user
  DELETE FROM public.game_answers WHERE user_id = target_user_id;

  -- Delete game session players for this user
  DELETE FROM public.game_session_players WHERE user_id = target_user_id;

  -- Delete profile
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- Finally, delete the auth user (cascades auth.* tables)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public._on_couple_deactivated()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF old.is_active = true AND new.is_active = false THEN
    DELETE FROM public.game_invitations
      WHERE couple_id = new.id AND status = 'pending';

    UPDATE public.game_sessions
      SET status = 'cancelled', cancelled_at = now()
      WHERE couple_id = new.id AND status IN ('waiting', 'active');

    DELETE FROM public.couple_memory WHERE couple_id = new.id;
  END IF;
  RETURN new;
END;
$function$
;

grant delete on table "public"."couple_memory" to "anon";

grant insert on table "public"."couple_memory" to "anon";

grant references on table "public"."couple_memory" to "anon";

grant select on table "public"."couple_memory" to "anon";

grant trigger on table "public"."couple_memory" to "anon";

grant truncate on table "public"."couple_memory" to "anon";

grant update on table "public"."couple_memory" to "anon";

grant delete on table "public"."couple_memory" to "authenticated";

grant insert on table "public"."couple_memory" to "authenticated";

grant truncate on table "public"."couple_memory" to "authenticated";

grant update on table "public"."couple_memory" to "authenticated";

grant delete on table "public"."couples" to "anon";

grant insert on table "public"."couples" to "anon";

grant references on table "public"."couples" to "anon";

grant select on table "public"."couples" to "anon";

grant trigger on table "public"."couples" to "anon";

grant truncate on table "public"."couples" to "anon";

grant update on table "public"."couples" to "anon";

grant delete on table "public"."game_answers" to "anon";

grant insert on table "public"."game_answers" to "anon";

grant references on table "public"."game_answers" to "anon";

grant select on table "public"."game_answers" to "anon";

grant trigger on table "public"."game_answers" to "anon";

grant truncate on table "public"."game_answers" to "anon";

grant update on table "public"."game_answers" to "anon";

grant delete on table "public"."game_answers" to "authenticated";

grant insert on table "public"."game_answers" to "authenticated";

grant references on table "public"."game_answers" to "authenticated";

grant trigger on table "public"."game_answers" to "authenticated";

grant truncate on table "public"."game_answers" to "authenticated";

grant update on table "public"."game_answers" to "authenticated";

grant delete on table "public"."game_invitations" to "anon";

grant insert on table "public"."game_invitations" to "anon";

grant references on table "public"."game_invitations" to "anon";

grant select on table "public"."game_invitations" to "anon";

grant trigger on table "public"."game_invitations" to "anon";

grant truncate on table "public"."game_invitations" to "anon";

grant update on table "public"."game_invitations" to "anon";

grant delete on table "public"."game_invitations" to "authenticated";

grant insert on table "public"."game_invitations" to "authenticated";

grant references on table "public"."game_invitations" to "authenticated";

grant trigger on table "public"."game_invitations" to "authenticated";

grant truncate on table "public"."game_invitations" to "authenticated";

grant update on table "public"."game_invitations" to "authenticated";

grant delete on table "public"."game_rounds" to "anon";

grant insert on table "public"."game_rounds" to "anon";

grant references on table "public"."game_rounds" to "anon";

grant select on table "public"."game_rounds" to "anon";

grant trigger on table "public"."game_rounds" to "anon";

grant truncate on table "public"."game_rounds" to "anon";

grant update on table "public"."game_rounds" to "anon";

grant delete on table "public"."game_rounds" to "authenticated";

grant insert on table "public"."game_rounds" to "authenticated";

grant references on table "public"."game_rounds" to "authenticated";

grant trigger on table "public"."game_rounds" to "authenticated";

grant truncate on table "public"."game_rounds" to "authenticated";

grant update on table "public"."game_rounds" to "authenticated";

grant delete on table "public"."game_session_players" to "anon";

grant insert on table "public"."game_session_players" to "anon";

grant references on table "public"."game_session_players" to "anon";

grant select on table "public"."game_session_players" to "anon";

grant trigger on table "public"."game_session_players" to "anon";

grant truncate on table "public"."game_session_players" to "anon";

grant update on table "public"."game_session_players" to "anon";

grant delete on table "public"."game_session_players" to "authenticated";

grant insert on table "public"."game_session_players" to "authenticated";

grant references on table "public"."game_session_players" to "authenticated";

grant trigger on table "public"."game_session_players" to "authenticated";

grant truncate on table "public"."game_session_players" to "authenticated";

grant update on table "public"."game_session_players" to "authenticated";

grant delete on table "public"."game_session_results" to "anon";

grant insert on table "public"."game_session_results" to "anon";

grant references on table "public"."game_session_results" to "anon";

grant select on table "public"."game_session_results" to "anon";

grant trigger on table "public"."game_session_results" to "anon";

grant truncate on table "public"."game_session_results" to "anon";

grant update on table "public"."game_session_results" to "anon";

grant delete on table "public"."game_session_results" to "authenticated";

grant insert on table "public"."game_session_results" to "authenticated";

grant references on table "public"."game_session_results" to "authenticated";

grant trigger on table "public"."game_session_results" to "authenticated";

grant truncate on table "public"."game_session_results" to "authenticated";

grant update on table "public"."game_session_results" to "authenticated";

grant delete on table "public"."game_sessions" to "anon";

grant insert on table "public"."game_sessions" to "anon";

grant references on table "public"."game_sessions" to "anon";

grant select on table "public"."game_sessions" to "anon";

grant trigger on table "public"."game_sessions" to "anon";

grant truncate on table "public"."game_sessions" to "anon";

grant update on table "public"."game_sessions" to "anon";

grant delete on table "public"."game_sessions" to "authenticated";

grant insert on table "public"."game_sessions" to "authenticated";

grant references on table "public"."game_sessions" to "authenticated";

grant trigger on table "public"."game_sessions" to "authenticated";

grant truncate on table "public"."game_sessions" to "authenticated";

grant update on table "public"."game_sessions" to "authenticated";

grant delete on table "public"."memory_corrections" to "anon";

grant insert on table "public"."memory_corrections" to "anon";

grant references on table "public"."memory_corrections" to "anon";

grant select on table "public"."memory_corrections" to "anon";

grant trigger on table "public"."memory_corrections" to "anon";

grant truncate on table "public"."memory_corrections" to "anon";

grant update on table "public"."memory_corrections" to "anon";

grant delete on table "public"."messages" to "anon";

grant insert on table "public"."messages" to "anon";

grant references on table "public"."messages" to "anon";

grant select on table "public"."messages" to "anon";

grant trigger on table "public"."messages" to "anon";

grant truncate on table "public"."messages" to "anon";

grant update on table "public"."messages" to "anon";

grant delete on table "public"."pairing_tokens" to "anon";

grant insert on table "public"."pairing_tokens" to "anon";

grant references on table "public"."pairing_tokens" to "anon";

grant select on table "public"."pairing_tokens" to "anon";

grant trigger on table "public"."pairing_tokens" to "anon";

grant truncate on table "public"."pairing_tokens" to "anon";

grant update on table "public"."pairing_tokens" to "anon";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."rate_limits" to "anon";

grant insert on table "public"."rate_limits" to "anon";

grant references on table "public"."rate_limits" to "anon";

grant select on table "public"."rate_limits" to "anon";

grant trigger on table "public"."rate_limits" to "anon";

grant truncate on table "public"."rate_limits" to "anon";

grant update on table "public"."rate_limits" to "anon";

grant delete on table "public"."rate_limits" to "authenticated";

grant insert on table "public"."rate_limits" to "authenticated";

grant references on table "public"."rate_limits" to "authenticated";

grant select on table "public"."rate_limits" to "authenticated";

grant trigger on table "public"."rate_limits" to "authenticated";

grant truncate on table "public"."rate_limits" to "authenticated";

grant update on table "public"."rate_limits" to "authenticated";

grant delete on table "public"."user_memory" to "anon";

grant insert on table "public"."user_memory" to "anon";

grant references on table "public"."user_memory" to "anon";

grant select on table "public"."user_memory" to "anon";

grant trigger on table "public"."user_memory" to "anon";

grant truncate on table "public"."user_memory" to "anon";

grant update on table "public"."user_memory" to "anon";

grant delete on table "public"."user_memory" to "authenticated";

grant insert on table "public"."user_memory" to "authenticated";

grant truncate on table "public"."user_memory" to "authenticated";

grant update on table "public"."user_memory" to "authenticated";

drop trigger if exists "on_auth_user_deleted" on "auth"."users";
