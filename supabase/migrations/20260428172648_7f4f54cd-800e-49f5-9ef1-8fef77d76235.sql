INSERT INTO public.profiles (
  id,
  email,
  organization_id,
  role,
  first_name,
  last_name,
  phone,
  language_preference,
  is_active
)
SELECT
  pu.auth_user_id,
  pu.email,
  pu.last_selected_org_id,
  'client',
  COALESCE(NULLIF(split_part(pu.full_name, ' ', 1), ''), pu.email),
  COALESCE(NULLIF(trim(substr(COALESCE(pu.full_name, ''), length(split_part(COALESCE(pu.full_name, ''), ' ', 1)) + 1)), ''), ''),
  pu.phone,
  COALESCE(pu.preferred_language, 'en'),
  true
FROM public.portal_users pu
WHERE NOT EXISTS (
  SELECT 1
  FROM public.profiles p
  WHERE p.id = pu.auth_user_id
);