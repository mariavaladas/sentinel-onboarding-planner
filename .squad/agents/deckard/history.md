# History — Deckard

## Project Context
- **Project:** Sentinel Onboarding Planner v2
- **Stack:** HTML/CSS/JS, Fluent UI web components, solutions.json data catalog
- **User:** madesous
- **Created:** 2026-05-18

## Learnings

### 2026-05-20T11:24:51.073+02:00: EPS discovery research and planner approach

**Key Findings:**
- The planner should use a **measured-first** EPS workflow: existing SIEM / Azure / vendor dashboard data first, host or collector-side scripts second, estimate-only mode last.
- Architecture decisions must use **site-level peak or P95 EPS plus headroom**, not daily average alone.
- Microsoft sizing anchors remain the critical guardrails: **~5,000 EPS per Windows / WEF collector**, **~10,000 EPS sustained per dedicated Linux AMA forwarder**, and **Pipeline becomes a strong candidate once a site moves beyond single-forwarder territory or needs filtering / buffering / resiliency**.
- The right product shape is an interactive **EPS Assessment** wizard step that outputs forwarder count, WEC count, load balancer need, pipeline recommendation, cost band, and a confidence score.

**Architecture Decisions / Patterns:**
- Treat **Windows-heavy** and **CEF-heavy firewall** estates more conservatively than generic Syslog because collector limits and burstiness appear sooner.
- Prefer a triangulated discovery order: **existing platform -> source-native measurement -> estimator fallback**.
- Pair EPS with **daily GB / average bytes per event** so the planner can explain both architecture and ingestion cost.

**Artifacts:**
- Research document: `docs/architecture/eps-discovery-research.md`
- Decision proposal: `.squad/decisions/inbox/deckard-eps-discovery-approach.md`

### 2026-05-18: Architecture Gap Analysis — v1 vs v2

**Key Findings:**
- V1 is a clean, modular-by-intention codebase: 429 lines in app.js, 4-step wizard, vendor-based pre-selection, NLP search.
- **Keep:** Wizard navigation, vendor pre-selection, connector selection UI, NLP search, solutions catalog structure.
- **Remove:** Markdown export (exportPlan function), deployment automation wording, ARM/Bicep future roadmap items.
- **Add:** Value scoring system, planning view (timeline + effort), Excel export, UI badges for value/complexity.

**Architecture Decisions:**
- Modularize app.js → separate concerns into `modules/` (wizard.js, solutions.js, scoring.js, planning.js, export.js, search.js).
- Extend solutions.json schema: add `coverage`, `detection_quality`, `setup_ease`, `effort_estimate_hours`, `complexity`, `risk_level`, `dependencies`, `phase`.
- Stay with vanilla HTML/CSS/JS (no build step for MVP); use SheetJS (CDN) for Excel export, not ExcelJS.
- Redesign Step 4 (results) into planning view with timeline swimlanes, effort aggregation, risk indicators.

**Data Schema Additions (solutions.json):**
- `coverage` (0–100): % of typical scenarios this solution covers.
- `detection_quality` (1–5): Expert security assessment.
- `setup_ease` (1–5): Inverse of complexity; how quickly a new user can configure.
- `effort_estimate_hours` (number): Baseline setup time for typical org.
- `complexity` (1–5): Required expertise level (1=anyone, 5=expert engineer).
- `risk_level` ("low" | "medium" | "high"): Deployment risk.
- `dependencies` (array of IDs): Solutions that should be deployed first.
- `phase` (string, optional): Default timeline phase (e.g., "week1", "week2–3").

**Value Scoring Formula (Proposal):**
```
value_score = (coverage * 0.4) + (detection_quality * 25) + (setup_ease * 20)
// Result: 1–100, where 100 is "essential + easy"
```

**Files Impacted:**
- High priority: index.html, app.js, js/modules/* (new), data/solutions.json, css/style.css
- Medium priority: README.md

**Open Questions for Team:**
1. Value scoring weights: Is the 0.4 / 25 / 20 split correct, or should coverage weight higher?
2. Planning view phases: Are "week1", "week2–3", "week4+" the right buckets, or custom phases?
3. Complexity/effort scales: Are 1–5 scales intuitive, or prefer T-shirt sizing (S/M/L/XL)?
4. Gantt visualization: In MVP scope, or defer to Phase 2?

**Key Paths:**
- Architecture gap analysis: `.squad/decisions/inbox/deckard-v2-architecture.md`
- Solutions catalog: `data/solutions.json` (524KB; ~200+ solutions)
- App entry: `index.html` (~5KB), `js/app.js` (~15KB)
- CSS theme: `css/style.css` (~4KB, dark theme, Fluent UI inspired)

**Blockers/Notes:**
- None at architecture design phase; ready for implementation review by K/Sebastian.

### 2026-05-20T11:40:21.320+02:00: Product brainstorm — Sentinel onboarding accelerator

**Key Findings:**
- The product should evolve from a connector planner into a **static onboarding accelerator** that helps customers choose the right path, size the architecture, and prove onboarding success.
- The highest-friction customer problems are not connector discovery alone; they are **collection-pattern choice, permissions coordination, EPS/cost uncertainty, noise control, and validation after enablement**.
- The strongest roadmap is a three-part flow: **Onboarding Readiness Advisor**, **EPS + Cost Assessment**, and **Validation & Cutover Pack**.

**Architecture Decisions / Patterns:**
- Stay aligned with the approved principle of **planner not deployer**; prioritize local decision logic, metadata, import/export, and downloadable artifacts over backend automation.
- Treat **static-first** as the product constraint: live Azure inspection is future-facing, while offline import plus rule-based guidance is viable now.
- Reuse and extend the enriched `solutions.json` metadata (`onboarding`, `permissions`, `planner`) rather than creating disconnected per-feature datasets wherever possible.

**Artifacts:**
- Brainstorm document: `docs/architecture/product-brainstorm.md`
- Decision proposal: `.squad/decisions/inbox/deckard-product-roadmap.md`

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
