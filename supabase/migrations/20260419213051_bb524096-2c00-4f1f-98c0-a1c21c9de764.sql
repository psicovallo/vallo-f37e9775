ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS triage_goal text,
ADD COLUMN IF NOT EXISTS triage_reason text,
ADD COLUMN IF NOT EXISTS triage_focus text;