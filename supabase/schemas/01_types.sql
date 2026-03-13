-- =============================================================================
-- CoupleGoAI — Custom Types
-- =============================================================================
-- Enum types used across tables. Append new values at the end to keep diffs
-- clean when using declarative schemas.
-- =============================================================================

-- Role of a message in a conversation (user-sent or AI-generated).
create type public.message_role as enum ('user', 'assistant');

-- The context a message belongs to.
create type public.conversation_type as enum ('chat', 'onboarding', 'couple_setup');
