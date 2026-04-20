-- =========================================================================
-- WAVE A: HARD RESET + NEW CLIENT MODEL
-- =========================================================================

-- ----- 1. PURGE existing data + dependent tables -------------------------
-- Drop in dependency order. CASCADE cleans FKs/policies/triggers.
DROP TABLE IF EXISTS public.case_team_members CASCADE;
DROP TABLE IF EXISTS public.case_notes CASCADE;
DROP TABLE IF EXISTS public.case_hearings CASCADE;
DROP TABLE IF EXISTS public.case_activities CASCADE;
DROP TABLE IF EXISTS public.client_activities CASCADE;
DROP TABLE IF EXISTS public.client_messages CASCADE;
DROP TABLE IF EXISTS public.client_contacts CASCADE;
DROP TABLE IF EXISTS public.client_user_links CASCADE;
DROP TABLE IF EXISTS public.document_activities CASCADE;
DROP TABLE IF EXISTS public.document_comments CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.calendar_events CASCADE;
DROP TABLE IF EXISTS public.billing_rates CASCADE;
-- Cases / errands / invoices likely reference clients — drop too.
DROP TABLE IF EXISTS public.cases CASCADE;
DROP TABLE IF EXISTS public.errand_steps CASCADE;
DROP TABLE IF EXISTS public.errands CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;

-- =========================================================================
-- 2. NEW CORE TABLES
-- =========================================================================

-- ---------- persons ------------------------------------------------------
CREATE TABLE public.persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  first_name_ar text,
  last_name text,
  last_name_ar text,
  date_of_birth date,
  gender text,
  nationality text,
  national_id_number text,
  email text,
  phone text,
  secondary_phone text,
  whatsapp_number text,
  address text,
  address_ar text,
  city text,
  city_ar text,
  governorate text,
  country text DEFAULT 'IQ',
  postal_code text,
  preferred_currency text DEFAULT 'IQD',
  tags text[],
  notes text,
  notes_ar text,
  profile_image_url text,
  status text NOT NULL DEFAULT 'active',
  is_visible_to_client boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id)
);
CREATE INDEX idx_persons_org ON public.persons(organization_id);
CREATE INDEX idx_persons_email ON public.persons(organization_id, email);

-- ---------- entities -----------------------------------------------------
CREATE TABLE public.entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  company_name_ar text,
  company_type text,
  company_registration_number text,
  tax_id text,
  industry text,
  industry_ar text,
  email text,
  phone text,
  website text,
  address text,
  address_ar text,
  city text,
  city_ar text,
  governorate text,
  country text DEFAULT 'IQ',
  postal_code text,
  preferred_currency text DEFAULT 'IQD',
  payment_terms_days integer DEFAULT 30,
  credit_limit numeric,
  tags text[],
  notes text,
  notes_ar text,
  status text NOT NULL DEFAULT 'active',
  is_visible_to_client boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id)
);
CREATE INDEX idx_entities_org ON public.entities(organization_id);

-- ---------- entity_representatives --------------------------------------
CREATE TABLE public.entity_representatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'contact', -- owner/director/authorized_rep/contact/legal_contact/accountant/other
  job_title text,
  job_title_ar text,
  department text,
  is_primary boolean NOT NULL DEFAULT false,
  receives_notifications boolean NOT NULL DEFAULT true,
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_id, person_id, role)
);
CREATE INDEX idx_ent_reps_entity ON public.entity_representatives(entity_id);
CREATE INDEX idx_ent_reps_person ON public.entity_representatives(person_id);
-- Only one primary rep per entity
CREATE UNIQUE INDEX uq_ent_reps_primary ON public.entity_representatives(entity_id) WHERE is_primary = true;

-- =========================================================================
-- 3. CASES + PARTIES (rebuilt, no client_id)
-- =========================================================================

CREATE TABLE public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_number text NOT NULL,
  title text NOT NULL,
  title_ar text,
  description text,
  description_ar text,
  case_type text NOT NULL,
  status text NOT NULL DEFAULT 'intake',
  priority text NOT NULL DEFAULT 'normal',
  court_type text,
  court_name text,
  court_name_ar text,
  court_location text,
  court_location_ar text,
  court_chamber text,
  court_case_number text,
  judge_name text,
  judge_name_ar text,
  opposing_party_name text,
  opposing_party_name_ar text,
  opposing_party_lawyer text,
  opposing_party_lawyer_ar text,
  opposing_party_phone text,
  filing_date date,
  statute_of_limitations date,
  billing_type text,
  hourly_rate numeric,
  fixed_fee_amount numeric,
  retainer_amount numeric,
  contingency_percentage numeric,
  estimated_value numeric,
  estimated_value_currency text DEFAULT 'IQD',
  outcome_summary text,
  outcome_summary_ar text,
  outcome_date date,
  closed_at timestamptz,
  closed_by uuid REFERENCES public.profiles(id),
  ai_summary jsonb,
  ai_summary_generated_at timestamptz,
  is_visible_to_client boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id)
);
CREATE INDEX idx_cases_org ON public.cases(organization_id);

CREATE TABLE public.case_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  party_type text NOT NULL CHECK (party_type IN ('person','entity')),
  person_id uuid REFERENCES public.persons(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE,
  -- represented_by: when party_type='entity', which person is the rep on this case (optional)
  represented_by_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'plaintiff', -- plaintiff/defendant/co-plaintiff/co-defendant/petitioner/respondent/witness/third-party/beneficiary
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (party_type = 'person' AND person_id IS NOT NULL AND entity_id IS NULL) OR
    (party_type = 'entity' AND entity_id IS NOT NULL AND person_id IS NULL)
  )
);
CREATE INDEX idx_case_parties_case ON public.case_parties(case_id);
CREATE INDEX idx_case_parties_person ON public.case_parties(person_id);
CREATE INDEX idx_case_parties_entity ON public.case_parties(entity_id);
-- Exactly one primary party per case
CREATE UNIQUE INDEX uq_case_parties_primary ON public.case_parties(case_id) WHERE is_primary = true;

CREATE TABLE public.case_notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  receives_in_app boolean NOT NULL DEFAULT true,
  receives_email boolean NOT NULL DEFAULT false,
  receives_whatsapp boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, person_id)
);
CREATE INDEX idx_cnr_case ON public.case_notification_recipients(case_id);

-- =========================================================================
-- 4. RECREATE DEPENDENT TABLES with party_type/person_id/entity_id
-- =========================================================================

CREATE TABLE public.case_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES public.profiles(id),
  UNIQUE (case_id, user_id)
);

CREATE TABLE public.case_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id),
  content text NOT NULL,
  content_ar text,
  is_pinned boolean NOT NULL DEFAULT false,
  is_visible_to_client boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.case_hearings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  hearing_date date NOT NULL,
  hearing_time time,
  hearing_type text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  court_room text,
  judge_name text,
  judge_name_ar text,
  notes text,
  notes_ar text,
  outcome text,
  outcome_ar text,
  adjournment_reason text,
  adjournment_reason_ar text,
  next_hearing_date date,
  is_visible_to_client boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

CREATE TABLE public.case_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id),
  activity_type text NOT NULL,
  title text NOT NULL,
  title_ar text,
  description text,
  description_ar text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Errands (now party-aware)
CREATE TABLE public.errands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  errand_number text NOT NULL,
  title text NOT NULL,
  title_ar text,
  description text,
  description_ar text,
  errand_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'normal',
  -- party (one of person/entity, optional — errands can be standalone)
  party_type text CHECK (party_type IN ('person','entity')),
  person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES public.profiles(id),
  due_date date,
  completed_at timestamptz,
  total_steps integer NOT NULL DEFAULT 0,
  completed_steps integer NOT NULL DEFAULT 0,
  is_visible_to_client boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  CHECK (
    party_type IS NULL OR
    (party_type = 'person' AND person_id IS NOT NULL AND entity_id IS NULL) OR
    (party_type = 'entity' AND entity_id IS NOT NULL AND person_id IS NULL)
  )
);

CREATE TABLE public.errand_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  errand_id uuid NOT NULL REFERENCES public.errands(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  title text NOT NULL,
  title_ar text,
  description text,
  description_ar text,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  completed_by uuid REFERENCES public.profiles(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Invoices
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  party_type text NOT NULL CHECK (party_type IN ('person','entity')),
  person_id uuid REFERENCES public.persons(id) ON DELETE RESTRICT,
  entity_id uuid REFERENCES public.entities(id) ON DELETE RESTRICT,
  case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  currency text NOT NULL DEFAULT 'IQD',
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  notes text,
  notes_ar text,
  viewed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  CHECK (
    (party_type = 'person' AND person_id IS NOT NULL AND entity_id IS NULL) OR
    (party_type = 'entity' AND entity_id IS NOT NULL AND person_id IS NULL)
  )
);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'IQD',
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text,
  reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

-- Documents
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_name_ar text,
  title text,
  title_ar text,
  description text,
  description_ar text,
  file_path text NOT NULL,
  file_size_bytes bigint NOT NULL,
  file_type text NOT NULL,
  mime_type text,
  document_category text NOT NULL DEFAULT 'general',
  tags text[],
  library_tags text[],
  party_type text CHECK (party_type IN ('person','entity')),
  person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  errand_id uuid REFERENCES public.errands(id) ON DELETE SET NULL,
  folder_path text,
  parent_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1,
  is_latest_version boolean NOT NULL DEFAULT true,
  visibility_scope text NOT NULL DEFAULT 'internal',
  is_visible_to_client boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id),
  last_accessed_at timestamptz,
  last_accessed_by uuid REFERENCES public.profiles(id),
  indexing_status text NOT NULL DEFAULT 'pending',
  indexing_error text,
  indexing_attempts integer NOT NULL DEFAULT 0,
  indexed_at timestamptz,
  extracted_text text,
  ai_summary text,
  ai_doc_type text,
  ai_language text,
  ai_people text[],
  ai_organizations text[],
  ai_places text[],
  ai_dates jsonb,
  ai_tags text[],
  search_tsv tsvector,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_documents_org ON public.documents(organization_id);
CREATE INDEX idx_documents_search ON public.documents USING GIN(search_tsv);

CREATE TABLE public.document_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES public.document_comments(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_type text NOT NULL DEFAULT 'staff',
  content text NOT NULL,
  content_ar text,
  is_visible_to_client boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.document_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id),
  activity_type text NOT NULL,
  title text NOT NULL,
  title_ar text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Calendar
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  title_ar text,
  description text,
  description_ar text,
  event_type text NOT NULL DEFAULT 'meeting',
  start_date date NOT NULL,
  start_time time,
  end_date date,
  end_time time,
  is_all_day boolean DEFAULT false,
  is_recurring boolean DEFAULT false,
  recurrence_pattern text,
  recurrence_end_date date,
  is_virtual boolean DEFAULT false,
  virtual_link text,
  location text,
  location_ar text,
  color text,
  participants uuid[],
  party_type text CHECK (party_type IN ('person','entity')),
  person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.profiles(id)
);

-- Activities log (renamed concept — was client_activities)
CREATE TABLE public.party_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  party_type text NOT NULL CHECK (party_type IN ('person','entity')),
  person_id uuid REFERENCES public.persons(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id),
  activity_type text NOT NULL,
  title text NOT NULL,
  title_ar text,
  description text,
  description_ar text,
  related_entity_type text,
  related_entity_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Messages
CREATE TABLE public.client_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  party_type text NOT NULL CHECK (party_type IN ('person','entity')),
  person_id uuid REFERENCES public.persons(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  errand_id uuid REFERENCES public.errands(id) ON DELETE SET NULL,
  sender_id uuid NOT NULL REFERENCES public.profiles(id),
  sender_type text NOT NULL DEFAULT 'staff',
  content text NOT NULL,
  attachments jsonb,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Billing rates
CREATE TABLE public.billing_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.cases(id) ON DELETE CASCADE,
  rate numeric NOT NULL,
  currency text NOT NULL DEFAULT 'IQD',
  is_default boolean DEFAULT false,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================================
-- 5. PORTAL TABLES
-- =========================================================================

CREATE TABLE public.portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  full_name_ar text,
  phone text,
  preferred_language text DEFAULT 'en',
  last_login_at timestamptz,
  last_selected_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.portal_user_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_user_id uuid NOT NULL REFERENCES public.portal_users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  invited_at timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz,
  UNIQUE (portal_user_id, organization_id, person_id)
);
CREATE INDEX idx_pul_portal_user ON public.portal_user_links(portal_user_id);
CREATE INDEX idx_pul_org ON public.portal_user_links(organization_id);
CREATE INDEX idx_pul_person ON public.portal_user_links(person_id);

-- =========================================================================
-- 6. SECURITY DEFINER HELPERS for portal access
-- =========================================================================

CREATE OR REPLACE FUNCTION public.portal_user_can_access_person(_person_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.portal_user_links pul
    JOIN public.portal_users pu ON pu.id = pul.portal_user_id
    WHERE pu.auth_user_id = auth.uid()
      AND pul.is_active = true
      AND pul.person_id = _person_id
  );
$$;

CREATE OR REPLACE FUNCTION public.portal_user_can_access_entity(_entity_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.portal_user_links pul
    JOIN public.portal_users pu ON pu.id = pul.portal_user_id
    JOIN public.entity_representatives er ON er.person_id = pul.person_id
    WHERE pu.auth_user_id = auth.uid()
      AND pul.is_active = true
      AND er.entity_id = _entity_id
  );
$$;

CREATE OR REPLACE FUNCTION public.portal_user_can_access_case(_case_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.case_parties cp
    JOIN public.cases c ON c.id = cp.case_id
    WHERE cp.case_id = _case_id
      AND c.is_visible_to_client = true
      AND (
        (cp.party_type = 'person' AND public.portal_user_can_access_person(cp.person_id))
        OR
        (cp.party_type = 'entity' AND public.portal_user_can_access_entity(cp.entity_id))
      )
  );
$$;

-- =========================================================================
-- 7. RLS — enable + policies
-- =========================================================================

ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_hearings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.errands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.errand_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_user_links ENABLE ROW LEVEL SECURITY;

-- Generic org-member policy macro (replicated per table)
-- persons
CREATE POLICY "org members manage persons" ON public.persons
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "portal user reads own persons" ON public.persons
  FOR SELECT TO authenticated
  USING (public.portal_user_can_access_person(id));

-- entities
CREATE POLICY "org members manage entities" ON public.entities
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "portal user reads own entities" ON public.entities
  FOR SELECT TO authenticated
  USING (public.portal_user_can_access_entity(id));

-- entity_representatives
CREATE POLICY "org members manage entity reps" ON public.entity_representatives
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

-- cases
CREATE POLICY "org members manage cases" ON public.cases
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "portal user reads own cases" ON public.cases
  FOR SELECT TO authenticated
  USING (is_visible_to_client = true AND public.portal_user_can_access_case(id));

-- case_parties
CREATE POLICY "org members manage case_parties" ON public.case_parties
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "portal user reads own case_parties" ON public.case_parties
  FOR SELECT TO authenticated
  USING (public.portal_user_can_access_case(case_id));

-- case_notification_recipients
CREATE POLICY "org members manage case_notif_recipients" ON public.case_notification_recipients
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

-- case_team_members / notes / hearings / activities — org only
CREATE POLICY "org members manage case_team_members" ON public.case_team_members
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "org members manage case_notes" ON public.case_notes
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "org members manage case_hearings" ON public.case_hearings
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "portal user reads visible hearings" ON public.case_hearings
  FOR SELECT TO authenticated
  USING (is_visible_to_client = true AND public.portal_user_can_access_case(case_id));
CREATE POLICY "org members manage case_activities" ON public.case_activities
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

-- errands
CREATE POLICY "org members manage errands" ON public.errands
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "portal user reads own errands" ON public.errands
  FOR SELECT TO authenticated
  USING (
    is_visible_to_client = true AND (
      (party_type = 'person' AND public.portal_user_can_access_person(person_id))
      OR (party_type = 'entity' AND public.portal_user_can_access_entity(entity_id))
    )
  );

CREATE POLICY "org members manage errand_steps" ON public.errand_steps
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

-- invoices
CREATE POLICY "org members manage invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "portal user reads own invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (
    status <> 'draft' AND (
      (party_type = 'person' AND public.portal_user_can_access_person(person_id))
      OR (party_type = 'entity' AND public.portal_user_can_access_entity(entity_id))
    )
  );

-- payments
CREATE POLICY "org members manage payments" ON public.payments
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

-- documents
CREATE POLICY "org members manage documents" ON public.documents
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "portal user reads visible documents" ON public.documents
  FOR SELECT TO authenticated
  USING (
    is_visible_to_client = true AND status = 'active' AND (
      (party_type = 'person' AND public.portal_user_can_access_person(person_id))
      OR (party_type = 'entity' AND public.portal_user_can_access_entity(entity_id))
      OR (case_id IS NOT NULL AND public.portal_user_can_access_case(case_id))
    )
  );

CREATE POLICY "org members manage doc_comments" ON public.document_comments
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "org members manage doc_activities" ON public.document_activities
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

-- calendar
CREATE POLICY "org members manage calendar" ON public.calendar_events
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

-- party_activities
CREATE POLICY "org members manage party_activities" ON public.party_activities
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

-- messages
CREATE POLICY "org members manage messages" ON public.client_messages
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "portal user reads own messages" ON public.client_messages
  FOR SELECT TO authenticated
  USING (
    (party_type = 'person' AND public.portal_user_can_access_person(person_id))
    OR (party_type = 'entity' AND public.portal_user_can_access_entity(entity_id))
  );
CREATE POLICY "portal user inserts own messages" ON public.client_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_type = 'client' AND (
      (party_type = 'person' AND public.portal_user_can_access_person(person_id))
      OR (party_type = 'entity' AND public.portal_user_can_access_entity(entity_id))
    )
  );

-- billing_rates
CREATE POLICY "org members manage billing_rates" ON public.billing_rates
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

-- portal_users — user reads/updates own row
CREATE POLICY "portal user reads self" ON public.portal_users
  FOR SELECT TO authenticated USING (auth_user_id = auth.uid());
CREATE POLICY "portal user updates self" ON public.portal_users
  FOR UPDATE TO authenticated USING (auth_user_id = auth.uid());
CREATE POLICY "portal user inserts self" ON public.portal_users
  FOR INSERT TO authenticated WITH CHECK (auth_user_id = auth.uid());

-- portal_user_links — user reads own; org admins manage
CREATE POLICY "portal user reads own links" ON public.portal_user_links
  FOR SELECT TO authenticated
  USING (portal_user_id IN (SELECT id FROM public.portal_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "org members manage portal links" ON public.portal_user_links
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

-- =========================================================================
-- 8. Triggers
-- =========================================================================

-- updated_at maintenance
CREATE TRIGGER trg_persons_updated BEFORE UPDATE ON public.persons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_entities_updated BEFORE UPDATE ON public.entities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_entity_reps_updated BEFORE UPDATE ON public.entity_representatives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_cases_updated BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_case_notes_updated BEFORE UPDATE ON public.case_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_case_hearings_updated BEFORE UPDATE ON public.case_hearings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_errands_updated BEFORE UPDATE ON public.errands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_doc_comments_updated BEFORE UPDATE ON public.document_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_calendar_updated BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_portal_users_updated BEFORE UPDATE ON public.portal_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Numbering
CREATE TRIGGER trg_generate_case_number BEFORE INSERT ON public.cases FOR EACH ROW WHEN (NEW.case_number IS NULL OR NEW.case_number = '') EXECUTE FUNCTION public.generate_case_number();
CREATE TRIGGER trg_generate_errand_number BEFORE INSERT ON public.errands FOR EACH ROW WHEN (NEW.errand_number IS NULL OR NEW.errand_number = '') EXECUTE FUNCTION public.generate_errand_number();
CREATE TRIGGER trg_generate_invoice_number BEFORE INSERT ON public.invoices FOR EACH ROW WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '') EXECUTE FUNCTION public.generate_invoice_number();

-- Validation triggers (recreated)
CREATE TRIGGER trg_validate_doc_scope BEFORE INSERT OR UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.validate_document_scope();
CREATE TRIGGER trg_validate_doc_indexing BEFORE INSERT OR UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.validate_document_indexing_status();
CREATE TRIGGER trg_validate_doc_comment BEFORE INSERT OR UPDATE ON public.document_comments FOR EACH ROW EXECUTE FUNCTION public.validate_document_comment();
CREATE TRIGGER trg_validate_msg_sender BEFORE INSERT OR UPDATE ON public.client_messages FOR EACH ROW EXECUTE FUNCTION public.validate_client_message_sender_type();
CREATE TRIGGER trg_doc_search BEFORE INSERT OR UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.documents_update_search_tsv();
CREATE TRIGGER trg_doc_version BEFORE INSERT ON public.documents FOR EACH ROW EXECUTE FUNCTION public.handle_document_version_insert();

-- Errand progress
CREATE TRIGGER trg_errand_progress AFTER INSERT OR UPDATE OR DELETE ON public.errand_steps FOR EACH ROW EXECUTE FUNCTION public.update_errand_progress();

-- Payments → invoice totals
CREATE TRIGGER trg_invoice_payment_sync AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_invoice_on_payment();
CREATE TRIGGER trg_invoice_viewed AFTER UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.notify_on_invoice_viewed();