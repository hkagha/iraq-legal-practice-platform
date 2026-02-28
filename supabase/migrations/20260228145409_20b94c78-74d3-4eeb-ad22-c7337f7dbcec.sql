
-- Errand notes table
CREATE TABLE public.errand_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  errand_id UUID NOT NULL REFERENCES public.errands(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  content_ar TEXT,
  is_visible_to_client BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_errand_notes_errand ON public.errand_notes(errand_id);

ALTER TABLE public.errand_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_org_errand_notes" ON public.errand_notes
  FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "staff_manage_errand_notes" ON public.errand_notes
  FOR ALL TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND get_user_role(auth.uid()) IN ('firm_admin', 'lawyer', 'paralegal')
  );

CREATE TRIGGER update_errand_notes_updated_at BEFORE UPDATE ON public.errand_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for errand_notes
ALTER PUBLICATION supabase_realtime ADD TABLE public.errand_notes;
