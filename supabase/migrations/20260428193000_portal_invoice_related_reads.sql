-- Allow portal clients to read line items and payments for invoices they can access.

DROP POLICY IF EXISTS "portal user reads own invoice line items" ON public.invoice_line_items;
CREATE POLICY "portal user reads own invoice line items"
  ON public.invoice_line_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = invoice_line_items.invoice_id
        AND i.status <> 'draft'
        AND (
          (i.party_type = 'person' AND public.portal_user_can_access_person(i.person_id))
          OR (i.party_type = 'entity' AND public.portal_user_can_access_entity(i.entity_id))
        )
    )
  );

DROP POLICY IF EXISTS "portal user reads own invoice payments" ON public.payments;
CREATE POLICY "portal user reads own invoice payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = payments.invoice_id
        AND i.status <> 'draft'
        AND (
          (i.party_type = 'person' AND public.portal_user_can_access_person(i.person_id))
          OR (i.party_type = 'entity' AND public.portal_user_can_access_entity(i.entity_id))
        )
    )
  );
