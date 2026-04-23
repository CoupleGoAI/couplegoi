-- memory_corrections: stores user-submitted corrections to AI memory.
-- Edge functions read pending corrections (applied_at IS NULL) and fold them
-- into the next memory update cycle, then stamp applied_at.

CREATE TABLE IF NOT EXISTS public.memory_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('user', 'couple')),
  owner_id text NOT NULL,
  target_kind text,
  target_key text,
  instruction text NOT NULL CHECK (char_length(instruction) BETWEEN 1 AND 500),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz
);

CREATE INDEX idx_memory_corrections_pending
  ON public.memory_corrections (scope, owner_id)
  WHERE applied_at IS NULL;

CREATE INDEX idx_memory_corrections_created_by
  ON public.memory_corrections (created_by);

ALTER TABLE public.memory_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own corrections"
  ON public.memory_corrections FOR SELECT
  USING ((select auth.uid())::text = created_by::text);

CREATE POLICY "Users can insert own corrections"
  ON public.memory_corrections FOR INSERT
  WITH CHECK ((select auth.uid())::text = created_by::text);
