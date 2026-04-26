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

DROP POLICY IF EXISTS "Users can read own corrections" ON public.memory_corrections;
DROP POLICY IF EXISTS "Users can view own corrections" ON public.memory_corrections;
DROP POLICY IF EXISTS "Users can insert own corrections" ON public.memory_corrections;

ALTER TABLE public.memory_corrections
  ALTER COLUMN owner_id TYPE text USING owner_id::text;

ALTER TABLE public.memory_corrections
  DROP CONSTRAINT IF EXISTS memory_corrections_target_kind_check;

ALTER TABLE public.memory_corrections
  DROP CONSTRAINT IF EXISTS memory_corrections_created_by_fkey;

ALTER TABLE public.memory_corrections
  ADD CONSTRAINT memory_corrections_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_memory_corrections_pending
  ON public.memory_corrections (scope, owner_id)
  WHERE applied_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_memory_corrections_created_by
  ON public.memory_corrections (created_by);

ALTER TABLE public.memory_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own corrections"
  ON public.memory_corrections FOR SELECT
  USING (
    created_by = (select auth.uid())
    AND (
      (
        scope = 'user'
        AND owner_id = (select auth.uid())::text
      )
      OR (
        scope = 'couple'
        AND EXISTS (
          SELECT 1
          FROM public.couples c
          WHERE c.id::text = owner_id
            AND c.is_active = true
            AND (
              c.partner1_id = (select auth.uid())
              OR c.partner2_id = (select auth.uid())
            )
        )
      )
    )
  );

CREATE POLICY "Users can insert own corrections"
  ON public.memory_corrections FOR INSERT
  WITH CHECK (
    created_by = (select auth.uid())
    AND (
      (
        scope = 'user'
        AND owner_id = (select auth.uid())::text
      )
      OR (
        scope = 'couple'
        AND EXISTS (
          SELECT 1
          FROM public.couples c
          WHERE c.id::text = owner_id
            AND c.is_active = true
            AND (
              c.partner1_id = (select auth.uid())
              OR c.partner2_id = (select auth.uid())
            )
        )
      )
    )
  );
