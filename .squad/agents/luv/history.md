# History — Luv

## Project Context
- **Project:** Sentinel Onboarding Planner v2
- **Stack:** HTML/CSS/JS, Fluent UI web components, solutions.json data catalog
- **User:** madesous
- **Created:** 2026-05-18

## Learnings

(Session learnings will be appended here)

- **2026-06-01T13:42 — Sizing specs merged into decisions archive**
  - `luv-uberbox-sizing.md` was merged into `decisions.md` as part of K's Cribl integration session. This spec provides the Windows row height estimation model for topology uber-boxes: structure-based calculation using nodeChrome (56), poolGap (10), sectionBase (104), solutionBox (33), solutionGap (6), arcAgentExtra (28), bottomSlack (18). Accounts for extra Arc Agent line on on-prem pools. Keeps non-Windows rows at shared 220px baseline.
  - Supporting specs also merged: `k-linux-zone-and-label-styling.md` (Linux on-prem % split alongside server count), `k-collector-placement.md` (shared collectorVmZone across firewall connectors), `k-remove-estimated-volume.md` (removed unreliable volume estimate card), and 10 additional topology/routing/classification specs.
  - All topology decisions now canonical and team-accessible in `decisions.md`.


- **2026-05-25T12:49:09.330+02:00 — connector capacity inputs QA learnings**
  - Capacity logic is split across `js/modules/capacity.js` (classification + sizing math), `js/modules/solutions.js` (Step 3 cards), and `js/gantt-planner.js` (Step 5 planner/detail panel + persistence).
  - Shared Windows sizing persists under `sentinelPlanner.taskDurationOverrides.v1` using `solutionGroups["__shared-windows-sizing__"]`; firewall sizing persists per `solution.id`, which means multi-site same-product firewalls are not representable yet.
  - Step 3/5 responsive behavior for sizing is driven in `css/style.css` by the `@media (max-width: 640px)` rules that collapse `.solution-sizing-grid`, `.gantt-detail-sizing__grid`, and the `gantt-table-badge--sizing` label.
  - QA hotspot: connector classification is heuristic text matching in `classifyConnectorCapacity()`, so catalog wording can wrongly surface EPS forms for API/cloud connectors such as Cortex XDR-style entries.
  - User preference/policy reminder: keep QA outputs human-readable, write reports under `.squad/agents/luv/`, and record any team-impacting accept/reject call in `.squad/decisions/inbox/`.

- **2026-05-21T14:28:20.714+02:00 — solutions.json audit learnings**
  - Audited **485** catalog records across `azure` (18), `microsoft_365_security` (20), and `third_party` (447).
  - Found a schema-wide blocker: **all 485 records are missing the required per-record `category` field**.
  - Found **157 zero-connector entries** mixed into a supposed connector catalog, including obvious non-connector content (`kql-training`, `soc-handbook`, `watchlists-utilities`) and a placeholder record (`test-solution`).
  - Found deprecated/superseded content still present, including `forescout-legacy`, `threat-intelligence`, `azure-devops-auditing`, and AMA migration edge cases like `common-event-format`, `linux-syslog`, and `windows-security-events`.
  - Pattern noticed: taxonomy is overloaded — `third_party` includes Microsoft/generic platform solutions such as `teams`, `common-event-format`, `linux-syslog`, and `windows-security-events`.
  - RBAC labels looked valid, but several M365-dependent entries still have empty `m365_roles`, so permissions metadata is incomplete even when role names are real.
- **2026-05-21T17:00:59.261+02:00 — planner QA pass 2 learnings**
  - `data/solutions.json` now validates cleanly for this scope: **484** records, no duplicate IDs, `test-solution` removed, `is_connector` and `category` present everywhere, and RBAC fingerprints match the sorted Azure+M365 role sets with `null` reserved for empty role lists.
  - `windows-security-events` now exposes **6** flat planner tasks totaling **6.0h**, which the current Gantt builder consumes directly as six Phase 1 rows.
  - `js/gantt-planner.js` syntax parses successfully and the split-pane/full-width plumbing is present, but the planner still does **not** read `is_connector` or `permissions.fingerprint`, so non-connectors can still be planned and RBAC deduplication is not implemented.
  - Critical schedule bug: a persisted entry that changes only `startWeek` is later interpreted as a **0.5h duration override**, shrinking the task and downstream plan unexpectedly.
  - Latent rollup bug: summary rows with child tasks anchor to the **first** child start instead of the earliest child start when custom child schedules reorder the work.

## Scribe Update (2026-05-21 14:25:39 UTC)
- Decisions merged: 30 items from inbox
- Session log created



## 2026-05-22T11:05 — K's Table UX Fixes
- Agent K completed table numbering reform (flat sequential with nested subtasks)
- Inline editing enabled for all task fields
- Cascade updates implemented for timing changes
- Frontend: js/gantt-planner.js, css/style.css modified
- Status: Ready for QA

---

## 2026-05-22T16:20:26Z — Luv-2 Completion Summary

**Agent Luv-2** completed Windows connector research across 4 families:

**Research deliverable:**
- `.squad/agents/luv/connector-research-windows-family.md` — Complete breakdown of:
  1. **Forwarded Events** (CEF via AMA)
  2. **Windows Firewall** (Advanced Security events via AMA)
  3. **DNS Query Events** (via AMA + DCR)
  4. **Sysmon** (via AMA + custom DCR)

**Content per connector:**
- Setup complexity assessment
- RBAC and permissions requirements
- Infrastructure prerequisites
- AMA/DCR configuration patterns
- Schema and event data details

**Impact:** Research provides data foundation for Sebastian's Windows connector integration task (K-20 upcoming). All connector requirements and setup steps documented for downstream planning.
- **2026-05-22T16:20:26.073+02:00 — solutions.json connector QA review learnings**
  - Reviewed all **488** connector entries with `setup_tasks` and wrote the report to `.squad/agents/luv/solutions-qa-review.md`.
  - Biggest planning-risk pattern: connector families that deploy **AMA/DCR**, **Azure Functions**, or **source-cloud exports** often under-specify the real RBAC/owner prerequisites.
  - Most repeat issues clustered around six metadata families: Azure diagnostic connectors, M365/Defender tenant connectors, Syslog/CEF forwarders, host AMA/DCR connectors, cloud-export connectors, and function-based API connectors.
  - High-risk connector specifics: `windows-security-events` needs conditional Arc + audit-policy modeling, `windows-forwarded-events` needs explicit WEC/WEF prerequisites, and `defender-xdr` should model duplicate-incident cutover dependencies.
  - Key file paths for future QA: `data/solutions.json`, `.squad/agents/luv/connector-research-windows-family.md`, `.squad/agents/luv/solutions-qa-review.md`.
- **2026-05-25T11:45:17.295+02:00 — inline editing bug investigation learnings**
  - Inline planner editing is centralized in `js/gantt-planner.js` under `createTaskTable()`, with dedicated editors for duration (`3258-3409`), select fields (`3411-3478`), name (`3480-3563`), owner (`3566-3677`), and dates (`3680-3866`).
  - Standard post-solution rows such as `task-training-handover` and `task-go-live-monitoring` are created by `addStandardTasks()` and are **not** specially locked; row-type restrictions are driven mainly by `isSummary` and `isSolutionGroup` flags in `createRow()`.
  - Important editability pattern: solution-group rows disable owner/status/impact inline editing, while summary rows keep schedule fields read-only; this behavior is enforced in `createRow()` and cell launchers, not by CSS.
  - The highest-risk QA hotspot in Step 5 is the shared native `<select>` inline editor used by Status and Impact; its delayed blur-save pattern can race with change handling and make valid selections look rejected.
  - Key file paths for this area: `js/gantt-planner.js`, `css/style.css`, `.squad/agents/luv/test-report-inline-editing.md`.

## 2026-05-22T15:12Z — Cross-agent alignment (UX batch)
- QA finding on RBAC metadata accepted by team; queued for Sebastian implementation
- Upstream: K-21 completed collapsible groups; solution start dates now editable per group
- Next: review planner group headers for RBAC/owner visibility in detail panel

## 2026-05-25T10:01:41Z — Inline editing bug root cause audit

**Agent Luv** completed QA audit of inline editing functionality:

**Audit focus:** Status dropdown reliability issue  

**Key findings:**
- **Root cause:** Generic select editor blur/change race condition
- **Pattern:** Native \<select>\ inline editor (shared by Status and Impact) uses delayed blur-save pattern that can race with change handling
- **Effect:** Valid selections may appear rejected or unsaved under timing conditions
- **Affected rows:** No row-specific lock on Training & Handover; editability depends on flags set in \createRow()\

**Bug catalog:** 4 issues documented in .squad/agents/luv/test-report-inline-editing.md
- Select editor race condition (HIGH)
- Standard row editability edge cases
- Timing dependencies in blur/save handlers
- Recovery patterns for visible rejections

**Impact:** Inline editing audit complete; race condition identified for K's follow-up fix.  
**Files:** \js/gantt-planner.js\, \.squad/agents/luv/test-report-inline-editing.md\

**Status:** ✓ COMPLETE — root cause documented and passed to K for remediation.

---

### 2026-05-25T13:26:20.812+02:00: Capacity Inputs QA Review

**Date:** 2026-05-25T12:49:09.330+02:00
**Status:** REJECT
**Task:** Validate K's connector capacity inputs implementation

**QA Findings:**
1. Firewall sizing heuristic pulls API/cloud connectors incorrectly
2. Multi-site deployments cannot be modeled (firewall sizing is per-solution, not per-instance)
3. Numeric handling gaps (decimals don't round up for VM calc, negatives rejected instead of clamped)

**Test Report:**
.squad/agents/luv/test-report-capacity-inputs.md

**Impact:**
- Feature blocked pending K's fixes
- Classification logic and numeric handling must align with approved rules
- Coordinate with K on per-firewall instance sizing model

**Next:**
- Re-review after K addresses fixes

---

## 2026-05-29 — Gantt & Table Tabs QA Pass

**Agent:** Luv  
**Method:** Deep static code review (`js/gantt-planner.js` 7,593 lines + `css/style.css`)  
**Report:** `.squad/agents/luv/test-report-gantt-table-qa.md`

**Key learnings:**
- `.gantt-summary-toggle` CSS class carries `text-decoration: underline dotted` (line 4277) — always check this when "no underlines" is a spec requirement; it's a non-obvious SVG text rule hiding in the toolbar section of the stylesheet
- `bindPrimaryActivation` calls `event.stopPropagation()` — any element using it blocks click events from reaching parent-level chart listeners. Summary task bar labels use this, so their click toggles collapse/expand and does NOT open the sidebar
- `pointer-events: none` on non-summary bar labels is deliberate pass-through to the bar rect — correct for sidebar open. Summary labels are the exception (`pointer-events: auto`) which enables the collapse toggle but breaks "text click → sidebar"
- `detailOverlay.addEventListener('keydown', ...)` only catches Escape when focus is inside the overlay subtree. Pattern to watch: always use `document.addEventListener('keydown', ...)` with a visibility guard for modal-style overlay panels
- `sidebarController` is always `null` in the Gantt timeline-only layout — `sidebarHost` is created but never appended to DOM. The Gantt tab uses `detailOverlay` exclusively for task details; the sidebar CSS rules for Gantt (lines 3324–3336) are dead
- Font-weight non-uniformity (`600` on solution group rows/bars) is present in both Table and Gantt — may be intentional hierarchy, but always flag against "uniform weight" spec requirements until explicitly accepted
- `console.debug` at line 5863 fires on every MutationObserver tick inside `stabilizeGanttRender` — noisy in production

**Bugs found:** 1 critical (dotted underline on summary bars), 3 medium, 2 low  
**Status:** COMPLETE — report delivered to madesous; BUG-GT-001 and BUG-GT-004 queued for K

---

## 2026-05-26T09:09:34+02:00 — Gantt/Table live QA pass

**Agent:** Luv  
**Method:** Headless browser pass against `http://localhost:8080` with 12 selected solutions and live interactions across both planner tabs.

**Validated:**
- Table tab: no inline `+ Add task` rows between groups, dependency text stayed contained, task labels rendered at `13px/400`, row + group row clicks opened details, X/backdrop/Escape close paths worked, toolbar `+ Add task` inserted a new editable row, scrollbar + wheel scrolling responded normally.
- Gantt tab: all visible rows rendered as bars, solution-group labels sat outside-right of bars, bar clicks and label clicks opened details, task labels had no underline, zoom dropdown worked for Weeks/Months/Quarters, scrollbar/wheel scrolling responded, task labels stayed at `13px/400`.
- Code hygiene: no active `console.debug` calls remain in `js/gantt-planner.js`.

**Bugs found:**
- Critical: inline start-date edits persist `startWeek` override state but both Table and Gantt continue showing the original date (`task-stakeholder-kickoff` stayed `05/25/2026` after saving `05/26/2026`).
- Medium: Gantt interactions still emit repeated `frappe-gantt` runtime exceptions (`Cannot read properties of null (reading 'classList')`) during normal bar/label interactions.

**Behavior note:**
- With more than two selected solutions, solution groups default to collapsed and therefore initially show `(expand)`; toggling worked and revealed/hid child rows and bars correctly.

---

## 2026-05-26T12:03:28+02:00 — k-20 verification pass

**Agent:** Luv  
**Scope:** `js/gantt-planner.js`, `data/solutions.json`

**Findings:**
- Capacity scaling is wired correctly in `getTaskPlannedDurationWeeks()` -> `scaleTaskDurationDays()` and applied through `createSolutionPlanRows()` using the shared Windows capacity snapshot. Edge-case math checks out for Arc (on-prem count), DCR (total server count), and validation; non-matched Windows Security Events tasks stay fixed.
- Inline date-save flow now persists first (`saveTaskDurationOverride`) and only then rebuilds planner state (`rebuildPlanData`) before refreshing views, so the stale start-date bug path is closed without an async race.
- Frappe null/classList mitigation is robust: `syncGanttTimelineHeader()` preserves `.date-range-highlight` nodes instead of deleting Frappe-owned header state, and the chart interaction code adds defensive element guards before DOM/classList access.
- **Blocking data issue:** `planner.setup_tasks` for `windows-security-events` is updated correctly, but the duplicated top-level `setup_tasks` block in `solutions.json` is still stale. It is missing `wse-workbooks` and `wse-tune-event-set`, and it still carries the old durations for `wse-audit-policy`, `wse-arc-onboarding`, `wse-validate-securityevent`, `wse-analytics-rules`, and `wse-handoff`.

**Verdict:** REJECT  
**Why:** `solutions.json` now has conflicting task definitions for the same connector, so K's data changes are not complete or internally consistent.

- **2026-05-29T10:42:08.284+02:00 — topology uber-box sizing QA learnings**
  - `estimateRowHeight()` for `windows_events` should track the rendered pool-card box model instead of a coarse `poolCount > 2` switch: node chrome is ~56px, inter-pool spacing is 10px, a base pool section is ~104px, and each solution box adds ~33px plus 6px between stacked solutions.
  - The on-prem Windows variant is taller because each non-WEC pool renders an extra Arc Agent line; that adds ~28px per pool and must be keyed off zone/role, not just the number of pools.
  - QA sanity check for the new formula: representative estimates land at `358px` for Azure (2 pools, 1 solution each) and `589px` for On-Prem (3 pools, 1 solution each with Arc), which keeps the intended bottom slack near the ~30px target.
