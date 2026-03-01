
-- Drop all super_admin_full_* policies that cause infinite recursion by self-referencing profiles table
-- The super_admin_all_* policies using get_user_role() SECURITY DEFINER function already provide the same access safely

DROP POLICY IF EXISTS "super_admin_full_admin_audit_log" ON public.admin_audit_log;
DROP POLICY IF EXISTS "super_admin_full_ai_usage_log" ON public.ai_usage_log;
DROP POLICY IF EXISTS "super_admin_full_backup_schedules" ON public.backup_schedules;
DROP POLICY IF EXISTS "super_admin_full_billing_rates" ON public.billing_rates;
DROP POLICY IF EXISTS "super_admin_full_calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "super_admin_full_case_activities" ON public.case_activities;
DROP POLICY IF EXISTS "super_admin_full_case_hearings" ON public.case_hearings;
DROP POLICY IF EXISTS "super_admin_full_case_notes" ON public.case_notes;
DROP POLICY IF EXISTS "super_admin_full_case_team_members" ON public.case_team_members;
DROP POLICY IF EXISTS "super_admin_full_cases" ON public.cases;
DROP POLICY IF EXISTS "super_admin_full_client_activities" ON public.client_activities;
DROP POLICY IF EXISTS "super_admin_full_client_contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "super_admin_full_client_messages" ON public.client_messages;
DROP POLICY IF EXISTS "super_admin_full_client_user_links" ON public.client_user_links;
DROP POLICY IF EXISTS "super_admin_full_clients" ON public.clients;
DROP POLICY IF EXISTS "super_admin_full_document_activities" ON public.document_activities;
DROP POLICY IF EXISTS "super_admin_full_document_templates" ON public.document_templates;
DROP POLICY IF EXISTS "super_admin_full_documents" ON public.documents;
DROP POLICY IF EXISTS "super_admin_full_email_queue" ON public.email_queue;
DROP POLICY IF EXISTS "super_admin_full_errand_activities" ON public.errand_activities;
DROP POLICY IF EXISTS "super_admin_full_errand_documents" ON public.errand_documents;
DROP POLICY IF EXISTS "super_admin_full_errand_notes" ON public.errand_notes;
DROP POLICY IF EXISTS "super_admin_full_errand_steps" ON public.errand_steps;
DROP POLICY IF EXISTS "super_admin_full_errand_templates" ON public.errand_templates;
DROP POLICY IF EXISTS "super_admin_full_errands" ON public.errands;
DROP POLICY IF EXISTS "super_admin_full_invitations" ON public.invitations;
DROP POLICY IF EXISTS "super_admin_full_invoice_line_items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "super_admin_full_invoices" ON public.invoices;
DROP POLICY IF EXISTS "super_admin_full_notification_preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "super_admin_full_notifications" ON public.notifications;
DROP POLICY IF EXISTS "super_admin_full_organizations" ON public.organizations;
DROP POLICY IF EXISTS "super_admin_full_payments" ON public.payments;
DROP POLICY IF EXISTS "super_admin_full_profiles" ON public.profiles;
DROP POLICY IF EXISTS "super_admin_full_saved_reports" ON public.saved_reports;
DROP POLICY IF EXISTS "super_admin_full_system_backups" ON public.system_backups;
DROP POLICY IF EXISTS "super_admin_full_task_comments" ON public.task_comments;
DROP POLICY IF EXISTS "super_admin_full_tasks" ON public.tasks;
DROP POLICY IF EXISTS "super_admin_full_time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "super_admin_full_whatsapp_queue" ON public.whatsapp_queue;

-- Fix platform_settings: replace recursive policy with safe one using get_user_role()
DROP POLICY IF EXISTS "super_admin_platform_settings" ON public.platform_settings;
CREATE POLICY "super_admin_all_platform_settings" ON public.platform_settings
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales_admin'))
  WITH CHECK (get_user_role(auth.uid()) IN ('super_admin', 'sales_admin'));
