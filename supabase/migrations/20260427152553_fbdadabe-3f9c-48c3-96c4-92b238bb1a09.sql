CREATE POLICY "portal user reads document activities on shared docs"
ON public.document_activities
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.id = document_activities.document_id
      AND d.organization_id = document_activities.organization_id
      AND d.is_visible_to_client = true
      AND d.status = 'active'
      AND (
        (d.party_type = 'person' AND public.portal_user_can_access_person(d.person_id))
        OR (d.party_type = 'entity' AND public.portal_user_can_access_entity(d.entity_id))
        OR (d.case_id IS NOT NULL AND public.portal_user_can_access_case(d.case_id))
      )
  )
);

CREATE POLICY "portal user records document activities on shared docs"
ON public.document_activities
FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.id = document_activities.document_id
      AND d.organization_id = document_activities.organization_id
      AND d.is_visible_to_client = true
      AND d.status = 'active'
      AND (
        (d.party_type = 'person' AND public.portal_user_can_access_person(d.person_id))
        OR (d.party_type = 'entity' AND public.portal_user_can_access_entity(d.entity_id))
        OR (d.case_id IS NOT NULL AND public.portal_user_can_access_case(d.case_id))
      )
  )
);