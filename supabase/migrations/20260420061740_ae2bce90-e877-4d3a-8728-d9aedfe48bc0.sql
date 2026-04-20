-- AI-extracted metadata columns
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_doc_type text,
  ADD COLUMN IF NOT EXISTS ai_people text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS ai_organizations text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS ai_places text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS ai_dates jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS ai_language text,
  ADD COLUMN IF NOT EXISTS extracted_text text,
  ADD COLUMN IF NOT EXISTS indexing_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS indexed_at timestamptz,
  ADD COLUMN IF NOT EXISTS indexing_error text,
  ADD COLUMN IF NOT EXISTS indexing_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS search_tsv tsvector;

-- Validate indexing_status
CREATE OR REPLACE FUNCTION public.validate_document_indexing_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.indexing_status NOT IN ('pending','processing','done','failed','skipped') THEN
    RAISE EXCEPTION 'Invalid indexing_status: %', NEW.indexing_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_document_indexing_status ON public.documents;
CREATE TRIGGER trg_validate_document_indexing_status
  BEFORE INSERT OR UPDATE OF indexing_status ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.validate_document_indexing_status();

-- Maintain search_tsv via trigger
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
    setweight(to_tsvector('simple', coalesce(NEW.extracted_text,'')), 'D');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_documents_search_tsv ON public.documents;
CREATE TRIGGER trg_documents_search_tsv
  BEFORE INSERT OR UPDATE OF file_name, file_name_ar, title, title_ar, ai_doc_type, ai_summary, ai_people, ai_organizations, ai_places, ai_tags, tags, extracted_text
  ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.documents_update_search_tsv();

-- Backfill existing rows
UPDATE public.documents SET file_name = file_name WHERE search_tsv IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_search_tsv ON public.documents USING GIN (search_tsv);
CREATE INDEX IF NOT EXISTS idx_documents_ai_people ON public.documents USING GIN (ai_people);
CREATE INDEX IF NOT EXISTS idx_documents_ai_orgs ON public.documents USING GIN (ai_organizations);
CREATE INDEX IF NOT EXISTS idx_documents_ai_places ON public.documents USING GIN (ai_places);
CREATE INDEX IF NOT EXISTS idx_documents_ai_tags ON public.documents USING GIN (ai_tags);
CREATE INDEX IF NOT EXISTS idx_documents_indexing_status ON public.documents (organization_id, indexing_status);