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


