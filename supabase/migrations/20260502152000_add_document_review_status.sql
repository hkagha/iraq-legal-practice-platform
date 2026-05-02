ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_review_status_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_review_status_check
  CHECK (review_status IN ('pending_review', 'approved', 'needs_changes'));

CREATE INDEX IF NOT EXISTS idx_documents_review_status
  ON public.documents(organization_id, review_status, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_document_review_status_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uploader_role text;
BEGIN
  SELECT role INTO v_uploader_role
  FROM public.profiles
  WHERE id = NEW.uploaded_by;

  IF v_uploader_role = 'client' THEN
    NEW.review_status := 'pending_review';
    NEW.reviewed_at := NULL;
    NEW.reviewed_by := NULL;
  ELSE
    NEW.review_status := COALESCE(NULLIF(NEW.review_status, ''), 'approved');
    IF NEW.review_status = 'approved' THEN
      NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
      NEW.reviewed_by := COALESCE(NEW.reviewed_by, NEW.uploaded_by);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_document_review_status_on_insert ON public.documents;
CREATE TRIGGER trg_set_document_review_status_on_insert
  BEFORE INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_document_review_status_on_insert();

CREATE OR REPLACE FUNCTION public.track_document_review_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.review_status IS DISTINCT FROM OLD.review_status THEN
    IF NEW.review_status = 'approved' THEN
      NEW.reviewed_at := now();
      NEW.reviewed_by := COALESCE(auth.uid(), NEW.reviewed_by);
    ELSE
      NEW.reviewed_at := NULL;
      NEW.reviewed_by := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_document_review_status ON public.documents;
CREATE TRIGGER trg_track_document_review_status
  BEFORE UPDATE OF review_status
  ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.track_document_review_status();

CREATE OR REPLACE FUNCTION public.log_document_review_status_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.review_status IS DISTINCT FROM OLD.review_status THEN
    INSERT INTO public.document_activities (
      organization_id, document_id, actor_id, activity_type, title, title_ar, metadata
    )
    VALUES (
      NEW.organization_id,
      NEW.id,
      COALESCE(auth.uid(), NEW.reviewed_by),
      'review_status_changed',
      'Document review status changed to ' || NEW.review_status,
      'تم تغيير حالة مراجعة المستند إلى ' || NEW.review_status,
      jsonb_build_object('from', OLD.review_status, 'to', NEW.review_status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_document_review_status_activity ON public.documents;
CREATE TRIGGER trg_log_document_review_status_activity
  AFTER UPDATE OF review_status
  ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.log_document_review_status_activity();
