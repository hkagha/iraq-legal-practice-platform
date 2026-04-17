
-- Drop existing role check constraint if it exists, then recreate with full role list
DO $$
DECLARE
  con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'public.profiles'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%role%';
  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'sales_admin', 'firm_admin', 'lawyer', 'paralegal', 'secretary', 'accountant', 'client'));

-- Ensure admin-password tracking columns exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_set_by_admin boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_last_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS password_changed_by uuid REFERENCES public.profiles(id);
