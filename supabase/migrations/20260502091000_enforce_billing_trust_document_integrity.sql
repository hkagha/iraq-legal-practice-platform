-- Server-side integrity guards for billing, trust accounting, and portal uploads.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

CREATE OR REPLACE FUNCTION public.enforce_invoice_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_changed boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Invoices cannot be deleted; cancel or archive the invoice instead';
  END IF;

  IF OLD.status IN ('sent', 'viewed', 'paid') THEN
    IF NEW.status IN ('cancelled', 'archived') THEN
      IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
        NEW.cancelled_at := COALESCE(NEW.cancelled_at, now());
        NEW.cancelled_by := COALESCE(NEW.cancelled_by, auth.uid());
      END IF;
      RETURN NEW;
    END IF;

    v_changed :=
      NEW.invoice_number IS DISTINCT FROM OLD.invoice_number
      OR NEW.party_type IS DISTINCT FROM OLD.party_type
      OR NEW.person_id IS DISTINCT FROM OLD.person_id
      OR NEW.entity_id IS DISTINCT FROM OLD.entity_id
      OR NEW.case_id IS DISTINCT FROM OLD.case_id
      OR NEW.errand_id IS DISTINCT FROM OLD.errand_id
      OR NEW.issue_date IS DISTINCT FROM OLD.issue_date
      OR NEW.due_date IS DISTINCT FROM OLD.due_date
      OR NEW.currency IS DISTINCT FROM OLD.currency
      OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
      OR NEW.tax_amount IS DISTINCT FROM OLD.tax_amount
      OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
      OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
      OR NEW.notes IS DISTINCT FROM OLD.notes
      OR NEW.notes_ar IS DISTINCT FROM OLD.notes_ar
      OR NEW.status IS DISTINCT FROM OLD.status;

    IF v_changed THEN
      RAISE EXCEPTION 'Sent, viewed, and paid invoices are locked. Cancel the invoice and create a corrected one.';
    END IF;
  END IF;

  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    NEW.cancelled_at := COALESCE(NEW.cancelled_at, now());
    NEW.cancelled_by := COALESCE(NEW.cancelled_by, auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_invoice_lock_update ON public.invoices;
CREATE TRIGGER trg_enforce_invoice_lock_update
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_invoice_lock();

DROP TRIGGER IF EXISTS trg_enforce_invoice_lock_delete ON public.invoices;
CREATE TRIGGER trg_enforce_invoice_lock_delete
  BEFORE DELETE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_invoice_lock();

CREATE OR REPLACE FUNCTION public.enforce_trust_transaction_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_account_currency text;
  v_account_org uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Trust transactions cannot be deleted; create a reversing entry instead';
  END IF;

  SELECT currency, organization_id
  INTO v_account_currency, v_account_org
  FROM public.trust_accounts
  WHERE id = NEW.trust_account_id;

  IF v_account_currency IS NULL THEN
    RAISE EXCEPTION 'Trust account % not found', NEW.trust_account_id;
  END IF;

  IF NEW.currency <> v_account_currency THEN
    RAISE EXCEPTION 'Trust transaction currency % must match account currency %', NEW.currency, v_account_currency;
  END IF;

  IF NEW.organization_id <> v_account_org THEN
    RAISE EXCEPTION 'Trust transaction organization must match the trust account organization';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_trust_tx_integrity_write ON public.trust_transactions;
CREATE TRIGGER trg_enforce_trust_tx_integrity_write
  BEFORE INSERT OR UPDATE ON public.trust_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_trust_transaction_integrity();

DROP TRIGGER IF EXISTS trg_enforce_trust_tx_integrity_delete ON public.trust_transactions;
CREATE TRIGGER trg_enforce_trust_tx_integrity_delete
  BEFORE DELETE ON public.trust_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_trust_transaction_integrity();

CREATE OR REPLACE FUNCTION public.ensure_portal_upload_visible()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.portal_users pu
    WHERE pu.auth_user_id = auth.uid()
  ) THEN
    NEW.is_visible_to_client := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_portal_upload_visible ON public.documents;
CREATE TRIGGER trg_ensure_portal_upload_visible
  BEFORE INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_portal_upload_visible();
