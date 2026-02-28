
-- Time Entries table
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  errand_id UUID REFERENCES public.errands(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  description_ar TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME,
  end_time TIME,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  is_billable BOOLEAN NOT NULL DEFAULT true,
  billing_rate DECIMAL(10,2),
  billing_rate_currency TEXT DEFAULT 'IQD' CHECK (billing_rate_currency IN ('IQD', 'USD')),
  total_amount DECIMAL(15,2) GENERATED ALWAYS AS (
    CASE WHEN is_billable AND billing_rate IS NOT NULL 
    THEN ROUND((duration_minutes::DECIMAL / 60) * billing_rate, 2)
    ELSE 0 END
  ) STORED,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'invoiced', 'written_off')),
  timer_started_at TIMESTAMPTZ,
  is_timer_running BOOLEAN DEFAULT false,
  invoice_id UUID,
  invoice_line_item_id UUID,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_time_entries_org ON public.time_entries(organization_id);
CREATE INDEX idx_time_entries_user ON public.time_entries(user_id);
CREATE INDEX idx_time_entries_case ON public.time_entries(case_id);
CREATE INDEX idx_time_entries_errand ON public.time_entries(errand_id);
CREATE INDEX idx_time_entries_client ON public.time_entries(client_id);
CREATE INDEX idx_time_entries_date ON public.time_entries(date DESC);
CREATE INDEX idx_time_entries_status ON public.time_entries(status);
CREATE INDEX idx_time_entries_billable ON public.time_entries(is_billable);
CREATE INDEX idx_time_entries_invoice ON public.time_entries(invoice_id);
CREATE INDEX idx_time_entries_timer ON public.time_entries(is_timer_running) WHERE is_timer_running = true;

CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- RLS for time_entries
CREATE POLICY "users_read_org_time_entries" ON public.time_entries
  FOR SELECT USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "users_insert_own_time_entries" ON public.time_entries
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id(auth.uid())
    AND (user_id = auth.uid() OR get_user_role(auth.uid()) = 'firm_admin')
    AND get_user_role(auth.uid()) IN ('firm_admin', 'lawyer', 'paralegal')
  );

CREATE POLICY "users_update_own_time_entries" ON public.time_entries
  FOR UPDATE USING (
    organization_id = get_user_org_id(auth.uid())
    AND (user_id = auth.uid() OR get_user_role(auth.uid()) = 'firm_admin')
    AND get_user_role(auth.uid()) IN ('firm_admin', 'lawyer', 'paralegal')
  );

CREATE POLICY "users_delete_own_time_entries" ON public.time_entries
  FOR DELETE USING (
    organization_id = get_user_org_id(auth.uid())
    AND (user_id = auth.uid() OR get_user_role(auth.uid()) = 'firm_admin')
    AND get_user_role(auth.uid()) IN ('firm_admin', 'lawyer', 'paralegal')
  );

CREATE POLICY "super_admin_all_time_entries" ON public.time_entries
  FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'sales_admin'));

-- Billing Rates table
CREATE TABLE public.billing_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  rate DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IQD' CHECK (currency IN ('IQD', 'USD')),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_billing_rates_org ON public.billing_rates(organization_id);
CREATE INDEX idx_billing_rates_user ON public.billing_rates(user_id);
CREATE INDEX idx_billing_rates_case ON public.billing_rates(case_id);

ALTER TABLE public.billing_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_org_billing_rates" ON public.billing_rates
  FOR SELECT USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "admin_manage_billing_rates" ON public.billing_rates
  FOR ALL USING (
    organization_id = get_user_org_id(auth.uid())
    AND get_user_role(auth.uid()) = 'firm_admin'
  );

CREATE POLICY "super_admin_all_billing_rates" ON public.billing_rates
  FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'sales_admin'));

-- Invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL DEFAULT '',
  client_id UUID NOT NULL REFERENCES public.clients(id),
  case_id UUID REFERENCES public.cases(id),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  currency TEXT NOT NULL DEFAULT 'IQD' CHECK (currency IN ('IQD', 'USD')),
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) GENERATED ALWAYS AS (ROUND(subtotal * tax_rate / 100, 2)) STORED,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  discount_type TEXT DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percentage')),
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  total_amount DECIMAL(15,2) GENERATED ALWAYS AS (
    subtotal + ROUND(subtotal * tax_rate / 100, 2) - COALESCE(discount_amount, 0)
  ) STORED,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  balance_due DECIMAL(15,2) GENERATED ALWAYS AS (
    subtotal + ROUND(subtotal * tax_rate / 100, 2) - COALESCE(discount_amount, 0) - COALESCE(amount_paid, 0)
  ) STORED,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'cancelled', 'written_off'
  )),
  notes TEXT,
  notes_ar TEXT,
  terms TEXT,
  terms_ar TEXT,
  footer_text TEXT,
  footer_text_ar TEXT,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_org ON public.invoices(organization_id);
CREATE INDEX idx_invoices_client ON public.invoices(client_id);
CREATE INDEX idx_invoices_case ON public.invoices(case_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX idx_invoices_due ON public.invoices(due_date);
CREATE INDEX idx_invoices_created ON public.invoices(created_at DESC);

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_org_invoices" ON public.invoices
  FOR SELECT USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "admin_manage_invoices" ON public.invoices
  FOR ALL USING (
    organization_id = get_user_org_id(auth.uid())
    AND get_user_role(auth.uid()) = 'firm_admin'
  );

CREATE POLICY "super_admin_all_invoices" ON public.invoices
  FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'sales_admin'));

CREATE POLICY "client_view_own_invoices" ON public.invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM client_user_links
      WHERE client_user_links.client_id = invoices.client_id
      AND client_user_links.user_id = auth.uid()
    )
  );

-- Auto-generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  org_prefix TEXT; next_num INTEGER; year_str TEXT;
BEGIN
  SELECT invoice_prefix, invoice_next_number INTO org_prefix, next_num
  FROM public.organizations WHERE id = NEW.organization_id;
  year_str := EXTRACT(YEAR FROM NOW())::TEXT;
  NEW.invoice_number := COALESCE(org_prefix, 'INV') || '-' || year_str || '-' || LPAD(COALESCE(next_num, 1)::TEXT, 4, '0');
  UPDATE public.organizations SET invoice_next_number = COALESCE(next_num, 1) + 1 WHERE id = NEW.organization_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER generate_invoice_number_trigger BEFORE INSERT ON public.invoices
  FOR EACH ROW WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION public.generate_invoice_number();

-- Invoice Line Items table
CREATE TABLE public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  description_ar TEXT,
  line_type TEXT NOT NULL DEFAULT 'service' CHECK (line_type IN ('time_entry', 'fixed_fee', 'expense', 'service', 'discount', 'other')),
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  total DECIMAL(15,2) GENERATED ALWAYS AS (ROUND(quantity * unit_price, 2)) STORED,
  time_entry_id UUID REFERENCES public.time_entries(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_line_items_invoice ON public.invoice_line_items(invoice_id);
CREATE INDEX idx_line_items_time_entry ON public.invoice_line_items(time_entry_id);

ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_org_line_items" ON public.invoice_line_items
  FOR SELECT USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "admin_manage_line_items" ON public.invoice_line_items
  FOR ALL USING (
    organization_id = get_user_org_id(auth.uid())
    AND get_user_role(auth.uid()) = 'firm_admin'
  );

CREATE POLICY "super_admin_all_line_items" ON public.invoice_line_items
  FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'sales_admin'));

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'IQD' CHECK (currency IN ('IQD', 'USD')),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL CHECK (payment_method IN (
    'cash', 'bank_transfer', 'check', 'credit_card', 'mobile_payment', 'other'
  )),
  reference_number TEXT,
  notes TEXT,
  notes_ar TEXT,
  receipt_url TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_org ON public.payments(organization_id);
CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX idx_payments_client ON public.payments(client_id);
CREATE INDEX idx_payments_date ON public.payments(payment_date DESC);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_org_payments" ON public.payments
  FOR SELECT USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "admin_manage_payments" ON public.payments
  FOR ALL USING (
    organization_id = get_user_org_id(auth.uid())
    AND get_user_role(auth.uid()) = 'firm_admin'
  );

CREATE POLICY "super_admin_all_payments" ON public.payments
  FOR ALL USING (get_user_role(auth.uid()) IN ('super_admin', 'sales_admin'));

CREATE POLICY "client_view_own_payments" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM client_user_links
      WHERE client_user_links.client_id = payments.client_id
      AND client_user_links.user_id = auth.uid()
    )
  );

-- Auto-update invoice on payment
CREATE OR REPLACE FUNCTION public.update_invoice_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  total_paid DECIMAL(15,2);
  inv_total DECIMAL(15,2);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM public.payments WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  SELECT total_amount INTO inv_total
  FROM public.invoices WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  UPDATE public.invoices
  SET amount_paid = total_paid,
      status = CASE
        WHEN total_paid >= inv_total THEN 'paid'
        WHEN total_paid > 0 THEN 'partially_paid'
        ELSE status
      END,
      paid_at = CASE WHEN total_paid >= inv_total THEN NOW() ELSE NULL END
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_invoice_payment_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_invoice_on_payment();
