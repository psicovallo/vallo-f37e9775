-- Add phalanx_multiplier to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phalanx_multiplier numeric NOT NULL DEFAULT 1.0;

-- Create phalanx_pacts table (the Phalanx Pact)
CREATE TABLE IF NOT EXISTS public.phalanx_pacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  general_id uuid NOT NULL,
  recruit_id uuid,
  invite_token text NOT NULL UNIQUE,
  recruit_name text,
  status text NOT NULL DEFAULT 'pending', -- pending | active | corrupted
  accepted_at timestamp with time zone,
  corrupted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_phalanx_pacts_general ON public.phalanx_pacts(general_id);
CREATE INDEX IF NOT EXISTS idx_phalanx_pacts_recruit ON public.phalanx_pacts(recruit_id);
CREATE INDEX IF NOT EXISTS idx_phalanx_pacts_token ON public.phalanx_pacts(invite_token);

-- Enable RLS
ALTER TABLE public.phalanx_pacts ENABLE ROW LEVEL SECURITY;

-- Policies: General can view/manage their own pacts
CREATE POLICY "Generals view own pacts"
ON public.phalanx_pacts FOR SELECT
TO authenticated
USING (auth.uid() = general_id OR auth.uid() = recruit_id);

CREATE POLICY "Generals insert own pacts"
ON public.phalanx_pacts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = general_id);

CREATE POLICY "Generals update own pacts"
ON public.phalanx_pacts FOR UPDATE
TO authenticated
USING (auth.uid() = general_id OR auth.uid() = recruit_id);

CREATE POLICY "Generals delete own pacts"
ON public.phalanx_pacts FOR DELETE
TO authenticated
USING (auth.uid() = general_id);

-- Trigger updated_at
CREATE TRIGGER update_phalanx_pacts_updated_at
BEFORE UPDATE ON public.phalanx_pacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();