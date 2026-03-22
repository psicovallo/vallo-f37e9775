
-- conflict_profiles table
CREATE TABLE public.conflict_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  relationship text NOT NULL DEFAULT '',
  profile_description text NOT NULL DEFAULT '',
  failure_history text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conflict_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conflict profiles" ON public.conflict_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conflict profiles" ON public.conflict_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conflict profiles" ON public.conflict_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conflict profiles" ON public.conflict_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_conflict_profiles_updated_at BEFORE UPDATE ON public.conflict_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- conflict_questions table
CREATE TABLE public.conflict_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_profile_id uuid NOT NULL REFERENCES public.conflict_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  question_text text NOT NULL DEFAULT '',
  validation_text text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'generated',
  adjustment_notes text,
  maestri_used text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conflict_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conflict questions" ON public.conflict_questions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conflict questions" ON public.conflict_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conflict questions" ON public.conflict_questions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conflict questions" ON public.conflict_questions FOR DELETE TO authenticated USING (auth.uid() = user_id);
