

## Plan: Fix admin user/client creation + unify password management

### Root causes of the current "non-2xx status code" error

1. The `admin-create-user` Edge Function returns generic `"Internal error"` on any thrown exception, hiding the real cause. The likely failure is one of:
   - The `handle_new_user` trigger inserts into `profiles` with `role='client'` — if `profiles.role` has a CHECK constraint that rejects `'client'`, `auth.admin.createUser` fails.
   - The follow-up `INSERT` into `client_user_links` from the browser hits an RLS policy that only allows the linked client (not the firm admin) to insert.
   - The `password_set_by_admin` / `password_changed_by` columns may not exist on `profiles`, causing the post-create UPDATE to silently fail (but it would not throw a non-2xx; the create itself is the failing step).

2. `InviteMemberModal` still uses the old token-based invitation flow — admins cannot directly create staff with a password.

3. `admin-reset-password` only allows `firm_admin` to reset their own password (the check `targetProfile.id !== callerProfile.id` blocks resets for other firm admins, which is fine, but it also lets firm_admin reset *any* lawyer/paralegal — that part already works). Super_admin can already reset anyone. We just need to make sure the UI exposes it everywhere.

### What we'll change

**1. Edge Function `admin-create-user` — make it robust and return real errors**
- Return the actual error message (not `"Internal error"`) so debugging stops being a guessing game.
- Move the `client_user_links` insert *into* the Edge Function (so it runs with the service role and bypasses RLS). When `role === 'client'` and a `client_id` is passed, link the new user to that client inside the function.
- Ensure the `profiles` row exists (upsert it) instead of relying solely on the `handle_new_user` trigger — this avoids races and works even if the trigger's CHECK constraint rejects `'client'`.

**2. Migration: ensure `profiles.role` accepts `'client'` and `'sales_admin'`**
- Drop the existing role CHECK constraint (if any) and replace it with one that allows: `super_admin`, `sales_admin`, `firm_admin`, `lawyer`, `paralegal`, `secretary`, `accountant`, `client`.
- Confirm `password_set_by_admin`, `password_last_changed_at`, `password_changed_by` columns exist on `profiles`; add them if missing.

**3. Replace `InviteMemberModal` with direct creation flow**
- Convert it into "Add Team Member" that calls `adminCreateUser` with email + password (with a Generate Password button) — same UX as `CreateClientAccountModal`. Shows credentials to share with the user. No invitation email, no token, no expiry.
- Remove the "Send Invitation" path entirely from the staff-add UI (the legacy `invitations` table can stay for backwards compatibility but is no longer used).

**4. Update `CreateClientAccountModal` to pass `client_id` to the Edge Function**
- Stop inserting into `client_user_links` from the browser (RLS-prone); the function will do it.

**5. Surface password reset for super admin across all users**
- In the Super Admin Users page (`AdminUsersPage`), confirm a "Reset Password" action exists for every user. Add it if missing.
- The existing `admin-reset-password` function already authorizes super_admin for any user — no backend change needed there.

**6. Confirm "login works directly without verification"**
- The Edge Function already passes `email_confirm: true`, and the previous repair migration confirmed existing accounts. Once #1–#3 above land, every admin-created account will be immediately usable on the correct login portal.

### Files

**Edit**
- `supabase/functions/admin-create-user/index.ts` — return real errors; insert `client_user_links` server-side; upsert profile.
- `src/components/clients/CreateClientAccountModal.tsx` — pass `client_id`; drop client-side `client_user_links` insert.
- `src/components/settings/InviteMemberModal.tsx` — convert to direct create-with-password flow.
- `src/pages/admin/AdminUsersPage.tsx` — ensure "Reset Password" action is present for every user (verify, add if missing).

**Database migration**
- Loosen/replace `profiles.role` CHECK constraint to include `'client'` and `'sales_admin'`.
- Add `password_set_by_admin`, `password_last_changed_at`, `password_changed_by` columns if not already present.

### Outcome

- Firm admins → create clients **and** team members (lawyers, paralegals, etc.) with a password they set; user logs in immediately on their respective portal.
- Super admin → create, view, edit, and reset password for any user across any organization.
- No email invitations, no email verification step.
- Real error messages bubble up if anything still fails, so future issues are diagnosable in one shot.

