
-- Allow client users to view line items of their invoices
CREATE POLICY "client_view_own_line_items" ON public.invoice_line_items
  FOR SELECT TO authenticated
  USING (
    invoice_id IN (
      SELECT i.id FROM public.invoices i
      JOIN public.client_user_links cul ON cul.client_id = i.client_id
      WHERE cul.user_id = auth.uid()
    )
  );

-- Allow client users to update invoice viewed_at
CREATE POLICY "client_update_invoice_viewed" ON public.invoices
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_user_links cul
      WHERE cul.client_id = invoices.client_id AND cul.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_user_links cul
      WHERE cul.client_id = invoices.client_id AND cul.user_id = auth.uid()
    )
  );
