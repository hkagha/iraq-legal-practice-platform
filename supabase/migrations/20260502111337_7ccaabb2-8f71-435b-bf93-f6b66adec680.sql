-- RPC: create_errand_with_team
-- Atomically creates an errand and adds creator + assignee to errand_team_members
-- so RLS policies (which typically grant access via team membership) allow the
-- creator to immediately read/update the new row.

CREATE OR REPLACE FUNCTION public.create_errand_with_team(_errand jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_caller_org uuid;
  v_caller_role text;
  v_caller_active boolean;
  v_assigned_to uuid;
  v_new_id uuid;
  v_errand_number text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_org_id := NULLIF(_errand->>'organization_id','')::uuid;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;

  -- Validate caller is active staff in same organization
  SELECT organization_id, role, COALESCE(is_active, true)
  INTO v_caller_org, v_caller_role, v_caller_active
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_caller_org IS NULL OR v_caller_org <> v_org_id THEN
    RAISE EXCEPTION 'Access denied: organization mismatch';
  END IF;
  IF NOT v_caller_active THEN
    RAISE EXCEPTION 'Access denied: inactive user';
  END IF;
  IF v_caller_role NOT IN ('firm_admin','lawyer','paralegal','secretary','accountant') THEN
    RAISE EXCEPTION 'Access denied: insufficient role';
  END IF;

  v_assigned_to := NULLIF(_errand->>'assigned_to','')::uuid;

  -- Generate errand number if not provided / empty
  v_errand_number := NULLIF(_errand->>'errand_number','');
  IF v_errand_number IS NULL THEN
    v_errand_number := 'ERR-' || to_char(now(), 'YYYY') || '-' ||
      lpad(((floor(random() * 9000) + 1000))::text, 4, '0');
  END IF;

  INSERT INTO public.errands (
    organization_id,
    errand_number,
    title,
    title_ar,
    description,
    description_ar,
    errand_type,
    status,
    priority,
    due_date,
    case_id,
    assigned_to,
    is_visible_to_client,
    party_type,
    person_id,
    entity_id,
    created_by
  ) VALUES (
    v_org_id,
    v_errand_number,
    _errand->>'title',
    NULLIF(_errand->>'title_ar',''),
    NULLIF(_errand->>'description',''),
    NULLIF(_errand->>'description_ar',''),
    COALESCE(NULLIF(_errand->>'errand_type',''), 'other'),
    COALESCE(NULLIF(_errand->>'status',''), 'intake'),
    COALESCE(NULLIF(_errand->>'priority',''), 'normal'),
    NULLIF(_errand->>'due_date','')::date,
    NULLIF(_errand->>'case_id','')::uuid,
    v_assigned_to,
    COALESCE((_errand->>'is_visible_to_client')::boolean, false),
    NULLIF(_errand->>'party_type',''),
    NULLIF(_errand->>'person_id','')::uuid,
    NULLIF(_errand->>'entity_id','')::uuid,
    v_user_id
  )
  RETURNING id INTO v_new_id;

  -- Add creator to team
  INSERT INTO public.errand_team_members (errand_id, user_id, role, added_by)
  VALUES (v_new_id, v_user_id, 'lead', v_user_id)
  ON CONFLICT DO NOTHING;

  -- Add assignee to team if different
  IF v_assigned_to IS NOT NULL AND v_assigned_to <> v_user_id THEN
    INSERT INTO public.errand_team_members (errand_id, user_id, role, added_by)
    VALUES (v_new_id, v_assigned_to, 'member', v_user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_errand_with_team(jsonb) TO authenticated;
