# Planner System — Technical Specification

**Document type:** Internal architecture reference  
**Scope:** Step 5 — Gantt-based project planner  
**Primary files:** `js/gantt-planner.js` (~9 000 lines), `js/modules/gantt-tasks.js`, `js/modules/capacity.js`  
**Status:** Reflects the production codebase as of 2026-06-12  

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)  
2. [Field Pack System](#2-field-pack-system)  
3. [Cribl Integration](#3-cribl-integration)  
4. [Task Generation Engine](#4-task-generation-engine)  
5. [Planner Data Model](#5-planner-data-model)  
6. [Dependency System](#6-dependency-system)  
7. [Capacity & Sizing System](#7-capacity--sizing-system)  
8. [Solution Group Collapse / Expand](#8-solution-group-collapse--expand)  
9. [Gantt Rendering](#9-gantt-rendering)  
10. [Detail Panel](#10-detail-panel)  
11. [Duration & Scheduling](#11-duration--scheduling)  
12. [Export & Persistence](#12-export--persistence)  
13. [Key Design Decisions](#13-key-design-decisions)  

---

## 1. Architecture Overview

### Entry point

```js
// wizard.js calls this when the user reaches Step 5
import { initGanttPlanner } from './gantt-planner.js';
initGanttPlanner(appState.selectedSolutions);
```

`initGanttPlanner(solutions)` clears the previous render, delegates to `renderPlannerWorkspace`, stores the result in the module-level `currentGanttPlanData`, and syncs the export-button state.

### High-level data flow

```
solutions[]
  │
  ▼
buildGanttPlanData(solutions)          ← gantt-planner.js (exported)
  │  calls buildGeneratedGanttPlan()   ← gantt-tasks.js (task engine)
  │  calls getSolutionCapacityProfile()← capacity.js
  │
  ▼  returns { rows[], tasks[], milestones[], exportRows[], ... }
  │
createVisiblePlanData(planData, collapsedSummaryIds, collapsedSolutionGroupIds)
  │  filters invisible rows, remaps dependency IDs to visible ancestors
  │
  ▼  returns { rows[], tasks[], milestones[] }
  │
Frappe Gantt (window.Gantt)            ← SVG timeline
Sidebar (SVG)  +  Table (DOM)  +  Mobile list
  │
stabilizeGanttRender()                 ← post-processes bar colours, labels, phase styling
syncGanttMilestoneMarkers()            ← adds diamond milestone overlays
syncGanttDependencyArrows()            ← draws elbow-style FS dependency arrows
```

### Key files

| File | Lines | Role |
|---|---|---|
| `js/gantt-planner.js` | ~9 000 | Main planner: data assembly, rendering, UI interactions, export |
| `js/modules/gantt-tasks.js` | ~1 700 | Task generation engine: field-pack inference, per-connector tasks, TASK_CATALOG |
| `js/modules/capacity.js` | ~900+ | Sizing profiles, server pools, Cribl eligibility |

---

## 2. Field Pack System

A **field pack** is a named integration pattern that groups connectors sharing the same infrastructure prerequisites. The field pack governs which shared infra tasks are generated (Phase 1) and which per-connector task chain is generated (Phase 2).

### Enum

```js
// js/modules/gantt-tasks.js
export const FIELD_PACK = {
    SYSLOG_CEF:           'syslog-cef',
    WINDOWS_AMA:          'windows-ama',
    WEC_WEF:              'wec-wef',
    AMA_CUSTOM_LOGS:      'ama-custom-logs',
    CRIBL:                'cribl-intermediary',
    NATIVE_DIRECT:        'native-direct',
    DIAGNOSTIC_SETTINGS:  'diagnostic-settings',
    API_CCP:              'api-ccp',
    AZURE_FUNCTION:       'azure-function'
};
```

### Pack behaviour

| Category | Field packs | Shared infra tasks? | Per-connector task chain |
|---|---|---|---|
| **Full packs** | SYSLOG_CEF, WINDOWS_AMA, WEC_WEF, AMA_CUSTOM_LOGS | Yes — dedicated infra block (Phase 1) | PC-01 → PC-02 → PC-03 → PC-04 (4 tasks) |
| **Minimal packs** | NATIVE_DIRECT, DIAGNOSTIC_SETTINGS, API_CCP, AZURE_FUNCTION | No shared infra | Single enablement task only (PC-01) |
| **Cribl pack** | CRIBL | Yes — CRIBL-INFRA-01/02 | Cribl-routed tasks (PC-01/02/03) |

### `inferFieldPack(connector)`

Classification is resolved in priority order:

1. **Explicit override** — `connector.fieldPack` in solutions.json → use it directly.
2. **Cribl connector IDs** — `CRIBL_CONNECTOR_IDS.has(id)` → `FIELD_PACK.CRIBL`.
3. **Known connector IDs** — hard-coded sets `WEC_WEF_IDS`, `WINDOWS_AMA_IDS`, `AMA_CUSTOM_LOG_IDS`, `SYSLOG_CEF_IDS`.
4. **`server_population_kind`** — `'wec'` → WEC_WEF; `'windows_ama'` → WINDOWS_AMA.
5. **`onboarding.infrastructure_required`** — `inferInfrastructurePack()` maps infrastructure keywords to packs.
6. **Tag fallback** — `cef`/`syslog` → SYSLOG_CEF; `azure` → NATIVE_DIRECT.
7. **Safe default** — `FIELD_PACK.NATIVE_DIRECT`.

### Solutions with explicit `fieldPack` vs without

`buildGanttPlanData()` separates the selected solutions into two groups:

- **`generatedFieldPackSolutions`** — solutions where `hasGeneratedFieldPack(solution)` is true (explicit `fieldPack` field on the solution). These go through `buildGeneratedGanttPlan()` in `gantt-tasks.js` for full task generation.
- **All other solutions** — use `solution.planner.setup_tasks` from solutions.json, processed by `createSolutionPlanRows()` in `gantt-planner.js`.

---

## 3. Cribl Integration

### Detection

```js
const criblActive = connectors.some(c =>
    CRIBL_CONNECTOR_IDS.has(String(c?.id || '').toLowerCase())
);
// CRIBL_CONNECTOR_IDS = new Set(['cribl-stream'])
```

`criblActive` is `true` when `cribl-stream` is present in the selected solutions list. Cribl Stream is typically auto-added to the selection when the user enables **Cribl** in the Environment step.

### Effect on infrastructure

When `criblActive`:

- The `SYSLOG_CEF` infra block (`CEF-INFRA-01` through `CEF-INFRA-05`) is **suppressed entirely** — the Linux forwarder and rsyslog/syslog-ng setup are not needed.
- The `CRIBL` infra block (`CRIBL-INFRA-01`, `CRIBL-INFRA-02`) is emitted **instead** — covering DCE/DCR output configuration and end-to-end data flow validation.
- For the `PACK_JOIN_TASK` map, syslog-cef connectors depend on `CRIBL-INFRA-02` (join node) rather than `CEF-INFRA-05`.

```js
const PACK_JOIN_TASK = {
    [FIELD_PACK.SYSLOG_CEF]:    'CEF-INFRA-05',
    [FIELD_PACK.WINDOWS_AMA]:   'WIN-INFRA-04',
    [FIELD_PACK.WEC_WEF]:       'WEC-INFRA-05',
    [FIELD_PACK.AMA_CUSTOM_LOGS]: 'CL-INFRA-03',
    [FIELD_PACK.CRIBL]:         'CRIBL-INFRA-02'
};
```

### Effect on per-connector tasks

When `criblRouted = true` (connector is syslog-cef AND Cribl is active), `buildPerConnectorTasks()` emits a **Cribl-specific 3-task chain** instead of the standard 4-task chain:

| Standard (non-Cribl) | Cribl-routed |
|---|---|
| Enable connector in Sentinel | Enable connector in Sentinel |
| Configure source device/service → **forwarder** | Configure source to send to **Cribl** |
| Validate data ingestion | Validate ingestion **via Cribl** |
| Tune collection (DCR filters) | Tune **Cribl pipeline** |

### Hybrid grouping model

This project chose a **hybrid** dependency model for Cribl (see §13):

- A dedicated **Cribl group** is emitted for the Cribl infra tasks (CRIBL-INFRA-01/02).
- Only connectors physically routed through Cribl (`criblRouted = true`) carry a dependency on the Cribl join row.
- Non-Cribl connectors (e.g. Windows AMA) are **fully independent** — no Cribl dependency is injected.
- If Cribl is selected in the environment but **no connectors are routed through it**, the Cribl group still appears with its infra tasks, acting as a stand-alone infrastructure block.

### Cribl eligibility

Solutions can opt in to Cribl routing by setting `cribl_eligible: true` in solutions.json. This field controls:

1. Whether the **sizing drawer** shows the Cribl toggle for that connector.
2. Whether `isCriblEligibleForSolution()` in `capacity.js` returns `true`.
3. Whether the capacity system stores `criblIngestion: true` in connector sizing state.

The eligibility check combines three conditions:

```js
function isCriblEligibleForSolution(solution, capacitySnapshot) {
    return isCriblEnvironmentSelected()
        && solution.cribl_eligible === true
        && CRIBL_ELIGIBLE_PROFILE_TYPES.has(profile.type);
}
```

---

## 4. Task Generation Engine (`gantt-tasks.js`)

### Main entry point

```js
export function buildGanttPlan(selectedConnectors) → {
    tasks: Task[],
    phases: Phase[],
    criticalPath: string[],
    summary: {
        totalConnectors, fieldPacks, criblActive,
        totalTaskCount, sharedTaskCount, perConnectorTaskCount
    }
}
```

Only called for solutions with an explicit `fieldPack` field.

### Build sequence

```
Phase 0 — Project Setup
  SETUP-01: Validate workspace & permissions
  SETUP-02: Validate network connectivity

Universal permission tasks (per connector, before infra)
  {ABBREV}-PERM-01: Verify Permissions   ← depends on SETUP-01
  {ABBREV}-PERM-02: Assign Permissions   ← depends on PERM-01

Phase 1 — Shared Infrastructure (one block per required field pack)
  Pack order: WINDOWS_AMA → WEC_WEF → SYSLOG_CEF → AMA_CUSTOM_LOGS → CRIBL
  Each pack emits its tasks in task-catalog ID order.
  CEF infra is skipped when Cribl is active.
  First infra task in each pack also depends on that pack's permission gate tasks.

Phase 2 — Per-connector tasks (in connector selection order)
  Each connector emits 1–4 tasks based on its field pack and Cribl routing state.

Phase 3 — Content Deployment (shared, generated once)
  CONTENT-01 → CONTENT-ANALYTICS-01/02, CONTENT-WORKBOOKS-01/02, CONTENT-PLAYBOOKS-01/02 → CONTENT-03

Phase 4 — Operationalize (shared, generated once)
  OPS-01 → OPS-02, OPS-03
```

### TASK_CATALOG

The catalog is a static object in `gantt-tasks.js` keyed by task ID. Each entry has:

```js
{
    id, name, description,
    phase,          // 0–4
    category,       // 'SETUP' | 'INFRA' | 'CONTENT' | 'OPS' | 'PERM' | 'SENT-CFG' | 'SRC-CFG' | 'VALID'
    fieldPack,      // null = universal; string = pack-specific
    shared,         // true = one copy for all connectors; false = per-connector
    duration,       // human-readable string ('1d', '2h', '30m')
    durationHours,  // canonical numeric value in business hours
    ownerRole,      // default owner
    dependsOn,      // string[] of task IDs
    subtasks,       // string[] of checklist items
    configurable,   // whether the user should adjust duration
    configurableNote,
    autoComplete,   // mark done automatically when conditions met
    conditional,    // only applies in certain scenarios
    conditionNote,
    ongoing,        // e.g. CONTENT-03 Initial Tuning
    style           // visual hint ('ongoing')
}
```

Per-connector tasks are generated dynamically by `buildPerConnectorTasks()` and are **not** in the static catalog. They follow the `{ABBREV}-01` through `{ABBREV}-04` naming convention.

### Per-connector task builder

```js
function buildPerConnectorTasks(
    connector, abbrev, dependencyTaskId, permissionTaskId,
    { criblRouted = false } = {}
) → Task[]
```

Behaviour:
- `NATIVE_DIRECT` → 2-task chain (Enable + Validate).
- Minimal packs (DIAGNOSTIC_SETTINGS, API_CCP, AZURE_FUNCTION) → 1-task chain (Enable only).
- Cribl-routed → 3-task chain (Configure to Cribl, Validate via Cribl, Tune Cribl pipeline).
- Full packs (non-Cribl) → 4-task chain (Enable, Configure source, Validate, Tune DCR).

`PER_CONNECTOR_OVERRIDES` provides connector-specific task names and subtasks for well-known connectors (e.g. Cisco ASA, PAN-OS, Windows Security Events).

### Connector abbreviations

`makeConnectorAbbrev(connectorId, connectorName)` produces short uppercase task-ID prefixes (e.g. `ASA`, `PAN`, `WSE`). It uses a curated `KNOWN_ABBREVS` map first, then falls back to algorithmic generation. A module-level `_abbrevRegistry` Map guarantees uniqueness — on collision it appends a counter suffix (`PAN-2`). The registry is reset (`resetAbbrevRegistry()`) at the start of each `buildGanttPlan()` call.

---

## 5. Planner Data Model (`buildGanttPlanData`)

`buildGanttPlanData(selectedSolutions, options?)` is the primary data builder in `gantt-planner.js`. It returns a large object consumed directly by the rendering layer.

### Assembly order

```
1. addStandardTasks()
   → emits Phase 0 (kickoff / workspace setup) rows
   → returns { endWeek, terminalRowIds[] }

2. addGeneratedInfrastructureRows()
   → emits shared Phase 1 infra rows for field-pack solutions
   → groups by field pack (one solution-group row per pack)
   → returns { endWeek, terminalRowIds[], taskRowIdMap, syntheticSolutions[] }

3. Phase bucket loop [1, 2, 3]
   → per bucket: sort solutions by priority score, then name
   → per solution: createSolutionPlanRows() → solution group row + child task rows
   → solutions with explicit fieldPack get generatedd connector tasks injected
   → apply start-week shifts (custom overrides or group shift)

4. Closeout rows
   → task-training-handover  (depends on all solution terminal IDs)
   → task-go-live-monitoring (depends on training)

5. Post-processing
   → enrichRowsForDisplay() — adds calendar dates, display labels
   → applyRowDisplayOverrides() — applies localStorage duration overrides
   → applyTaskOrdersToRows() — honours user drag-reorder
   → renumberOrderedRows() — assigns final sequential numbers
   → buildSolutionPresentationMap() — assigns connector colours
   → buildPlanMilestones() — picks milestone anchor rows
   → createGanttTask() — maps rows to Frappe Gantt task shape
```

### Row shape (key fields)

```js
{
    id,               // stable string ID
    phaseKey,         // 'setup' | 'phase1' | 'phase2' | 'phase3' | 'closeout'
    number,           // display number (e.g. '3' or '3A')
    isSolutionGroup,  // true → this row is the collapsible group header
    solutionGroupId,  // ID of the parent solution group row (for child rows)
    solutionId,       // solutions.json connector ID
    parentId,         // ID of the parent summary row (for subtasks)
    startWeek,        // effective start (1-based week offset)
    defaultStartWeek, // computed default before overrides
    endWeek,          // startWeek + durationWeeks
    durationWeeks,    // effective duration
    dependencies,     // string[] of sibling row IDs
    status,           // 'Not Started' | 'In Progress' | 'Complete' | 'Blocked' | 'Skipped'
    connectorColor,   // hex string from CONNECTOR_COLOR_PALETTE
    capacityProfile,  // from getSolutionCapacityProfile()
    isCustomSchedule, // true when start or duration is overridden
}
```

### `generatedFieldPackSolutions` vs `generatedInfraOnlySolutions`

- **`generatedFieldPackSolutions`** — solutions where `hasGeneratedFieldPack(solution) === true`. They use the task engine.
- **`generatedInfraOnlySolutionIds`** — subset of the above where `generatedConnectorTasksBySolutionId.get(solution.id)` is empty. These get an infra-only solution group (no per-connector task rows beyond the shared infra block).

---

## 6. Dependency System

### Row-level dependencies

Every row carries a `dependencies: string[]` array of sibling row IDs. Dependencies span across phases and solution groups. Frappe Gantt receives these IDs in the `task.dependencies` field, and the overlay layer renders the arrows.

### `getDependencyEndWeek()`

```js
function getDependencyEndWeek(dependencyIds, rowById, fallbackWeek) {
    return dependencyIds.reduce((maxEnd, id) =>
        Math.max(maxEnd, rowById.get(id)?.endWeek ?? fallbackWeek),
    fallbackWeek);
}
```

The start week of a row is:

```
startWeek = max(getDependencyEndWeek(dependencies, ...), phaseBaselineStartWeek)
```

### Phase sequencing

Phase buckets sequence through `previousPhaseTerminalIds`:

```js
// Critical: starts from standardPlan.terminalRowIds (NOT infra terminals)
let previousPhaseTerminalIds = [...standardPlan.terminalRowIds];

[1, 2, 3].forEach(bucket => {
    // Per solution in this bucket:
    //   If solution has a generated field pack → also depend on the infra join row
    const defaultDependencies = usesGeneratedTasks && joinRowId
        ? [...new Set([...previousPhaseTerminalIds, joinRowId])]
        : [...previousPhaseTerminalIds];

    // After processing all solutions in the bucket:
    previousPhaseTerminalIds = phaseTerminalIds.length > 0
        ? [...phaseTerminalIds]
        : previousPhaseTerminalIds;
});
```

**Why `standardPlan.terminalRowIds` and not infra terminals?** Not every connector has infra prerequisites. Using `standardPlan` (Phase 0 terminal) as the universal baseline means connectors that only need minimal setup still get a coherent start point. Connectors that do have infra prerequisites additionally depend on their infra join row via `joinRowId` — this is additive, not a replacement.

### Dependency arrows (SVG)

`syncGanttDependencyArrows(svg, taskById)` draws elbow-style Finish-to-Start arrows:

```
predecessor bar end  →  elbow right (8 px)
                     ↓  vertical to successor row
                     →  left to successor bar start  ▶
```

- Arrows are rendered into a dedicated `<g class="gantt-dependency-layer">` inserted before bar wrappers.
- A single reusable arrowhead `<marker id="gantt-dep-arrowhead">` is injected into `<defs>`.
- Hover on any bar highlights its predecessor and successor arrows via `gantt-dep-arrow--highlighted`.

---

## 7. Capacity & Sizing System (`capacity.js`)

### `getConnectorCapacityMetadata(solution)`

Returns `{ type, populationKind, sharedPopulationGroup, serverCountLabel }`.

Sizing `type` values:

| Value | Meaning |
|---|---|
| `'none'` | No sizing required |
| `'firewall'` | EPS-based (syslog/CEF firewalls) |
| `'windows'` | Server count (Windows AMA or WEC) |
| `'linux'` | Server count (Linux syslog) |

**Guard logic:** `connectors <= 0` returns `'none'` only if the solution has no other sizing signals (`fieldPack`, `capacity_type`, `cribl_eligible`). This prevents content-only packages from requiring sizing, while still allowing solutions like Cribl Stream (no connectors field but `cribl_eligible: true`) to be sized.

### `getSolutionCapacityProfile(solution, capacitySnapshot)`

Returns a comprehensive sizing profile including:

- `requiresSizing` — whether the user needs to fill in sizing data
- `hasSavedSizing` — whether the user has already submitted sizing
- `result` — computed sizing output (VM count, server count, etc.)
- `badge` — human-readable size summary for the detail panel

### Server pool model

The capacity system models Windows deployments through **server pools** (multiple connectors can share a pool):

```js
{
    serverPools: {
        'pool-windows-ama-1': {
            kind: 'windows_ama', serverCount: 200, onPremPercent: 40,
            connectorIds: ['windows-security-events', 'sysmon-via-ama']
        }
    },
    connectorSizing: {
        'windows-security-events': { poolId: 'pool-windows-ama-1', relation: 'standalone', ... },
        'sysmon-via-ama':           { poolId: 'pool-windows-ama-1', relation: 'same', ... }
    }
}
```

Pool state is persisted under the `WINDOWS_SHARED_CAPACITY_KEY` (`'__shared-windows-sizing__'`) entry in the solutions sizing state.

### Cribl toggle in sizing

When the sizing drawer is open for a connector, an optional Cribl toggle appears when `isCriblEligibleForSolution()` returns `true`. Toggling it sets `criblIngestion: true` in the connector's sizing assignment. `buildGanttPlan()` checks `criblIngestion` when deciding whether to route that connector through Cribl.

### `scaleGeneratedInfraDurationHours(task, capacityProfile)`

Adjusts the default infra task durations based on saved sizing:

| Task | Scaling trigger | Adjustment |
|---|---|---|
| WEC-INFRA-01 | WEC server count | +4 h per 10 extra servers |
| WEC-INFRA-02 | WEC server count | +8 h per 10 extra servers |
| WEC-INFRA-03 | WEC server count | +8 h per 10 extra servers |
| CEF-INFRA-01 | Firewall VM count | +4 h per 2 extra VMs |
| CEF-INFRA-04 | Firewall VM count | +1 h per 2 extra VMs |

---

## 8. Solution Group Collapse / Expand

### State tracking

```js
// Module-level Set (in gantt-planner.js)
const collapsedSolutionGroupIds = new Set();
```

When a solution group row header is clicked, the group ID is toggled in/out of this set and the Gantt is re-rendered via `createVisiblePlanData()`.

### Persistence

```js
function saveSolutionGroupState(solutionId, { collapsed, startWeek, ... }) {
    // persists to sessionStorage under sentinelPlanner.solutionGroupState.v1
}

function readSolutionGroupState(solutionId, defaultStartWeek, solutionName, defaultCollapsed) {
    // reads from sessionStorage; returns { collapsed, effectiveStartWeek, ... }
}
```

### Default collapse

When more than two solutions are selected, `defaultSolutionGroupCollapsed = true` is passed through to `readSolutionGroupState`, so all groups start collapsed until the user opens them.

### `createVisiblePlanData()` filter

```js
const visibleRows = planData.rows.filter(row => {
    if (row.parentId && collapsedSummaryIds.has(row.parentId)) return false;
    if (!row.isSolutionGroup && row.solutionGroupId
        && collapsedSolutionGroupIds.has(row.solutionGroupId)) return false;
    return true;
});
```

Key rules:
- **Solution group rows themselves are never filtered out** (the `!row.isSolutionGroup` guard).
- When a dependency points to a hidden row, it is remapped to the nearest visible ancestor (the collapsed group header).

---

## 9. Gantt Rendering

### Frappe Gantt library

The planner uses `window.Gantt` (Frappe Gantt) for the SVG timeline. Tasks are passed in Frappe's shape:

```js
{
    id, name, start, end,   // ISO date strings
    progress,
    dependencies,           // comma-separated task IDs
    color,                  // direct bar fill
    custom_class            // for CSS targeting
}
```

### View modes

Three view modes are available (Weeks / Months / Quarters), each defining `padding`, `step`, `column_width`, `lower_text`, `upper_text`, and `snap_at`.

### `stabilizeGanttRender()`

Called after Frappe renders to post-process the SVG:

1. **Bar colours** — applies `PHASE_BAR_COLOR` (slate palette) for `Not Started` tasks; `STATUS_BAR_COLOR` (teal/green/amber) for active/complete/review tasks.
2. **Subtask visuals** — lighter fill opacity for child rows; dashed stroke for conditional tasks.
3. **Phase group lines** — thick horizontal separators at phase transitions.
4. **Bar labels** — external label elements for bars too narrow to hold the task name internally (`GANTT_BAR_LABEL_MIN_PRIMARY_CHARS` threshold).
5. **Two-tier header** — month/year and day-number rows are rebuilt from the Frappe header.
6. **Milestone markers** — calls `syncGanttMilestoneMarkers()`.
7. **Dependency arrows** — calls `syncGanttDependencyArrows()`.

### Three presentation surfaces

| Surface | Technology | Notes |
|---|---|---|
| Gantt timeline | Frappe Gantt (SVG) | Primary timeline view |
| Task table | DOM (div grid) | Editable left panel; resizable columns |
| Mobile list | DOM | Simplified card list below `~768 px` |

### Bar colour logic

```
if task.status !== 'Not Started':
    use STATUS_BAR_COLOR[status]   // teal, green, amber, red, slate
else:
    use PHASE_BAR_COLOR[phaseKey]  // muted slate gradient by phase
```

Subtask bars receive a lightened variant of the parent row's colour.

### `syncGanttMilestoneMarkers()`

Adds diamond SVG shapes at the timeline positions of five project milestones:

- Workspace Connected  
- First Data Ingested  
- Core Coverage Achieved  
- Analytics Rules Enabled  
- Handoff to SOC  

Milestone anchors are computed by `buildPlanMilestones()` using pattern-matching against row labels.

---

## 10. Detail Panel

`renderDetailPanel(target, row, { ... callbacks ... })` builds a slide-over aside panel when the user clicks a task row (name/number cell).

### Panel structure

```
┌──────────────────────────────────┐
│ [Phase pill] [Status pill] [Size]│
│ Task name (h3)                   │
│ Goal — description (p)           │
├──────────────────────────────────┤
│ Field grid (2-column)            │
│   Solution | Task type           │
│   Owner    | Status              │
│   Phase    | Impact              │
│   Start week | Start date        │
│   Due date   | Duration          │
│   Milestone (wide)               │
│   Required permissions (wide)    │
│   Dependencies (wide)            │
├──────────────────────────────────┤
│ [Setup instructions]             │  ← from task.subtasks[]
├──────────────────────────────────┤
│ [+ Add task] [Skip] [Delete]     │
├──────────────────────────────────┤
│ Subtask list (if isSummary)      │
└──────────────────────────────────┘
```

### Inline editing

From the detail panel, users can:
- Edit **duration** (Monday.com-style picker with quick-pick chips)
- Edit **start week** (numeric input)
- Edit **owner** (dropdown popup)
- Edit **task name** (text input)
- Edit **status** (dropdown)
- Edit **impact** (dropdown)

Changes are saved through `onSaveDuration`, `onSaveField` callbacks, then persisted to localStorage/sessionStorage and the plan re-renders.

### Setup instructions placement

Setup instructions (`subtasks[]`) are shown **before** the action bar in the panel, to ensure critical how-to content is visible without requiring the user to scroll past action buttons.

---

## 11. Duration & Scheduling

### Units

Duration is stored internally in **business hours** (1 day = 8 h, 1 week = 40 h). The UI displays human-readable labels (`1d`, `2w`, `4h`).

```js
const HOURS_PER_DAY = 8;
const DAYS_PER_WEEK = 5;
const HOURS_PER_WEEK = 40;
```

### `businessHoursToWeeks(hours)`

```js
function businessHoursToWeeks(hours) {
    return roundWeekPrecision(
        Math.max(hours, MIN_TASK_DURATION_WEEKS * HOURS_PER_WEEK) / HOURS_PER_WEEK
    );
}
```

`MIN_TASK_DURATION_WEEKS = 0.0125` (approximately 30 minutes) prevents zero-duration rows that would break the Gantt timeline.

### Business-day scheduling

Calendar dates are computed from `getProjectStartDate()` (most recent Monday) plus week offsets. Task timing maps to **business days** — the dependency chain advances to the next working day, eliminating weekend gaps between dependent tasks.

### Duration overrides

Stored in localStorage under `sentinelPlanner.taskDurationOverrides.v1`:

```json
{
  "version": 7,
  "ganttTaskOverrides": {
    "task-shared-cef-infra-01": { "durationHours": 16 }
  },
  "startWeekOverrides": {
    "solution-group-palo-alto-networks": { "startWeek": 3 }
  }
}
```

Overrides are read by both the task engine (`gantt-tasks.js` calls `loadDurationOverrides()`) and by `buildGanttPlanData()`. The two layers apply overrides at their respective levels; `gantt-planner.js` overrides take precedence for planner rows.

### Inline editor flicker protection

`stabilizeGanttRender()` can trigger an `onLayoutChange` callback even when no data changed. This was causing editors to close. The fix: `updateLayout()` defers rebuilds while an inline editor is active; `closeInlineEditor()` replays the deferred update after editing ends.

---

## 12. Export & Persistence

### Storage map

| Data | Storage type | Key |
|---|---|---|
| Duration overrides | `localStorage` | `sentinelPlanner.taskDurationOverrides.v1` |
| Start week overrides | `localStorage` (nested under above) | `startWeekOverrides` |
| Date format preference | `localStorage` | `sentinelPlanner.dateFormat.v1` |
| Solution group collapse state | `sessionStorage` | `sentinelPlanner.solutionGroupState.v1` |
| Active planner tab | `sessionStorage` | `sentinelPlanner.plannerActiveTab.session.v1` |
| Table column widths | `sessionStorage` | `sentinelPlanner.ganttTableColumnWidths.session.v1` |
| Task ordering | `sessionStorage` | (custom task order entries) |
| Capacity / sizing state | `sessionStorage` | `sentinelPlanner.capacity.*` (managed by capacity.js) |

`localStorage` items survive browser sessions; `sessionStorage` items are reset per browser tab.

### Plan reset

Resetting the planner must clear **all** `sentinelPlanner.*` localStorage and sessionStorage keys together. Partial resets leave the plan in an inconsistent state (saved wizard context out of sync with selected solutions).

### Export rows

`buildGanttPlanData()` generates an `exportRows` array with these columns: `#`, `Phase`, `Status`, `Step`, `Milestone`, `Goal`, `Owner`, `Resource Type`, `Impact`, `Task`, `Start week`, `Default start week`, `Start date`, `Due date`, `Duration`, `Default duration`, `Custom schedule`. This array is used by `export.js` (SheetJS) to generate the Excel output.

---

## 13. Key Design Decisions

### Decision 1 — Hybrid Cribl grouping model

**What:** Cribl infra tasks get their own solution group. Only connectors explicitly routed through Cribl (`criblRouted = true`) depend on the Cribl join row. Non-Cribl connectors have no Cribl dependency at all.

**Why:** An alternative ("all-or-nothing") model would put CEF and Cribl tasks in the same group and force every CEF connector to depend on Cribl. This was rejected because it creates false sequencing for customers who are phasing Cribl adoption — they may want some sources going direct while others go through Cribl.

**Trade-off:** The hybrid model requires careful null-checks in `buildGanttPlanData()` to avoid injecting Cribl join dependencies into unrelated connectors.

---

### Decision 2 — `previousPhaseTerminalIds` starts from `standardPlan`, not infra terminals

**What:** Phase 2/3 bucket dependencies are initialized from `standardPlan.terminalRowIds` (Phase 0 completion), not from the generated infra terminal rows.

**Why:** Minimal-pack connectors (NATIVE_DIRECT, DIAGNOSTIC_SETTINGS, etc.) do not have any shared infra, so using the infra terminal as the universal baseline would create an artificial delay for them. Instead, connectors that do need infra receive their infra join row as an **additional** dependency via `joinRowId` — making the dependency additive only for connectors that actually need it.

**Effect:** A solution like Microsoft Entra ID (NATIVE_DIRECT) can start after Phase 0 regardless of whether a Syslog/CEF infra block is in progress.

---

### Decision 3 — Solutions.json `fieldPack` field drives task engine routing

**What:** Solutions with an explicit `fieldPack` property in solutions.json go through `buildGeneratedGanttPlan()` (the full task engine). Solutions without it fall back to their `planner.setup_tasks` array.

**Why:** The task engine generates deterministic, dependency-aware, capacity-scaled tasks that are richer than hand-authored `setup_tasks`. The `fieldPack` field acts as an opt-in gate so the catalog can be migrated incrementally. Both paths produce rows that the planner assembles in the same phase structure.

---

### Decision 4 — Inline table as primary edit surface

**What:** The task table (left panel) is the primary surface for editing duration, status, owner, and start date. The detail panel is the secondary surface for deeper review and subtask inspection.

**Why:** The detail-panel flow is too slow for repeated adjustments during plan review. Inline table editing behaves like a spreadsheet and covers the 80% case. The detail panel remains available for context-heavy decisions.

---

### Decision 5 — Business-day scheduling, not calendar-week scheduling

**What:** Task dependencies advance to the next **business day**, eliminating weekend dead space in dependency chains.

**Why:** An early version used whole-week rounding, which made short tasks (4 h) appear artificially separated by a full week when they were only one day apart. Business-day scheduling produces a more realistic and readable Gantt for short-duration engineering work.

---

### Decision 6 — Frappe Gantt + custom post-processing layer

**What:** The Frappe Gantt open-source library renders the SVG timeline. All styling, milestone markers, and dependency arrows are added in a post-render `stabilizeGanttRender()` pass.

**Why:** Frappe Gantt provides the heavy SVG layout engine and interaction model (scrolling, zoom). Post-processing lets the planner add features without forking the library — phase colours, elbow arrows, two-tier headers, and dynamic bar labels are all custom overlays on top of Frappe's output.

**Trade-off:** Post-processing is fragile to Frappe DOM changes. The `stabilizeGanttRender()` pass must be idempotent and run after each render cycle.

---

### Decision 7 — `collapsedSolutionGroupIds` as a Set, collapse state in sessionStorage

**What:** Collapse state is tracked in a module-level Set and saved to sessionStorage, not localStorage.

**Why:** Collapse state is navigational — it is appropriate to reset it per session. Persisting it in localStorage across sessions would cause stale expand/collapse states after a plan change.

---

*End of specification.*
