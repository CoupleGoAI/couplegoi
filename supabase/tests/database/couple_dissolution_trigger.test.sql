begin;

set local search_path = public, extensions;

select plan(6);

select ok(
  exists(
    select 1
    from pg_trigger
    where tgname = 'on_couple_deactivated'
      and tgrelid = 'public.couples'::regclass
      and not tgisinternal
  ),
  'on_couple_deactivated trigger exists on public.couples'
);

select ok(
  exists(
    select 1
    from pg_proc
    where proname = '_on_couple_deactivated'
      and prosecdef = true
  ),
  '_on_couple_deactivated is security definer'
);

select is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = '_on_couple_deactivated'
      and grantee in ('public', 'anon', 'authenticated')
  ),
  0,
  '_on_couple_deactivated is not callable by public, anon, or authenticated'
);

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'dissolution-a@example.com',
    crypt('password', gen_salt('bf')),
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'dissolution-b@example.com',
    crypt('password', gen_salt('bf')),
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.couples (id, partner1_id, partner2_id, is_active)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  true
);

insert into public.couple_memory (couple_id, summary, traits, message_count)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Shared test memory',
  '{}'::jsonb,
  3
);

insert into public.game_invitations (
  id,
  couple_id,
  from_user_id,
  to_user_id,
  game_type,
  category_key,
  status,
  expires_at
)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'would_you_rather',
  'mixed',
  'pending',
  now() + interval '1 day'
);

insert into public.game_sessions (
  id,
  couple_id,
  game_type,
  category_key,
  status,
  created_by,
  total_rounds
)
values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'would_you_rather',
  'mixed',
  'active',
  '11111111-1111-1111-1111-111111111111',
  10
);

update public.couples
set is_active = false
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select is(
  (
    select count(*)::integer
    from public.game_invitations
    where couple_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and status = 'pending'
  ),
  0,
  'deactivating a couple deletes pending game invitations'
);

select is(
  (
    select status::text
    from public.game_sessions
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  ),
  'cancelled',
  'deactivating a couple cancels active game sessions'
);

select is(
  (
    select count(*)::integer
    from public.couple_memory
    where couple_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  0,
  'deactivating a couple deletes shared couple memory'
);

select * from finish();

rollback;
