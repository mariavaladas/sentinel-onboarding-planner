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

### 2026-05-22: K — Inline editor flicker fix
**By:** K (Frontend Developer)
**Date:** 2026-05-22T14:58:07.474+02:00
**Scope:** js/gantt-planner.js, wizard persistence surface
**Status:** COMPLETE

**Decision**
Defer Gantt table layout rebuilds while an inline editor is active. updateLayout() now stores the latest pending row metrics instead of rebuilding immediately, and closeInlineEditor() replays that deferred update after editing ends. When switching directly from one inline editor to another, the close call suppresses the pending flush so the newly targeted cell is not rebuilt out from under the user.

**Why**
stabilizeGanttRender() can emit a follow-up onLayoutChange even when the table has not materially changed. That rebuild path closed the active editor and replaced the table DOM, which caused the duration/date/status pill editor to flash and disappear.

**Impact**
- Inline duration, date, and status editing stays open during chart stabilization.
- The working mouseup + click trigger pattern and 300ms blur delay remain unchanged.
- Planner reset should clear all sentinelPlanner.* keys together so saved wizard context stays consistent across vendors, server sizing, step restore, solution picks, and duration overrides.

---

### 2026-05-22: K — Solutions page recommendation semantics
**By:** K (Frontend Developer)
**Date:** 2026-05-22T11:26:46.145+02:00
**Scope:** Step 2 vendor selection, Step 3 solution cards
**Status:** COMPLETE

**Decision**
- Remove Azure and Microsoft 365 as default-selected vendors in Step 2 so Step 3 "Recommended" labels only reflect explicit customer selections.
- Reinterpret the Step 3 corner star as a value signal for solutions with at least one connector and at least one analytic rule.
- Surface known infrastructure prerequisites directly on Step 3 cards with a new "Required infrastructure" section.

**Why**
- Default vendor selections were causing false-positive recommendations.
- Users need to distinguish vendor-fit from content richness.
- Infrastructure dependencies affect delivery planning and should be visible before the planning/export steps.

**Files Modified**
- index.html
- js/modules/solutions.js
- css/style.css

---

### 2026-05-22: Sebastian — Solutions page display logic
**By:** Sebastian (Data Engineer)
**Date:** 2026-05-22T14:58:07.474+02:00
**Scope:** js/modules/solutions.js
**Status:** COMPLETE

**Decision**
- Step 3 recommendation badges should resolve a solution's vendor identity with **specific-vendor precedence**.
- If a solution matches a named third-party vendor (for example Palo Alto or Trend Micro), it should only be marked **Recommended** when that vendor was selected in Step 2, even if the same solution also mentions Azure or Microsoft platform terms.
- Value indicators should use content counts and require **at least one connector plus at least one analytic rule**.

**Why**
- Hybrid solutions such as Azure-branded third-party packages were inheriting Microsoft/Azure recommendations from broad tag matching.
- Connector-only packages collect data but do not provide packaged detections, so they should not be marked as valuable.

**Impact**
- Azure/Microsoft category matching still works for genuine first-party records.
- Third-party solutions no longer get cross-vendor recommendation badges from platform keywords alone.
- Existing category, tags, connectors, and analytics fields remain sufficient; no catalog schema change is required.

---

### 2026-05-22: K — Status-based Gantt bar colors
**By:** K (Frontend Developer)
**Date:** 2026-05-22
**Status:** COMPLETE

**Decision**
- Keep `Planned` bars on the existing phase palette so phase sequencing still reads clearly in the dark-theme Gantt.
- Override non-planned task bars with muted status colors shared across phases: blue-teal for `In Progress`, green for `Completed`, and amber for `In Review`.
- Apply the same subtask lightening pass to those status colors so nested rows stay visually related to their parent rows.

**Why**
- Once users start updating execution state, status should be more visually important than phase tone.
- Keeping `Planned` on the phase palette preserves the planning-oriented overview when nothing has started yet.
- Slightly desaturated colors fit the existing dark UI better than bright traffic-light tones.

**Impact**
- Changing a task status in the inline editor now updates the Gantt bar color on the next rebuild/render pass.
- Status dots in the table remain CSS-driven and unchanged.

---

### 2026-05-22: K — Gantt owner popup and status color alignment
**By:** K (Frontend Dev)
**Date:** 2026-05-22
**Status:** COMPLETE

**Decision**
- Replaced the owner cell's native datalist editor with the same anchored popup pattern used by the inline date/duration editors so owner selection renders as an overlay inside the Gantt table instead of bleeding through adjacent rows.
- Shifted planned phase bar colors to a muted slate palette and aligned status colors so table badges and Gantt bars now agree: Planned = muted slate, In Progress = teal, Completed = green, In Review = amber.

**Why**
- Native datalist dropdowns do not respect the planner's inline editor layering as reliably as the custom popup shell.
- Planned and In Progress were visually too close, and In Review was inconsistent between the table badge and the bar fill.

**Impact**
- Owner edits open in a contained popup with proper z-index/positioning.
- Unstarted bars read as quieter/default work, while active and review states are clearly distinct.

---

### 2026-05-22: K — Gantt inline picker UX
**By:** K (Frontend Dev)
**Date:** 2026-05-22
**Status:** COMPLETE

**Decision**
- Step 5 Gantt table and chart popup dates now use `MM/DD/YYYY`, and the frontend persists that preference under `sentinelPlanner.dateFormat.v1`.
- Inline date editing uses an anchored dark-theme popup with both manual text entry and a calendar grid; impossible dates stay invalid and do not save.
- Inline duration editing uses a Monday.com-style picker with quick-pick chips plus a number/unit custom control, while table cells display human-readable durations.
- The Gantt timeline header is rebuilt post-render into a two-tier month/year + day-number layout so month spans can be visually grouped without modifying the vendored library.

**Why**
- Consistent date format improves readability across inline editors and calendar pickers.
- Custom picker patterns ensure impossible dates cannot be entered.
- Two-tier header provides better visual grouping of months in the timeline.

**Impact**
- Date and duration editing experience is consistent and robust across the planner.
- Timeline header now shows both months and day numbers clearly.

---

### 2026-05-22: K — Owner column fallback mapping
**By:** K (Frontend Dev)
**Date:** 2026-05-22
**Status:** COMPLETE

**Decision**
- Use the new Gantt Owner column as a supported role/team field, not a person field. Task rows now prefer `setup_tasks[].owner` when present, otherwise infer a role from task/solution wording (for example RBAC/identity work → Identity/Entra Admin, architecture/design work → SOC Architect, forwarders/servers/agents → Operations Team, validation/content tuning → SOC Engineers). If nothing matches, the UI falls back to the solution-level owner recommendation and finally displays `—`.

**Why**
- The current catalog mostly has solution-level `owner_recommended` values and does not yet provide per-task owners. Heuristic defaults keep the new column useful immediately without forcing a data migration, while inline owner overrides still let customers tailor each task to their own organization.

**Impact**
- Gantt table and detail panel show a role-based owner per task.
- Owner can be reassigned inline and persisted with task overrides.
- Custom free-text team names remain allowed for customer-specific org models.

---

### 2026-05-22: K — Side panel click and descriptions
**By:** K (Frontend Dev)
**Date:** 2026-05-22
**Status:** COMPLETE

**Decision**
- Keep row activation for name/number cells, but move inline-cell activation back to capture phase so editable value cells intercept clicks before the row handler runs. The row handler now only suppresses clicks when the inline trigger/editor itself is active.
- Thread task-level `description` and `required_roles` into plan rows, with safe fallback to solution onboarding notes / solution description so the detail panel can show meaningful context immediately and become richer as catalog metadata is added.

**Why**
- Inline editing and detail-panel opening need to coexist without forcing the whole row to behave as an edit target.
- Task-level context ensures customers understand what each subtask involves.

**Impact**
- Detail panel shows meaningful descriptions from task or solution metadata.
- Inline editing and detail-panel clicks coexist without conflict.

**Files:** `js/gantt-planner.js`, `css/style.css`

---

### 2026-05-22: User directive — Optional server split trigger
**By:** madesous (via Copilot)
**Date:** 2026-05-22T15:11:55Z
**Status:** APPROVED

**What**
- The "Optional server split" (Azure vs on-prem server counts) should NOT be on the Environment page (Step 2). It should appear later, as a setting triggered only when the customer selects Windows servers — only customers with Windows servers need this option.

**Why**
- User request — captures intended user experience.
- Reduces cognitive load on non-Windows scenarios.

**Impact**
- Server split setting moves to Step 5 or is conditionally shown when Windows solutions are selected.

---

---

### 2026-05-22T16:26:15Z: UX Decision — Collapsible solution groups
**By:** madesous (via Copilot)
**What:** Gantt planner should use a two-level tree hierarchy:
- Shared phases (Stakeholder Kickoff, Define Workspace Topology, Training & Handover, Go Live & Monitoring) stay as flat top-level rows
- Each solution/connector becomes a collapsible group header with chevron toggle
- Collapsed by default so stakeholders see the big picture
- Group header bar spans the full duration of its child tasks (aggregate bar)
- Expanding shows individual subtasks indented beneath
**Why:** Scalability — as more connectors are added (currently 5+), the flat task list becomes overwhelming. This keeps the view manageable.

---

### 2026-05-22T16:29:31Z: Feature scope — Firewall connectors with EPS-based VM sizing
**By:** madesous (via Copilot)
**What:** Firewall connectors (Palo Alto, Fortinet, Check Point, etc.) should be added as solutions. Two categories:
1. **VM-based (CEF/Syslog)** — require a log forwarder VM. For these, the wizard asks the user how many EPS (events per second) they expect, then suggests a number of VMs based on documented maximum EPS for CEF and Syslog AMA collectors.
2. **Cloud API connectors** — some firewalls have direct API-to-cloud ingestion (no VM needed).
Requires thorough research into Microsoft's documented EPS limits per VM size for CEF/Syslog data collection.
**Why:** Realistic infrastructure planning — VM sizing is the #1 question SOC teams have for firewall log ingestion. Automating this makes the planner highly valuable.

---

### 2026-05-22T16:44:33Z: User directive
**By:** madesous (via Copilot)
**What:** Each solution group should have a modifiable start date. Changing a solution's start date shifts only the tasks/subtasks within that solution — not other solutions. This enables parallel solution setup where some solutions start later than others at the customer's discretion.
**Why:** User request — captured for team memory

---

### 20260522-171143: User directives - future exploration items
**By:** Maria de Sousa-Valadas Castano (via Copilot)
**What:**
1. Queue exploration of auto-mapping from colleague's MCP discovery agent (Splunk/QRadar) to solutions catalog - so customers don't need to manually select connectors
2. Queue exploration of customers using Cribl as a data pipeline/routing layer - work on this next week

**Why:** User request - future feature exploration items captured for team memory

---

# K — Collapsible solution groups with persisted start offsets

- **Date:** 2026-05-22T17:22:50.5966240+02:00
- **Scope:** `js/gantt-planner.js`, `css/style.css`

## Decision
Model each selected solution as a top-level Gantt "solution group" row inside the existing Step 5 planner pipeline instead of adding a separate grouping layer or new browser store.

- Persist group UI state in the existing `sentinelPlanner.taskDurationOverrides.v1` payload under `solutionGroups`.
- Keep solution groups collapsed by default; only persist `collapsed: false` when a user expands a group.
- Make the solution-group row the only place where a connector-wide start date is edited; child task start overrides remain relative to that group offset.
- Reserve row/bar clicks for selection and toolbar enablement, while chevrons and Gantt labels handle collapse/expand toggles.

## Why
- The planner already rebuilds table rows, Gantt bars, mobile list, and export output from one normalized row model, so grouping belongs in that same pipeline.
- Storing group offsets beside task overrides keeps reset, reload, and derived scheduling behavior deterministic.
- Separating toggle affordances from selection fixes the disabled `+ Add task` flow on solution summary rows without losing collapse controls.

## Notes
- Timeline controls now use a Weeks / Months / Quarters dropdown.
- Custom timeline headers are rebuilt per zoom mode so labels stay readable without forking Frappe Gantt.

---

# K — Gantt task CRUD via override-backed custom tasks

- **Date:** 2026-05-22T16:42:32.7641933+02:00
- **Scope:** `js/gantt-planner.js`, `css/style.css`

## Decision
Store Step 5 task CRUD in the existing browser persistence surface instead of introducing a new store: the `sentinelPlanner.taskDurationOverrides.v1` payload now carries a versioned `{ overrides, customTasks }` shape.

- Built-in/template planner rows stay immutable and are changed through field overrides (`step`, `description`, `owner`, `status`, `impact`, schedule fields).
- User-created tasks and subtasks are stored as `customTasks` entries keyed by ID, attached by `solutionId` and optional `parentRowId`.
- Template tasks are never deleted; they can be marked `Skipped` via status override.
- User-added rows can be hard-deleted, and their related override entries are removed at the same time.

## Why
- The planner already depends on one localStorage-backed override model, so extending that state keeps persistence predictable and easy to reset.
- Rebuilding table rows, Gantt bars, detail panel, and export rows from one normalized plan pipeline prevents CRUD-only drift between surfaces.
- Skipping template rows preserves numbering, dependency chains, and exported plan visibility better than physically removing catalog tasks.

## Notes
- New tasks reopen directly into inline name editing after the plan rerenders.
- Side-panel descriptions are editable and persist through the same override path.
- `Skipped` is now a first-class task status with matching table/bar styling.

---

# Luv QA decision — connector ownership and RBAC metadata

- **Date:** 2026-05-22T16:20:26.073+02:00
- **Agent:** Luv
- **Scope:** `data/solutions.json` connector planning metadata

## Decision
Connector planning metadata should distinguish **platform deployment ownership** from **source-system ownership**, and AMA-based families must explicitly model the Azure roles needed for **DCR/agent deployment** (not just workspace access).

## Why
The QA review found repeated planning errors when a connector spans two control planes:
- source system / vendor admin work (for example AWS IAM, SaaS API credentials, WEC/WEF, device forwarding)
- Azure deployment work (for example AMA, DCR, Function App, Sentinel connector configuration)

A single `owner_recommended` value and simplified permissions block under-state that split for many connectors.

## Impact
- Sebastian can normalize connector families with more accurate role metadata.
- K can later surface primary + secondary owners instead of implying one team can finish every connector alone.
- Future QA should treat Arc, DCR, and source-platform admin prerequisites as first-class planning dependencies.

---

# Sebastian — Windows AMA connector records

- **Date:** 2026-05-22T16:20:26.073+02:00
- **Scope:** `data/solutions.json`

## Decision
Add four AMA-specific companion connector records in `categories.third_party.solutions`:
- `windows-forwarded-events-via-ama`
- `windows-firewall-via-ama`
- `windows-dns-events-via-ama`
- `sysmon-via-ama`

Keep the existing umbrella Windows solution records unchanged.

## Why
- The existing `Windows Forwarded Events`, `Windows Firewall`, `Windows Server DNS`, and `Windows Security Events` records mix legacy and modern paths or contain generic planner content.
- The planner needs connector-specific AMA onboarding data with explicit owners, dependencies, and infrastructure requirements.
- Companion records let the product surface precise plans without deleting legacy Content Hub bundle metadata that other screens still reference.

## Data model notes
- New records carry both `setup_tasks` (explicit phase/task model) and `planner.setup_tasks` (backward-compatible mirror for current UI/export code).
- Added `contentCounts` and `requiredInfrastructure` as richer metadata while preserving existing `analytics`, `workbooks`, and onboarding fields.
- `vendor: "Microsoft"` is stored as descriptive metadata only; no current UI logic depends on it.

---

### 2026-05-25T08:59:01Z: K — Expand/collapse toggle hardening

**By:** K (Frontend Dev)
**Date:** 2026-05-25T10:59:01+02:00
**Status:** COMPLETE

**What**
- Hardened Gantt expand/collapse activation with a shared primary-activation helper that responds to both click and left-button mouseup (plus keyboard) for table chevrons and chart labels.
- Made solution-group names (for rows like **Windows Security Events**) a dedicated toggle label in the task table, so connector groups can expand/collapse from the label as well as the chevron.
- Increased the chevron hit area in css/style.css to make the control easier to hit after the recent responsive/layout changes.

**Why**
- The collapse control had become too fragile after recent table/layout work: relying on a tiny chevron with a plain click handler made the expand action easy to miss or lose.
- Solution-group rows are not inline-editable by name, so turning the visible label into a toggle keeps row selection separate while giving the user a reliable expand target.

**Validation**
- \
ode --check js/gantt-planner.js\
- Headless browser verification with only **Windows Security Events** selected:
  - collapsed state: 6 visible rows
  - after toggle activation: 19 visible rows
  - verified via both \click()\ and \mouseup\ activation paths

**Files:** js/gantt-planner.js, css/style.css


---

### 2026-05-25T12:11:24: User directive
**By:** madesous (via Copilot)
**What:** When there are more than 2 solutions in the Gantt table, collapse them by default (user must expand). When there is only 1 solution, expand it by default.
**Why:** User request — better UX for plans with many solutions vs simple single-solution plans.


---

# K — Inline editor fixes

- **By:** K (Frontend Developer)
- **Date:** 2026-05-25T12:01:41.627+02:00
- **Scope:** `js/gantt-planner.js`
- **Status:** COMPLETE

## Decision
- Inline status and impact `<select>` editors now commit only from the native `change` event. Blur is dismissal-only so it cannot overwrite a fresh selection with the previous value.
- The duration popup now attempts to apply the current typed value when the user clicks outside the editor, matching the commit-on-dismiss behavior already used by the date and owner editors.

## Why
- Native select focus transitions can fire blur before the browser finalizes the newly chosen option, which caused reverted status and impact values on affected rows.
- Planner users expect popup edits to persist when they click away; dropping typed duration values made the grid feel inconsistent next to the owner and date editors.

## Impact
- Status and impact edits should stick on any editable row, including later-phase rows such as Training & Handover.
- Duration edits now save on outside click as long as the typed value is valid; invalid input remains in the editor for correction instead of silently disappearing.


---

# K — Manual status persistence and contextual solution-group defaults

- **Date:** 2026-05-25T12:11:24.551+02:00
- **By:** K (Frontend Developer)
- **Scope:** `js/gantt-planner.js`
- **Status:** Proposed for merge

## Decision

1. A user-selected task status must always persist as an explicit override, including `Planned`.
2. Solution-group default collapse state is contextual to the current plan:
   - 1-2 selected solutions => expanded by default
   - 3+ selected solutions => collapsed by default
3. Stored `solutionGroups.collapsed` values should only exist when the user choice differs from the current contextual default.

## Why

- Reverting a task to `Planned` previously removed the explicit override, so the schedule-driven auto-status resolver immediately turned the task back into `In Progress`, `In Review`, or `Completed`.
- Small plans are easier to scan when fully open, while larger plans need an initially compact view to reduce visual noise.
- Persisting only deviations from the active default keeps local storage compatible with older planner state while still supporting both explicit expand and explicit collapse.

## Impact

- Users can move between `Planned`, `In Progress`, `In Review`, `Completed`, and `Skipped` without directional restrictions.
- Manual `Planned` now sticks until the user changes it again.
- Solution groups open automatically for 1-2 solution plans and start collapsed for larger plans, while toggle behavior continues to work normally after first render.


---

### 2026-05-25T12:43:02Z: Capacity sizing rules
**By:** madesous (via Copilot)
**What:**
1. Multi-site firewalls get EPS **per site** (separate form per firewall instance)
2. Recommend load balancer when >= 3 VMs required for firewalls
3. Above 50k EPS, suggest Azure Monitor Pipeline over standalone AMA
4. Back-navigation preserves manual task overrides; fields editable on Gantt chart too
**Why:** User decisions finalizing Deckard's capacity UX architecture.

---

### 2026-05-25T12:43:02.353+02:00: K — Connector capacity inputs implementation
**By:** K (Frontend Developer)
**Date:** 2026-05-25T12:43:02.353+02:00
**Status:** COMPLETE
**Scope:** js/modules/capacity.js, js/modules/solutions.js, js/gantt-planner.js, css/style.css, index.html, js/app.js
**What:**
1. Connector capacity stored in existing sentinelPlanner.taskDurationOverrides.v1 persistence surface (no new store)
2. Shared Windows sizing entry keyed under solutionGroups for AMA-based Windows connectors
3. Per-solution EPS sizing entries for firewall/CEF connectors
4. Removed legacy Step 2 server split prompt; sizing only in Step 3 card flow and Step 5 detail panel
**Why:**
- Planner already rebuilds rows, badges, export, and manual overrides from override-backed plan model, so capacity belongs in that same state
- Shared Windows sizing avoids duplicate data entry while letting Gantt edits refresh every related connector task reactively
- Aligns UI with approved connector-first sizing experience
**Impact:** Sizing now captured in approved Step 3 card flow and Step 5 detail panel; Step 2 server split removed to reduce duplicate inputs.

---

### 2026-05-25T12:36:45.443+02:00: Connector Capacity Input UX Architecture — APPROVED
**By:** Deckard (Lead / Architect)
**Status:** APPROVED
**What:** Complete UX architecture for per-connector capacity inputs (server count for Windows connectors, EPS for firewall/CEF):
1. **Pattern:** Expand-in-place on solution card, not modal or separate step
2. **Server-count connectors** (Windows Security Events, WEF, DNS, Sysmon):
   - Single shared Windows sizing form (all Windows connectors reference same data)
   - Input: total server count + on-prem/Azure/mix split + default path
   - Output: estimated AMA collectors + forwarders
3. **EPS-based connectors** (Palo Alto, Fortinet, Check Point, etc.):
   - Per-firewall EPS input (can be different EPS per site for multi-site deployments)
   - Output: estimated CEF forwarder VMs based on 5,000 EPS/VM ceiling
4. **Form UX:** Reactive VM estimate on every keystroke, "I don't know" defaults path, validation rules (no hard blocks, all advisory)
5. **Gantt editability:** Solution group header shows ~VM badge; clicking opens detail panel Sizing tab with same form fields; edits propagate to planner task counts reactively
6. **Validation:** Non-numeric input (red border), 0 servers/EPS (warning), >100k EPS (advisory about pipeline), negatives (clamped to 0), decimals (rounded up for VM calc)
7. **Mobile:** Responsive collapse <640px; capacity form stacks vertically
8. **Handling fatigue (10+ connectors):** Smart grouping (Windows-shared input), collapse after save, summary badge showing completion state, non-blocking validation (no gate on Continue)
9. **Defaults:** 1,000 EPS default, 100 Windows servers default (50% on-prem)
**Why:**
- Expand-in-place keeps user in context without navigation cost
- Shared Windows sizing reflects realistic single-estate model
- Non-blocking validation maintains advisory tone of planner
- Gantt editability via existing detail panel surface reuses established edit UX
- Mobile-first responsive collapse ensures usability on all screens
**Open questions (answered by user):**
1. Load balancer recommendation: >= 3 VMs required (CONFIRMED)
2. Pipeline recommendation: Above 50k EPS (CONFIRMED)
3. Multiple EPS firewalls of same type: Per-firewall EPS form (each site gets separate input) (CONFIRMED)
4. Step 3 → Step 5 sync on back-nav: Preserve user overrides, warn user, update defaults only (CONFIRMED)
**Impact:** K can now implement capacity inputs with confidence; sizing form blueprint ready for Step 3 and Step 5 surfaces; shared Windows state pattern established; VM guidance display (inline micro-result + Gantt badge + Excel summary) specified.


---

# K — Gantt columns + detail drawer follow-up

- **Date:** 2026-05-25T13:26:20.812+02:00
- **By:** K
- **Scope:** `js/gantt-planner.js`, `css/style.css`

## Decision
- Keep the existing split-grid Gantt table layout, but move column sizing into a session-scoped width model so every header can be resized with an Excel-style drag handle without introducing a new table component.
- Restore the Step 5 detail drawer on the current overlay shell instead of introducing a second planner layout; extend that drawer with editable fields for task name, description, status, assigned owner, and dependencies while keeping duration in the existing duration editor.
- Reuse the established dark drawer pattern and switch the drawer to a bottom sheet below `768px` to match the Step 3 sizing workspace behavior.

## Why
- The current planner architecture already syncs a custom task grid with Frappe Gantt; replacing it with a semantic table would add UI churn and break the existing inline editors.
- Session-only persistence matches the user request for column widths that survive re-renders during one browser session without becoming long-term local preferences.
- Reusing the current drawer shell fixes the missing task-details workflow faster than rebuilding a parallel side-panel system.

## Impact
- Name starts wider by default and every visible Gantt column can be resized from the header edge.
- Task-row clicks reopen a richer detail drawer with editable planner metadata while inline grid controls remain non-opening interaction targets.
- Mobile users get the same task drawer as a bottom sheet instead of a narrow right rail.


---

# K sizing panel decision

- **Date:** 2026-05-25T13:12:43.036+02:00
- **By:** K
- **Scope:** Step 3 connector capacity UX

## Decision
Move connector sizing off the solution cards and into a dedicated right-side drawer on desktop, with a bottom-sheet overlay on screens narrower than 768px.

## Why
The inline expand pattern made sizing forms too cramped and forced excessive scrolling inside the card grid.

## Implementation notes
- Keep cards compact; show only a one-line sizing summary on-card.
- Open/update the drawer from connector card selection without requiring the user to close it between connectors.
- Preserve shared Windows sizing behavior, but allow the shared form to be edited from any Windows-family connector card.
- Reuse the dark Gantt detail-drawer visual language for consistency.


---

# Luv QA decision — reject connector capacity inputs as currently implemented

**Date:** 2026-05-25T12:49:09.330+02:00  
**By:** Luv  
**Status:** REJECT

## Decision
Do **not** accept the connector capacity inputs feature yet.

## Why
QA found three release-impacting gaps:
1. Firewall sizing is implemented **per solution**, not **per firewall instance / site**, so multi-site deployments cannot be modeled correctly.
2. Capacity classification is heuristic and currently pulls some API/cloud connectors into the firewall sizing path.
3. Numeric handling diverges from the approved rules: decimals do not round up for VM sizing, and negatives are rejected instead of clamped to 0.

## Impact
K should fix the sizing model and classification logic before the feature is approved. The detailed bug list and repro steps are in `.squad/agents/luv/test-report-capacity-inputs.md`.


---

### 2026-06-01T13:00: Cribl integration design decisions
**By:** madesous (via Copilot)
**What:**
- Cribl checkbox only appears on connectors if Cribl is selected in Environment screen (Step 2)
- When Cribl is selected in Environment, it auto-selects Cribl as a solution in Solutions screen (Step 3)
- Checkbox is per-connector, default checked, labeled something like "Cribl will handle ingestion"
- When Cribl checkbox is checked: still ask EPS/server count (for DCR sizing), grey out collector VM question
- Only AMA-based sources get the Cribl checkbox (Windows, Linux, Syslog/CEF) — NOT cloud-native connectors
- Topology: ONE Cribl node in the middle between sources and DCRs
- DCRs from Cribl are custom DCRs (Logs Ingestion API), placed same as other DCRs in topology
- We do NOT size Cribl itself — only Sentinel resources (DCRs). Customer contacts Cribl for Cribl sizing.
- Cribl is 3rd source in Environment screen after M365
**Why:** User design decisions — captured for team memory

---

# Deckard — Azure vs On-Prem Server Topology Spec

**Date:** 2026-05-28
**Author:** Deckard (Lead)
**Status:** Proposal — awaiting approval
**Depends on:** `deckard-topology-servers-spec.md` (merged, server indicator chips approved)

---

## Problem Statement

The topology diagram in Step 4 now shows server nodes with count chips (e.g., `🪟 AMA ×120`). The sizing model captures `onPremPercent` per server pool, which implies an Azure portion too. But today the diagram treats all servers identically — there is no visual distinction between:

- **Azure-hosted servers** (IaaS VMs or Arc-enrolled VMs in Azure) — create an Azure-to-Azure ingestion path, no hybrid connectivity required
- **On-premises servers** — require hybrid connectivity (ExpressRoute or VPN Gateway) to reach Log Analytics / Sentinel

This distinction matters for planning: a customer with 80% on-prem AMA servers has meaningfully different infrastructure prerequisites than one that is 100% Azure-native.

---

## Data Already Available

All necessary data exists in `capacity.js` server pool state. No new inputs needed from the user.

| Field | Source | Description |
|---|---|---|
| `pool.serverCount` | `createServerPool()` | Total servers in the pool |
| `pool.onPremPercent` | `createServerPool()` | Percentage of servers that are on-prem (0–100) |
| Derived `azureCount` | `Math.round(serverCount * (1 - onPremPercent / 100))` | Azure-hosted count |
| Derived `onPremCount` | `serverCount - azureCount` | On-prem count |

`buildServerIndicatorsForGroup()` in `topology.js` already has access to the full capacity snapshot; the profile includes `result.onPremPercent` (resolved from the pool) alongside `result.servers`.

---

## Recommended Design

### 1. Split chips — two sub-chips per pool when mixed

**This is the primary visual change.** Modify `buildServerIndicatorsForGroup()` and `ServerNode` to emit split chips rather than a single merged chip when `onPremPercent` is between 1 and 99 (inclusive).

#### Chip variants

| Scenario | Chips rendered |
|---|---|
| 100% Azure (`onPremPercent === 0`) | One chip: `[⛅ AMA ×40]` — Azure accent color (`#0078d4`) |
| 100% on-prem (`onPremPercent === 100`) | One chip: `[🏢 AMA ×40]` — amber/warm accent (`#f59e0b`) |
| Mixed (e.g., 60% on-prem, 100 servers) | Two chips: `[⛅ AMA ×40]` Azure + `[🏢 AMA ×60]` on-prem |
| Default/estimated, mixed | Two chips with `est.` suffix on both |

The Azure chip always renders first (left), on-prem chip second (right). This mirrors the mental model of Azure as the "native" base.

#### Chip icon tokens

- **Azure chip:** existing OS icon (Windows/Linux) + small cloud glyph (`⛅` or a minimal inline SVG cloud mark at 10px). Border: `#0078d4` at 0.3 alpha. Background: `#0078d4` at 0.1 alpha.
- **On-prem chip:** existing OS icon + small building/datacenter glyph (`🏢` or a minimal server-rack SVG at 10px). Border: `#f59e0b` at 0.3 alpha. Background: `#f59e0b` at 0.1 alpha.

Inline SVGs are preferred over Unicode for export safety (html2canvas consistency). Use the existing `renderServerOsIcon()` pattern to add `renderLocationIcon('azure' | 'onprem')` alongside the OS icon inside the chip.

#### Chip label format

```
[OS-icon] [location-icon] [role] ×[count]  [est.?]
```

Examples:
- `[🪟] [⛅] AMA ×40`
- `[🪟] [🏢] AMA ×60 est.`
- `[🐧] [⛅] CEF ×1`
- `[🪟] [🏢] WEC ×3`

---

### 2. Hybrid connectivity badge on the server node

When any pool contributing indicators to a server node has `onPremPercent > 0`, render a small **"Hybrid"** annotation badge inside the `ServerNode`, below the chip strip.

```
┌────────────────────────────────────┐
│  [🪟] Windows Server               │
│  📡 AMA Agent                      │
│  [⛅ AMA ×40]  [🏢 AMA ×60 est.]   │
│  ⚡ Hybrid connectivity required   │  ← new badge, only when on-prem % > 0
└────────────────────────────────────┘
```

The badge is:
- Small (11px), muted text color (`var(--text-muted)`)
- Prefixed with a bolt or link icon (`⚡` or `↔`)
- Text: `"Hybrid connectivity required"` (full) or `"Hybrid"` (compact if node is narrow)
- No tooltip needed at this stage; the info cards below the diagram are the right place for explanatory copy

**Do not show this badge when `onPremPercent === 0`** — pure Azure paths need no hybrid annotation.

---

### 3. Edge styling — dashed on-prem secondary edge (optional, v2 enhancement)

Changing the primary `source → server` edge style based on mix ratios is architecturally messy because a single edge represents a mixed population. **Do not change the primary edges in this spec.**

Instead, the hybrid connectivity badge on the node is sufficient for v1 visual communication. A secondary dashed annotation edge is listed as a future enhancement if user testing shows the badge is insufficient.

---

### 4. WEC servers — always on-prem, no split

**WEC servers are on-premises by definition.** Their purpose is to collect Windows Event Logs from on-prem Windows endpoints via Windows Event Forwarding subscription. A WEC server sitting in Azure would still be reaching out to on-prem endpoints — the connectivity model is the same.

**Decision: Do not ask users for an Azure/on-prem split on WEC server pools.**

- WEC chips always render with on-prem treatment: `[🪟] [🏢] WEC ×N`
- `onPremPercent` for WEC pools should be treated as `100` regardless of what the pool state says
- The hybrid badge always appears on a `windows_events` node that has WEC indicators
- No UI change needed to the sizing form for WEC

---

### 5. Linux / CEF forwarder paths (syslog_cef)

CEF forwarders are on-prem or IaaS in the customer's environment. The capacity model derives `vmCount` from EPS but does not currently capture an Azure/on-prem split for firewall forwarders.

**For this spec, treat all CEF forwarder VMs as on-prem** (amber treatment). This is conservative and accurate for the majority of deployments. If a future sizing model for CEF adds an Azure/on-prem split, the chip rendering pattern from Windows pools applies directly.

Action: CEF chips always render as `[🐧] [🏢] CEF ×N`.

---

## ASCII Mockup — Mixed Windows Pool

```
[Windows Servers]
  - Windows Security Events
  - Windows Firewall via AMA
  - Windows Forwarded Events
          │
          ▼
 ┌──────────────────────────────────────┐
 │  [🪟] Windows Server                 │
 │  📡 AMA Agent                        │
 │  [⛅ AMA ×40]  [🏢 AMA ×60]          │
 │  [🪟 WEC ×3]                         │
 │  ⚡ Hybrid connectivity required     │
 └──────────────────────────────────────┘
          │
        [DCR: Security Events]
          │
   [Microsoft Sentinel]
```

## ASCII Mockup — 100% Azure Pool

```
[Windows Servers]
  - Windows Security Events
          │
          ▼
 ┌──────────────────────────────────────┐
 │  [🪟] Windows Server                 │
 │  📡 AMA Agent                        │
 │  [⛅ AMA ×100]                       │
 │                                      │
 │  (no hybrid badge)                   │
 └──────────────────────────────────────┘
          │
        [DCR: Security Events]
          │
   [Microsoft Sentinel]
```

## ASCII Mockup — On-Prem CEF Forwarders

```
[On-Premises / IaaS]
  - Check Point
  - Fortinet
          │
          ▼
 ┌──────────────────────────────────────┐
 │  [🐧] Linux Forwarder                │
 │  📡 AMA Agent                        │
 │  [🐧 🏢 CEF ×2]                      │
 │  ⚡ Hybrid connectivity required     │
 └──────────────────────────────────────┘
          │
        [DCR: Syslog/CEF]
          │
   [Microsoft Sentinel]
```

---

## Data Flow Changes

### `buildServerIndicatorsForGroup()` in topology.js

Extend each indicator object with two new fields:

```js
{
    key: 'pool-pool-windows-ama-1',
    os: 'windows',
    role: 'AMA',
    count: 100,                  // existing
    isDefault: false,            // existing
    sortOrder: 0,                // existing
    azureCount: 40,              // NEW: Math.round(count * (1 - onPremPercent/100))
    onPremCount: 60,             // NEW: count - azureCount
    onPremPercent: 60            // NEW: pass through from pool
}
```

For **WEC indicators**, always set `onPremPercent: 100`, `azureCount: 0`, `onPremCount: count` — regardless of pool state.

For **CEF/syslog indicators**, always set `onPremPercent: 100`, `azureCount: 0`, `onPremCount: count`.

Profile source for `onPremPercent`:
- Windows AMA/WEC: `profile.result.onPremPercent` (already populated by `getSolutionCapacityProfile()`)
- CEF: hardcoded to 100 (no split in current model)

### `ServerNode` in topology.js

1. **Chip rendering**: for each indicator, check if `azureCount > 0` and `onPremCount > 0`:
   - Mixed → emit two chips: Azure chip + on-prem chip
   - All Azure → emit one Azure chip
   - All on-prem → emit one on-prem chip

2. **Chip overflow**: the existing limit of 3 visible chips applies across all sub-chips. After splitting, a pool that was 1 chip becomes 2 chips. Account for this in the overflow counter.

3. **Hybrid badge**: compute `hasOnPrem = indicators.some(i => i.onPremCount > 0)`. If true, render the badge below the chip strip.

### `getServerChipStyle()` in topology.js

Add a `location` parameter (`'azure' | 'onprem' | 'mixed'`):

```js
const getServerChipStyle = (location = 'mixed', isDefault = false) => {
    const color = location === 'azure' ? '#0078d4' : '#f59e0b';
    return {
        borderColor: hexToRgba(color, isDefault ? 0.18 : 0.28),
        background: hexToRgba(color, isDefault ? 0.08 : 0.12)
    };
};
```

The existing `color` argument (path accent color) drives the node border but is no longer the right choice for chip fill — chip color now communicates Azure vs on-prem, not ingestion path. This is a semantic clarification.

---

## Constraints Verified

| Constraint | Status |
|---|---|
| No new node types required | ✅ `server` node extended, not replaced |
| No new layout rows or lanes | ✅ chips grow within existing node bounds |
| Dark-theme Fluent UI compatible | ✅ `#0078d4` and `#f59e0b` are existing palette colors |
| Export-safe (html2canvas / jsPDF) | ✅ DOM + inline CSS only; no new external assets |
| WEC always on-prem — no new user input | ✅ hardcoded to 100% on-prem in indicator builder |
| No duplicate shared Windows pool counts | ✅ `seenPoolIds` dedup logic unchanged |
| No new user inputs needed | ✅ `onPremPercent` already captured in sizing form |
| Non-blocking / advisory only | ✅ topology is read-only display; no gates |

---

## What We Are Not Doing (Scope Boundary)

- **No Azure cloud boundary box** around Azure server nodes. This would require significant layout restructuring and is not warranted for the current information density.
- **No dashed/solid edge per connection type** in this spec. The hybrid badge on the node is sufficient for v1.
- **No ExpressRoute/VPN Gateway icon node** added to the graph. The hybrid badge text communicates the same intent without cluttering the path.
- **No CEF Azure/on-prem split UI** — the firewall sizing form does not ask for this today. All CEF forwarders are treated as on-prem.
- **No change to the sizing form** — this spec is purely a topology rendering change.

---

## Implementation Notes for K

1. `buildServerIndicatorsForGroup()` needs to pull `onPremPercent` from the resolved profile result. Check `profile.result.onPremPercent` — this is already stored on the pool and returned by `getSolutionCapacityProfile()`. If it is `undefined`, fall back to `DEFAULT_WINDOWS_ONPREM_PERCENT` (50) for estimated chips.

2. When splitting one chip into two, use keys like `pool-${poolId}-azure` and `pool-${poolId}-onprem` to avoid React key collisions.

3. The `renderLocationIcon()` helper should be a small inline SVG alongside the existing `renderServerOsIcon()`. Keep both at 10–12px for chip-context use.

4. The hybrid badge element: `h('div', { className: 'rf-server-hybrid-badge' }, '⚡ Hybrid connectivity required')`. Add one CSS rule: muted color, 11px, slight top margin. No new class name proliferation.

5. Chip overflow still caps at 3 visible. After splitting, if a pool that was 1 chip becomes 2 chips and the node was at capacity, prioritize: AMA Azure → AMA on-prem → WEC → CEF → overflow. This preserves the most architecturally significant information first.

---

## Open Questions (Deferred)

1. **Should the info cards below the diagram call out hybrid connectivity requirements?** E.g., a fourth info card: "⚡ Hybrid Connectivity — N servers require ExpressRoute or VPN Gateway." Useful, but out of scope for this spec.
2. **Azure Arc servers** — a machine can be on-prem and Arc-enrolled (Azure-managed but physically on-prem). The current `onPremPercent` model does not distinguish Arc-enrolled from non-Arc. This is a future nuance; today's model is sufficient.
3. **Mixed CEF environments** — some customers use Azure-hosted CEF forwarders for cloud SaaS log forwarding. If the CEF sizing form is extended to capture an Azure/on-prem split, the chip pattern here applies without additional design work.

---

# Deckard — topology server indicators spec

## Current state (brief)
- Step 4 topology is rendered by `js/modules/topology.js` with React Flow inside `.topo-container > #reactflow-topology.topo-flow-wrapper`, plus a legend and info cards below it.
- The diagram groups selected solutions by ingestion path (`classifySolution()`), not by individual connector. Current node types are `source`, `pathBox`, `server`, `dcr`, and `sentinel`.
- Server-style paths (`syslog_cef`, `windows_events`) already render a single intermediate `server` node between the source group and Sentinel, but that node is generic today: one icon (`🖳`), one label, no sizing/count metadata.
- `app.js` currently calls `renderTopology(getSelectedPlanSolutions(), ...)`; topology does not currently read connector capacity state.
- Capacity data already exists elsewhere:
  - `js/modules/capacity.js` can build a capacity snapshot and resolve per-solution profiles.
  - `server_count` connectors expose server counts (`result.servers`) and population kinds like `windows_ama` and `wec`.
  - firewall / CEF sizing can expose derived Linux collector counts via `result.vmCount`.
  - Windows shared/additional pool relationships already exist via pool state (`poolId`, `shared_population_group`, relation).

## Proposed enhancement
**Chosen pattern:** keep the current topology layout exactly as-is, and add a compact **server indicator strip** inside the existing `server` node.

Why this pattern:
- It is additive and does not require new lanes, new edges, or a new node type.
- It matches the architecture view: the count belongs to the intermediate server/collector node, not the source list.
- It works with shared Windows pools and WEC pools without duplicating whole rows.

### Visual concept
Each distinct server population becomes a small chip inside the existing server node:
- format: **`[OS icon] [role] ×[count]`**
- examples: `🪟 AMA ×120`, `🪟 WEC ×3`, `🐧 CEF ×2`
- if sizing is default/estimated rather than explicitly entered, add a muted `est.` treatment

### ASCII mockup
```text
[Windows Servers]
  - Windows Security Events
  - Windows Firewall via AMA
  - Windows Forwarded Events
            │
            ▼
   ┌───────────────────────────────┐
   │  [Windows icon] Windows Server│
   │  AMA Agent                    │
   │  [🪟 AMA ×120] [🪟 WEC ×3]     │
   │  [🪟 AMA addl ×40 est.]       │
   └───────────────────────────────┘
            │
          [DCR]
            │
     [Microsoft Sentinel]
```

```text
[On-Prem / IaaS]
  - Check Point
  - Fortinet
            │
            ▼
   ┌───────────────────────────────┐
   │  [Linux icon] Linux Forwarder │
   │  AMA Agent                    │
   │  [🐧 CEF ×2] [🐧 CEF ×1 est.]  │
   └───────────────────────────────┘
            │
          [DCR]
            │
     [Microsoft Sentinel]
```

### Display rules
- Keep the existing node title, label, agent label, edges, DCR node, Sentinel node, legend, and info cards.
- Only render indicator chips when capacity data resolves to a count.
- For Windows shared pools, show **one chip per distinct pool**, not one chip per connector.
- For Windows connectors marked as **Additional servers**, show a second AMA chip instead of merging into the shared chip.
- For WEC, always show a dedicated chip because WEC is a separate population.
- For Linux/CEF collectors, show one chip per connector sizing result unless a future shared Linux pool model is introduced.
- If a row would exceed 3 chips, wrap to a second line or collapse overflow into `+N more` to avoid exploding node width.

## Which connectors get the server indicators
### 1. Windows AMA host pools
Connectors whose capacity profile resolves to Windows host counts.

Current concrete examples:
- `windows-security-events`
- `windows-firewall`
- `windows-firewall-via-ama`
- any future connector using `capacity_type: "server_count"` with `server_population_kind: "windows_ama"`

Behavior:
- show **Windows icon + AMA label + server count**
- dedupe by `poolId` so shared pools are shown once

### 2. Dedicated WEC pools
Connectors whose capacity profile resolves to WEC server counts.

Current concrete examples:
- `windows-forwarded-events`
- any future connector using `capacity_type: "server_count"` with `server_population_kind: "wec"`

Behavior:
- show **Windows icon + WEC label + server count**
- never merge into the generic Windows AMA pool chip

### 3. Linux collector / firewall forwarder paths
Connectors whose capacity profile resolves to Linux collector VM counts from EPS/firewall sizing.

Current intent:
- firewall / CEF / Syslog-style connectors classified by `capacity.js` as `type: "firewall"`
- examples include Check Point, Fortinet, Palo Alto, Cisco ASA, and other CEF/Syslog collector patterns once sizing exists for the selected connector

Behavior:
- show **Linux icon + CEF/Syslog label + derived VM count**
- count source is `result.vmCount` (because EPS is the user input and VM count is the actual server/collector count available to topology)

### Unchanged connectors
- API/codeless connectors
- Azure native connectors
- direct Microsoft 365 / Defender connectors
- Event Hub / Logic App paths
- any connector with no resolved sizing result

These remain visually unchanged.

## Icon approach
### Recommendation
Use **inline SVG icons rendered inside the React Flow node**, not Unicode emoji and not external icon fonts.

Why:
- exported PNG/PDF output will be more consistent than emoji glyph rendering
- no dependency on external assets or webfonts
- easy to recolor with CSS to match the existing dark theme and per-path accent colors

### Specific icons
- **Windows:** simplified four-pane Windows glyph
- **Linux:** simplified Linux glyph (single-color penguin silhouette or similarly simple Linux mark sized for 14–16px use)
- **WEC:** Windows glyph + short `WEC` text badge in the chip (WEC is still Windows-based)

### Rendering placement
- Replace the current generic `🖳` server icon in the header with the path-appropriate OS icon where the path is clearly Windows or Linux.
- Render indicator chips beneath the existing server label / agent label.
- Keep icon sizing small and flat so the topology still feels like the current product, not a redesigned infographic.

## Data flow
1. Step 4 still starts from `app.js` when `renderTopologyStep()` calls the topology renderer.
2. The topology renderer should build or receive the same **capacity snapshot** already used by Step 3/Step 5.
3. For each selected solution, resolve a capacity profile from that snapshot.
4. Convert profiles into **topology server indicators**:
   - **Windows server_count profiles:**
     - source count = `profile.result.servers`
     - role = `AMA` or `WEC`
     - dedupe/group by `poolId` when the pool is shared
     - if relation is additional, emit a separate AMA chip
   - **Firewall/EPS profiles:**
     - source count = `profile.result.vmCount`
     - OS = Linux
     - role = `CEF` or `Syslog` (keep simple and architecture-oriented)
   - **Default sizing:**
     - if `result.isDefault` is true, render a subdued/estimated chip treatment rather than hiding it
5. Pass the resulting indicator array into the existing `server` node `data` payload.
6. `ServerNode` renders the same node as today, plus the optional chip strip.

## Risks / things to preserve
- **Do not break the current topology shape.** No new mandatory nodes, no lane explosion, no new row taxonomy required for v1 of this enhancement.
- **Do not duplicate shared Windows counts.** Shared pool = one chip, not repeated on every connector in that pool.
- **Do not show fake precision.** For firewall paths, use derived collector VM count only when the capacity profile actually resolves; otherwise show nothing.
- **Keep export-safe rendering.** Use DOM/CSS/SVG only so html2canvas + jsPDF exports remain stable.
- **Keep unchanged connectors unchanged.** No new empty badges or placeholder chips on cloud/API/native paths.
- **Keep visual density under control.** If a server node gets many chips, wrap modestly or collapse overflow so the diagram remains readable.
- **Preserve current semantics.** This is an infrastructure annotation layer on top of the existing topology, not a full topology redesign.

---

# Deckard — Uber-Boxes Topology Spec (Environment Zones)

**Date:** 2026-05-28
**Author:** Deckard (Lead)
**Status:** Proposal — awaiting approval
**Supersedes:** `deckard-azure-onprem-topology-spec.md` (split-chips-only approach — rejected)
**Depends on:** `deckard-topology-servers-spec.md` (merged, chip system retained)

---

## Problem Statement

The previous spec proposed splitting chips within existing server nodes to distinguish Azure vs on-prem counts. The user rejected that approach as too shallow — it hides the architectural reality. The real issue is that **Azure and on-prem servers are fundamentally different deployment targets** with different agent stacks, different connectivity requirements, and in the case of on-prem, a mandatory Azure Arc dependency.

This spec replaces the chip-split approach with **environment uber-boxes**: large container zones on the left side of the topology that make the physical/cloud boundary a first-class visual concept. A connector that spans both environments genuinely appears in both boxes, because it genuinely requires separate configuration in each.

---

## Architecture Reality This Spec Expresses

```
On-Prem:  Server → Arc Agent → AMA Agent → DCR → Sentinel
Azure:    Server → AMA Agent → DCR → Sentinel
SaaS/API: (no server) → API Connector → Sentinel
```

**Azure Arc is the bridge** that makes on-prem servers Azure-managed so they can use AMA. This is not an implementation detail — it is a separate prerequisite task in any on-prem onboarding plan. Showing it in the topology makes the Arc dependency visible without the user having to dig into task lists.

---

## Environment Zone Classification

Every topology type maps to one or more environment zones. This is fully derivable from existing data — **no new user inputs required**.

### Zone Membership Rules

| Topology type (`classifySolution` output) | Zone(s) | Derivation rule |
|---|---|---|
| `windows_events` (AMA pool) | On-Premises if `onPremPercent > 0`; Azure if `onPremPercent < 100` | From `profile.result.onPremPercent` on the shared AMA pool |
| `windows_events` (WEC pool) | On-Premises only | WEC servers are always on-prem by definition |
| `syslog_cef` | On-Premises only | CEF forwarders are always on-prem (hardcoded, no split in sizing model) |
| `azure_native` | Azure only | Cloud-native, no server |
| `event_hub` | Azure only | Event Hub is Azure infrastructure |
| `direct` | SaaS only | Microsoft 365 / Defender — API-based, no server |
| `api` | SaaS only | Cloud/SaaS vendor APIs — no server |
| `logic_app` | SaaS only | Custom/3rd-party API via Logic App — no server |

### Connector Split Logic

When a `windows_events` AMA pool has `0 < onPremPercent < 100`:

- The **source connector group appears in BOTH the On-Premises and Azure uber-boxes**
- Two separate source nodes are created: `source-windows_events-onprem` and `source-windows_events-azure`
- Two separate server nodes are created: `server-windows_events-onprem` (Arc + AMA) and `server-windows_events-azure` (AMA only)
- Each server node receives indicators scaled to its environment's count (not the full total)
- The source node in each box shows the same connector list — the split is communicated via the server node counts

When `onPremPercent === 0` (100% Azure): connector appears in the Azure box only.
When `onPremPercent === 100`: connector appears in On-Premises box only.

---

## Visual Design

### Three Uber-Boxes

| Box | Accent color | Background tint | Label |
|---|---|---|---|
| On-Premises | `#f59e0b` (amber) | `rgba(245, 158, 11, 0.04)` | 🏢 On-Premises |
| Azure | `#0078d4` (Microsoft blue) | `rgba(0, 120, 212, 0.04)` | ⛅ Azure |
| 3rd Party Cloud / SaaS | `#8b5cf6` (violet) | `rgba(139, 92, 246, 0.04)` | ☁️ 3rd Party Cloud / SaaS |

Boxes use:
- `1px solid rgba(accent, 0.18)` border
- Rounded corners `8px`
- A label strip at the top-left (12px, uppercase tracking, accent color, 0.7 opacity)
- `zIndex: -1`, `pointerEvents: 'none'` — purely decorative, never blocks interaction
- Sized dynamically to exactly contain their source node rows + `30px` padding on all sides

### Left-Column Scope

Uber-boxes wrap **only the source node column** (approximately X = -20 to X = 320). They do NOT extend over the middle (server nodes) or right (DCR/Sentinel) columns. The arrows exiting the box to the server nodes are the visual cue that those server nodes "belong" to this environment.

### Server Node Variants

Two visual variants of the existing `ServerNode`, distinguished by a new `environment` prop:

#### On-Premises server node
```
┌─────────────────────────────────────┐
│  [🪟] Windows Server                │
│  📡 Arc Agent (Azure Connected)     │  ← NEW: Arc line, only on on-prem nodes
│  📡 AMA Agent                       │
│  [🪟 AMA ×60]  [🪟 WEC ×3]         │  ← existing chip strip (counts scaled to on-prem portion)
└─────────────────────────────────────┘
```

#### Azure server node
```
┌─────────────────────────────────────┐
│  [🪟] Windows Server                │
│  📡 AMA Agent                       │  ← no Arc line
│  [🪟 AMA ×40]                       │  ← counts scaled to Azure portion
└─────────────────────────────────────┘
```

The Arc line is: `h('div', { className: 'rf-server-agent rf-server-agent--arc' }, '📡 ', 'Arc Agent (Azure Connected)')`. CSS: same style as the existing `.rf-server-agent` but with amber accent tint — `color: rgba(245, 158, 11, 0.9)` — to visually distinguish it from the AMA line.

**The Arc line appears if and only if `environment === 'onprem'` on a `windows_events` or `syslog_cef` server node.**

### API/Native Connectors — Direct Edge (No Server Node)

`azure_native`, `direct`, `api`, `logic_app`, and `event_hub` connectors that live in the Azure or SaaS boxes connect **directly from the source node to the middle intermediate boxes (Diagnostic Settings, Native Connector, etc.) and on to Sentinel** — exactly as today. No server node. The uber-box wraps only the source node; the path boxes are still in the middle column.

---

## Layout Algorithm Changes

### Current algorithm (for reference)

```
rowIdx → y = startY + rowIdx * rowSpacing
source: x = 0
server: x = 380
DCR:    x = 600
Sentinel: x = 900, y = centred
```

Each topology group is one row; `rowIdx` is sequential across all groups.

### New algorithm — zone-based layout

**Phase 1: Zone bucket assignment**

Partition all selected topology groups into three buckets: `onprem`, `azure`, `saas`. Apply the zone membership rules in the table above. Split connectors generate entries in two buckets.

```js
// Pseudocode
const zoneRows = { onprem: [], azure: [], saas: [] };

groupEntries.forEach(([type, solutions]) => {
    const zones = getZonesForType(type, capacitySnapshot);
    zones.forEach(zone => zoneRows[zone].push({ type, solutions, zone }));
});
```

`getZonesForType(type, capacitySnapshot)` returns an array of zone strings. For `windows_events`, it inspects `profile.result.onPremPercent` on the shared AMA pool to decide `['onprem']`, `['azure']`, or `['onprem', 'azure']`.

**Phase 2: Compute row Y positions**

```
zoneTopPadding = 50      // space above first row in zone for the box label strip
rowSpacing = 200
zonePadding = 30         // between zones

Iterate zones in order: onprem → azure → saas
For each zone with rows:
    zoneStartY = currentY
    Each row i: rowY = currentY + zoneTopPadding + i * rowSpacing
    zoneEndY = rowY + 140 (approximate row height) + zonePadding
    currentY = zoneEndY + 40 (inter-zone gap)
```

**Phase 3: Uber-box nodes**

For each non-empty zone, push one uber-box node:

```js
{
    id: `uberbox-${zone}`,          // e.g. 'uberbox-onprem'
    type: 'uberBox',
    position: { x: -20, y: zoneStartY - 15 },
    data: { zone, label, color },
    style: {
        width: 340,
        height: zoneEndY - zoneStartY + 15,
        zIndex: -1,
        pointerEvents: 'none'
    },
    draggable: false,
    selectable: false
}
```

**Phase 4: Source, server, DCR, edge nodes — same as before, with new IDs**

For split connectors, the two source nodes use zone-scoped IDs:
- `source-windows_events-onprem` at the on-prem zone Y
- `source-windows_events-azure` at the azure zone Y

For server nodes, same zone-scoped IDs:
- `server-windows_events-onprem` at `x: 440, y: onpremRowY + 10` — environment `'onprem'`
- `server-windows_events-azure` at `x: 440, y: azureRowY + 10` — environment `'azure'`

Non-split connectors use the existing ID format (no zone suffix needed, but zone suffix can be added for consistency):
- `source-syslog_cef-onprem`
- `server-syslog_cef-onprem`

DCR IDs also get zone suffix for split connectors to avoid collisions:
- `dcr-windows_events-onprem`
- `dcr-windows_events-azure`

**Sentinel stays centred** on the total combined height of all zones.

---

## Data Flow Changes

### New: `getZonesForType(type, capacitySnapshot)`

New helper in `topology.js`. Returns `string[]` (zone names). Consults `capacitySnapshot` for `windows_events` to find `onPremPercent`. For all other types, returns a fixed zone from a static lookup table.

```js
function getZonesForType(type, capacitySnapshot) {
    if (type === 'syslog_cef') return ['onprem'];
    if (type === 'azure_native' || type === 'event_hub') return ['azure'];
    if (type === 'direct' || type === 'api' || type === 'logic_app') return ['saas'];
    if (type === 'windows_events') {
        const onPremPct = getWindowsAmaOnPremPercent(capacitySnapshot);
        const hasOnPrem = onPremPct > 0;
        const hasAzure = onPremPct < 100;
        return [
            ...(hasOnPrem ? ['onprem'] : []),
            ...(hasAzure ? ['azure'] : [])
        ];
    }
    return ['saas'];
}

function getWindowsAmaOnPremPercent(capacitySnapshot) {
    const shared = capacitySnapshot?.[WINDOWS_SHARED_CAPACITY_KEY];
    if (!shared) return DEFAULT_WINDOWS_ONPREM_PERCENT;
    return clampPercent(shared.onPremPercent ?? DEFAULT_WINDOWS_ONPREM_PERCENT);
}
```

### Extended: `buildServerIndicatorsForGroup(type, solutions, capacitySnapshot, environment)`

Add an `environment` parameter (`'onprem' | 'azure' | null`). When provided, scale the counts:

```js
// For AMA indicators
const totalCount = Number(profile.result.servers) || 0;
const onPremPct = clampPercent(profile.result.onPremPercent ?? DEFAULT_WINDOWS_ONPREM_PERCENT);
const azureCount = Math.round(totalCount * (1 - onPremPct / 100));
const onPremCount = totalCount - azureCount;

const count = environment === 'azure' ? azureCount
            : environment === 'onprem' ? onPremCount
            : totalCount; // null = no split (legacy path)
```

For WEC indicators: always emit full count regardless of `environment` (WEC is always on-prem; when `environment === 'azure'`, skip WEC indicators entirely).

For CEF indicators: always on-prem; if `environment === 'azure'`, skip.

### Extended: `ServerNode` component

Add `environment` prop to node data. Render the Arc agent line conditionally:

```js
function ServerNode({ data }) {
    const isOnPrem = data.environment === 'onprem';
    // ...
    return h('div', { className: 'rf-server-node', style: { borderColor: data.color } },
        h(Handle, { type: 'target', position: Position.Left, ... }),
        h('div', { className: 'rf-server-icon', ... }, renderServerOsIcon(...)),
        h('div', { className: 'rf-server-label' }, data.serverLabel),
        isOnPrem
            ? h('div', { className: 'rf-server-agent rf-server-agent--arc' }, '📡 Arc Agent (Azure Connected)')
            : null,
        h('div', { className: 'rf-server-agent' }, '📡 ', data.agentLabel),
        // ... chip strip unchanged
    );
}
```

### New: `UberBoxNode` component

```js
function UberBoxNode({ data }) {
    const { label, color } = data;
    return h('div', {
        className: 'rf-uberbox-node',
        style: {
            borderColor: hexToRgba(color, 0.18),
            background: hexToRgba(color, 0.04)
        }
    },
        h('div', { className: 'rf-uberbox-label', style: { color } }, label)
        // no handles — this node is a visual container only
    );
}
```

CSS for `.rf-uberbox-node`:
```css
.rf-uberbox-node {
    border: 1px solid;
    border-radius: 8px;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    pointer-events: none;
}

.rf-uberbox-label {
    position: absolute;
    top: 8px;
    left: 14px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    opacity: 0.75;
}
```

Register in `nodeTypes`:
```js
const nt = React.useMemo(() => ({
    source: SourceNode,
    pathBox: PathBoxNode,
    server: ServerNode,
    dcr: DCRNode,
    sentinel: SentinelNode,
    uberBox: UberBoxNode    // NEW
}), []);
```

### CSS addition: Arc agent line

```css
.rf-server-agent--arc {
    color: rgba(245, 158, 11, 0.9);
}
```

---

## Conceptual Topology (Annotated)

This illustrates the final layout for a mixed Windows deployment (60% on-prem, 40% Azure) with firewall CEF sources and some SaaS connectors selected.

```
X=0 (source col)                X=440 (server col)     X=660 (DCR col)    X=920 (Sentinel)
│                                │                      │                  │
▼                                ▼                      ▼                  ▼

┌──── 🏢 On-Premises ──────────────────────────────────────────────────────────────────── (amber border)
│
│  ┌── source: Windows Servers ──┐        ┌─────────────────────────────┐
│  │  Windows Security Events    │ ──────→ │  [🪟] Windows Server       │
│  │  Windows Firewall via AMA   │        │  📡 Arc Agent (amber)       │
│  │  Windows Forwarded Events   │        │  📡 AMA Agent               │    ┌──────────────────┐
│  └─────────────────────────────┘        │  [🪟 AMA ×60] [🪟 WEC ×3]  │ →→ │ DCR: Security    │ →→┐
│                                         └─────────────────────────────┘    │ Events           │   │
│  ┌── source: Firewalls ────────┐                                           └──────────────────┘   │
│  │  Check Point                │        ┌─────────────────────────────┐                          │
│  │  Fortinet                   │ ──────→ │  [🐧] Linux Forwarder      │                          │
│  └─────────────────────────────┘        │  📡 Arc Agent (amber)       │    ┌──────────────────┐   │
│                                         │  📡 AMA Agent               │ →→ │ DCR: Syslog/CEF  │ →→┤
└─────────────────────────────────────    │  [🐧 CEF ×2]               │    └──────────────────┘   │
                                          └─────────────────────────────┘                          │
                                                                                                    │    ┌──────────────────┐
┌──── ⛅ Azure ─────────────────────────────────────────────────────────────────────────── (blue border)   │  🛡️ Microsoft    │
│                                                                                                   ├──→ │  Sentinel        │
│  ┌── source: Windows Servers ──┐        ┌─────────────────────────────┐                          │    │                  │
│  │  Windows Security Events    │ ──────→ │  [🪟] Windows Server       │    ┌──────────────────┐   │    │  (Log Analytics  │
│  │  Windows Firewall via AMA   │        │  📡 AMA Agent               │ →→ │ DCR: Security    │ →→┤    │   Workspace)     │
│  └─────────────────────────────┘        │  [🪟 AMA ×40]               │    │ Events           │   │    └──────────────────┘
│                                         └─────────────────────────────┘    └──────────────────┘   │
│  ┌── source: Azure Resources ──┐                                                                  │
│  │  Azure Active Directory     │ ──────────────────────────────────────────────────────────────→→┤
│  │  Azure Activity Logs        │  (direct edge, no server node)                                   │
│  └─────────────────────────────┘                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────    │
                                                                                                    │
┌──── ☁️ 3rd Party Cloud / SaaS ────────────────────────────────────────────────────────── (violet)  │
│                                                                                                    │
│  ┌── source: SaaS ─────────────┐                                                                  │
│  │  Office 365                 │ ──────────────────────────────────────────────────────────────→→┤
│  │  Microsoft 365 Defender     │  (API connector, no server node)                                 │
│  └─────────────────────────────┘                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────    │
                                                                                                    ↓
```

---

## What Happens for Each Scenario

| User's selection + sizing | What the topology shows |
|---|---|
| Windows Security Events, `onPremPercent = 0` | Single Azure box. Windows Servers source → Azure server node (AMA only, no Arc). |
| Windows Security Events, `onPremPercent = 100` | Single On-Premises box. Windows Servers source → on-prem server node (Arc + AMA). |
| Windows Security Events, `onPremPercent = 60` | Both boxes. On-Prem box: source → on-prem server (Arc + AMA, ×60). Azure box: source → azure server (AMA, ×40). |
| Windows Forwarded Events only | On-Premises box only (WEC pool = always on-prem). Source → on-prem server (Arc + AMA, WEC ×N chips). |
| Firewall (CEF) + Windows mixed | On-Premises box: two source groups (Firewalls, Windows Servers). Azure box: Windows Servers only. Each has its own server node. |
| Azure AD + Azure Activity | Azure box only. Direct edges to Sentinel — no server node at all. |
| Office 365 + M365 Defender | SaaS box only. Direct edges via Native Connector path box to Sentinel. |
| No sizing entered | Default indicator counts shown (`est.` suffix). Boxes still appear based on default `onPremPercent = 50`, so both On-Prem and Azure boxes render for Windows connectors. |

---

## No-New-User-Inputs Derivation Path

The diagram below shows exactly how each input field maps to topology output. Nothing new is asked of the user.

```
solutions.json
    └── solution.capacity_type          ─→ classifySolution() ─→ topology type
    └── solution.server_population_kind ─┘                      └─→ zone membership

capacity.js state (already captured in Step 3 form)
    └── shared pool onPremPercent   ─→ getZonesForType()  ─→ ['onprem','azure'] or subset
    └── shared pool serverCount     ─→ scaled chip counts per zone server node

Hardcoded zone rules (no user input needed):
    └── WEC always → onprem
    └── CEF always → onprem
    └── azure_native always → azure
    └── api/direct/logic_app always → saas
```

---

## Constraints Verified

| Constraint | Status |
|---|---|
| No new user inputs | ✅ All derived from existing `onPremPercent` + connector metadata |
| Works with dark theme (Fluent-inspired) | ✅ Colors `#f59e0b`, `#0078d4`, `#8b5cf6` already in palette; background tints at 0.04 alpha are near-invisible |
| Export-safe (html2canvas / jsPDF) | ✅ Uber-box nodes are plain DOM `div`s with inline CSS; no SVG background layers; no external assets |
| WEC always on-prem, no duplicate | ✅ WEC pool hardcoded to `onprem` zone; skipped when `environment === 'azure'` |
| CEF always on-prem | ✅ `syslog_cef` hardcoded to `onprem` zone |
| Existing chip system retained | ✅ Chips stay on server nodes; counts scaled to environment portion |
| Arc agent shows only on on-prem nodes | ✅ Conditional on `environment === 'onprem'` |
| No layout breakage for API/native connectors | ✅ Those groups remain single-zone, same path as today |
| React Flow handles large node count | ✅ Max new nodes = +3 uber-boxes + server node duplication for split connectors; well within React Flow limits |
| Backward compatible (no schema changes) | ✅ `solutions.json` unchanged; `capacity.js` constants unchanged |

---

## What We Are NOT Doing in This Spec

- **No uber-boxes extending over the middle column** (server nodes, DCRs). The boxes are left-column-only. This keeps the connective lines clearly visible.
- **No dashed hybrid edges** — the Arc agent line inside the server node communicates the hybrid topology. Edge style changes are deferred.
- **No ExpressRoute / VPN Gateway node** in the diagram. Arc's managed connectivity model means this is an infrastructure prerequisite, not a topology node. The info cards below the diagram are the right home for explanatory copy about connectivity requirements.
- **No CEF Azure/on-prem split** — CEF forwarders remain hardcoded on-prem. If a future sizing iteration adds an Azure/on-prem split for CEF EPS, the zone machinery already handles it.
- **No changes to the sizing form** — this is a topology rendering spec only.
- **No new info cards** — the existing three info cards (Workspace, Connectors, Estimated Volume) are sufficient. A "Hybrid Connectivity" card is a future enhancement.

---

## Implementation Notes for K

### New files / significant changes

- **`js/modules/topology.js`** — all changes described here. No new files required.

### Step-by-step implementation order

1. **Add `UberBoxNode` component and CSS.** Register in `nodeTypes`. Verify it renders a blank styled box before anything else.

2. **Add `getZonesForType(type, capacitySnapshot)` helper.** Unit test the zone derivation logic with `onPremPercent` edge cases (0, 50, 100, undefined).

3. **Modify `buildServerIndicatorsForGroup` to accept `environment` param.** Scale AMA counts to `azureCount` or `onPremCount` as appropriate. Skip WEC/CEF indicators when `environment === 'azure'`.

4. **Rewrite the layout loop in `renderTopology`.** 
   - Phase 1: Bucket groups into zones using `getZonesForType`.
   - Phase 2: Compute Y positions per zone.
   - Phase 3: Push uber-box nodes.
   - Phase 4: Push source, server, DCR, edge nodes using zone-scoped IDs.
   
5. **Add Arc agent line to `ServerNode`.** Conditional on `data.environment === 'onprem'`. Add `.rf-server-agent--arc` CSS class.

6. **Test edge cases:**
   - All connectors are SaaS only (no On-Prem or Azure box renders)
   - No sizing entered (default `onPremPercent = 50` → both boxes render for Windows)
   - WEC only selected (On-Prem box only; no Azure box)
   - Azure AD only (Azure box only; no server node)

### Node ID collision prevention for split connectors

Use pattern: `${baseId}-${zone}` for all IDs in split scenarios. When not split, suffix is still applied for consistency. Examples:

```
source-windows_events-onprem
source-windows_events-azure
server-windows_events-onprem
server-windows_events-azure
dcr-windows_events-onprem
dcr-windows_events-azure
e-source-windows_events-onprem--server-windows_events-onprem
```

### Chip overflow with scaled counts

After splitting, the on-prem server node may show only `[AMA ×60]` and `[WEC ×3]` — that's 2 chips, well within the 3-chip limit. The Azure server node shows only `[AMA ×40]` — 1 chip. The overflow edge case becomes less frequent with environment scoping, but the cap of 3 visible chips still applies. Priority order (unchanged from previous spec): AMA → WEC → CEF → overflow.

### `getServerChipStyle` — no change needed

The chip color in this design comes from `data.color` on the server node, which is inherited from the `PATH_CONFIGS[type].color`. We are NOT reusing chip color for environment signaling — the uber-box background and Arc agent line handle that communication. Keep `getServerChipStyle` as-is.

---

## Open Questions (Deferred)

1. **Should the uber-boxes extend slightly over the server column?** This would make the "on-prem server node belongs to the On-Prem box" relationship more explicit. Risk: clutters the middle column. Recommendation: start with left-column-only and see if user testing reveals confusion.

2. **Info card: Hybrid Connectivity requirements.** A fourth info card — "⚡ Hybrid Connectivity — N on-prem servers require Azure Arc enrollment + network path to Log Analytics" — would add value. Deferred to a follow-up spec; out of scope here.

3. **Multi-site or multi-region scenarios.** A customer might have on-prem servers in two data centers with different Arc configurations. The current model has one `onPremPercent` per pool. This is a future sizing model extension, not a topology concern today.

4. **event_hub zone assignment.** Currently assigned to `azure` zone. If a customer uses Event Hub to ingest from a third-party SaaS, it could arguably go in the SaaS box. Kept in Azure for now (Event Hub is Azure-native infrastructure). Revisit if user feedback indicates confusion.

---

# K — Collector VM placement

- **Date:** 2026-06-01T12:28:42.119+02:00
- **Owner:** K
- **Context:** Syslog / CEF firewall sizing already captured EPS per connector, but Step 4 topology hardcoded collector VM placement to `onprem` and gave users no way to move shared collector VMs into Azure.
- **Decision:** Store a shared `collectorVmZone` value in the capacity snapshot with a backward-compatible default of `onprem`, collect it once from the first firewall sizing drawer, and reuse that choice across all Syslog / CEF connectors.
- **Implementation notes:** Step 3 shows the full question until the first save, then collapses to a compact summary with a change action; topology reads the persisted zone instead of a constant so the shared collector path renders inside the selected uber-box.
- **Files:** `js/modules/capacity.js`, `js/modules/solutions.js`, `js/modules/topology.js`, `js/gantt-planner.js`, `js/app.js`, `css/style.css`

---

# K — Cribl integration routing

- **Date:** 2026-06-01T13:42:53.548+02:00
- **Scope:** Step 2 environment selection, Step 3 sizing drawer, capacity persistence, Step 4 topology rendering

## Decision
- Treat Cribl as an environment-driven integration layer, not a standalone topology source.
- Auto-select `cribl-stream` when the `cribl` vendor is selected.
- Persist a per-connector `criblIngestion` flag on AMA-eligible connectors so each connector can choose Cribl vs normal AMA routing.
- When `criblIngestion` is true, keep Sentinel sizing inputs active, disable collector VM placement UX, and render the connector through one shared `Cribl Stream` node into `Custom DCR (Logs Ingestion API)` nodes.
- When the vendor is removed, clear `cribl-stream` from selected solutions and clear saved `criblIngestion` flags.

## Notes
- Sentinel resource sizing stays in scope; Cribl sizing does not.
- Shared Windows/Linux/Syslog DCR placement still comes from the existing shared-plan topology logic, now split by `standard` vs `cribl` route.

---

# Decision: Linux Topology — Separate DCRs for Linux Servers and Firewalls/CEF

**Date:** 2026-05-29T11:55:19.375+02:00  
**Author:** K (Frontend Developer)  
**Status:** Implemented

---

## Decision

Split the `syslog_cef` topology path into two distinct flows with separate DCRs:

| Path | Sources | Route | DCR |
|------|---------|-------|-----|
| `linux_server` | Linux Servers (AMA on host) | Source → Linux DCR → Sentinel | Shared Linux DCR (split at 4k servers) |
| `syslog_cef` | Firewalls / CEF appliances | Source → Collector VM → Syslog/CEF DCR → Sentinel | Shared Syslog/CEF DCR (65k EPS limit) |

---

## Classification Logic

`classifySolution()` checks in this order (priority matters):

1. `populationKind === 'windows_ama' || 'wec'` → `windows_events`
2. **`LINUX_SERVER_IDS.has(solutionId) || populationKind === 'linux'` → `linux_server` ← NEW, must come before syslog check**
3. `infra.includes('linux-forwarder') || tags.syslog/cef` → `syslog_cef`
4. …existing rules unchanged

`LINUX_SERVER_IDS = new Set(['linux-syslog', 'microsoft-sysmon-for-linux'])`

---

## Linux DCR Plan (`buildLinuxSharedDcrPlan`)

- Mirrors `buildWindowsSharedDcrPlan` exactly — same bucket-fill algorithm
- `LINUX_DCR_MAX_SERVERS = 4000`, `LINUX_DCR_REQUESTS_PER_SERVER = 3`, `LINUX_DCR_MAX_REQUESTS_PER_MIN = 12000`
- Server counts sourced from `getSolutionCapacityProfile().result.servers` (0 for now — no Linux capacity questions yet in Step 3)
- Returns `{ totalServers, dcrCount, sourceToDcrIds, dcrs[] }`
- Labels: "Linux DCR" (single) / "Linux DCR 1…N" (multiple)
- Color: `#22c55e` (green)

---

## Syslog/CEF Collector Plan (`buildSyslogCefCollectorPlan`)

- Collects all `syslog_cef` rows from zone layouts
- Per solution EPS: `getSolutionCapacityProfile().result.eps || DEFAULT_FIREWALL_EPS (1000)`
- `vmCount = Math.max(1, ceil(totalEps / FIREWALL_VM_EPS_CAPACITY (5000)))`
- `dcrCount = Math.max(1, ceil(totalEps / SYSLOG_DCR_MAX_EPS (65000)))` — practically always 1
- Returns `{ totalEps, vmCount, dcrCount, dcrs[] }`
- DCR labels: "Syslog/CEF DCR" (single) / "Syslog/CEF DCR 1…N" (multiple)
- Near-limit threshold: 80% of 65k EPS

---

## Rendering

**Linux server source nodes:** Rendered inside the on-prem uber-box. Edges go directly from source node to shared Linux DCR nodes (no intermediate server node). Same pattern as `windows_events`.

**Collector VM node:** Single shared `collectorVm` node type (not per-row) positioned at `serverX=440`, centered on syslog_cef row Y positions. Shows Linux OS icon, "Linux VM (collector)" label, VM count chip, and EPS capacity hint. All firewall source nodes edge → this shared collector VM.

**Syslog/CEF DCR node:** Standard `dcr` node type at `dcrX=660`. Uses `assignedEps` + `capacityLabel` fields instead of `requestsPerMinute`. `DCRNode` now handles both capacity models.

**`formatEps()`:** New helper, identical pattern to `formatReqPerMin()` for consistent k-notation display.

---

## Deferred

- Linux Azure zone split (requires Linux capacity questions in Step 3)
- Linux pool grouping in source nodes (same as Windows pools)
- Both can be added without breaking changes to this architecture

---

# K — Linux zone split and prominent sizing labels

- **Date:** 2026-06-01T12:40:54.441+02:00
- **Owner:** K
- **Context:** Linux sizing drawers previously assumed every Linux server was on-prem, and the firewall EPS prompt used a smaller uppercase field label than the collector placement question.
- **Decision:** Persist a Linux `onPremPercent` split beside the server count, reuse that split for topology zone placement, show the firewall EPS question before collector VM placement, and promote the EPS + Linux sizing labels to the same bold question style used by collector placement.
- **Implementation notes:** `createDefaultSizingDraft()` now gives Linux the same 0-100 split model as Windows; Step 3 writes and reads `onPremPercent` for Linux; topology derives on-prem/Azure Linux rows from the saved split; `.solution-sizing-field--prominent` keeps the key questions visually aligned.
- **Files:** `js/modules/solutions.js`, `js/modules/capacity.js`, `js/modules/topology.js`, `css/style.css`

---

# K — pool-grouped Windows source nodes

- **Date:** 2026-05-28T16:38:41.527+02:00
- **Requested by:** madesous
- **Scope:** Step 4 topology rendering in `js/modules/topology.js` and supporting dark-theme styles in `css/style.css`

## Decision
- Render `windows_events` source nodes as pool-based sub-sections keyed by shared sizing pool membership instead of a flat connector list.
- Keep the existing topology row/edge layout unchanged and continue routing Windows rows straight from the source node to the DCR node.
- Enrich the Windows DCR node with a `dataSources` list so the DCR explicitly shows which Windows solutions are collected.

## Why
- Windows AMA and WEC connectors already share planner sizing state by pool, so the topology should visualize the same grouping model.
- Pool sections make shared-vs-dedicated server populations readable without introducing new lanes or changing layout constants.
- Showing DCR data sources inside the node clarifies what the shared Windows DCR is configured to collect.

## Implementation notes
- Build per-pool sections by grouping solutions with the resolved capacity `poolId` and `populationKind`, then reuse `buildServerIndicatorsForGroup()` on each group for the count header.
- Show Arc Agent only for on-prem Windows pools; keep AMA Agent on every Windows pool section.
- Style pool sections and solution boxes with the existing `windows_events` accent color `#06b6d4` for consistency with the dark theme.

---

# K — remove topology estimated volume card

- **Date:** 2026-05-29T11:42:54.949+02:00
- **Requested by:** madesous
- **Scope:** Step 4 topology summary rendering in `js/modules/topology.js`

## Decision
- Remove the `Estimated Volume` card from the Step 4 topology summary and keep only the Workspace and Connectors cards.
- Drop the inline volume range calculation with the card instead of replacing it with another estimate.

## Why
- The current `~X–Y GB/day` value is not based on reliable inputs and risks misleading users.
- Leaving only verifiable summary facts keeps the topology footer trustworthy without changing the rest of the topology logic.

## Implementation notes
- Delete the summary card markup and its inline `selectedSolutions.length * 3` / `* 15` estimate.
- Keep the existing auto-fit summary grid so the remaining cards naturally expand to fill the available width.

---

# K — shared Windows DCR logic

- **Date:** 2026-05-29T11:02:34.500+02:00
- **Requested by:** madesous
- **Scope:** Step 4 topology rendering in `js/modules/topology.js` and supporting dark-theme styles in `css/style.css`

## Decision
- Replace per-zone Windows DCR nodes with shared middle-column Windows DCR nodes outside the environment uber-boxes.
- Calculate the Windows DCR count from total `windows_events` servers across all zones using `DCR_MAX_SERVERS = 4000`, then spread pool/server load across those DCRs as evenly as possible.
- Show each Windows DCR's data sources and estimated request rate, and flag nodes that exceed 80% of the 12,000 req/min guidance.

## Why
- The user wants a neutral shared Windows collection layer between source zones and Sentinel instead of duplicated DCRs inside each zone.
- Azure Monitor DCR limits should be visible in the planner so large mixed on-prem/Azure estates surface when one DCR is no longer enough.
- Operators need a quick read on what each DCR carries and when additional DCRs are warranted.

## Implementation notes
- Build shared Windows DCR assignments from the laid-out `windowsPools` rows, then place the DCR nodes in the middle column and keep all source/DCR/Sentinel edges `straight`.
- Allow pool/server load to spill across multiple DCR nodes so oversized pools can still balance close to the conservative per-DCR ceiling.
- Leave all non-Windows path and DCR behavior unchanged.

---

# K — Windows topology population inference fix

- **Date:** 2026-05-29T11:31:49.342+02:00
- **Requested by:** madesous
- **Scope:** `js/modules/capacity.js`

## Decision
- Treat `WINDOWS_FAMILY_IDS` as the source of truth for Windows AMA connector inference.
- Keep WEC connector IDs as the only explicit `wec` exceptions; every other connector in that family resolves to `windows_ama`.

## Why
- Step 4 topology only includes Windows source pools whose resolved population kind is `windows_ama` or `wec`.
- The prior ID-by-ID inference drifted from the canonical family set, so `sysmon-via-ama` and `windows-dns-events-via-ama` fell back to `windows` and disappeared from the topology diagram.

## Implementation notes
- Check WEC IDs first in `inferWindowsPopulationKind()`, then use `WINDOWS_FAMILY_IDS.has(solutionId)` for the AMA path.
- This keeps future Windows AMA connectors visible in topology as soon as they are added to the family set.

---

# Luv — uber-box sizing for Windows pool nodes

- **Date:** 2026-05-29T10:42:08.284+02:00
- **Requested by:** madesous
- **Scope:** Windows topology row sizing in `js/modules/topology.js`

## Decision
- Replace the coarse `poolCount > 2 ? 95 : 115` row-height heuristic with a CSS-shaped estimate built from the actual Windows pool card structure.
- Model the extra on-prem Arc Agent line explicitly for non-WEC pools instead of trying to absorb that difference through a generic per-pool constant.
- Keep the uber-box height calculation itself unchanged; fix the upstream row estimate that feeds it.

## Why
- The rendered Windows source node height comes from stable box-model pieces: source-node chrome, pool-section padding/gaps, agent lines, and solution boxes.
- Azure and On-Prem diverge because On-Prem AMA pools render one extra agent line; using pool count alone cannot represent that reliably.
- A structure-based estimate is easier to reason about and safer to extend if pool cards gain more solution boxes later.

## Implementation notes
- Use these layout constants in the estimator: `nodeChrome: 56`, `poolGap: 10`, `sectionBase: 104`, `solutionBox: 33`, `solutionGap: 6`, `arcAgentExtra: 28`, `bottomSlack: 18`.
- Treat Arc Agent as present only when `entry.zone === "onprem"` and the pool role is not `WEC Servers`.
- Keep the final row height clamped with `Math.max(rowHeight, ...)` so non-Windows rows still respect the shared 220px baseline.

