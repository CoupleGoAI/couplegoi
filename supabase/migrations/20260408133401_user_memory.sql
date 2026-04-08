create table "public"."user_memory" (
    "user_id" uuid not null,
    "summary" text not null default ''::text,
    "traits" jsonb not null default '{}'::jsonb,
    "message_count" integer not null default 0,
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."user_memory" enable row level security;

CREATE UNIQUE INDEX user_memory_pkey ON public.user_memory USING btree (user_id);

alter table "public"."user_memory" add constraint "user_memory_pkey" PRIMARY KEY using index "user_memory_pkey";

alter table "public"."user_memory" add constraint "user_memory_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_memory" validate constraint "user_memory_user_id_fkey";

grant delete on table "public"."user_memory" to "anon";

grant insert on table "public"."user_memory" to "anon";

grant references on table "public"."user_memory" to "anon";

grant select on table "public"."user_memory" to "anon";

grant trigger on table "public"."user_memory" to "anon";

grant truncate on table "public"."user_memory" to "anon";

grant update on table "public"."user_memory" to "anon";

grant delete on table "public"."user_memory" to "authenticated";

grant insert on table "public"."user_memory" to "authenticated";

grant references on table "public"."user_memory" to "authenticated";

grant select on table "public"."user_memory" to "authenticated";

grant trigger on table "public"."user_memory" to "authenticated";

grant truncate on table "public"."user_memory" to "authenticated";

grant update on table "public"."user_memory" to "authenticated";

grant delete on table "public"."user_memory" to "service_role";

grant insert on table "public"."user_memory" to "service_role";

grant references on table "public"."user_memory" to "service_role";

grant select on table "public"."user_memory" to "service_role";

grant trigger on table "public"."user_memory" to "service_role";

grant truncate on table "public"."user_memory" to "service_role";

grant update on table "public"."user_memory" to "service_role";



  create policy "Users can view own memory"
  on "public"."user_memory"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));
