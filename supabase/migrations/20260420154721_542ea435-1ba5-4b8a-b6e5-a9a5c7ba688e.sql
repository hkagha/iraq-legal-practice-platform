
-- Ensure helper trigger function exists
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================
-- 1. SAVED VIEWS
-- =========================================================
CREATE TABLE public.saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  entity_type text NOT NULL,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort jsonb NOT NULL DEFAULT '{}'::jsonb,
  columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  is_shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_saved_views_user ON public.saved_views(user_id, entity_type);
CREATE INDEX idx_saved_views_org_shared ON public.saved_views(organization_id, entity_type) WHERE is_shared = true;
ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own saved_views"
ON public.saved_views FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "org members read shared saved_views"
ON public.saved_views FOR SELECT TO authenticated
USING (organization_id = get_user_org_id(auth.uid()) AND is_shared = true);

CREATE TRIGGER trg_saved_views_updated
BEFORE UPDATE ON public.saved_views
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 2. DOCUMENT BUNDLES
-- =========================================================
CREATE TABLE public.document_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  name_ar text,
  description text,
  case_id uuid,
  errand_id uuid,
  status text NOT NULL DEFAULT 'draft',
  is_visible_to_client boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.document_bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.document_bundles(id) ON DELETE CASCADE,
  document_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bundle_id, document_id)
);

CREATE INDEX idx_doc_bundles_org ON public.document_bundles(organization_id);
CREATE INDEX idx_doc_bundle_items_bundle ON public.document_bundle_items(bundle_id);

ALTER TABLE public.document_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_bundle_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members manage doc_bundles"
ON public.document_bundles FOR ALL TO authenticated
USING (organization_id = get_user_org_id(auth.uid()))
WITH CHECK (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "org members manage doc_bundle_items"
ON public.document_bundle_items FOR ALL TO authenticated
USING (organization_id = get_user_org_id(auth.uid()))
WITH CHECK (organization_id = get_user_org_id(auth.uid()));

CREATE TRIGGER trg_doc_bundles_updated
BEFORE UPDATE ON public.document_bundles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 3. CONFLICT CHECKS
-- =========================================================
CREATE TABLE public.conflict_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  query_name text NOT NULL,
  query_name_ar text,
  query_type text NOT NULL DEFAULT 'person',
  query_phone text,
  query_email text,
  query_tax_id text,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  match_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  notes text,
  checked_by uuid NOT NULL,
  case_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_conflict_checks_org ON public.conflict_checks(organization_id, created_at DESC);
ALTER TABLE public.conflict_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members manage conflict_checks"
ON public.conflict_checks FOR ALL TO authenticated
USING (organization_id = get_user_org_id(auth.uid()))
WITH CHECK (organization_id = get_user_org_id(auth.uid()));

CREATE TRIGGER trg_conflict_checks_updated
BEFORE UPDATE ON public.conflict_checks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
