# Decisions

> Canonical decision ledger for the Sentinel Onboarding Planner v2.

---

### 2026-05-18: Project scope — planner not deployer
**By:** madesous
**What:** v2 removes deployment automation. Instead of deploying content, it generates a project plan (tasks, timelines, effort) exportable to Excel. The wizard still selects connectors/content, but the output is a planning artifact.
**Why:** User decision — focus on planning value delivery, not automation.

---

### 2026-05-18: Value-based recommendations
**By:** madesous
**What:** The recommendation logic should rank solutions by "value" — criteria TBD. Need to define what makes a solution high-value (coverage, detection quality, ease of setup, etc).
**Why:** User requirement — improve on v1's flat listing.

---

### 2026-05-18: v2 Data Model — Enhanced value_scoring, planner, export_metadata
**By:** Sebastian (Data Engineer)
**What:** solutions.json extended with three new object types per solution:
  - **value_scoring:** complexity_level, setup_hours, data_volume_risk, business_impact, maturity, detection_areas, dependencies → enables priority_score calculation (0–100).
  - **planner:** setup_tasks (ordered list with effort), validation_steps, documentation_url, owner_recommended, common_issues → enables task-driven planner.
  - **export_metadata:** group, priority_score, phased_deployment (1/2/3), integrates_with, estimated_monthly_cost → enables Excel export phasing.
- Scoring formula: 40% business_impact + 20% complexity_inverse + 15% setup_time_inverse + 15% detection_coverage + 10% maturity.
- Recommended strategy: **Balanced Phased** — Phase 1 quick wins (low complexity), Phase 2 high-value moderate complexity, Phase 3 deep integrations.
**Why:** v1 lacks data for recommendations (decision 2026-05-18: "rank by value"), planner tasks, and Excel export. This schema supports all three while maintaining backward compatibility.
**Status:** APPROVED (pending Deckard's scoring criteria lock).
**Next:** Deckard locks scoring criteria; Sebastian populates value_scoring fields across solutions; K builds UI badges for Step 3.

---

### 2026-05-18: v1 Security Findings — Three Critical Blockers
**By:** Rachael (Security Specialist)
**What:** v1 contains three security issues that must be resolved in v2:
  1. **Unpinned CDN dependencies** — No SRI hashes or version pinning. Supply-chain risk (high severity).
  2. **Unsafe innerHTML from external data** — GitHub/Azure values injected without sanitization. XSS risk (high severity).
  3. **Manual token handling** — Paste-based Azure access token flow increases exposure risk. Medium severity.
**Why:** These are not nice-to-haves; they are blockers for production use.
**Action for v2:**
  - Remove token-based deployment flow (aligns with v2 decision: "planner not deployer").
  - Pin all CDN URLs with exact versions and SRI hashes, or self-host.
  - Replace `innerHTML` with safe DOM APIs (`textContent`, `createElement`, sanitizer for rich HTML only).
  - Adopt CSP-friendly frontend: no inline scripts, no `javascript:` URLs, no unsafe event handlers.
  - Add `rel="noopener noreferrer"` to external links.
**Next:** Implement in Step 1 of v2 development; review all HTML/JS for DOM injection patterns.

---

### 2026-05-18: Architecture Gap Analysis — Modularization & Excel Export
**By:** Deckard (Lead)
**What:** v1 is a monolithic 429-line `app.js`. v2 must modularize into 6 ES6 modules and switch export from Markdown to Excel:
  - **modules/wizard.js** — Step navigation (80 lines).
  - **modules/solutions.js** — Load, filter, render solutions (120 lines).
  - **modules/scoring.js** — Value scoring logic (60 lines).
  - **modules/planning.js** — Timeline & effort rendering (100 lines).
  - **modules/export.js** — Excel generation using SheetJS CDN (80 lines; replaces exportPlan).
  - **modules/search.js** — NLP matching, extracted from app.js (40 lines).
- **Excel export:** 4 sheets: Summary, Solutions, Timeline, Notes (customer-editable).
- **Recommendation:** Use SheetJS (CDN, no build step); upgrade to ExcelJS + bundler if advanced features needed later.
- **Keep from v1:** Wizard navigation (4-step flow), vendor pre-selection, connector search, solutions catalog structure.
- **Remove from v1:** Markdown export, deployment wording, ARM/Bicep references, MSAL authentication (none present).
- **New for v2:** Value-scoring system, planning view with timeline/effort, Excel export, value badges on solutions, sort/filter controls.
**Why:** v2 is a planning tool, not a deployer. Modularization enables testing, maintenance, and future features. Excel is better suited to planning artifacts.
**Status:** Recommendation. Awaiting feedback from K (UI), Sebastian (data), Luv (QA) on modularization and scoring weights.
**Decision points:** (1) Excel vs Markdown—confirmed → Excel. (2) Value scoring formula—proposed; awaiting feedback. (3) Build system—vanilla JS + ES6 modules (no build step for MVP). (4) SheetJS vs ExcelJS—propose SheetJS. (5) Data fields—proposed schema in sebastian-v2-data-model.md.
**Next:** K reviews modularization; Luv plans test structure; madesous confirms scoring weights; design review.

---

### 2026-05-19: Deckard Architecture Review — APPROVED WITH CONDITIONS
**By:** Deckard (Lead)
**Status:** APPROVED WITH CONDITIONS (4 conditions)
**Date:** 2026-05-19T090107
**What:** Deckard reviewed the V2 architecture proposal and approved with conditions:
1. **State invalidation documentation required** — Add comment block at top of planning.js documenting the mutable state object and re-render flow.
2. **SheetJS version pin required** — Exact version + SRI hash in all CDN references (no floating versions).
3. **scoring.js stub required** — Skeleton export for `calculateScore()` (actual formula TBD by product).
4. **No React Flow** — Confirm no React/external framework in planner view; stay vanilla JS + DOM.
**Outcome:** Deckard verified conditions satisfied in K's planning.js implementation (state invalidation documented, vanilla DOM throughout).

---

### 2026-05-19: K Planner View Implementation — COMPLETE
**By:** K (Frontend Dev)
**Date:** 2026-05-19
**Status:** SUCCESS
**What:** K replaced planning.js stub with full implementation:
   - **Summary stats bar** — total solutions, total effort, phase breakdowns (uses existing `.stat-card` pattern).
   - **Filter/sort controls** — sort dropdown (Priority Score default, Effort, Phase), phase filter buttons (All / Phase 1/2/3).
   - **Collapsible task cards** — per-solution card showing name, phase badge (colour-coded), priority score, effort. Expandable to show description, setup tasks (ordered with hours), dependencies, common issues.
   - **Empty states** — for no solutions and no matches.
   - **CSS** — ~360 lines appended to style.css (`.planner-summary-bar`, `.planner-controls`, `.planner-badge`, `.planner-task-card`, responsive grid).
**Security:** Used `document.createElement` + `textContent` throughout; no `innerHTML` with solution data (satisfies Rachael's audit).
**Key decision:** Removed `renderTimeline` export (stub-specific, no calls from other modules); kept `calculateTotalEffort` for export.js.
**Outcome:** Planning.js ready for production; no blocking issues identified.

---

### 2026-05-19: renderTimeline Export Removed from planning.js
**By:** K (Frontend Dev)
**Status:** FYI — no blocking impact
**What:** The `renderTimeline` function was removed as part of planning.js full replacement. It was a stub placeholder with no real behaviour and no external callers.
**Impact:** export.js unaffected (only uses `calculateTotalEffort`); wizard.js unaffected (only calls `initPlannerView`).
**Action:** If Luv has test stubs referencing `renderTimeline`, delete those. Otherwise, no action needed.

---

### 2026-05-19: Data Schema Enrichment — COMPLETE
**By:** Sebastian (Data Engineer)
**Date:** 2026-05-19
**Status:** COMPLETE
**What:** solutions.json enrichment finalized with deterministic, category-aware metadata:
   - `export_metadata.group` — derived from category buckets (Azure First Party, Microsoft XDR, Third Party).
   - `export_metadata.phased_deployment` — derived from `value_scoring.setup_hours` using approved thresholds (Phase 1 ≤25h, Phase 2 26–50h, Phase 3 >50h).
   - Dependency chains — CEF-heavy connectors depend on linux-syslog; Microsoft XDR depends on Entra ID, Microsoft 365, workload-specific Defender.
   - `planner.documentation_url` — reuses existing `github_url` (no parallel field to maintain).
**Outcome:** One source of truth for UI, scoring, planner, and Excel export. Deterministic phasing without lookup tables or UI-side scoring rules.

---

### 2026-05-21: K Sequential default start-week proposal
**By:** K (Frontend Dev)
**Date:** 2026-05-21T16:23:07.324+02:00
**What:** Step 5 now proposes a single sequential task flow inside each phase instead of the previous parallel category lanes. Customers can then pin custom start weeks per task, and only untouched downstream rows continue auto-shifting.
**Why:** The approved UX target is the DEX-style project plan with editable Start week and Duration columns, where the app proposes a schedule first and the customer adjusts it.

---

### 2026-05-21: Sebastian — RBAC fingerprints and Windows Security Events planner update
**By:** Sebastian (Data Engineer)
**Date:** 2026-05-21T16:23:07.324+02:00
**Status:** COMPLETE
**Scope:** `data/solutions.json`
**What:** 
   - Adopted RBAC Approach B support in the catalog by adding `permissions.fingerprint` to each permissions block.
   - The fingerprint is a readable deterministic key built from the alphabetically sorted combined `azure_roles` and `m365_roles`, joined with `|`.
   - Empty role sets now emit `fingerprint: null` so the planner can skip deduplication when no shared RBAC exists.
   - Flattened `windows-security-events` `planner.setup_tasks` into six concrete AMA onboarding tasks with explicit effort and category metadata for the current planner renderer.
**Why:** 
   - The planner can now detect duplicate RBAC requirements across selected connectors without maintaining a separate RBAC registry.
   - Windows Security Events now exposes the real operational steps users need to plan, instead of summary rollups that hide the actionable AMA and DCR work.
**Notes:** `ama_only: true` remains unchanged on `windows-security-events`. Validation steps, onboarding notes, and export metadata were preserved.

---

### 2026-05-22: K — Inline table editing and business-day gantt flow
**By:** K (Frontend Dev)
**Date:** 2026-05-22T10:29:10.474+02:00
**Status:** COMPLETE
**What:** Step 5 now uses the left task table as the default edit surface for day-to-day planning changes: duration, status, start date, due date, and impact are edited inline in-place. Gantt scheduling maps task timing to business days so dependency chains continue on the next working day without weekend gaps. Subtask numbering stays attached to parent rows using letter suffixes.
**Why:** Detail panel flow is too slow for plan tuning; subtask bars are unreadable when they only show duration text; whole-week start rounding makes short tasks look artificially separated.
**Impact:**
   - Subtask bars keep task-name visibility even when bar is too short to hold the text internally.
   - Sequential plans now flow in business-day order instead of showing empty weekend dead space between dependent rows.
   - Table behaves more like a spreadsheet for quick PM edits while detail panel remains available for deeper schedule review.
**Files:** `js/gantt-planner.js`, `css/style.css`
**Fixes Applied:**
   1. Subtask bar labels with external text labels
   2. Numbering convention with letter suffixes (A, B, C)
   3. Weekend gap removal in dependency chains
   4. Inline editing for table cells (duration, dates, status)

---
