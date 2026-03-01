-- Fix infinite recursion: rewrite SQL functions as plpgsql to prevent inlining
-- SQL-language SECURITY DEFINER functions can be inlined by the planner,
-- which defeats the SECURITY DEFINER RLS bypass and causes 42P17 recursion.

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _role text;
BEGIN
  SELECT role INTO _role FROM public.profiles WHERE id = _user_id;
  RETURN _role;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _org_id uuid;
BEGIN
  SELECT organization_id INTO _org_id FROM public.profiles WHERE id = _user_id;
  RETURN _org_id;
END;
$$;