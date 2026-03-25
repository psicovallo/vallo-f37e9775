ALTER TABLE public.profiles 
  ADD COLUMN lingua_madre text NOT NULL DEFAULT 'italiano',
  ADD COLUMN quantum_enabled boolean NOT NULL DEFAULT false;