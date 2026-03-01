-- Fix 1: Role constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('super_admin', 'sales_admin', 'firm_admin', 'lawyer', 'paralegal', 'secretary', 'accountant', 'client'));

ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_role_check;
ALTER TABLE public.invitations ADD CONSTRAINT invitations_role_check 
  CHECK (role IN ('firm_admin', 'lawyer', 'paralegal', 'secretary', 'accountant', 'client'));

-- Fix 2: AI config columns
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'openai';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS ai_api_key_encrypted TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'gpt-4o';

-- Fix 3: Ensure super admin RLS on all tables
DO $$
DECLARE
  tbl TEXT;
  pol TEXT;
  tables TEXT[] := ARRAY[
    'admin_audit_log', 'ai_usage_log', 'backup_schedules', 'billing_rates',
    'calendar_events', 'case_activities', 'case_hearings', 'case_notes',
    'case_team_members', 'cases', 'client_activities', 'client_contacts',
    'client_messages', 'client_user_links', 'clients', 'document_activities',
    'document_templates', 'documents', 'email_queue', 'errand_activities',
    'errand_documents', 'errand_notes', 'errand_steps', 'errand_templates',
    'errands', 'invitations', 'invoice_line_items', 'invoices',
    'notification_preferences', 'notifications', 'organizations', 'payments',
    'profiles', 'saved_reports', 'system_backups', 'task_comments',
    'tasks', 'time_entries', 'whatsapp_queue'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    pol := 'super_admin_full_' || tbl;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated
       USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = ''super_admin''))
       WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = ''super_admin''))',
      pol, tbl
    );
  END LOOP;
END $$;