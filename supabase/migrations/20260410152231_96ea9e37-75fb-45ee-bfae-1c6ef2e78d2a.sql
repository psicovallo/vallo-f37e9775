
-- Overton Shifts table
CREATE TABLE public.overton_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  goal_text TEXT NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  step_confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.overton_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shifts" ON public.overton_shifts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own shifts" ON public.overton_shifts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own shifts" ON public.overton_shifts FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_overton_shifts_updated_at BEFORE UPDATE ON public.overton_shifts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Overton Steps table
CREATE TABLE public.overton_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID NOT NULL REFERENCES public.overton_shifts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  step_number INTEGER NOT NULL,
  label TEXT NOT NULL,
  action_text TEXT NOT NULL,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.overton_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own steps" ON public.overton_steps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own steps" ON public.overton_steps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own steps" ON public.overton_steps FOR UPDATE USING (auth.uid() = user_id);
