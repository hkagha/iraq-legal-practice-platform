-- pgcrypto for symmetric encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Add AI config columns to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS ai_provider text NOT NULL DEFAULT 'lovable',
  ADD COLUMN IF NOT EXISTS ai_api_key_encrypted bytea,
  ADD COLUMN IF NOT EXISTS ai_base_url text,
  ADD COLUMN IF NOT EXISTS ai_model text,
  ADD COLUMN IF NOT EXISTS ai_fallback_to_platform boolean NOT NULL DEFAULT true;

-- Validation trigger for ai_provider
CREATE OR REPLACE FUNCTION public.validate_org_ai_provider()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.ai_provider NOT IN ('lovable','openai','anthropic','google','custom') THEN
    RAISE EXCEPTION 'Invalid ai_provider: %', NEW.ai_provider;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_org_ai_provider ON public.organizations;
CREATE TRIGGER trg_validate_org_ai_provider
BEFORE INSERT OR UPDATE OF ai_provider ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.validate_org_ai_provider();

-- Hide encrypted key from clients (only service_role can read it)
REVOKE SELECT (ai_api_key_encrypted) ON public.organizations FROM anon, authenticated;

-- Encryption key source: a Postgres custom GUC, falls back to a fixed app secret.
-- We use a stable per-database key derived from the service role's JWT secret namespace.
-- For simplicity & portability we use a fixed app-level passphrase via vault-style setting.
-- Here we store/derive using pgcrypto with a server-side passphrase from app.settings.
-- Since we cannot rely on a vault entry, we use the database's own setting:
--   current_setting('app.ai_key_secret', true)
-- and fall back to a deterministic passphrase if missing (admin should set it).

CREATE OR REPLACE FUNCTION public._ai_key_passphrase()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v text;
BEGIN
  v := current_setting('app.ai_key_secret', true);
  IF v IS NULL OR length(v) = 0 THEN
    -- Deterministic per-database fallback (NOT ideal, but functional).
    -- Admin can override by setting: ALTER DATABASE postgres SET app.ai_key_secret = '...';
    v := 'qanuni-ai-byok-default-passphrase-v1';
  END IF;
  RETURN v;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._ai_key_passphrase() FROM anon, authenticated;

-- Setter: only firm_admin of that org can set the key
CREATE OR REPLACE FUNCTION public.set_org_ai_key(_org_id uuid, _plaintext text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (
    public.get_user_org_id(auth.uid()) = _org_id
    AND public.get_user_role(auth.uid()) = 'firm_admin'
  ) THEN
    RAISE EXCEPTION 'Only firm admin of this organization can set the AI key';
  END IF;

  IF _plaintext IS NULL OR length(_plaintext) = 0 THEN
    UPDATE public.organizations
       SET ai_api_key_encrypted = NULL
     WHERE id = _org_id;
  ELSE
    UPDATE public.organizations
       SET ai_api_key_encrypted = extensions.pgp_sym_encrypt(_plaintext, public._ai_key_passphrase())
     WHERE id = _org_id;
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_org_ai_key(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_org_ai_key(uuid, text) TO authenticated;

-- Boolean check exposed to UI (does this org have a key configured?)
CREATE OR REPLACE FUNCTION public.org_has_ai_key(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = _org_id
      AND ai_api_key_encrypted IS NOT NULL
      AND _org_id = public.get_user_org_id(auth.uid())
  );
$$;
GRANT EXECUTE ON FUNCTION public.org_has_ai_key(uuid) TO authenticated;

-- Decryption helper: service role only (called from edge function)
CREATE OR REPLACE FUNCTION public.get_org_ai_key(_org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  enc bytea;
BEGIN
  SELECT ai_api_key_encrypted INTO enc FROM public.organizations WHERE id = _org_id;
  IF enc IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN extensions.pgp_sym_decrypt(enc, public._ai_key_passphrase());
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_org_ai_key(uuid) FROM anon, authenticated;
-- service_role retains EXECUTE by default