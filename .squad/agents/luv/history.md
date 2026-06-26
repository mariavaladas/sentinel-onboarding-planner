# History — Luv

## Project Context
- **Project:** Sentinel Onboarding Planner v2
- **Stack:** HTML/CSS/JS, Fluent UI web components, solutions.json data catalog
- **User:** madesous
- **Created:** 2026-05-18

## Learnings

- **2026-06-08T12:06:13.373+02:00 — Gantt parallel rendering fix review learnings**
  - The core scheduling contract in `buildGanttPlanData` is two-pass: (1) row construction with estimated positions, (2) `applyRowDisplayOverrides` dependency-resolution pass. The second pass is what actually enforces correct scheduling — initial `startWeek` values in rows are estimates only.
  - `applyRowDisplayOverrides` (line 2285) iterates rows in array order and builds `appliedRowsById` incrementally. Infrastructure rows always appear before connector rows in the array, so `getDependencyEndWeek` will find them resolved when processing connectors. This is the mechanism that makes `joinRowId` delays correct for `usesGeneratedTasks=true` connectors.
  - `readSolutionGroupState` determines override vs. baseline by comparing stored `startWeek` against the current `defaultStartWeek` (i.e., `baselineStartWeek`). After the parallel fix all connectors in the same bucket share the same `baselineStartWeek`, so any stored value that previously equalled the sequential cursor will now differ from the new (earlier) parallel baseline and be treated as a user override. This is the primary state-migration risk.
  - `applySolutionGroupShift` is a safe no-op when `shiftWeeks=0` (line 3517 guard). Same-start-week groups with no user overrides pass through unchanged.
  - `latestSolutionEndWeek` uses the shifted `terminalRow.endWeek` from row construction — it may underestimate for generated-tasks connectors delayed by `joinRowId`. The Training row's `allSolutionTerminalIds` dependency list in `applyRowDisplayOverrides` corrects this downstream.
  - `previousPhaseBaselineEnd` is estimation-based (no user overrides factored in); actual cross-phase scheduling is enforced by `previousPhaseTerminalIds` dependency chains in `applyRowDisplayOverrides`, not by `parallelStartWeek`.
  - Key file path for this area: `js/gantt-planner.js` (fix: 3835–3862, build: 3780–3921, dep-resolve: 2285–2358).

(Session learnings will be appended here)

- **2026-06-10T14:30:17.276+02:00 — Topology layer box QA audit learnings**
  - `topIntermediaryOffsetY` is **280** in current code (line 1033), NOT 72 as the spec says and NOT 160 as Maria assumed. The spec (topology-spec.md) is significantly out of date on all spacing constants.
  - `intermediaryLayerGapY = 200` (code) vs 152 (spec); `topSentinelGapY = 160` (code) vs 96 (spec); `bottomSentinelGapY = 160` (code) vs 120 (spec).
  - The current `layerConfigs` in `createLayerBoxNodes()` (line 1988–1996) misclassifies `'cribl'` and `'pathBox'` into `transformation`/`transformation-bottom` instead of `collection`/`collection-bottom`. This causes Cribl (rendered at `bandBottomY + 80`) to appear 177px ABOVE the transformation box it was classified into, because gap enforcement pushes the transformation box below collection.
  - Bottom-band collectorVm Y formula at line 1794 (`getBottomLayerY(1) - intermediaryLayerGapY * 0.5`) has WRONG DIRECTION. Bottom band sources have larger Y than DCRs (Sentinel is center, sources are at max Y), so collectorVm must use `+ not -` from DCR Y. Current formula puts it 100px above the DCR (towards Sentinel), causing a 20px physical overlap and a backwards edge routing.
  - `bottomSourceGapY = 140` is 4px too small to accommodate a collectorVm (120px) plus any gap between DCR and sources. Needs to be at least 220–260 if a collectorVm placement between DCR and sources is required.
  - The `collection-bottom` layer box bug is a cascade from the wrong collectorVm Y: collectorVm lands above DCR → collection-bottom box spans the DCR zone → transformation-bottom is gap-enforced into an 80px stub far above the actual DCR nodes.
  - Key file: `js/modules/topology.js` lines 1033–1037 (spacing constants), 1475–1476 (getTopLayerY/getBottomLayerY), 1655 (Cribl Y), 1794 (bottom collectorVm Y), 1987–1996 (layerConfigs in createLayerBoxNodes). QA report: `.squad/agents/luv/topology-qa-report.md`.

- **2026-06-02T11:20:47.206+02:00 — environment / solutions / topology QA learnings**
  - Step 2 defaults still originate from the seeded `selectedVendors` set in `js/modules/solutions.js` plus the `restoreSelectedVendors()` fallback in `js/app.js`; always verify both the initial state and the restore path when recommendation defaults look wrong.
  - Step 3 recommendation quality is gated by `hasMinimumContent()` before vendor matching, which suppresses canonical connectors with light packaged content such as `linux-syslog`, `checkpoint`, `fortinet-forti-gate-next-generation-firewall-connector-for-microsoft-sentinel`, and `ping-one`.
  - Workspace-connected solution state is unintentionally rehydrated from `CONNECTED_SOLUTIONS_STORAGE_KEY` in `js/modules/solutions.js`, even though the adjacent comment says it should be session-only.
  - Step 4 shared Syslog/CEF collector rendering is split between `buildSyslogCefCollectorPlan()` and the per-row node creation block in `js/modules/topology.js`; this is the hotspot for duplicate collector nodes and bad Azure-band edge routing.
  - Key file paths: `js/app.js`, `js/modules/solutions.js`, `js/modules/topology.js`, `js/modules/capacity.js`, `data/solutions.json`, `test-results/test-report-env-sol-topo.md`.

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

- **2026-06-03 — Exhaustive QA pass: topology, gantt-tasks.js engine, solutions, cross-module integration**
  - **Most critical finding:** `gantt-tasks.js` (the newly-built Gantt task engine) is never imported by any file in the project. Zero imports in `gantt-planner.js`, `app.js`, or any other module. The entire engine — `buildGanttPlan`, `calculatePlanDuration`, all task catalogs — is dead code and never runs. B-001 written to decisions inbox.
  - **CEF task chain bug:** `CEF-INFRA-05.dependsOn` points to `CEF-INFRA-03` instead of `CEF-INFRA-04`, making tasks 04 and 05 run in parallel when they must be sequential.
  - **Three-way classification conflict on `microsoft-sysmon-for-linux`:** topology.js calls it `linux_server`, gantt-tasks.js assigns Windows AMA infra tasks, solutions.json says `fieldPack: 'syslog-cef'`. All three disagree.
  - **Abbreviation collision:** both `windows-forwarded-events` and `windows-forwarded-events-via-ama` resolve to `WFE` in KNOWN_ABBREVS. The runtime deduplication counter will non-deterministically rename one to `WFE-2`.
  - **`inferFieldPack()` ignores `solution.fieldPack`:** 43 solutions in solutions.json have an explicit `fieldPack`, but the inference function reads `server_population_kind`, `cribl_eligible`, and `tags` only. The explicit field is orphaned.
  - **React/ReactFlow CDN scripts lack SRI hashes:** index.html lines 7–10 use unpkg.com without `integrity=` attributes. frappe-gantt and exceljs do have SRI. Inconsistency. Violates decisions.md policy.
  - **Duration override key excluded from reset:** `sentinelPlanner.taskDurationOverrides.v1` is not in `PLANNER_STORAGE_KEYS`, so custom durations survive a "Reset saved progress" action.
  - **Connected solutions persist to localStorage** despite prior session-only intent (I-005 — same underlying issue flagged in 2026-06-02 session, still present).
  - **`inferFieldPack()` fallback misclassifies API/cloud connectors** as `syslog-cef`, assigning Linux forwarder infra tasks to cloud-native API connectors.
  - **fieldPack coverage in solutions.json is only 9%** (43/489 records). 446 solutions rely entirely on runtime inference once the engine is connected.
  - **Primary report:** `docs/testing-report-2026-06-03.md`
  - **Key file paths:** `js/modules/gantt-tasks.js`, `js/modules/topology.js`, `js/gantt-planner.js`, `js/app.js`, `js/modules/solutions.js`, `data/solutions.json`, `index.html`

- **2026-06-23T08:31:02+02:00 — v1.0 full-release QA assessment learnings**
  - **Verdict: CONDITIONAL NO-GO** — 3 blockers found; 5 warnings; 4 notes.
  - **B1 — selectedVendors defaults still include azure/microsoft365.** `js/modules/solutions.js` L106: `new Set(['azure', 'microsoft365'])`. `js/app.js` L548–550: `restoreSelectedVendors()` fallback hard-codes the same list. Decision 2026-05-22 (K) requires removing these defaults; they were never removed. Every first-time user sees false-positive Recommended badges in Step 3.
  - **B2 — `cribl-stream` solution is missing all three enrichment blocks.** `data/solutions.json`: `cribl-stream` has no `planner.setup_tasks`, no `export_metadata`, no `category` field. Cribl is first-class in Step 2 and auto-added in Step 3; selecting it produces zero Gantt tasks and a malformed Excel row.
  - **B3 — All 18 GCP connectors missing `planner.setup_tasks`.** Affected IDs: `google-cloud-platform-*` (16 connectors) + `google-kubernetes-engine`. Selecting any GCP solution produces an empty solution group in the Gantt. Solutions.json count: 489 total; 19 missing `setup_tasks` (18 GCP + cribl-stream).
  - **W1 — ReactFlow in production code with no formal decision reversal.** `js/modules/topology.js` uses `React`, `ReactDOM`, and `ReactFlow` (L848–849, L2834) despite Deckard's 2026-05-19 condition "No React Flow." The condition was scoped to "planner view" but no explicit topology carve-out is recorded. All three CDN scripts have SRI hashes; supply-chain risk is mitigated. The governance gap (no decision) is the issue.
  - **W2 — Topology layer box misclassification still present from June 10 audit.** `js/modules/topology.js` L2310: `createLayerBoxNodes()` classifies `cribl` and `pathBox` under `transformation` layer box. Known since June 10 QA; still not fixed. Causes Cribl node to appear outside the box it is classified into.
  - **W3 — 5 inline HTML event handlers remain.** `index.html` L112, L115, L122, L128, L134: `onclick`/`onchange` inline handlers in workspace connection section. Rachael's security requirement mandates no inline handlers. Functions correctly exposed via `window.*` in `app.js` (L2324–2328). No CSP meta tag defined.
  - **W4 — Production debug logging in topology.js.** `js/modules/topology.js` L807–818: `console.log` and `console.info` fire on every Step 4 render, dumping `connectedSolutionIds` list.
  - **W5 — ExcelJS used instead of documented SheetJS with no team decision recorded.** `index.html` L12: ExcelJS 4.4.0 (SRI-hashed). Deckard approved SheetJS; switch never documented.
  - **Fixed (confirmed):** The June 2 audit finding about CONNECTED_SOLUTIONS_STORAGE_KEY being unintentionally rehydrated on startup is resolved. `restoreSolutionIds` is called only for `SELECTED_SOLUTIONS_STORAGE_KEY` (L1185); `CONNECTED_SOLUTIONS_STORAGE_KEY` is written but not read on init.
  - **Confirmed present:** Duration override key `sentinelPlanner.taskDurationOverrides.v1` IS cleared on reset because the reset loop iterates all keys with `STORAGE_PREFIX` prefix (L561–562), not just `PLANNER_STORAGE_KEYS`. Previously flagged concern (June 3) is actually resolved by the prefix sweep.
  - **Key file paths:** `js/modules/solutions.js` L106, `js/app.js` L537–552, `data/solutions.json` (cribl-stream + GCP entries), `js/modules/topology.js` L807–818 + L2310, `index.html` L112–134. Report: `.squad/decisions/inbox/luv-v1-qa-assessment.md`.
