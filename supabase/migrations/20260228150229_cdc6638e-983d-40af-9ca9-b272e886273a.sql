
-- Email queue table
CREATE TABLE public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  subject_ar TEXT,
  body_html TEXT NOT NULL,
  body_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_queue_status ON public.email_queue(status);
CREATE INDEX idx_email_queue_scheduled ON public.email_queue(scheduled_at) WHERE status = 'pending';

-- Validate email_queue status via trigger
CREATE OR REPLACE FUNCTION public.validate_email_queue_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'sent', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid email_queue status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_email_queue_status
  BEFORE INSERT OR UPDATE ON public.email_queue
  FOR EACH ROW EXECUTE FUNCTION public.validate_email_queue_status();

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_org_email_queue" ON public.email_queue
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "staff_insert_email_queue" ON public.email_queue
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

-- WhatsApp queue table
CREATE TABLE public.whatsapp_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  message_template TEXT NOT NULL,
  template_params JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  whatsapp_message_id TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_queue_status ON public.whatsapp_queue(status);

-- Validate whatsapp_queue status via trigger
CREATE OR REPLACE FUNCTION public.validate_whatsapp_queue_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'sent', 'delivered', 'read', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid whatsapp_queue status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_whatsapp_queue_status
  BEFORE INSERT OR UPDATE ON public.whatsapp_queue
  FOR EACH ROW EXECUTE FUNCTION public.validate_whatsapp_queue_status();

ALTER TABLE public.whatsapp_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_org_whatsapp_queue" ON public.whatsapp_queue
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "staff_insert_whatsapp_queue" ON public.whatsapp_queue
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE profiles.id = auth.uid()));

-- Add sound_enabled to notification_preferences
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT true;

-- Add whatsapp_number to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Enable realtime for both queue tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_queue;
