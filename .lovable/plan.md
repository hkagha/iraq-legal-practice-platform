

## Goal
Unblock `nabboadmin@test.com` and make admin-managed password issues self-serviceable going forward.

## Diagnosis (already confirmed)
- Account exists, email confirmed, `is_active = true`, role `firm_admin`, not banned.
- Last successful login: 2026-04-21 17:25.
- Auth log: 3× `invalid_credentials` (HTTP 400) — Supabase rejects the **password**, not the user.
- Password was last changed 2026-04-17 by a super admin (`password_set_by_admin = true`).
- **Conclusion: the password being typed does not match the one stored. This is a credential issue, not a code bug.**

## Immediate fix (one of these — your choice)
1. **Reset the password from Super Admin panel** → /admin/users → find `nabboadmin@test.com` → "Reset Password" → set a new known password → share it with the user.
2. **Use the existing "Forgot Password" flow** on `/login` → user receives an email and sets their own password.

No code change is needed for the immediate unblock.

## Optional improvements (only if you want me to implement them)
1. **Better error message on staff login**: today the staff login shows a generic "Invalid credentials." Add a hint: *"If your password was recently reset by an administrator, use Forgot Password to set a new one."*
2. **Show "password set by admin" badge in Super Admin → Users list**, so admins can see at a glance which users still hold an admin-issued password and may need to be re-notified.
3. **Audit-log view**: surface the most recent `user_password_reset` events from `admin_audit_log` on the user detail page so admins can see who reset whom and when.

## Files that would be touched (only if you approve the optional improvements)
- `src/pages/StaffLoginPage.tsx` — friendlier error copy + link to "Forgot password".
- `src/pages/admin/AdminUsersPage.tsx` — badge for `password_set_by_admin = true`.
- `src/components/admin/EditUserModal.tsx` or user detail view — recent reset history block.

## What I will NOT do
- Touch authentication logic, RLS, or the `profiles` trigger — current setup is correct.
- Reset the password automatically without your approval.

**Tell me which option you want for the immediate unblock (admin reset vs. Forgot Password email), and whether to proceed with the optional UX improvements.**

