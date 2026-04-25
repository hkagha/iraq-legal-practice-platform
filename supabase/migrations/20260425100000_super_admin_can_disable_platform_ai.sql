-- Super-admin controlled flag: when true, this organisation cannot use the
-- platform-managed AI gateway. The org MUST configure their own API
-- (Bring-Your-Own-Key) to use AI features. This is a super-admin lever for
-- managing platform AI cost / usage on a per-org basis.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS ai_platform_disabled_by_admin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.organizations.ai_platform_disabled_by_admin IS
  'When true (set by super_admin), this org cannot use the platform-managed AI gateway and must configure their own provider in Settings → AI.';

-- Update the get_org_ai_key RPC to also return whether platform AI is forbidden
-- so the Edge Function can short-circuit cleanly with a useful error.
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
