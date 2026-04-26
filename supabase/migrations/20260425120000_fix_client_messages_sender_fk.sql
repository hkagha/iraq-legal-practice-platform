-- Issue: client_messages.sender_id was a hard FK to profiles(id), but portal
-- users (clients) live in portal_users, not profiles. This made it impossible
-- for a client to send a message — the FK violation rejected every insert.
--
-- Fix: drop the FK, keep sender_id as NOT NULL uuid. The validate trigger
-- already enforces sender_type ∈ ('staff','client'). We additionally enforce
-- that sender_id resolves to a real account in EITHER profiles OR portal_users
-- (when sender_type matches).

ALTER TABLE public.client_messages
  DROP CONSTRAINT IF EXISTS client_messages_sender_id_fkey;

CREATE OR REPLACE FUNCTION public.validate_client_message_sender()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF NEW.sender_type = 'staff' THEN
    IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = NEW.sender_id) THEN
      RAISE EXCEPTION 'sender_id % does not match any staff profile', NEW.sender_id;
    END IF;
  ELSIF NEW.sender_type = 'client' THEN
    -- portal user signs in as auth.uid; portal_users.auth_user_id = that UID.
    IF NOT EXISTS (SELECT 1 FROM public.portal_users pu WHERE pu.auth_user_id = NEW.sender_id) THEN
      RAISE EXCEPTION 'sender_id % does not match any portal user', NEW.sender_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid sender_type: %', NEW.sender_type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_client_message_sender_type_trigger ON public.client_messages;
DROP TRIGGER IF EXISTS trg_validate_msg_sender ON public.client_messages;

CREATE TRIGGER trg_validate_client_message_sender
  BEFORE INSERT OR UPDATE ON public.client_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_client_message_sender();

COMMENT ON FUNCTION public.validate_client_message_sender() IS
  'Validates that client_messages.sender_id resolves to either profiles (when sender_type=staff) or portal_users.auth_user_id (when sender_type=client).';
