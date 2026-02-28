
CREATE TABLE public.client_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id),
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'client_created', 'client_updated', 'client_archived', 'client_restored',
    'case_created', 'case_status_changed', 'case_closed',
    'errand_created', 'errand_status_changed', 'errand_completed',
    'document_uploaded', 'document_deleted',
    'invoice_created', 'invoice_sent', 'payment_received',
    'note_added', 'note_updated',
    'contact_added', 'contact_removed',
    'portal_invited', 'portal_access_granted'
  )),
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  metadata JSONB DEFAULT '{}',
  related_entity_type TEXT CHECK (related_entity_type IN ('case', 'errand', 'document', 'invoice', 'note', 'contact', NULL)),
  related_entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_client_activities_client ON public.client_activities(client_id);
CREATE INDEX idx_client_activities_org ON public.client_activities(organization_id);
CREATE INDEX idx_client_activities_created ON public.client_activities(created_at DESC);

ALTER TABLE public.client_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_org_client_activities" ON public.client_activities
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "staff_create_client_activities" ON public.client_activities
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));
