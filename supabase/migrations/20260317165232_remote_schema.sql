drop extension if exists "pg_net";

drop trigger if exists "handle_updated_at" on "public"."profiles";

drop policy "Users can update own profile" on "public"."profiles";

drop policy "Users can view partner profile" on "public"."profiles";

alter table "public"."messages" alter column "conversation_type" drop default;

alter type "public"."conversation_type" rename to "conversation_type__old_version_to_be_dropped";

create type "public"."conversation_type" as enum ('chat', 'onboarding');

alter table "public"."messages" alter column conversation_type type "public"."conversation_type" using conversation_type::text::"public"."conversation_type";

alter table "public"."messages" alter column "conversation_type" set default 'chat'::public.conversation_type;

drop type "public"."conversation_type__old_version_to_be_dropped";


  create policy "Users can insert own profile"
  on "public"."profiles"
  as permissive
  for insert
  to authenticated
with check ((( SELECT auth.uid() AS uid) = id));



  create policy "Users can update own profile"
  on "public"."profiles"
  as permissive
  for update
  to authenticated
using ((( SELECT auth.uid() AS uid) = id))
with check ((( SELECT auth.uid() AS uid) = id));



  create policy "Users can view partner profile"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using (((couple_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.profiles me
  WHERE ((me.id = ( SELECT auth.uid() AS uid)) AND (me.couple_id = profiles.couple_id))))));



