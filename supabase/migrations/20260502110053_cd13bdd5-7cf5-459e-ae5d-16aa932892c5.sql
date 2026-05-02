-- Person duplicate check
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
SET search_path = public
AS $$
BEGIN
  IF NOT is_org_staff_member(auth.uid(), _organization_id) THEN
    RETURN;
  END IF;

  -- Exact: national_id
  IF _national_id IS NOT NULL AND length(trim(_national_id)) > 0 THEN
    RETURN QUERY
    SELECT p.id, p.full_name, p.full_name_ar, p.national_id, p.email, p.phone,
           'exact'::TEXT AS match_level, 'national_id'::TEXT AS match_field
    FROM public.persons p
    WHERE p.organization_id = _organization_id
      AND p.national_id IS NOT NULL
      AND lower(trim(p.national_id)) = lower(trim(_national_id))
      AND (_exclude_id IS NULL OR p.id <> _exclude_id);
  END IF;

  -- Exact: email
  IF _email IS NOT NULL AND length(trim(_email)) > 0 THEN
    RETURN QUERY
    SELECT p.id, p.full_name, p.full_name_ar, p.national_id, p.email, p.phone,
           'exact'::TEXT, 'email'::TEXT
    FROM public.persons p
    WHERE p.organization_id = _organization_id
      AND p.email IS NOT NULL
      AND lower(trim(p.email)) = lower(trim(_email))
      AND (_exclude_id IS NULL OR p.id <> _exclude_id);
  END IF;

  -- Exact: phone (digits-only compare)
  IF _phone IS NOT NULL AND length(regexp_replace(_phone, '\D', '', 'g')) >= 6 THEN
    RETURN QUERY
    SELECT p.id, p.full_name, p.full_name_ar, p.national_id, p.email, p.phone,
           'exact'::TEXT, 'phone'::TEXT
    FROM public.persons p
    WHERE p.organization_id = _organization_id
      AND p.phone IS NOT NULL
      AND regexp_replace(p.phone, '\D', '', 'g') = regexp_replace(_phone, '\D', '', 'g')
      AND (_exclude_id IS NULL OR p.id <> _exclude_id);
  END IF;

  -- Similar: full name (case-insensitive substring or trigram-like)
  IF _full_name IS NOT NULL AND length(trim(_full_name)) >= 3 THEN
    RETURN QUERY
    SELECT p.id, p.full_name, p.full_name_ar, p.national_id, p.email, p.phone,
           'similar'::TEXT, 'full_name'::TEXT
    FROM public.persons p
    WHERE p.organization_id = _organization_id
      AND (_exclude_id IS NULL OR p.id <> _exclude_id)
      AND (
        lower(p.full_name) = lower(trim(_full_name))
        OR lower(p.full_name) LIKE '%' || lower(trim(_full_name)) || '%'
        OR lower(trim(_full_name)) LIKE '%' || lower(p.full_name) || '%'
        OR (p.full_name_ar IS NOT NULL AND p.full_name_ar = trim(_full_name))
      )
    LIMIT 10;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_person_duplicates(UUID, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_person_duplicates(UUID, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;

-- Entity duplicate check
CREATE OR REPLACE FUNCTION public.check_entity_duplicates(
  _organization_id UUID,
  _company_name TEXT,
  _company_registration_number TEXT DEFAULT NULL,
  _tax_id TEXT DEFAULT NULL,
  _email TEXT DEFAULT NULL,
  _phone TEXT DEFAULT NULL,
  _exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  company_name TEXT,
  company_name_ar TEXT,
  company_registration_number TEXT,
  tax_id TEXT,
  email TEXT,
  phone TEXT,
  match_level TEXT,
  match_field TEXT
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

  IF _company_registration_number IS NOT NULL AND length(trim(_company_registration_number)) > 0 THEN
    RETURN QUERY
    SELECT e.id, e.company_name, e.company_name_ar, e.company_registration_number, e.tax_id, e.email, e.phone,
           'exact'::TEXT, 'company_registration_number'::TEXT
    FROM public.entities e
    WHERE e.organization_id = _organization_id
      AND e.company_registration_number IS NOT NULL
      AND lower(trim(e.company_registration_number)) = lower(trim(_company_registration_number))
      AND (_exclude_id IS NULL OR e.id <> _exclude_id);
  END IF;

  IF _tax_id IS NOT NULL AND length(trim(_tax_id)) > 0 THEN
    RETURN QUERY
    SELECT e.id, e.company_name, e.company_name_ar, e.company_registration_number, e.tax_id, e.email, e.phone,
           'exact'::TEXT, 'tax_id'::TEXT
    FROM public.entities e
    WHERE e.organization_id = _organization_id
      AND e.tax_id IS NOT NULL
      AND lower(trim(e.tax_id)) = lower(trim(_tax_id))
      AND (_exclude_id IS NULL OR e.id <> _exclude_id);
  END IF;

  IF _email IS NOT NULL AND length(trim(_email)) > 0 THEN
    RETURN QUERY
    SELECT e.id, e.company_name, e.company_name_ar, e.company_registration_number, e.tax_id, e.email, e.phone,
           'exact'::TEXT, 'email'::TEXT
    FROM public.entities e
    WHERE e.organization_id = _organization_id
      AND e.email IS NOT NULL
      AND lower(trim(e.email)) = lower(trim(_email))
      AND (_exclude_id IS NULL OR e.id <> _exclude_id);
  END IF;

  IF _phone IS NOT NULL AND length(regexp_replace(_phone, '\D', '', 'g')) >= 6 THEN
    RETURN QUERY
    SELECT e.id, e.company_name, e.company_name_ar, e.company_registration_number, e.tax_id, e.email, e.phone,
           'exact'::TEXT, 'phone'::TEXT
    FROM public.entities e
    WHERE e.organization_id = _organization_id
      AND e.phone IS NOT NULL
      AND regexp_replace(e.phone, '\D', '', 'g') = regexp_replace(_phone, '\D', '', 'g')
      AND (_exclude_id IS NULL OR e.id <> _exclude_id);
  END IF;

  IF _company_name IS NOT NULL AND length(trim(_company_name)) >= 3 THEN
    RETURN QUERY
    SELECT e.id, e.company_name, e.company_name_ar, e.company_registration_number, e.tax_id, e.email, e.phone,
           'similar'::TEXT, 'company_name'::TEXT
    FROM public.entities e
    WHERE e.organization_id = _organization_id
      AND (_exclude_id IS NULL OR e.id <> _exclude_id)
      AND (
        lower(e.company_name) = lower(trim(_company_name))
        OR lower(e.company_name) LIKE '%' || lower(trim(_company_name)) || '%'
        OR lower(trim(_company_name)) LIKE '%' || lower(e.company_name) || '%'
        OR (e.company_name_ar IS NOT NULL AND e.company_name_ar = trim(_company_name))
      )
    LIMIT 10;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_entity_duplicates(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_entity_duplicates(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;