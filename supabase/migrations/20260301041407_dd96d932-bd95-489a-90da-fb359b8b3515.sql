-- Final recursion fix for profiles login path:
-- remove all policies that indirectly query profiles via helper functions/JWT role checks.
-- keep only non-recursive policies.

DROP POLICY IF EXISTS "super_admin_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_read_org_profiles" ON public.profiles;
DROP POLICY IF EXISTS "firm_admin_update_org_profiles" ON public.profiles;