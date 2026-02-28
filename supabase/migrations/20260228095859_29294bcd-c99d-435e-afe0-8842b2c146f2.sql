
-- Table: errands
CREATE TABLE public.errands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  errand_number TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  category TEXT NOT NULL,
  government_entity TEXT,
  government_entity_ar TEXT,
  government_department TEXT,
  government_department_ar TEXT,
  reference_number TEXT,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  case_id UUID REFERENCES public.cases(id),
  status TEXT NOT NULL DEFAULT 'new',
  priority TEXT NOT NULL DEFAULT 'medium',
  start_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  completed_date DATE,
  government_fees DECIMAL(15,2) DEFAULT 0,
  government_fees_currency TEXT DEFAULT 'IQD',
  service_fee DECIMAL(15,2) DEFAULT 0,
  service_fee_currency TEXT DEFAULT 'IQD',
  total_cost DECIMAL(15,2) GENERATED ALWAYS AS (government_fees + service_fee) STORED,
  fees_paid BOOLEAN DEFAULT false,
  total_steps INTEGER DEFAULT 0,
  completed_steps INTEGER DEFAULT 0,
  progress_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_steps > 0 THEN (completed_steps::DECIMAL / total_steps * 100) ELSE 0 END
  ) STORED,
  outcome_notes TEXT,
  outcome_notes_ar TEXT,
  rejection_reason TEXT,
  rejection_reason_ar TEXT,
  is_visible_to_client BOOLEAN NOT NULL DEFAULT true,
  assigned_to UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_errands_org ON public.errands(organization_id);
CREATE INDEX idx_errands_client ON public.errands(client_id);
CREATE INDEX idx_errands_case ON public.errands(case_id);
CREATE INDEX idx_errands_status ON public.errands(status);
CREATE INDEX idx_errands_category ON public.errands(category);
CREATE INDEX idx_errands_assigned ON public.errands(assigned_to);
CREATE INDEX idx_errands_due ON public.errands(due_date);
CREATE INDEX idx_errands_number ON public.errands(errand_number);
CREATE INDEX idx_errands_created ON public.errands(created_at DESC);

CREATE TRIGGER update_errands_updated_at BEFORE UPDATE ON public.errands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-generate errand number
CREATE OR REPLACE FUNCTION public.generate_errand_number()
RETURNS TRIGGER AS $$
DECLARE
  org_prefix TEXT; next_num INTEGER; year_str TEXT;
BEGIN
  SELECT errand_prefix, errand_next_number INTO org_prefix, next_num
  FROM public.organizations WHERE id = NEW.organization_id;
  year_str := EXTRACT(YEAR FROM NOW())::TEXT;
  NEW.errand_number := COALESCE(org_prefix, 'ERR') || '-' || year_str || '-' || LPAD(COALESCE(next_num, 1)::TEXT, 4, '0');
  UPDATE public.organizations SET errand_next_number = COALESCE(next_num, 1) + 1 WHERE id = NEW.organization_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE TRIGGER generate_errand_number_trigger BEFORE INSERT ON public.errands
  FOR EACH ROW WHEN (NEW.errand_number IS NULL OR NEW.errand_number = '')
  EXECUTE FUNCTION public.generate_errand_number();

-- Table: errand_steps
CREATE TABLE public.errand_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  errand_id UUID NOT NULL REFERENCES public.errands(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  is_required BOOLEAN DEFAULT true,
  assigned_to UUID REFERENCES public.profiles(id),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  notes_ar TEXT,
  attachments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(errand_id, step_number)
);

CREATE INDEX idx_errand_steps_errand ON public.errand_steps(errand_id);
CREATE INDEX idx_errand_steps_status ON public.errand_steps(status);
CREATE INDEX idx_errand_steps_assigned ON public.errand_steps(assigned_to);

CREATE TRIGGER update_errand_steps_updated_at BEFORE UPDATE ON public.errand_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-update errand progress when step changes
CREATE OR REPLACE FUNCTION public.update_errand_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_val INTEGER;
  completed_val INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
  INTO total_val, completed_val
  FROM public.errand_steps WHERE errand_id = COALESCE(NEW.errand_id, OLD.errand_id);

  UPDATE public.errands
  SET total_steps = total_val, completed_steps = completed_val
  WHERE id = COALESCE(NEW.errand_id, OLD.errand_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE TRIGGER update_progress_on_step_change
  AFTER INSERT OR UPDATE OR DELETE ON public.errand_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_errand_progress();

-- Table: errand_documents
CREATE TABLE public.errand_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  errand_id UUID NOT NULL REFERENCES public.errands(id) ON DELETE CASCADE,
  errand_step_id UUID REFERENCES public.errand_steps(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_name_ar TEXT,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  file_type TEXT,
  document_type TEXT,
  is_visible_to_client BOOLEAN DEFAULT true,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_errand_docs_errand ON public.errand_documents(errand_id);
CREATE INDEX idx_errand_docs_step ON public.errand_documents(errand_step_id);

-- Table: errand_activities
CREATE TABLE public.errand_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  errand_id UUID NOT NULL REFERENCES public.errands(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id),
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_errand_activities_errand ON public.errand_activities(errand_id);
CREATE INDEX idx_errand_activities_created ON public.errand_activities(created_at DESC);

-- Table: errand_templates
CREATE TABLE public.errand_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  is_system BOOLEAN DEFAULT false,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_errand_templates_category ON public.errand_templates(category);
CREATE INDEX idx_errand_templates_org ON public.errand_templates(organization_id);

-- Enable RLS on all tables
ALTER TABLE public.errands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.errand_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.errand_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.errand_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.errand_templates ENABLE ROW LEVEL SECURITY;

-- RLS: errands
CREATE POLICY "users_read_org_errands" ON public.errands FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "staff_create_errands" ON public.errands FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_org_id(auth.uid()) AND get_user_role(auth.uid()) IN ('firm_admin','lawyer','paralegal'));

CREATE POLICY "staff_update_errands" ON public.errands FOR UPDATE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()) AND get_user_role(auth.uid()) IN ('firm_admin','lawyer','paralegal'));

CREATE POLICY "super_admin_all_errands" ON public.errands FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('super_admin','sales_admin'));

CREATE POLICY "client_user_own_errands" ON public.errands FOR SELECT TO authenticated
  USING (is_visible_to_client = true AND EXISTS (
    SELECT 1 FROM client_user_links WHERE client_user_links.client_id = errands.client_id AND client_user_links.user_id = auth.uid()
  ));

-- RLS: errand_steps
CREATE POLICY "users_read_org_errand_steps" ON public.errand_steps FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "staff_manage_errand_steps" ON public.errand_steps FOR ALL TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()) AND get_user_role(auth.uid()) IN ('firm_admin','lawyer','paralegal'));

CREATE POLICY "super_admin_all_errand_steps" ON public.errand_steps FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('super_admin','sales_admin'));

-- RLS: errand_documents
CREATE POLICY "users_read_org_errand_docs" ON public.errand_documents FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "staff_manage_errand_docs" ON public.errand_documents FOR ALL TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()) AND get_user_role(auth.uid()) IN ('firm_admin','lawyer','paralegal'));

CREATE POLICY "super_admin_all_errand_docs" ON public.errand_documents FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('super_admin','sales_admin'));

-- RLS: errand_activities
CREATE POLICY "users_read_org_errand_activities" ON public.errand_activities FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "staff_create_errand_activities" ON public.errand_activities FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "super_admin_all_errand_activities" ON public.errand_activities FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('super_admin','sales_admin'));

-- RLS: errand_templates (system templates readable by all, org templates by org)
CREATE POLICY "read_system_templates" ON public.errand_templates FOR SELECT TO authenticated
  USING (is_system = true);

CREATE POLICY "read_org_templates" ON public.errand_templates FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "staff_manage_org_templates" ON public.errand_templates FOR ALL TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()) AND get_user_role(auth.uid()) IN ('firm_admin','lawyer','paralegal'));

CREATE POLICY "super_admin_all_templates" ON public.errand_templates FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('super_admin','sales_admin'));
