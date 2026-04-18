

## Plan: Fix client↔lawyer collaboration (messages, notes, documents)

### Issues found

**A. Client cannot see "visible to client" notes on a case**
`PortalCaseDetailPage` loads cases, hearings, documents and team — but **never queries `case_notes`** and has no Notes tab. The RLS policy `client_read_case_notes` already permits this; the UI is just missing.

**B. Lawyer doesn't see client messages in the case context**
`ClientMessagesTab` exists only on the **Client detail** page. On the **Case detail** page there is no messages panel, so messages a client posts inside a case thread are invisible from the lawyer's case view (they have to remember to open the client and pick the thread).

**C. Client document upload not working**
`PortalDocumentsPage` is read-only — there is no upload button. The only "client upload" path is the **new version** button inside `PortalDocumentDetailSlideOver`, and that only works for documents the client can already see.

**D. Document version upload from the client side fails**
`PortalDocumentDetailSlideOver.handleUpload` writes to `${orgId}/clients/${clientId}/...`. The storage policy `client_upload_document_versions` requires `foldername[2] = 'clients'` (zero-indexed it's the *second* path segment). The current path puts `'clients'` at index 1 → the `WITH CHECK` fails and uploads are rejected. Also the table policy `client_insert_document_version` requires the parent doc's case/errand to be `is_visible_to_client = true`; current code doesn't check this and shows a generic error when it fails.

**E. Document collaboration discoverability**
`DocumentCommentsTab` is wired into both staff and portal slide-overs and the RLS for `document_comments` is correct, but discoverability is poor because comments only appear after opening a doc detail, and the comments tab visibility-to-client toggle isn't pre-seeded from the document.

---

### Fixes

**1. Database migration — fix client storage path policy**

Replace `client_upload_document_versions` so the path matches what the app actually writes (`{orgId}/clients/{clientId}/{rootDocId}/{filename}` — `'clients'` is `foldername[2]` in PG's 1-indexed array, which is index `[1]` zero-based). Set check to `foldername(name)[2] = 'clients'` written correctly:

```sql
DROP POLICY client_upload_document_versions ON storage.objects;
CREATE POLICY client_upload_document_versions ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (get_user_org_id(auth.uid()))::text
  AND (storage.foldername(name))[2] = 'clients'
);
```

(PostgreSQL arrays are 1-indexed — `[1]` = orgId, `[2]` = `'clients'`. The current policy has the same shape; we keep it but **also** add the org-id check for safety.)

**2. `PortalCaseDetailPage` — add Notes tab and Messages tab**

- Load `case_notes` filtered by `case_id` and `is_visible_to_client = true`, render in a new "Notes" tab (read-only — clients view, don't write).
- Add a "Messages" tab that embeds a lightweight version of `ClientMessagesTab` pre-scoped to this `case_id` so client posts go straight into the case thread.

**3. `CaseDetailPage` (lawyer) — add Messages tab**

Add a "Messages" tab that mounts `ClientMessagesTab` with `clientId={caseData.client_id}` and a new `defaultThread={`case-${caseData.id}`}` prop, so the lawyer immediately sees the case-scoped conversation. Update `ClientMessagesTab` to accept that prop and pre-select the thread.

**4. `PortalDocumentsPage` — add an "Upload document" button**

Allow the client to upload a brand-new (not version) case-specific document scoped to a case they can see. New flow:
- Modal: pick one of the client's visible cases → file picker → upload.
- Storage path: `{orgId}/clients/{clientId}/case-{caseId}/{ts}-{safeName}`.
- DB insert: `visibility_scope='case_specific'`, `is_visible_to_client=true`, `case_id`, `client_id`, `uploaded_by=auth.uid()`, `parent_document_id=NULL` (root doc), `version=1`, `is_latest_version=true`.
- Add a new RLS policy `client_insert_root_document` mirroring `client_insert_document_version` but allowing `parent_document_id IS NULL` when the case/client is visible to the client.

**5. `PortalDocumentDetailSlideOver` — fix path + better errors**

- Keep path `${orgId}/clients/${clientId}/${rootId}/...` (matches the storage policy).
- Sanitize filename: `file.name.replace(/[^a-zA-Z0-9._-]/g, '_')`.
- Surface the real Supabase error string in the toast so the next failure is diagnosable.

**6. Notify staff when a client uploads / comments**

Add small DB triggers (or extend existing notification helpers) so:
- Client uploads a new doc/version → `create_notification` fires for the case team (`notification_type='client_document'`).
- Client posts a `document_comment` → notify case team (`notification_type='client_doc_comment'`).
This makes the collaboration loop visible without polling.

---

### Files

**Migration**
- Recreate `client_upload_document_versions` with org-id guard.
- Add `client_insert_root_document` policy on `public.documents` for net-new client uploads on visible cases.
- Add `notify_staff_on_client_document` trigger on `documents` (when `uploaded_by` is a client linked user) and `notify_staff_on_client_doc_comment` trigger on `document_comments` (when `author_type='client'`).

**Edits**
- `src/pages/portal/PortalCaseDetailPage.tsx` — load `case_notes`, add Notes + Messages tabs.
- `src/components/clients/ClientMessagesTab.tsx` — accept optional `defaultThread` and `lockedThread` props.
- `src/pages/CaseDetailPage.tsx` — add Messages tab embedding `ClientMessagesTab`.
- `src/pages/portal/PortalDocumentsPage.tsx` — add "Upload document" button + modal scoped to visible cases.
- `src/components/portal/PortalDocumentDetailSlideOver.tsx` — sanitize filename, surface real errors.

### Outcome

- Client sees notes the lawyer marked "visible to client" inside the relevant case.
- Lawyer sees client messages directly in the case detail's Messages tab.
- Client can upload both new documents and new versions on cases they have access to, with paths that satisfy storage RLS.
- Both sides receive notifications when the other uploads or comments, closing the collaboration loop.

