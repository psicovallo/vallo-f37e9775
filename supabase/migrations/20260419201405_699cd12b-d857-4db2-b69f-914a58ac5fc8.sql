ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS financial_debt numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lucidity_level integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS sovereign_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_vice_timestamp timestamp with time zone;

ALTER TABLE public.profiles
  ADD CONSTRAINT lucidity_level_range CHECK (lucidity_level >= 0 AND lucidity_level <= 100);