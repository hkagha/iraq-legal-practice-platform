# Qanuni Target Product Rules

This document records the agreed target behavior for Qanuni, based on product discovery with the founder. It is the reference point for code review, QA, and future patch planning.

## 1. Product Strategy

Qanuni is a full legal practice management platform for solo lawyers, small law firms, and large law firms.

For the first year, the product should be offered free of charge. Every law firm gets the full product with all modules enabled by default. The goal is adoption, trust, and daily dependency before monetization.

The first product priority is not limiting features. It is making every feature reliable, professional, seamless, and useful enough that firms become dependent on the system.

## 2. User Groups

Qanuni serves three main user groups:

- Staff users: firm admins, lawyers, paralegals, secretaries, accountants.
- Portal users: client persons who access cases, errands, documents, messages, invoices, trust account history, and activity timelines.
- Platform users: super admins and sales admins.

Portal accounts always belong to natural persons. Legal entities/companies never log in directly. A legal entity acts through one or more representative persons, each with their own portal login.

## 3. Platform Roles

### Super Admin

Super admin has full access to everything in the application across all organizations. Nothing should be limited for super admin.

Super admin can:

- Create organizations.
- Create protected main firm admins.
- View and control all organizations.
- Access confidential data.
- Access all documents and archives.
- Download/open any document.
- View full AI logs.
- View platform-wide indexed documents.
- Re-run document indexing for any document.
- Impersonate organizations/users where needed.

### Sales Admin

Sales admin has limited platform access and must not access confidential firm data.

Sales admin can:

- Create law firm organizations.
- Create the initial protected main firm admin.
- See tenant metadata, usage, and non-confidential account information.
- See organization-level AI usage totals.

Sales admin must not:

- Access case content.
- Access documents or archives.
- View full AI prompt/response logs.
- Access platform-wide document index.
- Impersonate firms.

## 4. Organization Model

One law firm equals one organization. No branch/sub-organization model is needed in phase one.

Each organization must have one protected main firm admin. Multiple firm admins may exist, but the protected main admin cannot be accidentally deleted or demoted. Creating the initial protected main firm admin is a platform super_admin or sales_admin responsibility. Ownership transfer should be a controlled platform-level workflow.

## 5. Staff Permissions

Firm admin has full access to all data inside their own organization.

Assigned staff can access cases/errands they are assigned to, including related:

- Documents.
- Notes.
- Tasks.
- Time entries.
- Billing for that matter.
- Messages.
- Timeline/activity.

Unassigned staff should not see confidential matter data.

Accountant is a special exception:

- Accountant can access all billing, invoices, payments, time financial data, and trust accounting.
- Accountant should not automatically see all confidential matter documents/details unless assigned.

Secretary sees only assigned cases/errands and related tasks/calendar.

Assigned lawyers and paralegals can see and work with everything inside assigned matters.

Assigned staff can edit/delete matter content. For documents, deletion means removal from active matter view only; documents remain preserved in archive.

## 6. Archive Permissions

Documents are never permanently deleted in normal workflows.

When a document is removed from a case/errand:

- It disappears from the active matter document list.
- It remains preserved, indexed, and searchable in the archive.
- It remains part of the permanent firm record.

Archive access:

- Firm admin sees all archive.
- Firm admin can grant archive-read privilege to selected staff.
- Ordinary assigned staff do not automatically see the full archive.
- Bulk archive import is limited to firm_admin and archive-privileged staff.

## 7. Case-Centered Product Model

The staff workspace should be organized primarily around cases.

Clients, documents, tasks, billing, messages, and AI should support the case workflow. Client detail pages are useful but not the main operating center.

Errands are parallel legal/administrative matters. They are not minor tasks. They represent non-contentious services such as company registration, factory licenses, passports, IDs, and government/authority processes.

Cases and errands must remain clearly separated in staff UI and portal UI.

## 8. Parties, Clients, and Representatives

The module label should remain "Clients & Parties."

Persons and entities can have full profiles even when they are not clients.

The system must distinguish between:

- Firm clients.
- Opponents.
- Witnesses.
- Representatives.
- Government offices.
- Other parties.

The system should also support a global "client" marker on persons/entities, while still allowing matter-specific roles.

A person/entity can be a firm client globally and still appear as opponent in another case. This should trigger conflict logic when active matters are involved.

Relationship history is important and must be preserved:

- Became client.
- Ceased being client.
- Representative added/removed.
- Matter role changes.
- Portal access grants/removals.

## 9. Required Client Parties

Every case must have at least one firm-client party.

Every errand must have at least one firm-client party.

The client party can be:

- A private person.
- A legal entity/company.

If the client party is a legal entity/company, it must have at least one human representative before it can be added to a case or errand as a client.

An entity may exist in the global party database without a representative, but it cannot be added as a client party to a case or errand without at least one representative.

Representative requirement applies only when the entity role is client. Opponents/government offices/other entity roles do not require representatives.

Cases and errands can be created with only client parties. Opposing/other parties can be added later.

## 10. Duplicate Detection and Merge

Duplicate detection is very important.

Strict blocking duplicates:

- Exact person national ID match.
- Exact entity commercial registration number match.

Warning duplicates:

- Similar Arabic/English names.
- Same/similar phone.
- Same/similar email.

Firm admin only can merge duplicate records.

Merge must preserve all linked history:

- Case/errand parties.
- Documents.
- Invoices.
- Trust accounts.
- Messages.
- Portal links.
- Activities.
- Audit logs.
- Representative relationships.

## 11. Conflict Checking

Conflict checking applies to cases only, not errands.

Conflict checking must happen:

- Automatically during case creation/party addition.
- Manually via a conflict checker tool.

Conflict severity should be clear:

- No conflict.
- Possible conflict.
- Direct conflict.

When a conflict is found:

- The app should show related active matter(s), party role(s), and reason.
- The case can still be created.
- The case should be placed in a restricted `pending_conflict_review` status.
- Lawyers and firm admins can acknowledge/clear the conflict.
- Secretary/paralegal/accountant can trigger and view conflict warnings, but cannot clear them.

Pending conflict review:

- Staff can do everything except invoicing.
- Client can see the case.
- Client can message and upload documents.
- Portal wording should be neutral, such as "initial review."
- Invoicing is blocked until conflict is cleared.

Conflict overrides must be audit logged with user, timestamp, reason, and matter.

## 12. Portal Access and Context

Portal access is capacity-based, not person-only.

A person may access:

- Personal matters.
- Company A matters as representative.
- Company B matters as representative.
- Matters with different law firms.

After login, if the user has multiple contexts, the portal should ask what they want to access.

Context options should be clear, for example:

- My personal matters with [Law Firm].
- Company A matters with [Law Firm].
- Company B matters with [Law Firm].

Everything in the portal should remain neatly separated by selected context.

Staff control the relationships and access grants.

Portal access can be granted by combination of:

- Person relationship.
- Entity representative relationship.
- Full access to a person/entity's matters.
- Specific case access.
- Specific errand access.

For a company representative, full access means all current and future matters for that company/entity. Specific access means only selected matters.

When a representative leaves a company, that capacity access must be removed immediately. The same person may retain personal-client access to their own matters.

## 13. Portal Visibility Rules

All cases and errands connected to a client should be visible to that client.

Cases and errands are separated in the portal.

Activities stay hidden until staff explicitly toggles the specific activity visible to client.

Documents:

- Staff-uploaded documents are hidden from clients by default.
- Staff can mark documents visible to client.
- Client-uploaded documents are immediately visible to that client/capacity.

Notes are always internal and never client-visible.

Tasks are internal only and never client-visible.

Hearings/appointments are visible to connected clients by default.

Invoices are visible only after explicitly sent to the client.

Messages are visible by nature and matter-specific.

## 14. Portal Messaging

Messages should be case/errand-specific.

No general client inbox is needed as the main model.

Client messages:

- Client message triggers notifications to all assigned staff on that matter.
- Staff message triggers notifications to all portal users connected to that matter.
- All assigned staff can see matter messages.

Internal staff-only communication uses notes, not a separate comment system.

## 15. Activity Timeline

Clients should see a professional activity timeline for their accessible cases/errands.

Timeline should show only activities explicitly marked visible to client.

Staff can control visibility. Internal activities remain hidden unless explicitly shared.

## 16. Documents, Archive, OCR, and Indexing

Document management is a core feature.

Required behavior:

- Staff can upload documents into assigned cases/errands.
- Client can upload documents into accessible cases/errands.
- Client can upload related files from document detail.
- Staff-uploaded new versions become latest immediately.
- Client-uploaded new versions are pending staff review before becoming official/latest.
- All versions are retained.
- All uploads are archived and indexed.
- All documents support discussion/comments between staff and client where appropriate.

AI indexing and OCR:

- Runs automatically on every uploaded document/version.
- Runs for staff uploads and client uploads.
- Runs for pending client versions too.
- OCR/scanning support is essential for image/PDF documents.
- Arabic and English OCR are required.
- Extracted text is preserved and viewable/searchable by staff.
- Clients do not see indexing status, AI tags, extraction errors, or re-index controls.

Staff can:

- See indexing status/errors for documents they can access.
- Re-run indexing for documents in assigned matters.
- Correct AI metadata/tags.
- Correct OCR text.

Firm admin can re-run indexing for any org document.

Super admin can re-run indexing for any platform document.

Corrected OCR text should be stored separately from the original extracted text. Search should prefer corrected text where available.

Manual metadata/OCR corrections should be audit logged and preserved.

## 17. Archive Search

Archive search must be extremely strong and professional.

It should search:

- File name.
- Extracted text.
- Corrected OCR text.
- AI metadata.
- People.
- Companies.
- Dates.
- Amounts.
- Statutes.
- Case numbers.
- Places.
- AI tags.
- Matter/client filters.

Search must support Arabic and English and be useful across thousands of documents.

Super admin should have a platform-wide indexed document view, with full access to open/download and re-index. Sales admin must not access this view.

## 18. Billing and Invoicing

Every case/errand must have a billing type:

- Hourly.
- Fixed fee.
- Contingency.
- Pro bono.
- Non-billable.

All matters may track time, but billing type controls default billing behavior:

- Hourly: time entries default billable.
- Fixed fee, contingency, pro bono, non-billable: time entries default non-billable/internal.

Time tracking must be linked to a case or errand. No unlinked general time.

Time entries can optionally link to a task, and task selection must be limited to tasks inside the selected case/errand.

Staff can create a task inline while logging time.

Time entries must store the hourly rate active when time was logged. Later rate changes do not alter old time entries.

Manual rate override is allowed and audit logged. No extra approval step is needed.

Invoices:

- One currency per invoice.
- Matter has one currency.
- All invoices for one matter use the matter currency.
- Draft invoices are editable.
- Sent/viewed/paid invoices are locked.
- Corrections in phase one should use duplicate/correct invoice workflow.
- Credit/debit notes are postponed.
- Invoices cannot be deleted; they can be cancelled/archived.

Invoice visibility:

- Clients see invoices only after explicitly sent.
- Sending an invoice makes it visible in portal and sends email notification.
- Client opening invoice marks it viewed.
- Payments are recorded manually by staff.
- Portal clients view/download invoices only. No online payment in phase one.

## 19. Time Tracking

Manual time and timer must require a case or errand.

Timer:

- Requires case/errand before starting.
- One active timer per user.
- Continues across browser refresh.
- Logout with running timer shows confirmation prompt.

Permissions:

- Owner can edit own entries where allowed.
- Firm admin can edit all.
- Accountant can edit all.
- Assigned lawyer can edit/approve time entries for assigned matter.
- Assigned matter staff can approve time entries connected to that matter.

Only approved billable time should be selectable for invoices unless manually overridden.

## 20. Trust Accounting

Trust accounting is enabled by default. Firm admin can turn it off.

Trust accounting tracks client money held by the firm, separate from firm revenue.

Permissions:

- Accountant and firm_admin can create/edit trust transactions.
- Other assigned staff may view if allowed by matter permissions, but cannot manage transactions.

Client portal:

- Client can see their own trust account.
- Client can see full transaction history.
- Client cannot edit.

All trust actions must be audit logged.

## 21. Reports and Dashboards

Reports:

- Firm admin sees all reports.
- Accountant sees firm-wide financial/time/billing reports.
- Lawyers can see their own personal performance report.
- Paralegals/secretaries do not get performance reports by default.
- Assigned matter pages can show matter-level summaries.

Dashboard:

- One dashboard framework with role-based widgets.
- Qanuni controls dashboard layout in phase one.
- Firm-level widget customization is postponed.

## 22. AI Features

AI is enabled by default for every firm.

Firm admin can:

- Disable staff-facing AI assistant/drafting/research features.
- Restrict AI for individual staff members.
- Add their own API key/model.
- View full AI logs for their own organization.

Super admin can:

- See usage per organization.
- Disable AI for any organization.
- View full AI logs across platform.

Sales admin can:

- See organization-level AI usage totals only.
- Not see prompt/response content.

AI logs should store everything:

- Prompt/input.
- Response/output.
- Feature.
- User.
- Organization.
- Tokens/cost.
- Model/provider.
- Timestamp.
- Status/error.

AI is staff-only. No client portal AI.

AI-generated documents/drafts:

- Automatically saved as AI draft records/documents.
- Clearly labeled as AI-generated drafts.
- Tagged and indexed clearly.
- Not visible to clients by default.
- Can be explicitly saved/finalized as a case/errand document.
- Provenance should be preserved.

AI drafting/research should use linked matter jurisdiction/currency/language context automatically.

## 23. Language and Jurisdiction

The application must be fully bilingual in English and Arabic.

No partial English-only screens are acceptable for launch.

Arabic should use formal legal Arabic and Iraqi legal terminology.

Kurdish is not required.

Each user chooses their own language preference.

AI legal drafting asks output language each time:

- Arabic.
- English.
- Bilingual.
- Possibly match source language.

The application can be used everywhere, but Iraq is the first deep legal specialization.

Jurisdictions:

- Firms can choose jurisdiction.
- Include Arab countries in the jurisdiction picker.
- Iraq has deep legal AI/citation support.
- Other Arab jurisdictions are generic at first.
- Organization has default jurisdiction.
- Case/errand can override jurisdiction.

Currency:

- Organization has default currency.
- Case/errand can override currency.
- Currency lives on matters and invoices, not clients.

## 24. Numbering and Types

Universal numbering should be used across all firms.

No firm-specific prefix customization in phase one.

Cases, errands, and invoices have separate numbering sequences.

Numbers should be intelligent and include year/type where useful, without needing annual reset.

Example:

- `CASE-2026-CIV-000123`
- `ERR-2026-COMPANY-000045`
- `INV-2026-000078`

Case types:

- Comprehensive built-in Iraqi legal/practice categories.
- Firm admins can add custom categories.

Errand types:

- Comprehensive built-in Iraqi administrative/legal service categories.
- Firm admins can add custom categories.

## 25. Status Workflows

Recommended fixed case statuses:

- intake
- pending_conflict_review
- active
- on_hold
- pending_judgment
- appeal
- enforcement
- closed
- archived

Recommended fixed errand statuses:

- intake
- in_progress
- waiting_on_client
- waiting_on_authority
- completed
- cancelled
- archived

Firms should not customize core statuses in phase one. They can use tags/notes/custom categories for nuance.

## 26. Calendar and Notifications

Cases have formal hearings.

Errands have appointments, milestones, deadlines, or authority visits, not "hearings."

Both appear on the calendar.

Calendar visibility:

- Firm admin sees all.
- Staff sees items for assigned matters only.

Clients see hearing/appointment/deadline dates for accessible matters.

Reminders:

- In-app.
- Email.
- WhatsApp prepared/manual/later depending on cost/provider.
- PWA/browser push if practical.

Clients can view reminders but do not need confirm/acknowledge attendance.

## 27. Email, WhatsApp, and PWA

Email notifications should come from Qanuni platform email in phase one, such as `notifications@qanuni.online`, with firm branding and possible reply-to firm email.

WhatsApp:

- Store WhatsApp numbers.
- Prepare notification preferences.
- Manual WhatsApp links are acceptable.
- Automated sending can be postponed if it costs money.

PWA:

- Qanuni should support add-to-home-screen/app-like installation.
- Native iOS/Android apps are future plans.
- Phase one is PWA only.

Offline support is not required in phase one.

## 28. Mobile

The app must be fully usable on phones.

Highest mobile priority:

- Staff daily workflows.
- Client portal.
- Document upload from phone.
- Responsive RTL/Arabic.

Admin/reporting pages should not break on mobile, but daily workflows have priority.

## 29. Onboarding and Help

New firms should get a clean workspace by default with optional demo/sample data.

Onboarding checklist should be included and skippable/resumable.

Checklist should include:

- Complete firm profile.
- Add first client/person/company.
- Create first case.
- Create first errand.
- Upload first document.
- Invite staff.
- Create client portal access.
- Try AI draft/research.
- Set billing/trust preferences.

Help:

- Built-in help/tooltips/tutorials must be available discreetly.
- UI must stay clean.
- Help content can be static/version-controlled in phase one.
- Fully bilingual.

## 30. Data Export and Audit

Firms must be able to export data/documents if they leave Qanuni.

Firm admin can export all firm data.

Assigned staff can export data/documents for assigned cases/errands.

Exports must be audit logged.

Full audit trail is required for everything:

- Create/edit/delete/archive.
- Case/errand changes.
- Party changes.
- Document access/upload/download/delete.
- Billing/payment changes.
- Trust transactions.
- Portal access changes.
- User/permission changes.
- Exports.
- AI usage.
- Conflict overrides.
- Impersonation/platform actions.

Audit log visibility:

- Super admin: all.
- Firm admin: own organization.
- Ordinary staff: no audit log UI.
- Sales admin: only sanitized account/platform metadata, not confidential content logs.

