# Sentinel Onboarding Planner v2 — Product Spec

- **Status:** Draft living document
- **Last updated:** 2026-05-22T08:51:34.946+02:00
- **Product principle:** Planner, not deployer
- **Runtime model:** Static-first browser app with local catalog data and selective live fetches to Azure and GitHub

## 1. Product Overview

### What it is
Sentinel Onboarding Planner v2 is an interactive web wizard that helps teams plan Microsoft Sentinel onboarding before implementation starts. It combines solution discovery, topology visualization, MITRE ATT&CK coverage sampling, and a project-plan-style Gantt view into a single static web app.

### Who it is for
The product is aimed at Microsoft CxE teams, customer delivery teams, partners, SOC leaders, and security architects who need to decide **what to onboard, in what order, with what prerequisites, and with how much effort**.

### Core value proposition
- Reduce the time it takes to move from “we should onboard Sentinel” to a concrete delivery plan.
- Turn a large Sentinel solution catalog into a scoped shortlist based on environment signals.
- Expose architecture, permissions, sequencing, and effort before any production deployment work starts.
- Export a customer-editable Excel plan that can be used in real project delivery.

### In scope today
- Environment-driven solution recommendation
- Local solution catalog browsing and keyword search
- Topology visualization and MITRE ATT&CK coverage sampling
- Dense Gantt-style planning view with editable schedule defaults
- Excel export of the current plan

### Explicitly out of scope today
- Deploying Sentinel content or Azure resources
- Writing changes back to a tenant
- Multi-user collaboration or server-side persistence
- Real-time tenant inspection beyond the optional token-based connector import flow

## 2. User Personas

| Persona | Primary job to be done | What they care about | Most relevant product areas |
| --- | --- | --- | --- |
| **SOC Manager / Program Owner** | Build a realistic onboarding plan and communicate scope | Milestones, effort, ownership, sequencing, exportable artifacts | Planner, Excel export, phase breakdown |
| **Security Architect / Sentinel Architect** | Decide the right onboarding path and connector mix | Collection pattern, topology, dependencies, platform prerequisites | Environment step, topology, permissions, infrastructure metadata |
| **SOC Engineer / Sentinel Engineer** | Turn selected solutions into actionable setup work | Task granularity, validation steps, start dates, due dates, status | Gantt planner, task details, validation content |
| **Azure / Platform Admin** | Prepare workspace, RBAC, agents, DCRs, and platform prerequisites | Required roles, Azure dependencies, operational setup steps | Permissions model, onboarding metadata, setup tasks |
| **Partner / CxE Delivery Consultant** | Accelerate customer onboarding discovery and handoff | Fast scoping, customer-readable outputs, defensible prioritization | Wizard flow, recommendation logic, topology export, Excel export |

## 3. Current Feature Set

### End-to-end wizard flow

| Step | Current experience | Implementation notes |
| --- | --- | --- |
| **1. Welcome** | Introduces the planner and optionally lets the user connect an existing workspace | Optional Azure token paste flow in `js/app.js` loads subscriptions, resource groups, and workspaces |
| **2. Environment** | User selects vendor / platform signals (Azure, M365, Windows, Linux, AWS, CrowdStrike, etc.) AND describes infrastructure sizing (server count, on-prem vs Azure distribution) | Vendor signals drive recommended solution highlighting in Step 3; sizing determines task visibility and duration scaling in Step 5 planner |
| **3. Solutions** | User reviews the local solution catalog, keyword-searches additional solutions, and builds a shortlist | Cards show recommended state, connected state, difficulty, required roles, and live version badges |
| **4. Topology** | User sees ingestion topology and MITRE ATT&CK coverage for the current shortlist | Topology is rendered with React Flow; MITRE coverage is sampled live from Azure Sentinel GitHub analytic-rule YAML |
| **5. Planner** | User reviews the onboarding plan in a Gantt chart or task-card view and exports to Excel | Gantt is primary; task cards are a secondary tab lazily rendered via `planning.js`; task durations reflect environment sizing with user override capability |

### Recommendation and scoring behavior
- **Recommendation input:** Environment selections in Step 2 drive a heuristic “recommended” highlight in Step 3 using tag/name matching in `js/modules/solutions.js`.
- **Keyword search:** Step 3 uses substring matching across `name`, `description`, and `tags` in `js/modules/search.js`.
- **Priority scoring:** `js/modules/scoring.js` computes a 0-100 priority score using:
  - 40% business impact
  - 20% inverse complexity
  - 15% inverse setup time
  - 15% detection coverage
  - 10% maturity
- **Phase assignment:** `getPhase()` maps estimated setup hours to `Phase 1` (<=25h), `Phase 2` (<=50h), or `Phase 3` (>50h). The Gantt planner prefers `export_metadata.phased_deployment` when present.

### Planner and export features
- Dense PM-style split view: task table on the left, timeline on the right
- Clickable task rows and bars with a detail drawer
- Inline editing for **Start Week** and **Duration**
- Auto-shifting of untouched downstream tasks while preserving custom-pinned schedule overrides
- Status and impact indicators per task
- Resizable split pane between the task table and the chart
- Gantt / Task Cards tab switcher
- Excel export to `sentinel-onboarding-gantt.xlsx`

### Environment sizing feature
- **When:** Step 2 (Environment) after vendor/platform signals are selected
- **What:** Three questions drive infrastructure-aware planning:
  1. **How many Windows servers are in your environment?** — Numeric input or range selector (< 20, 20–100, 100+)
  2. **How many are on-premises or in other clouds (requiring Azure Arc)?** — Numeric input or percentage
  3. **How many are native Azure VMs?** — Numeric input or auto-calculated remainder
- **Output:** Planner logic uses these answers to derive an **environment size category** (Small, Medium, or Large) which then:
  - **Determines task visibility:** If all machines are native Azure, the planner skips Arc-related onboarding tasks (e.g., Task 3 in the Windows Security Events connector model).
  - **Scales task durations dynamically:** The planner applies environment-aware baseline durations per connector (see **Connector Task Durations** below).
  - **Remains fully user-configurable:** The sizing provides smart defaults, but users can override duration and start-week values directly in the planner.
- **Environment sizing rules:**
  - **Small:** < 20 total servers, all native Azure → ~2 days for Arc-optional connectors (Arc task skipped)
  - **Medium:** 20–100 total servers, mixed Azure + on-premises → ~9 days for Arc-required connectors (includes 1-week Arc onboarding)
  - **Large:** 100+ total servers, multi-region or all on-premises → ~4 weeks for Arc-required connectors (3-week Arc onboarding, additional planning complexity)
- **Generalization:** This pattern is connector-agnostic. Each connector may define its own environment-sizing questions and duration mappings (e.g., Linux connectors may ask about node count or container orchestration platform rather than Windows server distribution).

### Topology and analysis features
- PDF and PNG export for the topology view
- Grouped ingestion paths (Azure native, direct Microsoft, syslog/CEF, API, Logic App / Function, Windows events, Event Hub)
- MITRE ATT&CK tactic and technique summary sampled from GitHub-hosted analytic rules

### Connector task durations
Each connector in the catalog can define environment-aware baseline durations and task inclusion rules. The **Windows Security Events via AMA** connector models the standard pattern:
- **Planning & Readiness Assessment:** Small ~0.5 days, Medium ~1 day, Large ~2–3 days
- **Permissions Verification:** Small ~0.25 days, Medium ~0.5 days, Large ~0.5 days
- **Azure Arc Onboarding (conditional):** Small (skipped), Medium ~1 week, Large ~2–3 weeks
- **Deploy & Configure (AMA + DCR + validation):** Small ~0.5 days, Medium ~1 day, Large ~2–3 days
- **Analytics & Tuning:** Small ~0.5 days, Medium ~1–2 days, Large ~2 days
- **Documentation & Handoff:** Small ~1h, Medium ~2–4 hours, Large ~4–8 hours

All durations remain **user-editable** in the planner. The environment sizing sets the initial default proposal, not a hard constraint.

**Reference:** See `docs/connector-tasks-windows-security-events.md` for the full table and details.

## 4. Architecture

### Architecture summary
The application is a static HTML/CSS/JavaScript site with no build step and no backend. The browser loads `index.html`, fetches `data/solutions.json`, and derives all major UI states locally. The only live calls are optional Azure Management API calls for workspace import and GitHub fetches for solution versions / MITRE coverage.

### Current structure

```text
index.html
css/style.css
js/app.js
js/gantt-planner.js
js/modules/
  wizard.js
  solutions.js
  search.js
  scoring.js
  topology.js
  mitre.js
  export.js
  planning.js
data/solutions.json
```

### Module boundaries

| File | Responsibility |
| --- | --- |
| `index.html` | App shell, 5 wizard steps, planner/topology containers, CDN dependency loading |
| `css/style.css` | Entire dark-theme visual system, solution cards, topology styling, planner split-pane and Gantt overrides |
| `js/app.js` | Bootstraps app, loads catalog, wires step transitions, workspace connection flow, and export buttons |
| `js/modules/wizard.js` | Step state and progress indicator updates |
| `js/modules/solutions.js` | Catalog loading, vendor-based recommendation heuristics, workspace connector mapping, solution-card rendering, selection state |
| `js/modules/search.js` | Keyword search / NLP-lite connector matching |
| `js/modules/scoring.js` | Priority score, setup-hour estimation, and phase calculation |
| `js/modules/topology.js` | React Flow topology rendering and topology export |
| `js/modules/mitre.js` | GitHub-based MITRE ATT&CK coverage analysis |
| `js/gantt-planner.js` | Plan synthesis, scheduling model, split-pane planner shell, task detail drawer, override persistence, Gantt rendering integration |
| `js/modules/planning.js` | Secondary task-card planner view |
| `js/modules/export.js` | Excel workbook generation from the current Gantt plan |

### Runtime dependencies

| Dependency | Current use |
| --- | --- |
| `React` + `ReactDOM` + `React Flow` | Topology rendering only |
| `Frappe Gantt` | Timeline bar rendering for the planner |
| `ExcelJS` | Workbook generation for Excel export |
| `html2canvas` + `jsPDF` | On-demand topology export |
| Browser `localStorage` | Schedule override persistence; connected workspace IDs are intentionally not hydrated on startup |

### State model
- **Primary planning inputs:** selected vendors + selected solutions + connected workspace solutions
- **Derived outputs:** topology, MITRE coverage, planner rows, Gantt tasks, export rows
- **Scheduling state:** custom duration/start-week overrides are stored locally and re-applied when the plan re-renders
- **Planner layout state:** Step 5 expands the app shell to a wide layout and uses a resizable split pane

### Architectural notes
- The product is **static-first** but not fully offline because Step 1/4 call Azure/GitHub when used.
- The planner is a **hybrid implementation**: the scheduling engine, task table, drawer, split pane, and plan synthesis are custom, while the actual timeline bars are still rendered through Frappe Gantt.
- The UI is currently **Fluent-inspired rather than Fluent Web Components-based**. The live app uses native `<button>` and `<input>` controls; legacy Fluent markup remains only in `.original_index.html`.

## 5. Data Model

### Catalog shape
- Local catalog file: `data/solutions.json`
- Verified current category count: **3** (`azure`, `microsoft_365_security`, `third_party`)
- Verified current solution count: **484**

### Top-level structure

| Node | Purpose |
| --- | --- |
| `categories` | Root object grouping solutions into the three catalog families |
| `categories.<category>.label` / `description` / `icon` | Display metadata for each category panel |
| `categories.<category>.solutions[]` | Array of planning-ready solution objects |

### Solution object schema

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | string | Stable local identifier used across selection, planning, export, and workspace mapping |
| `name`, `description`, `logo`, `github_url` | string | Display metadata and source linkage |
| `connectors`, `analytics`, `workbooks`, `playbooks` | number | Packaged content counts |
| `is1P` | boolean | First-party / Microsoft affinity flag |
| `tags` | string[] | Search and recommendation heuristics |
| `value_scoring` | object | Priority inputs |
| `planner` | object | Task, validation, documentation, and common-issues metadata |
| `export_metadata` | object | Export grouping, phase, score, cost, and integration hints |
| `onboarding` | object | Difficulty and infrastructure metadata |
| `permissions` | object | Azure/M365/resource permission model |
| `is_connector` | boolean | Indicates connector-oriented entries |
| `category` | string | Category back-reference |
| `ama_only` | boolean (optional) | Present on some solutions such as Windows Security Events |

### Nested object schema

#### `value_scoring`
| Field | Purpose |
| --- | --- |
| `complexity_level` | 1-5 effort/skill proxy |
| `setup_hours` | Baseline estimated effort |
| `data_volume_risk` | Directional ingestion-risk signal |
| `business_impact` | Business / security value input |
| `maturity` | GA / preview / experimental signal |
| `detection_areas` | Coverage domains used for score normalization |
| `dependencies` | Upstream solution dependencies |

#### `planner`
| Field | Purpose |
| --- | --- |
| `setup_tasks[]` | Ordered action list used to synthesize connector tasks |
| `validation_steps[]` | Acceptance checklist / validation guidance |
| `documentation_url` | Primary documentation link |
| `owner_recommended` | Suggested owning role |
| `common_issues[]` | Common onboarding failure modes |
| `reference_guides[]` | Optional deep-link guides on selected solutions |

#### `export_metadata`
| Field | Purpose |
| --- | --- |
| `group` | Export grouping label |
| `priority_score` | Precomputed score stored in the dataset |
| `phased_deployment` | Preferred deployment phase number |
| `integrates_with[]` | Related solutions / dependencies |
| `estimated_monthly_cost` | Directional cost band |

#### `onboarding`
| Field | Purpose |
| --- | --- |
| `difficulty` / `difficulty_score` | Human-readable and numeric complexity signals |
| `setup_summary` | Short setup summary (often blank today) |
| `infrastructure[]` | Infrastructure pattern hints used by topology classification |
| `infrastructure_required[]` | Explicit required components |
| `notes` | Implementation notes and caveats |

#### `permissions`
| Field | Purpose |
| --- | --- |
| `azure_roles[]` | Azure RBAC requirements |
| `m365_roles[]` | Microsoft 365 / Entra role requirements |
| `fingerprint` | Deterministic role-set fingerprint for dedupe scenarios |
| `resource_permissions[]` | Resource-scoped access requirements |
| `third_party_admin` | External platform admin dependency |
| `consent_required` | Consent / approval burden |
| `privilege_level` | `low`, `medium`, or `high` |
| `notes` | Clarifying access guidance |

## 6. Permissions Model

### Current catalog rule
The current dataset follows a clear split:
- **Single-connector solutions (422):** keep Azure RBAC / M365 role metadata and usually include a `fingerprint`.
- **Multi-connector solutions (62):** leave Azure / M365 role lists empty, typically via an empty `permissions` object.

This means the catalog intentionally preserves explicit role modeling for simpler connectors while avoiding over-specific RBAC claims on multi-connector packages.

### Privilege levels in the current dataset
For solutions that carry permission metadata, the current distribution is:

| Privilege level | Solution count |
| --- | ---: |
| `low` | 18 |
| `medium` | 201 |
| `high` | 203 |
| blank / omitted | 62 |

### Current application behavior
- Step 3 displays role chips only when `azure_roles` or `m365_roles` exist.
- The Gantt planner derives owner recommendations from `privilege_level`, `owner_recommended`, and complexity.
- `fingerprint` exists to support shared-RBAC thinking, but the current Gantt planner does **not** yet implement full shared-RBAC deduplication logic.

### Important nuance
The canonical decisions file documents an **Approach B** direction for RBAC deduplication (per-connector task with shared indicator), but that approach is not yet realized in the live planner. Today, permissions primarily act as display and ownership metadata rather than a fully deduplicated execution engine.

## 7. Gantt Planner

### Current implementation shape
The planner in `js/gantt-planner.js` builds a project-plan-style schedule from selected solutions and renders it in two synchronized views:
1. a dense task table
2. a timeline chart

It also adds a secondary **Task Cards** tab using `js/modules/planning.js`.

### What the planner currently does
- Prepends standard setup tasks:
  - Stakeholder Kickoff
  - Define Workspace Topology
  - RBAC & Security Groups
- Groups connector work into:
  - Setup & Readiness
  - Phase 1 – Quick Wins
  - Phase 2 – Moderate Effort
  - Phase 3 – Complex Integrations
  - Training & Go-Live closeout tasks
- Converts `planner.setup_tasks[]` into detailed rows and, where present, nested subtasks / summary rows
- Calculates start week, duration, due date, status, impact, and ownership metadata per row
- Produces export-ready rows for Excel

### UX characteristics
- PM-style dense left/right layout
- Resizable split pane between the task table and the chart
- Clickable task rows and clickable chart bars
- Detail drawer with milestone, goal, owner, impact, start week, start date, due date, duration, and extra metadata
- Inline editing of **Start Week** and **Duration** from the drawer
- Status tracking labels: `Planned`, `In Progress`, `Completed`, `In Review`
- Impact labels: `Low`, `Medium`, `High`
- Mobile fallback list when the Gantt chart is unavailable or on smaller layouts

### Timeline behavior
- Current view toggles are **Timeline** and **Month**
- The Timeline view uses day-level columns with week-number headers
- Dependencies are rendered between rows/bars
- Selected tasks and hovered tasks stay synchronized between the table and chart

### Connector planning examples in the dataset
- **Windows Security Events** has a six-step AMA-oriented work breakdown (AMA deployment, DCR configuration, event-set selection, validation, analytics enablement, tuning).
- **CrowdStrike** and other multi-connector SaaS integrations are modeled with coarse four-step flows and blank permission payloads.

## 8. UI / UX

### Current design language
- Dark theme with Sentinel-blue / cyan accenting
- Card-heavy layout for onboarding decisions and solution browsing
- Native controls styled to feel Fluent-like, but not implemented as registered Fluent web components
- Responsive layout with stacked controls on smaller screens

### Key UX patterns
- Large category/vendor cards in Step 2
- Rich solution cards in Step 3 with:
  - recommended star state
  - connected badge state
  - difficulty badge
  - required role chips
  - live version badge
- Visual topology in Step 4 with legend and info cards
- Tabbed planner in Step 5 with Gantt and Task Cards modes
- Dense planner detail model designed for real project planning rather than simple connector selection

### Accessibility / interaction posture
- Keyboard activation support exists on major interactive cards, tabs, task rows, and split-pane controls.
- Planner detail and mobile states have explicit fallback behavior when the Gantt dependency does not load.

## 9. Known Limitations / Future Work

### Verified current limitations
1. **The app is not fully Fluent-based.** Live UI controls use native HTML elements; Fluent Web Components remain legacy intent rather than current runtime reality.
2. **The planner is not fully independent of Frappe Gantt.** The shell is heavily customized, but chart rendering still depends on the Frappe Gantt library.
3. **Workspace import still relies on manual token paste.** This conflicts with the broader security direction to move away from token-handling UX.
4. **MITRE coverage and version badges depend on live GitHub calls.** Performance and availability vary with network and GitHub responsiveness.
5. **Effort-hour normalization is incomplete.** The catalog still contains many non-clean effort values (for example `0.7`, `0.8`, `4.8`, `8.4`) despite the team's clean-value decision.
6. **Phase distribution is weak in the current data.** `export_metadata.phased_deployment` is heavily skewed toward Phase 1, which limits phase differentiation in planning outputs.
7. **The Gantt view labels are not fully aligned across docs and code.** Existing docs mention Day / Week / Month views, while the current implementation exposes `Timeline` and `Month`.
8. **Topology rendering still depends on React Flow CDNs.** The app is static, but not dependency-light.
9. **Planner persistence is browser-local only.** There is no named-plan save/load workflow yet.
10. **Some legacy architecture intent remains in the repo.** Examples include `.original_index.html`, older Fluent assumptions in docs, and planning notes that no longer exactly match runtime behavior.

### Near-term future work already suggested by existing docs/decisions
- Onboarding Readiness Advisor
- EPS + Cost Assessment
- Validation & Cutover Pack
- Stronger RBAC deduplication and shared-task treatment
- Saved / re-importable plans
- Security hardening of CDN and DOM-rendering patterns

## 10. Product Direction Summary

Sentinel Onboarding Planner v2 is already more than a connector picker: it is a static-first onboarding planning workspace. Its strongest current identity is **scoping + architecture visualization + task planning + export**.

The next evolution should deepen that planning identity rather than turning the product into a deployer. In practice, that means better readiness guidance, better sizing/cost modeling, stronger validation outputs, and tighter permissions / ownership modeling.
