
-- Cases table
CREATE TABLE public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_number TEXT NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  case_type TEXT NOT NULL CHECK (case_type IN ('civil','criminal','commercial','personal_status','labor','administrative','real_estate','family','corporate','contract','intellectual_property','tax','customs','other')),
  court_type TEXT CHECK (court_type IN ('court_of_first_instance','misdemeanor_court','felony_court','criminal_court','personal_status_court','labor_court','commercial_court','administrative_court','court_of_appeal','court_of_cassation','federal_supreme_court','central_criminal_court','investigation_court','other')),
  court_name TEXT,
  court_name_ar TEXT,
  court_location TEXT,
  court_location_ar TEXT,
  court_case_number TEXT,
  court_chamber TEXT,
  judge_name TEXT,
  judge_name_ar TEXT,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  opposing_party_name TEXT,
  opposing_party_name_ar TEXT,
  opposing_party_lawyer TEXT,
  opposing_party_lawyer_ar TEXT,
  opposing_party_phone TEXT,
  filing_date DATE,
  statute_of_limitations DATE,
  estimated_value DECIMAL(15,2),
  estimated_value_currency TEXT DEFAULT 'IQD' CHECK (estimated_value_currency IN ('IQD','USD')),
  status TEXT NOT NULL DEFAULT 'intake' CHECK (status IN ('intake','active','pending_hearing','pending_judgment','on_hold','won','lost','settled','closed','archived')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  billing_type TEXT DEFAULT 'hourly' CHECK (billing_type IN ('hourly','fixed_fee','retainer','contingency','pro_bono')),
  fixed_fee_amount DECIMAL(15,2),
  retainer_amount DECIMAL(15,2),
  contingency_percentage DECIMAL(5,2),
  hourly_rate DECIMAL(10,2),
  outcome_summary TEXT,
  outcome_summary_ar TEXT,
  outcome_date DATE,
  is_visible_to_client BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  closed_by UUID REFERENCES public.profiles(id),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cases_org ON public.cases(organization_id);
CREATE INDEX idx_cases_client ON public.cases(client_id);
CREATE INDEX idx_cases_status ON public.cases(status);
CREATE INDEX idx_cases_type ON public.cases(case_type);
CREATE INDEX idx_cases_priority ON public.cases(priority);
CREATE INDEX idx_cases_number ON public.cases(case_number);
CREATE INDEX idx_cases_created ON public.cases(created_at DESC);

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-generate case number
CREATE OR REPLACE FUNCTION public.generate_case_number()
RETURNS TRIGGER AS $$
DECLARE
  org_prefix TEXT; next_num INTEGER; year_str TEXT;
BEGIN
  SELECT case_prefix, case_next_number INTO org_prefix, next_num FROM public.organizations WHERE id = NEW.organization_id;
  year_str := EXTRACT(YEAR FROM NOW())::TEXT;
  NEW.case_number := COALESCE(org_prefix, 'CASE') || '-' || year_str || '-' || LPAD(COALESCE(next_num, 1)::TEXT, 4, '0');
  UPDATE public.organizations SET case_next_number = COALESCE(next_num, 1) + 1 WHERE id = NEW.organization_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER generate_case_number_trigger BEFORE INSERT ON public.cases
  FOR EACH ROW WHEN (NEW.case_number IS NULL OR NEW.case_number = '')
  EXECUTE FUNCTION public.generate_case_number();

-- Case team members
CREATE TABLE public.case_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('lead','member','reviewer','observer')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES public.profiles(id),
  UNIQUE(case_id, user_id)
);

CREATE INDEX idx_case_team_case ON public.case_team_members(case_id);
CREATE INDEX idx_case_team_user ON public.case_team_members(user_id);

-- Case hearings
CREATE TABLE public.case_hearings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  hearing_date DATE NOT NULL,
  hearing_time TIME,
  hearing_type TEXT NOT NULL CHECK (hearing_type IN ('first_hearing','regular_hearing','evidence_hearing','witness_hearing','expert_hearing','pleading_hearing','judgment_hearing','appeal_hearing','mediation','arbitration','other')),
  court_room TEXT,
  judge_name TEXT,
  judge_name_ar TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','adjourned','cancelled')),
  adjournment_reason TEXT,
  adjournment_reason_ar TEXT,
  next_hearing_date DATE,
  notes TEXT,
  notes_ar TEXT,
  outcome TEXT,
  outcome_ar TEXT,
  is_visible_to_client BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hearings_case ON public.case_hearings(case_id);
CREATE INDEX idx_hearings_date ON public.case_hearings(hearing_date);
CREATE TRIGGER update_hearings_updated_at BEFORE UPDATE ON public.case_hearings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Case notes
CREATE TABLE public.case_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  content_ar TEXT,
  is_visible_to_client BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_case_notes_case ON public.case_notes(case_id);
CREATE TRIGGER update_case_notes_updated_at BEFORE UPDATE ON public.case_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Case activities
CREATE TABLE public.case_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id),
  activity_type TEXT NOT NULL CHECK (activity_type IN ('case_created','case_updated','status_changed','priority_changed','team_member_added','team_member_removed','hearing_scheduled','hearing_completed','hearing_adjourned','note_added','note_updated','document_uploaded','document_deleted','time_entry_added','invoice_created','case_closed','case_reopened')),
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_case_activities_case ON public.case_activities(case_id);
CREATE INDEX idx_case_activities_created ON public.case_activities(created_at DESC);

-- RLS: cases
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_org_cases" ON public.cases
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "staff_create_cases" ON public.cases
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('firm_admin','lawyer','paralegal')
  );

CREATE POLICY "staff_update_cases" ON public.cases
  FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('firm_admin','lawyer','paralegal')
  );

CREATE POLICY "super_admin_all_cases" ON public.cases
  FOR ALL TO authenticated
  USING ((SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('super_admin','sales_admin'));

CREATE POLICY "client_user_own_cases" ON public.cases
  FOR SELECT TO authenticated
  USING (
    is_visible_to_client = true
    AND EXISTS (SELECT 1 FROM public.client_user_links WHERE client_user_links.client_id = cases.client_id AND client_user_links.user_id = auth.uid())
  );

-- RLS: case_team_members
ALTER TABLE public.case_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_org_case_team" ON public.case_team_members
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "staff_manage_case_team" ON public.case_team_members
  FOR ALL TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('firm_admin','lawyer','paralegal')
  );

CREATE POLICY "super_admin_all_case_team" ON public.case_team_members
  FOR ALL TO authenticated
  USING ((SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('super_admin','sales_admin'));

-- RLS: case_hearings
ALTER TABLE public.case_hearings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_org_hearings" ON public.case_hearings
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "staff_manage_hearings" ON public.case_hearings
  FOR ALL TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('firm_admin','lawyer','paralegal')
  );

CREATE POLICY "super_admin_all_hearings" ON public.case_hearings
  FOR ALL TO authenticated
  USING ((SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('super_admin','sales_admin'));

-- RLS: case_notes
ALTER TABLE public.case_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_org_case_notes" ON public.case_notes
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "staff_manage_case_notes" ON public.case_notes
  FOR ALL TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('firm_admin','lawyer','paralegal')
  );

CREATE POLICY "super_admin_all_case_notes" ON public.case_notes
  FOR ALL TO authenticated
  USING ((SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('super_admin','sales_admin'));

-- RLS: case_activities
ALTER TABLE public.case_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_org_case_activities" ON public.case_activities
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "staff_create_case_activities" ON public.case_activities
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "super_admin_all_case_activities" ON public.case_activities
  FOR ALL TO authenticated
  USING ((SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('super_admin','sales_admin'));
