ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS main_admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_main_admin ON public.organizations(main_admin_id);

UPDATE public.organizations o
SET main_admin_id = chosen.id
FROM (
  SELECT DISTINCT ON (organization_id) id, organization_id
  FROM public.profiles
  WHERE role = 'firm_admin'
    AND COALESCE(is_active, true) = true
    AND organization_id IS NOT NULL
  ORDER BY organization_id, created_at ASC NULLS LAST
) chosen
WHERE o.id = chosen.organization_id
  AND o.main_admin_id IS NULL;

CREATE OR REPLACE FUNCTION public.validate_organization_main_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.main_admin_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = NEW.main_admin_id
      AND p.organization_id = NEW.id
      AND p.role = 'firm_admin'
      AND COALESCE(p.is_active, true) = true
  ) THEN
    RAISE EXCEPTION 'Main admin must be an active firm_admin in the same organization';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_organization_main_admin ON public.organizations;
CREATE TRIGGER trg_validate_organization_main_admin
  BEFORE INSERT OR UPDATE OF main_admin_id
  ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_organization_main_admin();

CREATE OR REPLACE FUNCTION public.set_first_main_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role = 'firm_admin'
    AND COALESCE(NEW.is_active, true) = true
    AND NEW.organization_id IS NOT NULL THEN
    UPDATE public.organizations
    SET main_admin_id = NEW.id
    WHERE id = NEW.organization_id
      AND main_admin_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_first_main_admin ON public.profiles;
CREATE TRIGGER trg_set_first_main_admin
  AFTER INSERT OR UPDATE OF role, is_active, organization_id
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_first_main_admin();

CREATE OR REPLACE FUNCTION public.protect_main_admin_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.main_admin_id = OLD.id
    ) THEN
      RAISE EXCEPTION 'The protected main firm admin cannot be deleted. Transfer main admin first.';
    END IF;
    RETURN OLD;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.main_admin_id = OLD.id
  ) THEN
    IF NEW.role <> 'firm_admin'
      OR COALESCE(NEW.is_active, true) = false
      OR NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
      RAISE EXCEPTION 'The protected main firm admin cannot be demoted, deactivated, or moved. Transfer main admin first.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_main_admin_profile_update ON public.profiles;
CREATE TRIGGER trg_protect_main_admin_profile_update
  BEFORE UPDATE OF role, is_active, organization_id
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_main_admin_profile();

DROP TRIGGER IF EXISTS trg_protect_main_admin_profile_delete ON public.profiles;
CREATE TRIGGER trg_protect_main_admin_profile_delete
  BEFORE DELETE
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_main_admin_profile();

CREATE OR REPLACE FUNCTION public.transfer_main_admin(_organization_id uuid, _new_admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor_role text := public.get_user_role(auth.uid());
  v_actor_org uuid := public.get_user_org_id(auth.uid());
BEGIN
  IF v_actor_role <> 'super_admin'
    AND NOT (v_actor_role = 'firm_admin' AND v_actor_org = _organization_id) THEN
    RAISE EXCEPTION 'Only super admin or firm admin can transfer main admin';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _new_admin_id
      AND p.organization_id = _organization_id
      AND p.role = 'firm_admin'
      AND COALESCE(p.is_active, true) = true
  ) THEN
    RAISE EXCEPTION 'New main admin must be an active firm_admin in the organization';
  END IF;

  UPDATE public.organizations
  SET main_admin_id = _new_admin_id
  WHERE id = _organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_main_admin(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_main_admin(uuid, uuid) TO authenticated;
