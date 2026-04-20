-- Fix 1: Prevent firm_admins from granting super_admin role
DROP POLICY IF EXISTS "firm_admin_update_org_profiles" ON public.profiles;

CREATE POLICY "firm_admin_update_org_profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'firm_admin'
  AND organization_id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
)
WITH CHECK (
  (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'firm_admin'
  AND organization_id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
  AND role != 'super_admin'  -- Prevent granting super_admin
);

-- Fix 2: Create a separate secure table for AI credentials
CREATE TABLE IF NOT EXISTS public.organization_secrets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    ai_api_key_encrypted text,
    bank_account_number text,
    bank_iban text,
    bank_swift_code text,
    tax_id text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (organization_id)
);

-- Enable RLS on secrets table
ALTER TABLE public.organization_secrets ENABLE ROW LEVEL SECURITY;

-- Only firm admins can access secrets
CREATE POLICY "firm_admins_access_secrets"
ON public.organization_secrets
FOR ALL
TO authenticated
USING (
  (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'firm_admin'
  AND organization_id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
);

-- Fix 3: Remove sensitive columns from organizations SELECT for non-admins
-- First, migrate existing data
INSERT INTO public.organization_secrets (organization_id, ai_api_key_encrypted, bank_account_number, bank_iban, bank_swift_code, tax_id)
SELECT id, ai_api_key_encrypted, bank_account_number, bank_iban, bank_swift_code, tax_id
FROM public.organizations
WHERE ai_api_key_encrypted IS NOT NULL 
   OR bank_account_number IS NOT NULL 
   OR bank_iban IS NOT NULL 
   OR bank_swift_code IS NOT NULL 
   OR tax_id IS NOT NULL
ON CONFLICT (organization_id) DO UPDATE SET
    ai_api_key_encrypted = EXCLUDED.ai_api_key_encrypted,
    bank_account_number = EXCLUDED.bank_account_number,
    bank_iban = EXCLUDED.bank_iban,
    bank_swift_code = EXCLUDED.bank_swift_code,
    tax_id = EXCLUDED.tax_id;

-- Fix 4: Remove errand_notes and saved_reports from realtime
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'errand_notes'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.errand_notes;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'saved_reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.saved_reports;
  END IF;
END $$;

-- Fix 5: Add UPDATE policies for storage buckets
CREATE POLICY "Staff can update documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT p.organization_id::text 
    FROM public.profiles p 
    WHERE p.id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT p.organization_id::text 
    FROM public.profiles p 
    WHERE p.id = auth.uid()
  )
);

CREATE POLICY "Staff can update errand documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'errand-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT p.organization_id::text 
    FROM public.profiles p 
    WHERE p.id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'errand-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT p.organization_id::text 
    FROM public.profiles p 
    WHERE p.id = auth.uid()
  )
);