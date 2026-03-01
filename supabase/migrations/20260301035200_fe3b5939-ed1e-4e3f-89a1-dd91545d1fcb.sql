-- CRITICAL: Allow client users to read profiles of staff working on their cases
-- Without this, the "Your Legal Team" section shows empty
CREATE POLICY "client_read_case_team_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    get_user_role(auth.uid()) = 'client'
    AND EXISTS (
      SELECT 1 FROM public.case_team_members ctm
      JOIN public.cases c ON c.id = ctm.case_id
      JOIN public.client_user_links cul ON cul.client_id = c.client_id
      WHERE ctm.user_id = profiles.id
        AND cul.user_id = auth.uid()
        AND c.is_visible_to_client = true
    )
  );
