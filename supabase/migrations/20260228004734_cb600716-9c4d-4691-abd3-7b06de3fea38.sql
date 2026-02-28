
-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_type TEXT NOT NULL CHECK (client_type IN ('individual', 'company')),
  first_name TEXT,
  last_name TEXT,
  first_name_ar TEXT,
  last_name_ar TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female')),
  national_id_number TEXT,
  nationality TEXT DEFAULT 'Iraqi',
  company_name TEXT,
  company_name_ar TEXT,
  company_registration_number TEXT,
  company_type TEXT CHECK (company_type IN ('llc', 'jsc', 'sole_proprietorship', 'partnership', 'branch_office', 'representative_office', 'ngo', 'government', 'other')),
  industry TEXT,
  industry_ar TEXT,
  email TEXT,
  phone TEXT,
  secondary_phone TEXT,
  whatsapp_number TEXT,
  address TEXT,
  address_ar TEXT,
  city TEXT,
  city_ar TEXT,
  governorate TEXT NOT NULL DEFAULT 'Baghdad',
  postal_code TEXT,
  country TEXT DEFAULT 'Iraq',
  tax_id TEXT,
  preferred_currency TEXT DEFAULT 'IQD' CHECK (preferred_currency IN ('IQD', 'USD')),
  payment_terms_days INTEGER DEFAULT 30,
  credit_limit DECIMAL(15,2),
  source TEXT CHECK (source IN ('referral', 'walk_in', 'website', 'social_media', 'advertisement', 'other')),
  source_details TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  notes_ar TEXT,
  profile_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived', 'prospect')),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT client_name_check CHECK (
    (client_type = 'individual' AND first_name IS NOT NULL AND last_name IS NOT NULL) OR
    (client_type = 'company' AND company_name IS NOT NULL)
  )
);

CREATE INDEX idx_clients_org ON public.clients(organization_id);
CREATE INDEX idx_clients_type ON public.clients(client_type);
CREATE INDEX idx_clients_status ON public.clients(status);
CREATE INDEX idx_clients_governorate ON public.clients(governorate);
CREATE INDEX idx_clients_created_at ON public.clients(created_at DESC);
CREATE INDEX idx_clients_search ON public.clients USING gin(
  to_tsvector('simple', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(first_name_ar, '') || ' ' || COALESCE(last_name_ar, '') || ' ' || COALESCE(company_name, '') || ' ' || COALESCE(company_name_ar, '') || ' ' || COALESCE(email, '') || ' ' || COALESCE(phone, ''))
);

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create client_contacts table
CREATE TABLE public.client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  first_name_ar TEXT,
  last_name_ar TEXT,
  email TEXT,
  phone TEXT,
  job_title TEXT,
  job_title_ar TEXT,
  department TEXT,
  department_ar TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_client_contacts_client ON public.client_contacts(client_id);
CREATE INDEX idx_client_contacts_org ON public.client_contacts(organization_id);

CREATE TRIGGER update_client_contacts_updated_at
  BEFORE UPDATE ON public.client_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create client_user_links table
CREATE TABLE public.client_user_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, user_id)
);

CREATE INDEX idx_client_user_links_client ON public.client_user_links(client_id);
CREATE INDEX idx_client_user_links_user ON public.client_user_links(user_id);

-- RLS for clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_org_clients" ON public.clients
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "staff_create_clients" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('firm_admin', 'lawyer', 'paralegal')
  );

CREATE POLICY "staff_update_clients" ON public.clients
  FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('firm_admin', 'lawyer', 'paralegal')
  );

CREATE POLICY "admin_delete_clients" ON public.clients
  FOR DELETE TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) = 'firm_admin'
  );

CREATE POLICY "super_admin_all_clients" ON public.clients
  FOR ALL TO authenticated
  USING ((SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('super_admin', 'sales_admin'));

CREATE POLICY "client_user_own_record" ON public.clients
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.client_user_links WHERE client_user_links.client_id = clients.id AND client_user_links.user_id = auth.uid()));

-- RLS for client_contacts
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_org_client_contacts" ON public.client_contacts
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "staff_manage_client_contacts" ON public.client_contacts
  FOR ALL TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('firm_admin', 'lawyer', 'paralegal')
  );

CREATE POLICY "super_admin_all_client_contacts" ON public.client_contacts
  FOR ALL TO authenticated
  USING ((SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('super_admin', 'sales_admin'));

-- RLS for client_user_links
ALTER TABLE public.client_user_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_org_client_user_links" ON public.client_user_links
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "admin_manage_client_user_links" ON public.client_user_links
  FOR ALL TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) = 'firm_admin'
  );

CREATE POLICY "super_admin_all_client_user_links" ON public.client_user_links
  FOR ALL TO authenticated
  USING ((SELECT role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('super_admin', 'sales_admin'));
