-- Storage policy: client uploads must be in {orgId}/clients/...
DROP POLICY IF EXISTS client_upload_document_versions ON storage.objects;
CREATE POLICY client_upload_document_versions ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[2] = 'clients'
);

-- Allow clients to insert net-new root case_specific documents
DROP POLICY IF EXISTS client_insert_root_document ON public.documents;
CREATE POLICY client_insert_root_document ON public.documents
FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND parent_document_id IS NULL
  AND visibility_scope = 'case_specific'
  AND is_visible_to_client = true
  AND (
    (case_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.cases c
      JOIN public.client_user_links cul ON cul.client_id = c.client_id
      WHERE c.id = documents.case_id
        AND cul.user_id = auth.uid()
        AND c.is_visible_to_client = true
        AND c.organization_id = documents.organization_id
    ))
    OR (errand_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.errands e
      JOIN public.client_user_links cul ON cul.client_id = e.client_id
      WHERE e.id = documents.errand_id
        AND cul.user_id = auth.uid()
        AND e.is_visible_to_client = true
        AND e.organization_id = documents.organization_id
    ))
    OR (case_id IS NULL AND errand_id IS NULL AND client_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.client_user_links cul
      WHERE cul.user_id = auth.uid()
        AND cul.client_id = documents.client_id
        AND cul.organization_id = documents.organization_id
    ))
  )
);

-- Notify staff when a client uploads a document
CREATE OR REPLACE FUNCTION public.notify_staff_on_client_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_client_upload boolean;
  team_user_id uuid;
  doc_title text;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.client_user_links WHERE user_id = NEW.uploaded_by)
    INTO is_client_upload;

  IF NOT is_client_upload THEN
    RETURN NEW;
  END IF;

  doc_title := COALESCE(NEW.title, NEW.file_name);

  IF NEW.case_id IS NOT NULL THEN
    FOR team_user_id IN
      SELECT user_id FROM public.case_team_members WHERE case_id = NEW.case_id
    LOOP
      PERFORM public.create_notification(
        NEW.organization_id, team_user_id,
        'client_document',
        'Client uploaded a document', 'قام العميل برفع مستند',
        doc_title, doc_title,
        'normal', 'document', NEW.id, NEW.uploaded_by
      );
    END LOOP;
  END IF;

  FOR team_user_id IN
    SELECT id FROM public.profiles
    WHERE organization_id = NEW.organization_id AND role = 'firm_admin'
  LOOP
    PERFORM public.create_notification(
      NEW.organization_id, team_user_id,
      'client_document',
      'Client uploaded a document', 'قام العميل برفع مستند',
      doc_title, doc_title,
      'normal', 'document', NEW.id, NEW.uploaded_by
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_staff_on_client_document ON public.documents;
CREATE TRIGGER trg_notify_staff_on_client_document
AFTER INSERT ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.notify_staff_on_client_document();

-- Notify staff when a client comments on a document
CREATE OR REPLACE FUNCTION public.notify_staff_on_client_doc_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  team_user_id uuid;
  doc_case_id uuid;
  doc_title text;
  preview text;
BEGIN
  IF NEW.author_type <> 'client' THEN
    RETURN NEW;
  END IF;

  SELECT case_id, COALESCE(title, file_name)
    INTO doc_case_id, doc_title
  FROM public.documents WHERE id = NEW.document_id;

  preview := left(NEW.content, 160);

  IF doc_case_id IS NOT NULL THEN
    FOR team_user_id IN
      SELECT user_id FROM public.case_team_members WHERE case_id = doc_case_id
    LOOP
      PERFORM public.create_notification(
        NEW.organization_id, team_user_id,
        'client_doc_comment',
        'Client commented on a document', 'علّق العميل على مستند',
        preview, preview,
        'normal', 'document', NEW.document_id, NEW.author_id
      );
    END LOOP;
  END IF;

  FOR team_user_id IN
    SELECT id FROM public.profiles
    WHERE organization_id = NEW.organization_id AND role = 'firm_admin'
  LOOP
    PERFORM public.create_notification(
      NEW.organization_id, team_user_id,
      'client_doc_comment',
      'Client commented on a document', 'علّق العميل على مستند',
      preview, preview,
      'normal', 'document', NEW.document_id, NEW.author_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_staff_on_client_doc_comment ON public.document_comments;
CREATE TRIGGER trg_notify_staff_on_client_doc_comment
AFTER INSERT ON public.document_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_staff_on_client_doc_comment();