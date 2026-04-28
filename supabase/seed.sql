-- ============================================================
-- CoupleGoAI — Local Development Seed
-- ============================================================
-- Two fake users (Alex & Jordan) linked as a couple, with
-- chat messages, memory, and a completed game session.
--
-- Fixed UUIDs make re-runs idempotent (just reset the DB first).
-- Messages are stored as plaintext — crypto.ts treats rows
-- without the ENC:v1: prefix as legacy plaintext (read fine).
--
-- Seed users:
--   alex@seed.local   / password: password123
--   jordan@seed.local / password: password123
-- ============================================================

-- ── 1. Auth users ────────────────────────────────────────────
-- Inserting into auth.users fires the handle_new_user() trigger,
-- which auto-creates the matching public.profiles rows.

insert into auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'alex@seed.local',
  '$2a$06$lwbay73J1Lv5uvXnEqKqLO46ZCAKdLxTF98fpG5Kq/Epmfurvj1Qm',
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  false, 'authenticated', 'authenticated',
  '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'jordan@seed.local',
  '$2a$06$lwbay73J1Lv5uvXnEqKqLO46ZCAKdLxTF98fpG5Kq/Epmfurvj1Qm',
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  false, 'authenticated', 'authenticated',
  '', '', '', ''
);

-- ── 2. Fill out profile fields ───────────────────────────────
-- Trigger created the rows with just id + email; add the rest.

update public.profiles set
  name                 = 'Alex',
  birth_date           = '1999-03-15',
  dating_start_date    = '2024-06-01',
  help_focus           = 'communication',
  onboarding_completed = true
where id = '00000000-0000-0000-0000-000000000001';

update public.profiles set
  name                 = 'Jordan',
  birth_date           = '2000-07-22',
  dating_start_date    = '2024-06-01',
  help_focus           = 'quality time',
  onboarding_completed = true
where id = '00000000-0000-0000-0000-000000000002';

-- ── 3. Couple ────────────────────────────────────────────────

insert into public.couples (id, partner1_id, partner2_id, is_active, created_at)
values (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  true,
  now() - interval '30 days'
);

-- Back-link profiles → couple (managed server-side in prod, direct here for seed).
update public.profiles
  set couple_id = '00000000-0000-0000-0000-000000000010'
where id in (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);

-- ── 4. Messages ──────────────────────────────────────────────

insert into public.messages (user_id, role, content, conversation_type, created_at) values
-- Alex onboarding
('00000000-0000-0000-0000-000000000001', 'user',      'Hey! I''m Alex.',                                              'onboarding', now() - interval '10 days'),
('00000000-0000-0000-0000-000000000001', 'assistant', 'Nice to meet you, Alex! Tell me a bit about yourself.',        'onboarding', now() - interval '10 days' + interval '10 seconds'),
-- Alex chat
('00000000-0000-0000-0000-000000000001', 'user',      'We had an argument yesterday about chores.',                   'chat', now() - interval '2 days'),
('00000000-0000-0000-0000-000000000001', 'assistant', 'That sounds frustrating. What happened?',                      'chat', now() - interval '2 days' + interval '10 seconds'),
('00000000-0000-0000-0000-000000000001', 'user',      'I feel like I end up doing most of the cleaning.',             'chat', now() - interval '2 days' + interval '30 seconds'),
('00000000-0000-0000-0000-000000000001', 'assistant', 'Have you tried scheduling a regular check-in about shared tasks?', 'chat', now() - interval '2 days' + interval '40 seconds'),
-- Jordan chat
('00000000-0000-0000-0000-000000000002', 'user',      'Alex and I have been doing really well lately!',               'chat', now() - interval '1 day'),
('00000000-0000-0000-0000-000000000002', 'assistant', 'That''s wonderful! What has been going well?',                 'chat', now() - interval '1 day' + interval '10 seconds');

-- ── 5. User memory ───────────────────────────────────────────

insert into public.user_memory (user_id, summary, traits, message_count) values
(
  '00000000-0000-0000-0000-000000000001',
  'Alex wants to improve communication and feels the chore split is uneven.',
  '{"openness": "high", "conflict_style": "direct"}'::jsonb,
  6
),
(
  '00000000-0000-0000-0000-000000000002',
  'Jordan values quality time and feels the relationship is in a good place.',
  '{"openness": "medium", "conflict_style": "avoidant"}'::jsonb,
  2
);

-- ── 6. Couple memory ─────────────────────────────────────────

insert into public.couple_memory (couple_id, summary, traits, message_count) values
(
  '00000000-0000-0000-0000-000000000010',
  'Alex and Jordan have been together since June 2024. Shared chores have been a recent tension point.',
  '{"strength": "affection", "growth_area": "shared responsibilities"}'::jsonb,
  8
);

-- ── 7. Game — completed would_you_rather session ─────────────
-- Insert order: invitation (session_id null) → session → update invitation.

insert into public.game_invitations (
  id, couple_id, from_user_id, to_user_id,
  game_type, category_key, status,
  session_id, expires_at, responded_at, created_at
) values (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'would_you_rather', 'fun', 'accepted',
  null,
  now() - interval '3 days' + interval '5 minutes',
  now() - interval '3 days' + interval '1 minute',
  now() - interval '3 days'
);

insert into public.game_sessions (
  id, couple_id, invitation_id, game_type, category_key,
  status, created_by,
  started_at, completed_at, last_activity_at,
  current_round_index, total_rounds, session_seed
) values (
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000020',
  'would_you_rather', 'fun',
  'completed',
  '00000000-0000-0000-0000-000000000001',
  now() - interval '3 days' + interval '2 minutes',
  now() - interval '3 days' + interval '17 minutes',
  now() - interval '3 days' + interval '17 minutes',
  2, 2, 'seed-abc123'
);

update public.game_invitations
  set session_id = '00000000-0000-0000-0000-000000000021'
where id = '00000000-0000-0000-0000-000000000020';

insert into public.game_session_players (session_id, user_id, state, last_seen_at) values
(
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000001',
  'playing',
  now() - interval '3 days' + interval '17 minutes'
),
(
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000002',
  'playing',
  now() - interval '3 days' + interval '17 minutes'
);

insert into public.game_rounds (
  id, session_id, round_index, status,
  prompt_id, prompt_payload, category_key,
  started_at, revealed_at
) values
(
  '00000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000021',
  0, 'revealed',
  'wyr_fun_001',
  '{"option_a": "Travel the world for a year", "option_b": "Win a million dollars"}'::jsonb,
  'fun',
  now() - interval '3 days' + interval '2 minutes',
  now() - interval '3 days' + interval '7 minutes'
),
(
  '00000000-0000-0000-0000-000000000031',
  '00000000-0000-0000-0000-000000000021',
  1, 'revealed',
  'wyr_fun_002',
  '{"option_a": "Always be too hot", "option_b": "Always be too cold"}'::jsonb,
  'fun',
  now() - interval '3 days' + interval '8 minutes',
  now() - interval '3 days' + interval '13 minutes'
);

insert into public.game_answers (session_id, round_id, user_id, answer_payload, answered_at) values
-- Round 1: both chose travel (match)
(
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000001',
  '{"choice": "a"}'::jsonb,
  now() - interval '3 days' + interval '4 minutes'
),
(
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000002',
  '{"choice": "a"}'::jsonb,
  now() - interval '3 days' + interval '5 minutes'
),
-- Round 2: split (no match)
(
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000031',
  '00000000-0000-0000-0000-000000000001',
  '{"choice": "b"}'::jsonb,
  now() - interval '3 days' + interval '10 minutes'
),
(
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000031',
  '00000000-0000-0000-0000-000000000002',
  '{"choice": "a"}'::jsonb,
  now() - interval '3 days' + interval '11 minutes'
);

insert into public.game_session_results (
  session_id, couple_id, game_type, category_key,
  summary_payload, compatibility_score, match_count, round_count, created_at
) values (
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000010',
  'would_you_rather', 'fun',
  '{"highlight": "You both chose to travel the world!"}'::jsonb,
  50, 1, 2,
  now() - interval '3 days' + interval '17 minutes'
);
