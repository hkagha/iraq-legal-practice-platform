-- =========================================================================
-- Migration 1: 20260425100000_super_admin_can_disable_platform_ai.sql
-- =========================================================================
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS ai_platform_disabled_by_admin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.organizations.ai_platform_disabled_by_admin IS
  'When true (set by super_admin), this org cannot use the platform-managed AI gateway and must configure their own provider in Settings → AI.';

CREATE OR REPLACE FUNCTION public.org_ai_runtime_settings(_org_id uuid)
RETURNS TABLE (
  ai_enabled boolean,
  ai_provider text,
  ai_base_url text,
  ai_model text,
  ai_fallback_to_platform boolean,
  ai_platform_disabled_by_admin boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    coalesce(ai_enabled, false),
    coalesce(ai_provider, 'lovable'),
    ai_base_url,
    ai_model,
    coalesce(ai_fallback_to_platform, true),
    coalesce(ai_platform_disabled_by_admin, false)
  FROM public.organizations
  WHERE id = _org_id;
$$;

REVOKE ALL ON FUNCTION public.org_ai_runtime_settings(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.org_ai_runtime_settings(uuid) TO authenticated;

-- =========================================================================
-- Migration 2: 20260425110000_richer_document_indexing.sql
-- =========================================================================
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS ai_statutes      jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_case_numbers  text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS ai_amounts       jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_parties       jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.documents.ai_statutes      IS 'Statutory references extracted from document content. Array of {name, number, year, article}.';
COMMENT ON COLUMN public.documents.ai_case_numbers  IS 'Case / file / registration / contract numbers identified in the document.';
COMMENT ON COLUMN public.documents.ai_amounts       IS 'Monetary amounts found in the document. Array of {value, currency}.';
COMMENT ON COLUMN public.documents.ai_parties       IS 'Named parties with their procedural roles. Array of {name, role}.';

CREATE INDEX IF NOT EXISTS idx_documents_ai_case_numbers
  ON public.documents USING GIN (ai_case_numbers);

-- =========================================================================
-- Migration 3: 20260425120000_fix_client_messages_sender_fk.sql
-- =========================================================================
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