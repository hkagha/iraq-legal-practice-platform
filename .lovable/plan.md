

## Plan: Fix document upload + simplify categorisation

### Root causes

**1. "INSERT succeeds, then crashes" on case-specific uploads**
After inserting a `case_specific` document, the modal calls `.select().single()` to get the new row back. The new SELECT policy `staff_read_case_documents` only lets firm_admins, case-team members, or errand-org-staff read case-specific docs. So a lawyer who uploads to a case they're not assigned to gets the INSERT through, then `.single()` returns zero rows and throws. The user sees "Upload error" with no clear message.

**2. SELECT/INSERT policy mismatch**
`staff_create_documents` lets any `firm_admin/lawyer/paralegal` INSERT a case_specific doc, but `staff_read_case_documents` only lets them read it if they're on the case team. Anyone who can create it should be able to read it back (otherwise the UI breaks immediately).

**3. The "three categories" aren't actually first-class**
The current modal shows: category dropdown (40 options) + document type radio (Internal / Shared / Case-specific) + link picker. The user's mental model is much simpler — every document is one of exactly three things, and that choice drives everything else.

### What we'll change

**A. Database migration**

1. Loosen `staff_read_case_documents`: allow any `firm_admin/lawyer/paralegal` in the org to read case-specific docs they uploaded themselves OR are on the team for. Concretely, add `OR uploaded_by = auth.uid()` to the policy. Firm admins keep blanket access.
2. No other RLS change needed — the storage policy `staff_upload_documents` already permits all staff, and the `staff_create_documents` table policy is already correct.

**B. `DocumentUploadModal.tsx` — make the three scopes the primary choice**

1. Move the "Document type" selector to the **top** of each file card, above category/title, and rename to "Where does this document belong?" with descriptions matching the user's wording:
   - **Internal** — Firm policies, instructions, internal references (visible to all team members only)
   - **Shared library** — Reusable templates and explainers that can be sent to clients (visible to all team members; available to attach to a case)
   - **Case-specific** — Belongs to a specific case, errand or client (visible to assigned team + optionally the client)
2. Default scope based on context:
   - If opened from a case/errand/client page → `case_specific` (already correct)
   - Otherwise → no default; user must pick (prevents accidental "internal" uploads of client docs).
3. When scope = `internal` or `shared_library`, **hide** the linkType/linkedId pickers and the "visible to client" checkbox (they're irrelevant). Already partially done — verify and tighten.
4. Replace the `.select().single()` after insert with `.select().maybeSingle()` plus a fallback: if the row isn't returned, fetch it by `(organization_id, file_path)` using a separate query so activity logging still works. This makes the upload robust to any future RLS tightening.
5. Surface real Supabase error messages in the per-file error panel (currently it shows `err.message` which is fine — verify the storage error path also propagates cleanly).

**C. `EntityDocumentsTab.tsx` — restrict to case_specific only (already planned, verify)**
Confirm the case detail page only lists `visibility_scope = 'case_specific'` and adds a "Browse shared library" button to attach a library doc.

**D. `DocumentsPage` sidebar — confirm the three top-level entries are present and labelled**
- Library → Internal Use, Shared with Clients, Case Documents
Each filters by scope and shows a count. (Already created in `LibrarySection`/`DocumentFolderSidebar` per the previous plan — verify and adjust labels to match the user's wording.)

### Files

**Migration** — loosen `staff_read_case_documents` to include `uploaded_by = auth.uid()`.

**Edit**
- `src/components/documents/DocumentUploadModal.tsx` — promote scope picker to top, hide irrelevant fields per scope, switch `.single()` → `.maybeSingle()` with fallback fetch, clearer error display.
- `src/components/documents/EntityDocumentsTab.tsx` — verify case-specific filter + "Browse shared library" entry.
- `src/components/documents/DocumentFolderSidebar.tsx` — verify the three library entries' labels and descriptions.

### Outcome

- Lawyers, paralegals, and firm admins can upload documents in any of the three categories without any silent RLS dead-ends.
- The three-way categorisation matches the user's exact mental model (internal / shared library / case-specific) and drives the rest of the form.
- A lawyer can always re-read a doc they just uploaded, even before being added to the case team.
- Existing internal/shared/case visibility rules continue to enforce the right access at the database level.

