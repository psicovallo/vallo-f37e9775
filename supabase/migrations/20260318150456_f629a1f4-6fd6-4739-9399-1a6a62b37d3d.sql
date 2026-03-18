
-- Add onboarding and phase tracking to question_progress
ALTER TABLE public.question_progress
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phase text NOT NULL DEFAULT 'incubation',
  ADD COLUMN IF NOT EXISTS questions_read_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notification_window_start text DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS notification_window_end text DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS daily_times text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS daily_times_date date;

-- Track individual question deliveries and reads
CREATE TABLE public.question_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_index integer NOT NULL,
  delivered_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  read_duration_seconds integer NOT NULL DEFAULT 0,
  read_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.question_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deliveries" ON public.question_deliveries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own deliveries" ON public.question_deliveries
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deliveries" ON public.question_deliveries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Service role needs to insert deliveries from edge functions, so also allow insert without auth check
CREATE POLICY "Service can insert deliveries" ON public.question_deliveries
  FOR INSERT TO anon WITH CHECK (true);
