-- Archive for past Council analyses ("Cimitero delle Illusioni")
CREATE TABLE public.profile_analysis_archive (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  analysis_text TEXT NOT NULL,
  cycle_number INTEGER NOT NULL DEFAULT 1,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_analysis_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own archives" ON public.profile_analysis_archive FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own archives" ON public.profile_analysis_archive FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Forgia cycles
CREATE TABLE public.forgia_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cycle_number INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active',
  improvements TEXT[] DEFAULT '{}',
  critical_areas TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.forgia_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cycles" ON public.forgia_cycles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cycles" ON public.forgia_cycles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cycles" ON public.forgia_cycles FOR UPDATE USING (auth.uid() = user_id);

-- Forgia challenges (daily questions)
CREATE TABLE public.forgia_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cycle_id UUID REFERENCES public.forgia_cycles(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL DEFAULT 'binary',
  question TEXT NOT NULL,
  options TEXT[] DEFAULT '{}',
  user_response TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  day_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.forgia_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own challenges" ON public.forgia_challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own challenges" ON public.forgia_challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own challenges" ON public.forgia_challenges FOR UPDATE USING (auth.uid() = user_id);