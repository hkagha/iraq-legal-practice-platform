
-- 1) Allow clients to see documents linked via their cases/errands (when document.client_id is null)
CREATE POLICY "client_view_docs_via_case_or_errand" ON public.documents
FOR SELECT TO authenticated
USING (
  is_visible_to_client = true
  AND (
    EXISTS (
      SELECT 1
      FROM public.client_user_links cul
      WHERE cul.user_id = auth.uid()
        AND cul.client_id = documents.client_id
    )
    OR (
      documents.case_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.cases c
        JOIN public.client_user_links cul ON cul.client_id = c.client_id
        WHERE cul.user_id = auth.uid()
          AND c.id = documents.case_id
          AND c.is_visible_to_client = true
      )
    )
    OR (
      documents.errand_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.errands e
        JOIN public.client_user_links cul ON cul.client_id = e.client_id
        WHERE cul.user_id = auth.uid()
          AND e.id = documents.errand_id
          AND e.is_visible_to_client = true
      )
    )
  )
);

-- 2) Allow clients to log document downloads (document_activities)
CREATE POLICY "client_insert_doc_activities" ON public.document_activities
FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND organization_id = public.get_user_org_id(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.id = document_activities.document_id
      AND d.is_visible_to_client = true
      AND d.status = 'active'
      AND (
        EXISTS (
          SELECT 1 FROM public.client_user_links cul
          WHERE cul.user_id = auth.uid()
            AND cul.client_id = COALESCE(
              d.client_id,
              (SELECT c.client_id FROM public.cases c WHERE c.id = d.case_id),
              (SELECT e.client_id FROM public.errands e WHERE e.id = d.errand_id)
            )
        )
      )
  )
);

-- 3) Allow clients to update their own client record (for phone/whatsapp/address)
CREATE POLICY "client_update_own_client" ON public.clients
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_user_links cul
    WHERE cul.user_id = auth.uid()
      AND cul.client_id = clients.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_user_links cul
    WHERE cul.user_id = auth.uid()
      AND cul.client_id = clients.id
  )
);

-- 4) Allow clients to mark messages as read (messages sent by staff)
CREATE POLICY "client_mark_staff_messages_read" ON public.client_messages
FOR UPDATE TO authenticated
USING (
  sender_type = 'staff'
  AND EXISTS (
    SELECT 1 FROM public.client_user_links cul
    WHERE cul.user_id = auth.uid()
      AND cul.client_id = client_messages.client_id
  )
)
WITH CHECK (
  sender_type = 'staff'
  AND EXISTS (
    SELECT 1 FROM public.client_user_links cul
    WHERE cul.user_id = auth.uid()
      AND cul.client_id = client_messages.client_id
  )
);

-- 5) Storage: allow clients to read their own portal-message attachments
CREATE POLICY "client_read_portal_message_attachments" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (public.get_user_org_id(auth.uid()))::text
  AND (storage.foldername(name))[2] = 'portal-messages'
  AND (storage.foldername(name))[3] IN (
    SELECT cul.client_id::text
    FROM public.client_user_links cul
    WHERE cul.user_id = auth.uid()
  )
);
