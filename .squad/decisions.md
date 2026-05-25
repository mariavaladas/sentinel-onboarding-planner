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

