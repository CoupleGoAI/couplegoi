begin;

set local search_path = public, extensions;

select plan(25);

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
    'a@example.com',
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
    'b@example.com',
    crypt('password', gen_salt('bf')),
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'c@example.com',
    crypt('password', gen_salt('bf')),
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'authenticated',
    'authenticated',
    'd@example.com',
    crypt('password', gen_salt('bf')),
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'authenticated',
    'authenticated',
    'e@example.com',
    crypt('password', gen_salt('bf')),
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

update public.profiles
set name = case id
  when '11111111-1111-1111-1111-111111111111' then 'Partner A'
  when '22222222-2222-2222-2222-222222222222' then 'Partner B'
  when '33333333-3333-3333-3333-333333333333' then 'Partner C'
  when '44444444-4444-4444-4444-444444444444' then 'Partner D'
  else 'Partner E'
end;

insert into public.couples (id, partner1_id, partner2_id, is_active)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    true
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    true
  );

update public.profiles
set couple_id = case id
  when '11111111-1111-1111-1111-111111111111' then 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  when '22222222-2222-2222-2222-222222222222' then 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  when '33333333-3333-3333-3333-333333333333' then 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid
  when '44444444-4444-4444-4444-444444444444' then 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid
  else null
end;

insert into public.pairing_tokens (creator_id, token, expires_at)
values
  ('11111111-1111-1111-1111-111111111111', 'token-a', now() + interval '1 day'),
  ('33333333-3333-3333-3333-333333333333', 'token-c', now() + interval '1 day');

insert into public.user_memory (user_id, summary, traits, message_count)
values
  ('11111111-1111-1111-1111-111111111111', 'A memory', '{"tone":"warm"}'::jsonb, 4),
  ('33333333-3333-3333-3333-333333333333', 'C memory', '{"tone":"calm"}'::jsonb, 2);

insert into public.couple_memory (couple_id, summary, traits, message_count)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A+B memory', '{"rituals":"Friday walks"}'::jsonb, 10),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'C+D memory', '{"rituals":"Sunday coffee"}'::jsonb, 6);

insert into public.messages (user_id, role, content, conversation_type)
values
  ('11111111-1111-1111-1111-111111111111', 'user', 'A solo chat', 'chat'),
  ('22222222-2222-2222-2222-222222222222', 'user', 'B solo chat', 'chat'),
  ('11111111-1111-1111-1111-111111111111', 'user', 'A couple chat', 'couple_chat'),
  ('22222222-2222-2222-2222-222222222222', 'user', 'B couple chat', 'couple_chat'),
  ('11111111-1111-1111-1111-111111111111', 'user', 'A couple setup', 'couple_setup'),
  ('22222222-2222-2222-2222-222222222222', 'user', 'B couple setup', 'couple_setup'),
  ('33333333-3333-3333-3333-333333333333', 'user', 'C onboarding', 'onboarding');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*)::integer from public.profiles),
  2,
  'user A can see only own and partner profiles'
);

select is(
  (
    select count(*)::integer
    from public.profiles
    where id = '33333333-3333-3333-3333-333333333333'
  ),
  0,
  'user A cannot see unrelated profiles'
);

select is(
  (select count(*)::integer from public.pairing_tokens),
  1,
  'user A can see only own pairing token'
);

select is(
  (
    select count(*)::integer
    from public.messages
    where conversation_type = 'chat'
  ),
  1,
  'user A can see only own solo chat messages'
);

select is(
  (
    select count(*)::integer
    from public.messages
    where conversation_type = 'couple_chat'
  ),
  2,
  'user A can see both sides of couple chat'
);

select is(
  (
    select count(*)::integer
    from public.messages
    where conversation_type = 'couple_setup'
  ),
  2,
  'user A can see both sides of couple setup messages'
);

select is(
  (
    select count(*)::integer
    from public.messages
    where user_id = '22222222-2222-2222-2222-222222222222'
      and conversation_type = 'chat'
  ),
  0,
  'user A cannot see partner solo chat'
);

select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);

select is(
  (
    select count(*)::integer
    from public.messages
    where conversation_type = 'couple_chat'
      and user_id in (
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222'
      )
  ),
  0,
  'unrelated user cannot see another couples couple-chat messages'
);

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select is(
  (select count(*)::integer from public.user_memory),
  1,
  'user A can see only own user_memory row'
);

select is(
  (
    select count(*)::integer
    from public.user_memory
    where user_id = '33333333-3333-3333-3333-333333333333'
  ),
  0,
  'user A cannot see another users user_memory row'
);

select is(
  (select count(*)::integer from public.couple_memory),
  1,
  'user A can see own active couple_memory row'
);

select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);

select is(
  (
    select count(*)::integer
    from public.couple_memory
    where couple_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  0,
  'unrelated user cannot see another couples couple_memory row'
);

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select throws_ok(
  $sql$
    insert into public.messages (user_id, role, content, conversation_type)
    values ('11111111-1111-1111-1111-111111111111', 'user', 'direct write', 'chat')
  $sql$,
  '42501',
  null,
  'authenticated user cannot insert messages directly'
);

select throws_ok(
  $sql$
    insert into public.user_memory (user_id, summary, traits, message_count)
    values ('11111111-1111-1111-1111-111111111111', 'direct write', '{}'::jsonb, 1)
  $sql$,
  '42501',
  null,
  'authenticated user cannot insert user_memory directly'
);

select lives_ok(
  $sql$
    insert into public.memory_corrections (scope, owner_id, instruction, created_by)
    values ('user', '11111111-1111-1111-1111-111111111111', 'Please remove the old summary.', '11111111-1111-1111-1111-111111111111')
  $sql$,
  'user A can insert a self-scoped memory correction'
);

select lives_ok(
  $sql$
    insert into public.memory_corrections (scope, owner_id, instruction, created_by)
    values ('couple', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Keep only shared rituals.', '11111111-1111-1111-1111-111111111111')
  $sql$,
  'user A can insert a correction for own active couple'
);

select is(
  (select count(*)::integer from public.memory_corrections),
  2,
  'user A can read back own visible corrections'
);

select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);

select throws_ok(
  $sql$
    insert into public.memory_corrections (scope, owner_id, instruction, created_by)
    values ('user', '11111111-1111-1111-1111-111111111111', 'Tamper with someone else memory.', '33333333-3333-3333-3333-333333333333')
  $sql$,
  '42501',
  null,
  'user C cannot insert a user-scoped correction for another user'
);

select throws_ok(
  $sql$
    insert into public.memory_corrections (scope, owner_id, instruction, created_by)
    values ('couple', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tamper with another couple.', '33333333-3333-3333-3333-333333333333')
  $sql$,
  '42501',
  null,
  'user C cannot insert a correction for another active couple'
);

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select is(
  (select count(*)::integer from public.rate_limits),
  0,
  'authenticated user cannot read rate_limits rows directly'
);

select throws_ok(
  $sql$
    insert into public.rate_limits (user_id, endpoint, window_start, count)
    values ('11111111-1111-1111-1111-111111111111', 'chat', date_trunc('minute', now()), 1)
  $sql$,
  '42501',
  null,
  'authenticated user cannot write rate_limits directly'
);

select ok(
  public.check_rate_limit('11111111-1111-1111-1111-111111111111', 'chat', 2),
  'check_rate_limit allows first call within threshold'
);

select ok(
  public.check_rate_limit('11111111-1111-1111-1111-111111111111', 'chat', 2),
  'check_rate_limit allows second call within threshold'
);

select ok(
  not public.check_rate_limit('11111111-1111-1111-1111-111111111111', 'chat', 2),
  'check_rate_limit blocks the third call over threshold'
);

select is(
  (select count(*)::integer from public.rate_limits),
  0,
  'authenticated user still cannot read rate_limits rows after calling the RPC'
);

reset role;

select * from finish();

rollback;
