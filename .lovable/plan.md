# Qanuni — Phase 3 Rebuild Plan

**Status:** Planning complete. Awaiting approval before any code changes.
**Last updated:** 2026-04-20
**Owner of approval:** product owner (you)

> Supersedes the earlier "Fix client↔lawyer collaboration" plan, which was scoped to a single bug area before the full audit revealed ~30 stub pages and a half-migrated data model.

---

## 1. Situation summary (what we actually have)

The application is in a **half-migrated state**. A previous "client data model" migration:

1. **Replaced** the old `clients` table with two tables: `persons` (individuals) and `entities` (companies), connected via `entity_representatives` (which person works at which company, with role / department / dates).
2. **Replaced** the old direct `case.client_id` field with **`case_parties`** (a case has many parties: each row references either a person or an entity, with `party_type`, `role`, `is_primary`).
3. **Added** portal-side tables: `portal_users` + `portal_user_links` (a portal account can be linked to multiple persons across multiple organizations).
4. **Stubbed out** ~30 page-level files and ~13 shared components, replacing them with `RebuildingStub` placeholders or `return null`.
5. **Did NOT clean up legacy `client_id` columns** still present on `tasks`, `time_entries`, `documents`, `invoices`, `client_messages`, and one SECURITY DEFINER function (`client_can_access_document_object`). These are orphan FKs to a table that no longer exists. **This is a latent runtime risk** and must be addressed before rebuilding billing / tasks / messaging.
6. **Memory + i18n still describe the OLD model** ("Clients are modeled as either Individuals or Companies"). They will be updated as we go.

**Working surfaces today:** Auth, Dashboard, Settings, Notifications, Tasks (kanban), Documents (list + upload + detail), Time Tracking, Reports (most), AI pages (Draft / Research / Translate), Admin panel (most), Onboarding wizard.

**Broken / stub surfaces:** Cases (list / detail / form), Clients / Parties (list / detail / form), Errands (list / detail / form), Billing / Invoices (list / form / detail / aging), Calendar, Activity feed, the entire Client Portal (10 pages), Admin Revenue, Admin System Health, several reports.

---

## 2. Decisions that need your sign-off BEFORE we code

These are pivotal. Please confirm or override.

| # | Decision | Default proposal |
|---|---|---|
| D1 | What is "a client"? | A **Party** = either a `person` OR an `entity`. The UI exposes a single mental model "Parties" (clients / opposing parties / witnesses), with a type toggle (Individual / Company) at creation. `case_parties.role` tells us whether a party is the *client*, *opposing party*, *witness*, *third party*, etc. on a per-case basis. There is no global "is this person a client?" flag — a person becomes a client by being attached to a case with `role='client'`. |
| D2 | Sidebar label and route | Keep `/clients` URL for muscle memory, but rename the page title to **"Clients & Parties"** (`الموكلون والأطراف`). The list shows ALL persons + entities in the org, filterable by "Has active cases as client". |
| D3 | Legacy `client_id` columns on `tasks` / `time_entries` / `documents` / `invoices` / `client_messages` | **Drop them in a single migration** before rebuilding. AND drop / rewrite `client_can_access_document_object` (replace with a corrected version that walks `case_id → case_parties → portal_user_links`). Tasks and time entries get `party_type` + `person_id` + `entity_id` instead, mirroring how invoices already work. **You said "moderate cleanup" earlier — this is the moderate version.** |
| D4 | Existing data in those legacy columns | Production has no real users yet (it's pre-launch). We will **not write a backfill** — drop with `CASCADE` is safe. Confirm. |
| D5 | UI pattern for forms | Per `mem://style/ui-patterns`: standard entities → side-panel slide-overs. Complex multi-step entities (Cases, Invoices, Errands) → full-page forms with a left-side stepper. Persons / Entities → slide-over. |
| D6 | What ships in v1 of the portal | The 5 portal data tables already exist & RLS is in place. v1 portal = Dashboard, My Cases (list+detail), My Documents (read+upload), My Invoices (list+detail+mark-viewed), Messages, Profile. Errands portal pages can be a stretch. |
| D7 | Reports | Cases analytics, Errand analytics, Client analytics, Billing aging, Financial summary are stubs. Ship these AFTER their underlying entities work. They're listed last in the build order. |

---

## 3. New shared components to build FIRST (foundation)

These are dependencies for almost every page rebuild. We build them once, correctly, then everything downstream is fast.

| Component | Purpose | LOC (est) |
|---|---|---|
| `<PartySelector>` | Combobox to pick **either** a `person` or an `entity`. Returns `{ partyType, personId?, entityId?, displayName }`. Searches both tables. Has "+ New person" / "+ New entity" inline. | ~250 |
| `<PartyChip>` | Compact display of a party (avatar + name + type badge). RTL-aware. Bilingual name resolution. | ~80 |
| `resolvePartyName()` helper | Pure function: returns AR or EN name from a person OR entity row. | ~25 |
| `<PersonFormSlideOver>` | Create/edit a person. All fields from `persons` table. AR fields strict `dir="rtl"`. Iraqi geography selectors. | ~350 |
| `<EntityFormSlideOver>` | Create/edit an entity (company). Fields from `entities` table. + management of `entity_representatives` (add/remove people who represent the company). | ~450 |
| `<ClientFormSlideOver>` (rewrite) | Wrapper that asks "Individual or Company?" then opens the right slide-over. Replaces the current `null` stub so the global FAB / "+ New Client" button starts working again. | ~80 |
| `<CasePartiesEditor>` | Manages the `case_parties` rows for one case. Add / remove parties, set role per case (client / opposing / witness / etc), mark primary. | ~250 |
| `<EntityRepresentativesEditor>` | On entity detail/form: link / unlink `persons` to an `entity` via `entity_representatives` with role / dept / dates. | ~200 |
| `useParties()` hook | TanStack Query: paginated, search-able list of parties (UNION of persons + entities). | ~120 |
| `usePerson(id)` / `useEntity(id)` hooks | Single-record fetchers with RLS-aware error handling. | ~80 |
| `lib/parties.ts` | Pure helpers: party type guards, normalized name, primary contact lookup, etc. | ~120 |

**Total foundation: ~2,000 lines, ~10 files. One batch, one turn.**

---

## 4. Rebuild order (dependency-respecting)

Each "Batch" is a single focused turn. After each batch we verify (TS build, smoke test the affected routes), update memory if patterns changed, and move on.

### Batch 0 — Schema cleanup migration (BLOCKING, irreversible)
- Drop legacy `client_id` from `tasks`, `time_entries`, `documents`, `invoices`, `client_messages`.
- Add `party_type`, `person_id`, `entity_id` to `tasks` and `time_entries` (already on the others).
- Replace `client_can_access_document_object` with a corrected version that walks `case_id → case_parties → portal_user_links`.
- Update related RLS policies + the SECURITY DEFINER helpers `portal_user_can_access_*` if needed.
- Update `notify_staff_on_client_message` (currently inserts `NEW.client_id` into a notification's `entity_id`) — switch to `person_id` / `entity_id`.

### Batch 1 — Foundation components (Section 3 above)
No page rebuilds; just the shared kit. Re-wires the global "+ New Client" FAB.

### Batch 2 — Persons + Entities (Clients & Parties module)
- `ClientsPage` (renamed to "Clients & Parties") — unified list with type filter, role-on-active-case filter.
- `ClientDetailPage` — tabs: Overview / Cases (where this party appears) / Documents / Activity / (if entity) Representatives / (if person) Linked entities + Portal access.
- Activity logging via `party_activities` table.

### Batch 3 — Cases module
- `CasesPage` — list with status, priority, primary-client, assigned-team filters.
- `CaseFormPage` — full-page form with stepper: Basics → Court info → Parties (uses `<CasePartiesEditor>`) → Team → Billing.
- `CaseDetailPage` — tabs: Overview, Hearings, Parties, Team, Notes, Documents (existing `EntityDocumentsTab` rebuilt), Time & Billing (`CaseTimeBillingTab` rebuilt), AI Summary (already exists).
- Rebuild stubs: `CaseTimeBillingTab`.

### Batch 4 — Errands module
- `ErrandsPage`, `ErrandFormPage`, `ErrandDetailPage`. Templates, step tracker, party selection.

### Batch 5 — Calendar
- `CalendarPage`. Aggregates hearings + errand due dates + tasks + calendar_events + invoice due dates per `mem://architecture/calendar-unification`.

### Batch 6 — Billing & Invoicing
- `BillingPage` (invoice list, aging summary KPIs).
- `InvoiceFormPage` — full-page form, line items + import un-invoiced time entries.
- `InvoiceDetailPage` — preview, payment recording, mark-paid, "PAID" watermark.
- `BillingAgingReport` page.
- Rebuild stubs: `LogTimeModal`, `GlobalTimerBar`, `ClientBillingTab`.

### Batch 7 — Activity feed + supporting widgets
- `ActivityFeedPage` (cross-entity feed).
- Rebuild dashboard stubs: `MetricCards`, `RecentActivityWidget`, `GettingStartedWidget`.
- Rebuild `useFinancialData`, `useEmployee360Data` hooks.

### Batch 8 — Client Portal (all 10 stub pages)
- `PortalDashboardPage`, `PortalCasesPage` + detail, `PortalDocumentsPage`, `PortalMessagesPage`, `PortalInvoicesPage` + detail, `PortalProfilePage`.
- Stretch: `PortalErrandsPage` + detail.
- Rebuild stubs: `PortalDocumentDetailSlideOver`, `ClientMessagesTab`, `ClientPortalActivityCard`, `CreateClientAccountModal`.

### Batch 9 — Remaining reports + admin
- `FinancialSummaryReport`, `ClientAnalyticsReport`, `ErrandAnalyticsReport`, `BillingAgingReport` (page wrapper).
- `AdminRevenuePage`, `AdminSystemHealthPage`.

### Batch 10 — Documents enhancements
- Rebuild stubs: `AttachToCaseModal`, `DocumentFolderSidebar`, `EntityDocumentsTab`.

### Batch 11 — Sweep
- TS strict pass; replace remaining `any`; lint warnings down.
- Memory updates (`mem://domain/client-model`, `mem://features/portal/data-visibility`).
- i18n key sweep — add new "Parties" namespace.
- Manual QA pass on every restored route.

---

## 5. Estimated size

| Batch | Files touched | Approx LOC | Risk |
|---|---|---|---|
| 0 — schema cleanup | 1 migration | ~150 SQL | High (irreversible). Needs explicit approval. |
| 1 — foundation | ~12 | ~2,000 | Medium (everything depends on these) |
| 2 — Parties | 4 pages + hooks | ~1,800 | Low |
| 3 — Cases | 5 pages/tabs | ~2,500 | Medium (most complex domain) |
| 4 — Errands | 3 pages | ~1,500 | Low |
| 5 — Calendar | 1 page | ~600 | Low |
| 6 — Billing | 5 files | ~2,200 | Medium (money) |
| 7 — Activity & widgets | 5 files | ~800 | Low |
| 8 — Portal | 10 pages | ~2,500 | Medium (RLS-sensitive) |
| 9 — Reports + admin | 6 pages | ~1,800 | Low |
| 10 — Document stubs | 3 files | ~600 | Low |
| 11 — Sweep | many | ~500 | Low |
| **Total** | **~70 files** | **~17,000 LOC** | |

Realistically 10–14 productive turns, assuming each batch fits in one turn and you verify between batches.

---

## 6. Conventions all batches will follow

- All colors via design tokens (no raw HSL/hex in components).
- Bilingual: every visible string via `t()` or inline `language === 'ar' ? ar : en`. Arabic form fields strict `dir="rtl"`.
- All Supabase queries scoped by `organization_id` (RLS does this automatically, but we still add `.eq()` defensively).
- Loading / empty / error states on every page (use existing `<EmptyState>`, `<Skeleton>`, `<DataTable>` primitives).
- `toast()` from `sonner` for user feedback.
- Forms: zod schema + react-hook-form. Phone `+964`, currency IQD/USD, dates DD/MM/YYYY display, ISO storage.
- Slide-overs use existing `<SlideOver>`. Full-page forms use existing `<PageHeader>`.
- New types: define shared types in `src/types/parties.ts` (Party, PartyType, etc.) — don't inline them per file.

---

## 7. What I need from you to proceed

1. **Confirm D1–D7** (or override).
2. **Approve Batch 0** (schema cleanup migration). It's the only one that touches the database and is irreversible.
3. **Confirm execution rhythm:** one batch per turn, with a one-line status check from you between batches before I continue.

Reply **"approve plan + run batch 0"** (or list the decisions you want to override) and I'll write the migration in the next turn.
