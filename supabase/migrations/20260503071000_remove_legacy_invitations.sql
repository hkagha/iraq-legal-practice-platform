-- The product now uses direct admin-created staff accounts with first-login
-- password reset enforcement. Remove the old token invitation table to avoid
-- a second dead onboarding path.

DROP TABLE IF EXISTS public.invitations CASCADE;
