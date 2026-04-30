CREATE OR REPLACE FUNCTION public.portal_user_can_access_errand(_errand_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.errands e
    WHERE e.id = _errand_id
      AND (
        (e.party_type = 'person' AND public.portal_user_can_access_person(e.person_id))
        OR (e.party_type = 'entity' AND public.portal_user_can_access_entity(e.entity_id))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_client_message_matter_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case_org uuid;
  v_errand_org uuid;
BEGIN
  IF (NEW.case_id IS NULL AND NEW.errand_id IS NULL)
    OR (NEW.case_id IS NOT NULL AND NEW.errand_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Client messages must be scoped to exactly one case or errand';
  END IF;

  IF NEW.case_id IS NOT NULL THEN
    SELECT organization_id INTO v_case_org
    FROM public.cases
    WHERE id = NEW.case_id;

    IF v_case_org IS NULL OR v_case_org <> NEW.organization_id THEN
      RAISE EXCEPTION 'Message case does not belong to the message organization';
    END IF;
  END IF;

  IF NEW.errand_id IS NOT NULL THEN
    SELECT organization_id INTO v_errand_org
    FROM public.errands
    WHERE id = NEW.errand_id;

    IF v_errand_org IS NULL OR v_errand_org <> NEW.organization_id THEN
      RAISE EXCEPTION 'Message errand does not belong to the message organization';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_client_message_matter_scope ON public.client_messages;
CREATE TRIGGER trg_client_message_matter_scope
  BEFORE INSERT OR UPDATE OF case_id, errand_id, organization_id
  ON public.client_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_client_message_matter_scope();

DROP POLICY IF EXISTS "portal user reads own messages" ON public.client_messages;
CREATE POLICY "portal user reads own matter messages" ON public.client_messages
  FOR SELECT TO authenticated
  USING (
    (case_id IS NOT NULL AND public.portal_user_can_access_case(case_id))
    OR (errand_id IS NOT NULL AND public.portal_user_can_access_errand(errand_id))
  );

DROP POLICY IF EXISTS "portal user inserts own messages" ON public.client_messages;
CREATE POLICY "portal user inserts own matter messages" ON public.client_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_type = 'client'
    AND (
      (case_id IS NOT NULL AND public.portal_user_can_access_case(case_id))
      OR (errand_id IS NOT NULL AND public.portal_user_can_access_errand(errand_id))
    )
  );
