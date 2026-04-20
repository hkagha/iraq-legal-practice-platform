-- Fix 1: Add RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Fix 2: Prevent privilege escalation in profiles
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;

CREATE POLICY "users_update_own_profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
);

-- Fix 3: Create security definer function for safe org data
CREATE OR REPLACE FUNCTION public.get_organization_safe(org_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  name_ar text,
  slug text,
  logo_url text,
  subscription_tier text,
  subscription_status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    o.id,
    o.name,
    o.name_ar,
    o.slug,
    o.logo_url,
    o.subscription_tier,
    o.subscription_status,
    o.created_at,
    o.updated_at
  FROM public.organizations o
  WHERE o.id = org_id;
$$;

-- Fix 4: Update organizations policies
DROP POLICY IF EXISTS "users_own_org" ON public.organizations;

-- Firm admins get full access
CREATE POLICY "firm_admins_full_org_access"
ON public.organizations
FOR ALL
TO authenticated
USING (
  (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'firm_admin'
  AND id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
);

-- Regular users get limited access
CREATE POLICY "users_read_own_org_limited"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
  AND (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) != 'firm_admin'
);

-- Fix 5: Remove email_queue and whatsapp_queue from realtime publication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'email_queue'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.email_queue;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'whatsapp_queue'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.whatsapp_queue;
  END IF;
END $$;