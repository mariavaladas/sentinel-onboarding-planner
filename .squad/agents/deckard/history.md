# History — Deckard

## Project Context
- **Project:** Sentinel Onboarding Planner v2
- **Stack:** HTML/CSS/JS, Fluent UI web components, solutions.json data catalog
- **User:** madesous
- **Created:** 2026-05-18

## Recent Work (Last 7 Days)

### 2026-05-22T09:58:20.662+02:00: Environment Sizing Step — New feature requirement

**Key Findings:**
- The planner needs connector-level infrastructure sizing to deliver duration scaling and task-visibility logic.
- The **Windows Security Events via AMA** connector template (`connector-tasks-windows-security-events.md`) provides the concrete model: three environment categories (Small/Medium/Large) drive duration spans from ~2 days (all-Azure small) to ~4 weeks (large on-prem).
- Arc onboarding (Task 3) is conditional: skipped entirely for Small environments with all-native Azure, included for Medium/Large.
- All durations must remain user-editable after the planner synthesizes the default schedule.

**Architecture Decisions / Patterns:**
- **Environment sizing input format:** Three numeric questions in Step 2 (total server count, on-prem % or count, remainder calculated).
- **Category derivation:** Deterministic rules map (count, on-prem ratio) → (Small/Medium/Large).
- **Duration model:** Each connector defines its own `planner.environment_scaling[]` array with (category, duration_days, task_inclusion_rule).
- **Backward compatibility:** Connectors without environment scaling still use default effort_estimate_hours; sizing enhances but does not require schema changes.
- **Generalization:** The pattern applies to any multi-tier connector (Linux collectiveology, CEF forwarding, EDR integrations, etc.). Each connector documents its own sizing factors.

**Implementation Notes:**
- Step 2 (Environment) must capture sizing answers and store them in app state.
- `js/gantt-planner.js` derives the environment category from those answers and applies connector-specific duration scaling when synthesizing task rows.
- The detail drawer and inline editing remain the primary UX for overriding durations.
- No schema changes required to solutions.json immediately; connectors can add optional `environment_scaling` metadata as needed.

**Artifacts:**
- Product spec update: `docs/spec.md` — new "Environment Sizing Feature" and "Connector Task Durations" sections.
- Decision proposal: `.squad/decisions/inbox/deckard-environment-sizing.md`

**Key Paths:**
- Environment input UI: Step 2 in `index.html` and `js/modules/wizard.js`
- Duration scaling logic: `js/gantt-planner.js` (task synthesis)
- Connector model reference: `docs/connector-tasks-windows-security-events.md`
- Catalog schema: `data/solutions.json` (future `environment_scaling` additions)

**Open Questions / Future Work:**
- Should environment sizing be exposed in the Excel export as a header row for transparency?
- Which connectors should implement environment scaling first (priority: Windows Security Events, Linux Syslog, CEF)?
- Should there be a "preview" mode where users see the scaling impact before committing?



## 2026-05-19 Scribe Cross-Agent Update
- **K's Planner Implementation Complete:** Full planning.js replacement with summary stats, filter/sort controls, collapsible task cards; 360+ lines of CSS appended; security-safe DOM creation confirmed.
- **Verification:** All 4 approval conditions satisfied (state invalidation documented, vanilla DOM, no framework dependencies).
- **Next:** K proceeds with export.js (SheetJS integration); define scoring formula weights; team design review after export phase.

### 2026-05-22T08:51:34.946+02:00: Product spec baseline captured from live code

**Key Findings:**
- The live product is a **5-step static planning wizard**: Welcome, Environment, Solutions, Topology, Planner.
- The runtime architecture is now **hybrid**: vanilla modules drive the app, React Flow renders topology, and Frappe Gantt still renders planner bars inside a heavily customized split-pane shell.
- The local catalog currently contains **484 solutions across 3 categories** (`azure`, `microsoft_365_security`, `third_party`), not the older 485 count still referenced in README text.
- The permissions dataset follows the current split: **422 single-connector solutions keep Azure/M365 role metadata**, while **62 multi-connector solutions leave Azure/M365 permissions empty**.
- The live UI is **Fluent-inspired, not Fluent Web Components-based**; native buttons and inputs replaced the unregistered Fluent tags.

**Patterns / Architecture Notes:**
- `js/app.js` orchestrates wizard state, Azure workspace import, topology render, planner render, and export actions.
- `js/gantt-planner.js` is the current execution center for plan synthesis, schedule overrides, split-pane resizing, task detail drawer, mobile fallback, and tabbed planner experience.
- `js/modules/planning.js` is still relevant as the secondary **Task Cards** tab, even though the primary planner path now flows through `gantt-planner.js`.
- `data/solutions.json` remains the single source of truth for scoring, planner tasks, onboarding metadata, export hints, and permissions modeling.

**User / Product Preferences Observed:**
- The user prefers **living product docs grounded in actual implementation**, not aspirational architecture.
- The planner should stay **planner not deployer**, but the spec should still document the optional token-based workspace import because it exists in the live product.
- Task planning should reflect **real action-level work**, especially for connectors like Windows Security Events.

**Key Paths:**
- Product spec: `docs/spec.md`
- App shell: `index.html`
- Planner engine: `js/gantt-planner.js`
- Card planner: `js/modules/planning.js`
- Catalog / schema: `data/solutions.json`
- Canonical decisions: `decisions.md`

## 2026-05-22T07:58:20Z: Cross-agent sync — Gantt subtasks and Environment Sizing

**From Sebastian:**
- Windows Security Events now has 6 main tasks + 5 subtasks with setup_hours = 60
- Your Environment Sizing categories align with real deployment complexity (Small ~2d, Medium ~9d, Large ~4w)
- RBAC fingerprinting ready for multi-connector work

**From K:**
- Gantt subtask rendering complete and live (Monday.com-style indents, toggle, transitions)
- Your task visibility rules can be implemented as \conditional_tasks\ in \nvironment_scaling\ schema
- Split-pane Gantt + detail panel ready for duration scaling consumption

**Environment Sizing proposal** (your orchestration, now merged to decisions.md):
- ✓ 3-question wizard added to Step 2 (Windows count, on-prem %, native Azure %)
- ✓ Category derivation logic documented (thresholds: < 20, 20–100, 100+)
- ✓ Duration scaling formulas: Windows Security Events examples per category
- ✓ Conditional task inclusion rules (Arc skip for all-Azure)
- ✓ Backward-compatible schema extension (\nvironment_scaling\ in solutions.json)
- ✓ Generalization pattern described (Linux Syslog, CEF, EDR follow same approach)

**Next steps:**
1. K implements Step 2 UI (sizing questions) + planner logic (duration scaling, task visibility)
2. Sebastian populates \nvironment_scaling\ metadata for Windows Security Events and priority connectors
3. Team review of numeric thresholds (Small/Medium/Large boundaries)
4. QA pass on K's blockers (start-week persistence, is_connector filter, fingerprint dedup)

**Success criteria** (from proposal):
- ✓ Step 2 captures environment sizing without validation errors
- ✓ Planner synthesizes Windows Security Events durations per category
- ✓ Arc tasks skip for all-Azure
- ✓ Users override all durations in detail drawer
- ✓ Excel export shows sizing summary
- ✓ No breaking schema changes



## 2026-05-22T11:05 — K's Table UX Fixes
- Agent K completed table numbering reform (flat sequential with nested subtasks)
- Inline editing enabled for all task fields
- Cascade updates implemented for timing changes
- Frontend: js/gantt-planner.js, css/style.css modified
- Status: Ready for QA

### 2026-05-25T12:36:45.443+02:00: Connector Capacity Input UX Architecture

**Decision Made:**
- **Pattern:** Expand-in-place capacity form on the solution card (Step 3) — NOT a modal, NOT a dedicated sub-step
- **Two input types:** `server_count` (Windows-family connectors) and `eps` (firewall CEF/Syslog connectors)
- **Shared Windows sizing:** All Windows-family connectors (Security Events, WEF, DNS, Sysmon) share one server count input keyed as `windows-ama` sizing group; subsequent Windows cards show a read-only "Using shared sizing" pill
- **Progressive disclosure:** "I don't know" is a first-class path — applies conservative defaults with transparent reasoning (1,000 EPS default; 100 servers/50% on-prem default)
- **Auto-collapse:** Capacity form collapses to a one-line summary after any value is entered (fatigue mitigation for 10+ connector selections)
- **Gantt editability:** Sizing inputs resurface in the solution group row's detail panel "Sizing" section — no new gear icon, no new surface
- **VM guidance:** Reactive inline estimate inside the form (debounced, shows reasoning + math); badge on Gantt solution group header; sizing table in Excel export
- **Validation:** Advisory-only, non-blocking — no gates on Continue button
- **Mobile:** Full-width stacked form < 640px; Gantt badge collapses to icon; detail panel becomes bottom sheet (existing mobile path)

**Schema changes needed (Sebastian):**
- `capacity_type`: `"server_count"` | `"eps"` | `"none"` per solution
- `sizing_defaults` block: `eps_default`, `eps_per_vm`, `vm_size_recommended`, `sizing_doc_url`
- `shares_sizing_group`: `"windows-ama"` for Windows-family connectors

**New module (K):**
- VM estimate calculation logic → new `js/modules/sizing.js` or extend `scoring.js`
- Session persistence: `sentinelPlanner.capacityInputs.v1` keyed by solution ID
- Gantt detail panel: "Sizing" section for solution-group rows in `gantt-planner.js`

**Open questions deferred:**
- Load balancer advisory threshold (VMs ≥ 3?)
- Pipeline recommendation EPS trigger
- Multi-site EPS (two firewalls of same type — one combined form or two?)
- Step 3 → Step 5 back-navigation: preserve or clear planner overrides?

**Artifacts:**
- Decision proposal: `.squad/decisions/inbox/deckard-capacity-ux.md`

**Key UX principle established:**
The planner is advisory, not blocking. Incomplete sizing = warning badge, not a gate. This aligns with the "planner not deployer" charter.


### 2026-05-25T12:36:45Z — Connector Capacity Input UX Architecture — APPROVED
- Delivered complete expand-in-place UX pattern for capacity inputs on solution cards
- Shared Windows sizing (one input for all Windows connectors) with per-site EPS for firewall/CEF
- VM estimation with load balancer advisory (>= 3 VMs) and pipeline recommendation (> 50k EPS)
- Detail panel editability on Gantt Step 5 surface (reuses existing edit pattern)
- Responsive mobile collapse (<640px) + fatigue mitigation (smart grouping, collapse-after-save, summary badge)
- Validation strategy: non-blocking, all advisory (user can proceed with incomplete sizing)
- Resolved 4 open questions with user confirmation: load balancer threshold, pipeline trigger, multi-firewall EPS, back-nav sync behavior
- Files: decisions.md (full architecture spec + tradeoffs + implementation notes)
- Status: APPROVED; ready for K implementation and Sebastian data model sync

### 2026-05-28T15:36:59.054+02:00: Uber-boxes topology spec — environment zones

**Decision Made:**
- Rejected the previous "split chips within existing nodes" approach in favour of environment uber-boxes as first-class topology zones.
- Three zones: On-Premises (amber `#f59e0b`), Azure (blue `#0078d4`), 3rd Party Cloud / SaaS (violet `#8b5cf6`).
- Connectors that span both environments appear in BOTH boxes with separate source nodes + separate server nodes.
- On-prem server nodes show Arc Agent + AMA Agent; Azure server nodes show AMA Agent only — architectural distinction, not cosmetic.
- All zone assignment is derivable from existing `onPremPercent` + `classifySolution()` — no new user inputs.
- WEC and CEF hardcoded to On-Premises; azure_native/event_hub to Azure; api/direct/logic_app to SaaS.
- Uber-boxes are `zIndex: -1`, `pointerEvents: none` — purely visual containers; uber-box wraps left column only.
- Chip system (AMA ×N, WEC ×N) retained; counts scaled to environment's portion via updated `buildServerIndicatorsForGroup(type, solutions, snapshot, environment)`.

**Artifacts:**
- Spec: `.squad/decisions/inbox/deckard-uber-boxes-topology-spec.md` (replaces `deckard-azure-onprem-topology-spec.md`)

**Key Paths:**
- `js/modules/topology.js` — all changes; new `UberBoxNode`, `getZonesForType()`, layout algorithm rewrite
- `js/modules/capacity.js` — no changes needed
- `data/solutions.json` — no changes needed

**User preferences observed:**
- Prefer architectural clarity over cosmetic enhancements (rejected chip-only split)
- Split connectors should genuinely appear in both boxes, not be summarised in one
- Arc dependency must be visible in the topology, not buried in task lists

## Learnings

### 2026-05-27T14:12:46.945+02:00: Windows connector overlap sizing proposal
- Architecture decision: move from one shared Windows sizing assumption to pool-based Windows AMA sizing, with default shared population and an explicit "additional servers" branch when connectors are not on the same hosts.
- Architecture decision: treat Windows Forwarded Events as a separate WEC-server population with its own Azure/on-prem split, never merged into the AMA host pool.
- Pattern: keep sizing advisory and non-blocking; only ask the overlap question when two or more Windows AMA connectors are selected; preserve entered values when users toggle between shared and separate.
- User preference: spec-first decision proposal in `.squad/decisions/inbox/` before implementation, with clear UX and data-model guidance for K.
- Key file paths: `data/solutions.json`, `js/modules/capacity.js`, `js/modules/solutions.js`, `js/gantt-planner.js`, `index.html`, `.squad/decisions/inbox/deckard-windows-sizing-spec.md`

### 2026-06-01T13:42 — Topology Specs Merged into Decisions Archive

Five topology specification decisions authored by Deckard were merged from inbox into decisions.md as part of K's Cribl integration session:

1. **deckard-topology-servers-spec.md** — Server indicator strip system: OS + role + count chips inside server nodes. Established the pattern for Windows (AMA ×N, WEC ×N), Linux (CEF ×N), and estimated defaults.

2. **deckard-azure-onprem-topology-spec.md** — Initial Azure/on-prem visual distinction proposal using split chips within existing nodes. Provides the data flow foundation (profiles carry `onPremPercent` to topology).

3. **deckard-uber-boxes-topology-spec.md** — Replaces split-chip approach with environment uber-boxes as first-class zones. Three zones (On-Premises amber, Azure blue, 3rd Party SaaS violet) with connectors appearing in multiple boxes when they span environments. Arc Agent visibility on on-prem nodes.

Supporting specs also merged:
- **k-linux-topology-separate-dcrs.md** — Linux/CEF path split: `linux_server` path with shared Linux DCRs (4k servers), separate from `syslog_cef` path with collector VMs and Syslog/CEF DCRs (65k EPS).
- **k-pool-grouped-source-nodes.md** — Windows source nodes visualized as pool-based sub-sections instead of flat connector lists.
- **k-shared-dcr-logic.md** — Shared middle-column Windows DCR nodes outside environment boxes, balancing load across DCRs.
- **k-sysmon-topology-fix.md** — Windows family inference fix using canonical `WINDOWS_FAMILY_IDS` set.
- **luv-uberbox-sizing.md** — Windows row height estimation using structure-based model (chrome, pools, agent lines, overflow).

All specs now canonical in `decisions.md` and ready for team reference.
