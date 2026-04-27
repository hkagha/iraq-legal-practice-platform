DROP POLICY IF EXISTS "client_upload_document_versions" ON storage.objects;
DROP POLICY IF EXISTS "portal clients upload documents to shared cases" ON storage.objects;

CREATE POLICY "portal clients upload documents to shared cases"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[2] = 'portal-uploads'
  AND (storage.foldername(name))[3] IS NOT NULL
  AND public.portal_user_can_access_case(((storage.foldername(name))[3])::uuid)
  AND EXISTS (
    SELECT 1
    FROM public.cases c
    WHERE c.id = ((storage.foldername(name))[3])::uuid
      AND c.organization_id::text = (storage.foldername(name))[1]
  )
);