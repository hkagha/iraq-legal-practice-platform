-- Enforce the target rule that every case has at least one client party.
-- The trigger is deferred so the atomic create_case_with_parties RPC can insert
-- the case first and its parties immediately after in the same transaction.

CREATE OR REPLACE FUNCTION public.assert_case_has_client_party(_case_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case_exists boolean;
  v_client_count integer;
BEGIN
  IF _case_id IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.cases c WHERE c.id = _case_id
  ) INTO v_case_exists;

  -- Cascading deletes remove case_parties after the case is gone; do not block that.
  IF NOT v_case_exists THEN
    RETURN;
  END IF;

  SELECT count(*)
  INTO v_client_count
  FROM public.case_parties cp
  WHERE cp.case_id = _case_id
    AND cp.role = 'client';

  IF v_client_count < 1 THEN
    RAISE EXCEPTION 'A case requires at least one client party';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_case_has_client_party()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'cases' THEN
    PERFORM public.assert_case_has_client_party(NEW.id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM public.assert_case_has_client_party(OLD.case_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.case_id IS DISTINCT FROM NEW.case_id THEN
    PERFORM public.assert_case_has_client_party(OLD.case_id);
  END IF;

  PERFORM public.assert_case_has_client_party(NEW.case_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_case_requires_client_after_case_write ON public.cases;
CREATE CONSTRAINT TRIGGER trg_case_requires_client_after_case_write
AFTER INSERT OR UPDATE ON public.cases
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.enforce_case_has_client_party();

DROP TRIGGER IF EXISTS trg_case_requires_client_after_party_write ON public.case_parties;
CREATE CONSTRAINT TRIGGER trg_case_requires_client_after_party_write
AFTER INSERT OR UPDATE OR DELETE ON public.case_parties
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.enforce_case_has_client_party();
