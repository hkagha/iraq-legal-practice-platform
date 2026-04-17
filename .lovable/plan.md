

## Plan: Three-Tier Login Architecture

Restructure `/login` into a clean selector for the two main audiences (firm staff and clients), with a discreet link for platform admins.

### 1. New `/login` — Login Selector Page

Replace the current `LoginPage.tsx` content with a selector showing two large cards:

- **Law Firm Staff** → routes to `/login/staff` (lawyers, paralegals, secretaries, accountants, firm admins)
- **Client Portal** → routes to `/portal/login` (existing page, unchanged)

At the bottom of the page, a small, discreet text link: *"Platform administrator? Sign in here"* → routes to `/admin/login` (existing super admin login).

Includes the EN/AR language toggle and Qanuni branding consistent with the existing login pages.

### 2. New `/login/staff` — Law Firm Staff Login

Move the current email/password form from `LoginPage.tsx` into a new `StaffLoginPage.tsx` at route `/login/staff`. Behavior:

- Validates credentials via `signIn`
- After login, if `profile.role === 'client'` → redirect to `/portal/dashboard` with a friendly message (wrong portal)
- If `profile.role === 'super_admin'` or `sales_admin` → redirect to `/admin/dashboard`
- Otherwise → `/dashboard`
- Includes "Forgot password?" link and a small link back to the selector

### 3. `/portal/login` — unchanged

Already exists and works for clients. Add a small "Back to login options" link to the selector.

### 4. `/admin/login` — unchanged

Already exists for super admins. Add a small "Back to login options" link.

### 5. Routing updates in `App.tsx`

- `/login` → new `LoginSelectorPage`
- `/login/staff` → new `StaffLoginPage` (the old form)
- `/portal/login` → existing (unchanged)
- `/admin/login` → existing (unchanged)
- Update `ProtectedRoute` redirect target from `/login` to keep working — selector will direct unauthenticated users to choose their portal. (Staff-area redirects can target `/login/staff` directly so the form is shown immediately when a staff session expires.)

### 6. Login failure fix

The recurring "Invalid email or password" issue for admin-created accounts comes from accounts where `email_confirmed_at` is `NULL` (created via the old `signUp` path rather than the Edge Function). Two fixes:

- **a. Repair migration**: one-time SQL to confirm all existing unconfirmed users that have a matching `profiles` row, so existing test accounts (clients and staff) can log in immediately.
- **b. Verify `admin-create-user` Edge Function** is the only path used by `CreateUserModal`, `CreateClientAccountModal`, and `InviteMemberModal`. Replace any remaining `supabase.auth.signUp` calls used by admins with calls to the Edge Function (which sets `email_confirm: true`). Specifically check `InviteMemberModal.tsx` — if it still uses invitations/signup, switch it to the direct-create flow with a temporary password the admin can share.

### Files

**Create**
- `src/pages/LoginSelectorPage.tsx` — the new selector
- `src/pages/StaffLoginPage.tsx` — the staff email/password form (extracted from current `LoginPage.tsx`)

**Edit**
- `src/pages/LoginPage.tsx` — becomes a thin re-export of `LoginSelectorPage`, OR delete and update routes
- `src/App.tsx` — add `/login/staff` route, ensure `/login` renders the selector
- `src/pages/portal/PortalLoginPage.tsx` — add "Back to login options" link
- `src/pages/admin/AdminLoginPage.tsx` — add "Back to login options" link
- `src/components/auth/ProtectedRoute.tsx` — point staff redirects to `/login/staff`
- `src/components/settings/InviteMemberModal.tsx` — if still invitation-based, switch to direct admin-create flow
- `src/i18n/en.json`, `src/i18n/ar.json` — add selector/staff strings

**Database**
- One migration to confirm any existing `auth.users` rows whose email is `NULL`-confirmed but who have a `profiles` row, so currently broken test logins (staff and clients) start working.

### Visual sketch

```text
            /login (selector)
   ┌──────────────────────────────────┐
   │           Qanuni                 │
   │   Choose how you sign in         │
   │                                  │
   │  ┌────────────┐  ┌────────────┐  │
   │  │ Law Firm   │  │  Client    │  │
   │  │   Staff    │  │  Portal    │  │
   │  └────────────┘  └────────────┘  │
   │                                  │
   │   Platform administrator? →      │
   └──────────────────────────────────┘
```

