-- Fix: The client_read_case_team_profiles policy causes indirect recursion
-- because the tables it joins (case_team_members, cases, client_user_links)
-- have RLS policies that call get_user_org_id() which queries profiles.
-- Solution: wrap the check in a SECURITY DEFINER function that bypasses RLS.

DROP POLICY IF EXISTS "client_read_case_team_profiles" ON public.profiles;

-- Create a security definer function for the client team check
CREATE OR REPLACE FUNCTION public.client_can_see_profile(_profile_id uuid, _client_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.case_team_members ctm
    JOIN public.cases c ON c.id = ctm.case_id
    JOIN public.client_user_links cul ON cul.client_id = c.client_id
    WHERE ctm.user_id = _profile_id
      AND cul.user_id = _client_user_id
      AND c.is_visible_to_client = true
  );
END;
$$;

-- Recreate policy using the function
CREATE POLICY "client_read_case_team_profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  public.client_can_see_profile(profiles.id, auth.uid())
);

-- Also re-add org profiles and super admin policies using safe approach
-- Use a separate user_roles-like approach via security definer functions

CREATE POLICY "super_admin_all_profiles" ON public.profiles
FOR ALL TO authenticated
USING (
  get_user_role(auth.uid()) = ANY(ARRAY['super_admin', 'sales_admin'])
);

CREATE POLICY "users_read_org_profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  organization_id = get_user_org_id(auth.uid())
);

CREATE POLICY "firm_admin_update_org_profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (
  organization_id = get_user_org_id(auth.uid())
  AND get_user_role(auth.uid()) = 'firm_admin'
);