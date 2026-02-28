
-- ============================================
-- ORGANIZATIONS TABLE
-- ============================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  address_ar TEXT,
  city TEXT,
  governorate TEXT,
  website TEXT,
  registration_number TEXT,
  tax_id TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'professional', 'enterprise', 'custom')),
  subscription_status TEXT NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'past_due', 'cancelled', 'suspended')),
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  max_users INTEGER NOT NULL DEFAULT 3,
  max_storage_mb INTEGER NOT NULL DEFAULT 5120,
  default_language TEXT NOT NULL DEFAULT 'en' CHECK (default_language IN ('en', 'ar')),
  default_currency TEXT NOT NULL DEFAULT 'IQD' CHECK (default_currency IN ('IQD', 'USD')),
  working_days TEXT[] DEFAULT ARRAY['sunday','monday','tuesday','wednesday','thursday'],
  working_hours_start TIME DEFAULT '08:00',
  working_hours_end TIME DEFAULT '16:00',
  letterhead_url TEXT,
  invoice_prefix TEXT DEFAULT 'INV',
  invoice_next_number INTEGER DEFAULT 1,
  case_prefix TEXT DEFAULT 'CASE',
  case_next_number INTEGER DEFAULT 1,
  errand_prefix TEXT DEFAULT 'ERR',
  errand_next_number INTEGER DEFAULT 1,
  default_tax_rate DECIMAL(5,2) DEFAULT 0,
  default_payment_terms_days INTEGER DEFAULT 30,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_iban TEXT,
  invoice_footer_text TEXT,
  invoice_footer_text_ar TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_is_active ON public.organizations(is_active);

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  first_name_ar TEXT,
  last_name_ar TEXT,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  secondary_phone TEXT,
  role TEXT NOT NULL DEFAULT 'lawyer' CHECK (role IN ('super_admin', 'sales_admin', 'firm_admin', 'lawyer', 'paralegal', 'client')),
  avatar_url TEXT,
  job_title TEXT,
  job_title_ar TEXT,
  language_preference TEXT NOT NULL DEFAULT 'en' CHECK (language_preference IN ('en', 'ar')),
  timezone TEXT DEFAULT 'Asia/Baghdad',
  notification_preferences JSONB DEFAULT '{"in_app": true, "email": true, "whatsapp": false}'::jsonb,
  last_active_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_organization ON public.profiles(organization_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);

-- ============================================
-- INVITATIONS TABLE
-- ============================================
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('firm_admin', 'lawyer', 'paralegal', 'client')),
  first_name TEXT,
  last_name TEXT,
  invited_by UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_org ON public.invitations(organization_id);

-- ============================================
-- TIMESTAMP TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'lawyer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- SECURITY DEFINER HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = _user_id
$$;

-- ============================================
-- RLS: ORGANIZATIONS
-- ============================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_orgs" ON public.organizations
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('super_admin', 'sales_admin'));

CREATE POLICY "users_own_org" ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.get_user_org_id(auth.uid()));

CREATE POLICY "firm_admin_update_org" ON public.organizations
  FOR UPDATE TO authenticated
  USING (
    id = public.get_user_org_id(auth.uid())
    AND public.get_user_role(auth.uid()) = 'firm_admin'
  );

CREATE POLICY "authenticated_insert_org" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================
-- RLS: PROFILES
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_read_org_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "super_admin_all_profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('super_admin', 'sales_admin'));

CREATE POLICY "users_update_own_profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "firm_admin_update_org_profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_org_id(auth.uid())
    AND public.get_user_role(auth.uid()) = 'firm_admin'
  );

-- ============================================
-- RLS: INVITATIONS
-- ============================================
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_org_invitations" ON public.invitations
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "firm_admin_create_invitations" ON public.invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_org_id(auth.uid())
    AND public.get_user_role(auth.uid()) = 'firm_admin'
  );
