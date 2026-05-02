CREATE OR REPLACE FUNCTION public.normalized_phone_key(_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _phone IS NULL THEN NULL
    ELSE right(regexp_replace(_phone, '\D', '', 'g'), 9)
  END;
$$;

CREATE OR REPLACE FUNCTION public.check_party_duplicates(
  _party_type text,
  _payload jsonb,
  _exclude_id uuid DEFAULT NULL
)
RETURNS TABLE (
  party_type text,
  party_id uuid,
  display_name text,
  match_type text,
  severity text,
  matched_value text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid := public.get_user_org_id(auth.uid());
  v_name text;
  v_name_ar text;
  v_email text;
  v_phone_key text;
  v_national_id text;
  v_registration text;
BEGIN
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization context for duplicate check';
  END IF;

  IF _party_type = 'person' THEN
    v_name := trim(concat_ws(' ', _payload->>'first_name', _payload->>'last_name'));
    v_name_ar := trim(concat_ws(' ', _payload->>'first_name_ar', _payload->>'last_name_ar'));
    v_email := lower(nullif(_payload->>'email', ''));
    v_phone_key := public.normalized_phone_key(coalesce(_payload->>'phone', _payload->>'whatsapp_number'));
    v_national_id := nullif(_payload->>'national_id_number', '');

    RETURN QUERY
    SELECT 'person'::text, p.id,
      trim(concat_ws(' ', p.first_name, p.last_name)) AS display_name,
      'national_id'::text, 'direct'::text, p.national_id_number
    FROM public.persons p
    WHERE p.organization_id = v_org_id
      AND (_exclude_id IS NULL OR p.id <> _exclude_id)
      AND v_national_id IS NOT NULL
      AND p.national_id_number = v_national_id;

    RETURN QUERY
    SELECT 'person'::text, p.id,
      trim(concat_ws(' ', p.first_name, p.last_name)) AS display_name,
      'email'::text, 'direct'::text, p.email
    FROM public.persons p
    WHERE p.organization_id = v_org_id
      AND (_exclude_id IS NULL OR p.id <> _exclude_id)
      AND v_email IS NOT NULL
      AND lower(p.email) = v_email;

    RETURN QUERY
    SELECT 'person'::text, p.id,
      trim(concat_ws(' ', p.first_name, p.last_name)) AS display_name,
      'phone'::text, 'possible'::text, coalesce(p.phone, p.whatsapp_number)
    FROM public.persons p
    WHERE p.organization_id = v_org_id
      AND (_exclude_id IS NULL OR p.id <> _exclude_id)
      AND v_phone_key IS NOT NULL
      AND public.normalized_phone_key(coalesce(p.phone, p.whatsapp_number)) = v_phone_key;

    RETURN QUERY
    SELECT 'person'::text, p.id,
      trim(concat_ws(' ', p.first_name, p.last_name)) AS display_name,
      'name'::text, 'possible'::text, trim(concat_ws(' ', p.first_name, p.last_name))
    FROM public.persons p
    WHERE p.organization_id = v_org_id
      AND (_exclude_id IS NULL OR p.id <> _exclude_id)
      AND (
        (length(v_name) >= 4 AND trim(concat_ws(' ', p.first_name, p.last_name)) ILIKE '%' || v_name || '%')
        OR (length(v_name_ar) >= 4 AND trim(concat_ws(' ', p.first_name_ar, p.last_name_ar)) ILIKE '%' || v_name_ar || '%')
      )
    LIMIT 5;
  ELSIF _party_type = 'entity' THEN
    v_name := nullif(_payload->>'company_name', '');
    v_name_ar := nullif(_payload->>'company_name_ar', '');
    v_email := lower(nullif(_payload->>'email', ''));
    v_phone_key := public.normalized_phone_key(_payload->>'phone');
    v_registration := nullif(_payload->>'company_registration_number', '');

    RETURN QUERY
    SELECT 'entity'::text, e.id, e.company_name,
      'registration_number'::text, 'direct'::text, e.company_registration_number
    FROM public.entities e
    WHERE e.organization_id = v_org_id
      AND (_exclude_id IS NULL OR e.id <> _exclude_id)
      AND v_registration IS NOT NULL
      AND e.company_registration_number = v_registration;

    RETURN QUERY
    SELECT 'entity'::text, e.id, e.company_name,
      'email'::text, 'direct'::text, e.email
    FROM public.entities e
    WHERE e.organization_id = v_org_id
      AND (_exclude_id IS NULL OR e.id <> _exclude_id)
      AND v_email IS NOT NULL
      AND lower(e.email) = v_email;

    RETURN QUERY
    SELECT 'entity'::text, e.id, e.company_name,
      'phone'::text, 'possible'::text, e.phone
    FROM public.entities e
    WHERE e.organization_id = v_org_id
      AND (_exclude_id IS NULL OR e.id <> _exclude_id)
      AND v_phone_key IS NOT NULL
      AND public.normalized_phone_key(e.phone) = v_phone_key;

    RETURN QUERY
    SELECT 'entity'::text, e.id, e.company_name,
      'name'::text, 'possible'::text, e.company_name
    FROM public.entities e
    WHERE e.organization_id = v_org_id
      AND (_exclude_id IS NULL OR e.id <> _exclude_id)
      AND (
        (length(v_name) >= 4 AND e.company_name ILIKE '%' || v_name || '%')
        OR (length(v_name_ar) >= 4 AND e.company_name_ar ILIKE '%' || v_name_ar || '%')
      )
    LIMIT 5;
  ELSE
    RAISE EXCEPTION 'Unsupported party type %', _party_type;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_party_duplicates(text, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_party_duplicates(text, jsonb, uuid) TO authenticated;
