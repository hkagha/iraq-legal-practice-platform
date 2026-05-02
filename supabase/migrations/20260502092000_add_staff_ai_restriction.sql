ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_features_disabled boolean NOT NULL DEFAULT false;
