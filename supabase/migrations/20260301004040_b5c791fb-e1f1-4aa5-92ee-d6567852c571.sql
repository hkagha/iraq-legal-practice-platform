
-- Helper: can the current authenticated client access a given document object path?
CREATE OR REPLACE FUNCTION public.client_can_access_document_object(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.file_path = object_name
      AND d.status = 'active'
      AND d.is_visible_to_client = true
      AND d.organization_id = public.get_user_org_id(auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.client_user_links cul
        WHERE cul.user_id = auth.uid()
          AND cul.client_id = COALESCE(
            d.client_id,
            (SELECT c.client_id FROM public.cases c WHERE c.id = d.case_id),
            (SELECT e.client_id FROM public.errands e WHERE e.id = d.errand_id)
          )
      )
  );
$$;

-- Tighten storage policies for documents bucket
DO $$
BEGIN
  -- Drop old policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='org_users_read_documents') THEN
    EXECUTE 'DROP POLICY "org_users_read_documents" ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='org_users_upload_documents') THEN
    EXECUTE 'DROP POLICY "org_users_upload_documents" ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='org_users_delete_documents') THEN
    EXECUTE 'DROP POLICY "org_users_delete_documents" ON storage.objects';
  END IF;
END $$;

-- Staff: read any org document
CREATE POLICY "staff_read_documents" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (public.get_user_org_id(auth.uid()))::text
  AND public.get_user_role(auth.uid()) <> 'client'
);

-- Client: read only visible documents linked to them
CREATE POLICY "client_read_visible_documents" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND public.client_can_access_document_object(name)
);

-- Staff: upload org documents
CREATE POLICY "staff_upload_documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (public.get_user_org_id(auth.uid()))::text
  AND public.get_user_role(auth.uid()) <> 'client'
);

-- Client: upload ONLY portal message attachments under org/portal-messages/{client_id}/...
CREATE POLICY "client_upload_portal_message_attachments" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (public.get_user_org_id(auth.uid()))::text
  AND (storage.foldername(name))[2] = 'portal-messages'
  AND (storage.foldername(name))[3] IN (
    SELECT cul.client_id::text
    FROM public.client_user_links cul
    WHERE cul.user_id = auth.uid()
  )
);

-- Staff: delete org documents
CREATE POLICY "staff_delete_documents" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (public.get_user_org_id(auth.uid()))::text
  AND public.get_user_role(auth.uid()) = ANY (ARRAY['firm_admin','lawyer','paralegal'])
);

-- Secure invoice viewed update via RPC, remove broad client UPDATE policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='invoices' AND policyname='client_update_invoice_viewed') THEN
    EXECUTE 'DROP POLICY "client_update_invoice_viewed" ON public.invoices';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.client_mark_invoice_viewed(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify access
  IF NOT EXISTS (
    SELECT 1
    FROM public.invoices i
    JOIN public.client_user_links cul ON cul.client_id = i.client_id
    WHERE i.id = p_invoice_id
      AND cul.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.invoices
  SET viewed_at = COALESCE(viewed_at, now()),
      status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END
  WHERE id = p_invoice_id;
END;
$$;

-- Notify firm when client sends a message
CREATE OR REPLACE FUNCTION public.notify_staff_on_client_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
  msg_preview text;
BEGIN
  IF NEW.sender_type <> 'client' THEN
    RETURN NEW;
  END IF;

  msg_preview := left(NEW.content, 160);

  -- Notify firm admins in the org
  FOR admin_id IN
    SELECT id FROM public.profiles
    WHERE organization_id = NEW.organization_id
      AND role = 'firm_admin'
  LOOP
    PERFORM public.create_notification(
      NEW.organization_id,
      admin_id,
      'client_message',
      'New message from client',
      'رسالة جديدة من العميل',
      msg_preview,
      msg_preview,
      'normal',
      'client',
      NEW.client_id,
      NEW.sender_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_staff_on_client_message ON public.client_messages;
CREATE TRIGGER trg_notify_staff_on_client_message
AFTER INSERT ON public.client_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_staff_on_client_message();

-- Notify invoice creator when invoice is viewed
CREATE OR REPLACE FUNCTION public.notify_on_invoice_viewed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.viewed_at IS NULL AND NEW.viewed_at IS NOT NULL THEN
    PERFORM public.create_notification(
      NEW.organization_id,
      NEW.created_by,
      'invoice_viewed',
      'Client viewed an invoice',
      'قام العميل بمشاهدة فاتورة',
      NEW.invoice_number,
      NEW.invoice_number,
      'normal',
      'invoice',
      NEW.id,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_invoice_viewed ON public.invoices;
CREATE TRIGGER trg_notify_on_invoice_viewed
AFTER UPDATE OF viewed_at ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.notify_on_invoice_viewed();
