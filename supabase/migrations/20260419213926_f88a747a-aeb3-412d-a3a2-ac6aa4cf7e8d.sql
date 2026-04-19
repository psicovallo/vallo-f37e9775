ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS monthly_financial_target numeric NOT NULL DEFAULT 3000;