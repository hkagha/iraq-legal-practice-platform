
-- Saved reports table
CREATE TABLE public.saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  report_type TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  date_range_start DATE,
  date_range_end DATE,
  is_scheduled BOOLEAN DEFAULT false,
  schedule_frequency TEXT,
  last_generated_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saved_reports_org ON public.saved_reports(organization_id);
CREATE INDEX idx_saved_reports_type ON public.saved_reports(report_type);

ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

-- Validation trigger for report_type
CREATE OR REPLACE FUNCTION public.validate_saved_report_type()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.report_type NOT IN (
    'firm_performance', 'employee_360', 'financial_summary',
    'case_analytics', 'errand_analytics', 'client_analytics',
    'time_utilization', 'billing_aging', 'custom'
  ) THEN
    RAISE EXCEPTION 'Invalid report_type: %', NEW.report_type;
  END IF;
  IF NEW.schedule_frequency IS NOT NULL AND NEW.schedule_frequency NOT IN ('daily', 'weekly', 'monthly') THEN
    RAISE EXCEPTION 'Invalid schedule_frequency: %', NEW.schedule_frequency;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_saved_report_type_trigger
  BEFORE INSERT OR UPDATE ON public.saved_reports
  FOR EACH ROW EXECUTE FUNCTION public.validate_saved_report_type();

CREATE TRIGGER update_saved_reports_updated_at
  BEFORE UPDATE ON public.saved_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS policies
CREATE POLICY "org_read_reports" ON public.saved_reports
  FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "admin_manage_reports" ON public.saved_reports
  FOR ALL TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND get_user_role(auth.uid()) = 'firm_admin'
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_reports;
