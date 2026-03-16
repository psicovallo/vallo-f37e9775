
-- Create phrase type enum
CREATE TYPE public.phrase_type AS ENUM ('mantra', 'domanda');

-- Create phrases table
CREATE TABLE public.phrases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type phrase_type NOT NULL,
  category TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phrases ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read phrases
CREATE POLICY "Authenticated users can view phrases"
  ON public.phrases FOR SELECT TO authenticated
  USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can insert phrases"
  ON public.phrases FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update phrases"
  ON public.phrases FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete phrases"
  ON public.phrases FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
