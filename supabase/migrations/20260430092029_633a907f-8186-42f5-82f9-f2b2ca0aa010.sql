-- Remove any pre-existing matter-less messages so the new rule can be enforced.
DELETE FROM public.client_messages
WHERE case_id IS NULL AND errand_id IS NULL;

CREATE OR REPLACE FUNCTION public.enforce_client_message_matter_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.case_id IS NULL AND NEW.errand_id IS NULL THEN
    RAISE EXCEPTION 'Client messages must be linked to a case or an errand';
  END IF;

  IF NEW.case_id IS NOT NULL AND NEW.errand_id IS NOT NULL THEN
    RAISE EXCEPTION 'Client messages cannot be linked to both a case and an errand';
  END IF;

  IF NEW.case_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = NEW.case_id
        AND c.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'Case % not found in organization %', NEW.case_id, NEW.organization_id;
    END IF;
  END IF;

  IF NEW.errand_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.errands e
      WHERE e.id = NEW.errand_id
        AND e.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'Errand % not found in organization %', NEW.errand_id, NEW.organization_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_client_message_matter_scope ON public.client_messages;
CREATE TRIGGER trg_enforce_client_message_matter_scope
  BEFORE INSERT OR UPDATE ON public.client_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_client_message_matter_scope();