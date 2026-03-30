
ALTER TABLE public.question_progress
  ADD COLUMN IF NOT EXISTS questions_frequency text NOT NULL DEFAULT 'day',
  ADD COLUMN IF NOT EXISTS dna_frequency text NOT NULL DEFAULT 'day';
