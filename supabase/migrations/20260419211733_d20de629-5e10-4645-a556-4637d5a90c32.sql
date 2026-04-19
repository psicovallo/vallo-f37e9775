ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_clean_day_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_passivity_tax_at timestamptz;