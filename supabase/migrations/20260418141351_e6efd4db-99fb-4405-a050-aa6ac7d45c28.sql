
ALTER TABLE public.question_progress
  ADD COLUMN IF NOT EXISTS custom_questions_text text,
  ADD COLUMN IF NOT EXISTS custom_dna_text text,
  ADD COLUMN IF NOT EXISTS custom_sfogo_text text,
  ADD COLUMN IF NOT EXISTS custom_overton_text text,
  ADD COLUMN IF NOT EXISTS notify_overton boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  url text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_log_user_sent_idx
  ON public.notification_log (user_id, sent_at DESC);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification log"
  ON public.notification_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification log"
  ON public.notification_log
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
