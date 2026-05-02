ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS archive_read boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.has_archive_access(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _user_id
      AND p.organization_id = _org_id
      AND COALESCE(p.is_active, true) = true
      AND (p.role = 'firm_admin' OR COALESCE(p.archive_read, false) = true)
  );
$$;

DROP POLICY IF EXISTS "org staff manage documents" ON public.documents;
DROP POLICY IF EXISTS "org members manage documents" ON public.documents;

CREATE POLICY "staff read accessible documents" ON public.documents
  FOR SELECT TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'super_admin'
    OR (
      organization_id = public.get_user_org_id(auth.uid())
      AND (
        document_category IN ('template', 'shared_library')
        OR (case_id IS NOT NULL AND public.user_can_access_case(auth.uid(), case_id))
        OR (errand_id IS NOT NULL AND public.user_can_access_errand(auth.uid(), errand_id))
        OR (
          case_id IS NULL
          AND errand_id IS NULL
          AND public.has_archive_access(auth.uid(), organization_id)
        )
      )
    )
  );

CREATE POLICY "staff insert accessible documents" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_org_id(auth.uid())
    AND (
      document_category IN ('template', 'shared_library')
      OR (case_id IS NOT NULL AND public.user_can_access_case(auth.uid(), case_id))
      OR (errand_id IS NOT NULL AND public.user_can_access_errand(auth.uid(), errand_id))
      OR (
        case_id IS NULL
        AND errand_id IS NULL
        AND public.has_archive_access(auth.uid(), organization_id)
      )
    )
  );

CREATE POLICY "staff update accessible documents" ON public.documents
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'super_admin'
    OR (
      organization_id = public.get_user_org_id(auth.uid())
      AND (
        (case_id IS NOT NULL AND public.user_can_access_case(auth.uid(), case_id))
        OR (errand_id IS NOT NULL AND public.user_can_access_errand(auth.uid(), errand_id))
        OR public.has_archive_access(auth.uid(), organization_id)
      )
    )
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) = 'super_admin'
    OR (
      organization_id = public.get_user_org_id(auth.uid())
      AND (
        (case_id IS NOT NULL AND public.user_can_access_case(auth.uid(), case_id))
        OR (errand_id IS NOT NULL AND public.user_can_access_errand(auth.uid(), errand_id))
        OR public.has_archive_access(auth.uid(), organization_id)
      )
    )
  );

CREATE POLICY "staff delete accessible documents" ON public.documents
  FOR DELETE TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'super_admin'
    OR (
      organization_id = public.get_user_org_id(auth.uid())
      AND (
        (case_id IS NOT NULL AND public.user_can_access_case(auth.uid(), case_id))
        OR (errand_id IS NOT NULL AND public.user_can_access_errand(auth.uid(), errand_id))
        OR public.has_archive_access(auth.uid(), organization_id)
      )
    )
  );

CREATE OR REPLACE FUNCTION public.audit_archive_access_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.archive_read IS DISTINCT FROM OLD.archive_read THEN
    INSERT INTO public.firm_audit_log (
      organization_id, actor_id, event_type, target_table, target_id, target_name, details
    )
    VALUES (
      NEW.organization_id,
      auth.uid(),
      CASE WHEN NEW.archive_read THEN 'archive_access_granted' ELSE 'archive_access_revoked' END,
      'profiles',
      NEW.id,
      trim(coalesce(NEW.first_name, '') || ' ' || coalesce(NEW.last_name, '')),
      jsonb_build_object('archive_read', NEW.archive_read)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_archive_access_change ON public.profiles;
CREATE TRIGGER trg_audit_archive_access_change
  AFTER UPDATE OF archive_read
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_archive_access_change();
