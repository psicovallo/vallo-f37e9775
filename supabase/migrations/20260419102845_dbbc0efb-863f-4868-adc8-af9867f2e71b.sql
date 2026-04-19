-- Aggiungi orari e archivio alle tabelle esistenti
ALTER TABLE public.question_assignments
  ADD COLUMN IF NOT EXISTS times text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

ALTER TABLE public.conflict_questions
  ADD COLUMN IF NOT EXISTS times text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

ALTER TABLE public.overton_steps
  ADD COLUMN IF NOT EXISTS times text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

-- Nuova tabella per domande Sfogo persistite
CREATE TABLE IF NOT EXISTS public.sfogo_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_text text NOT NULL,
  times text[] DEFAULT '{}'::text[],
  archived boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sfogo_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sfogo questions"
  ON public.sfogo_questions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own sfogo questions"
  ON public.sfogo_questions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own sfogo questions"
  ON public.sfogo_questions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own sfogo questions"
  ON public.sfogo_questions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER sfogo_questions_updated_at
  BEFORE UPDATE ON public.sfogo_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_sfogo_questions_user ON public.sfogo_questions(user_id, archived);