CREATE TABLE public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_platform_settings" ON public.platform_settings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));

INSERT INTO public.platform_settings (key, value) VALUES
  ('plan_limits', '{"free": {"maxMembers": 3, "maxStorage": 1000, "maxCases": 10, "aiEnabled": false, "portalEnabled": false}, "professional": {"maxMembers": 15, "maxStorage": 10000, "maxCases": 9999, "aiEnabled": false, "portalEnabled": true}, "enterprise": {"maxMembers": 999, "maxStorage": 100000, "maxCases": 9999, "aiEnabled": true, "portalEnabled": true}}'),
  ('branding', '{"platformName": "Qanuni", "supportEmail": "support@qanuni.app", "supportPhone": "", "termsUrl": "", "privacyUrl": ""}'),
  ('maintenance', '{"enabled": false, "message": ""}')
ON CONFLICT (key) DO NOTHING;