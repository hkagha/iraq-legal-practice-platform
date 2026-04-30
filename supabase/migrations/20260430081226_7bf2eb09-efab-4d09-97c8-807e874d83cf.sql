CREATE OR REPLACE FUNCTION public.portal_user_can_access_entity(_entity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.portal_user_links pul
    JOIN public.portal_users pu ON pu.id = pul.portal_user_id
    JOIN public.entity_representatives er ON er.person_id = pul.person_id
    WHERE pu.auth_user_id = auth.uid()
      AND pul.is_active = true
      AND er.entity_id = _entity_id
      AND (er.end_date IS NULL OR er.end_date >= CURRENT_DATE)
  );
$$;

CREATE OR REPLACE FUNCTION public.portal_user_can_access_case(_case_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.case_parties cp
    WHERE cp.case_id = _case_id
      AND cp.role = 'client'
      AND (
        (cp.party_type = 'person' AND public.portal_user_can_access_person(cp.person_id))
        OR
        (cp.party_type = 'entity' AND public.portal_user_can_access_entity(cp.entity_id))
      )
  );
$$;

DROP POLICY IF EXISTS "portal user reads own cases" ON public.cases;
CREATE POLICY "portal user reads own cases" ON public.cases
  FOR SELECT TO authenticated
  USING (public.portal_user_can_access_case(id));

DROP POLICY IF EXISTS "portal user reads own errands" ON public.errands;
CREATE POLICY "portal user reads own errands" ON public.errands
  FOR SELECT TO authenticated
  USING (
    (party_type = 'person' AND public.portal_user_can_access_person(person_id))
    OR (party_type = 'entity' AND public.portal_user_can_access_entity(entity_id))
  );