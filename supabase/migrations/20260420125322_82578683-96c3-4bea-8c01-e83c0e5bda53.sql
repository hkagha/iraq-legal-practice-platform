-- Batch 0: Schema cleanup — drop orphan client_id columns and add party fields.

-- 1. Drop legacy client_id columns (the clients table no longer exists).
--    Drop dependent functions/triggers first so we can rewrite them cleanly.

DROP FUNCTION IF EXISTS public.client_can_access_document_object(text) CASCADE;
DROP FUNCTION IF EXISTS public.client_can_see_profile(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.notify_staff_on_client_message() CASCADE;
DROP FUNCTION IF EXISTS public.notify_staff_on_client_document() CASCADE;
DROP FUNCTION IF EXISTS public.notify_on_invoice_viewed() CASCADE;
DROP FUNCTION IF EXISTS public.client_mark_invoice_viewed(uuid) CASCADE;

-- Drop legacy client_id columns wherever they still linger
ALTER TABLE public.documents       DROP COLUMN IF EXISTS client_id CASCADE;
ALTER TABLE public.invoices        DROP COLUMN IF EXISTS client_id CASCADE;
ALTER TABLE public.client_messages DROP COLUMN IF EXISTS client_id CASCADE;
ALTER TABLE public.tasks           DROP COLUMN IF EXISTS client_id CASCADE;
ALTER TABLE public.time_entries    DROP COLUMN IF EXISTS client_id CASCADE;
-- cases.client_id was already removed but keep the guard
ALTER TABLE public.cases           DROP COLUMN IF EXISTS client_id CASCADE;
-- errands.client_id (errands now have person_id/entity_id/party_type)
ALTER TABLE public.errands         DROP COLUMN IF EXISTS client_id CASCADE;

-- 2. Add party fields (party_type/person_id/entity_id) to tasks and time_entries
--    so they mirror documents / invoices / errands / client_messages.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS party_type text,
  ADD COLUMN IF NOT EXISTS person_id  uuid REFERENCES public.persons(id)  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entity_id  uuid REFERENCES public.entities(id) ON DELETE SET NULL;

ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS party_type text,
  ADD COLUMN IF NOT EXISTS person_id  uuid REFERENCES public.persons(id)  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entity_id  uuid REFERENCES public.entities(id) ON DELETE SET NULL;

-- Validation: party_type must be null OR ('person' with person_id) OR ('entity' with entity_id)
CREATE OR REPLACE FUNCTION public.validate_party_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.party_type IS NULL THEN
    IF NEW.person_id IS NOT NULL OR NEW.entity_id IS NOT NULL THEN
      RAISE EXCEPTION 'party_type required when person_id or entity_id is set';
    END IF;
  ELSIF NEW.party_type = 'person' THEN
    IF NEW.person_id IS NULL OR NEW.entity_id IS NOT NULL THEN
      RAISE EXCEPTION 'party_type=person requires person_id and forbids entity_id';
    END IF;
  ELSIF NEW.party_type = 'entity' THEN
    IF NEW.entity_id IS NULL OR NEW.person_id IS NOT NULL THEN
      RAISE EXCEPTION 'party_type=entity requires entity_id and forbids person_id';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid party_type: %', NEW.party_type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_tasks_party        ON public.tasks;
DROP TRIGGER IF EXISTS validate_time_entries_party ON public.time_entries;
CREATE TRIGGER validate_tasks_party
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.validate_party_columns();
CREATE TRIGGER validate_time_entries_party
  BEFORE INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.validate_party_columns();

CREATE INDEX IF NOT EXISTS idx_tasks_person_id        ON public.tasks(person_id);
CREATE INDEX IF NOT EXISTS idx_tasks_entity_id        ON public.tasks(entity_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_person_id ON public.time_entries(person_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_entity_id ON public.time_entries(entity_id);

-- 3. Rewrite client_can_access_document_object to walk case_id -> case_parties -> portal_user_links.
--    Storage RLS uses this; without it, portal users cannot download files.

CREATE OR REPLACE FUNCTION public.client_can_access_document_object(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.file_path = object_name
      AND d.status = 'active'
      AND d.is_visible_to_client = true
      AND (
        (d.party_type = 'person' AND public.portal_user_can_access_person(d.person_id))
        OR
        (d.party_type = 'entity' AND public.portal_user_can_access_entity(d.entity_id))
        OR
        (d.case_id IS NOT NULL AND public.portal_user_can_access_case(d.case_id))
      )
  );
$$;

-- 4. Rewrite notify_staff_on_client_message — old version referenced NEW.client_id.

CREATE OR REPLACE FUNCTION public.notify_staff_on_client_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_id uuid;
  msg_preview text;
  party_entity_type text;
  party_entity_id uuid;
BEGIN
  IF NEW.sender_type <> 'client' THEN
    RETURN NEW;
  END IF;

  msg_preview := left(NEW.content, 160);

  IF NEW.party_type = 'entity' THEN
    party_entity_type := 'entity';
    party_entity_id   := NEW.entity_id;
  ELSE
    party_entity_type := 'person';
    party_entity_id   := NEW.person_id;
  END IF;

  FOR admin_id IN
    SELECT id FROM public.profiles
    WHERE organization_id = NEW.organization_id
      AND role = 'firm_admin'
  LOOP
    PERFORM public.create_notification(
      NEW.organization_id, admin_id,
      'client_message',
      'New message from client', 'رسالة جديدة من العميل',
      msg_preview, msg_preview,
      'normal', party_entity_type, party_entity_id, NEW.sender_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_staff_on_client_message_trg ON public.client_messages;
CREATE TRIGGER notify_staff_on_client_message_trg
  AFTER INSERT ON public.client_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_staff_on_client_message();

-- 5. Rewrite notify_staff_on_client_document — old version checked client_user_links (table no longer in use here).
--    New logic: notify if uploader is a portal_user (has a portal_users row), and the doc is attached to a case.

CREATE OR REPLACE FUNCTION public.notify_staff_on_client_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_client_upload boolean;
  team_user_id uuid;
  doc_title text;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.portal_users WHERE auth_user_id = NEW.uploaded_by)
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

DROP TRIGGER IF EXISTS notify_staff_on_client_document_trg ON public.documents;
CREATE TRIGGER notify_staff_on_client_document_trg
  AFTER INSERT ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.notify_staff_on_client_document();

-- 6. Rewrite invoice "viewed" trigger and portal mark-viewed RPC against the new model.

CREATE OR REPLACE FUNCTION public.notify_on_invoice_viewed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.viewed_at IS NULL AND NEW.viewed_at IS NOT NULL AND NEW.created_by IS NOT NULL THEN
    PERFORM public.create_notification(
      NEW.organization_id, NEW.created_by,
      'invoice_viewed',
      'Client viewed an invoice', 'قام العميل بمشاهدة فاتورة',
      NEW.invoice_number, NEW.invoice_number,
      'normal', 'invoice', NEW.id, NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_invoice_viewed_trg ON public.invoices;
CREATE TRIGGER notify_on_invoice_viewed_trg
  AFTER UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_invoice_viewed();

CREATE OR REPLACE FUNCTION public.client_mark_invoice_viewed(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inv record;
  has_access boolean;
BEGIN
  SELECT id, party_type, person_id, entity_id, status
    INTO inv
  FROM public.invoices WHERE id = p_invoice_id;

  IF inv.id IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  IF inv.party_type = 'person' THEN
    has_access := public.portal_user_can_access_person(inv.person_id);
  ELSIF inv.party_type = 'entity' THEN
    has_access := public.portal_user_can_access_entity(inv.entity_id);
  ELSE
    has_access := false;
  END IF;

  IF NOT has_access THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.invoices
    SET viewed_at = COALESCE(viewed_at, now()),
        status    = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END
  WHERE id = p_invoice_id;
END;
$$;