
-- system_backups table
CREATE TABLE public.system_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_name TEXT NOT NULL,
  backup_type TEXT NOT NULL,
  scope TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  includes_database BOOLEAN NOT NULL DEFAULT true,
  includes_storage BOOLEAN NOT NULL DEFAULT false,
  tables_included TEXT[] DEFAULT NULL,
  data_file_path TEXT,
  data_size_bytes BIGINT DEFAULT 0,
  record_counts JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'in_progress',
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_backups_type ON public.system_backups(backup_type);
CREATE INDEX idx_system_backups_scope ON public.system_backups(scope);
CREATE INDEX idx_system_backups_status ON public.system_backups(status);
CREATE INDEX idx_system_backups_org ON public.system_backups(organization_id);
CREATE INDEX idx_system_backups_created ON public.system_backups(created_at DESC);

ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_manage_backups" ON public.system_backups
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "firm_admin_view_org_backups" ON public.system_backups
  FOR SELECT TO authenticated
  USING (
    scope = 'organization' AND
    organization_id = get_user_org_id(auth.uid()) AND
    get_user_role(auth.uid()) = 'firm_admin'
  );

-- backup_schedules table
CREATE TABLE public.backup_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  scope TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  includes_database BOOLEAN NOT NULL DEFAULT true,
  includes_storage BOOLEAN NOT NULL DEFAULT false,
  tables_included TEXT[] DEFAULT NULL,
  frequency TEXT NOT NULL,
  day_of_week INTEGER,
  day_of_month INTEGER,
  preferred_time TIME NOT NULL DEFAULT '03:00',
  timezone TEXT NOT NULL DEFAULT 'Asia/Baghdad',
  retention_days INTEGER NOT NULL DEFAULT 30,
  max_backups INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  next_run_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_backup_schedules_active ON public.backup_schedules(is_active) WHERE is_active = true;
CREATE INDEX idx_backup_schedules_next ON public.backup_schedules(next_run_at);

ALTER TABLE public.backup_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_manage_schedules" ON public.backup_schedules
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'super_admin');

CREATE TRIGGER update_backup_schedules_updated_at BEFORE UPDATE ON public.backup_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_system_backup()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.backup_type NOT IN ('full', 'organization', 'incremental', 'manual', 'scheduled') THEN
    RAISE EXCEPTION 'Invalid backup_type: %', NEW.backup_type;
  END IF;
  IF NEW.scope NOT IN ('system', 'organization') THEN
    RAISE EXCEPTION 'Invalid scope: %', NEW.scope;
  END IF;
  IF NEW.status NOT IN ('in_progress', 'completed', 'failed', 'expired', 'deleted') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_system_backup_trigger BEFORE INSERT OR UPDATE ON public.system_backups
  FOR EACH ROW EXECUTE FUNCTION public.validate_system_backup();

CREATE OR REPLACE FUNCTION public.validate_backup_schedule()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.scope NOT IN ('system', 'organization') THEN
    RAISE EXCEPTION 'Invalid scope: %', NEW.scope;
  END IF;
  IF NEW.frequency NOT IN ('daily', 'weekly', 'biweekly', 'monthly') THEN
    RAISE EXCEPTION 'Invalid frequency: %', NEW.frequency;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_backup_schedule_trigger BEFORE INSERT OR UPDATE ON public.backup_schedules
  FOR EACH ROW EXECUTE FUNCTION public.validate_backup_schedule();

-- system-backups storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('system-backups', 'system-backups', false, 524288000);

-- Storage RLS for system-backups bucket
CREATE POLICY "super_admin_manage_backup_files" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'system-backups' AND get_user_role(auth.uid()) = 'super_admin')
  WITH CHECK (bucket_id = 'system-backups' AND get_user_role(auth.uid()) = 'super_admin');
