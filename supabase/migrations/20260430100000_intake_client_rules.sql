-- Intake rules from target product model:
-- - cases/errands are visible to connected portal clients by default
-- - errands must have a client party
-- - legal-entity clients must have at least one active human representative

CREATE OR REPLACE FUNCTION public.entity_has_active_representative(_entity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.entity_representatives er
    WHERE er.entity_id = _entity_id
      AND (er.end_date IS NULL OR er.end_date >= CURRENT_DATE)
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_case_party_client_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'client' AND NEW.party_type = 'entity' THEN
    IF NEW.entity_id IS NULL THEN
      RAISE EXCEPTION 'Client entity party requires entity_id';
    END IF;

    IF NOT public.entity_has_active_representative(NEW.entity_id) THEN
      RAISE EXCEPTION 'Client entity must have at least one active representative';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_case_party_client_rules ON public.case_parties;
CREATE TRIGGER trg_case_party_client_rules
BEFORE INSERT OR UPDATE OF role, party_type, entity_id
ON public.case_parties
FOR EACH ROW
EXECUTE FUNCTION public.enforce_case_party_client_rules();

CREATE OR REPLACE FUNCTION public.enforce_errand_client_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.party_type NOT IN ('person', 'entity') THEN
    RAISE EXCEPTION 'Errand requires a client party';
  END IF;

  IF NEW.party_type = 'person' AND NEW.person_id IS NULL THEN
    RAISE EXCEPTION 'Errand person client requires person_id';
  END IF;

  IF NEW.party_type = 'entity' THEN
    IF NEW.entity_id IS NULL THEN
      RAISE EXCEPTION 'Errand entity client requires entity_id';
    END IF;

    IF NOT public.entity_has_active_representative(NEW.entity_id) THEN
      RAISE EXCEPTION 'Errand client entity must have at least one active representative';
    END IF;
  END IF;

  NEW.is_visible_to_client := true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_errand_client_rules ON public.errands;
CREATE TRIGGER trg_errand_client_rules
BEFORE INSERT OR UPDATE OF party_type, person_id, entity_id, is_visible_to_client
ON public.errands
FOR EACH ROW
EXECUTE FUNCTION public.enforce_errand_client_rules();

CREATE OR REPLACE FUNCTION public.default_case_portal_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.is_visible_to_client := true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_default_case_portal_visibility ON public.cases;
CREATE TRIGGER trg_default_case_portal_visibility
BEFORE INSERT
ON public.cases
FOR EACH ROW
EXECUTE FUNCTION public.default_case_portal_visibility();
