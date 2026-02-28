
-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  task_type TEXT NOT NULL DEFAULT 'general',
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  errand_id UUID REFERENCES public.errands(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id),
  assigned_by UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date DATE,
  due_time TIME,
  start_date DATE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id),
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  recurrence_end_date DATE,
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  estimated_minutes INTEGER,
  actual_minutes INTEGER,
  checklist JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_org ON public.tasks(organization_id);
CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);
CREATE INDEX idx_tasks_due ON public.tasks(due_date);
CREATE INDEX idx_tasks_case ON public.tasks(case_id);
CREATE INDEX idx_tasks_errand ON public.tasks(errand_id);
CREATE INDEX idx_tasks_client ON public.tasks(client_id);
CREATE INDEX idx_tasks_type ON public.tasks(task_type);
CREATE INDEX idx_tasks_created ON public.tasks(created_at DESC);

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Task comments table
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  content_ar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_comments_task ON public.task_comments(task_id);

CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Calendar events table
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  event_type TEXT NOT NULL DEFAULT 'meeting',
  start_date DATE NOT NULL,
  start_time TIME,
  end_date DATE,
  end_time TIME,
  is_all_day BOOLEAN DEFAULT false,
  location TEXT,
  location_ar TEXT,
  is_virtual BOOLEAN DEFAULT false,
  virtual_link TEXT,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  participants UUID[] DEFAULT '{}',
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  recurrence_end_date DATE,
  color TEXT DEFAULT '#C9A84C',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cal_events_org ON public.calendar_events(organization_id);
CREATE INDEX idx_cal_events_start ON public.calendar_events(start_date);
CREATE INDEX idx_cal_events_type ON public.calendar_events(event_type);
CREATE INDEX idx_cal_events_case ON public.calendar_events(case_id);

CREATE TRIGGER update_cal_events_updated_at BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_org_tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "staff_create_tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_org_id(auth.uid())
    AND get_user_role(auth.uid()) IN ('firm_admin','lawyer','paralegal')
  );

CREATE POLICY "staff_update_own_tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND (
      assigned_to = auth.uid()
      OR created_by = auth.uid()
      OR get_user_role(auth.uid()) = 'firm_admin'
    )
  );

CREATE POLICY "admin_delete_tasks" ON public.tasks
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND (
      created_by = auth.uid()
      OR get_user_role(auth.uid()) = 'firm_admin'
    )
  );

CREATE POLICY "super_admin_all_tasks" ON public.tasks
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('super_admin','sales_admin'));

-- RLS for task_comments
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_org_task_comments" ON public.task_comments
  FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "staff_create_task_comments" ON public.task_comments
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "super_admin_all_task_comments" ON public.task_comments
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('super_admin','sales_admin'));

-- RLS for calendar_events
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_org_cal_events" ON public.calendar_events
  FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "staff_manage_cal_events" ON public.calendar_events
  FOR ALL TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND get_user_role(auth.uid()) IN ('firm_admin','lawyer','paralegal')
  );

CREATE POLICY "super_admin_all_cal_events" ON public.calendar_events
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('super_admin','sales_admin'));
