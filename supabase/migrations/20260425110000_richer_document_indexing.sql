-- Richer indexing fields extracted by index-document Edge Function.
-- All optional and JSONB so the extractor can evolve without further migrations.
--
-- ai_statutes      = [{name, number, year, article}, ...]
-- ai_case_numbers  = ["case# 1234/2024", "filed under no 555/B/2023", ...]
-- ai_amounts       = [{value, currency}, ...]
-- ai_parties       = [{name, role}, ...]   (role: plaintiff, defendant, buyer, …)

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS ai_statutes      jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_case_numbers  text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS ai_amounts       jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_parties       jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.documents.ai_statutes      IS 'Statutory references extracted from document content. Array of {name, number, year, article}.';
COMMENT ON COLUMN public.documents.ai_case_numbers  IS 'Case / file / registration / contract numbers identified in the document.';
COMMENT ON COLUMN public.documents.ai_amounts       IS 'Monetary amounts found in the document. Array of {value, currency}.';
COMMENT ON COLUMN public.documents.ai_parties       IS 'Named parties with their procedural roles. Array of {name, role}.';

-- GIN index on case_numbers for fast `contains` filtering during search.
CREATE INDEX IF NOT EXISTS idx_documents_ai_case_numbers
  ON public.documents USING GIN (ai_case_numbers);
