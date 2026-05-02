-- 1. Add main_admin_id to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS main_admin_id uuid;

-- 2. Backfill: pick earliest active firm_admin per org
UPDATE public.organizations o
SET main_admin_id = sub.id
FROM (
  SELECT DISTINCT ON (organization_id)
    organization_id, id
  FROM public.profiles
  WHERE role = 'firm_admin'
    AND COALESCE(is_active, true) = true
  ORDER BY organization_id, created_at ASC NULLS LAST, id ASC
) sub
WHERE o.id = sub.organization_id
  AND o.main_admin_id IS NULL;

-- 3. Trigger function: protect main admin from delete/demote/deactivate/org move
CREATE OR REPLACE FUNCTION public.protect_main_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_main_admin_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT main_admin_id INTO v_main_admin_id
    FROM public.organizations WHERE id = OLD.organization_id;
    IF v_main_admin_id IS NOT NULL AND OLD.id = v_main_admin_id THEN
      RAISE EXCEPTION 'Cannot delete the main admin of the firm. Transfer the main admin role first.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT main_admin_id INTO v_main_admin_id
    FROM public.organizations WHERE id = OLD.organization_id;

    IF v_main_admin_id IS NOT NULL AND OLD.id = v_main_admin_id THEN
      IF NEW.role IS DISTINCT FROM OLD.role AND NEW.role <> 'firm_admin' THEN
        RAISE EXCEPTION 'Cannot change the role of the firm''s main admin. Transfer the main admin role first.';
      END IF;
      IF COALESCE(NEW.is_active, true) = false AND COALESCE(OLD.is_active, true) = true THEN
        RAISE EXCEPTION 'Cannot deactivate the firm''s main admin. Transfer the main admin role first.';
      END IF;
      IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
        RAISE EXCEPTION 'Cannot move the firm''s main admin to another organization. Transfer the main admin role first.';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_main_admin ON public.profiles;
CREATE TRIGGER trg_protect_main_admin
BEFORE UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_main_admin();

-- 4. RPC: transfer_main_admin
CREATE OR REPLACE FUNCTION public.transfer_main_admin(_new_admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_org uuid;
  v_current_main uuid;
  v_target_org uuid;
  v_target_role text;
  v_target_active boolean;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT organization_id INTO v_org FROM public.profiles WHERE id = v_caller;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Caller has no organization';
  END IF;

  SELECT main_admin_id INTO v_current_main FROM public.organizations WHERE id = v_org;
  IF v_current_main IS NULL OR v_current_main <> v_caller THEN
    RAISE EXCEPTION 'Only the current main admin can transfer the role';
  END IF;

  SELECT organization_id, role, COALESCE(is_active, true)
    INTO v_target_org, v_target_role, v_target_active
  FROM public.profiles WHERE id = _new_admin_id;

  IF v_target_org IS NULL OR v_target_org <> v_org THEN
    RAISE EXCEPTION 'Target user is not in your organization';
  END IF;
  IF NOT v_target_active THEN
    RAISE EXCEPTION 'Target user is not active';
  END IF;
  IF v_target_role <> 'firm_admin' THEN
    RAISE EXCEPTION 'Target user must already be a firm admin';
  END IF;

  UPDATE public.organizations SET main_admin_id = _new_admin_id WHERE id = v_org;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_main_admin(uuid) TO authenticated;
