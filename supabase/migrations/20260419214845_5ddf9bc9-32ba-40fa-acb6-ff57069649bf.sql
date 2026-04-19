-- Add tracking fields for Daily Roll Call email system
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS consecutive_silent_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_roll_call_check_date date,
  ADD COLUMN IF NOT EXISTS last_mandato_email_sent_at timestamp with time zone;