CREATE TABLE IF NOT EXISTS public.firm_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role text,
  event_type text NOT NULL,
  target_table text,
  target_id uuid,
  target_name text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_firm_audit_log_org_created
  ON public.firm_audit_log(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_firm_audit_log_event
  ON public.firm_audit_log(event_type);

ALTER TABLE public.firm_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "firm_admins_read_firm_audit_log" ON public.firm_audit_log;
CREATE POLICY "firm_admins_read_firm_audit_log" ON public.firm_audit_log
  FOR SELECT TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'super_admin'
    OR (
      organization_id = public.get_user_org_id(auth.uid())
      AND public.get_user_role(auth.uid()) = 'firm_admin'
    )
  );

DROP POLICY IF EXISTS "org_staff_insert_firm_audit_log" ON public.firm_audit_log;
CREATE POLICY "org_staff_insert_firm_audit_log" ON public.firm_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_org_id(auth.uid())
    AND actor_id = auth.uid()
  );
