-- Fix profiles RLS: eliminate ALL self-referential queries
-- Use auth.jwt() to read role/org from JWT claims instead of querying profiles

-- Drop problematic policies
DROP POLICY IF EXISTS "super_admin_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_read_org_profiles" ON public.profiles;
DROP POLICY IF EXISTS "firm_admin_update_org_profiles" ON public.profiles;
DROP POLICY IF EXISTS "client_read_case_team_profiles" ON public.profiles;

-- Recreate using JWT claims and security definer helpers (no profiles self-reference)

-- Super admin full access - use JWT role claim
CREATE POLICY "super_admin_all_profiles" ON public.profiles
FOR ALL TO authenticated
USING (
  (auth.jwt()->'user_metadata'->>'role') = ANY(ARRAY['super_admin', 'sales_admin'])
);

-- Staff read org profiles - use security definer for org_id (already plpgsql)
CREATE POLICY "users_read_org_profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  organization_id = get_user_org_id(auth.uid())
);

-- Firm admin update org profiles
CREATE POLICY "firm_admin_update_org_profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (
  organization_id = get_user_org_id(auth.uid())
  AND (auth.jwt()->'user_metadata'->>'role') = 'firm_admin'
);

-- Client read case team profiles (no role check needed, just EXISTS)
CREATE POLICY "client_read_case_team_profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.case_team_members ctm
    JOIN public.cases c ON c.id = ctm.case_id
    JOIN public.client_user_links cul ON cul.client_id = c.client_id
    WHERE ctm.user_id = profiles.id
      AND cul.user_id = auth.uid()
      AND c.is_visible_to_client = true
  )
);