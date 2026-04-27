CREATE OR REPLACE FUNCTION public.is_org_staff_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _user_id
      AND p.organization_id = _org_id
      AND COALESCE(p.is_active, true) = true
      AND p.role IN ('firm_admin', 'lawyer', 'paralegal', 'secretary', 'accountant')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
BEGIN
  SELECT organization_id INTO _org_id
  FROM public.profiles
  WHERE id = _user_id
    AND COALESCE(is_active, true) = true
    AND role IN ('super_admin', 'sales_admin', 'firm_admin', 'lawyer', 'paralegal', 'secretary', 'accountant');
  RETURN _org_id;
END;
$$;

DROP POLICY IF EXISTS "org members manage cases" ON public.cases;
CREATE POLICY "org staff manage cases"
ON public.cases
FOR ALL
TO authenticated
USING (public.is_org_staff_member(auth.uid(), organization_id))
WITH CHECK (public.is_org_staff_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "org members manage case_parties" ON public.case_parties;
CREATE POLICY "org staff manage case_parties"
ON public.case_parties
FOR ALL
TO authenticated
USING (public.is_org_staff_member(auth.uid(), organization_id))
WITH CHECK (public.is_org_staff_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "org members manage documents" ON public.documents;
CREATE POLICY "org staff manage documents"
ON public.documents
FOR ALL
TO authenticated
USING (public.is_org_staff_member(auth.uid(), organization_id))
WITH CHECK (public.is_org_staff_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "org members manage doc_comments" ON public.document_comments;
CREATE POLICY "org staff manage doc_comments"
ON public.document_comments
FOR ALL
TO authenticated
USING (public.is_org_staff_member(auth.uid(), organization_id))
WITH CHECK (public.is_org_staff_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "org members manage doc_activities" ON public.document_activities;
CREATE POLICY "org staff manage doc_activities"
ON public.document_activities
FOR ALL
TO authenticated
USING (public.is_org_staff_member(auth.uid(), organization_id))
WITH CHECK (public.is_org_staff_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "org members manage messages" ON public.client_messages;
CREATE POLICY "org staff manage messages"
ON public.client_messages
FOR ALL
TO authenticated
USING (public.is_org_staff_member(auth.uid(), organization_id))
WITH CHECK (public.is_org_staff_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "org members manage portal links" ON public.portal_user_links;
CREATE POLICY "org staff manage portal links"
ON public.portal_user_links
FOR ALL
TO authenticated
USING (public.is_org_staff_member(auth.uid(), organization_id))
WITH CHECK (public.is_org_staff_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "org members manage persons" ON public.persons;
CREATE POLICY "org staff manage persons"
ON public.persons
FOR ALL
TO authenticated
USING (public.is_org_staff_member(auth.uid(), organization_id))
WITH CHECK (public.is_org_staff_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "org members manage entities" ON public.entities;
CREATE POLICY "org staff manage entities"
ON public.entities
FOR ALL
TO authenticated
USING (public.is_org_staff_member(auth.uid(), organization_id))
WITH CHECK (public.is_org_staff_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "org members manage entity reps" ON public.entity_representatives;
CREATE POLICY "org staff manage entity reps"
ON public.entity_representatives
FOR ALL
TO authenticated
USING (public.is_org_staff_member(auth.uid(), organization_id))
WITH CHECK (public.is_org_staff_member(auth.uid(), organization_id));