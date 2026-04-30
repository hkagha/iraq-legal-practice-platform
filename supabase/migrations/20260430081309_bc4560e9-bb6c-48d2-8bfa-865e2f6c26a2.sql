CREATE OR REPLACE FUNCTION public.preserve_document_on_delete_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Documents cannot be permanently deleted; archive them instead';
  END IF;

  IF NEW.status = 'deleted' THEN
    NEW.status := 'archived';
    NEW.case_id := NULL;
    NEW.errand_id := NULL;
    NEW.is_visible_to_client := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_preserve_document_update ON public.documents;
CREATE TRIGGER trg_preserve_document_update
BEFORE UPDATE OF status
ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.preserve_document_on_delete_request();

DROP TRIGGER IF EXISTS trg_preserve_document_delete ON public.documents;
CREATE TRIGGER trg_preserve_document_delete
BEFORE DELETE
ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.preserve_document_on_delete_request();

DROP POLICY IF EXISTS "staff_delete_documents" ON storage.objects;
DROP POLICY IF EXISTS "org_users_delete_documents" ON storage.objects;