ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS communication_style text DEFAULT '',
  ADD COLUMN IF NOT EXISTS current_problems text DEFAULT '',
  ADD COLUMN IF NOT EXISTS vision text DEFAULT '',
  ADD COLUMN IF NOT EXISTS ai_profile_analysis text DEFAULT '',
  ADD COLUMN IF NOT EXISTS ai_profile_updated_at timestamp with time zone;