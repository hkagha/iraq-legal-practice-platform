-- 1. archive_read flag on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS archive_read boolean NOT NULL DEFAULT false;

-- 2. helper: has_archive_access
CREATE OR REPLACE FUNCTION public.has_archive_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
      AND COALESCE(is_active, true) = true
      AND (role = 'firm_admin' OR archive_read = true)
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_archive_access(uuid) TO authenticated;

-- 3. audit log for archive access
CREATE TABLE IF NOT EXISTS public.document_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  document_id uuid,
  access_type text NOT NULL,
  via_archive boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_doc_access_audit_org_created
  ON public.document_access_audit(organization_id, created_at DESC);

ALTER TABLE public.document_access_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_insert_doc_access_audit" ON public.document_access_audit;
CREATE POLICY "staff_insert_doc_access_audit"
ON public.document_access_audit FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND organization_id = public.get_user_org_id(auth.uid())
);

DROP POLICY IF EXISTS "firm_admin_read_doc_access_audit" ON public.document_access_audit;
CREATE POLICY "firm_admin_read_doc_access_audit"
ON public.document_access_audit FOR SELECT TO authenticated
USING (
  organization_id = public.get_user_org_id(auth.uid())
  AND public.get_user_role(auth.uid()) IN ('firm_admin','super_admin')
);

-- 4. Replace broad documents staff policy with archive-aware rules
DROP POLICY IF EXISTS "org staff manage documents" ON public.documents;

-- 4a. archive-privileged staff: full access to firm documents
CREATE POLICY "archive staff access documents"
ON public.documents FOR ALL TO authenticated
USING (
  public.is_org_staff_member(auth.uid(), organization_id)
  AND public.has_archive_access(auth.uid())
)
WITH CHECK (
  public.is_org_staff_member(auth.uid(), organization_id)
  AND public.has_archive_access(auth.uid())
);

-- 4b. assigned staff: access via assigned case/errand
CREATE POLICY "assigned staff access documents"
ON public.documents FOR ALL TO authenticated
USING (
  public.is_org_staff_member(auth.uid(), organization_id)
  AND (
    (case_id IS NOT NULL AND public.user_can_access_case(auth.uid(), case_id))
    OR (errand_id IS NOT NULL AND public.user_can_access_errand(auth.uid(), errand_id))
    OR uploaded_by = auth.uid()
  )
)
WITH CHECK (
  public.is_org_staff_member(auth.uid(), organization_id)
  AND (
    (case_id IS NOT NULL AND public.user_can_access_case(auth.uid(), case_id))
    OR (errand_id IS NOT NULL AND public.user_can_access_errand(auth.uid(), errand_id))
    OR uploaded_by = auth.uid()
  )
);
