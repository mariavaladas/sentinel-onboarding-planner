# Product Brainstorm — Sentinel Onboarding Accelerator

- **Prepared by:** Deckard
- **Prepared:** 2026-05-20T11:40:21.320+02:00
- **Scope:** Product brainstorm for evolving Sentinel Onboarding Planner v2 from a planning tool into a practical onboarding accelerator for day-1, migration, expansion, and enterprise customers.

## Framing

The current planner already answers **what should we onboard first?**

The next product leap is helping customers answer the harder questions that usually slow Sentinel down in real projects:

- **Which collection pattern is right?**
- **What permissions and teams do we need?**
- **How much infrastructure and ingestion cost are we really signing up for?**
- **How do we know the connector is truly working, not just enabled?**
- **How do we move from plan to execution without losing momentum?**

The strongest product direction is to make the app a **static, evidence-driven onboarding coach**: it should use local metadata, decision trees, import/export artifacts, KQL packs, and downloadable plans before it ever depends on live Azure APIs.

## 1. Customer Pain Points

| # | Customer pain point | Where they get stuck | Most affected |
| --- | --- | --- | --- |
| 1 | **They do not know where to start.** | New customers open Sentinel, see hundreds of connectors, and cannot tell which 5-10 sources create immediate value versus future backlog. | Day-1, expansion |
| 2 | **They choose the wrong collection pattern.** | Customers struggle to decide between direct AMA, WEF/WEC, Linux Syslog forwarder, or Azure Monitor Pipeline. This is usually the first real architecture fork. | Day-1, enterprise |
| 3 | **Permissions are fragmented across teams.** | Sentinel onboarding often needs Azure RBAC, workspace access, Windows admin, Linux sudo, firewall changes, third-party console admin, and sometimes consent. Customers underestimate this coordination cost. | Day-1, migration, enterprise |
| 4 | **They cannot size infrastructure confidently.** | Customers rarely know their real EPS, burst profile, average event size, or collector concentration. They either under-design the collector tier or overbuild it. | Enterprise, migration |
| 5 | **They fear unpredictable ingestion cost.** | Customers can enable a connector, but they do not know whether it will produce manageable volume or a surprise bill after 48 hours. | Day-1, expansion, enterprise |
| 6 | **They struggle to filter noise early enough.** | WEF subscriptions, DCR settings, facility/severity choices, and connector-side options are hard to tune. Customers often send too much data first and clean it up later. | Expansion, enterprise |
| 7 | **They cannot tell whether “enabled” means “useful.”** | Heartbeats arrive, but parsing, ASIM mapping, alert dependencies, enrichment, or expected fields are still missing. The customer has no clean acceptance checklist. | Day-1, migration |
| 8 | **Migration customers know the source systems, but not the Sentinel translation.** | Splunk/QRadar/ArcSight users know the detections and use cases they want, but not which Sentinel tables, connectors, workbooks, parsers, or content packages replace them. | Migration |
| 9 | **Execution ownership is unclear.** | The planner can recommend solutions, but onboarding stalls when nobody owns firewall changes, DCR creation, agent rollout, validation, or cutover. | Day-1, enterprise |
| 10 | **Large customers need operating-model decisions, not just connector picks.** | Multi-tenant design, regional workspaces, private link, Arc, collector zones, and compliance constraints create architectural decisions that are bigger than a single connector. | Enterprise |

## 2. Feature Ideas Ranked by Impact × Feasibility

| Rank | Feature idea | One-line description | Pain point solved | Feasibility | Priority | Implementation notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Onboarding Readiness Advisor** | A guided decision step that recommends the right collection pattern, prerequisites, and next actions per source. | #1, #2, #3, #9 | **Yes — strong static fit.** Uses existing onboarding, permissions, and connector-guide metadata plus decision rules. | **P0** | **Deckard** defines decision trees and architecture rules; **Sebastian** adds pattern hints and prerequisite metadata; **K** builds the guided UI step; **Joi** keeps linked guidance concise. |
| 2 | **Validation & Cutover Pack** | Generate connector-specific KQL checks, acceptance criteria, rollback notes, and “done means done” checklists. | #7, #9 | **Yes — strong static fit.** The app can generate downloadable KQL and validation tasks without backend services. | **P0** | Extend solution metadata with `validation_queries`, `expected_tables`, `acceptance_checks`, and `rollback_notes`; **K** adds export UI, **Sebastian** enriches data, **Luv** writes validation test coverage. |
| 3 | **EPS + Cost Assessment** | Turn source mix and measured or estimated EPS into collector sizing, pipeline guidance, and monthly cost bands. | #4, #5, #10 | **Yes — strong static fit.** Uses heuristics, formulas, and downloadable worksheets; can optionally accept manual inputs or imported metrics. | **P0** | Build on Deckard’s EPS research; new estimator module plus archetype data; **Sebastian** models thresholds and cost factors; **K** renders interactive sizing cards and export views. |
| 4 | **Permissions & RACI Builder** | Produce a per-solution permissions checklist with named owner roles and approval dependencies. | #3, #9 | **Yes — strong static fit.** Existing permissions metadata already makes this practical. | **P0** | Reuse `permissions` plus a new role-to-task mapping; **K** adds checklist/RACI UI; **Sebastian** extends metadata; export to Excel as an approvals sheet. |
| 5 | **Migration Mapper** | Translate legacy SIEM intents (“Windows auth failures”, “firewall denies”, “VPN access”) into Sentinel connectors, tables, and content. | #8, #1 | **Yes — moderate static fit.** Best implemented as curated mappings, not live log translation. | **P1** | Add a `migration_map.json` dataset; **Deckard** defines the mapping model; **Sebastian** curates table/content relationships; **K** adds a migration wizard mode. |
| 6 | **Blueprint Templates by Archetype** | Starter plans for common environments such as “Microsoft-heavy SMB”, “hybrid enterprise”, or “firewall-first branch estate”. | #1, #10 | **Yes — strong static fit.** Pure metadata plus import/export. | **P1** | New `data/blueprints.json`; **Deckard** defines archetypes; **K** adds template picker; **Joi** writes short rationale text for each blueprint. |
| 7 | **Artifact Generator** | Download implementation-ready artifacts: task lists, firewall port requests, change plan, validation workbook, and handoff notes. | #3, #7, #9 | **Yes — strong static fit.** Natural extension of current export capability. | **P1** | Expand `export.js` into multi-sheet workbooks and optional JSON bundle export; **K** owns export UX; **Sebastian** supplies structured data; **Joi** reviews wording. |
| 8 | **Onboarding Risk Register** | Auto-flag likely blockers such as missing roles, high-volume feeds, third-party admin dependency, or phase-1 overreach. | #3, #4, #5, #9 | **Yes — strong static fit.** Rule-based scoring only. | **P1** | Add a lightweight risk engine fed by onboarding metadata, EPS inputs, and selected solutions; **Deckard** defines rules; **K** adds risk callouts in planner view. |
| 9 | **Tenant Import (Offline State Check)** | Let customers import Azure exports, KQL outputs, or CSVs to compare “planned” versus “already enabled.” | #1, #7, #10 | **Yes — moderate static fit.** Import files locally in-browser; no backend required. | **P1** | Parse exported JSON/CSV client-side; **K** builds import flow; **Sebastian** defines accepted schemas; avoids live auth for MVP. |
| 10 | **Connector Noise Tuning Coach** | Recommend safer pilot filters and post-cutover clean-up steps for WEF, Syslog, and DCRs. | #5, #6, #7 | **Yes — moderate static fit.** Static guidance + rule prompts. | **P1** | Use connector-specific metadata and guide links; **Deckard** defines tuning heuristics; **K** shows them contextually when a source is selected. |
| 11 | **Community Plan Exchange** | Export/import reusable onboarding templates and “what worked” plans across teams or customers. | #1, #8, #9 | **Partly.** Static export/import is easy; community hosting would need a service later. | **P2** | MVP = signed JSON plan bundles only; future = hosted gallery. **K** handles import/export UX; **Deckard** defines schema/versioning. |
| 12 | **Live Azure Readiness Checker** | Check actual tenant state, installed agents, or DCR presence directly from Azure. | #2, #7, #10 | **Not for MVP static-only.** Would need auth, Azure API calls, and more security review. | **P2** | Treat as future optional mode only. Requires architecture, auth, security, and likely Rachael review before implementation. |

## 3. Innovation Concepts

### 3.1 AI onboarding coach

**Concept:** “Based on your industry, estate shape, selected sources, and EPS, here is the fastest safe onboarding path.”

- **Static-first version:** local rule engine plus curated prompts and explainers.
- **Differentiator:** explains *why* a recommendation is being made, not just *what* to click.
- **Future version:** optional cloud AI that rewrites the plan into executive, engineer, and SOC-owner views.
- **Risk:** avoid opaque recommendations; keep evidence visible.

### 3.2 Azure-aware planner mode

**Concept:** Compare the customer’s desired plan against their real tenant state.

- **Static-first version:** import Azure Resource Graph output, CSV exports, or KQL results.
- **Future version:** direct Azure sign-in and tenant inspection.
- **Differentiator:** turns the tool into a readiness gap analyzer, not just a static planner.
- **Risk:** live Azure access changes the security model and raises UX complexity.

### 3.3 Community and sharing model

**Concept:** Customers and field teams reuse proven onboarding blueprints.

- **Static-first version:** export/import versioned JSON templates.
- **Future version:** curated template gallery by industry, estate type, or migration pattern.
- **Differentiator:** compresses time-to-first-plan for common scenarios.
- **Risk:** template quality must be curated or the gallery becomes noisy.

### 3.4 Progress and motivation mechanics

**Concept:** Turn onboarding into a visible milestone program rather than a vague implementation effort.

- **Static-first version:** checklist progress, dependency completion, “phase complete” badges, and validation score.
- **Future version:** shareable scorecards for project sponsors and customer success reviews.
- **Differentiator:** makes Sentinel onboarding feel trackable and less overwhelming.
- **Risk:** gamification must reinforce real outcomes, not vanity completion.

### 3.5 Cost and value simulation

**Concept:** Show the tradeoff between coverage, onboarding effort, and ingestion cost before deployment.

- **Static-first version:** estimated daily GB and monthly cost bands from EPS + event-size assumptions + retention choices.
- **Future version:** compare current bill versus proposed optimized design using imported usage data.
- **Differentiator:** helps customers defend the onboarding plan to finance and architecture boards.
- **Risk:** estimated costs must be clearly labeled as directional, not contractual.

## 4. Recommended Roadmap — If Maria Ships Only 3 More Features

### 1) Onboarding Readiness Advisor

**Why this should be first:**
It solves the biggest day-1 blocker: customers do not know which onboarding path to take or what prerequisites they need before touching Sentinel. This feature would turn the app from a solution shortlist into a guided architecture coach.

**What it includes:**
- collection-pattern selector (AMA vs WEF/WEC vs Syslog vs Pipeline),
- prerequisite checklist,
- permissions and owner callouts,
- recommended documentation path,
- “why this path” explanation.

### 2) EPS + Cost Assessment

**Why this should be second:**
Sizing and cost fear stall real projects, especially for enterprise, migration, and firewall-heavy customers. This gives Maria a credible architecture story with measurable value beyond a simple connector picker.

**What it includes:**
- manual or imported EPS inputs,
- source mix and burstiness prompts,
- collector count recommendations,
- pipeline recommendation thresholds,
- daily GB and monthly cost band output.

### 3) Validation & Cutover Pack

**Why this should be third:**
Customers need proof that onboarding succeeded. Without acceptance criteria, teams often stop at “connector enabled” and then lose trust when incidents, fields, or parsers are missing.

**What it includes:**
- per-solution validation KQL,
- expected tables and sample checks,
- operational sign-off checklist,
- rollback or troubleshooting notes,
- exportable workbook sheet for project tracking.

### Why these 3 beat the rest

Together they cover the full onboarding arc:

1. **Before build:** pick the right path.
2. **During design:** size it and budget it.
3. **After enablement:** prove it works.

That combination creates a much stronger product identity than adding more connector descriptions alone.

## 5. Architecture Implications for the Recommended Features

| Recommended feature | Codebase implications | Data implications | Export / artifact implications | Key risks |
| --- | --- | --- | --- | --- |
| **Onboarding Readiness Advisor** | Add new modules such as `js/modules/readiness.js` and `js/modules/patterns.js`; likely add a new wizard step before solution selection or between environment and solutions; add reusable decision-card UI patterns. | Extend `solutions.json` with explicit collection-pattern hints, prerequisite tags, ownership hints, and blocker conditions. Reuse existing `onboarding` and `permissions` objects as the base. | Add a new “Readiness” export sheet with prerequisites, owners, and required access. | Rule explosion if guidance becomes too source-specific; needs strong information architecture. |
| **EPS + Cost Assessment** | Add `js/modules/eps.js` or `cost-model.js`; render estimator cards, confidence bands, and branch/site views; integrate with planner summary state. | Add archetype data for average event sizes, source families, collector thresholds, and cost assumptions; may live in `data/eps-archetypes.json`. | Add “Sizing & Cost” export sheet with EPS assumptions, collector counts, estimated daily GB, and cost bands. | False precision if the UI does not show confidence and assumptions clearly. |
| **Validation & Cutover Pack** | Add `js/modules/validation.js`; expose validation panel per selected solution; integrate with results/planner cards and export flow. | Extend solution metadata with `validation_queries`, `expected_tables`, `acceptance_checks`, `known_failure_signals`, and optional `troubleshooting_links`. Existing `planner.validation_steps` is a good seed but not enough by itself. | Add “Validation” export sheet and optionally a downloadable `.kql` or JSON bundle. | Metadata curation effort could become large; start with the top 20-30 connectors that drive most projects. |

## Final Product Direction

The best next move is **not** to turn the planner into a deployer.

It is to turn the planner into a **static onboarding accelerator** that helps customers:

- choose the right onboarding architecture,
- understand prerequisites and permissions,
- estimate scale and cost,
- and validate success with confidence.

That direction stays aligned with the existing charter of **planner not deployer**, while materially increasing customer value during the hardest part of Sentinel adoption.
