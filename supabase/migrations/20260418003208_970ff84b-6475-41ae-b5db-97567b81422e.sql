DROP POLICY IF EXISTS admin_manage_invoices ON public.invoices;
CREATE POLICY staff_manage_invoices ON public.invoices
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid())
         AND public.get_user_role(auth.uid()) IN ('firm_admin','lawyer','paralegal','accountant'))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid())
         AND public.get_user_role(auth.uid()) IN ('firm_admin','lawyer','paralegal','accountant'));

DROP POLICY IF EXISTS admin_manage_line_items ON public.invoice_line_items;
CREATE POLICY staff_manage_line_items ON public.invoice_line_items
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid())
         AND public.get_user_role(auth.uid()) IN ('firm_admin','lawyer','paralegal','accountant'))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid())
         AND public.get_user_role(auth.uid()) IN ('firm_admin','lawyer','paralegal','accountant'));

DROP POLICY IF EXISTS admin_manage_payments ON public.payments;
CREATE POLICY staff_manage_payments ON public.payments
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid())
         AND public.get_user_role(auth.uid()) IN ('firm_admin','lawyer','paralegal','accountant'))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid())
         AND public.get_user_role(auth.uid()) IN ('firm_admin','lawyer','paralegal','accountant'));