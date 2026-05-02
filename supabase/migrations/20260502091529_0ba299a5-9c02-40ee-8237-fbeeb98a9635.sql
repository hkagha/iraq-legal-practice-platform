-- Platform confidentiality and errand assignment access hardening.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS errand_id uuid REFERENCES public.errands(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_errand ON public.invoices(errand_id);

DROP POLICY IF EXISTS "super_admin_all_profiles" ON public.profiles;
CREATE POLICY "super_admin_all_profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = 'super_admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'super_admin');

DROP POLICY IF EXISTS "super_admin_all_time_entries" ON public.time_entries;
CREATE POLICY "super_admin_all_time_entries" ON public.time_entries
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = 'super_admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'super_admin');

DROP POLICY IF EXISTS "super_admin_all_line_items" ON public.invoice_line_items;
CREATE POLICY "super_admin_all_line_items" ON public.invoice_line_items
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = 'super_admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'super_admin');

DROP POLICY IF EXISTS "super_admin_all_platform_settings" ON public.platform_settings;
CREATE POLICY "super_admin_all_platform_settings" ON public.platform_settings
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = 'super_admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'super_admin');

CREATE TABLE IF NOT EXISTS public.errand_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  errand_id uuid NOT NULL REFERENCES public.errands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  assigned_by uuid REFERENCES public.profiles(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (errand_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_errand_team_members_org ON public.errand_team_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_errand_team_members_errand ON public.errand_team_members(errand_id);
CREATE INDEX IF NOT EXISTS idx_errand_team_members_user ON public.errand_team_members(user_id);

ALTER TABLE public.errand_team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org members manage errand_team_members" ON public.errand_team_members;
CREATE POLICY "org members manage errand_team_members" ON public.errand_team_members
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

INSERT INTO public.errand_team_members (organization_id, errand_id, user_id, role, assigned_by)
SELECT e.organization_id, e.id, e.assigned_to, 'lead', e.created_by
FROM public.errands e
WHERE e.assigned_to IS NOT NULL
ON CONFLICT (errand_id, user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.user_can_access_errand(_user_id uuid, _errand_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.errands e ON e.organization_id = p.organization_id
    WHERE p.id = _user_id
      AND e.id = _errand_id
      AND p.role = 'firm_admin'
  )
  OR EXISTS (
    SELECT 1
    FROM public.errand_team_members etm
    WHERE etm.errand_id = _errand_id
      AND etm.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_org_finance_access(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _user_id
      AND p.organization_id = _org_id
      AND p.role IN ('firm_admin', 'accountant')
  );
$$;

-- Portal helper: portal client can access an errand whose party is theirs,
-- or whose linked case is theirs.
CREATE OR REPLACE FUNCTION public.portal_user_can_access_errand(_errand_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.errands e
    WHERE e.id = _errand_id
      AND (
        (e.party_type = 'person' AND public.portal_user_can_access_person(e.person_id))
        OR (e.party_type = 'entity' AND public.portal_user_can_access_entity(e.entity_id))
        OR (e.case_id IS NOT NULL AND public.portal_user_can_access_case(e.case_id))
      )
  );
$$;

DROP POLICY IF EXISTS "org members manage errands" ON public.errands;
DROP POLICY IF EXISTS "staff read accessible errands" ON public.errands;
CREATE POLICY "staff read accessible errands" ON public.errands
  FOR SELECT TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'super_admin'
    OR public.user_can_access_errand(auth.uid(), id)
  );

DROP POLICY IF EXISTS "staff insert own org errands" ON public.errands;
CREATE POLICY "staff insert own org errands" ON public.errands
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_org_id(auth.uid())
    AND public.get_user_role(auth.uid()) IN ('firm_admin', 'lawyer', 'paralegal', 'secretary')
  );

DROP POLICY IF EXISTS "staff update accessible errands" ON public.errands;
CREATE POLICY "staff update accessible errands" ON public.errands
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'super_admin'
    OR public.user_can_access_errand(auth.uid(), id)
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) = 'super_admin'
    OR organization_id = public.get_user_org_id(auth.uid())
  );

DROP POLICY IF EXISTS "staff delete accessible errands" ON public.errands;
CREATE POLICY "staff delete accessible errands" ON public.errands
  FOR DELETE TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'super_admin'
    OR public.user_can_access_errand(auth.uid(), id)
  );

DROP POLICY IF EXISTS "org members manage errand_steps" ON public.errand_steps;
DROP POLICY IF EXISTS "staff manage accessible errand_steps" ON public.errand_steps;
CREATE POLICY "staff manage accessible errand_steps" ON public.errand_steps
  FOR ALL TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'super_admin'
    OR public.user_can_access_errand(auth.uid(), errand_id)
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) = 'super_admin'
    OR (
      organization_id = public.get_user_org_id(auth.uid())
      AND public.user_can_access_errand(auth.uid(), errand_id)
    )
  );

DROP POLICY IF EXISTS "org members manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "staff read accessible invoices" ON public.invoices;
CREATE POLICY "staff read accessible invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'super_admin'
    OR public.has_org_finance_access(auth.uid(), organization_id)
    OR (case_id IS NOT NULL AND public.user_can_access_case(auth.uid(), case_id))
    OR (errand_id IS NOT NULL AND public.user_can_access_errand(auth.uid(), errand_id))
  );

DROP POLICY IF EXISTS "staff insert accessible invoices" ON public.invoices;
CREATE POLICY "staff insert accessible invoices" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_org_id(auth.uid())
    AND (
      public.has_org_finance_access(auth.uid(), organization_id)
      OR (case_id IS NOT NULL AND public.user_can_access_case(auth.uid(), case_id))
      OR (errand_id IS NOT NULL AND public.user_can_access_errand(auth.uid(), errand_id))
    )
  );

DROP POLICY IF EXISTS "staff update accessible invoices" ON public.invoices;
CREATE POLICY "staff update accessible invoices" ON public.invoices
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'super_admin'
    OR public.has_org_finance_access(auth.uid(), organization_id)
    OR (case_id IS NOT NULL AND public.user_can_access_case(auth.uid(), case_id))
    OR (errand_id IS NOT NULL AND public.user_can_access_errand(auth.uid(), errand_id))
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) = 'super_admin'
    OR organization_id = public.get_user_org_id(auth.uid())
  );

DROP POLICY IF EXISTS "staff delete accessible invoices" ON public.invoices;
CREATE POLICY "staff delete accessible invoices" ON public.invoices
  FOR DELETE TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'super_admin'
    OR public.has_org_finance_access(auth.uid(), organization_id)
  );

DROP POLICY IF EXISTS "org members manage payments" ON public.payments;
DROP POLICY IF EXISTS "staff manage finance payments" ON public.payments;
CREATE POLICY "staff manage finance payments" ON public.payments
  FOR ALL TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'super_admin'
    OR public.has_org_finance_access(auth.uid(), organization_id)
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) = 'super_admin'
    OR public.has_org_finance_access(auth.uid(), organization_id)
  );

DROP POLICY IF EXISTS "portal user reads visible documents" ON public.documents;
CREATE POLICY "portal user reads visible documents" ON public.documents
  FOR SELECT TO authenticated
  USING (
    is_visible_to_client = true
    AND status = 'active'
    AND (
      (party_type = 'person' AND public.portal_user_can_access_person(person_id))
      OR (party_type = 'entity' AND public.portal_user_can_access_entity(entity_id))
      OR (case_id IS NOT NULL AND public.portal_user_can_access_case(case_id))
      OR (errand_id IS NOT NULL AND public.portal_user_can_access_errand(errand_id))
    )
  );

CREATE OR REPLACE FUNCTION public.client_can_access_document_object(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.file_path = object_name
      AND d.status = 'active'
      AND d.is_visible_to_client = true
      AND (
        (d.party_type = 'person' AND public.portal_user_can_access_person(d.person_id))
        OR (d.party_type = 'entity' AND public.portal_user_can_access_entity(d.entity_id))
        OR (d.case_id IS NOT NULL AND public.portal_user_can_access_case(d.case_id))
        OR (d.errand_id IS NOT NULL AND public.portal_user_can_access_errand(d.errand_id))
      )
  );
$$;