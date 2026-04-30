CREATE OR REPLACE FUNCTION public.block_pending_conflict_case_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF NEW.case_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT status INTO v_status FROM public.cases WHERE id = NEW.case_id;
  IF v_status = 'pending_conflict_review' THEN
    RAISE EXCEPTION 'Cannot invoice a case pending conflict review';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_pending_conflict_case_invoice ON public.invoices;
CREATE TRIGGER trg_block_pending_conflict_case_invoice
BEFORE INSERT OR UPDATE OF case_id
ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.block_pending_conflict_case_invoice();