
-- ============================================================
-- 1. document_comments table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.document_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_type text NOT NULL DEFAULT 'staff',
  content text NOT NULL,
  content_ar text,
  is_visible_to_client boolean NOT NULL DEFAULT true,
  parent_comment_id uuid REFERENCES public.document_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_comments_document ON public.document_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_comments_org ON public.document_comments(organization_id);

-- Validate author_type via trigger (avoid CHECK constraint per house rules)
CREATE OR REPLACE FUNCTION public.validate_document_comment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.author_type NOT IN ('staff', 'client') THEN
    RAISE EXCEPTION 'Invalid author_type: %', NEW.author_type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_document_comment_trg ON public.document_comments;
CREATE TRIGGER validate_document_comment_trg
  BEFORE INSERT OR UPDATE ON public.document_comments
  FOR EACH ROW EXECUTE FUNCTION public.validate_document_comment();

DROP TRIGGER IF EXISTS update_doc_comments_updated_at ON public.document_comments;
CREATE TRIGGER update_doc_comments_updated_at
  BEFORE UPDATE ON public.document_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Documents: visibility_scope + library_tags
-- ============================================================
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS visibility_scope text NOT NULL DEFAULT 'case_specific',
  ADD COLUMN IF NOT EXISTS library_tags text[] DEFAULT '{}';

-- Validate visibility_scope via trigger
CREATE OR REPLACE FUNCTION public.validate_document_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.visibility_scope NOT IN ('internal', 'shared_library', 'case_specific') THEN
    RAISE EXCEPTION 'Invalid visibility_scope: %', NEW.visibility_scope;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_document_scope_trg ON public.documents;
CREATE TRIGGER validate_document_scope_trg
  BEFORE INSERT OR UPDATE OF visibility_scope ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.validate_document_scope();

-- Backfill existing documents
UPDATE public.documents
SET visibility_scope = CASE
  WHEN document_category = 'template' THEN 'shared_library'
  WHEN case_id IS NOT NULL OR errand_id IS NOT NULL OR client_id IS NOT NULL THEN 'case_specific'
  ELSE 'internal'
END;

-- ============================================================
-- 3. Helper: user_can_access_case
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_can_access_case(_user_id uuid, _case_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id
      AND p.role = 'firm_admin'
      AND p.organization_id = (SELECT organization_id FROM public.cases WHERE id = _case_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.case_team_members ctm
    WHERE ctm.case_id = _case_id AND ctm.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_errand(_user_id uuid, _errand_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id
      AND p.role IN ('firm_admin', 'lawyer', 'paralegal')
      AND p.organization_id = (SELECT organization_id FROM public.errands WHERE id = _errand_id)
  );
$$;

-- ============================================================
-- 4. Replace documents SELECT policies with tiered ones
-- ============================================================
DROP POLICY IF EXISTS users_read_org_documents ON public.documents;
DROP POLICY IF EXISTS client_view_visible_documents ON public.documents;
DROP POLICY IF EXISTS client_view_docs_via_case_or_errand ON public.documents;

-- Staff: internal + shared_library always visible to any staff in org
CREATE POLICY staff_read_internal_shared_documents ON public.documents
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_org_id(auth.uid())
    AND visibility_scope IN ('internal', 'shared_library')
    AND public.get_user_role(auth.uid()) IN ('firm_admin', 'lawyer', 'paralegal', 'secretary', 'accountant')
  );

-- Staff: case_specific only if firm_admin OR on case team OR errand-org-staff
CREATE POLICY staff_read_case_documents ON public.documents
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_org_id(auth.uid())
    AND visibility_scope = 'case_specific'
    AND (
      public.get_user_role(auth.uid()) = 'firm_admin'
      OR (case_id IS NOT NULL AND public.user_can_access_case(auth.uid(), case_id))
      OR (errand_id IS NOT NULL AND public.user_can_access_errand(auth.uid(), errand_id))
      OR (case_id IS NULL AND errand_id IS NULL AND client_id IS NOT NULL AND public.get_user_role(auth.uid()) IN ('lawyer', 'paralegal'))
    )
  );

-- Client read access (case_specific only, never internal/shared_library)
CREATE POLICY client_read_visible_case_documents ON public.documents
  FOR SELECT TO authenticated
  USING (
    visibility_scope = 'case_specific'
    AND is_visible_to_client = true
    AND (
      (client_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.client_user_links cul
        WHERE cul.user_id = auth.uid() AND cul.client_id = documents.client_id
      ))
      OR (case_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.cases c
        JOIN public.client_user_links cul ON cul.client_id = c.client_id
        WHERE c.id = documents.case_id AND cul.user_id = auth.uid() AND c.is_visible_to_client = true
      ))
      OR (errand_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.errands e
        JOIN public.client_user_links cul ON cul.client_id = e.client_id
        WHERE e.id = documents.errand_id AND cul.user_id = auth.uid() AND e.is_visible_to_client = true
      ))
    )
  );

-- Client INSERT new versions
DROP POLICY IF EXISTS client_insert_document_version ON public.documents;
CREATE POLICY client_insert_document_version ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND parent_document_id IS NOT NULL
    AND visibility_scope = 'case_specific'
    AND is_visible_to_client = true
    AND EXISTS (
      SELECT 1 FROM public.documents parent
      WHERE parent.id = documents.parent_document_id
        AND parent.organization_id = documents.organization_id
        AND parent.is_visible_to_client = true
        AND parent.visibility_scope = 'case_specific'
        AND (
          (parent.client_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.client_user_links cul
            WHERE cul.user_id = auth.uid() AND cul.client_id = parent.client_id
          ))
          OR (parent.case_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.cases c
            JOIN public.client_user_links cul ON cul.client_id = c.client_id
            WHERE c.id = parent.case_id AND cul.user_id = auth.uid() AND c.is_visible_to_client = true
          ))
          OR (parent.errand_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.errands e
            JOIN public.client_user_links cul ON cul.client_id = e.client_id
            WHERE e.id = parent.errand_id AND cul.user_id = auth.uid() AND e.is_visible_to_client = true
          ))
        )
    )
  );

-- Trigger: when client uploads version, flip parent's is_latest_version
CREATE OR REPLACE FUNCTION public.handle_document_version_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_document_id IS NOT NULL AND NEW.is_latest_version = true THEN
    UPDATE public.documents
    SET is_latest_version = false
    WHERE (id = NEW.parent_document_id OR parent_document_id = NEW.parent_document_id)
      AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_document_version_insert_trg ON public.documents;
CREATE TRIGGER handle_document_version_insert_trg
  AFTER INSERT ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_document_version_insert();

-- ============================================================
-- 5. document_comments RLS
-- ============================================================
CREATE POLICY staff_manage_doc_comments ON public.document_comments
  FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_org_id(auth.uid())
    AND public.get_user_role(auth.uid()) IN ('firm_admin', 'lawyer', 'paralegal', 'secretary', 'accountant')
  )
  WITH CHECK (
    organization_id = public.get_user_org_id(auth.uid())
    AND public.get_user_role(auth.uid()) IN ('firm_admin', 'lawyer', 'paralegal', 'secretary', 'accountant')
    AND author_id = auth.uid()
    AND author_type = 'staff'
  );

CREATE POLICY client_read_doc_comments ON public.document_comments
  FOR SELECT TO authenticated
  USING (
    is_visible_to_client = true
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_comments.document_id
        AND d.is_visible_to_client = true
        AND d.visibility_scope = 'case_specific'
        AND (
          (d.client_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.client_user_links cul
            WHERE cul.user_id = auth.uid() AND cul.client_id = d.client_id
          ))
          OR (d.case_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.cases c
            JOIN public.client_user_links cul ON cul.client_id = c.client_id
            WHERE c.id = d.case_id AND cul.user_id = auth.uid()
          ))
          OR (d.errand_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.errands e
            JOIN public.client_user_links cul ON cul.client_id = e.client_id
            WHERE e.id = d.errand_id AND cul.user_id = auth.uid()
          ))
        )
    )
  );

CREATE POLICY client_insert_doc_comments ON public.document_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND author_type = 'client'
    AND is_visible_to_client = true
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_comments.document_id
        AND d.organization_id = document_comments.organization_id
        AND d.is_visible_to_client = true
        AND d.visibility_scope = 'case_specific'
        AND (
          (d.client_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.client_user_links cul
            WHERE cul.user_id = auth.uid() AND cul.client_id = d.client_id
          ))
          OR (d.case_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.cases c
            JOIN public.client_user_links cul ON cul.client_id = c.client_id
            WHERE c.id = d.case_id AND cul.user_id = auth.uid()
          ))
          OR (d.errand_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.errands e
            JOIN public.client_user_links cul ON cul.client_id = e.client_id
            WHERE e.id = d.errand_id AND cul.user_id = auth.uid()
          ))
        )
    )
  );

CREATE POLICY super_admin_all_doc_comments ON public.document_comments
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('super_admin', 'sales_admin'));

-- ============================================================
-- 6. Realtime
-- ============================================================
ALTER TABLE public.document_comments REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'document_comments';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.document_comments';
  END IF;
END $$;

-- ============================================================
-- 7. Storage policies for documents bucket - allow client uploads
-- ============================================================
DROP POLICY IF EXISTS client_upload_document_versions ON storage.objects;
CREATE POLICY client_upload_document_versions ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[2] = 'clients'
  );

DROP POLICY IF EXISTS client_read_accessible_documents ON storage.objects;
CREATE POLICY client_read_accessible_documents ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.client_can_access_document_object(name)
  );
