
-- Add personal_message column to invitations
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS personal_message TEXT;

-- Add UPDATE policy for firm_admin to manage invitations (resend/cancel)
CREATE POLICY "firm_admin_update_invitations" ON public.invitations
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()) AND get_user_role(auth.uid()) = 'firm_admin');

-- Add DELETE policy for firm_admin
CREATE POLICY "firm_admin_delete_invitations" ON public.invitations
  FOR DELETE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()) AND get_user_role(auth.uid()) = 'firm_admin');
