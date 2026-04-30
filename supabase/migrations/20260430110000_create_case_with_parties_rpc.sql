-- Atomic case intake: create the case and its parties in one database transaction.

CREATE OR REPLACE FUNCTION public.create_case_with_parties(_case jsonb, _parties jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case_id uuid;
  v_org_id uuid;
  v_party jsonb;
  v_has_client boolean := false;
BEGIN
  v_org_id := (_case->>'organization_id')::uuid;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;

  IF public.get_user_role(auth.uid()) <> 'super_admin'
     AND v_org_id <> public.get_user_org_id(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to create a case in this organization';
  END IF;

  IF jsonb_typeof(_parties) <> 'array' OR jsonb_array_length(_parties) = 0 THEN
    RAISE EXCEPTION 'A case requires at least one party';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(_parties) p
    WHERE p->>'role' = 'client'
  ) INTO v_has_client;

  IF NOT v_has_client THEN
    RAISE EXCEPTION 'A case requires at least one client party';
  END IF;

  INSERT INTO public.cases (
    organization_id,
    case_number,
    title,
    title_ar,
    description,
    description_ar,
    case_type,
    status,
    priority,
    court_name,
    court_name_ar,
    court_type,
    court_case_number,
    judge_name,
    judge_name_ar,
    filing_date,
    estimated_value,
    is_visible_to_client,
    created_by
  )
  VALUES (
    v_org_id,
    COALESCE(NULLIF(_case->>'case_number', ''), 'PENDING'),
    _case->>'title',
    NULLIF(_case->>'title_ar', ''),
    NULLIF(_case->>'description', ''),
    NULLIF(_case->>'description_ar', ''),
    COALESCE(_case->>'case_type', 'civil'),
    COALESCE(_case->>'status', 'intake'),
    COALESCE(_case->>'priority', 'medium'),
    NULLIF(_case->>'court_name', ''),
    NULLIF(_case->>'court_name_ar', ''),
    NULLIF(_case->>'court_type', ''),
    NULLIF(_case->>'court_case_number', ''),
    NULLIF(_case->>'judge_name', ''),
    NULLIF(_case->>'judge_name_ar', ''),
    NULLIF(_case->>'filing_date', '')::date,
    NULLIF(_case->>'estimated_value', '')::numeric,
    true,
    COALESCE((_case->>'created_by')::uuid, auth.uid())
  )
  RETURNING id INTO v_case_id;

  FOR v_party IN SELECT * FROM jsonb_array_elements(_parties)
  LOOP
    INSERT INTO public.case_parties (
      case_id,
      organization_id,
      party_type,
      person_id,
      entity_id,
      role,
      is_primary
    )
    VALUES (
      v_case_id,
      v_org_id,
      v_party->>'party_type',
      NULLIF(v_party->>'person_id', '')::uuid,
      NULLIF(v_party->>'entity_id', '')::uuid,
      COALESCE(v_party->>'role', 'client'),
      COALESCE((v_party->>'is_primary')::boolean, false)
    );
  END LOOP;

  RETURN v_case_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_case_with_parties(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_case_with_parties(jsonb, jsonb) TO authenticated;
