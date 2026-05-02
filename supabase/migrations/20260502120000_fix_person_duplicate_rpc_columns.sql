CREATE OR REPLACE FUNCTION public.check_person_duplicates(
  _organization_id UUID,
  _full_name TEXT,
  _national_id TEXT DEFAULT NULL,
  _email TEXT DEFAULT NULL,
  _phone TEXT DEFAULT NULL,
  _exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  full_name_ar TEXT,
  national_id TEXT,
  email TEXT,
  phone TEXT,
  match_level TEXT,
  match_field TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_phone_digits text;
BEGIN
  IF NOT public.is_org_staff_member(auth.uid(), _organization_id) THEN
    RETURN;
  END IF;

  IF _phone IS NOT NULL THEN
    v_phone_digits := regexp_replace(_phone, '\D', '', 'g');
    IF length(v_phone_digits) < 6 THEN
      v_phone_digits := NULL;
    END IF;
  END IF;

  IF _national_id IS NOT NULL AND length(trim(_national_id)) > 0 THEN
    RETURN QUERY
    SELECT p.id,
      trim(concat_ws(' ', p.first_name, p.last_name))::text,
      trim(concat_ws(' ', p.first_name_ar, p.last_name_ar))::text,
      p.national_id_number,
      p.email,
      p.phone,
      'exact'::text,
      'national_id'::text
    FROM public.persons p
    WHERE p.organization_id = _organization_id
      AND p.national_id_number IS NOT NULL
      AND lower(trim(p.national_id_number)) = lower(trim(_national_id))
      AND (_exclude_id IS NULL OR p.id <> _exclude_id);
  END IF;

  IF _email IS NOT NULL AND length(trim(_email)) > 0 THEN
    RETURN QUERY
    SELECT p.id,
      trim(concat_ws(' ', p.first_name, p.last_name))::text,
      trim(concat_ws(' ', p.first_name_ar, p.last_name_ar))::text,
      p.national_id_number,
      p.email,
      p.phone,
      'exact'::text,
      'email'::text
    FROM public.persons p
    WHERE p.organization_id = _organization_id
      AND p.email IS NOT NULL
      AND lower(trim(p.email)) = lower(trim(_email))
      AND (_exclude_id IS NULL OR p.id <> _exclude_id);
  END IF;

  IF v_phone_digits IS NOT NULL THEN
    RETURN QUERY
    SELECT p.id,
      trim(concat_ws(' ', p.first_name, p.last_name))::text,
      trim(concat_ws(' ', p.first_name_ar, p.last_name_ar))::text,
      p.national_id_number,
      p.email,
      p.phone,
      'exact'::text,
      'phone'::text
    FROM public.persons p
    WHERE p.organization_id = _organization_id
      AND p.phone IS NOT NULL
      AND regexp_replace(p.phone, '\D', '', 'g') = v_phone_digits
      AND (_exclude_id IS NULL OR p.id <> _exclude_id);
  END IF;

  IF _full_name IS NOT NULL AND length(trim(_full_name)) >= 3 THEN
    RETURN QUERY
    SELECT p.id,
      trim(concat_ws(' ', p.first_name, p.last_name))::text,
      trim(concat_ws(' ', p.first_name_ar, p.last_name_ar))::text,
      p.national_id_number,
      p.email,
      p.phone,
      'similar'::text,
      'full_name'::text
    FROM public.persons p
    WHERE p.organization_id = _organization_id
      AND (_exclude_id IS NULL OR p.id <> _exclude_id)
      AND (
        lower(trim(concat_ws(' ', p.first_name, p.last_name))) = lower(trim(_full_name))
        OR lower(trim(concat_ws(' ', p.first_name, p.last_name))) LIKE '%' || lower(trim(_full_name)) || '%'
        OR lower(trim(_full_name)) LIKE '%' || lower(trim(concat_ws(' ', p.first_name, p.last_name))) || '%'
        OR trim(concat_ws(' ', p.first_name_ar, p.last_name_ar)) = trim(_full_name)
      )
    LIMIT 10;
  END IF;
END;
$$;
