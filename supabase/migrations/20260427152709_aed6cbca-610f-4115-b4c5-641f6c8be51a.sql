CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'lawyer') = 'client' THEN
    RETURN NEW;
  END IF;

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
$$;

REVOKE ALL ON FUNCTION public.is_org_staff_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_staff_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_staff_member(uuid, uuid) TO service_role;