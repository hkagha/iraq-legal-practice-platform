-- =========================================
-- document_comments: allow portal users (clients)
-- =========================================

-- 1) SELECT: clients can read comments on documents shared with them
CREATE POLICY "portal user reads doc_comments on shared docs"
  ON public.document_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_comments.document_id
        AND d.is_visible_to_client = true
        AND d.status = 'active'
        AND (
          (d.party_type = 'person' AND public.portal_user_can_access_person(d.person_id))
          OR (d.party_type = 'entity' AND public.portal_user_can_access_entity(d.entity_id))
          OR (d.case_id IS NOT NULL AND public.portal_user_can_access_case(d.case_id))
        )
    )
  );

-- 2) INSERT: clients can post comments on documents shared with them
CREATE POLICY "portal user inserts doc_comments on shared docs"
  ON public.document_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_type = 'client'
    AND author_id = auth.uid()
    AND is_visible_to_client = true
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_comments.document_id
        AND d.organization_id = document_comments.organization_id
        AND d.is_visible_to_client = true
        AND d.status = 'active'
        AND (
          (d.party_type = 'person' AND public.portal_user_can_access_person(d.person_id))
          OR (d.party_type = 'entity' AND public.portal_user_can_access_entity(d.entity_id))
          OR (d.case_id IS NOT NULL AND public.portal_user_can_access_case(d.case_id))
        )
    )
  );

-- 3) UPDATE/DELETE: clients can manage only their own comments
CREATE POLICY "portal user updates own doc_comments"
  ON public.document_comments
  FOR UPDATE
  TO authenticated
  USING (author_type = 'client' AND author_id = auth.uid())
  WITH CHECK (author_type = 'client' AND author_id = auth.uid());

CREATE POLICY "portal user deletes own doc_comments"
  ON public.document_comments
  FOR DELETE
  TO authenticated
  USING (author_type = 'client' AND author_id = auth.uid());

-- =========================================
-- documents: allow portal users to upload reply files
-- =========================================

-- Clients can upload a document attached to a case they belong to.
-- Server enforces: must be visible to client, status='active', authored by them.
CREATE POLICY "portal user uploads reply documents to their case"
  ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND is_visible_to_client = true
    AND status = 'active'
    AND case_id IS NOT NULL
    AND public.portal_user_can_access_case(case_id)
  );