-- Trust accounts
CREATE TABLE public.trust_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  party_type text NOT NULL CHECK (party_type IN ('person','entity')),
  person_id uuid,
  entity_id uuid,
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'IQD',
  balance numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trust_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members manage trust_accounts"
ON public.trust_accounts FOR ALL TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()))
WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

CREATE INDEX idx_trust_accounts_org ON public.trust_accounts(organization_id);
CREATE INDEX idx_trust_accounts_person ON public.trust_accounts(person_id);
CREATE INDEX idx_trust_accounts_entity ON public.trust_accounts(entity_id);

CREATE TRIGGER trg_trust_accounts_updated
BEFORE UPDATE ON public.trust_accounts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trust transactions
CREATE TABLE public.trust_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  trust_account_id uuid NOT NULL REFERENCES public.trust_accounts(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('deposit','withdrawal','invoice_application','transfer','adjustment','refund')),
  amount numeric(15,2) NOT NULL,
  currency text NOT NULL DEFAULT 'IQD',
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  reference text,
  invoice_id uuid,
  case_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trust_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members manage trust_transactions"
ON public.trust_transactions FOR ALL TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()))
WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

CREATE INDEX idx_trust_tx_account ON public.trust_transactions(trust_account_id);
CREATE INDEX idx_trust_tx_org ON public.trust_transactions(organization_id);

-- Balance sync function/trigger
CREATE OR REPLACE FUNCTION public.recompute_trust_balance(_account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bal numeric(15,2);
BEGIN
  SELECT COALESCE(SUM(
    CASE WHEN transaction_type IN ('deposit','refund') THEN amount
         WHEN transaction_type IN ('withdrawal','invoice_application') THEN -amount
         WHEN transaction_type = 'adjustment' THEN amount
         WHEN transaction_type = 'transfer' THEN -amount
         ELSE 0 END
  ), 0) INTO bal
  FROM public.trust_transactions WHERE trust_account_id = _account_id;
  UPDATE public.trust_accounts SET balance = bal, updated_at = now() WHERE id = _account_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_trust_tx_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_trust_balance(OLD.trust_account_id);
    RETURN OLD;
  ELSE
    PERFORM public.recompute_trust_balance(NEW.trust_account_id);
    IF TG_OP = 'UPDATE' AND OLD.trust_account_id <> NEW.trust_account_id THEN
      PERFORM public.recompute_trust_balance(OLD.trust_account_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_trust_tx_after
AFTER INSERT OR UPDATE OR DELETE ON public.trust_transactions
FOR EACH ROW EXECUTE FUNCTION public.trg_trust_tx_balance();