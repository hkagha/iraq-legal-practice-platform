# Qanuni Application Documentation

This document describes Qanuni as the intended final product and as a guide for developers reviewing or extending the application.

## 1. Overview

Qanuni is a bilingual legal practice management platform for solo lawyers, small law firms, and large law firms. It is designed for legal practice in Iraq first, while allowing firms in other Arab jurisdictions to use the system with configurable jurisdiction and currency.

The product combines:

- Case management.
- Errand/legal service management.
- Clients and parties.
- Documents, archive, OCR, and AI indexing.
- Client portal.
- Messaging.
- Tasks and calendar.
- Time tracking.
- Billing and invoicing.
- Trust accounting.
- Reports.
- AI drafting/research/translation.
- Platform administration.

The first year is intended to be free. Every organization should receive the full product with all modules enabled by default. The experience must be seamless, serious, professional, and useful enough that firms build daily dependency on it.

## 2. Product Principles

Qanuni should feel like a complete operating system for a law firm.

Core principles:

- Case-centered staff workflow.
- Errands treated as full non-contentious legal/administrative matters.
- Formal bilingual English/Arabic interface.
- Iraqi legal terminology and formal legal Arabic.
- Strong document archive and search.
- Matter-assignment-based permissions.
- Full audit trail.
- Clear portal access context.
- All modules enabled by default.
- Mobile-friendly daily workflows.
- No permanent deletion of legal documents.

## 3. Application Surfaces

Qanuni has three major surfaces.

### 3.1 Staff Workspace

Staff workspace is used by:

- firm_admin
- lawyer
- paralegal
- secretary
- accountant

Staff users work with:

- Dashboard.
- Cases.
- Errands.
- Clients & Parties.
- Calendar.
- Tasks.
- Documents.
- Time Tracking.
- Billing.
- Reports.
- Messages inside matters.
- Settings.
- AI.
- Conflict checker.
- Trust accounting.
- Notifications.
- Activity.

### 3.2 Client Portal

Portal users are natural persons. They may act personally or as representative of one or more legal entities/companies.

Portal users can:

- Choose an access context after login when more than one exists.
- See connected cases.
- See connected errands.
- View visible documents.
- Upload documents to accessible cases/errands.
- Participate in matter-specific messages.
- View sent invoices.
- View trust account history.
- View client-visible timeline/activity.
- View hearings/appointments/deadlines.
- Edit their own portal profile.

Portal users cannot:

- Use AI.
- See internal notes.
- See tasks.
- See hidden documents.
- See indexing metadata/status.
- Pay invoices online in phase one.

### 3.3 Platform Admin

Platform roles:

- super_admin
- sales_admin

Super admin has unrestricted access and control.

Sales admin has limited non-confidential tenant/account access. Sales admin must not access confidential case/client/document content.

## 4. Identity and Access Model

### 4.1 Organizations

One law firm equals one organization. There is no branch/sub-organization hierarchy in phase one.

Each organization has a protected main firm admin. Additional firm admins may exist.

### 4.2 Staff Profiles

Staff users are stored as profiles and belong to one organization.

Staff roles:

- firm_admin
- lawyer
- paralegal
- secretary
- accountant

Matter assignment is the core access rule for non-admin staff.

### 4.3 Portal Users

Portal users are client persons. Companies/entities do not log in directly.

A portal user may have multiple access contexts:

- Personal matters with Law Firm A.
- Company A representative matters with Law Firm A.
- Company B representative matters with Law Firm A.
- Personal/company matters with another law firm.

The portal should ask the user which context they want to access after login when multiple contexts exist.

### 4.4 Permissions Summary

Super admin:

- Full platform access.

Sales admin:

- Tenant metadata and usage only.
- No confidential content.

Firm admin:

- Full access within own organization.

Accountant:

- All billing, invoices, payments, time financial data, and trust accounting.
- No automatic access to all confidential matter documents/details unless assigned.

Assigned staff:

- Full access to assigned matters and related data.

Unassigned staff:

- No access to confidential matter data.

## 5. Matters: Cases and Errands

### 5.1 Cases

Cases are contentious or court/conflict matters. The app is organized primarily around cases.

Each case must have:

- At least one firm-client party.
- Billing type.
- Currency.
- Jurisdiction.
- Case type.
- Status.

Cases can begin with only client parties; other/opposing parties can be added later.

Cases require conflict checking.

### 5.2 Errands

Errands are non-contentious legal or administrative matters. Examples include:

- Company registration.
- Factory license.
- Passport/ID issue.
- Government authority filing.
- Administrative legal service.

Errands are parallel to cases, not minor tasks.

Each errand must have:

- At least one firm-client party.
- Billing type.
- Currency.
- Jurisdiction.
- Errand type.
- Status.

Errands do not require conflict checking.

### 5.3 Matter Statuses

Recommended case statuses:

- intake
- pending_conflict_review
- active
- on_hold
- pending_judgment
- appeal
- enforcement
- closed
- archived

Recommended errand statuses:

- intake
- in_progress
- waiting_on_client
- waiting_on_authority
- completed
- cancelled
- archived

## 6. Clients and Parties

The product uses persons and entities rather than one generic clients table.

### 6.1 Persons

Persons are natural people. They may be:

- Firm clients.
- Opponents.
- Witnesses.
- Representatives.
- Related parties.
- Portal users.

### 6.2 Entities

Entities are legal entities/companies/institutions. They may be:

- Firm clients.
- Opponents.
- Government offices.
- Related parties.

Entities do not log in to the portal.

### 6.3 Representatives

A legal entity client must have at least one human representative before it can be added to a case or errand as a client.

A person representative may have portal access to entity matters. If they leave the entity, that representative capacity access must be removed immediately while preserving any personal client access they may have.

### 6.4 Global Client Status and Matter Roles

Persons/entities can be globally marked as client. Matter-specific roles still exist and can differ by case/errand.

For example, a person can be globally a client but appear as an opponent in another active case. This should trigger conflict checking.

### 6.5 Duplicate Detection

Strict duplicate blocking:

- Person national ID exact match.
- Entity registration number exact match.

Warning duplicates:

- Similar names.
- Matching email.
- Matching phone.

Firm admin can merge duplicates. Merge must preserve all linked history.

## 7. Conflict Checking

Conflict checking is case-only.

It must run:

- During case creation.
- When adding/editing case parties.
- From a manual conflict checker page.

If conflict is detected:

- Case can still be created.
- Case enters pending_conflict_review.
- Invoicing is blocked.
- Staff can continue all other work.
- Client can see the case and communicate/upload documents.
- Lawyer or firm_admin must clear/acknowledge conflict.

All conflict decisions are audit logged.

## 8. Documents and Archive

Documents are central to Qanuni.

### 8.1 Uploads

Staff can upload documents into assigned cases/errands.

Clients can upload documents into accessible cases/errands.

Client uploads are immediately visible to the uploading client/capacity and visible to assigned staff/admins.

Staff uploads are hidden from clients by default until explicitly made visible.

### 8.2 Archive

All documents are preserved in archive. Normal delete removes a document from active matter view but does not permanently delete it.

Archive is searchable and access-controlled.

### 8.3 Versioning

Document versioning is required.

Staff-uploaded new version:

- Becomes latest immediately.

Client-uploaded new version:

- Enters pending staff review.
- Does not become official/latest until staff approves.

All versions remain preserved.

### 8.4 OCR and AI Indexing

AI OCR/indexing runs automatically on every upload and every version.

It must support:

- Scanned PDFs.
- Images.
- Arabic.
- English.
- Extracted text.
- AI metadata.
- Tags.
- Statutes.
- Case numbers.
- People/entities.
- Dates.
- Amounts.
- Places.

Staff can view indexing status and errors for documents they can access.

Staff can re-run indexing for assigned matter documents.

Firm admin can re-run indexing for all organization documents.

Super admin can re-run indexing for all platform documents.

Clients do not see indexing status or metadata.

### 8.5 Metadata and OCR Corrections

Assigned staff can edit AI-generated metadata/tags for documents they can access.

Assigned staff can correct OCR text.

Original extracted text and corrected text must both be preserved.

Corrections are audit logged.

## 9. Archive Search

Archive search should be one of the strongest features.

It must support:

- Full text search.
- OCR text.
- Corrected OCR text.
- File names.
- AI tags.
- AI metadata.
- Arabic and English search.
- Matter/client filters.
- Statute/case number search.
- Date/amount/person/entity filters.

The archive should handle thousands of documents and still help lawyers find the right file quickly.

## 10. Portal

The portal should feel serious, reliable, and professional.

Portal shows:

- Cases.
- Errands.
- Documents visible to client.
- Client-uploaded documents.
- Matter-specific messages.
- Sent invoices.
- Trust account history.
- Hearings/appointments/deadlines.
- Visible activity timeline.

Portal separates:

- Cases.
- Errands.
- Personal capacity.
- Company representative capacity.
- Law firm context.

Portal clients do not see:

- Internal notes.
- Tasks.
- Hidden activities.
- Hidden documents.
- AI metadata/indexing.
- Audit logs.

## 11. Messaging

Client/staff messaging is matter-specific.

Client message:

- Visible to all assigned staff on the matter.
- Notifies all assigned staff.

Staff message:

- Visible to connected portal users on the matter.
- Notifies all connected portal users.

No general client inbox is required in phase one.

Firm admin can send firm-wide information messages to staff. This is separate from client messages.

## 12. Tasks and Calendar

Tasks are internal only and not visible to clients.

Tasks can be linked to:

- Case.
- Errand.
- Optional time entry.

Calendar shows:

- Case hearings.
- Errand appointments/milestones/deadlines.
- Tasks.
- Invoice/billing dates where appropriate.

Staff calendar follows assignment permissions.

Clients can see hearings/appointments/deadlines for accessible matters.

Clients only view reminders; no attendance confirmation is needed.

## 13. Time Tracking

Time tracking is required to be linked to a case or errand.

Timer also requires case or errand before starting.

Optional task link is allowed, but task must belong to the selected matter.

Time entries store the rate active at the time of logging.

Billing type controls default billable flag:

- Hourly: billable by default.
- Fixed fee/contingency/pro bono/non-billable: non-billable by default.

One timer per user.

Timer continues after refresh.

Logout with active timer prompts user.

## 14. Billing

Every matter has one billing type and one currency.

Invoices:

- Use one currency.
- Use matter currency.
- Draft invoices editable.
- Sent/viewed/paid invoices locked.
- No delete; cancel/archive only.
- Corrections via duplicate/correct invoice workflow in phase one.

Invoices become portal-visible only after explicit send.

Sending invoice:

- Makes visible in portal.
- Sends email notification.

Portal clients view/download invoices only. Staff records payments manually.

## 15. Trust Accounting

Trust accounting tracks client money held by the law firm.

Enabled by default. Firm admin can turn it off.

Accountant and firm_admin manage transactions.

Clients can see their own trust account balance and full transaction history.

All trust actions are audit logged.

## 16. Reports and Dashboard

Dashboard should use one role-based widget framework.

Reports:

- Firm admin: all reports.
- Accountant: financial/time/billing firm reports.
- Lawyer: personal performance report.
- Paralegal/secretary: no personal performance reports by default.

Matter-level summaries can appear inside assigned matters.

## 17. AI

AI assistant/drafting/research/translation are staff-only.

Enabled by default.

Firm admin can:

- Disable staff-facing AI features.
- Restrict individual staff.
- Add own API key/model.
- View full AI logs for own organization.

Super admin can:

- View all usage.
- View full AI logs.
- Disable organization AI.

Sales admin can:

- View usage totals only.
- Not see confidential prompt/response content.

Document indexing is core infrastructure and remains always on. Firm admin disabling staff AI should not disable document indexing.

AI drafts are automatically saved, labeled, tagged, and indexed as AI drafts. They are not portal-visible by default.

## 18. Jurisdiction, Language, and Currency

Each user chooses their language.

The UI must be fully bilingual English/Arabic.

Arabic must be formal legal Arabic using Iraqi legal terminology.

Jurisdiction:

- Organization default jurisdiction.
- Matter-level override.
- Arab country picker.
- Iraq has deep legal AI support.
- Other Arab jurisdictions generic at first.

Currency:

- Organization default.
- Matter override.
- Invoice derived from matter.
- Currency is not client-level.

## 19. Numbering and Categories

Numbering should be universal, intelligent, and not firm-customized in phase one.

Separate numbering for:

- Cases.
- Errands.
- Invoices.

Numbers should include year/type where useful.

Case and errand categories:

- Comprehensive built-in Iraqi practice lists.
- Firm admins can add organization-specific custom categories.

## 20. Notifications

Notification channels:

- In-app.
- Email.
- WhatsApp prepared/manual/later depending on cost.
- Browser/PWA push if practical.

Email should come from Qanuni platform email in phase one with firm branding/reply-to where possible.

## 21. Mobile and PWA

The application must be fully usable on phones for daily staff workflows and portal workflows.

Mobile priority:

- Dashboard.
- Cases.
- Errands.
- Clients.
- Documents.
- Tasks.
- Time.
- Messages.
- Portal.

Admin/report pages should not break, but deep mobile optimization can be lower priority.

Qanuni should support PWA install/add-to-home-screen.

Native apps may come later. Offline support is not required in phase one.

## 22. Onboarding, Help, and Demo Data

New organization should start as a clean workspace.

Optional demo/sample data can be loaded if user chooses.

Onboarding checklist:

- Skippable.
- Resumable.
- Available later.

Built-in help:

- Discreet.
- Contextual.
- Bilingual.
- Static/version-controlled in phase one.

## 23. Export and Audit

Firms must be able to export their data.

Export permissions:

- Firm admin: all firm data.
- Assigned staff: assigned matter data/documents.
- Archive export limited by archive permissions.

Every export is audit logged.

Audit trail is required for everything important, including:

- Data changes.
- Document access/download/upload.
- Billing changes.
- Trust transactions.
- Portal access changes.
- AI usage.
- Exports.
- Conflict decisions.
- User/permission changes.

Audit visibility:

- Super admin: all.
- Firm admin: own organization.
- Ordinary staff: no audit log UI.
- Sales admin: only sanitized non-confidential metadata.

## 24. Out of Scope for Phase One

The following are postponed:

- Native iOS/Android apps.
- Full white-labeling.
- Online invoice payments.
- Credit/debit note module.
- Electronic signatures.
- Offline support.
- Fully custom status workflows.
- Firm-custom dashboard widgets.
- Custom sender domains.
- Automated WhatsApp sending if it costs money.

