CREATE OR REPLACE FUNCTION public.check_party_duplicates(
  _party_type TEXT,
  _payload JSONB,
  _exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  severity TEXT,
  match_field TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id UUID := get_user_org_id(auth.uid());
  _name TEXT;
  _name_ar TEXT;
  _email TEXT := NULLIF(trim(_payload->>'email'), '');
  _phone TEXT := NULLIF(trim(_payload->>'phone'), '');
  _phone_digits TEXT;
BEGIN
  IF _org_id IS NULL THEN
    RETURN;
  END IF;

  IF _phone IS NOT NULL THEN
    _phone_digits := regexp_replace(_phone, '\D', '', 'g');
    IF length(_phone_digits) < 6 THEN _phone_digits := NULL; END IF;
  END IF;

  IF _party_type = 'person' THEN
    DECLARE
      _national_id TEXT := NULLIF(trim(_payload->>'national_id_number'), '');
      _first TEXT := COALESCE(_payload->>'first_name', '');
      _last TEXT := COALESCE(_payload->>'last_name', '');
      _first_ar TEXT := COALESCE(_payload->>'first_name_ar', '');
      _last_ar TEXT := COALESCE(_payload->>'last_name_ar', '');
    BEGIN
      _name := trim(_first || ' ' || _last);
      _name_ar := trim(_first_ar || ' ' || _last_ar);

      -- Direct: national ID
      IF _national_id IS NOT NULL THEN
        RETURN QUERY
        SELECT p.id,
               trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,''))::TEXT,
               'direct'::TEXT, 'national_id'::TEXT
        FROM public.persons p
        WHERE p.organization_id = _org_id
          AND p.national_id_number IS NOT NULL
          AND lower(trim(p.national_id_number)) = lower(_national_id)
          AND (_exclude_id IS NULL OR p.id <> _exclude_id);
      END IF;

      -- Direct: email
      IF _email IS NOT NULL THEN
        RETURN QUERY
        SELECT p.id,
               trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,''))::TEXT,
               'direct'::TEXT, 'email'::TEXT
        FROM public.persons p
        WHERE p.organization_id = _org_id
          AND p.email IS NOT NULL
          AND lower(trim(p.email)) = lower(_email)
          AND (_exclude_id IS NULL OR p.id <> _exclude_id);
      END IF;

      -- Direct: phone
      IF _phone_digits IS NOT NULL THEN
        RETURN QUERY
        SELECT p.id,
               trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,''))::TEXT,
               'direct'::TEXT, 'phone'::TEXT
        FROM public.persons p
        WHERE p.organization_id = _org_id
          AND p.phone IS NOT NULL
          AND regexp_replace(p.phone, '\D', '', 'g') = _phone_digits
          AND (_exclude_id IS NULL OR p.id <> _exclude_id);
      END IF;

      -- Similar: name
      IF length(_name) >= 3 THEN
        RETURN QUERY
        SELECT p.id,
               trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,''))::TEXT,
               'similar'::TEXT, 'full_name'::TEXT
        FROM public.persons p
        WHERE p.organization_id = _org_id
          AND (_exclude_id IS NULL OR p.id <> _exclude_id)
          AND (
            lower(trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,''))) = lower(_name)
            OR lower(trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,''))) LIKE '%' || lower(_name) || '%'
            OR lower(_name) LIKE '%' || lower(trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,''))) || '%'
            OR (length(_name_ar) >= 3 AND trim(coalesce(p.first_name_ar,'') || ' ' || coalesce(p.last_name_ar,'')) = _name_ar)
          )
        LIMIT 10;
      END IF;
    END;

  ELSIF _party_type = 'entity' THEN
    DECLARE
      _company_name TEXT := NULLIF(trim(_payload->>'company_name'), '');
      _company_name_ar TEXT := NULLIF(trim(_payload->>'company_name_ar'), '');
      _reg TEXT := NULLIF(trim(_payload->>'company_registration_number'), '');
      _tax TEXT := NULLIF(trim(_payload->>'tax_id'), '');
    BEGIN
      IF _reg IS NOT NULL THEN
        RETURN QUERY
        SELECT e.id, e.company_name::TEXT, 'direct'::TEXT, 'company_registration_number'::TEXT
        FROM public.entities e
        WHERE e.organization_id = _org_id
          AND e.company_registration_number IS NOT NULL
          AND lower(trim(e.company_registration_number)) = lower(_reg)
          AND (_exclude_id IS NULL OR e.id <> _exclude_id);
      END IF;

      IF _tax IS NOT NULL THEN
        RETURN QUERY
        SELECT e.id, e.company_name::TEXT, 'direct'::TEXT, 'tax_id'::TEXT
        FROM public.entities e
        WHERE e.organization_id = _org_id
          AND e.tax_id IS NOT NULL
          AND lower(trim(e.tax_id)) = lower(_tax)
          AND (_exclude_id IS NULL OR e.id <> _exclude_id);
      END IF;

      IF _email IS NOT NULL THEN
        RETURN QUERY
        SELECT e.id, e.company_name::TEXT, 'direct'::TEXT, 'email'::TEXT
        FROM public.entities e
        WHERE e.organization_id = _org_id
          AND e.email IS NOT NULL
          AND lower(trim(e.email)) = lower(_email)
          AND (_exclude_id IS NULL OR e.id <> _exclude_id);
      END IF;

      IF _phone_digits IS NOT NULL THEN
        RETURN QUERY
        SELECT e.id, e.company_name::TEXT, 'direct'::TEXT, 'phone'::TEXT
        FROM public.entities e
        WHERE e.organization_id = _org_id
          AND e.phone IS NOT NULL
          AND regexp_replace(e.phone, '\D', '', 'g') = _phone_digits
          AND (_exclude_id IS NULL OR e.id <> _exclude_id);
      END IF;

      IF _company_name IS NOT NULL AND length(_company_name) >= 3 THEN
        RETURN QUERY
        SELECT e.id, e.company_name::TEXT, 'similar'::TEXT, 'company_name'::TEXT
        FROM public.entities e
        WHERE e.organization_id = _org_id
          AND (_exclude_id IS NULL OR e.id <> _exclude_id)
          AND (
            lower(e.company_name) = lower(_company_name)
            OR lower(e.company_name) LIKE '%' || lower(_company_name) || '%'
            OR lower(_company_name) LIKE '%' || lower(e.company_name) || '%'
            OR (_company_name_ar IS NOT NULL AND e.company_name_ar = _company_name_ar)
          )
        LIMIT 10;
      END IF;
    END;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_party_duplicates(TEXT, JSONB, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_party_duplicates(TEXT, JSONB, UUID) TO authenticated;