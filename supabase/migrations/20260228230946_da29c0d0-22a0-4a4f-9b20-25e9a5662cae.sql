
-- Add missing columns to organizations for settings
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS org_type text DEFAULT 'law_firm',
  ADD COLUMN IF NOT EXISTS industry_focus text DEFAULT 'general_practice',
  ADD COLUMN IF NOT EXISTS bank_name_ar text,
  ADD COLUMN IF NOT EXISTS bank_swift_code text,
  ADD COLUMN IF NOT EXISTS invoice_header_text text,
  ADD COLUMN IF NOT EXISTS invoice_header_text_ar text,
  ADD COLUMN IF NOT EXISTS default_terms text,
  ADD COLUMN IF NOT EXISTS default_terms_ar text,
  ADD COLUMN IF NOT EXISTS default_hourly_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS city_ar text;

-- Create organization-assets storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('organization-assets', 'organization-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: org members can upload to their org folder
CREATE POLICY "org_members_manage_assets"
ON storage.objects FOR ALL
USING (
  bucket_id = 'organization-assets'
  AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
)
WITH CHECK (
  bucket_id = 'organization-assets'
  AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
);

-- Public read for org assets (logos etc)
CREATE POLICY "public_read_org_assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'organization-assets');
