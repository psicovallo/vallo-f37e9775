ALTER TABLE public.conflict_profiles 
  ADD COLUMN scenario text NOT NULL DEFAULT 'conflitto',
  ADD COLUMN user_style text NOT NULL DEFAULT 'chirurgico';

ALTER TABLE public.conflict_questions 
  ADD COLUMN velo_number integer NOT NULL DEFAULT 1;