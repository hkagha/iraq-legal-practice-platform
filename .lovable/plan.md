

## Plan: Document Collaboration + Org Document Library

Two related features:
1. Client ↔ lawyer collaboration on case documents (comments + new versions from either side)
2. A library categorising every document into Internal / Shared-with-clients / Case-specific, with the right visibility rules

---

### 1. Document collaboration (comments + client uploads)

**New table `document_comments`**
- `id`, `organization_id`, `document_id`, `author_id`, `author_type` ('staff' | 'client'), `content`, `content_ar`, `is_visible_to_client`, `parent_comment_id` (for threaded replies), `created_at`, `updated_at`
- RLS:
  - Staff (firm_admin/lawyer/paralegal) in the org → full CRUD on comments for their org's documents
  - Client → SELECT comments where the document is visible to them AND `is_visible_to_client = true`; INSERT comments where `author_id = auth.uid()`, `author_type = 'client'`, document is visible to them (server-side defaults `is_visible_to_client = true` for client-authored)
  - Super admin → all
- Realtime: add `document_comments` to `supabase_realtime` so both sides see new comments live.

**Client-uploaded new versions**
- Extend RLS on `documents` and `storage.objects` (`documents` bucket) so a client linked to the case/errand/client_id can INSERT a new row that:
  - References an existing `parent_document_id` whose latest version is visible to them
  - Sets `uploaded_by = auth.uid()`, `is_visible_to_client = true`, `is_latest_version = true`
  - Sets `version = parent.version + 1`, copies `case_id` / `errand_id` / `client_id` / `organization_id` from parent
- A `BEFORE INSERT` trigger on `documents` enforces the parent-version rules for client uploads (so a client cannot create unrelated documents) and flips the previous latest version's `is_latest_version = false`.
- Storage path for client uploads: `{org_id}/clients/{client_id}/{parent_doc_id}/{filename}`.

**UI changes**
- `DocumentDetailSlideOver` (staff) → new "Comments" tab with threaded list, compose box (EN/AR), and a "Visible to client" toggle (defaults on for client-collaborative docs). Show client-authored comments with a distinct avatar/colour.
- New `PortalDocumentDetailSlideOver` opened from `PortalDocumentsPage` when a client clicks a document. Shows: metadata, version history, comments (read + post), and "Upload new version" button.
- `PortalDocumentsPage` cards gain a comment-count badge and a "New version" indicator when staff/client adds one.

---

### 2. Three-tier document library

**Schema change on `documents`**
- New column `visibility_scope text NOT NULL DEFAULT 'case_specific'` with allowed values:
  - `internal` — firm-internal only
  - `shared_library` — firm-wide, can be attached to client cases
  - `case_specific` — restricted to assigned team + (optionally) client
- Backfill existing rows:
  - `document_category = 'template'` → `shared_library`
  - has `case_id` or `errand_id` or `client_id` → `case_specific`
  - everything else → `internal`
- Add `library_tags text[]` for organising the shared library.

**Updated RLS on `documents`** (replaces current `users_read_org_documents`)
- `internal`: visible to any staff role in the org (`firm_admin`, `lawyer`, `paralegal`, `secretary`, `accountant`); NEVER visible to clients regardless of `is_visible_to_client`.
- `shared_library`: visible to all staff in the org; clients only see a copy if it's been attached to their case (i.e. a `case_specific` child document with `is_visible_to_client = true`).
- `case_specific`: visible to firm_admin (always) and to staff who are members of `case_team_members` for that case (or assigned to the errand); plus clients only when `is_visible_to_client = true` AND they're linked via `client_user_links`.
- Helper SECURITY DEFINER function `user_can_access_case(_user_id, _case_id)` to keep policies non-recursive.
- Super admin policy already exists — keep as-is.

**"Use in case" action**
- From the shared library, staff can click "Add to case/errand". This creates a new `documents` row with `visibility_scope = 'case_specific'`, `parent_document_id` pointing to the library doc, `case_id` set, `is_visible_to_client` chosen by user. The file is copied in storage to the case-scoped path so further versions don't pollute the library original.

**UI changes**
- `DocumentsPage` left sidebar gets three top-level sections above the existing folder tree:
  - Library → Internal Use, Shared with Clients, Case Documents
  - Each shows count and filters the main list by `visibility_scope`.
- Upload modal (`DocumentUploadModal`) gains a required "Document type" radio: Internal / Shared library / Case-specific. Choosing Case-specific keeps the existing case/errand/client picker; the others hide it.
- Shared library rows show an "Attach to case" button (staff only).
- Case detail's documents tab (`EntityDocumentsTab`) only shows `case_specific` docs for that case + a "Browse shared library" button.

---

### Files

**Database (migration)**
- New table `document_comments` + RLS + realtime
- `documents`: add `visibility_scope`, `library_tags`; backfill; replace SELECT/INSERT/UPDATE policies with the tiered ones; add trigger enforcing client-version rules
- New helper `public.user_can_access_case(uuid, uuid)`
- Storage RLS update on `documents` bucket so clients can upload to `{org}/clients/{client_id}/...` paths and read paths for documents they have access to

**Frontend create**
- `src/components/documents/DocumentCommentsTab.tsx` — shared comments UI (staff + client variants via prop)
- `src/components/portal/PortalDocumentDetailSlideOver.tsx` — client-side detail view with comments + new version upload
- `src/components/documents/AttachToCaseModal.tsx` — pick case/errand + visibility for shared library docs
- `src/components/documents/LibrarySection.tsx` — Internal / Shared / Case nav block

**Frontend edit**
- `src/components/documents/DocumentDetailSlideOver.tsx` — add Comments tab; show version history including client-uploaded versions
- `src/components/documents/DocumentUploadModal.tsx` — Document type selector
- `src/components/documents/DocumentFolderSidebar.tsx` — render `LibrarySection` above folders; filter by scope
- `src/pages/DocumentsPage.tsx` — accept scope filter; pass to list + sidebar
- `src/components/documents/EntityDocumentsTab.tsx` — restrict to case_specific; "Browse shared library" entry
- `src/pages/portal/PortalDocumentsPage.tsx` — open detail slide-over on click; add comment count + new-version indicator
- `src/i18n/en.json`, `src/i18n/ar.json` — strings for comments, library tabs, document types

---

### Outcome

- Lawyer and client can converse in-thread on any case document and either party can upload a new version, with full version history.
- Every org has a clear three-tier library: internal-only, reusable shared docs, and case-locked docs — visibility enforced at the database level so RLS guarantees correctness even outside the UI.
- Super admins continue to see everything; staff outside a case team can no longer accidentally read its documents.

