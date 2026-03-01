
-- Admin audit log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  target_name TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Validation trigger for action values
CREATE OR REPLACE FUNCTION public.validate_admin_audit_action()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.action NOT IN (
    'login', 'logout', 'impersonate_start', 'impersonate_end',
    'org_created', 'org_updated', 'org_suspended', 'org_activated', 'org_deleted',
    'user_created', 'user_updated', 'user_deactivated', 'user_activated', 'user_deleted',
    'user_role_changed', 'user_password_reset', 'user_org_changed',
    'plan_changed', 'backup_created', 'backup_deleted', 'backup_restored',
    'announcement_sent', 'settings_changed',
    'data_exported', 'data_deleted'
  ) THEN
    RAISE EXCEPTION 'Invalid audit action: %', NEW.action;
  END IF;
  IF NEW.target_type IS NOT NULL AND NEW.target_type NOT IN ('organization', 'user', 'backup', 'system') THEN
    RAISE EXCEPTION 'Invalid target_type: %', NEW.target_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_admin_audit_action_trigger
  BEFORE INSERT OR UPDATE ON public.admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.validate_admin_audit_action();

CREATE INDEX idx_audit_log_admin ON public.admin_audit_log(admin_id);
CREATE INDEX idx_audit_log_action ON public.admin_audit_log(action);
CREATE INDEX idx_audit_log_target ON public.admin_audit_log(target_type, target_id);
CREATE INDEX idx_audit_log_created ON public.admin_audit_log(created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_audit" ON public.admin_audit_log
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'super_admin');

-- Ensure the system admin org exists
INSERT INTO public.organizations (id, name, name_ar, slug, subscription_tier, subscription_status, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Qanuni Platform Administration',
  'إدارة منصة قانوني',
  'qanuni-admin',
  'enterprise',
  'active',
  true
) ON CONFLICT (id) DO NOTHING;
