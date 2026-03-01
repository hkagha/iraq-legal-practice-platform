-- CRITICAL: Add client-specific RLS policies for portal data access
-- Without these, client portal users cannot read any of this data

-- 1. errand_steps: clients can read steps for their visible errands
CREATE POLICY "client_read_errand_steps" ON public.errand_steps
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.errands e
      JOIN public.client_user_links cul ON cul.client_id = e.client_id
      WHERE e.id = errand_steps.errand_id
        AND cul.user_id = auth.uid()
        AND e.is_visible_to_client = true
    )
  );

-- 2. case_hearings: clients can read hearings marked visible
CREATE POLICY "client_read_case_hearings" ON public.case_hearings
  FOR SELECT TO authenticated
  USING (
    is_visible_to_client = true
    AND EXISTS (
      SELECT 1 FROM public.cases c
      JOIN public.client_user_links cul ON cul.client_id = c.client_id
      WHERE c.id = case_hearings.case_id
        AND cul.user_id = auth.uid()
        AND c.is_visible_to_client = true
    )
  );

-- 3. case_team_members: clients can read team members for their cases
CREATE POLICY "client_read_case_team" ON public.case_team_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      JOIN public.client_user_links cul ON cul.client_id = c.client_id
      WHERE c.id = case_team_members.case_id
        AND cul.user_id = auth.uid()
        AND c.is_visible_to_client = true
    )
  );

-- 4. case_activities: clients can read activities for their cases
CREATE POLICY "client_read_case_activities" ON public.case_activities
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      JOIN public.client_user_links cul ON cul.client_id = c.client_id
      WHERE c.id = case_activities.case_id
        AND cul.user_id = auth.uid()
        AND c.is_visible_to_client = true
    )
  );

-- 5. case_notes: clients can read visible notes
CREATE POLICY "client_read_case_notes" ON public.case_notes
  FOR SELECT TO authenticated
  USING (
    is_visible_to_client = true
    AND EXISTS (
      SELECT 1 FROM public.cases c
      JOIN public.client_user_links cul ON cul.client_id = c.client_id
      WHERE c.id = case_notes.case_id
        AND cul.user_id = auth.uid()
        AND c.is_visible_to_client = true
    )
  );

-- 6. errand_activities: clients can read activities for their errands
CREATE POLICY "client_read_errand_activities" ON public.errand_activities
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.errands e
      JOIN public.client_user_links cul ON cul.client_id = e.client_id
      WHERE e.id = errand_activities.errand_id
        AND cul.user_id = auth.uid()
        AND e.is_visible_to_client = true
    )
  );

-- 7. errand_notes: clients can read visible notes
CREATE POLICY "client_read_errand_notes" ON public.errand_notes
  FOR SELECT TO authenticated
  USING (
    is_visible_to_client = true
    AND EXISTS (
      SELECT 1 FROM public.errands e
      JOIN public.client_user_links cul ON cul.client_id = e.client_id
      WHERE e.id = errand_notes.errand_id
        AND cul.user_id = auth.uid()
        AND e.is_visible_to_client = true
    )
  );

-- 8. errand_documents: clients can read visible documents
CREATE POLICY "client_read_errand_docs" ON public.errand_documents
  FOR SELECT TO authenticated
  USING (
    is_visible_to_client = true
    AND EXISTS (
      SELECT 1 FROM public.errands e
      JOIN public.client_user_links cul ON cul.client_id = e.client_id
      WHERE e.id = errand_documents.errand_id
        AND cul.user_id = auth.uid()
        AND e.is_visible_to_client = true
    )
  );
