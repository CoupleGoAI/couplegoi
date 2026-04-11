create table "public"."couple_memory" (
    "couple_id" uuid not null,
    "summary" text not null default ''::text,
    "traits" jsonb not null default '{}'::jsonb,
    "message_count" integer not null default 0,
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."couple_memory" enable row level security;

CREATE UNIQUE INDEX couple_memory_pkey ON public.couple_memory USING btree (couple_id);

alter table "public"."couple_memory" add constraint "couple_memory_pkey" PRIMARY KEY using index "couple_memory_pkey";

alter table "public"."couple_memory" add constraint "couple_memory_couple_id_fkey" FOREIGN KEY (couple_id) REFERENCES public.couples(id) ON DELETE CASCADE not valid;

alter table "public"."couple_memory" validate constraint "couple_memory_couple_id_fkey";

grant delete on table "public"."couple_memory" to "anon";
grant insert on table "public"."couple_memory" to "anon";
grant references on table "public"."couple_memory" to "anon";
grant select on table "public"."couple_memory" to "anon";
grant trigger on table "public"."couple_memory" to "anon";
grant truncate on table "public"."couple_memory" to "anon";
grant update on table "public"."couple_memory" to "anon";

grant delete on table "public"."couple_memory" to "authenticated";
grant insert on table "public"."couple_memory" to "authenticated";
grant references on table "public"."couple_memory" to "authenticated";
grant select on table "public"."couple_memory" to "authenticated";
grant trigger on table "public"."couple_memory" to "authenticated";
grant truncate on table "public"."couple_memory" to "authenticated";
grant update on table "public"."couple_memory" to "authenticated";

grant delete on table "public"."couple_memory" to "service_role";
grant insert on table "public"."couple_memory" to "service_role";
grant references on table "public"."couple_memory" to "service_role";
grant select on table "public"."couple_memory" to "service_role";
grant trigger on table "public"."couple_memory" to "service_role";
grant truncate on table "public"."couple_memory" to "service_role";
grant update on table "public"."couple_memory" to "service_role";


  create policy "Users can view own couple memory"
  on "public"."couple_memory"
  as permissive
  for select
  to authenticated
using (
  exists (
    select 1 from public.couples c
    where c.id = couple_memory.couple_id
      and c.is_active = true
      and ((( SELECT auth.uid() AS uid) = c.partner1_id) or (( SELECT auth.uid() AS uid) = c.partner2_id))
  )
);
