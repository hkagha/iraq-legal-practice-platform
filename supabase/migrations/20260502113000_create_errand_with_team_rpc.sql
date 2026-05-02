CREATE OR REPLACE FUNCTION public.create_errand_with_team(_errand jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_errand_id uuid;
  v_assigned_to uuid;
  v_party_type text;
  v_entity_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_org_id := (_errand->>'organization_id')::uuid;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;

  IF NOT public.is_org_staff_member(v_user_id, v_org_id) THEN
    RAISE EXCEPTION 'Access denied: not a staff member of this organization';
  END IF;

  v_party_type := NULLIF(_errand->>'party_type', '');
  IF v_party_type IS NULL THEN
    RAISE EXCEPTION 'An errand must have a client party';
  END IF;

  IF v_party_type = 'entity' THEN
    v_entity_id := NULLIF(_errand->>'entity_id', '')::uuid;
    IF v_entity_id IS NULL THEN
      RAISE EXCEPTION 'Entity client requires entity_id';
    END IF;
    IF NOT public.entity_has_active_representative(v_entity_id) THEN
      RAISE EXCEPTION 'Entity client must have at least one active representative';
    END IF;
  END IF;

  v_assigned_to := COALESCE(NULLIF(_errand->>'assigned_to', '')::uuid, v_user_id);

  INSERT INTO public.errands (
    organization_id, errand_number, title, title_ar, description, description_ar,
    errand_type, status, priority, party_type, person_id, entity_id, case_id,
    assigned_to, due_date, is_visible_to_client, created_by,
    billing_type, hourly_rate, fixed_fee_amount, retainer_amount,
    contingency_percentage, estimated_value, estimated_value_currency
  )
  VALUES (
    v_org_id,
    COALESCE(_errand->>'errand_number', ''),
    _errand->>'title',
    NULLIF(_errand->>'title_ar', ''),
    NULLIF(_errand->>'description', ''),
    NULLIF(_errand->>'description_ar', ''),
    COALESCE(_errand->>'errand_type', 'other'),
    COALESCE(_errand->>'status', 'intake'),
    COALESCE(_errand->>'priority', 'normal'),
    v_party_type,
    NULLIF(_errand->>'person_id', '')::uuid,
    NULLIF(_errand->>'entity_id', '')::uuid,
    NULLIF(_errand->>'case_id', '')::uuid,
    v_assigned_to,
    NULLIF(_errand->>'due_date', '')::date,
    COALESCE((_errand->>'is_visible_to_client')::boolean, true),
    COALESCE(NULLIF(_errand->>'created_by', '')::uuid, v_user_id),
    COALESCE(NULLIF(_errand->>'billing_type', ''), 'fixed_fee'),
    NULLIF(_errand->>'hourly_rate', '')::numeric,
    NULLIF(_errand->>'fixed_fee_amount', '')::numeric,
    NULLIF(_errand->>'retainer_amount', '')::numeric,
    NULLIF(_errand->>'contingency_percentage', '')::numeric,
    NULLIF(_errand->>'estimated_value', '')::numeric,
    COALESCE(NULLIF(_errand->>'estimated_value_currency', ''), 'IQD')
  )
  RETURNING id INTO v_errand_id;

  INSERT INTO public.errand_team_members (organization_id, errand_id, user_id, role, assigned_by)
  VALUES (v_org_id, v_errand_id, v_user_id, 'creator', v_user_id)
  ON CONFLICT (errand_id, user_id) DO NOTHING;

  IF v_assigned_to IS NOT NULL THEN
    INSERT INTO public.errand_team_members (organization_id, errand_id, user_id, role, assigned_by)
    VALUES (v_org_id, v_errand_id, v_assigned_to, 'lead', v_user_id)
    ON CONFLICT (errand_id, user_id) DO NOTHING;
  END IF;

  RETURN v_errand_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_errand_with_team(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_errand_with_team(jsonb) TO authenticated;
