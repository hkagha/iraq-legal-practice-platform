-- AI columns on organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS ai_monthly_token_limit INTEGER DEFAULT 500000;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS ai_tokens_used_this_month INTEGER DEFAULT 0;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS ai_last_reset_date DATE DEFAULT CURRENT_DATE;

-- AI summary on cases
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS ai_summary JSONB;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS ai_summary_generated_at TIMESTAMPTZ;

-- AI usage log
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  feature TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  model TEXT,
  input_preview TEXT,
  output_preview TEXT,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_org ON public.ai_usage_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON public.ai_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature ON public.ai_usage_log(feature);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON public.ai_usage_log(created_at DESC);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_read_ai_usage" ON public.ai_usage_log
  FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "org_insert_ai_usage" ON public.ai_usage_log
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));