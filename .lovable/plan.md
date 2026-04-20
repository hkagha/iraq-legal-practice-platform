# Qanuni — Phase 4 Plan (Polish, Performance, Mobile/A11y, New features)

**Status:** Awaiting approval.
**Last updated:** 2026-04-20
**Supersedes:** Phase 3 plan (rebuild complete).

---

## 1. Context

Phase 3 finished the data-model rebuild: all core modules (Clients/Parties, Cases, Errands, Tasks, Time, Billing, Documents, Calendar, Reports, Portal, Admin) compile cleanly against the new `persons + entities + case_parties` model. Console shows only one real warning worth fixing now (`StaffLoginPage` ref forwarding) plus benign React Router v7 future-flag notices.

Phase 4 is the **harden-and-finish** pass.

---

## 2. Scope (you selected all four)

### Track A — Polish & QA pass
- Fix the `StaffLoginPage` forwardRef warning surfaced in console.
- Manual route walk: Dashboard, Clients/Parties, Cases (list/form/detail tabs), Errands, Tasks, Time, Calendar, Documents, Billing, Reports (all 7), Portal (all pages), Admin (all pages). Capture broken interactions, missing empty states, untranslated strings.
- Replace remaining `any` types in shared code (`hooks/`, `lib/`, `components/ui/`).
- i18n sweep: scan for hard-coded English/Arabic strings outside `t()`; add missing keys to `en.json` / `ar.json`.
- Update memory: `mem://domain/client-model` (rewrite for persons+entities+case_parties), `mem://features/portal/data-visibility` (refresh with new RLS helpers).

### Track B — Performance & SEO
- **Bundle:** add `React.lazy` + `<Suspense>` route-level splitting in `App.tsx` for heavy/rare routes (Reports, Admin, AI pages, Portal). Expect ~40-60% drop in initial JS.
- **Query hygiene:** audit TanStack Query keys; add `staleTime` defaults; deduplicate the dashboard widgets that each fetch counts independently.
- **Images:** ensure `loading="lazy"` + explicit `width/height` on all `<img>`; convert any large PNG assets to WebP if present.
- **SEO basics:** per-page `<title>` + meta description via a small `<SEO>` helper; single H1 per route; JSON-LD `Organization` on landing/login; `robots.txt` + `sitemap.xml` for public routes; canonical tag.
- **Web vitals check:** browser performance profile after changes to confirm LCP/TBT improved.

### Track C — Mobile & accessibility
- Audit all primary actions for 44px minimum touch target (buttons, icon buttons, table row actions).
- Confirm `MobileFAB` reachability across rebuilt pages (Cases, Errands, Tasks, Invoices).
- ARIA labels on all icon-only buttons (sidebar, header, table actions, FAB).
- Keyboard nav: focus rings, modal focus trap (verify `<Dialog>`/`<SlideOver>` already do this), tab order on multi-step forms.
- Color contrast check on navy/gold tokens against WCAG AA in both light & dark mode.
- RTL spot-checks: confirm slide-overs, calendar grid, and step trackers mirror correctly in Arabic.
- Mobile-specific: full-screen modals on `< sm`, table → card list fallback on Clients/Cases/Invoices/Errands lists.

### Track D — New features
You haven't named them yet. **I need a list before I can scope this track.** Likely candidates suggested by gaps I noticed during the rebuild — pick any/all/none:
1. **Bulk actions on Cases & Errands** (status change, assign team, archive) — mirrors the existing Documents bulk action bar.
2. **Saved views & filters** on list pages (persist filter combos per user).
3. **Global command palette** (⌘K) — jump to any case/client/errand/invoice; complements the existing keyboard shortcuts.
4. **Email digests** — daily/weekly summary of overdue tasks, upcoming hearings, unpaid invoices using the existing `email_queue` infra.
5. **Document bundles / case packets** — zip selected documents from a case for export.
6. **Conflict-of-interest checker** — warn when a new party already appears as opposing party on another case.
7. **Trust accounting / IOLTA-style retainer ledger** — tracks retainer balance separately from invoiced amounts.

---

## 3. Execution rhythm

Each track = one focused turn. Order:

1. **Batch 1 — Polish & QA** (Track A) — cheapest, finds bugs that would otherwise distort perf/a11y measurements.
2. **Batch 2 — Performance & SEO** (Track B) — safe, mostly additive.
3. **Batch 3 — Mobile & A11y** (Track C) — UI-focused, depends on #1 done.
4. **Batch 4+ — New features** (Track D) — only after you pick which ones.

Estimated: 3 turns for A/B/C + 1 turn per chosen new feature.

---

## 4. What I need from you

1. **Pick which new features** from the Track D list (or add your own / say "skip Track D").
2. Confirm **Batch 1 (Polish & QA)** can start immediately.

Reply something like *"start batch 1, and for Track D do features 1, 3, 5"* and I'll begin.
