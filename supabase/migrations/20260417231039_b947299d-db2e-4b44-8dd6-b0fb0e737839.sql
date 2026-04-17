UPDATE auth.users u
SET email_confirmed_at = COALESCE(u.email_confirmed_at, now())
WHERE u.email_confirmed_at IS NULL
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);