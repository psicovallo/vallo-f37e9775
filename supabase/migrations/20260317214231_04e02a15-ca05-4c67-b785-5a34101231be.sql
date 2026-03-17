
CREATE TABLE public.question_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  current_question_index integer NOT NULL DEFAULT 1,
  answered boolean NOT NULL DEFAULT false,
  answer_text text,
  answer_button text,
  answered_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.question_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" ON public.question_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.question_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.question_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.question_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_index integer NOT NULL,
  question_text text NOT NULL,
  answer_text text NOT NULL,
  answer_button text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own answers" ON public.question_answers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own answers" ON public.question_answers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
