# History — K

## Project Context
- **Project:** Sentinel Onboarding Planner v2
- **Stack:** HTML/CSS/JS, Frappe Gantt, ExcelJS, Fluent UI web components, solutions.json data catalog
- **User:** madesous
- **Created:** 2026-05-18

## Active Development Summary (2026-05-25 through 2026-05-27)

K has implemented the complete Step 3 capacity and Step 5 planner UX stack:
- Connector sizing with shared Windows AMA pools and dedicated WEC pools
- Pool-based relation controls (`Same servers` / `Additional servers`) in both Step 3 (wizard) and Step 5 (planner)
- Sticky sizing drawer for non-destructive navigation during wizard steps
- Radio button layout for pool relation choices
- Gantt view tabs (Table + Gantt) with shared state, resizable columns, detail drawer
- Inline date/status/owner editing with immediate cross-tab refresh
- Solution-group collapse persistence and customizable task CRUD
- Business-day scheduling with dependency chain resolution
- Windows Security Events capacity scaling (Arc onboarding, AMA/DCR deployment, SecurityEvent validation)

### Key Architecture Decisions

**Sizing State Model**
- Stores connector sizing under the existing `sentinelPlanner.taskDurationOverrides.v1` planner override entry
- Pool-based structure: `serverPools[poolId] = { kind, serverCount, onPremPercent, connectorIds[] }`
- Windows AMA connectors can share or use separate pools; Windows Forwarded Events uses dedicated WEC pool
- Detachable AMA pool drafts preserved when rejoining shared pools (toggle-back restores prior values)

**Planner Rendering**
- Frappe Gantt bars rebuilt post-render with phase/status colors applied
- Inline duration/dates/status editable in grid; full task details in side panel
- Zoom control (Weeks/Months/Quarters); auto-fit button
- Timeline scroll stabilization: disabled `infinite_padding`, normalized pointer-captured resizers
- Cross-tab refresh: Table immediately updates; Gantt cache invalidated on next render

**Search & Filtering**
- Step 3 search now filters connector cards live; third-party connectors render as headed sections (not tabs)
- Search indexing restricted to identity fields only (name, tags, export group, category label)
- Defensive hiding of cards missing `__solutionData`; section headings track visible/total counts

### Recent Session Outcomes

**2026-05-27 Windows Sizing Completion**
- Pool-based sizing fully implemented with user approval
- Sticky panel feature added; radio button layouts refined
- WEC separation approved and deployed
- Pre-implementation spec clarity review assigned to Luv

**QA Status**
- Luv's k-20 verification found duplicate Windows Security Events task definitions (BUG-K20-001) — owner K to fix synchronization
- Previous QA findings (Luv May-26 Gantt/Table pass) show critical bugs in start-date inline edit rendering and frappe-gantt `null.classList` errors — K addressed with Gantt header node preservation and Gantt refresh hardening

### Files in Active Use
- `js/modules/capacity.js` — Sizing state engine and pool calculations
- `js/modules/solutions.js` — Step 3 connector cards, sizing drawer, search filtering
- `js/gantt-planner.js` — Step 5 planner controller, Gantt/Table tabs, inline editing, capacity scaling
- `css/style.css` — Dark theme, drawer panels, tab strips, resize handles, responsive layouts
- `data/solutions.json` — Solution metadata, planner durations, sizing capacity_type annotations

## Key Patterns (Active)

- **Persistence:** Override records in localStorage keep task changes, status, collapse state, column widths, sizing, and tab selection
- **Rendering:** Frappe Gantt bars rebuilt post-render with phase/status colors applied
- **Editing:** Inline duration/dates/status in grid; full details in side panel
- **Business days:** Task scheduling respects working days only
- **Numbering:** Hierarchical (solution groups consume global counter; setup tasks use dot notation)
- **Sizing:** Pool-based state stores shared AMA vs separate pools; WEC handled separately
- **Search:** Live card filtering + defensive `__solutionData` checks

## Next Priority

- Fix BUG-K20-001: Synchronize duplicate Windows Security Events task definitions in `data/solutions.json`
- Luv pre-implementation spec clarity review for Windows sizing
- Mobile planner fallback (compact list + PDF export)
- Keyboard shortcuts for navigation

## See Also

- **history-archive.md** — Earlier sessions and learnings (2026-05-18 through 2026-05-22)
- **decisions.md** — Team decisions including Windows sizing spec, capacity model, Step 3 search, Gantt hardening
