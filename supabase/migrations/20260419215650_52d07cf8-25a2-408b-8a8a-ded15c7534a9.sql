ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS wa_notifications_enabled BOOLEAN NOT NULL DEFAULT false;