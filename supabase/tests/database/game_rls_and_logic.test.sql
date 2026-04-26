begin;

set local search_path = public, extensions;

select plan(17);

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
    '61111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'ga@example.com',
    crypt('password', gen_salt('bf')),
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '62222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'gb@example.com',
    crypt('password', gen_salt('bf')),
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '63333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'gc@example.com',
    crypt('password', gen_salt('bf')),
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '64444444-4444-4444-4444-444444444444',
    'authenticated',
    'authenticated',
    'gd@example.com',
    crypt('password', gen_salt('bf')),
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.couples (id, partner1_id, partner2_id, is_active)
values
  (
    '6aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '61111111-1111-1111-1111-111111111111',
    '62222222-2222-2222-2222-222222222222',
    true
  ),
  (
    '6bbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '63333333-3333-3333-3333-333333333333',
    '64444444-4444-4444-4444-444444444444',
    true
  );

update public.profiles
set couple_id = case id
  when '61111111-1111-1111-1111-111111111111' then '6aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  when '62222222-2222-2222-2222-222222222222' then '6aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  when '63333333-3333-3333-3333-333333333333' then '6bbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid
  when '64444444-4444-4444-4444-444444444444' then '6bbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid
  else null
end;

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
  '6ccccccc-cccc-cccc-cccc-cccccccccccc',
  '6aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '61111111-1111-1111-1111-111111111111',
  '62222222-2222-2222-2222-222222222222',
  'would_you_rather',
  'mixed',
  'pending',
  now() + interval '1 day'
);

insert into public.game_sessions (
  id,
  couple_id,
  invitation_id,
  game_type,
  category_key,
  status,
  created_by,
  total_rounds
)
values (
  '6ddddddd-dddd-dddd-dddd-dddddddddddd',
  '6aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '6ccccccc-cccc-cccc-cccc-cccccccccccc',
  'would_you_rather',
  'mixed',
  'active',
  '61111111-1111-1111-1111-111111111111',
  10
);

update public.game_invitations
set session_id = '6ddddddd-dddd-dddd-dddd-dddddddddddd'
where id = '6ccccccc-cccc-cccc-cccc-cccccccccccc';

insert into public.game_rounds (
  id,
  session_id,
  round_index,
  status,
  prompt_id,
  prompt_payload,
  category_key
)
values
  (
    '6eeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '6ddddddd-dddd-dddd-dddd-dddddddddddd',
    0,
    'open',
    'prompt-open',
    '{"question":"Open round"}'::jsonb,
    'mixed'
  ),
  (
    '6fffffff-ffff-ffff-ffff-ffffffffffff',
    '6ddddddd-dddd-dddd-dddd-dddddddddddd',
    1,
    'revealed',
    'prompt-revealed',
    '{"question":"Revealed round"}'::jsonb,
    'mixed'
  );

insert into public.game_session_players (session_id, user_id, state)
values
  ('6ddddddd-dddd-dddd-dddd-dddddddddddd', '61111111-1111-1111-1111-111111111111', 'ready'),
  ('6ddddddd-dddd-dddd-dddd-dddddddddddd', '62222222-2222-2222-2222-222222222222', 'ready');

insert into public.game_answers (id, session_id, round_id, user_id, answer_payload)
values
  (
    '70000000-0000-0000-0000-000000000001',
    '6ddddddd-dddd-dddd-dddd-dddddddddddd',
    '6eeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '61111111-1111-1111-1111-111111111111',
    '{"choice":"A"}'::jsonb
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    '6ddddddd-dddd-dddd-dddd-dddddddddddd',
    '6fffffff-ffff-ffff-ffff-ffffffffffff',
    '61111111-1111-1111-1111-111111111111',
    '{"choice":"B"}'::jsonb
  ),
  (
    '70000000-0000-0000-0000-000000000003',
    '6ddddddd-dddd-dddd-dddd-dddddddddddd',
    '6fffffff-ffff-ffff-ffff-ffffffffffff',
    '62222222-2222-2222-2222-222222222222',
    '{"choice":"A"}'::jsonb
  );

insert into public.game_session_results (
  session_id,
  couple_id,
  game_type,
  category_key,
  summary_payload,
  compatibility_score,
  match_count,
  round_count
)
values (
  '6ddddddd-dddd-dddd-dddd-dddddddddddd',
  '6aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'would_you_rather',
  'mixed',
  '{"summary":"Nice match"}'::jsonb,
  78,
  1,
  2
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '61111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*)::integer from public.game_invitations),
  1,
  'couple member can see own invitation rows'
);

select is(
  (select count(*)::integer from public.game_sessions),
  1,
  'couple member can see own session rows'
);

select is(
  (select count(*)::integer from public.game_rounds),
  2,
  'couple member can see own session rounds'
);

select is(
  (select count(*)::integer from public.game_session_players),
  2,
  'couple member can see session players'
);

select is(
  (select count(*)::integer from public.game_session_results),
  1,
  'couple member can see own session results'
);

select set_config('request.jwt.claim.sub', '63333333-3333-3333-3333-333333333333', true);

select is(
  (
    select count(*)::integer
    from public.game_invitations
    where couple_id = '6aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  0,
  'unrelated couple cannot see another couples invitations'
);

select is(
  (
    select count(*)::integer
    from public.game_sessions
    where couple_id = '6aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  0,
  'unrelated couple cannot see another couples sessions'
);

select set_config('request.jwt.claim.sub', '62222222-2222-2222-2222-222222222222', true);

select is(
  (
    select count(*)::integer
    from public.game_answers
    where round_id = '6eeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
      and user_id = '61111111-1111-1111-1111-111111111111'
  ),
  0,
  'partner cannot see the other players answer before reveal'
);

select set_config('request.jwt.claim.sub', '61111111-1111-1111-1111-111111111111', true);

select is(
  (
    select count(*)::integer
    from public.game_answers
    where round_id = '6eeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
  ),
  1,
  'answer author can still see their own unrevealed answer'
);

select set_config('request.jwt.claim.sub', '62222222-2222-2222-2222-222222222222', true);

select is(
  (
    select count(*)::integer
    from public.game_answers
    where round_id = '6fffffff-ffff-ffff-ffff-ffffffffffff'
  ),
  2,
  'session participants can see both answers after reveal'
);

select set_config('request.jwt.claim.sub', '63333333-3333-3333-3333-333333333333', true);

select is(
  (
    select count(*)::integer
    from public.game_answers
    where session_id = '6ddddddd-dddd-dddd-dddd-dddddddddddd'
  ),
  0,
  'unrelated couple cannot see another session answers'
);

select is(
  (
    select count(*)::integer
    from public.game_session_results
    where couple_id = '6aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  0,
  'unrelated couple cannot see another couples session results'
);

select set_config('request.jwt.claim.sub', '61111111-1111-1111-1111-111111111111', true);

select throws_ok(
  $sql$
    insert into public.game_sessions (couple_id, game_type, category_key, status, created_by, total_rounds)
    values ('6aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'would_you_rather', 'mixed', 'waiting', '61111111-1111-1111-1111-111111111111', 10)
  $sql$,
  '42501',
  null,
  'authenticated user cannot insert game_sessions directly'
);

select throws_ok(
  $sql$
    insert into public.game_answers (session_id, round_id, user_id, answer_payload)
    values ('6ddddddd-dddd-dddd-dddd-dddddddddddd', '6eeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '61111111-1111-1111-1111-111111111111', '{"choice":"B"}'::jsonb)
  $sql$,
  '42501',
  null,
  'authenticated user cannot insert game_answers directly'
);

reset role;

select throws_ok(
  $sql$
    insert into public.game_invitations (couple_id, from_user_id, to_user_id, game_type, category_key, status, expires_at)
    values ('6aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '61111111-1111-1111-1111-111111111111', '62222222-2222-2222-2222-222222222222', 'would_you_rather', 'mixed', 'pending', now() + interval '1 day')
  $sql$,
  '23505',
  null,
  'only one pending invitation per couple is allowed'
);

select throws_ok(
  $sql$
    insert into public.game_invitations (couple_id, from_user_id, to_user_id, game_type, category_key, status, expires_at)
    values ('6aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '61111111-1111-1111-1111-111111111111', '61111111-1111-1111-1111-111111111111', 'would_you_rather', 'mixed', 'accepted', now() + interval '1 day')
  $sql$,
  '23514',
  null,
  'game invitation requires different sender and recipient'
);

select throws_ok(
  $sql$
    insert into public.game_sessions (couple_id, game_type, category_key, status, created_by, total_rounds)
    values ('6aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'would_you_rather', 'mixed', 'waiting', '61111111-1111-1111-1111-111111111111', 10)
  $sql$,
  '23505',
  null,
  'only one active or waiting session per couple is allowed'
);

select * from finish();

rollback;
