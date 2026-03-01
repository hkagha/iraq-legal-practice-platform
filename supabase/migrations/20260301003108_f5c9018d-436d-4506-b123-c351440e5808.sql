
-- Create client_messages table
CREATE TABLE public.client_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  errand_id UUID REFERENCES public.errands(id) ON DELETE SET NULL,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  sender_type TEXT NOT NULL DEFAULT 'client',
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add validation trigger for sender_type
CREATE OR REPLACE FUNCTION public.validate_client_message_sender_type()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.sender_type NOT IN ('client', 'staff') THEN
    RAISE EXCEPTION 'Invalid sender_type: %', NEW.sender_type;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_client_message_sender_type_trigger
  BEFORE INSERT OR UPDATE ON public.client_messages
  FOR EACH ROW EXECUTE FUNCTION public.validate_client_message_sender_type();

-- Indexes
CREATE INDEX idx_client_messages_org ON public.client_messages(organization_id);
CREATE INDEX idx_client_messages_client ON public.client_messages(client_id);
CREATE INDEX idx_client_messages_case ON public.client_messages(case_id);
CREATE INDEX idx_client_messages_created ON public.client_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.client_messages ENABLE ROW LEVEL SECURITY;

-- Client can read their own messages
CREATE POLICY "client_read_own_messages" ON public.client_messages
  FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT cul.client_id FROM public.client_user_links cul WHERE cul.user_id = auth.uid()
    )
  );

-- Client can insert their own messages
CREATE POLICY "client_send_messages" ON public.client_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    client_id IN (
      SELECT cul.client_id FROM public.client_user_links cul WHERE cul.user_id = auth.uid()
    )
  );

-- Staff can read/write org messages
CREATE POLICY "staff_manage_messages" ON public.client_messages
  FOR ALL TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND get_user_role(auth.uid()) != 'client'
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_messages;
