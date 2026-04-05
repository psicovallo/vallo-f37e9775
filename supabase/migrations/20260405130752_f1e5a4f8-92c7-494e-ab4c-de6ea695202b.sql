ALTER TABLE public.question_progress
  ADD COLUMN IF NOT EXISTS notify_sfogo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sfogo_per_day integer NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS sfogo_frequency text NOT NULL DEFAULT 'day',
  ADD COLUMN IF NOT EXISTS sfogo_daily_times text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS sfogo_daily_times_date text DEFAULT NULL;