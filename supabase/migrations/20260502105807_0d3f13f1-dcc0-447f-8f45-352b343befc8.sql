-- Create firm_audit_log table for tracking exports and other firm-level events
CREATE TABLE IF NOT EXISTS public.firm_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  actor_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  target_name TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_firm_audit_log_org_created
  ON public.firm_audit_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_firm_audit_log_actor
  ON public.firm_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_firm_audit_log_event_type
  ON public.firm_audit_log(event_type);

-- Enable RLS
ALTER TABLE public.firm_audit_log ENABLE ROW LEVEL SECURITY;

-- Firm admins can read their org's audit log
CREATE POLICY "firm_admin_read_audit_log"
  ON public.firm_audit_log
  FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND get_user_role(auth.uid()) = 'firm_admin'
  );

-- Any authenticated staff can insert audit entries for their own org
CREATE POLICY "staff_insert_audit_log"
  ON public.firm_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_org_id(auth.uid())
    AND actor_id = auth.uid()
  );

-- Super admins can read all
CREATE POLICY "super_admin_read_audit_log"
  ON public.firm_audit_log
  FOR SELECT
  TO authenticated
  USING (get_user_role(auth.uid()) = 'super_admin');