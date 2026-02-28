
-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT,
  body TEXT,
  body_ar TEXT,
  notification_type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  in_app_delivered BOOLEAN DEFAULT true,
  email_delivered BOOLEAN DEFAULT false,
  email_delivered_at TIMESTAMPTZ,
  whatsapp_delivered BOOLEAN DEFAULT false,
  whatsapp_delivered_at TIMESTAMPTZ,
  actor_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_type ON public.notifications(notification_type);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_entity ON public.notifications(entity_type, entity_id);

-- Notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{
    "task_assigned": {"in_app": true, "email": true, "whatsapp": false},
    "task_due_today": {"in_app": true, "email": true, "whatsapp": true},
    "task_due_tomorrow": {"in_app": true, "email": false, "whatsapp": false},
    "task_overdue": {"in_app": true, "email": true, "whatsapp": true},
    "task_completed": {"in_app": true, "email": false, "whatsapp": false},
    "task_comment": {"in_app": true, "email": false, "whatsapp": false},
    "task_mentioned": {"in_app": true, "email": true, "whatsapp": false},
    "case_assigned": {"in_app": true, "email": true, "whatsapp": false},
    "case_status_changed": {"in_app": true, "email": false, "whatsapp": false},
    "case_hearing_tomorrow": {"in_app": true, "email": true, "whatsapp": true},
    "case_hearing_today": {"in_app": true, "email": true, "whatsapp": true},
    "case_note_added": {"in_app": true, "email": false, "whatsapp": false},
    "case_mentioned": {"in_app": true, "email": true, "whatsapp": false},
    "case_deadline_approaching": {"in_app": true, "email": true, "whatsapp": true},
    "errand_assigned": {"in_app": true, "email": true, "whatsapp": false},
    "errand_status_changed": {"in_app": true, "email": false, "whatsapp": false},
    "errand_step_completed": {"in_app": true, "email": false, "whatsapp": false},
    "errand_overdue": {"in_app": true, "email": true, "whatsapp": true},
    "errand_mentioned": {"in_app": true, "email": true, "whatsapp": false},
    "invoice_created": {"in_app": true, "email": false, "whatsapp": false},
    "invoice_overdue": {"in_app": true, "email": true, "whatsapp": false},
    "payment_received": {"in_app": true, "email": true, "whatsapp": false},
    "document_shared": {"in_app": true, "email": false, "whatsapp": false},
    "document_uploaded": {"in_app": true, "email": false, "whatsapp": false},
    "event_reminder": {"in_app": true, "email": true, "whatsapp": false},
    "event_invitation": {"in_app": true, "email": true, "whatsapp": false},
    "mention": {"in_app": true, "email": true, "whatsapp": false}
  }'::jsonb,
  email_enabled BOOLEAN DEFAULT true,
  whatsapp_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',
  quiet_hours_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TRIGGER update_notif_prefs_updated_at BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_prefs" ON public.notification_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Auto-create preferences on profile creation
CREATE OR REPLACE FUNCTION public.create_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id, organization_id)
  VALUES (NEW.id, COALESCE(NEW.organization_id, '00000000-0000-0000-0000-000000000000'::uuid))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_notif_prefs_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_notification_preferences();

-- Helper function to create notifications
CREATE OR REPLACE FUNCTION public.create_notification(
  p_organization_id UUID,
  p_user_id UUID,
  p_notification_type TEXT,
  p_title TEXT,
  p_title_ar TEXT DEFAULT NULL,
  p_body TEXT DEFAULT NULL,
  p_body_ar TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal',
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notif_id UUID;
  type_prefs JSONB;
BEGIN
  SELECT preferences->p_notification_type INTO type_prefs
  FROM public.notification_preferences
  WHERE user_id = p_user_id;

  IF type_prefs IS NULL THEN
    type_prefs := '{"in_app": true, "email": false, "whatsapp": false}'::jsonb;
  END IF;

  IF (type_prefs->>'in_app')::boolean = true THEN
    INSERT INTO public.notifications (
      organization_id, user_id, notification_type, title, title_ar,
      body, body_ar, priority, entity_type, entity_id, actor_id
    ) VALUES (
      p_organization_id, p_user_id, p_notification_type, p_title, p_title_ar,
      p_body, p_body_ar, p_priority, p_entity_type, p_entity_id, p_actor_id
    ) RETURNING id INTO notif_id;
  END IF;

  RETURN notif_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
