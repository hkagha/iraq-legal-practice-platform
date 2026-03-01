
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_set_by_admin BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_last_changed_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_changed_by UUID REFERENCES public.profiles(id);
