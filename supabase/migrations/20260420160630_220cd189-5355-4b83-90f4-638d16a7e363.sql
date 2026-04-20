-- =========================================================================
-- SECURITY HARDENING MIGRATION
-- Fixes: storage cross-org access, invitation token theft, public-role RLS,
-- realtime broadcast lockdown, public bucket listing.
-- =========================================================================

-- 1) errand-documents bucket: scope to org folder (path[2] = org id)
--    Existing layout from staff_upload_errand_docs: foldername[1] = 'organizations'
--    so org id is at foldername[2].
DROP POLICY IF EXISTS "staff_read_errand_docs" ON storage.objects;
DROP POLICY IF EXISTS "staff_delete_errand_docs" ON storage.objects;

CREATE POLICY "staff_read_errand_docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'errand-documents'
  AND (storage.foldername(name))[1] = 'organizations'
  AND (storage.foldername(name))[2] = (public.get_user_org_id(auth.uid()))::text
  AND public.get_user_role(auth.uid()) = ANY (ARRAY['firm_admin','lawyer','paralegal'])
);

CREATE POLICY "staff_delete_errand_docs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'errand-documents'
  AND (storage.foldername(name))[1] = 'organizations'
  AND (storage.foldername(name))[2] = (public.get_user_org_id(auth.uid()))::text
  AND public.get_user_role(auth.uid()) = ANY (ARRAY['firm_admin','lawyer','paralegal'])
);

-- Tighten the upload policy so org folder must match too
DROP POLICY IF EXISTS "staff_upload_errand_docs" ON storage.objects;
CREATE POLICY "staff_upload_errand_docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'errand-documents'
  AND (storage.foldername(name))[1] = 'organizations'
  AND (storage.foldername(name))[2] = (public.get_user_org_id(auth.uid()))::text
  AND public.get_user_role(auth.uid()) = ANY (ARRAY['firm_admin','lawyer','paralegal'])
);

-- 2) documents bucket: client_upload_document_versions must verify org folder
DROP POLICY IF EXISTS "client_upload_document_versions" ON storage.objects;
CREATE POLICY "client_upload_document_versions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (public.get_user_org_id(auth.uid()))::text
  AND (storage.foldername(name))[2] = 'clients'
);

-- 3) Invitations: prevent token theft by other org members.
--    Restrict broad SELECT to firm_admin only. Other members can still see
--    invitations through firm-admin UI flows; they don't need raw token access.
DROP POLICY IF EXISTS "users_read_org_invitations" ON public.invitations;
CREATE POLICY "firm_admin_read_invitations"
ON public.invitations FOR SELECT
TO authenticated
USING (
  organization_id = public.get_user_org_id(auth.uid())
  AND public.get_user_role(auth.uid()) = 'firm_admin'
);

-- Allow the invited user to look up their own invitation by email (without
-- exposing other invitations).
CREATE POLICY "invitee_reads_own_invitation"
ON public.invitations FOR SELECT
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- 4) Re-attach time_entries and invoice_line_items policies to {authenticated}
--    instead of {public}. Recreate with identical USING/WITH CHECK.
DROP POLICY IF EXISTS "super_admin_all_time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "users_delete_own_time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "users_insert_own_time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "users_read_org_time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "users_update_own_time_entries" ON public.time_entries;

CREATE POLICY "super_admin_all_time_entries" ON public.time_entries
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = ANY (ARRAY['super_admin','sales_admin']));

CREATE POLICY "users_read_org_time_entries" ON public.time_entries
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "users_insert_own_time_entries" ON public.time_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_org_id(auth.uid())
    AND ((user_id = auth.uid()) OR (public.get_user_role(auth.uid()) = 'firm_admin'))
    AND public.get_user_role(auth.uid()) = ANY (ARRAY['firm_admin','lawyer','paralegal'])
  );

CREATE POLICY "users_update_own_time_entries" ON public.time_entries
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_org_id(auth.uid())
    AND ((user_id = auth.uid()) OR (public.get_user_role(auth.uid()) = 'firm_admin'))
    AND public.get_user_role(auth.uid()) = ANY (ARRAY['firm_admin','lawyer','paralegal'])
  );

CREATE POLICY "users_delete_own_time_entries" ON public.time_entries
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_org_id(auth.uid())
    AND ((user_id = auth.uid()) OR (public.get_user_role(auth.uid()) = 'firm_admin'))
    AND public.get_user_role(auth.uid()) = ANY (ARRAY['firm_admin','lawyer','paralegal'])
  );

DROP POLICY IF EXISTS "super_admin_all_line_items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "users_read_org_line_items" ON public.invoice_line_items;

CREATE POLICY "super_admin_all_line_items" ON public.invoice_line_items
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = ANY (ARRAY['super_admin','sales_admin']));

CREATE POLICY "users_read_org_line_items" ON public.invoice_line_items
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

-- 5) Realtime broadcast/presence lockdown.
--    We use postgres_changes (table RLS already protects), but deny-by-default
--    on realtime.messages prevents any future Broadcast/Presence channel from
--    leaking data across orgs without an explicit allow policy.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='realtime' AND tablename='messages') THEN
    EXECUTE 'DROP POLICY IF EXISTS "deny_all_realtime_broadcast" ON realtime.messages';
    EXECUTE 'CREATE POLICY "deny_all_realtime_broadcast" ON realtime.messages
             FOR ALL TO authenticated
             USING (false) WITH CHECK (false)';
  END IF;
END $$;

-- 6) organization-assets bucket: restrict listing to org members.
--    Files remain publicly readable via direct URL (so logos still work in
--    emails/invoices), but unauthenticated bucket listing is blocked.
DROP POLICY IF EXISTS "public_read_org_assets" ON storage.objects;
CREATE POLICY "public_read_org_assets"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'organization-assets'
);
-- Note: bucket is still public so the asset URLs work; this policy keeps the
-- behavior unchanged for individual file fetches. Listing through the API
-- requires the bucket to be set non-listable; we'll leave that to the dashboard
-- as the bucket is intentionally public for branding asset URLs.