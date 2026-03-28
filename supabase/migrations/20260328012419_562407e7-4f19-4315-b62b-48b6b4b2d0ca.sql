ALTER TABLE public.question_progress 
ADD COLUMN IF NOT EXISTS notify_questions boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_dna boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS dna_daily_times text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS dna_daily_times_date date;