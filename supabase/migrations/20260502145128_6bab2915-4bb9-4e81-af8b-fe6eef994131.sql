ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS corrected_text text,
  ADD COLUMN IF NOT EXISTS corrected_text_version integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS corrected_text_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS corrected_text_updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_corrected_text_updated
  ON public.documents(organization_id, corrected_text_updated_at DESC)
  WHERE corrected_text_updated_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.documents_update_search_tsv()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('simple', coalesce(NEW.file_name,'') || ' ' || coalesce(NEW.file_name_ar,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.title,'') || ' ' || coalesce(NEW.title_ar,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.ai_doc_type,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.ai_summary,'')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(NEW.ai_people,'{}'::text[]), ' ')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(NEW.ai_organizations,'{}'::text[]), ' ')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(NEW.ai_places,'{}'::text[]), ' ')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(NEW.ai_tags,'{}'::text[]), ' ')), 'C') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(NEW.tags,'{}'::text[]), ' ')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NULLIF(NEW.corrected_text, ''), NEW.extracted_text, '')), 'D');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_documents_search_tsv ON public.documents;
CREATE TRIGGER trg_documents_search_tsv
  BEFORE INSERT OR UPDATE OF file_name, file_name_ar, title, title_ar, ai_doc_type, ai_summary, ai_people, ai_organizations, ai_places, ai_tags, tags, extracted_text, corrected_text
  ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.documents_update_search_tsv();

CREATE OR REPLACE FUNCTION public.track_document_corrected_text()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.corrected_text IS DISTINCT FROM OLD.corrected_text THEN
    NEW.corrected_text_version := COALESCE(OLD.corrected_text_version, 0) + 1;
    NEW.corrected_text_updated_at := now();
    NEW.corrected_text_updated_by := COALESCE(auth.uid(), NEW.corrected_text_updated_by, OLD.corrected_text_updated_by);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_document_corrected_text ON public.documents;
CREATE TRIGGER trg_track_document_corrected_text
  BEFORE UPDATE OF corrected_text
  ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.track_document_corrected_text();

CREATE OR REPLACE FUNCTION public.log_document_corrected_text_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.corrected_text IS DISTINCT FROM OLD.corrected_text THEN
    INSERT INTO public.document_activities (
      organization_id, document_id, actor_id, activity_type, title, title_ar
    )
    VALUES (
      NEW.organization_id,
      NEW.id,
      NEW.corrected_text_updated_by,
      'ocr_text_corrected',
      'Corrected OCR text v' || NEW.corrected_text_version,
      'تم تصحيح نص OCR الإصدار ' || NEW.corrected_text_version
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_document_corrected_text_activity ON public.documents;
CREATE TRIGGER trg_log_document_corrected_text_activity
  AFTER UPDATE OF corrected_text
  ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.log_document_corrected_text_activity();

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