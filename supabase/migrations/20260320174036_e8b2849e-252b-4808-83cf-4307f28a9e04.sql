
-- Add objective and milestone_zero to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS objective text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS milestone_zero text;

-- Create assignment status enum
CREATE TYPE public.assignment_status AS ENUM ('da_leggere', 'in_incubazione', 'risolta');

-- Create question_assignments table
CREATE TABLE public.question_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_text text NOT NULL,
  view_count integer NOT NULL DEFAULT 0,
  status assignment_status NOT NULL DEFAULT 'da_leggere',
  phase_b_unlock_at timestamp with time zone,
  is_seed_question boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.question_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assignments" ON public.question_assignments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own assignments" ON public.question_assignments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assignments" ON public.question_assignments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create question_notes table
CREATE TABLE public.question_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.question_assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  text text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.question_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes" ON public.question_notes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON public.question_notes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.question_notes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Create question_official_answers table
CREATE TABLE public.question_official_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.question_assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  answer_text text NOT NULL,
  button_clicked text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.question_official_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own answers" ON public.question_official_answers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own answers" ON public.question_official_answers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger to question_notes
CREATE TRIGGER update_question_notes_updated_at
  BEFORE UPDATE ON public.question_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
