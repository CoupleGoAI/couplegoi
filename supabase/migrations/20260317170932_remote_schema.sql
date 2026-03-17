alter table "public"."messages" alter column "conversation_type" drop default;

alter type "public"."conversation_type" rename to "conversation_type__old_version_to_be_dropped";

create type "public"."conversation_type" as enum ('chat', 'onboarding', 'couple_setup');

alter table "public"."messages" alter column conversation_type type "public"."conversation_type" using conversation_type::text::"public"."conversation_type";

alter table "public"."messages" alter column "conversation_type" set default 'chat'::public.conversation_type;

drop type "public"."conversation_type__old_version_to_be_dropped";


