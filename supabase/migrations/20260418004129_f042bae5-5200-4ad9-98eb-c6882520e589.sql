DROP POLICY IF EXISTS staff_read_case_documents ON public.documents;
CREATE POLICY staff_read_case_documents ON public.documents
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_org_id(auth.uid())
    AND visibility_scope = 'case_specific'
    AND (
      public.get_user_role(auth.uid()) = 'firm_admin'
      OR uploaded_by = auth.uid()
      OR (case_id IS NOT NULL AND public.user_can_access_case(auth.uid(), case_id))
      OR (errand_id IS NOT NULL AND public.user_can_access_errand(auth.uid(), errand_id))
      OR (case_id IS NULL AND errand_id IS NULL AND client_id IS NOT NULL
          AND public.get_user_role(auth.uid()) IN ('lawyer','paralegal'))
    )
  );