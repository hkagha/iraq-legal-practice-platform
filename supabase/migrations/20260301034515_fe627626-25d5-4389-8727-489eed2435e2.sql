-- CRITICAL FIX: Allow client users to read their own client_user_links
-- Without this, the portal's PortalOrgContext cannot load linked orgs
CREATE POLICY "client_read_own_links" ON public.client_user_links
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- CRITICAL FIX: Allow client users to read organizations they're linked to
-- Without this, the org switcher and portal header can't show org names
CREATE POLICY "client_read_linked_orgs" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_user_links cul
      WHERE cul.user_id = auth.uid()
        AND cul.organization_id = organizations.id
    )
  );
