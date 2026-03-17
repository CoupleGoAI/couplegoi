create extension if not exists "moddatetime" with schema "extensions";

create type "public"."conversation_type" as enum ('chat', 'onboarding', 'couple_setup');
create type "public"."message_role" as enum ('user', 'assistant');


  create table "public"."couples" (
    "id" uuid not null default gen_random_uuid(),
    "partner1_id" uuid not null,
    "partner2_id" uuid not null,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "disconnected_at" timestamp with time zone
      );


alter table "public"."couples" enable row level security;


  create table "public"."messages" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "role" public.message_role not null,
    "content" text not null,
    "conversation_type" public.conversation_type not null default 'chat'::public.conversation_type,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."messages" enable row level security;


  create table "public"."pairing_tokens" (
    "id" uuid not null default gen_random_uuid(),
    "creator_id" uuid not null,
    "token" text not null,
    "expires_at" timestamp with time zone not null,
    "used" boolean not null default false,
    "used_by" uuid,
    "couple_id" uuid,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."pairing_tokens" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "email" text not null,
    "name" text,
    "birth_date" date,
    "dating_start_date" date,
    "help_focus" text,
    "avatar_url" text,
    "onboarding_completed" boolean not null default false,
    "couple_id" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."profiles" enable row level security;

CREATE UNIQUE INDEX couples_pkey ON public.couples USING btree (id);

CREATE INDEX idx_couples_partner1 ON public.couples USING btree (partner1_id) WHERE (is_active = true);

CREATE INDEX idx_couples_partner2 ON public.couples USING btree (partner2_id) WHERE (is_active = true);

CREATE INDEX idx_messages_user_created ON public.messages USING btree (user_id, created_at DESC);

CREATE INDEX idx_messages_user_type ON public.messages USING btree (user_id, conversation_type, created_at DESC);

CREATE INDEX idx_pairing_tokens_creator ON public.pairing_tokens USING btree (creator_id);

CREATE INDEX idx_pairing_tokens_token ON public.pairing_tokens USING btree (token) WHERE (used = false);

CREATE INDEX idx_profiles_couple_id ON public.profiles USING btree (couple_id) WHERE (couple_id IS NOT NULL);

CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);

CREATE UNIQUE INDEX pairing_tokens_pkey ON public.pairing_tokens USING btree (id);

CREATE UNIQUE INDEX pairing_tokens_token_unique ON public.pairing_tokens USING btree (token);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

alter table "public"."couples" add constraint "couples_pkey" PRIMARY KEY using index "couples_pkey";

alter table "public"."messages" add constraint "messages_pkey" PRIMARY KEY using index "messages_pkey";

alter table "public"."pairing_tokens" add constraint "pairing_tokens_pkey" PRIMARY KEY using index "pairing_tokens_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."couples" add constraint "couples_partner1_id_fkey" FOREIGN KEY (partner1_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."couples" validate constraint "couples_partner1_id_fkey";

alter table "public"."couples" add constraint "couples_partner2_id_fkey" FOREIGN KEY (partner2_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."couples" validate constraint "couples_partner2_id_fkey";

alter table "public"."couples" add constraint "couples_partners_different" CHECK ((partner1_id <> partner2_id)) not valid;

alter table "public"."couples" validate constraint "couples_partners_different";

alter table "public"."messages" add constraint "messages_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_user_id_fkey";

alter table "public"."pairing_tokens" add constraint "pairing_tokens_couple_id_fkey" FOREIGN KEY (couple_id) REFERENCES public.couples(id) ON DELETE SET NULL not valid;

alter table "public"."pairing_tokens" validate constraint "pairing_tokens_couple_id_fkey";

alter table "public"."pairing_tokens" add constraint "pairing_tokens_creator_id_fkey" FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."pairing_tokens" validate constraint "pairing_tokens_creator_id_fkey";

alter table "public"."pairing_tokens" add constraint "pairing_tokens_token_unique" UNIQUE using index "pairing_tokens_token_unique";

alter table "public"."pairing_tokens" add constraint "pairing_tokens_used_by_fkey" FOREIGN KEY (used_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."pairing_tokens" validate constraint "pairing_tokens_used_by_fkey";

alter table "public"."profiles" add constraint "profiles_couple_id_fkey" FOREIGN KEY (couple_id) REFERENCES public.couples(id) ON DELETE SET NULL not valid;

alter table "public"."profiles" validate constraint "profiles_couple_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_my_couple_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select couple_id
  from public.profiles
  where id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.get_partner_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    case
      when c.partner1_id = auth.uid() then c.partner2_id
      when c.partner2_id = auth.uid() then c.partner1_id
      else null
    end
  from public.profiles p
  join public.couples c on c.id = p.couple_id and c.is_active = true
  where p.id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, email)
  values (
    new.id,
    new.email
  );
  return new;
end;
$function$
;

grant delete on table "public"."couples" to "anon";

grant insert on table "public"."couples" to "anon";

grant references on table "public"."couples" to "anon";

grant select on table "public"."couples" to "anon";

grant trigger on table "public"."couples" to "anon";

grant truncate on table "public"."couples" to "anon";

grant update on table "public"."couples" to "anon";

grant delete on table "public"."couples" to "authenticated";

grant insert on table "public"."couples" to "authenticated";

grant references on table "public"."couples" to "authenticated";

grant select on table "public"."couples" to "authenticated";

grant trigger on table "public"."couples" to "authenticated";

grant truncate on table "public"."couples" to "authenticated";

grant update on table "public"."couples" to "authenticated";

grant delete on table "public"."couples" to "service_role";

grant insert on table "public"."couples" to "service_role";

grant references on table "public"."couples" to "service_role";

grant select on table "public"."couples" to "service_role";

grant trigger on table "public"."couples" to "service_role";

grant truncate on table "public"."couples" to "service_role";

grant update on table "public"."couples" to "service_role";

grant delete on table "public"."messages" to "anon";

grant insert on table "public"."messages" to "anon";

grant references on table "public"."messages" to "anon";

grant select on table "public"."messages" to "anon";

grant trigger on table "public"."messages" to "anon";

grant truncate on table "public"."messages" to "anon";

grant update on table "public"."messages" to "anon";

grant delete on table "public"."messages" to "authenticated";

grant insert on table "public"."messages" to "authenticated";

grant references on table "public"."messages" to "authenticated";

grant select on table "public"."messages" to "authenticated";

grant trigger on table "public"."messages" to "authenticated";

grant truncate on table "public"."messages" to "authenticated";

grant update on table "public"."messages" to "authenticated";

grant delete on table "public"."messages" to "service_role";

grant insert on table "public"."messages" to "service_role";

grant references on table "public"."messages" to "service_role";

grant select on table "public"."messages" to "service_role";

grant trigger on table "public"."messages" to "service_role";

grant truncate on table "public"."messages" to "service_role";

grant update on table "public"."messages" to "service_role";

grant delete on table "public"."pairing_tokens" to "anon";

grant insert on table "public"."pairing_tokens" to "anon";

grant references on table "public"."pairing_tokens" to "anon";

grant select on table "public"."pairing_tokens" to "anon";

grant trigger on table "public"."pairing_tokens" to "anon";

grant truncate on table "public"."pairing_tokens" to "anon";

grant update on table "public"."pairing_tokens" to "anon";

grant delete on table "public"."pairing_tokens" to "authenticated";

grant insert on table "public"."pairing_tokens" to "authenticated";

grant references on table "public"."pairing_tokens" to "authenticated";

grant select on table "public"."pairing_tokens" to "authenticated";

grant trigger on table "public"."pairing_tokens" to "authenticated";

grant truncate on table "public"."pairing_tokens" to "authenticated";

grant update on table "public"."pairing_tokens" to "authenticated";

grant delete on table "public"."pairing_tokens" to "service_role";

grant insert on table "public"."pairing_tokens" to "service_role";

grant references on table "public"."pairing_tokens" to "service_role";

grant select on table "public"."pairing_tokens" to "service_role";

grant trigger on table "public"."pairing_tokens" to "service_role";

grant truncate on table "public"."pairing_tokens" to "service_role";

grant update on table "public"."pairing_tokens" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";


  create policy "Users can view own couple"
  on "public"."couples"
  as permissive
  for select
  to authenticated
using (((( SELECT auth.uid() AS uid) = partner1_id) OR (( SELECT auth.uid() AS uid) = partner2_id)));



  create policy "Users can insert own messages"
  on "public"."messages"
  as permissive
  for insert
  to authenticated
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can view own messages"
  on "public"."messages"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can view own tokens"
  on "public"."pairing_tokens"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = creator_id));



  create policy "Users can update own profile"
  on "public"."profiles"
  as permissive
  for update
  to authenticated
using ((( SELECT auth.uid() AS uid) = id))
with check (((( SELECT auth.uid() AS uid) = id) AND (NOT (couple_id IS DISTINCT FROM ( SELECT profiles_1.couple_id
   FROM public.profiles profiles_1
  WHERE (profiles_1.id = ( SELECT auth.uid() AS uid)))))));



  create policy "Users can view own profile"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = id));



  create policy "Users can view partner profile"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using ((id IN ( SELECT
        CASE
            WHEN (c.partner1_id = ( SELECT auth.uid() AS uid)) THEN c.partner2_id
            WHEN (c.partner2_id = ( SELECT auth.uid() AS uid)) THEN c.partner1_id
            ELSE NULL::uuid
        END AS "case"
   FROM public.couples c
  WHERE ((c.id = profiles.couple_id) AND (c.is_active = true)))));


CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


