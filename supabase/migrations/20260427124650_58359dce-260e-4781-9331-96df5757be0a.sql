-- Fix linter warning: Public Bucket Allows Listing on 'organization-assets'
-- The bucket remains public so org logos remain readable via public URLs
-- (which bypass RLS via /storage/v1/object/public/...). Removing the broad
-- SELECT policy on storage.objects prevents anonymous LIST calls while
-- keeping individual public file reads working.

DROP POLICY IF EXISTS "public_read_org_assets" ON storage.objects;

-- Add a narrow read policy so authenticated org members can list their
-- own org's assets (needed for in-app management UI), while anonymous
-- users can no longer enumerate the bucket.
CREATE POLICY "org_members_list_own_assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'organization-assets'
  AND (storage.foldername(name))[1] = (public.get_user_org_id(auth.uid()))::text
);

-- Note on Leaked Password Protection (HaveIBeenPwned):
-- This was enabled programmatically via the Auth configuration API
-- (password_hibp_enabled = true). No further manual dashboard step is
-- required. Verify under: Cloud → Users → Auth Settings → Password HIBP Check.