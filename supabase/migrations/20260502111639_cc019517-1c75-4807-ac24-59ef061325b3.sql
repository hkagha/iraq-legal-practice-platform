DROP FUNCTION IF EXISTS public.check_person_duplicates(uuid, text, text, text, text, uuid);

CREATE OR REPLACE FUNCTION public.check_person_duplicates(
  _organization_id uuid,
  _full_name text,
  _national_id text DEFAULT NULL,
  _email text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _exclude_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  full_name text,
  full_name_ar text,
  national_id text,
  email text,
  phone text,
  match_level text,
  match_field text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_org_staff_member(auth.uid(), _organization_id) THEN
    RETURN;
  END IF;

  -- Exact: national_id_number
  IF _national_id IS NOT NULL AND length(trim(_national_id)) > 0 THEN
    RETURN QUERY
    SELECT p.id,
           trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,''))::text,
           trim(coalesce(p.first_name_ar,'') || ' ' || coalesce(p.last_name_ar,''))::text,
           p.national_id_number::text,
           p.email::text,
           p.phone::text,
           'exact'::text, 'national_id'::text
    FROM public.persons p
    WHERE p.organization_id = _organization_id
      AND p.national_id_number IS NOT NULL
      AND lower(trim(p.national_id_number)) = lower(trim(_national_id))
      AND (_exclude_id IS NULL OR p.id <> _exclude_id);
  END IF;

  -- Exact: email
  IF _email IS NOT NULL AND length(trim(_email)) > 0 THEN
    RETURN QUERY
    SELECT p.id,
           trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,''))::text,
           trim(coalesce(p.first_name_ar,'') || ' ' || coalesce(p.last_name_ar,''))::text,
           p.national_id_number::text,
           p.email::text,
           p.phone::text,
           'exact'::text, 'email'::text
    FROM public.persons p
    WHERE p.organization_id = _organization_id
      AND p.email IS NOT NULL
      AND lower(trim(p.email)) = lower(trim(_email))
      AND (_exclude_id IS NULL OR p.id <> _exclude_id);
  END IF;

  -- Exact: phone (digits-only)
  IF _phone IS NOT NULL AND length(regexp_replace(_phone, '\D', '', 'g')) >= 6 THEN
    RETURN QUERY
    SELECT p.id,
           trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,''))::text,
           trim(coalesce(p.first_name_ar,'') || ' ' || coalesce(p.last_name_ar,''))::text,
           p.national_id_number::text,
           p.email::text,
           p.phone::text,
           'exact'::text, 'phone'::text
    FROM public.persons p
    WHERE p.organization_id = _organization_id
      AND p.phone IS NOT NULL
      AND regexp_replace(p.phone, '\D', '', 'g') = regexp_replace(_phone, '\D', '', 'g')
      AND (_exclude_id IS NULL OR p.id <> _exclude_id);
  END IF;

  -- Similar: assembled full name
  IF _full_name IS NOT NULL AND length(trim(_full_name)) >= 3 THEN
    RETURN QUERY
    SELECT p.id,
           trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,''))::text,
           trim(coalesce(p.first_name_ar,'') || ' ' || coalesce(p.last_name_ar,''))::text,
           p.national_id_number::text,
           p.email::text,
           p.phone::text,
           'similar'::text, 'full_name'::text
    FROM public.persons p
    WHERE p.organization_id = _organization_id
      AND (_exclude_id IS NULL OR p.id <> _exclude_id)
      AND (
        lower(trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,''))) = lower(trim(_full_name))
        OR lower(trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,''))) LIKE '%' || lower(trim(_full_name)) || '%'
        OR lower(trim(_full_name)) LIKE '%' || lower(trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,''))) || '%'
        OR trim(coalesce(p.first_name_ar,'') || ' ' || coalesce(p.last_name_ar,'')) = trim(_full_name)
      )
    LIMIT 10;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_person_duplicates(uuid, text, text, text, text, uuid) TO authenticated;
