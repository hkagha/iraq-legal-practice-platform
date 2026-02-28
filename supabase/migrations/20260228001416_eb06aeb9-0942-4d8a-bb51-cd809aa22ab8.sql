
-- Fix search_path on update_updated_at and handle_new_user
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'lawyer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Tighten the insert policy - only allow users without an org to create one (registration flow)
DROP POLICY "authenticated_insert_org" ON public.organizations;
CREATE POLICY "authenticated_insert_org" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_org_id(auth.uid()) IS NULL);
