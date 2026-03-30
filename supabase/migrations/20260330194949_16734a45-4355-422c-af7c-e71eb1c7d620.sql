
ALTER TABLE public.question_progress
  ADD COLUMN IF NOT EXISTS questions_per_day integer NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS dna_per_day integer NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS notify_days text[] NOT NULL DEFAULT '{lun,mar,mer,gio,ven,sab,dom}'::text[];

ALTER TABLE public.question_progress
  ALTER COLUMN notification_window_start SET DEFAULT '06:00',
  ALTER COLUMN notification_window_end SET DEFAULT '23:00';

UPDATE public.question_progress SET notification_window_end = '23:00' WHERE notification_window_end = '22:00';
