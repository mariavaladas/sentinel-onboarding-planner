# Decisions Archive

Last Updated: 2026-05-25T12:38:50Z


## copilot-directive-20260521T110524

### 2026-05-21T11:05:24: User directive
**By:** madesous (via Copilot)
**What:** For the MITRE tactics and techniques coverage in Topology, reuse the exact same code from the original solution (C:\Users\madesous\value-pack-setup\index.html). The current experience takes too long to load.
**Why:** User request — the original implementation was faster and should be used as-is.

---


## copilot-directive-20260521T111736

### 2026-05-21T11:17:36: User directive — Gantt granularity & configurability
**By:** madesous (via Copilot)
**What:** The Gantt chart should contain one task PER ACTION the customer needs to do per connector (not a single "deploy connector" block). Each task's duration should be configurable by the customer (e.g. permissions might default to 1 day but some orgs need 2 weeks). Starting with AMA as the proof-of-concept connector — once agreed on the format, expand to all connectors.
**Why:** User request — real-world deployment involves multiple discrete steps per connector that vary by customer environment.

---


## copilot-directive-20260521T125330

### 2026-05-21T12:53:30Z: User directive
**By:** madesous (via Copilot)
**What:** Effort hours in planner setup_tasks must use clean values — 0.5, 1, 2, 3, etc. No decimals like 4.8 or 8.4.
**Why:** User request — captured for team memory


---


## copilot-directive-20260521T140430

### 2026-05-21T14:04:30+02:00: User directive
**By:** madesous (via Copilot)
**What:** 
1. RBAC and security groups should be a distinct task per connector, but when multiple connectors share the same RBAC requirements, this should be reflected (deduplicated/grouped).
2. Windows Security Events (and similar complex connectors) should be split into multiple subtasks showing the real work breakdown (VM setup, ARC install, permissions, AMA install, DCR deployment, etc.)
**Why:** User request — the planner must accurately reflect the real work breakdown for each connector, not just show a single high-level task.


---


## deckard-eps-discovery-approach

# Deckard — EPS discovery approach proposal

- **Date:** 2026-05-20T11:24:51.073+02:00
- **By:** Deckard (Lead)
- **Status:** Proposed for merge


## Recommendation

Adopt a new **EPS Assessment** wizard step in the planner and make it **measured-first, estimate-last**.

The planner should collect EPS in this order:

1. **Existing measured source** — legacy SIEM, firewall dashboard, or partial Azure ingestion
2. **Targeted measurement** — PowerShell on Windows / WEC, `rsyslog` or `syslog-ng` counters on Linux collectors
3. **Estimate fallback** — source-count archetypes only when no measured data exists


## Why this is the right approach

- It produces architecture decisions from **real customer data** whenever possible.
- It avoids false precision from one-size-fits-all EPS guesses.
- It supports all key planning decisions Maria called out: forwarder count, load balancer need, AMA vs Pipeline, and WEF/WEC design.


## Architecture thresholds to encode

- **<500 EPS:** single AMA forwarder or direct AMA is fine
- **500-2,000 EPS:** single dedicated forwarder with monitoring
- **2,000-5,000 EPS:** stronger dedicated forwarder or separate WEC tier
- **5,000-10,000 EPS:** multiple collectors become the default; load balancing for Syslog/CEF, multiple WECs for Windows
- **10,000+ EPS:** Azure Monitor Pipeline should be actively evaluated
- **20,000+ EPS:** Pipeline should be the default recommendation unless there is a strong exception


## Important refinement

The planner must treat **Windows-heavy** and **CEF-heavy firewall** estates more conservatively than generic Syslog:

- **Windows / WEF:** use **~5,000 EPS per collector** as the safer planning ceiling
- **Linux AMA forwarder:** use **~10,000 EPS sustained** as the planning anchor
- **Pipeline:** recommend earlier whenever the customer needs filtering, buffering, outage survival, or strong burst handling


## Output the planner should produce

For each site / collector zone, output:

- recommended pattern,
- forwarder count,
- WEC count,
- load balancer requirement,
- pipeline recommendation,
- estimated daily GB / cost band,
- confidence level (`measured`, `platform-derived`, `estimated`),
- follow-up validation action.


## Bottom line

The top approach is **not** a static threshold table by itself. It is an **interactive EPS Assessment** backed by measured data first, official Microsoft sizing anchors second, and estimates only as a visible fallback.


---


## deckard-product-roadmap

# Deckard — product roadmap proposal for onboarding accelerator

- **Date:** 2026-05-20T11:40:21.320+02:00
- **By:** Deckard (Lead)
- **Status:** Proposed for merge


## Recommendation

The planner should evolve into a **Sentinel onboarding accelerator** while staying within the approved scope of **planner, not deployer**.

If the team only ships three additional features beyond current work, the recommended order is:

1. **Onboarding Readiness Advisor**
2. **EPS + Cost Assessment**
3. **Validation & Cutover Pack**


## Why these three

### 1) Onboarding Readiness Advisor
This solves the earliest and most common blocker: customers do not know whether to use direct AMA, WEF/WEC, Syslog forwarder, or Azure Monitor Pipeline, and they usually discover permission dependencies too late.

### 2) EPS + Cost Assessment
This addresses the most important architecture objection in enterprise onboarding: sizing, forwarder count, burst handling, and ingestion cost uncertainty.

### 3) Validation & Cutover Pack
This closes the trust gap between “connector enabled” and “connector operational.” It gives customers concrete KQL checks, expected tables, and sign-off criteria.


## Product principle

The near-term product should remain **static-first and evidence-driven**:

- prefer local metadata, rules, import/export, and downloadable artifacts,
- avoid live Azure dependencies in MVP,
- allow optional future Azure-aware modes only after separate security and architecture review.


## Codebase implications

- Add new modules for readiness guidance, EPS/cost modeling, and validation artifact generation.
- Extend `data/solutions.json` with collection-pattern hints, stronger prerequisite metadata, and validation query metadata.
- Expand Excel export to include readiness, sizing/cost, and validation sheets.


## Bottom line

These three features create a coherent journey:

- **pick the right path,**
- **size it safely,**
- **prove it works.**

That is the highest-impact way to help Sentinel customers onboard better without turning the product into an automation platform.


---


## joi-connector-docs-standards

# Joi Connector Documentation Standards Proposal

- **Date:** 2026-05-20T11:15:54.563+02:00
- **Author:** Joi
- **Scope:** Customer-facing connector and onboarding guides under `docs/`


## Proposed reusable pattern

1. Start every connector guide with a **Quick Reference** table that answers permissions, time, difficulty, and the best-fit scenario.
2. Add a short **When to Use This** section followed by a lightweight **Decision Tree** so customers can self-select the right pattern.
3. Keep the body practical and implementation-first: prerequisites, portal path, real commands, validation queries, troubleshooting, and cost notes.
4. Add explicit **Validation Steps**, **Common Pitfalls**, and **Further Reading** sections to every guide.
5. Cross-link related guides bidirectionally so customers can move from direct AMA -> Syslog forwarder -> Pipeline without losing context.
6. Prefer Microsoft Learn synthesis over copied text, and surface specific numbers only when the source publishes them clearly.


## Why this is worth reusing

This pattern makes connector docs easier for IT admins and SOC engineers to scan, compare, and operationalize. It also reduces drift between guides by giving every author the same customer-facing structure.


## WEF follow-up

- **Date:** 2026-05-20T11:27:22.544+02:00
- For topology-heavy connector guides, include an explicit **Architecture Overview** diagram and a **comparison table** against adjacent patterns so customers can tell when the design is a first-class fit versus a workaround.
- When a guide mentions Azure Monitor Pipeline, state clearly whether Pipeline is a native ingestion path for that exact data type or only an adjacent design option.



---


## k-arrow-styling

# K arrow styling

- Restyled Frappe Gantt dependency connectors as thin dashed lines instead of the default arrow treatment.
- Used a semi-transparent cool light gray (`rgba(226, 232, 240, 0.38)`) so dependencies stay visible on the dark blue chart without overpowering task bars.
- Removed SVG markers/arrowheads via CSS to keep dependency indicators readable but visually quiet.


---


## k-button-styling

# K Button Styling

- **Date:** 2026-05-20T16:27:42.196+02:00
- **By:** K
- **Scope:** Wizard UI controls


## Decision
- Replace the wizard's unregistered `fluent-button` elements with native `<button>` controls.
- Replace the Step 3 unregistered `fluent-text-field` with a native `<input>`.
- Use shared `.app-button` / `.app-button--accent` dark-theme styles for all wizard CTAs and action buttons.


## Why
- The previous custom tags were rendering like plain text instead of clear buttons.
- Native controls restore reliable semantics, keyboard accessibility, pointer affordance, and disabled behavior without adding runtime component registration.
- A shared button pattern keeps Connect, Start planning, navigation, export, and search actions visually consistent.


## Impact
- Buttons now have visible fill, border, padding, hover, active, focus, and disabled states.
- Existing JS hooks remain intact because IDs and `data-next` / `data-prev` attributes were preserved.
- The Step 3 search row now uses a real text input that matches the existing CSS input styling.


---


## k-category-restructure

# Decision: Category Restructure (12 → 3)

**Author:** K (Frontend Dev)  
**Date:** 2026-05-21  
**File:** `data/solutions.json`


## What changed

Collapsed 12 granular solution categories into 3 top-level categories matching the reference project:

| New Key | Label | Icon | Solutions |
|---|---|---|---|
| `azure` | Azure | ☁️ | 18 (from `azure_first_party`) |
| `microsoft_365_security` | Microsoft 365 & Security | 🛡️ | 20 (from `microsoft_xdr` + `microsoft_entra` + `microsoft_365`) |
| `third_party` | Third Party | 🔌 | 447 (all remaining 8 categories combined) |

**Total solutions preserved: 485** — no individual solution objects were modified.


## Why

The reference project uses these 3 buckets. The 12-category structure was overly granular for the planner UI, which surfaces solutions by category tab. Fewer categories = cleaner navigation.


## No JS changes needed

`js/modules/solutions.js` iterates categories dynamically — no hardcoded category key references were found. The new keys will be picked up automatically by `selectedCategories` and the panel renderer.


---


## k-collapsible-categories

# Decision: Collapsible Category Panels

**Date:** 2026-05-21  
**Author:** K (Frontend Dev)


## What changed
Made connector/solution category panels collapsible with an internal scrollbar.


## Key decisions

### Collapse animation via `max-height` transition
Used CSS `max-height` transition (`0 → 500px`) rather than JS-driven height measurement.
Trade-off: the transition eases from 0 to 500px even for small lists, making the expand feel slightly faster than collapse on short lists. Acceptable for this use-case; avoids the JS `offsetHeight` snap problem.

### Default state: expanded
All panels start open. Users can collapse individually. No "collapse all" button added — keeping scope tight.

### Scrollbar max-height: 500px
Set at 500px so panels with many solutions (e.g. "Third Party (364)") stay manageable without dominating the viewport. Can be tuned via CSS variable later if needed.

### Accessibility
Added `role="button"`, `tabindex="0"`, `aria-expanded` on the header, and keyboard support (`Enter`/`Space`) so the toggle is accessible without a mouse.

### Chevron placement
Appended after the title so it sits at the right edge (`margin-left: auto` on `.chevron`). Rotates −90° when collapsed via CSS transition — no JS class manipulation needed for the icon state beyond the panel `.collapsed` class.


---


## k-editable-durations

# K — Editable Duration Decisions

- **Date:** 2026-05-21T14:07:44.312+02:00
- **By:** K


## Decision
Summary rows in the Step 5 Gantt remain calculated/read-only, while direct duration overrides apply to leaf tasks and program milestones only.


## Why
- Child-task overrides already provide precise control over the schedule drivers.
- Keeping summary rows derived guarantees parent spans stay mathematically consistent with their children.
- This preserves automatic downstream shifting without inventing ambiguous rules for redistributing a parent override across subtasks.


## Implementation notes
- Overrides are stored in localStorage using stable planner row IDs.
- Summary rows still surface inherited custom state so users can see when child edits changed the rolled-up duration.
- The planner toolbar exposes a global reset for all custom durations.


---


## k-excel-export

# K Decision — ExcelJS Gantt export

- **Date:** 2026-05-21T13:25:43.387+02:00
- **Decision:** Replace the old SheetJS-style planner export with an ExcelJS browser export that generates a single worksheet-as-timeline Gantt workbook.
- **Why:** The Step 5 requirement is a visual `.xlsx` that opens looking like the planner itself. ExcelJS supports frozen panes, narrow timeline columns, and direct pastel cell fills from `PHASE_BAR_COLOR` without charts or a build step.
- **Impact:** `js/modules/export.js` now exports the current rendered Gantt plan, `index.html` loads the pinned ExcelJS CDN bundle, and the download name is `sentinel-onboarding-gantt.xlsx`.


---


## k-gantt-bars-visibility

# K — Gantt bar visibility

- **Date:** 2026-05-21
- **Decision:** Keep the dark grid styling, but explicitly push Frappe Gantt's `.grid-background` rect behind every other SVG layer after render.
- **Why:** In Frappe Gantt 1.2.2 the background rect is appended directly under the root `<svg>` after the layer groups. Once we gave `.grid-background` an opaque dark fill in `css/style.css`, that rect started painting on top of the `bar` layer and visually blanked the chart even though the bars existed in the DOM.
- **Implementation notes:** `stabilizeGanttRender()` now reorders `.grid-background` to the first SVG child, reapplies inline bar fills/opacity as a belt-and-suspenders fallback, and logs render diagnostics. The host/container also get an explicit minimum height so the chart area cannot collapse while the library lays out the SVG.


---


## k-gantt-contrast

# K — Gantt contrast escalation

- **Date:** 2026-05-21
- **Decision:** Kept the contrast fix in `css/style.css` and pushed it much harder instead of changing `js/gantt-planner.js` task shaping.
- **Why:** The rendering issue is no longer data-driven; the remaining problem is visual contrast inside Frappe Gantt on the app's dark navy surface.
- **Implementation notes:** Force bar labels to white with a dark SVG stroke, use solid high-saturation fills per phase, brighten dependency arrows/arrowheads, and deepen alternating row backgrounds so bars stand out clearly.


---


## k-gantt-dark-mode

# K — Gantt dark-mode styling

- **Date:** 2026-05-21T12:00:42.157+02:00
- **By:** K
- **Area:** Planner / Gantt chart styling


## Decision
Use scoped Frappe Gantt theme overrides in `css/style.css` for the Step 5 planner instead of changing the chart data or forking library assets.


## Why
- Frappe Gantt v1.2.2 ships with CSS variables and DOM hooks for light/dark theming, but the app was only overriding a subset of SVG selectors.
- Important dark-mode hooks such as `.gantt-container .grid-header` and `.current-highlight` need library-specific overrides; older `.gantt .today-highlight` rules alone are not sufficient.
- Keeping the fix in local CSS preserves the static-site architecture and stays consistent with the app's existing dark-theme variables.


## Applied guidance
- Brighten the chart container and header to align with `--bg-card` / `--bg-secondary` tones.
- Use higher-contrast text, subtle white grid lines, brighter dependency arrows, and a clearly visible today marker.
- Use more saturated phase fills so bars remain legible on dark surfaces.


---


## k-gantt-fix

# K — Gantt render fix

- **Date:** 2026-05-21T11:39:09.586+02:00
- **By:** K
- **Scope:** Planner view / Frappe Gantt integration


## Decision
- Pass only the phase class token to Frappe Gantt's `custom_class` option.
- Keep status metadata in planner data/detail UI instead of concatenating multiple CSS classes into `custom_class`.


## Why
- Frappe Gantt v1.2.2 forwards `custom_class` through `classList.add()` as a single token.
- The previous value (`phase-setup status-not-started`) threw `InvalidCharacterError`, so bars never rendered and the UI fell back to the compact list.


## Impact
- Step 5 now renders the Gantt bars and dependency arrows normally.
- Existing phase-based CSS continues to work without redesigning the planner theme.


---


## k-gantt-label-contrast

# K — Gantt label contrast

- **Date:** 2026-05-21T12:57:09.400+02:00
- **By:** K
- **Area:** Planner / Frappe Gantt labels


## Decision
Use Frappe Gantt’s overflow state (`.bar-label.big`) to split label contrast by placement in `css/style.css`.


## Why
- Frappe Gantt v1.2.2 adds `.big` when a label no longer fits inside the bar and moves it to the right of the bar.
- Those overflow labels sit on the planner’s dark navy chart background and need a light fill to stay readable.
- Labels that remain inside the pastel phase bars still read best with dark text.


## Applied guidance
- Keep `.gantt .bar-label` dark for in-bar labels.
- Make `.gantt .bar-label.big` light with a dark stroke for contrast on the dark chart surface.
- Keep the fix CSS-only and scoped to the chart theme overrides.


---


## k-gantt-planner

# K — Gantt planner delivery

- **Date:** 2026-05-20T11:37:31.376+02:00
- **Owner:** K
- **Decision:** Step 4 now keeps the existing summary/results cards and adds a tabbed planner container where the new Gantt chart is the primary view and the existing task-card planner stays available as a secondary tab.
- **Why:** This adds the requested project-plan visualization without regressing the detailed task-card workflow already shipped in `planning.js`.
- **Implementation note:** `js/gantt-planner.js` owns the shared plan transformation, and `js/modules/export.js` reuses that same data for the Excel workbook so the UI and export stay aligned.


---


## k-solution-card-styling

# K — Solution card styling alignment

**Date:** 2026-05-21T10:28:41.701+02:00  
**By:** K (Frontend Dev)


## Decision
Align Step 3 solution cards in v2 to the `value-pack-setup` reference look and feel while preserving v2-specific planner metadata, workspace-connected inclusion, and Excel/planner flows.


## Why
- madesous explicitly prefers the original solution-card hierarchy and styling.
- v2 still needs to keep effort badges, connector counts, and planner-oriented metadata that do not exist in the reference.
- The workspace-connected state is functionally different in v2, so the card visuals need to reflect that without changing planner behavior.


## Implementation notes
- Recommended solutions use the reference-style yellow card treatment with the inline `— Recommended` label and star accent instead of a floating badge.
- Featured tags reuse the existing `is1P` field, avoiding extra metadata fetches.
- Selection now uses a real checkbox input; workspace-connected solutions stay checked and locked because they are already included in the generated plan.


## Files
- `index.html`
- `css/style.css`
- `js/modules/solutions.js`


---


## k-split-pane-gantt

# K — Split-pane Gantt layout

- **Date:** 2026-05-21T14:01:17.964+02:00
- **Owner:** K
- **Decision:** Render the planner as a split-pane grid with a task table on the left and the existing Frappe Gantt timeline on the right, and align the left rows by reading the SVG `.grid-row` metrics instead of assuming a fixed row height.
- **Why:** Frappe Gantt owns the final row geometry, so a CSS-only fixed-height table drifts when the chart view mode changes, summary rows collapse, or the library adjusts spacing.
- **Implementation note:** `js/gantt-planner.js` now rebuilds the task table from the same visible row list used by the chart, synchronizes vertical scroll with `.gantt-container`, and `css/style.css` keeps the left metadata grid readable in the dark theme.


---


## k-subtask-rendering

# K — Subtask rendering in flat Gantt

- **Date:** 2026-05-21T13:25:43.387+02:00
- **Owner:** K
- **Decision:** Render connector task hierarchy in Frappe Gantt as flattened parent summary rows plus child subtask rows, and collapse/expand by re-rendering only the visible flat rows.
- **Why:** Frappe Gantt v1.2.2 has no native hierarchy support and only accepts a flat task list with a single `custom_class` token, so DOM-only hiding would desync arrows, labels, and dependency rendering.
- **Implementation note:** `js/gantt-planner.js` now remaps collapsed-child dependencies to the visible parent summary row, while `css/style.css` handles summary/subtask visual grouping.


---


## luv-solutions-audit

# Luv QA Audit — `data/solutions.json`

- **Audit date:** 2026-05-21T14:28:20.714+02:00
- **Auditor:** Luv (Tester / QA)
- **Scope:** Microsoft Sentinel data connector catalog used by Sentinel Onboarding Planner v2
- **Records audited:** 485


## Executive summary

This catalog is **not ready to be treated as a clean customer-facing connector catalog**. I found four blocker-level problems: every record is missing the required per-record `category` field; **157** entries are not connectors at all (`connectors = 0`); deprecated / superseded content is still offered; and there is at least one obvious placeholder test entry (`test-solution`).


## Scale check

| Category bucket | Count | Zero-connector entries | Notes |
|---|---:|---:|---|
| azure | 18 | 1 | Mostly first-party; one third-party product (`azure-cloud-ngfw-by-palo-alto-networks`) is mixed into the Azure bucket. |
| microsoft_365_security | 20 | 2 | Mostly Microsoft security content; one partner solution (`varonis-purview`) sits in this bucket. |
| third_party | 447 | 154 | Overloaded catch-all bucket. 189 entries are marked `is1P=true`, which is a taxonomy smell for a bucket labeled third_party. |
| **Total** | **485** | **157** | **The catalog is heavily skewed toward third_party (447/485 = 92.2%).** |


## Detailed findings

| Connector / scope | Issue type | Severity | Recommended action |
|---|---|---|---|
| **All 485 records** | Missing required field (`category`) | **Critical** | Populate an explicit per-record `category` field on every object instead of relying only on the top-level bucket. This is a schema defect, not just a presentation issue. |
| `test-solution` / **Test Solution** | Placeholder / nonsensical entry | **Critical** | Remove it from the catalog immediately. It has an empty description, zero connectors, generic auto-generated planner text, and should never be customer-facing. |
| `blink-ops` / **Blink Ops** | Missing required data (`description`) | **High** | Either populate a real description from official product documentation or remove the entry until data is complete. |
| **157 records with `connectors = 0`** | Non-connector content in a connector catalog | **Critical** | Split the catalog into **connectors** vs **content-only solutions** (training, workbooks, compliance packs, playbooks, hunting packs). Do not offer zero-connector entries in a connector selection experience. |
| `forescout-legacy` / **Forescout (Legacy)** | Explicitly legacy / superseded | **High** | Remove from new-customer recommendations and replace with the supported Forescout eyeExtend path. |
| `threat-intelligence` / **Threat Intelligence** | Legacy / near-duplicate with new schema | **High** | Prefer `threat-intelligence-new` and migrate content to the new STIX tables. Keep the legacy entry hidden or clearly marked migration-only. |
| `azure-devops-auditing` / **Azure DevOps Auditing** | Superseded ingestion method | **High** | Replace with the CCP / Log Ingestion API based Azure DevOps connector and remove the legacy HTTP Data Collector based offering from default recommendations. |
| `common-event-format` / **Common Event Format** | Ambiguous legacy + AMA bundle | **High** | Keep only the AMA path in planner guidance. Do not present the legacy agent path as a valid new deployment option. |
| `linux-syslog` / **Syslog** | Ambiguous legacy + AMA bundle | **High** | Same treatment as CEF: AMA-only for new deployments; hide legacy agent guidance. |
| `windows-security-events` / **Windows Security Events** | Ambiguous legacy + AMA bundle | **High** | Present only Windows Security Events via AMA for new deployments and treat the legacy agent path as migration-only. |
| `azure-cloud-ngfw-by-palo-alto-networks` / **Azure Cloud NGFW By Palo Alto Networks** | Category misplacement | **Medium** | Move out of the Azure first-party bucket or create a separate cloud-partner bucket. The record itself says `is1P=false`. |
| `varonis-purview` / **Varonis Purview** | Category misplacement | **Medium** | Move to a partner / third-party bucket. It currently sits inside `microsoft_365_security` even though `is1P=false`. |
| `teams`, `microsoft-business-applications`, `microsoft-power-bi`, `microsoft-project`, `common-event-format`, `linux-syslog`, `windows-security-events`, `windows-forwarded-events` | Category misplacement pattern | **Medium** | These are Microsoft or generic platform solutions, but they live in `third_party`. Rework taxonomy so customers are not told Microsoft-native content is third-party. |
| `threat-intelligence-new` / **Threat Intelligence (NEW)** | Data accuracy defect in description | **Medium** | Update the description to reference the new `ThreatIntelIndicators` and `ThreatIntelObjects` tables. The current text says “new ThreatIntelIndicator table”, which is inaccurate. |
| `teams`, `microsoft-business-applications`, `microsoft-power-bi`, `microsoft-project`, `agent-365`, `varonis-purview` | Permissions accuracy / completeness gap | **Medium** | Add applicable Microsoft 365 role prerequisites where required. These entries reference Microsoft 365 / Office Management API style dependencies but have empty `m365_roles`. |
| `azure-ddos-protection`, `azure-kubernetes-service`, `azure-sql-database-solution-for-sentinel`, `mc-afee-e-policy-orchestrator`, `v-mware-v-center`, `vm-ware-es-xi`, `git-lab`, `j-boss`, `one-login-iam`, `servicenow`, `sentinel-soa-ressentials` | Name / branding accuracy | **Medium** | Normalize product names to current Microsoft/vendor branding and fix casing / spacing / spelling defects. |
| Catalog-wide duplicate scan | Exact duplicates | **Low** | No exact duplicate IDs or exact duplicate names found. Keep an automated duplicate check in CI anyway. |
| `threat-intelligence`, `threat-intelligence-new`, `threat-intelligence-solution-for-azure-government` | Near-duplicate family | **Medium** | Clarify which entry is current, which is migration-only, and which is Azure Government specific. Current naming is easy to misinterpret in the planner UI. |
| Catalog-wide RBAC review | Role name validity | **Low** | No obviously invalid Azure / M365 role names found. Keep the current role dictionary, but reduce overuse of broad roles like `Contributor` and `Global Administrator` in customer guidance where least privilege is possible. |


## Notable connector-level evidence

### 1) Placeholder / invalid catalog entries

| Connector | Why this is a problem | Recommended action |
|---|---|---|
| `test-solution` / Test Solution | Empty description, zero connectors, generic auto-generated setup tasks, clearly non-production content. | Remove immediately. |
| `blink-ops` / Blink Ops | Empty description; unusable in a customer-facing planner. | Populate or remove. |
| `kql-training` / KQL Training | Training pack, not a data connector. | Exclude from connector picker. |
| `soc-handbook` / SOC Handbook | Handbook/resource pack, not a data connector. | Exclude from connector picker. |
| `watchlists-utilities` / Watchlists Utilities | Utility playbooks, not a data connector. | Exclude from connector picker. |
| `azure-security-benchmark` / Azure Security Benchmark | Workbook/content solution only (`connectors = 0`). | Exclude from connector picker or move to governance/content catalog. |
| `teams` / Teams | Depends on the Microsoft 365 connector instead of being a standalone connector. | Model as dependent content, not a primary connector. |
| `servicenow` / Servicenow | Incident sync/content solution, not a data connector in this file (`connectors = 0`). | Move to automation/integration catalog. |

### 2) Deprecated / superseded content that should not be offered as “new deployment” guidance

Official Microsoft guidance used for this review:
- AMA migration / MMA retirement: <https://learn.microsoft.com/en-us/azure/sentinel/ama-migrate>
- Syslog / CEF via AMA guidance: <https://learn.microsoft.com/en-us/azure/sentinel/data-connectors-reference>
- Deprecated solution lifecycle: <https://learn.microsoft.com/en-us/azure/sentinel/sentinel-solution-deprecation>
- Threat intelligence schema migration: <https://learn.microsoft.com/en-us/azure/sentinel/work-with-stix-objects-indicators>

| Connector | Evidence | Recommended action |
|---|---|---|
| `forescout-legacy` / Forescout (Legacy) | Description explicitly says “This is a legacy solution” and recommends the Forescout eyeExtend solution instead. | Remove from default recommendations. |
| `common-event-format` / Common Event Format | Description bundles AMA plus legacy connector language; Microsoft guidance is AMA-first and MMA is retired. | Reword as AMA-only or split legacy out entirely. |
| `linux-syslog` / Syslog | Same pattern as CEF; still references the legacy Linux agent path. | Reword as AMA-only or split legacy out entirely. |
| `windows-security-events` / Windows Security Events | Still carries legacy-agent context even though Microsoft recommends the AMA connector. | Hide legacy path in planner. |
| `threat-intelligence` / Threat Intelligence | Legacy entry coexists with `Threat Intelligence (NEW)`; Microsoft is retiring ingestion to the legacy table. | Default to NEW and treat old entry as migration-only. |
| `azure-devops-auditing` / Azure DevOps Auditing | Description itself recommends Azure DevOps Audit Logs (Preview) via CCP / Log Ingestion API. | Replace default record with the newer connector. |

### 3) Legacy-agent warning cohort

The following **79** records contain explicit legacy-agent / MMA retirement language in their metadata and should not be presented as clean net-new onboarding choices without additional filtering or rewriting:

`blackberry-cylance-protect, broadcom-symantec-dlp, ivanti-unified-endpoint-management, mc-afee-e-policy-orchestrator, symantec-endpoint-protection, trend-micro-deep-security, arista-awake-security, barracuda-cloud-gen-firewall, barracuda-waf, cisco-aci, cisco-ise, cisco-secure-cloud-analytics, cisco-wsa, citrix-adc, citrix-web-app-firewall, fire-eye-network-security, forcepoint-ngfw, fortinet-forti-gate-next-generation-firewall-connector-for-microsoft-sentinel, fortinet-forti-web-cloud-waf-as-a-service-connector-for-microsoft-sentinel, iboss, infoblox-nios, isc-bind, juniper-idp, juniper-srx, mc-afee-network-security-platform, nginx-http-server, nozomi-networks, open-vpn, security-bridge-app, sonic-wall-firewall, sophos, squid-proxy, symantec-proxy-sg, symantec-vip, ubiquiti-uni-fi, vectra-ai-stream, watchguard-firebox, windows-firewall, windows-server-dns, wire-x-network-forensics-platform, zscaler-private-access-zpa, forcepoint-casb, forcepoint-csg, vectra-ai-detect, cyber-ark-privilege-access-manager-pam-events, forge-rock-common-audit-for-cef, ping-federate, rsa-secur-id, trend-micro-tipping-point, exabeam-advanced-analytics, mark-logic-audit, tomcat, infoblox-cloud-data-connector, votiro, apache-http-server, cisco-ucs, claroty, common-event-format, digital-guardian-data-loss-prevention, esetprotect, git-lab, illumio-core, j-boss, microsoft-sysmon-for-linux, mongo-db-audit, nasuni, netwrix-auditor, onapsis-platform, oracle-database-audit, oracle-web-logic-server, ossec, postgre-sql, pulse-connect-secure, ridge-security, linux-syslog, v-mware-v-center, vm-ware-es-xi, windows-security-events, with-secure-elements-via-connector`

### 4) Explicit deprecated / legacy markers in metadata

The following **104** records contain `deprecated` and/or `legacy` markers somewhere in their record payload and require manual review before being shown to customers:

`blackberry-cylance-protect, broadcom-symantec-dlp, ivanti-unified-endpoint-management, mc-afee-e-policy-orchestrator, symantec-endpoint-protection, trend-micro-deep-security, ai-analyst-darktrace, arista-awake-security, barracuda-cloud-gen-firewall, barracuda-waf, cisco-aci, cisco-firepower-e-streamer, cisco-ise, cisco-secure-cloud-analytics, cisco-wsa, citrix-adc, citrix-web-app-firewall, cloudflare, cloudflare-ccf, f5-networks, fire-eye-network-security, forcepoint-ngfw, forescout-legacy, fortinet-forti-gate-next-generation-firewall-connector-for-microsoft-sentinel, fortinet-forti-web-cloud-waf-as-a-service-connector-for-microsoft-sentinel, iboss, illusive-platform, infoblox-nios, isc-bind, juniper-idp, juniper-srx, mc-afee-network-security-platform, mimecast-audit, mimecast-seg, mimecast-ti-regional, mimecast-ttp, nginx-http-server, nozomi-networks, open-vpn, security-bridge-app, sonic-wall-firewall, sophos, squid-proxy, symantec-proxy-sg, symantec-vip, ubiquiti-uni-fi, v-armour-application-controller, vectra-ai-stream, watchguard-firebox, windows-firewall, windows-server-dns, wire-x-network-forensics-platform, zscaler-private-access-zpa, akamai-security-events, extra-hop-reveal-x, forcepoint-casb, forcepoint-csg, palo-alto-cdl, vectra-ai-detect, cyber-ark-privilege-access-manager-pam-events, delinea-secret-server, forge-rock-common-audit-for-cef, ping-federate, rsa-secur-id, trend-micro-tipping-point, cisco-seg, exabeam-advanced-analytics, mark-logic-audit, tomcat, check-point-cyberint-alerts, infoblox-cloud-data-connector, infoblox-soc-insights, votiro, apache-http-server, aruba-clear-pass, azure-devops-auditing, cisco-ucs, claroty, common-event-format, contrast-protect, digital-guardian-data-loss-prevention, esetprotect, git-lab, illumio-core, j-boss, legacy-ioc-based-threat-protection, lookout, microsoft-sysmon-for-linux, mongo-db-audit, nasuni, netwrix-auditor, onapsis-platform, oracle-database-audit, oracle-web-logic-server, ossec, postgre-sql, pulse-connect-secure, ridge-security, linux-syslog, trend-micro-apex-one, v-mware-v-center, vm-ware-es-xi, windows-security-events, with-secure-elements-via-connector`

### 5) Zero-connector entries mixed into the connector catalog

These **157** records have `connectors = 0` and should not be surfaced in a connector-selection workflow:

`azure-security-benchmark, microsoft-defender-threat-intelligence, global-secure-access, blackberry-cylance-protect, broadcom-symantec-dlp, endpoint-threat-protection-essentials, falcon-friday, ivanti-unified-endpoint-management, mc-afee-e-policy-orchestrator, symantec-endpoint-protection, trend-micro-deep-security, arista-awake-security, barracuda-cloud-gen-firewall, checkpoint, cisco-aci, cisco-ise, cisco-secure-cloud-analytics, cisco-wsa, citrix-adc, citrix-web-app-firewall, dns-essentials, endace, fire-eye-network-security, forcepoint-ngfw, fortinet-forti-gate-next-generation-firewall-connector-for-microsoft-sentinel, infoblox-nios, isc-bind, juniper-idp, juniper-srx, mc-afee-network-security-platform, network-session-essentials, network-threat-protection-essentials, nginx-http-server, nozomi-networks, open-vpn, slash-next-siem, sonic-wall-firewall, sophos, squid-proxy, symantec-proxy-sg, symantec-vip, ubiquiti-uni-fi, web-session-essentials, zscaler-private-access-zpa, acronis-cyber-protect-cloud, akamai-security-events, aws-athena, aws-iam, aws-systems-manager, censys, cloud-identity-threat-protection-essentials, cloud-service-threat-protection-essentials, forcepoint-casb, forcepoint-csg, google-cloud-platform-big-query, google-directory, palo-alto-cdl, vectra-ai-detect, cyber-ark-privilege-access-manager-pam-events, entrust-identity-as-service, ping-federate, rsa-secur-id, trend-micro-tipping-point, business-email-compromise-financial-fraud, cisco-seg, elastic-search, exabeam-advanced-analytics, mark-logic-audit, tomcat, abuse-ipdb, australian-cyber-security-centre, check-phish-by-bolster, cyren-crowd-strike-threat-intelligence, cyren-sentinel-one-threat-intelligence, domain-tools, eclectic-iq, google-threat-intelligence, hyas, infoblox-cloud-data-connector, ip-quality-score, joshua-cyberiskvision, minemeld, ncsc-nl-ndn-cyber-threat-intelligence-sharing, recorded-future, recorded-future-identity, reversing-labs, service-now-tisc, shadow-byte-aria, soc-radar, spur, spy-cloud-enterprise-protection, tacit-red-defender-threat-intelligence, tacit-red-ioc-crowd-strike, tacit-red-sentinel-one, threat-connect, ur-lhaus, vaikora-crowd-strike-threat-intelligence, vaikora-sentinel-one-threat-intelligence, virus-total, zinc-open-source, apache-http-server, apache-log4j-vulnerability-detection, aruba-clear-pass, attacker-tools-threat-protection-essentials, blink-ops, cisco-ucs, claroty, continuous-diagnostics-mitigation, cybersecurity-maturity-model-certification-cmmc-2-0, cyware, dev-0270-detection-and-hunting, dev-0537-detectionand-hunting, digital-guardian-data-loss-prevention, dora-compliance, dpdp-compliance, eaton-foreseer, gdpr-compliance-data-security, git-lab, hipaa-compliance, illumio-core, intel471, j-boss, kql-training, legacy-ioc-based-threat-protection, malware-protection-essentials, microsoft-windows-sql-server-database-audit, mongo-db-audit, multi-cloud-attack-coverage-essentials-resource-abuse, nasuni, net-app-ransomware-resilience, netwrix-auditor, oracle-database-audit, oracle-web-logic-server, ossec, pci-dss-compliance, postgre-sql, pulse-connect-secure, pure-storage, salem-cyber, security-threat-essential-solution, sentinel-soa-ressentials, servicenow, shodan, soc-handbook, sox-it-compliance, teams, test-solution, torq, trend-micro-apex-one, ueba-essentials, v-mware-v-center, vaikora-security-center, veeam, veritas-net-backup, vm-ware-es-xi, watchlists-utilities, web-shells-threat-protection`

### 6) Category misplacement examples

| Connector | Current bucket | Why it looks wrong | Recommended action |
|---|---|---|---|
| `azure-cloud-ngfw-by-palo-alto-networks` / Azure Cloud NGFW By Palo Alto Networks | `azure` | Bucket says Azure first-party, but the record is a Palo Alto product and `is1P=false`. | Re-bucket or add a separate Microsoft / platform category. |
| `varonis-purview` / Varonis Purview | `microsoft_365_security` | Partner solution placed in a Microsoft 365 security bucket. | Re-bucket or add a separate Microsoft / platform category. |
| `common-event-format` / Common Event Format | `third_party` | Generic Microsoft ingestion capability, not a third-party product. | Re-bucket or add a separate Microsoft / platform category. |
| `linux-syslog` / Syslog | `third_party` | Generic Microsoft ingestion capability, not a third-party product. | Re-bucket or add a separate Microsoft / platform category. |
| `windows-security-events` / Windows Security Events | `third_party` | Microsoft-native ingestion path, not third-party. | Re-bucket or add a separate Microsoft / platform category. |
| `windows-forwarded-events` / Windows Forwarded Events | `third_party` | Microsoft-native ingestion path, not third-party. | Re-bucket or add a separate Microsoft / platform category. |
| `teams` / Teams | `third_party` | Microsoft 365 workload content is being labeled third-party. | Re-bucket or add a separate Microsoft / platform category. |
| `microsoft-business-applications` / Microsoft Business Applications | `third_party` | Microsoft first-party content is being labeled third-party. | Re-bucket or add a separate Microsoft / platform category. |
| `microsoft-power-bi` / Microsoft Power BI | `third_party` | Microsoft first-party content is being labeled third-party. | Re-bucket or add a separate Microsoft / platform category. |
| `microsoft-project` / Microsoft Project | `third_party` | Microsoft first-party content is being labeled third-party. | Re-bucket or add a separate Microsoft / platform category. |
| `azure-devops-auditing` / Azure DevOps Auditing | `third_party` | Microsoft first-party workload labeled third-party. | Re-bucket or add a separate Microsoft / platform category. |
| `microsoft-sysmon-for-linux` / Microsoft Sysmon For Linux | `third_party` | Microsoft-authored/generic solution labeled third-party. | Re-bucket or add a separate Microsoft / platform category. |
| `microsoft-windows-sql-server-database-audit` / Microsoft Windows SQL Server Database Audit | `third_party` | Microsoft product labeled third-party. | Re-bucket or add a separate Microsoft / platform category. |


### 7) Name / branding defects

| Connector | Finding | Recommended action |
|---|---|---|
| `azure-ddos-protection` / Azure D Do S Protection | Name rendered as "Azure D Do S Protection" instead of Azure DDoS Protection. | Align display name with current Microsoft/vendor branding. |
| `azure-kubernetes-service` / Azure kubernetes Service | Name rendered as "Azure kubernetes Service" instead of Azure Kubernetes Service / AKS. | Align display name with current Microsoft/vendor branding. |
| `azure-sql-database-solution-for-sentinel` / Azure SQL Database solution for sentinel | Name rendered as "Azure SQL Database solution for sentinel" with incorrect casing. | Align display name with current Microsoft/vendor branding. |
| `mc-afee-e-policy-orchestrator` / Mc Afee e Policy Orchestrator | Vendor/product spelling should be McAfee ePolicy Orchestrator. | Align display name with current Microsoft/vendor branding. |
| `v-mware-v-center` / V Mware v Center | Product name should be VMware vCenter. | Align display name with current Microsoft/vendor branding. |
| `vm-ware-es-xi` / VM Ware ES Xi | Product name should be VMware ESXi. | Align display name with current Microsoft/vendor branding. |
| `git-lab` / Git Lab | Product name should be GitLab. | Align display name with current Microsoft/vendor branding. |
| `j-boss` / J Boss | Product name should be JBoss. | Align display name with current Microsoft/vendor branding. |
| `one-login-iam` / One Login IAM | Product name should be OneLogin IAM. | Align display name with current Microsoft/vendor branding. |
| `servicenow` / Servicenow | Product name should be ServiceNow. | Align display name with current Microsoft/vendor branding. |
| `sentinel-soa-ressentials` / Sentinel SOA Ressentials | Contains typo: "Ressentials". | Align display name with current Microsoft/vendor branding. |


### 8) Permissions / RBAC review

Observed Azure roles: `Azure Connected Machine Resource Administrator, Contributor, Microsoft Sentinel Contributor, Monitoring Contributor, Virtual Machine Contributor`  
Observed M365 roles: `Compliance Administrator, Exchange Administrator, Global Administrator, Security Administrator`

**Result:** I did **not** find obviously fake Azure or Microsoft 365 role names. The issue is **completeness and least privilege**, not invalid role labels.

Entries that look under-specified for M365 permissions: `teams, microsoft-business-applications, microsoft-power-bi, microsoft-project, agent-365, varonis-purview`.


## Recommended next actions

1. **Blocker fix:** add per-record `category` to every object.
2. **Blocker fix:** remove `test-solution` and other zero-connector/non-customer entries from the planner catalog.
3. **Blocker fix:** filter or rewrite legacy / deprecated solutions so the planner only recommends supported onboarding paths.
4. **Taxonomy fix:** separate Microsoft platform content, third-party vendor content, and content-only packs.
5. **Data hygiene fix:** normalize product names and patch empty descriptions.
6. **Permissions fix:** add missing `m365_roles` where workload onboarding actually depends on Microsoft 365 permissions.


## QA verdict

**REJECT** for customer-facing use in its current state. The file needs schema cleanup, deprecation filtering, taxonomy cleanup, and removal of non-connector / placeholder content before it can be trusted as the onboarding planner’s source of truth.


---


## sebastian-connector-docs

# Sebastian — connector reference documentation pattern

- **Date:** 2026-05-20T11:08:20.769+02:00
- **By:** Sebastian (Data Engineer)
- **Status:** Proposed for merge


## What changed
Added a new `docs/connectors/` reference set for complex onboarding paths and seeded it with three customer-facing guides:

1. `ama-setup-guide.md`
2. `syslog-forwarding-guide.md`
3. `azure-monitor-pipeline-guide.md`


## Why
The planner can recommend high-value connectors, but customers still need clear implementation references for infrastructure-heavy patterns such as AMA, Syslog forwarding, and pipeline-based ingestion. Splitting the content by architecture keeps the catalog and future onboarding metadata simpler.


## Implementation notes
- The AMA guide is the base pattern for agent + DCR + workspace setup.
- The Syslog guide extends the AMA pattern for Linux forwarders and appliance-style sources.
- The pipeline guide is positioned as the scale / transformation / resiliency path once direct AMA or single forwarders become limiting.
- Cross-links were added so future connector docs can reuse the same base-vs-extension structure.


---


## sebastian-data-cleanup

# Sebastian — Data cleanup schema signals

- **Date:** 2026-05-21T15:10:22.804+02:00
- **By:** Sebastian
- **Scope:** `data/solutions.json`


## Decision
Use explicit record-level flags for connector catalog hygiene instead of relying on bucket placement or deleting non-connector content.


## What changed
- Added `category` to every solution record so each entry is self-describing.
- Added `is_connector` to every solution record; connector-bearing entries are `true`, zero-connector catalog entries are `false`.
- Added `deprecated: true` for known legacy/superseded connectors that should not be offered for new deployments.
- Added `ama_only: true` for connectors that remain valid but should steer users to the AMA deployment path.
- Removed the placeholder `test-solution` entry.


## Why
The QA audit showed that the connector picker was mixing real data connectors with workbooks, playbooks, training packs, and legacy placeholders. The planner also needed machine-readable signals for deprecated content and AMA-only deployment guidance.


## Impact
- UI filtering should use `is_connector` for connector selection.
- New-deployment recommendations should suppress `deprecated` entries.
- Planner/deployment guidance should prefer AMA-specific steps when `ama_only` is present.


---


## sebastian-full-catalog-expansion

# Sebastian — Full catalog expansion

- **Date:** 2026-05-20T11:11:08.611+02:00
- **By:** Sebastian
- **Requested by:** Maria (madesous)


## Decision
Adopt a 12-category Sentinel content hub taxonomy in `data/solutions.json` and treat connector-bearing Azure-Sentinel solution metadata as the source of truth for catalog expansion.


## Category structure
1. `azure_first_party`
2. `microsoft_xdr`
3. `microsoft_365`
4. `identity_and_access`
5. `cloud_infrastructure`
6. `network_security`
7. `endpoint_security`
8. `siem_and_logging`
9. `saas_applications`
10. `threat_intelligence`
11. `compliance_and_governance`
12. `custom_and_codeless`


## Why
- The previous 3-bucket model (`azure_first_party`, `microsoft_logs`, `third_party`) was too coarse for a 300+ solution catalog.
- The planner needs category-aware scoring, onboarding, permission guidance, and export grouping that match real deployment patterns.
- Separating Microsoft-native, identity, cloud, network, endpoint, SaaS, threat intel, compliance, and custom ingestion content makes the recommendation engine and UI materially easier to reason about.


## Implementation notes
- Preserve the original seeded IDs for the existing 35 solutions.
- Derive content counts from Azure-Sentinel `Data/Solution_*.json` metadata for connector-bearing solutions.
- Keep `priority_score` formula and phase thresholds deterministic:
  - `priority_score = round(0.40*business_impact + 0.20*complexity_inverse + 0.15*setup_time_inverse + 0.15*detection_coverage + 0.10*maturity)`
  - Phase 1 `<=25h`, Phase 2 `26-50h`, Phase 3 `>50h`
- Reuse archetype templates for planner/onboarding/permissions so large-scale expansion stays consistent.


---


## sebastian-onboarding-permissions

# Sebastian — onboarding and permissions schema

- **Date:** 2026-05-20T10:56:54.127+02:00
- **By:** Sebastian (Data Engineer)
- **Status:** Proposed for merge


## What changed
Added two append-only top-level metadata blocks to every solution in `data/solutions.json`:

1. **`onboarding`**
   - `difficulty`
   - `difficulty_score`
   - `setup_summary`
   - `estimated_clicks`
   - `infrastructure_required`
   - `notes`
2. **`permissions`**
   - `azure_roles`
   - `m365_roles`
   - `resource_permissions`
   - `third_party_admin`
   - `consent_required`
   - `privilege_level`
   - `notes`


## Why
The planner needed a realistic way to separate connector value from connector friction. These fields make onboarding effort and permission blast radius explicit without changing the existing scoring, planner, or export contracts.


## Implementation notes
- Schema is append-only and backward compatible.
- Difficulty uses the approved 1-3 scale (`easy`, `moderate`, `hard`).
- Permission modeling separates Azure RBAC, M365 roles, resource-scoped rights, third-party admin dependency, and consent burden so future scoring can weight them independently.
- Validation expectation: every solution must carry both objects after enrichment.


---


## sebastian-rbac-model

# RBAC Data Model Decision — Approach B Recommended

**Date:** 2026-05-21T14:04:30.678+02:00  
**By:** Sebastian (Data Engineer)  
**Status:** RECOMMENDATION (awaiting Deckard confirmation)  

---


## Decision Point

How should RBAC / permissions tasks be modeled in the Sentinel Onboarding Planner when users select multiple connectors that share identical RBAC requirements?

**Problem:** When selecting 5+ connectors, many require the same Azure roles (e.g., "Log Analytics Contributor") or M365 roles (e.g., "Security Reader"). Currently, `permissions` metadata is read-only display. The planner should deduplicate RBAC work and show it as actionable tasks in the Gantt timeline.

---


## Two Approaches Analyzed

### Approach A: Single Grouped Task
- RBAC appears as one entry in the Gantt, listing all connectors it covers
- Cleaner Gantt, less visual noise
- Requires new `rbac_tasks` array and connector-list rendering
- **Status:** Deferred as fallback

### Approach B: Per-Connector Subtask with Shared Indicator ✓ **RECOMMENDED**
- RBAC becomes a subtask under each connector's existing task hierarchy (e.g., first subtask of `prepare-collection-host`)
- Shared RBAC marked `status: "shared"` with 0h effort and note like "Already assigned for Connector X"
- Extends existing subtask pattern (proven by Windows Security Events)
- Minimal data model change: add `permissions.fingerprint`, include RBAC subtask in `setup_tasks[]`
- Self-contained per-connector view; clear semantics for deduplication
- Better Excel export grouping

---


## Recommendation: Approach B

### Why Approach B wins:

1. **Backward compatible** — Extends existing subtask patterns; no new top-level `rbac_tasks` array
2. **Minimal data model change** — Only add `permissions.id`, `permissions.fingerprint`, and optional RBAC subtask to `setup_tasks[].subtasks[]`
3. **Self-contained connectors** — Each connector's task tree is complete; users understand what they need to do without cross-referencing a separate RBAC section
4. **Clear deduplication** — RBAC marked `status: "shared"` with explicit reference to the connector where it was already done
5. **Proven pattern** — Windows Security Events already uses nested subtasks with dependencies; reusing the same pattern reduces risk
6. **Better exports** — RBAC rows naturally group under each connector in Excel

### Implementation roadmap:

1. **data/solutions.json enrichment**
   - Add `permissions.id` and `permissions.fingerprint` (SHA256 hash of sorted `azure_roles + m365_roles`) to all 342 solutions
   - For solutions with explicit RBAC requirements, add RBAC subtask to `setup_tasks[].subtasks[0]` (before other steps):
     ```json
     {
       "id": "rbac-windows-security-events",
       "order": 0,
       "task": "Assign required roles: Virtual Machine Contributor...",
       "effort_hours": 0.5,
       "status": "pending"
     }
     ```

2. **js/planning.js deduplication**
   - At render time, scan all selected connectors' `permissions.fingerprint` values
   - For any duplicate fingerprints, mark all instances after the first as `status: "shared"`
   - Set `shared_by_connector: "first-connector-id"` reference

3. **js/export.js effort calculation**
   - Skip 0h shared RBAC subtasks when computing total planner effort

4. **Gantt rendering**
   - Optional: implement collapsible/filterable sections to hide "Already done" rows if Gantt becomes too noisy with 10+ connectors

---


## Scalability Check (5–10 connectors)

**Scenario:** User selects Windows Security Events, Azure Activity, Defender XDR, Entra ID, custom CEF appliance, third-party API connector (6 connectors)

**RBAC overlap:**
- Sentinel Contributor: needed by 4 connectors → 1 subtask (0.5h) + 3 subtasks (0h shared)
- VM Contributor (Azure): needed by Windows Security → 1 subtask (0.5h)
- M365 Security Reader: needed by 2 connectors → 1 subtask (1h) + 1 subtask (0h shared)
- API key setup (third-party): 1 subtask (0.5h)

**Gantt impact:** +5–8 RBAC subtask rows. Manageable with collapsible UI or filter.

**Total deduped effort:** 0.5 + 0.5 + 1 + 0.5 = 2.5h actual work (vs. 3.5h if all listed separately)

---


## Open Questions

1. **RBAC subtask order** — Should RBAC always be first subtask (order 0), or depend on connector type? (Recommendation: always first for clarity.)
2. **Excel export** — Separate "RBAC Summary" sheet, or per-connector grouping sufficient? (Deferred to K; Approach B supports both.)
3. **M365 + Azure mix** — If a connector needs both Azure roles (for workspace) and M365 roles (for API), should they be separate subtasks? (Recommendation: separate; different approval chains.)

---


## Files to be Modified

- `data/solutions.json` — Add fingerprint, RBAC subtasks, references
- `js/planning.js` — Implement deduplication logic at render time
- `js/export.js` — Skip shared RBAC from effort rollup
- `docs/connectors/ama-setup-guide.md` — Document RBAC subtask placement

---


## Next Steps

1. **Deckard:** Confirm Approach B recommendation or request changes
2. **Sebastian:** Implement data model changes (fingerprint, RBAC subtasks) in data/solutions.json for high-priority solutions first (Windows Security Events, Defender XDR, Azure Activity, Entra ID)
3. **K:** Implement deduplication logic in js/planning.js; test with 5–10 connectors
4. **Luv:** Add test coverage for RBAC fingerprint matching and shared-task marking

---


## Decision Links

- **Comparison document:** `docs/research/rbac-model-comparison.md`
- **Data model history:** `.squad/agents/sebastian/history.md` (2026-05-21 entry)


---


## sebastian-task-hierarchy

# Sebastian — task hierarchy pattern for connector planner

- **Date:** 2026-05-21T12:55:34.261+02:00
- **By:** Sebastian (Data Engineer)
- **Status:** Proposed for merge


## Research findings

I reviewed how mainstream project planning tools handle parent tasks and subtasks in timeline or Gantt-style views.

| Tool | Hierarchy model | Data pattern | Gantt / timeline behavior | Collapse | Dependencies | Rollup behavior |
| --- | --- | --- | --- | --- | --- | --- |
| monday.com | Parent item -> subitem, effectively 2 levels for most boards | Parent-child records keyed by item relationship | Subitems can appear under parent rows in Gantt-style views | Yes | Yes | Partial; some rollup behavior depends on plan / view capabilities |
| Asana | Task -> subtask, but timeline stays mostly flat | Task records with subtask relationship | Subtasks only appear if added to the project; they render like normal tasks, not nested summary rows | No | Yes, when both items are present | No automatic parent rollup |
| Jira Advanced Roadmaps | Multi-level hierarchy (for example Initiative -> Epic -> Story -> Sub-task) | Flat issues with parent / parent-link references | Hierarchy is indented in roadmap-style views; parent rows summarize child schedules | Yes | Yes | Yes, parent timing rolls up from children |
| Microsoft Project | Multi-level WBS | Flat task list with outline / indent relationship | Subtasks are indented and parents render as summary bars | Yes | Yes | Yes, parent duration spans earliest child start to latest child finish |
| Smartsheet | Multi-level parent / child rows | Flat rows with indent hierarchy | Child rows appear indented; parent row behaves like a summary bar | Yes | Yes on child rows | Yes, parent dates and duration roll up from children |


## Pattern that fits connector deployment planning

For a connector deployment plan such as **Deploy Windows Security Events (AMA)**, the best fit is:

1. **Two levels only** for now: `main task -> subtasks`.
   - This matches monday.com summary rows, Microsoft Project summary tasks, and Smartsheet parent rows.
   - It is simpler than full multi-level WBS and is enough for connector rollout work.
   - Asana is the least useful model here because its timeline treats subtasks as a flat list without summary behavior.
2. **Keep the stored data readable and backward-compatible** by preserving `planner.setup_tasks` as the top-level array.
3. **Add nested `subtasks` plus IDs and dependency links** inside each main task.
   - Nested subtasks make the JSON easy to author.
   - IDs + `depends_on` make future flattening, dependency rendering, or Excel expansion straightforward.
4. **Treat each top-level task as a summary task**.
   - `effort_hours` on the parent is the rollup of its subtasks.
   - Subtasks carry the actual step-by-step sequence.
5. **Support optional branches explicitly**.
   - Scale-out for load balancing should be marked `optional: true` instead of inflating the default path invisibly.


## Proposed data structure

```json
"planner": {
  "setup_tasks": [
    {
      "id": "deploy-ama-and-dcr",
      "order": 3,
      "task": "Configure permissions, install AMA, and deploy the Windows Security Events Data Collection Rule.",
      "effort_hours": 7,
      "skill_level": "advanced",
      "phase": "Deployment",
      "depends_on": ["establish-management-path"],
      "rollup_method": "sum_subtasks",
      "subtasks": [
        {
          "id": "configure-permissions",
          "order": 1,
          "task": "Assign required roles.",
          "effort_hours": 2,
          "depends_on": ["verify-arc-connectivity"]
        },
        {
          "id": "install-ama",
          "order": 2,
          "task": "Install Azure Monitor Agent.",
          "effort_hours": 2,
          "depends_on": ["configure-permissions"]
        },
        {
          "id": "deploy-dcr",
          "order": 3,
          "task": "Create and associate the DCR.",
          "effort_hours": 3,
          "depends_on": ["install-ama"]
        }
      ]
    }
  ]
}
```


## Compatibility decision

This is **Option A**.

- No current JS change is required for baseline compatibility because `js/gantt-planner.js` still reads `solution.planner.setup_tasks[].task`.
- The current planner will show the high-level parent tasks, which now read cleanly as summary phases.
- If K later wants nested display, the UI can render `subtasks` as a second indented list and optionally use `depends_on`, `phase`, and `optional` for richer Gantt behavior.


## Windows Security Events implementation notes

The `windows-security-events` planner now follows the deployment path from `docs/connectors/ama-setup-guide.md`:

1. Set up the Windows VM / pilot host.
2. Install Azure Arc for non-Azure machines.
3. Configure permissions.
4. Install Azure Monitor Agent.
5. Deploy the Data Collection Rule.
6. Validate heartbeat and ingestion.
7. Optionally scale out with additional machines for load balancing.

All parent and child effort values use clean numbers only (`1`, `2`, `3`, `4`, `7`).




## copilot-directive-20260521T195100

### 2026-05-21T19:51:00Z: User directive
**By:** madesous (via Copilot)
**What:** 3rd-party connectors (e.g., AWS S3) have their own permission requirements outside Azure RBAC. These will be detailed separately in documentation — don't try to normalize them into Azure roles.
**Why:** User request — captured for team memory

---


## copilot-directive-20260521T211739

### 2026-05-21T21:17:39Z: User directive
**By:** madesous (via Copilot)
**What:** Remove permissions entirely from solutions that have multiple connectors (connectors > 1). Keep permissions on single-connector solutions, including 3rd-party ones.
**Why:** User request — multi-connector solutions have complex per-connector permissions that are better handled in docs, not in the planner UI.

---


## deckard-environment-sizing

# Environment Sizing Step — Planner Requirement
**Date:** 2026-05-22T09:58:20.662+02:00  
**Author:** Deckard (Lead)  
**Status:** PROPOSAL  
**Impact:** Step 2 (Environment) UX, Step 5 (Planner) duration scaling, connector task metadata  

---

## WhatThe Sentinel Onboarding Planner v2 shall add a **new Environment Sizing feature** that captures infrastructure characteristics before generating the onboarding plan. This enables:
1. **Task visibility control:** Conditional task inclusion based on environment (e.g., skip Azure Arc onboarding if all machines are native Azure).
2. **Duration scaling:** Smart baseline durations per connector category (Small/Medium/Large environment).
3. **User override:** All synthesized durations remain editable in the planner; sizing provides defaults only.

---

## k-dead-code-cleanup

### 2026-05-22T08:58:52.187+02:00: K — Dead code cleanup
**Decision:** Remove only dead UI code paths that have no live references, but preserve shared styling primitives even when they sit beside dead blocks.
**Why:** \js/modules/planning.js\ still uses \.stat-card\, \.stat-number\, and \.stat-label\, while the older Step 4 result renderers, placeholder planner selectors, and legacy \.btn-*\ system are no longer part of the runtime.
**Impact:** Future cleanup passes should treat shared style primitives separately from adjacent dead sections and continue verifying runtime reachability with repo-wide searches before deletion.

---


## k-gantt-bar-fix

### 2026-05-21T18:48:33.616+02:00: K — Gantt bar visibility fix
**By:** K (Frontend Dev)
**Scope:** \js/gantt-planner.js\, \css/style.css\
**Decision:** On Step 5, auto-position the timeline to the first actual task bar after Frappe finishes laying out the SVG, and keep the left task table single-line by moving meta/description detail into the row tooltip instead of rendering stacked secondary copy.
**Why:** The redesigned daily timeline started before the first scheduled task, so the chart could open on an empty date range even though bars existed further right.

---


## k-gantt-bars-fix

### 2026-05-22T08:49:22.034+02:00: K — Gantt labels and inline duration editing
**By:** K (Frontend Dev)
**Scope:** \js/gantt-planner.js\, \css/style.css\, \README.md\
**Decision:** Keep the left planner grid as the fast-edit surface for duration changes, while the existing detail panel remains the richer editor for start week and full task context.
**Impact:** Future Step 5 UX work should keep quick timing edits in the grid when possible, and reserve the detail panel for richer task metadata or multi-field schedule changes.

---


## k-gantt-reference-dark-layout

### 2026-05-21T18:19:29.109+02:00: K — Gantt reference dark layout
**By:** K (Frontend Dev)
**Scope:** Step 5 Gantt planner
**Decision:** Keep the planner inside the approved dark application shell, but restyle the Step 5 Gantt into a denser PM-grid pattern instead of a light-themed island.
**Impact:** Future Step 5 UI work should treat the Gantt as a dark "project management grid" pattern, not as a generic neon chart or a separate light-themed surface.

---


## k-solutions-permissions-fix

### 2026-05-21T18:38:14.725+02:00: K — Solutions permissions fix
**By:** K
**Scope:** \js/modules/solutions.js\, \css/style.css\, \data/solutions.json\, \js/gantt-planner.js\
**Decision:** Use actual connector role data in the Step 3 solution cards instead of the previous owner-style badge, and normalize the catalog so Azure-native connectors, agent/forwarder connectors, and Microsoft 365 connectors expose recognizable minimum roles.
**Impact:** Showing role chips directly from \permissions\ keeps the UI aligned with planner/export data and avoids a second, inconsistent permission vocabulary.

---


## luv-qa-pass2

### 2026-05-21T17:00:59.261+02:00: Luv QA Pass 2
**Verdict:** REJECT
**Date:** 2026-05-21T17:00:59.261+02:00
**Summary:** Validation pass covering Gantt chart structure, localStorage persistence, and solutions.json catalog. Identified 3 high-severity issues: (1) Start-week-only edits collapse duration to 0.5h, (2) Planner includes non-connectors, (3) RBAC fingerprint deduplication not implemented.

---


## sebastian-permissions-multi-connector

### 2026-05-21T21:17:39Z: Sebastian — multi-connector permissions normalization
**By:** Sebastian
**Scope:** \data/solutions.json\
**Decision:** Use the integer \connectors\ field as the sole rule for permissions retention: \connectors > 1\ → set \permissions\ to empty object \{}\; \connectors <= 1\ → preserve existing permissions unchanged.
**Why:** Multi-connector solutions represent bundled content where solution-level permissions are misleadingly specific.
**Impact:** Applied with \scripts/clear_permissions_for_multi_connector_solutions.py\.

---




# K — Flat numbering and cell-first Gantt edits

- **Date:** 2026-05-22T11:03:38.974+02:00
- **By:** K
- **Scope:** `js/gantt-planner.js`, `css/style.css`

## Decision
Use one flat sequential counter for every top-level task in the Gantt table across all phases. Only subtasks keep the parent-letter suffix pattern (`4a`, `4b`, etc.).

Treat the left table as a true click-to-edit surface: clicking any editable status, start date, due date, duration, or impact cell should open the inline editor directly, with duration accepting shorthand values like `4h`, `1d`, `1w`, and `2.5d`.

## Why
The previous compound numbering (`0.1`, `1.4`, `4.2`) did not match the expected project-plan reading order, and the first inline-edit pass was too subtle to behave like a spreadsheet-style planning surface.

## Impact
- Parent task numbering now matches the visual order users expect.
- Inline editing is discoverable from the table itself without needing a separate edit action.
- Schedule edits continue to rebuild dependent task timing through the existing dependency-based recalculation flow.


---

# K — Inline editor event delegation

# K decision — Inline editor event delegation

- Date: 2026-05-22T11:15:33.921+02:00
- Context: Gantt table duration and date cells were not reliably entering inline edit mode from the visible table.
- Decision: Use a single capture-phase activation handler on the Gantt table surface and register per-cell editor openers when rows render.
- Why: This keeps inline editing wired even when rows are rebuilt and prevents the row-level detail click action from swallowing editable-cell clicks.
- Impact: Duration, start date, due date, status, and impact cells keep the same save/cancel behavior, with clearer hover affordance on editable cells.

---

## k-hierarchical-numbering

- **Date:** 2026-05-25T11:45:17.295+02:00
- **Agent:** K
- **Scope:** \js/gantt-planner.js\

### Decision
- Treat each solution-group row as the numbered parent in the shared global sequence.
- Number catalog solution tasks relative to that parent with dot notation (\4.1\, \4.2\, ...).
- Number nested subtasks with recursive dot notation (\4.6.1\, \4.6.2\, ...).
- Leave existing global numbering behavior in place for top-level non-solution rows so kickoff and closeout tasks still read \1\, \2\, \3\, \5\, \6\, ... around the grouped solution work.

### Rationale
- The UI now reflects the visible hierarchy instead of flattening solution tasks into the global sequence.
- Using the solution group's number as the parent keeps connector headers and their child tasks aligned in both the table and Gantt views.
- Preserving the global counter for true top-level rows avoids renumbering unrelated planner phases.

### Validation
- Verified in a headless browser with a sample \Windows Security Events\ plan: \1\, \2\, \3\, \4\, \4.1\, \4.2\, \4.2.1\ ... \5\, \6\.

---

## k-detail-panel-addtask-reorder

- **Date:** 2026-05-25T11:45:17.295+02:00
- **By:** K
- **Scope:** \js/gantt-planner.js\, \css/style.css\

### Decision
- Restore the planner interaction model so a row click opens the right-side detail drawer again, with the task-name click following the same row-first behavior.
- Keep quick schedule/status edits inline in the grid, but move task-name editing into the detail drawer (plus the existing new-task inline focus flow) so row clicks reliably surface details.
- Persist manual row order as scoped planner state (\	askOrders\) with three boundaries:
  - phase-root rows reorder only within their phase block,
  - solution tasks reorder only within their solution group,
  - subtasks reorder only within their parent task.
- Apply reordering as block moves so solution groups and summary rows carry their children with them.
- Keep the toolbar \+ Add task\ button available whenever at least one solution group exists by falling back to the last solution group when no row is selected.

### Why
- The user expects the planner to behave like a task browser first, with a dependable detail drawer for deep review.
- Reorder controls must not break hierarchical numbering or let subtasks escape their parent scope.
- Adding work from the top toolbar should not depend on a fragile active-row state.

### Impact
- Detail metadata is richer and available again in the dark-theme drawer.
- Manual ordering survives rerenders and export ordering because the ordered rows are renumbered after the scoped move logic runs.
- The planner remains responsive without introducing a framework or changing the approved architecture.

## copilot-directive-tab-split

### 2026-05-25T14:38: User directive — Table/Gantt tab split
**By:** madesous (via Copilot)
**What:** Split the planner view into two tabs like Monday.com: a "Table" tab showing the task list with columns (task, owner, status, due date, dependencies, priority, timeline), and a "Gantt" tab showing just the timeline/chart visualization. Each tab should own its own scroll context.
**Why:** User preference — improves readability, prevents scroll conflicts, cleaner UX separation of concerns. Reference: Monday.com's Main table / Gantt tab pattern.

---

## k-scroll-fix

### 2026-05-25T14:37:09.027+02:00: K — Gantt scroll fix
**By:** K
**What:** Constrain both the column-resize handle and the split-pane divider to pointer-captured drag sessions that start only on the resize affordance, then tear down immediately on pointerup, pointercancel, lost capture, or window blur. Preserve native panning by keeping `touch-action: none` only on those resize targets and leaving the actual table/chart scroll containers explicitly scrollable.
**Why:** Prevent resize drag state from lingering and stealing scroll input after recent column/drawer changes.
**Impact:** Vertical and horizontal scrolling stay native, and drawers no longer share the same interaction surface as resize drags.

---

## k-tab-split

# K — Planner Table + Gantt tab split

- **Date:** 2026-05-25T14:38:50.012+02:00
- **Decision:** Step 5 now separates the planner into two tabs that share one plan state and one detail drawer: `📋 Table` for spreadsheet editing and `📊 Gantt` for timeline analysis.
- **Why:** The previous combined grid/timeline surface created scroll conflicts and made both editing and schedule review harder than they needed to be.
- **Impact:** Toolbar actions stay above the tabs, zoom + auto-fit live only in Gantt, resizable columns and per-group `+ Add task` rows live in Table, and the active tab is remembered for the current browser session.

---



---

### 2026-06-11T12:34:21Z: Cribl planner grouping — hybrid model
**By:** madesous (Maria)
**What:** When Cribl is the ingestion route for selected sources, the planner uses a hybrid grouping:
- **Cribl group** contains: Cribl infrastructure setup + per-source pipeline configuration tasks (e.g., "Configure Cribl route for Barracuda")
- **Content deployment** (analytics rules, workbooks, hunting queries) remains as a separate task/group associated with the original solution, but with an explicit dependency on the Cribl pipeline task for that source
- If user selected Cribl in Environment but didn't route any sources through it: show Cribl group with no sub-items
- Sources routed through Cribl do NOT get connector setup tasks (Cribl IS the connector)
**Why:** Separates infrastructure (Cribl pipeline) from solution content while making the dependency explicit. Allows parallel scheduling of content deployment once pipeline is confirmed flowing.

---

### 2026-06-02T11:46:18.207+02:00: User directive
**By:** madesous (via Copilot)
**What:** Azure and Microsoft 365 SHOULD be default-selected in the Environment step. This is intentional design, not a bug.
**Why:** User request — captured for team memory. Luv incorrectly flagged this as BUG-ENV-001.


---

### 2026-06-02T14:20:53Z: User directive
**By:** madesous (via Copilot)
**What:** Real vendor/product logos should be loaded from GitHub URLs (not local files) for environment, solutions, and topology pages. Use dark mode versions whenever possible. If no logo is available on GitHub, fall back to the current logo already in the project.
**Why:** User request — captured for team memory


---

### 2026-06-03T15:56:28: User directive
**By:** madesous (via Copilot)
**What:** First-party Microsoft connectors (M365, Entra ID, etc.) do NOT require additional sizing/detail fields (tenant count, user count, etc.). Only connectors that rely on AMA (Azure Monitor Agent) need sizing inputs. Connectors using intermediaries like Cribl also need detail fields. The correct approach is: first classify all connectors by ingestion method (first-party API vs AMA vs intermediary), THEN only add detail fields to AMA/intermediary ones.
**Why:** User correction — Deckard's prior research incorrectly included first-party connectors in the "needs sizing" list.


---

### 2026-06-10T10:13:04+02:00: User directive
**By:** madesous (via Copilot)
**What:** BUG-ENV-001 (Azure & Microsoft 365 default-selected in Environment step) is BY DESIGN, not a bug. Do not change this behavior.
**Why:** User request — captured for team memory


---

### 20260610T103232: User directive
**By:** madesous (via Copilot)
**What:** Solutions with `connectors === 0` are content packs (analytic rules, workbooks, playbooks only). They must NOT appear in the topology and must NOT have sizing. They should still appear in the solutions panel but with appropriate content-pack designation.
**Why:** User request — DNS Essentials (0 connectors, 9 rules, 1 workbook, 1 playbook) was incorrectly shown in topology with sizing badge. 156 solutions have connectors=0 and are content-only.


---

# Deckard analysis — connector ingestion classification

- **Analyzed file:** `data/solutions.json`
- **Timestamp:** `2026-06-03T15:56:12+02:00`
- **Scope:** 332 entries where `is_connector: true`

## Decision summary

- I treated the **native/default ingestion path** in connector metadata as the primary category.
- **Cribl** is handled as an **overlay** for eligible connectors, because most connectors are not natively intermediary-based even when the app can route them through Cribl.
- Result: **only AMA-style connectors currently surface sizing fields in the app**. No first-party or hybrid connector currently shows sizing fields.

## Counts by primary category

| Category | Count | App sizing status |
| --- | ---: | --- |
| First-Party / API-based | 35 | 0 with sizing |
| AMA-based (Azure Monitor Agent) | 50 | 25 with sizing, 25 missing |
| Intermediary | 1 | 0 with standard sizing |
| Hybrid / Other | 246 | 0 with sizing |
| **Total** | **332** |  |

## AMA sizing coverage callout

- **AMA connectors already sized in the app:** 25
- **AMA connectors still missing sizing in the app:** 25
- **Cribl overlay eligible connectors in the app:** 11

### AMA connectors already sized in app

- Azure Cloud NGFW By Palo Alto Networks
- Barracuda WAF
- Cisco Firepower E Streamer
- Common Event Format
- Cortex XDR
- Eset Security Management Center
- ESETPROTECT
- F5 Networks
- Fortinet Forti Web Cloud WAF-as-a-Service connector for Microsoft Sentinel
- Imperva Cloud WAF
- Imperva WAF Gateway
- Microsoft Sysmon For Linux
- Palo Alto Cortex XDR CCP
- Palo Alto Cortex Xpanse CCF
- Syslog
- Sysmon via AMA
- Watchguard Firebox
- Windows DNS Events via AMA
- Windows Firewall
- Windows Firewall via AMA
- Windows Forwarded Events
- Windows Forwarded Events via AMA
- Windows Security Events
- Windows Server DNS
- Zscaler Internet Access

### AMA connectors missing sizing in app

- AI Analyst Darktrace
- ALC-Web CTRL
- Cisco ASA
- Cisco SD-WAN
- Contrast Protect
- Delinea Secret Server
- Extra Hop Reveal(x)
- Forescout (Legacy)
- Forge Rock Common Audit for CEF
- iboss
- Illusive Platform
- Infoblox SOC Insights
- Iron Net Iron Defense
- Onapsis Platform
- One Identity
- Radiflow
- Ridge Security
- Security Bridge App
- Silverfort
- v Armour Application Controller
- V Mware SASE
- Vectra AI Stream
- Votiro
- Wire X Network Forensics Platform
- With Secure Elements Via Connector

### Cribl overlay eligible connectors

- Amazon Web Services Network Firewall — current primary classification: Hybrid / Other
- Azure Firewall — current primary classification: First-Party / API-based
- Azure Web Application Firewall (WAF) — current primary classification: First-Party / API-based
- Common Event Format — current primary classification: AMA-based (Azure Monitor Agent)
- Forge Rock Common Audit for CEF — current primary classification: AMA-based (Azure Monitor Agent)
- Google Cloud Platform Firewall Logs — current primary classification: Hybrid / Other
- Microsoft Sysmon For Linux — current primary classification: AMA-based (Azure Monitor Agent)
- Syslog — current primary classification: AMA-based (Azure Monitor Agent)
- Windows Firewall — current primary classification: AMA-based (Azure Monitor Agent)
- Windows Forwarded Events — current primary classification: AMA-based (Azure Monitor Agent)
- Windows Security Events — current primary classification: AMA-based (Azure Monitor Agent)

## First-Party / API-based (35)

These are Microsoft/Azure-native cloud connectors. They do **not** need customer sizing fields.

| Connector | Ingestion mechanism indicator | Sizing fields in app | Notes |
| --- | --- | --- | --- |
| Agent 365 | Microsoft 365 service API / service-native connector | No |  |
| Azure Activity | Azure Diagnostic Settings / Azure-native telemetry | No |  |
| Azure Batch Account | Azure Diagnostic Settings / Azure-native telemetry | No |  |
| Azure Cognitive Search | Azure Diagnostic Settings / Azure-native telemetry | No |  |
| Azure DDoS Protection | Azure-native service connector / diagnostic pipeline | No |  |
| Azure DevOps Auditing | Azure-native service connector / diagnostic pipeline | No |  |
| Azure Event Hubs | Azure Diagnostic Settings / Azure-native telemetry | No |  |
| Azure Firewall | Azure-native service connector / diagnostic pipeline | No | Cribl overlay supported in app |
| Azure Key Vault | Azure-native service connector / diagnostic pipeline | No |  |
| Azure Kubernetes Service | Azure-native service connector / diagnostic pipeline | No |  |
| Azure Logic Apps | Azure Diagnostic Settings / Azure-native telemetry | No |  |
| Azure Network Security Groups | Azure Diagnostic Settings / Azure-native telemetry | No |  |
| Azure Resource Graph | Azure-native service connector / diagnostic pipeline | No |  |
| Azure Service Bus | Azure Diagnostic Settings / Azure-native telemetry | No |  |
| Azure SQL Database Solution for Sentinel | Azure-native service connector / diagnostic pipeline | No |  |
| Azure Storage | Azure-native service connector / diagnostic pipeline | No |  |
| Azure Stream Analytics | Azure Diagnostic Settings / Azure-native telemetry | No |  |
| Azure Web Application Firewall (WAF) | Azure-native service connector / diagnostic pipeline | No | Cribl overlay supported in app |
| Microsoft 365 | Microsoft 365 service API / service-native connector | No |  |
| Microsoft 365 Assets | Microsoft 365 service API / service-native connector | No |  |
| Microsoft Business Applications | Microsoft 365 service API / service-native connector | No |  |
| Microsoft Copilot | Microsoft 365 service API / service-native connector | No |  |
| Microsoft Defender for Cloud | Microsoft Defender service API | No |  |
| Microsoft Defender for Cloud Apps | Microsoft Defender service API | No |  |
| Microsoft Defender For Endpoint | Microsoft Defender service API | No |  |
| Microsoft Defender for Identity | Microsoft Defender service API | No |  |
| Microsoft Defender for Office 365 | Microsoft Defender service API | No |  |
| Microsoft Defender XDR | Microsoft Defender service API | No |  |
| Microsoft Entra ID | Azure Diagnostic Settings / Azure-native telemetry | No |  |
| Microsoft Entra ID Assets | Microsoft 365 service API / service-native connector | No |  |
| Microsoft Entra ID Protection | Entra / identity service API | No |  |
| Microsoft Power BI | Microsoft 365 service API / service-native connector | No |  |
| Microsoft Project | Microsoft 365 service API / service-native connector | No |  |
| Microsoft Purview | Microsoft 365 service API / service-native connector | No |  |
| Microsoft Purview Information Protection | Microsoft 365 service API / service-native connector | No |  |

## AMA-based (Azure Monitor Agent) (50)

These connectors rely on AMA, a forwarder, Windows Event Collector, or an AMA-backed custom-log path. These **do** need source/forwarder sizing details.

| Connector | Ingestion mechanism indicator | Sizing fields in app | Notes |
| --- | --- | --- | --- |
| AI Analyst Darktrace | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| ALC-Web CTRL | Agent + DCR / forwarder pattern | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Azure Cloud NGFW By Palo Alto Networks | CEF via AMA / Syslog forwarder | Yes |  |
| Barracuda WAF | Syslog via AMA / Linux forwarder | Yes |  |
| Cisco ASA | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Cisco Firepower E Streamer | Syslog via AMA / Linux forwarder | Yes |  |
| Cisco SD-WAN | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Common Event Format | Syslog via AMA / Linux forwarder | Yes | Cribl overlay supported in app |
| Contrast Protect | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Cortex XDR | Syslog via AMA / Linux forwarder | Yes |  |
| Delinea Secret Server | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Eset Security Management Center | Syslog via AMA / Linux forwarder | Yes |  |
| ESETPROTECT | Syslog via AMA / Linux forwarder | Yes |  |
| Extra Hop Reveal(x) | CEF via AMA / Syslog forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| F5 Networks | Syslog via AMA / Linux forwarder | Yes |  |
| Forescout (Legacy) | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Forge Rock Common Audit for CEF | Syslog via AMA / Linux forwarder | No | Cribl overlay supported in app; AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Fortinet Forti Web Cloud WAF-as-a-Service connector for Microsoft Sentinel | Syslog via AMA / Linux forwarder | Yes |  |
| iboss | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Illusive Platform | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Imperva Cloud WAF | Syslog via AMA / Linux forwarder | Yes |  |
| Imperva WAF Gateway | Syslog via AMA / Linux forwarder | Yes |  |
| Infoblox SOC Insights | CEF via AMA / Syslog forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Iron Net Iron Defense | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Microsoft Sysmon For Linux | Syslog via AMA / Linux forwarder | Yes | Cribl overlay supported in app |
| Onapsis Platform | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| One Identity | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Palo Alto Cortex XDR CCP | Syslog via AMA / Linux forwarder | Yes |  |
| Palo Alto Cortex Xpanse CCF | Syslog via AMA / Linux forwarder | Yes |  |
| Radiflow | Agent + DCR / forwarder pattern | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Ridge Security | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Security Bridge App | Custom Logs via AMA | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Silverfort | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Syslog | Syslog via AMA / Linux forwarder | Yes | Cribl overlay supported in app |
| Sysmon via AMA | Syslog via AMA / Linux forwarder | Yes |  |
| v Armour Application Controller | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| V Mware SASE | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Vectra AI Stream | Legacy Log Analytics agent with AMA migration path | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Votiro | CEF via AMA / Syslog forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Watchguard Firebox | Syslog via AMA / Linux forwarder | Yes |  |
| Windows DNS Events via AMA | Windows DNS via AMA / legacy agent path | Yes |  |
| Windows Firewall | Windows Firewall via AMA | Yes | Cribl overlay supported in app |
| Windows Firewall via AMA | Windows Firewall via AMA | Yes |  |
| Windows Forwarded Events | Windows Event Collector / Windows events via AMA | Yes | Cribl overlay supported in app |
| Windows Forwarded Events via AMA | Windows Event Collector / Windows events via AMA | Yes |  |
| Windows Security Events | Windows Security Events via AMA / legacy agent path | Yes | Cribl overlay supported in app |
| Windows Server DNS | Windows DNS via AMA / legacy agent path | Yes |  |
| Wire X Network Forensics Platform | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| With Secure Elements Via Connector | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Zscaler Internet Access | Syslog via AMA / Linux forwarder | Yes |  |

## Intermediary (1)

This is the native intermediary connector bucket. Most Cribl-capable connectors stay in their native bucket and use Cribl only as an overlay.

| Connector | Ingestion mechanism indicator | Sizing fields in app | Notes |
| --- | --- | --- | --- |
| Cribl | Intermediary processing engine (Cribl) | No (Cribl-specific controls exist, but no sizing card) | `cribl-stream` also exists in solutions.json, but it is not counted in the 332 connectors because it is not flagged `is_connector:true` |

## Hybrid / Other (246)

These connectors do not fit the pure first-party or AMA pattern. Most are REST API, codeless, Azure Function, HTTP Data Collector, or other custom ingestion approaches.

| Connector | Ingestion mechanism indicator | Sizing fields in app | Notes |
| --- | --- | --- | --- |
| 1 Password | Azure Function-backed connector | No |  |
| 42 Crunch API Protection | Service API / connector-specific ingestion | No |  |
| Abnormal Security | Azure Function-backed connector | No |  |
| Agari | Service API / connector-specific ingestion | No |  |
| Agile Sec Analytics Connector | HTTP Data Collector API | No |  |
| AI Shield AI Security Monitoring | HTTP Data Collector API | No |  |
| Alibaba Cloud | REST API polling / pull-based ingestion | No |  |
| Alibaba Cloud Action Trail | Service API / connector-specific ingestion | No |  |
| Alibaba Cloud Networking | Service API / connector-specific ingestion | No |  |
| Alsid For AD | Service API / connector-specific ingestion | No |  |
| Amazon Web Services | Service API / connector-specific ingestion | No |  |
| Amazon Web Services Network Firewall | Cloud storage / queue integration | No | Cribl overlay supported in app |
| Amazon Web Services Route 53 | Service API / connector-specific ingestion | No |  |
| Anvilogic | Service API / connector-specific ingestion | No |  |
| ARGOS Cloud Security | Service API / connector-specific ingestion | No |  |
| Armis | REST API polling / pull-based ingestion | No |  |
| Armorblox | REST API polling / pull-based ingestion | No |  |
| Atlassian Confluence Audit | Service API / connector-specific ingestion | No |  |
| Atlassian Jira Audit | REST API polling / pull-based ingestion | No |  |
| Auth0 | Azure Function-backed connector | No |  |
| Authomize | Service API / connector-specific ingestion | No |  |
| AWS Access Logs | Service API / connector-specific ingestion | No |  |
| AWS Cloud Front | Cloud storage / queue integration | No |  |
| AWS EKS | Service API / connector-specific ingestion | No |  |
| AWS ELB | Service API / connector-specific ingestion | No |  |
| AWS Security Hub | Service API / connector-specific ingestion | No |  |
| AWS VPC Flow Logs | Service API / connector-specific ingestion | No |  |
| BETTER Mobile Threat Defense (MTD) | HTTP Data Collector API | No |  |
| Beyond Security be SECURE | HTTP Data Collector API | No |  |
| Beyond Trust PM Cloud | Azure Function-backed connector | No |  |
| Big ID | Service API / connector-specific ingestion | No |  |
| Bit Sight | Azure Function-backed connector | No |  |
| Bitglass | REST API polling / pull-based ingestion | No |  |
| Bitwarden | Service API / connector-specific ingestion | No |  |
| Blacklens | Logs Ingestion API | No |  |
| Blood Hound Enterprise | Service API / connector-specific ingestion | No |  |
| Box | REST API polling / pull-based ingestion | No |  |
| Check Point Cloud Guard CNAPP | Codeless Connector Platform (CCP) | No |  |
| Check Point Cyberint Alerts | Codeless Connector Platform (CCP) | No |  |
| Check Point Cyberint IOC | Service API / connector-specific ingestion | No |  |
| Cisco Duo Security | Azure Function-backed connector | No |  |
| Cisco ETD | Azure Function-backed connector | No |  |
| Cisco Meraki Events via REST API | REST API polling / pull-based ingestion | No |  |
| Cisco Secure Endpoint | Service API / connector-specific ingestion | No |  |
| Cisco Umbrella | REST API polling / pull-based ingestion | No |  |
| Citrix Analytics CCF | Logs Ingestion API | No |  |
| Citrix Analytics for Security | HTTP Data Collector API | No |  |
| Claroty x Dome | Service API / connector-specific ingestion | No |  |
| Cloudflare | Azure Function-backed connector | No |  |
| Cloudflare CCF | HTTP Data Collector API | No |  |
| Cofense Intelligence | Azure Function-backed connector | No |  |
| Cofense Triage | Service API / connector-specific ingestion | No |  |
| Cognni | HTTP Data Collector API | No |  |
| Cognyte Luminar | Service API / connector-specific ingestion | No |  |
| Cohesity Security | Service API / connector-specific ingestion | No |  |
| Commvault Security IQ | Azure Function-backed connector | No |  |
| Contrast ADR | Service API / connector-specific ingestion | No |  |
| Corelight | Other agent / collector pattern (non-explicit AMA) | No |  |
| Crowd Strike Falcon Endpoint Protection | Azure Function-backed connector | No |  |
| CTERA | Service API / connector-specific ingestion | No |  |
| Cybersixgill-Actionable-Alerts | Service API / connector-specific ingestion | No |  |
| Cyble Vision | Service API / connector-specific ingestion | No |  |
| Cyborg Security HUNTER | Service API / connector-specific ingestion | No |  |
| Cyera DSPM | Codeless Connector Platform (CCP) | No |  |
| Cyfirma Attack Surface | Service API / connector-specific ingestion | No |  |
| Cyfirma Brand Intelligence | Service API / connector-specific ingestion | No |  |
| Cyfirma Compromised Accounts | Service API / connector-specific ingestion | No |  |
| Cyfirma Cyber Intelligence | Service API / connector-specific ingestion | No |  |
| Cyfirma Digital Risk | Service API / connector-specific ingestion | No |  |
| Cyfirma Vulnerabilities Intel | Service API / connector-specific ingestion | No |  |
| Cyjax | REST API polling / pull-based ingestion | No |  |
| Cynerio | Service API / connector-specific ingestion | No |  |
| Cyren Threat Intelligence | REST API polling / pull-based ingestion | No |  |
| D3 Smart SOAR | Service API / connector-specific ingestion | No |  |
| Darktrace | Service API / connector-specific ingestion | No |  |
| Databahn | Service API / connector-specific ingestion | No |  |
| Datalake2 Sentinel | REST API polling / pull-based ingestion | No |  |
| Dataminr Pulse | Service API / connector-specific ingestion | No |  |
| Datawiza | Service API / connector-specific ingestion | No |  |
| Digital Shadows | REST API polling / pull-based ingestion | No |  |
| Doppel | Service API / connector-specific ingestion | No |  |
| Dragos | Service API / connector-specific ingestion | No |  |
| Druva Data Security Cloud | Codeless Connector Platform (CCP) | No |  |
| Dynamics 365 | Service API / connector-specific ingestion | No |  |
| Dynatrace | Logic Apps / serverless workflow | No |  |
| Egress Defend | Service API / connector-specific ingestion | No |  |
| Elastic Agent | Other agent / collector pattern (non-explicit AMA) | No |  |
| Ermes Browser Security | Service API / connector-specific ingestion | No |  |
| ESET Inspect | REST API polling / pull-based ingestion | No |  |
| ESET Protect Platform | REST API polling / pull-based ingestion | No |  |
| Extra Hop | Azure Function-backed connector | No |  |
| F5 Big-IP | HTTP Data Collector API | No |  |
| Feedly | Service API / connector-specific ingestion | No |  |
| Flare | HTTP Data Collector API | No |  |
| Forcepoint DLP | HTTP Data Collector API | No |  |
| Forescout eye Inspect for OT Security | Service API / connector-specific ingestion | No |  |
| Forescout Host Property Monitor | Service API / connector-specific ingestion | No |  |
| Fortinet Forti NDR Cloud | Service API / connector-specific ingestion | No |  |
| Garrison ULTRA | Service API / connector-specific ingestion | No |  |
| Gigamon Connector | HTTP Data Collector API | No |  |
| Google Apigee | Azure Function-backed connector | No |  |
| Google Cloud Platform Audit Logs | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform CDN | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform Cloud Monitoring | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform Cloud Run | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform Compute Engine | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform DNS | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform Firewall Logs | Service API / connector-specific ingestion | No | Cribl overlay supported in app |
| Google Cloud Platform IAM | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform IDS | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform Load Balancer Logs | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform NAT | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform Resource Manager | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform Security Command Center | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform SQL | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform VPC Flow Logs | Service API / connector-specific ingestion | No |  |
| Google Kubernetes Engine | Service API / connector-specific ingestion | No |  |
| Google Workspace Reports | Service API / connector-specific ingestion | No |  |
| Gravity Zone | Service API / connector-specific ingestion | No |  |
| Grey Noise Threat Intelligence | Service API / connector-specific ingestion | No |  |
| Halcyon | Service API / connector-specific ingestion | No |  |
| Holm Security | Azure Function-backed connector | No |  |
| HYAS Protect | Service API / connector-specific ingestion | No |  |
| I Pinfo | Azure Function-backed connector | No |  |
| Illumio Insight | Codeless Connector Platform (CCP) | No |  |
| Infoblox | Service API / connector-specific ingestion | No |  |
| Integration for Atlassian Beacon | HTTP Data Collector API | No |  |
| Io TOT Threat Monitoringwith Defenderfor Io T | Codeless Connector Platform (CCP) | No |  |
| IONIX | Codeless Connector Platform (CCP) | No |  |
| Island | Codeless Connector Platform (CCP) | No |  |
| Jamf Protect | Service API / connector-specific ingestion | No |  |
| Joe Sandbox | Service API / connector-specific ingestion | No |  |
| Keeper Security | Service API / connector-specific ingestion | No |  |
| Know Be4 Defend | Service API / connector-specific ingestion | No |  |
| Lastpass Enterprise Activity Monitoring | Codeless Connector Platform (CCP) | No |  |
| Lookout | Codeless Connector Platform (CCP) | No |  |
| Lookout Cloud Security Platform for Microsoft Sentinel | Service API / connector-specific ingestion | No |  |
| Lumen Defender Threat Feed | Service API / connector-specific ingestion | No |  |
| Mail Risk | REST API polling / pull-based ingestion | No |  |
| mesh Stack | Service API / connector-specific ingestion | No |  |
| Microsoft Exchange Security - Exchange On-Premises | Mixed on-prem Windows event logs + custom ingestion | No |  |
| Microsoft Exchange Security - Exchange Online | REST API polling / pull-based ingestion | No |  |
| Mimecast | Azure Function-backed connector | No |  |
| Mimecast Audit | Azure Function-backed connector | No |  |
| Mimecast SEG | Azure Function-backed connector | No |  |
| Mimecast TI Regional | Azure Function-backed connector | No |  |
| Mimecast TTP | Azure Function-backed connector | No |  |
| Miro | REST API polling / pull-based ingestion | No |  |
| MISP2 Sentinel | REST API polling / pull-based ingestion | No |  |
| Mongo DB Atlas | Service API / connector-specific ingestion | No |  |
| Morphisec | Service API / connector-specific ingestion | No |  |
| Mulesoft | REST API polling / pull-based ingestion | No |  |
| NC Protect Data Connector | Service API / connector-specific ingestion | No |  |
| Net Clean Pro Active | HTTP Data Collector API | No |  |
| Netskope | Azure Function-backed connector | No |  |
| Netskope Web Tx | Service API / connector-specific ingestion | No |  |
| Netskopev2 | Azure Function-backed connector | No |  |
| Noname API Security Solution for Microsoft Sentinel | Service API / connector-specific ingestion | No |  |
| Nord Pass | Azure Function-backed connector | No |  |
| Obsidian Datasharing | Service API / connector-specific ingestion | No |  |
| Onapsis Defend | Service API / connector-specific ingestion | No |  |
| One Trust | Service API / connector-specific ingestion | No |  |
| OneLogin IAM | Service API / connector-specific ingestion | No |  |
| Open AI | Service API / connector-specific ingestion | No |  |
| Oracle Cloud Infrastructure | REST API polling / pull-based ingestion | No |  |
| Orca Security Alerts | HTTP Data Collector API | No |  |
| Palo Alto Prisma Cloud | HTTP Data Collector API | No |  |
| Palo Alto Prisma Cloud CWPP | Codeless Connector Platform (CCP) | No |  |
| Pathlock T Dn R | Service API / connector-specific ingestion | No |  |
| Perimeter 81 | HTTP Data Collector API | No |  |
| Phosphorus | Codeless Connector Platform (CCP) | No |  |
| Ping One | Service API / connector-specific ingestion | No |  |
| Proof Point Tap | Service API / connector-specific ingestion | No |  |
| Proofpoint On demand(POD) Email Security | Service API / connector-specific ingestion | No |  |
| Qualys VM Knowledgebase | Azure Function-backed connector | No |  |
| Quokka | Service API / connector-specific ingestion | No |  |
| Rapid7 InsightVM | Azure Function-backed connector | No |  |
| Red Sift | Service API / connector-specific ingestion | No |  |
| RSAID Plus Admin Logs Connector | Service API / connector-specific ingestion | No |  |
| Rubrik Security Cloud | Azure Function-backed connector | No |  |
| Sail Point Identity Now | REST API polling / pull-based ingestion | No |  |
| Salesforce Service Cloud | Service API / connector-specific ingestion | No |  |
| Samsung Knox Asset Intelligence | Service API / connector-specific ingestion | No |  |
| SAP BTP | Service API / connector-specific ingestion | No |  |
| SAP ETD Cloud | Service API / connector-specific ingestion | No |  |
| SAP Log Serv | Service API / connector-specific ingestion | No |  |
| SAP S4 Cloud Public Edition | Service API / connector-specific ingestion | No |  |
| Security Scorecard Cybersecurity Ratings | Azure Function-backed connector | No |  |
| Semperis Directory Services Protector | Other agent / collector pattern (non-explicit AMA) | No |  |
| Semperis Lightning | Service API / connector-specific ingestion | No |  |
| Senserva Pro | HTTP Data Collector API | No |  |
| Sentinel One | Azure Function-backed connector | No |  |
| Seraphic Security | Service API / connector-specific ingestion | No |  |
| Sevco Security | Service API / connector-specific ingestion | No |  |
| SIGNL4 | Service API / connector-specific ingestion | No |  |
| SINEC Security Guard | Service API / connector-specific ingestion | No |  |
| Slash Next | Azure Function-backed connector | No |  |
| Snowflake | Service API / connector-specific ingestion | No |  |
| SOC Prime CCF | Codeless Connector Platform (CCP) | No |  |
| Sonrai Security | REST API polling / pull-based ingestion | No |  |
| Sophos Cloud Optix | HTTP Data Collector API | No |  |
| Sophos Endpoint Protection | Codeless Connector Platform (CCP) | No |  |
| Squadra Technologies Sec Rmm | Service API / connector-specific ingestion | No |  |
| Strider Shield | Service API / connector-specific ingestion | No |  |
| Styx Intelligence | Service API / connector-specific ingestion | No |  |
| Symantec Integrated Cyber Defense | HTTP Data Collector API | No |  |
| Synqly Integration Connector | Service API / connector-specific ingestion | No |  |
| Tacit Red Threat Intelligence | REST API polling / pull-based ingestion | No |  |
| Talon | HTTP Data Collector API | No |  |
| Tanium | Service API / connector-specific ingestion | No |  |
| Team Cymru Scout | Service API / connector-specific ingestion | No |  |
| Tenable App | REST API polling / pull-based ingestion | No |  |
| Tenable IO | REST API polling / pull-based ingestion | No |  |
| The Hive | Azure Function-backed connector | No |  |
| Theom | HTTP Data Collector API | No |  |
| Threat Intelligence | Service API / connector-specific ingestion | No |  |
| Threat Intelligence (NEW) | Service API / connector-specific ingestion | No |  |
| Threat Intelligence Solution for Azure Government | Service API / connector-specific ingestion | No |  |
| Transmit Security | REST API polling / pull-based ingestion | No |  |
| Trellix | Service API / connector-specific ingestion | No |  |
| Trend Micro Cloud App Security | Azure Function-backed connector | No |  |
| Trend Micro Vision One | HTTP Data Collector API | No |  |
| Tropico | Service API / connector-specific ingestion | No |  |
| Upwind | Azure Function-backed connector | No |  |
| V Mware Carbon Black Cloud | Azure Function-backed connector | No |  |
| Vaikora-Sentinel | REST API polling / pull-based ingestion | No |  |
| Valence Security | Service API / connector-specific ingestion | No |  |
| Valimail Enforce | Service API / connector-specific ingestion | No |  |
| Varonis Purview | Service API / connector-specific ingestion | No |  |
| Varonis Saa S | Azure Function-backed connector | No |  |
| Vectra XDR | Service API / connector-specific ingestion | No |  |
| Versasec CMS | REST API polling / pull-based ingestion | No |  |
| Virtual Metric Data Stream | Service API / connector-specific ingestion | No |  |
| Visa Threat Intelligence (VTI) | Service API / connector-specific ingestion | No |  |
| VM Ray | Service API / connector-specific ingestion | No |  |
| With Secure Elements Via Function | Azure Function-backed connector | No |  |
| Wiz | REST API polling / pull-based ingestion | No |  |
| Workday | Codeless Connector Platform (CCP) | No |  |
| Workplace from Facebook | Azure Function-backed connector | No |  |
| XBOW | Azure Function-backed connector | No |  |
| Zero Fox | Azure Function-backed connector | No |  |
| Zero Fox Alerts | HTTP Data Collector API | No |  |
| Zero Fox Threat Intelligence | Logs Ingestion API | No |  |
| Zero Networks | REST API polling / pull-based ingestion | No |  |
| Zimperium Mobile Threat Defense | Service API / connector-specific ingestion | No |  |
| Zoom Reports | REST API polling / pull-based ingestion | No |  |



---

# Deckard decision: connector requirements classification

- Reviewed the live connector catalog in `data/solutions.json` and found **333 connector-bearing entries**, not 332. The analysis and rollout plan therefore use the live 333-entry catalog.
- Locked the sizing rule: **First-party Microsoft APIs and Diagnostic Settings do not need sizing fields**; **AMA, MMA, Syslog/CEF collectors, WEC/WEF, AMA custom logs, and Cribl/intermediary patterns do**.
- Identified **43 connectors** that need sizing/detail fields. The highest-value anchors are AI Analyst Darktrace, Azure Cloud NGFW By Palo Alto Networks, Barracuda WAF, Cisco ASA, Cisco Firepower E Streamer, Cisco SD-WAN, Common Event Format, Contrast Protect.
- Confirmed the app currently has **no `sizingInputs` / `additionalDetails` schema**. Only **10 of 43** size-needed connectors have any core structured sizing metadata, and **33** are still completely missing it.
- Prioritized implementation around reusable field packs (**Syslog/CEF, Windows AMA, WEC/WEF, AMA custom logs, Cribl**) before connector-by-connector rollout. Biggest metadata gap cluster: AI Analyst Darktrace, Azure Cloud NGFW By Palo Alto Networks, Barracuda WAF, Cisco ASA, Cisco Firepower E Streamer, Cisco SD-WAN, Contrast Protect, Cribl Stream.
- Detailed analysis written to `C:\Users\madesous\value-pack-planner\docs\connector-requirements-analysis.md`.

---

# Decision: Field Pack Assignments for solutions.json

**Date:** 2026-06-03T16:42:31+02:00
**Author:** Deckard
**Status:** Implemented

---

## Summary

`data/solutions.json` now carries a `fieldPack` property on all 43 connectors that need customer-supplied infrastructure details. Seven high-priority connectors also carry `ganttTaskOverrides.sourceConfigSubtasks` with vendor-specific task guidance for the Gantt PC-02 step.

---

## Field Pack Assignments

### `syslog-cef` — 31 connectors
AMA-based Syslog/CEF forwarder path. Customer provides: EPS, collector VM count, on-prem %, syslog/CEF receiver hostname.

| ID | Name |
|---|---|
| ai-analyst-darktrace | AI Analyst Darktrace |
| azure-cloud-ngfw-by-palo-alto-networks | Azure Cloud NGFW By Palo Alto Networks |
| barracuda-waf | Barracuda WAF |
| cisco-asa-2 | Cisco ASA |
| cisco-firepower-e-streamer | Cisco Firepower E Streamer |
| cisco-sd-wan | Cisco SD-WAN |
| common-event-format | Common Event Format |
| contrast-protect | Contrast Protect |
| delinea-secret-server | Delinea Secret Server |
| eset-security-management-center | Eset Security Management Center |
| esetprotect | ESETPROTECT |
| extra-hop-reveal-x | Extra Hop Reveal(x) |
| f5-networks | F5 Networks |
| forge-rock-common-audit-for-cef | Forge Rock Common Audit for CEF |
| fortinet-forti-web-cloud-waf-as-a-service-connector-for-microsoft-sentinel | Fortinet FortiWeb Cloud WAF-as-a-Service |
| iboss | iboss |
| illusive-platform | Illusive Platform |
| infoblox-soc-insights | Infoblox SOC Insights |
| iron-net-iron-defense | Iron Net Iron Defense |
| linux-syslog | Syslog (Linux) |
| microsoft-sysmon-for-linux | Microsoft Sysmon For Linux |
| onapsis-platform | Onapsis Platform |
| one-identity | One Identity |
| ridge-security | Ridge Security |
| silverfort | Silverfort |
| v-armour-application-controller | v Armour Application Controller |
| v-mware-sase | VMware SASE |
| votiro | Votiro |
| watchguard-firebox | WatchGuard Firebox |
| wire-x-network-forensics-platform | WireX Network Forensics Platform |
| with-secure-elements-via-connector | WithSecure Elements Via Connector |

### `windows-ama` — 4 connectors
AMA on Windows hosts collecting via Windows Event Log channel. Customer provides: server count, on-prem %, Arc requirement.

| ID | Name |
|---|---|
| windows-security-events | Windows Security Events |
| windows-dns-events-via-ama | Windows DNS Events via AMA |
| windows-server-dns | Windows Server DNS |
| sysmon-via-ama | Sysmon via AMA |

### `wec-wef` — 2 connectors
Windows Event Collector / Windows Event Forwarding path. Customer provides: WEC server count, subscription design, collector topology.

| ID | Name |
|---|---|
| windows-forwarded-events | Windows Forwarded Events |
| windows-forwarded-events-via-ama | Windows Forwarded Events via AMA |

### `ama-custom-logs` — 5 connectors
AMA custom log ingestion (text files, not Event Log channels). Customer provides: server count, log file paths, DCR/DCE details.

| ID | Name | Notes |
|---|---|---|
| radiflow | Radiflow | — |
| security-bridge-app | Security Bridge App | — |
| vectra-ai-stream | Vectra AI Stream | — |
| windows-firewall | Windows Firewall | pfirewall.log text path — NOT Event Log channel |
| windows-firewall-via-ama | Windows Firewall via AMA | pfirewall.log text path — NOT Event Log channel |

**Important:** `windows-firewall` and `windows-firewall-via-ama` are `ama-custom-logs`, not `windows-ama`. These connectors collect `pfirewall.log` text files via AMA Custom Logs, which is architecturally distinct from the Windows Event Log channel path used by `windows-ama`.

### `cribl-intermediary` — 1 connector
Cribl Stream as pipeline intermediary. Customer provides: Cribl Stream deployment type, sources connected through it.

| ID | Name |
|---|---|
| cribl-stream | Cribl Stream |

---

## Gantt Task Overrides (PC-02 source configuration subtasks)

Seven high-priority connectors carry `ganttTaskOverrides.sourceConfigSubtasks` for vendor-specific Gantt guidance:

### cisco-asa-2
```
- Configure ASA: logging host <forwarder-IP> 6514
- Set logging level: informational or above
- Test with: show logging
```

### azure-cloud-ngfw-by-palo-alto-networks
```
- Create syslog server profile in PAN-OS/Panorama
- Select log types: Traffic, Threat, URL Filtering, WildFire
- Assign profile to security policy
- Set format to CEF
```

### f5-networks
```
- Configure F5 BIG-IP remote syslog destination
- Set log level and facility
- Test connectivity to forwarder
```

### common-event-format
```
- Point CEF-emitting sources to forwarder/Cribl
- Verify CEF header format: CEF:0|Vendor|Product|Version|...
- Confirm no format mismatch
```

### windows-security-events
```
- Configure Group Policy Security Audit settings
- Select Event IDs (4624, 4625, 4648, 4672, 4688)
- Confirm policy applied to target machines
```

### windows-forwarded-events
```
- Design WEF subscription scope (source-initiated vs collector-initiated)
- Configure FQDN targeting
- Validate subscription status on WEC
```

### sysmon-via-ama
```
- Deploy Sysmon with config XML on target hosts
- Validate Sysmon events in Event Viewer
- Configure DCR for both Sysmon Windows Events and Linux Syslog
```

---

## Schema Pattern

```json
{
  "id": "cisco-asa-2",
  "fieldPack": "syslog-cef",
  "ganttTaskOverrides": {
    "sourceConfigSubtasks": [
      "Configure ASA: logging host <forwarder-IP> 6514",
      "Set logging level: informational or above",
      "Test with: show logging"
    ]
  }
}
```

- `fieldPack` — tells the planner which sizing/detail form template to render for this connector
- `ganttTaskOverrides` — connector-specific variations on generic Gantt task steps; currently only `sourceConfigSubtasks` (PC-02 overrides), but structure is open for `sourceConfigDuration` and other per-step overrides

---

## Implementation Notes

- Change is additive only. Zero existing properties were removed or altered.
- Connectors that already had `capacity_type`, `server_population_kind`, `shared_population_group`, etc. retain all of those. `fieldPack` is complementary metadata, not a replacement.
- The remaining 290 connectors (no infrastructure dependency) are intentionally left without `fieldPack` — absence means "no sizing form needed."


---

# V1 Connector Priorities — Readiness Report

**Author:** Deckard (Lead)  
**Date:** 2026-06-11  
**Requested by:** Maria  
**Purpose:** Establish which connectors must be totally polished in the planner and Gantt chart before releasing v1.

---

## Summary

After auditing `data/solutions.json` (489 solutions, 332 marked `is_connector`) and the Gantt task engine in `js/modules/gantt-tasks.js` and `js/gantt-planner.js`, I identified a tiered set of connectors based on analytics rule counts, Microsoft featured status, real-world deployment frequency, and current data quality. The critical finding is that **only one connector — Windows Security Events — is fully production-ready for v1**. Every other high-priority connector has at minimum one blocking gap (missing calendar durations), and several Microsoft first-party connectors use a generic 4-task template with no connector-specific task depth.

---

## Tiering Rationale

A connector is **Tier 1** if all three of the following are true:
1. It appears in virtually every Sentinel deployment (day-1 or first-30-days category)
2. It carries meaningful analytics rule coverage (≥ 5 rules, or is a structural dependency for other connectors)
3. Missing or broken data for it would visibly embarrass the planner in a customer demo

A connector is **Tier 2** if it is important for many deployments but is either more situational (Windows-only environments, specific firewall brands) or its current data gaps are recoverable with a focused sprint.

A connector is **Tier 3** if polishing it post-v1 carries no delivery risk.

---

## Tier 1 — Must Ship (v1 blocked without these being perfect)

These eight connectors form the non-negotiable core. A Sentinel POC or production onboarding that skips any of them is incomplete.

### 1. Windows Security Events
- **Why Tier 1:** The single most commonly deployed Windows telemetry connector. Every organization with Windows infrastructure deploys this day 1. 20 packaged analytics rules. The only connector in the entire catalog with a complete, production-quality task model.
- **Analytics rules:** 20
- **Priority score:** 61 (understated — the scoring formula underweights infrastructure connectors with high complexity)
- **Featured:** No ← should be marked featured
- **Task depth:** 11 main tasks + 4 subtasks (wse-deploy-dcr rollup) ✅
- **Durations set:** Yes — all 11 tasks have numeric `duration` values ✅
- **ganttTaskOverrides:** Present (source config subtasks for audit policy) ✅
- **fieldPack:** `windows-ama` ✅
- **envScaling:** Not yet populated ⚠️ (planned, not blocking)
- **Status: READY**

---

### 2. Microsoft Entra ID
- **Why Tier 1:** Every customer has Entra ID. Highest analytics rule count in the catalog (73 rules). First thing enabled in any new Sentinel workspace. Featured.
- **Analytics rules:** 73
- **Priority score:** 74 | Phase 1 | Complexity 2
- **Featured:** Yes ★
- **Task depth:** 4 generic tasks only — no connector-specific steps ⚠️
- **Durations set:** 0/4 — all `duration` fields are null ⚠️ **BLOCKING**
- **ganttTaskOverrides:** None ⚠️
- **Gap:** Generic 4-task template ("Verify prerequisites", "Enable connector", "Deploy content", "Validate"). No Entra-specific steps (conditional access, sign-in logs vs audit logs choice, legacy auth controls). Calendar durations completely absent so Gantt bars have no real-time schedule.
- **Status: NEEDS WORK — task depth + durations required**

---

### 3. Microsoft Defender XDR
- **Why Tier 1:** Unified XDR connector that replaces individual MDE/MDI/MDO connectors. 40 analytics rules, featured, priority 74. Standard in every modern Sentinel deployment.
- **Analytics rules:** 40
- **Priority score:** 74 | Phase 1 | Complexity 3
- **Featured:** Yes ★
- **Task depth:** 4 generic tasks only ⚠️
- **Durations set:** 0/4 ⚠️ **BLOCKING**
- **ganttTaskOverrides:** None ⚠️
- **Gap:** Generic template misses XDR-specific setup: license verification per workload, Advanced Hunting schema choices, bi-directional sync configuration. No durations.
- **Status: NEEDS WORK — task depth + durations required**

---

### 4. Azure Activity
- **Why Tier 1:** The simplest connector in the catalog (complexity 1, 2 hours setup). Captures Azure control-plane operations — essential for cloud governance detection. 14 analytics rules. Featured. Priority 77 (highest among featured connectors).
- **Analytics rules:** 14
- **Priority score:** 77 | Phase 1 | Complexity 1
- **Featured:** Yes ★
- **Task depth:** 4 generic tasks only ⚠️
- **Durations set:** 0/4 ⚠️ **BLOCKING**
- **ganttTaskOverrides:** None ⚠️
- **Gap:** This is literally a 2-hour connector — the Gantt bar should show ~0.25 weeks. Currently the planner falls back to an effort-hours estimate, which produces the right effort but no meaningful calendar duration. For a connector this quick, the missing duration is extra visible.
- **Status: NEEDS WORK — durations required (task content acceptable given simplicity)**

---

### 5. Microsoft Defender for Cloud
- **Why Tier 1:** Standard Defender for Cloud → Sentinel integration. Every Azure customer enabling MDC security posture routes alerts here. Priority 74, featured.
- **Analytics rules:** 1 (low — most rules live in the XDR connector; MDC provides alert ingestion)
- **Priority score:** 74 | Phase 1 | Complexity 3
- **Featured:** Yes ★
- **Task depth:** 4 generic tasks only ⚠️
- **Durations set:** 0/4 ⚠️ **BLOCKING**
- **Gap:** Missing MDC-specific steps: Defender for Cloud plan activation per subscription, ASC pricing tier choice, auto-provisioning settings. No durations.
- **Status: NEEDS WORK — durations required; deeper tasks strongly recommended**

---

### 6. Microsoft 365 (Unified Audit Log)
- **Why Tier 1:** Captures SharePoint, Teams, Exchange, OneDrive activity. 15 analytics rules, priority 74. Standard in any M365-heavy organization.
- **Analytics rules:** 15
- **Priority score:** 74 | Phase 1 | Complexity 2
- **Featured:** No ← should be reviewed for featured status
- **Task depth:** 4 generic tasks only ⚠️
- **Durations set:** 0/4 ⚠️ **BLOCKING**
- **Gap:** Generic template misses the M365 Audit connector nuances: audit retention tier choice, license prerequisite check (E3 vs E5), choosing which workloads to enable. No durations.
- **Status: NEEDS WORK — durations required**

---

### 7. Common Event Format (CEF) + Linux Syslog (as a pair)
- **Why Tier 1:** These two are the shared infrastructure foundation for all third-party firewall and network connectors (Palo Alto, Fortinet, Check Point, Cisco ASA, F5, Juniper, etc.). Any customer deploying even one third-party firewall triggers the CEF/Syslog infrastructure path. The `gantt-tasks.js` engine generates `CEF-INFRA-01` through `CEF-INFRA-05` tasks for this pack — which is already well-modeled in the engine — but the `planner.setup_tasks` entries in `solutions.json` are generic templates with no durations.
- **CEF analytics rules:** 0 (CEF is infrastructure; analytics come from vendor connectors)
- **Syslog analytics rules:** 7
- **CEF Priority score:** 41 ⚠️ (drastically underscored — should reflect its role as shared infrastructure)
- **Syslog Priority score:** 51 ⚠️ (also underscored)
- **Featured:** No ← both should be marked featured given structural dependency
- **Task depth:** Both have 4 generic tasks, durations missing ⚠️ **BLOCKING**
- **ganttTaskOverrides:** CEF has source config subtasks ✅; Syslog has none ⚠️
- **Gap:** The `gantt-tasks.js` engine already handles CEF/Syslog infrastructure correctly via `CEF-INFRA-*` shared tasks. The problem is the `planner.setup_tasks` card view tasks — they need durations so the solution-group row can show a meaningful calendar bar. Additionally, `linux-syslog` needs `ganttTaskOverrides.sourceConfigSubtasks` aligned with CEF.
- **Status: NEEDS WORK — durations and linux-syslog ganttTaskOverrides required; priority scores need recalibration**

---

### 8. Microsoft Defender for Identity (MDI)
- **Why Tier 1:** Highest priority score in the entire M365 category (83). Identity is the #1 attack vector in 2024–2026. MDI detects lateral movement and privilege escalation that nothing else catches. Standard in every enterprise deployment.
- **Analytics rules:** 0 (MDI alerts surface through Defender XDR connector; standalone analytic count is 0 but this undercounts its value)
- **Priority score:** 83 | Phase 1 | Complexity 2
- **Featured:** No ← missing from featured list despite highest priority score
- **Task depth:** 4 generic tasks only ⚠️
- **Durations set:** 0/4 ⚠️ **BLOCKING**
- **Gap:** Generic template misses MDI-specific setup: sensor deployment on domain controllers, service account provisioning, network name resolution configuration, Active Directory schema requirements. No durations. Also: the 0 analytics count makes the UI value badge invisible — worth investigating whether MDI should report bundled rule count.
- **Status: NEEDS WORK — durations + connector-specific tasks required; featured flag missing**

---

## Tier 2 — Should Ship

These connectors are important but their gaps won't block v1 from shipping if Tier 1 is complete.

| Connector | Analytics | Tasks | Key Gap |
|---|---|---|---|
| **Windows Forwarded Events via AMA** | 4 | 10 detailed tasks | All 10 durations missing — effort_hours present, calendar dates not |
| **Windows DNS Events via AMA** | 5 | 8 detailed tasks | All 8 durations missing |
| **Windows Firewall via AMA** | 0 | 7 detailed tasks | All 7 durations missing |
| **Azure Firewall** | 11 | 4 generic tasks | No durations; not featured despite priority=78 |
| **Cisco ASA** | 2 | 4 generic tasks | Has ganttTaskOverrides ✅; no durations; the most common CEF firewall |
| **Microsoft Defender for Endpoint** | 1 | 4 generic tasks | No durations; needed when XDR is not the entry point |
| **Defender for Cloud Apps (MDA)** | 1 | 4 generic tasks | No durations; common in M365 E5 environments |

**Rationale for Tier 2:** Windows Forwarded Events, DNS, and Firewall via AMA already have deep task breakdowns — the only fix needed is adding `duration` values to each task. This is a data-fill sprint, not a design problem. They should ship close behind Tier 1 if bandwidth allows.

---

## Tier 3 — Nice to Have (Post-V1)

These are important connectors that many customers use, but polishing them after v1 is low-risk. Their current 4-task generic templates are functionally acceptable for a v1 release.

| Connector | Analytics | Priority | Notes |
|---|---|---|---|
| Palo Alto Networks variants (CDL, Prisma, NGFW) | 3–11 | 55–75 | CEF path handles infra; connector-specific config is well-known |
| Fortinet FortiGate | 0 | 60 | CEF path; most complex firewall connector |
| Check Point | 0 | 55 | CEF path; common enterprise firewall |
| CrowdStrike Falcon | 2 | 76 | API-based; relatively simple config |
| Sysmon via AMA | 0 | 64 | Phase 2 in data; 10 detailed tasks but all durations missing |
| AWS connector | 62 | 61 | 62 analytics rules! Should be Tier 2 but Azure-first priority for v1 |
| Threat Intelligence connectors | 52 | 66 | Important but configurable post-go-live |

---

## V1 Readiness Verdict

| Connector | Ready? | Blocking Gaps |
|---|---|---|
| Windows Security Events | ✅ **READY** | Minor: `isFeatured` flag missing; envScaling not populated (non-blocking) |
| Microsoft Entra ID | ⚠️ **NOT READY** | Task durations missing; generic 4-task template |
| Microsoft Defender XDR | ⚠️ **NOT READY** | Task durations missing; generic 4-task template |
| Azure Activity | ⚠️ **NOT READY** | Task durations missing |
| Microsoft Defender for Cloud | ⚠️ **NOT READY** | Task durations missing; generic template |
| Microsoft 365 | ⚠️ **NOT READY** | Task durations missing |
| Common Event Format | ⚠️ **NOT READY** | Task durations missing; priority score underweight |
| Linux Syslog | ⚠️ **NOT READY** | Task durations missing; no ganttTaskOverrides |
| Microsoft Defender for Identity | ⚠️ **NOT READY** | Task durations missing; not featured; no MDI-specific tasks |

---

## Root Cause — The Missing Duration Problem

The `duration` field in `planner.setup_tasks` entries represents **calendar days** (real-world time to complete, not just engineer effort hours). It is what the Gantt engine uses via `getTaskBaseDurationDays()` to set bar widths.

Windows Security Events is the only connector with all `duration` values populated. Every other connector — including all 7 of the "detailed" connectors (WFE, WFEA, WDNS, WDFW, Sysmon) — has `duration: null` across all their tasks. Without this, the Gantt planner falls back to effort-hours-based estimates, which:

1. Conflates **effort** (person-hours) with **elapsed time** (calendar days)
2. Makes connectors with parallel tasks look artificially short or long
3. Breaks the critical-path calculation for multi-week connectors like WFE (which takes ~2-3 weeks despite only 23 effort hours)

**The fix is purely a data entry task in `solutions.json` — no code changes required.**

---

## Recommendations for What Needs Fixing Before V1

### Immediate (Sprint 1 before v1)

1. **Add `duration` values to all 7 Tier 1 connectors** (Entra ID, Defender XDR, Azure Activity, Defender for Cloud, Microsoft 365, CEF, Linux Syslog). For these simple connectors, each task typically takes 0.5–1 calendar day even if the effort is only 1–2 hours.

2. **Add `duration` values to the 5 detailed-but-incomplete connectors** (WFE-via-AMA, Windows DNS, Windows Firewall, Sysmon-via-AMA, Windows Forwarded Events legacy). These already have great task text — just need day estimates added.

3. **Add MDI-specific task steps** for Microsoft Defender for Identity (sensor deployment on DCs, service account setup, NNR config). This is a meaningful gap that shows up immediately in any Active Directory environment.

4. **Mark as `isFeatured`:** Windows Security Events, Microsoft 365, Microsoft Defender for Identity, Common Event Format, Linux Syslog. The current featured set (15 connectors) is inconsistent — MDfI (priority 83) is not featured but Apache Log4j Vulnerability Detection is.

5. **Recalibrate priority scores** for CEF (41 → 70+) and Linux Syslog (51 → 65+) to reflect their role as shared infrastructure dependencies. The current scoring formula penalizes infrastructure connectors (low analytics count, high complexity) in a way that makes them look like low-value niche options.

### Near-term (Post-v1 fast-follow)

6. **Add connector-specific task steps** to Entra ID, Defender XDR, and Defender for Cloud — at minimum 6–8 tasks each following the Windows Security Events model (Prerequisites → Infrastructure → Configuration → Validation → Operationalization).

7. **Add `ganttTaskOverrides.sourceConfigSubtasks`** to Linux Syslog (matching the CEF pattern already present).

8. **Add `environment_scaling`** to the 5 Windows-family connectors (WSE, WFE-via-AMA, WDNS, WDFW, Sysmon) — this is already designed but not yet populated.

---

## Catalog Health Summary

| Metric | Value |
|---|---|
| Total connectors (`is_connector: true`) | 332 |
| Featured connectors | 15 |
| With detailed tasks (> 4 tasks) | 6 |
| With all durations populated | 1 (Windows Security Events only) |
| With `ganttTaskOverrides` | 7 |
| With `fieldPack` assigned | 43 |
| Phase 1 + high impact + priority ≥ 65 | 63 |

The catalog is structurally sound. The data model is correct and the engine handles all field packs well. The v1 gap is purely about **filling in `duration` fields** for the ~60 most important connectors and **deepening task content** for the 7 Tier 1 connectors that currently have generic templates.


---

# V1 Task Coverage Audit — Gantt Tasks vs solutions.json

**Author:** Deckard (Lead / Architect)
**Date:** 2026-06-11
**Requested by:** Maria
**Builds on:** `deckard-v1-connector-priorities.md` (2026-06-11)
**Purpose:** Determine which top-priority connectors have properly defined `planner.setup_tasks` in `solutions.json`, which rely on the Gantt engine alone, and which are completely missing duration data before v1 ships.

---

## Executive Summary

The planner recommends connectors through two independent signals: **priority score** (the 5-factor weighted formula in `scoring.js`) and **featured flag** (`isFeatured` in `solutions.json`). These two signals are deliberately separate — a connector can score high without being featured and vice versa. The Solutions screen currently surfaces 15 featured connectors; the scoring formula ranks Microsoft Defender for Identity (83), Azure Activity (77), and Azure Firewall (78) at the top among connectors with meaningful deployment intent.

**The central finding is unchanged from the prior priorities audit:** Only **one connector — Windows Security Events** — has all `planner.setup_tasks` durations populated in `solutions.json`. Every other connector in the catalog, including all 7 of the other Tier 1 connectors, has a `duration: null` on every task entry. The Gantt engine (`gantt-tasks.js`) is mostly fine — it builds task chains dynamically from `TASK_CATALOG` with proper durations. The gap is in `solutions.json` `planner.setup_tasks`, which drives the planning card view and the solution-group effort bar.

---

## How the Recommendation Engine Works

### Priority Score (scoring.js)

```
score = (businessImpact × 0.40)
      + (complexityInverse × 0.20)
      + (setupTimeInverse × 0.15)
      + (detectionCoverage × 0.15)
      + (maturity × 0.10)
```

- `businessImpact` reads `value_scoring.business_impact` (`critical=100`, `high=75`, `medium=50`, `low=25`).
- `complexityInverse` reads `value_scoring.complexity_level` (1–5 scale, inverted: lower complexity → higher score).
- `setupTimeInverse` reads `value_scoring.setup_hours` first, then sums `planner.setup_tasks[].effort_hours` if no direct value. Shorter setup = higher score.
- `detectionCoverage` reads `value_scoring.detection_areas` (array length × 20) or analytics rule count.
- `maturity` reads `value_scoring.maturity` (`ga=100`, `preview=50`).

**Known scoring bias:** Infrastructure connectors (CEF, Linux Syslog) score low because they have zero analytics rules and high complexity. Their structural importance is invisible to the formula.

### Featured Flag

`featured: true` (or `isFeatured: true`) in `solutions.json` is a **static editorial flag**, not derived from the score. There are currently **15 featured connectors**. The featured set is inconsistent: MDI (score 83) is not featured, while Apache Log4j Vulnerability Detection (score ~50) is.

### Gantt Task Generation vs solutions.json Tasks

There are **two separate task systems** in this planner:

| System | Source | Used by |
|---|---|---|
| `TASK_CATALOG` + `buildPerConnectorTasks()` | `gantt-tasks.js` | Gantt chart (Step 5) |
| `planner.setup_tasks[]` | `solutions.json` | Planning card view (Step 5 tab) + effort bar |

The Gantt engine is largely self-sufficient — it builds INFRA tasks from the catalog (all with proper durations) and per-connector PC-01..04 chains dynamically. The `PER_CONNECTOR_OVERRIDES` dictionary in `gantt-tasks.js` provides connector-specific source-config subtasks for 8 connectors.

The `planner.setup_tasks` in `solutions.json` are the gap: they are what the planning card view and the solution-group effort bar consume, and only Windows Security Events has duration data there.

---

## Tier 1 — Must Ship with Tasks for V1

These connectors are highest-recommended by the planner and will be the first things customers see in any demo or POC.

### 1. Windows Security Events
- **Priority score:** 61 | **Featured:** No (gap — should be) | **analytics:** 20
- **`planner.setup_tasks`:** 11 tasks — ALL durations populated ✅
- **`ganttTaskOverrides`:** Present in both `solutions.json` and `gantt-tasks.js` `PER_CONNECTOR_OVERRIDES` ✅
- **`fieldPack`:** `windows-ama` ✅
- **Gantt engine:** WIN-INFRA-01 through WIN-INFRA-04 + WSE-specific per-connector chain ✅
- **Status: ✅ READY** (only connector in the catalog with complete duration data)
- **Remaining gap:** `isFeatured` flag absent; `environment_scaling` not yet populated (non-blocking for v1)

---

### 2. Microsoft Entra ID
- **Priority score:** 74 | **Featured:** Yes ★ | **analytics:** 73 (highest in catalog)
- **`planner.setup_tasks`:** 4 generic tasks — **0/4 durations set** ⚠️ BLOCKING
- **`ganttTaskOverrides`:** None in `solutions.json` or `gantt-tasks.js` ⚠️
- **`fieldPack`:** None (inferred as `native-direct`) — Gantt generates a minimal 2-task chain
- **Gantt engine:** Generic native-direct path (no INFRA tasks, just `Enable` + `Validate`) — acceptable for native connector
- **Status: ⚠️ NOT READY** — Task durations and connector-specific step depth are both missing. Generic template has no Entra-specific steps (sign-in logs vs audit logs, conditional access, legacy auth).

---

### 3. Microsoft Defender XDR
- **Priority score:** 74 | **Featured:** Yes ★ | **analytics:** 40
- **`planner.setup_tasks`:** 4 generic tasks — **0/4 durations set** ⚠️ BLOCKING
- **`ganttTaskOverrides`:** None ⚠️
- **`fieldPack`:** None (inferred as `native-direct`)
- **Gantt engine:** Generic native-direct path
- **Status: ⚠️ NOT READY** — No durations. XDR-specific steps missing (license verification per workload, Advanced Hunting schema choices, bi-directional sync configuration).

---

### 4. Azure Activity
- **Priority score:** 77 | **Featured:** Yes ★ | **analytics:** 14
- **`planner.setup_tasks`:** 4 generic tasks — **0/4 durations set** ⚠️ BLOCKING
- **`ganttTaskOverrides`:** None ⚠️
- **`fieldPack`:** None (inferred as `diagnostic-settings` via tags)
- **Gantt engine:** Minimal native path — appropriate for this simple connector
- **Status: ⚠️ NOT READY** — This is a 2-hour connector (`setup_hours: 2`); a missing duration is especially visible here. The Gantt bar should show ~0.25 weeks. Pure data entry to fix.

---

### 5. Microsoft Defender for Cloud
- **Priority score:** 74 | **Featured:** Yes ★ | **analytics:** 1
- **`planner.setup_tasks`:** 4 generic tasks — **0/4 durations set** ⚠️ BLOCKING
- **`ganttTaskOverrides`:** None ⚠️
- **`fieldPack`:** None (inferred as `native-direct`)
- **Gantt engine:** Generic native-direct path
- **Status: ⚠️ NOT READY** — No durations. Deeper steps needed: MDC plan activation per subscription, ASC pricing tier, auto-provisioning settings.

---

### 6. Microsoft 365 (Unified Audit Log)
- **Priority score:** 74 | **Featured:** No (gap — should be reviewed) | **analytics:** 15
- **`planner.setup_tasks`:** 4 generic tasks — **0/4 durations set** ⚠️ BLOCKING
- **`ganttTaskOverrides`:** None ⚠️
- **`fieldPack`:** None (inferred as `native-direct`)
- **Status: ⚠️ NOT READY** — No durations. M365 Audit nuances missing: retention tier, E3 vs E5 license check, workload selection.

---

### 7. Common Event Format (CEF)
- **Priority score:** 41 (underscored — structural infrastructure) | **Featured:** No ⚠️ | **analytics:** 0
- **`planner.setup_tasks`:** 4 generic tasks — **0/4 durations set** ⚠️ BLOCKING
- **`ganttTaskOverrides`:** Present in `solutions.json` ✅ — but no entry in `gantt-tasks.js` `PER_CONNECTOR_OVERRIDES`
- **`fieldPack`:** `syslog-cef` ✅
- **Gantt engine:** Full CEF-INFRA-01 through CEF-INFRA-05 chain with proper durations ✅. Per-connector PC-01..04 chain generated dynamically.
- **Status: ⚠️ PARTIAL** — Gantt engine is fine. The `planner.setup_tasks` card view lacks durations, and the priority score (41) dramatically undersells this connector's importance. Critical infrastructure for every third-party firewall deployment.

---

### 8. Linux Syslog
- **Priority score:** 51 (underscored) | **Featured:** No ⚠️ | **analytics:** 7
- **`planner.setup_tasks`:** 4 generic tasks — **0/4 durations set** ⚠️ BLOCKING
- **`ganttTaskOverrides`:** None in `solutions.json` or `gantt-tasks.js` ⚠️
- **`fieldPack`:** `syslog-cef` ✅
- **Gantt engine:** Same CEF-INFRA chain as CEF (shared infrastructure) ✅
- **Status: ⚠️ PARTIAL** — Gantt engine OK. Card view has no durations. No `ganttTaskOverrides.sourceConfigSubtasks` (CEF has them, Syslog doesn't — inconsistency to fix).

---

### 9. Microsoft Defender for Identity (MDI)
- **Priority score:** 83 (HIGHEST in catalog) | **Featured:** No ⚠️ | **analytics:** 0
- **`planner.setup_tasks`:** 4 generic tasks — **0/4 durations set** ⚠️ BLOCKING
- **`ganttTaskOverrides`:** None ⚠️
- **`fieldPack`:** None (inferred as `native-direct`)
- **Gantt engine:** Generic native-direct path — insufficient for MDI's complex on-premises sensor deployment
- **Status: ⚠️ NOT READY** — The highest-scoring connector in the catalog is completely un-featured and has the generic 4-task template. MDI-specific steps are non-trivial: sensor deployment on domain controllers, service account provisioning, NNR configuration, AD schema requirements.

---

## Tier 2 — Should Have Tasks for V1 (or Close After)

These connectors have meaningful deployment volume and in most cases already have detailed task content — just missing `duration` values.

| Connector | Analytics | Score | Tasks | Durations | Key Gap |
|---|---|---|---|---|---|
| **Windows Forwarded Events** | 4 | ~67 | 10 detailed ✅ | 0/10 missing ⚠️ | Duration data only |
| **Windows Forwarded Events via AMA** | 4 | ~61 | 10 detailed ✅ | 0/10 missing ⚠️ | Duration data only |
| **Windows DNS Events via AMA** | 5 | ~67 | 8 detailed ✅ | 0/8 missing ⚠️ | Duration data only; key field: `windows-dns-events-via-ama` (not `windows-dns-events`) |
| **Windows Firewall via AMA** | 0 | ~60 | 7 detailed ✅ | 0/7 missing ⚠️ | Duration data only |
| **Sysmon via AMA** | 0 | ~64 | 10 detailed ✅ | 0/10 missing ⚠️ | Duration data only; `ganttTaskOverrides` present ✅ |
| **Azure Firewall** | 11 | 78 | 4 generic ⚠️ | 0/4 missing ⚠️ | No durations, not featured despite score=78 |
| **Cisco ASA** | 2 | ~64 | 4 generic ⚠️ | 0/4 missing ⚠️ | Has `ganttTaskOverrides` in both places ✅; no durations |
| **Microsoft Defender for Endpoint** | 1 | ~73 | 4 generic ⚠️ | 0/4 missing ⚠️ | No durations |
| **Defender for Cloud Apps (MDA)** | 1 | ~73 | 4 generic ⚠️ | 0/4 missing ⚠️ | No durations |

**Note on Tier 2 Windows connectors:** WFE, WFEA, WDNS, WDFW, and Sysmon already have excellent task content — someone did the hard work of writing 7–10 detailed, connector-specific tasks for each. The only fix needed is adding `duration` values (in calendar days) to each task entry in `solutions.json`. This is purely a data entry sprint, not a design or code problem.

---

## Tier 3 — Generic Tasks Acceptable for V1

These connectors are important in many deployments but polishing them post-v1 carries no delivery risk. Their 4-task generic templates are functionally acceptable for a v1 release because the Gantt engine handles their infrastructure via the appropriate field pack (`syslog-cef`, `api-ccp`, or `native-direct`).

| Connector | Analytics | Score | Field Pack | Notes |
|---|---|---|---|---|
| Palo Alto Networks (NGFW, CDL, Prisma) | 3–11 | 55–75 | syslog-cef | `PAN-OS` override in gantt-tasks.js ✅ |
| Fortinet FortiGate | 0 | ~60 | syslog-cef | Most complex CEF connector; post-v1 task depth |
| Check Point | 0 | ~55 | syslog-cef | CEF infrastructure handles setup |
| CrowdStrike Falcon | 2 | 76 | api-ccp | API-based; simple config path |
| AWS | 62 | 61 | api-ccp | 62 analytics rules — should move up; Azure-first priority for v1 |
| Threat Intelligence | 52 | 66 | native-direct | Configurable post-go-live |
| F5 Networks | 1 | ~64 | syslog-cef | Has `ganttTaskOverrides` in `solutions.json` ✅ |
| Defender for Office 365 | 1 | ~73 | native-direct | Low setup complexity |
| Google Cloud Platform (IAM) | 10 | ~74 | api-ccp | Featured ★; post-v1 polish |

---

## Gap Analysis — Tier 1 Connectors Missing Proper Tasks

| Connector | `setup_tasks` Count | Durations | `ganttTaskOverrides` | `PER_CONNECTOR_OVERRIDES` | Blocker Type |
|---|---|---|---|---|---|
| Windows Security Events | 11 | ✅ ALL SET | ✅ Present | ✅ Present | **NONE — READY** |
| Microsoft Entra ID | 4 (generic) | ❌ 0/4 | ❌ None | ❌ None | Durations + depth |
| Microsoft Defender XDR | 4 (generic) | ❌ 0/4 | ❌ None | ❌ None | Durations + depth |
| Azure Activity | 4 (generic) | ❌ 0/4 | ❌ None | ❌ None | Durations (content OK given simplicity) |
| Defender for Cloud | 4 (generic) | ❌ 0/4 | ❌ None | ❌ None | Durations + depth |
| Microsoft 365 | 4 (generic) | ❌ 0/4 | ❌ None | ❌ None | Durations |
| Common Event Format | 4 (generic) | ❌ 0/4 | ✅ Present | ❌ Missing from gantt-tasks.js | Durations; score calibration |
| Linux Syslog | 4 (generic) | ❌ 0/4 | ❌ None | ❌ None | Durations; add `sourceConfigSubtasks` |
| Microsoft Defender for Identity | 4 (generic) | ❌ 0/4 | ❌ None | ❌ None | Durations + MDI-specific depth + featured flag |

**Root Cause:** The `duration` field in `planner.setup_tasks` represents calendar days (real-world elapsed time, not engineer effort hours). It is what the Gantt engine's `getTaskBaseDurationDays()` uses to set bar widths. Without it, the planner falls back to effort-hour estimates, which conflates person-effort with elapsed time and breaks critical-path scheduling for connectors with sequential approval or dependency gates.

---

## Recommendations — What to Fix Before V1

### Sprint 1 (Blockers — must fix before v1 ships)

**1. Add `duration` values to the 8 Tier 1 connector task entries in `solutions.json`**

The fix is 100% data entry. For each generic 4-task template, add a `duration` value (calendar days as a float) to each task. Representative reference values:

| Connector | Suggested task durations (days per task) |
|---|---|
| Azure Activity | 0.25, 0.25, 0.25, 0.25 (it's a 2-hour connector) |
| Microsoft Entra ID | 0.5, 0.5, 0.5, 1.0 |
| Defender XDR | 0.5, 1.0, 0.5, 1.0 |
| Defender for Cloud | 0.5, 1.0, 0.5, 1.0 |
| Microsoft 365 | 0.5, 0.5, 0.5, 1.0 |
| Common Event Format | 0.5, 0.5, 0.5, 0.5 (infra tasks carry the real schedule) |
| Linux Syslog | 0.5, 0.5, 0.5, 0.5 |
| Microsoft Defender for Identity | 0.5, 2.0, 1.0, 1.0 |

**2. Add `duration` values to 5 Tier 2 Windows connectors**

WFE, WFEA, WDNS, WDFW, and Sysmon already have 7–10 detailed tasks. All they need is duration estimates on each task entry. The task content is already excellent — this is pure data fill.

**3. Add MDI-specific task steps to Microsoft Defender for Identity**

The current 4-task generic template is unacceptable for a connector with the highest priority score in the catalog (83). Minimum 6 tasks: Prerequisites check → Sensor deployment on DCs → Service account provisioning → NNR configuration → AD schema validation → Activation verification.

**4. Mark as `featured: true`:** Windows Security Events, Microsoft Defender for Identity, Common Event Format. The current featured set (15 connectors) is inconsistent with the score rankings.

### Sprint 2 (Near-term, post-v1 fast-follow)

**5. Add connector-specific task depth** to Entra ID, Defender XDR, and Defender for Cloud (6–8 tasks each following the Windows Security Events model).

**6. Add `ganttTaskOverrides.sourceConfigSubtasks` to Linux Syslog** — align with the CEF pattern already present for `common-event-format`.

**7. Add Linux Syslog entry to `gantt-tasks.js` `PER_CONNECTOR_OVERRIDES`** — currently CEF has source-config subtasks there but Syslog does not.

**8. Recalibrate priority scores** for CEF (current: 41 → target: 70+) and Linux Syslog (current: 51 → target: 65+). The scoring formula penalizes infrastructure connectors in a way that makes them invisible to customers who don't already know what CEF is.

**9. Populate `environment_scaling`** for the 5 Windows-family connectors (WSE, WFE, WFEA, WDNS, WDFW, Sysmon) — already designed, not yet populated.

---

## Catalog Health Snapshot

| Metric | Value |
|---|---|
| Total solutions | 489 |
| Total connectors (`is_connector: true`) | 332 |
| Featured connectors | 15 |
| Connectors with `planner.setup_tasks` defined | 488 |
| Connectors with ALL task durations populated | **1** (Windows Security Events only) |
| Connectors with ANY task durations populated | **1** |
| Connectors with detailed tasks (> 4 tasks) | **6** (WFE, WSE, WFEA, WDFW, WDNS, Sysmon) |
| Connectors with `ganttTaskOverrides` in solutions.json | 7 |
| Connectors with entry in `PER_CONNECTOR_OVERRIDES` (gantt-tasks.js) | 8 |
| Connectors with `fieldPack` assigned | 43 |

---

## V1 Readiness Verdict

| Connector | Ready? | Blocking Gap |
|---|---|---|
| Windows Security Events | ✅ **READY** | None blocking |
| Microsoft Entra ID | ❌ **NOT READY** | Missing durations; generic template |
| Microsoft Defender XDR | ❌ **NOT READY** | Missing durations; generic template |
| Azure Activity | ❌ **NOT READY** | Missing durations |
| Defender for Cloud | ❌ **NOT READY** | Missing durations; generic template |
| Microsoft 365 | ❌ **NOT READY** | Missing durations |
| Common Event Format | ⚠️ **PARTIAL** | Missing card-view durations; Gantt engine OK |
| Linux Syslog | ⚠️ **PARTIAL** | Missing card-view durations; Gantt engine OK |
| Microsoft Defender for Identity | ❌ **NOT READY** | Missing durations; generic template; not featured |

The Gantt engine itself is production-ready for all field-pack connectors. The v1 gap is entirely in `solutions.json` `planner.setup_tasks` duration fields — a data entry task with no code changes required.


---

# Decision: Planner Architecture Spec — Internal Reference Document Created

**By:** Joi (Documentation Specialist)  
**Date:** 2026-06-12T10:42:10.752+02:00  
**Requested by:** Maria  
**Status:** COMPLETE

## What

Created `docs/planner-spec.md` — a comprehensive internal architecture reference document for the Step 5 Gantt planner system. The document covers 13 sections:

1. Architecture overview and data-flow diagram
2. Field pack system (`FIELD_PACK` enum, `inferFieldPack()` logic, full vs minimal packs)
3. Cribl integration (hybrid grouping model, task substitution, eligibility)
4. Task generation engine (`gantt-tasks.js` — `buildGanttPlan`, phase structure, TASK_CATALOG)
5. Planner data model (`buildGanttPlanData` assembly order, row shape, generated vs standard solutions)
6. Dependency system (`getDependencyEndWeek`, phase sequencing, `previousPhaseTerminalIds` rationale, SVG arrows)
7. Capacity & sizing system (sizing types, server pools, Cribl toggle, `scaleGeneratedInfraDurationHours`)
8. Solution group collapse/expand (state tracking, persistence, `createVisiblePlanData` filter rules)
9. Gantt rendering (Frappe Gantt, `stabilizeGanttRender`, bar colour logic, milestone markers)
10. Detail panel (`renderDetailPanel` structure, inline editing, setup instructions placement)
11. Duration & scheduling (business hours model, business-day scheduling, override persistence)
12. Export & persistence (storage map, plan reset rule, export rows)
13. Key design decisions with rationale (7 decisions covering Cribl grouping, dependency baseline, task engine routing, inline editing, business-day scheduling, Frappe + post-processing, collapse state storage)

## Why this is team-relevant

- New team members (especially K, Luv, Sebastian) need a single reference to understand how the planner's moving parts connect before making changes to gantt-planner.js.
- The Cribl hybrid grouping model and the `previousPhaseTerminalIds` starting-from-Phase-0 pattern are non-obvious architectural choices that have caused bugs before when misunderstood.
- The document consolidates decisions that previously existed only in `decisions.md` entries and inline code comments.

## Notable architecture notes surfaced during research

- `generatedFieldPackSolutions` vs standard solutions: the `fieldPack` field in solutions.json is the opt-in gate for the full task engine. Both paths output rows in the same phase structure.
- `generatedInfraOnlySolutionIds`: solutions with `fieldPack` but whose connector tasks returned empty — get an infra-only group, no per-connector rows.
- `PACK_JOIN_TASK` maps each field pack to its terminal infra task ID; when Cribl is active, syslog-cef connectors point to `CRIBL-INFRA-02` instead of `CEF-INFRA-05`.
- Inline editor flicker protection: `updateLayout()` defers rebuilds while an editor is active; `closeInlineEditor()` flushes the deferred update.


---

# Topology Specification v1.1 Update — 2026-06-11

**Agent:** Joi (Documentation Specialist)  
**Owner:** Maria (madesous_microsoft)  
**Date:** 2026-06-11  
**Status:** ✅ Complete

---

## Summary

Updated `docs/topology-spec.md` to version 1.1, documenting seven major topology visualization changes completed in this session. All changes reflect the current state of `js/modules/topology.js` and are validated against the code.

---

## Changes Documented

### 1. Per-Connector Inline Status Chips
- **What:** Replaced group-level footer status chip with per-solution inline badges
- **CSS:** `.rf-sol-inline-status` with modifiers `--connected` (green), `--connected-idle` (yellow)
- **How:** Each solution item within a SourceNode now displays its own status via `getSolutionStatus()`
- **Impact:** Users see connector status at a glance for every solution, no longer just group-level aggregation

### 2. Infrastructure Status Inheritance
- **What:** PathBox, DCR, Server, and discovered VM nodes now inherit status from their feeding source group
- **Formula:** `infraStatus = sourceStatus === 'new' ? 'new' : 'existing'`
- **CSS:** `.rf-node--new` (dashed, bright) vs `.rf-node--existing` (solid, muted)
- **Impact:** Entire ingestion paths visually align with their source status for better flow clarity

### 3. All Connectors Rendered (No 5-Item Limit)
- **What:** Removed the 5-solution truncation and "+X more" indicator
- **Previous:** `solutions.slice(0, 5)` with overflow badge
- **Now:** 100% of solutions rendered in each source node
- **Impact:** Users see all planned connectors; source nodes scale in height based on connector count

### 4. Dynamic Source Node Heights
- **Formula:** `sourceNodeChrome(60) + solutionCount × sourceItemHeight(32)`, minimum 220 px
- **Examples:**
  - 5 solutions: 60 + 5×32 = 220 px
  - 13 solutions: 60 + 13×32 = 476 px
- **Function:** `estimateRowHeight()` computes per-node height during layout pass
- **Impact:** Diagram scales naturally with connector complexity; uber boxes auto-expand

### 5. Filter Dimming Exclusions
- **What:** When Existing/New filters are active, only individual connector items dim (opacity: 0.2)
- **Excluded:** Uber boxes (`.rf-uberbox-node`) and layer boxes (`.rf-layer-box`) remain fully opaque
- **Logic:** Lines 2735-2761 in topology.js enforce exemption
- **Impact:** Zone groupings remain visually intact even when filtering hides many connectors

### 6. Layout Constants Updated
- **topIntermediaryOffsetY:** 72 → 420 (more vertical space between sources and pipeline layers)
- **LAYER_GAP:** 12 → 20 (increased gap between adjacent layer boxes)
- **Reason:** Improved visual breathing room and layer separation clarity

### 7. Warning Message Removed
- **What:** Removed "⚠ Active table analysis unavailable" diagnostic warning
- **Now:** Reconnect message shows in green (success tone) only
- **Impact:** Cleaner UI; only success-state messages are displayed

---

## Code References

| Change | File | Lines |
|--------|------|-------|
| Status functions | topology.js | 850–869 |
| Dynamic heights | topology.js | 1217–1230 |
| SourceNode inline rendering | topology.js | 2415–2430 |
| PathBoxNode inheritance | topology.js | 2504–2516 |
| Filter logic & exemptions | topology.js | 2735–2761 |
| Layout constants | topology.js | 1466, 2360+ |

---

## Documentation Changes

**File:** `docs/topology-spec.md`

**Version History Entry:**
| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 1.1 | 2026-06-11 | Joi / Maria | Per-connector status, dynamic heights, infra inheritance, filter exclusions |

**Updates:**
- Updated "Last reviewed" date to 2026-06-11
- Added new Section 6: "Infrastructure Status Inheritance"
- Enhanced Node Types table with dynamic height and inheritance details
- Expanded Connector Status Badges documentation
- Added Source Node Height Calculation subsection with formula and examples
- Updated Coordinate System with new topIntermediaryOffsetY value
- Updated LAYER_GAP constraint from 12 to 20 px
- Enhanced Filters subsection with dimming exclusion rules
- Expanded Topology Toolbar section with status message clarity
- Updated Appendix A with sourceItemHeight, sourceNodeChrome constants and timing info

**Sections Renumbered:**
- Former § 6–11 → § 7–12 (Infrastructure Status Inheritance inserted as new § 6)

---

## Testing & Validation

- ✅ All code references verified against topology.js
- ✅ No contradictions found between spec and implementation
- ✅ Layout constants confirmed (grep search for `topIntermediaryOffsetY`, `LAYER_GAP`)
- ✅ Status inheritance logic verified in PathBoxNode, ServerNode, DCRNode, CriblNode
- ✅ Filter exclusion logic confirmed in event listener (lines 2735–2761)

---

## Team Notes

**For Reviewers:**
- This is a documentation-only change; no code logic was altered
- The spec now serves as the authoritative single source of truth for topology behavior
- All seven changes are already live in production code and working correctly
- Spec is ready for customer documentation or design review

**Future Work:**
- Monitor § 12 "Pending Changes" for Cribl routing refactor (bug-cribl-001)
- Grid-wrap validation for discovered VMs (bug-topo-004) — in progress

---

## Appendix: Full Change Summary

This update brings the Topology Specification from version 1.0 (initial from code review) to version 1.1 (reflecting live session changes). The specification now fully documents:

1. How per-solution status badges work and when they appear
2. How entire infrastructure paths inherit status from source groups
3. Why all connectors are now always visible (vs 5-item truncation)
4. The mathematical formula for dynamic node heights
5. Which node types are exempt from filter dimming
6. Updated spacing and layout constant values
7. The removal of the unused "table analysis unavailable" warning

The spec remains the single source of truth for topology visualization rules and is maintained alongside code changes.


---

# K bug fixes — Gantt field-pack integration

**Date:** 2026-06-03T18:16:38+02:00
**Author:** K
**Status:** Implemented

---

## Summary

`gantt-planner.js` now imports and uses `js/modules/gantt-tasks.js` as the task-generation source for connectors that carry explicit `fieldPack` assignments, while connectors without `fieldPack` continue through the legacy per-solution planner path.

---

## Decisions

- Keep the existing Step 5 planner shell intact: kickoff/setup rows, legacy solution-group UX, collapse state, custom task persistence, and closeout tasks still come from `gantt-planner.js`.
- Inject the field-pack engine in two places only:
  1. shared infrastructure rows are materialized once from `buildGanttPlan()` Phase 1 tasks;
  2. per-connector tasks are transformed into `planner.setup_tasks` for each field-pack solution so the existing solution-group renderer keeps working.
- Treat explicit `solution.fieldPack` as authoritative in `inferFieldPack()`, with heuristics retained strictly as fallback for connectors that still lack the new metadata.
- Keep `microsoft-sysmon-for-linux` aligned with the Linux/syslog path in the task engine, matching topology's Linux classification while preserving `solutions.json` as `syslog-cef`.

---

## Impact

- The previously dead `gantt-tasks.js` engine is now exercised by the planner.
- Shared infra chains now render before generated connector tasks without breaking legacy solution planning.
- The CEF dependency chain, Sysmon classification, and WFE abbreviation collision are corrected in the engine source of truth.


---

# K — workspace connector accuracy

**Date:** 2026-06-05T12:15:22.150+02:00
**Author:** K
**Status:** Implemented

## Context
- Sentinel workspace discovery was under-counting and over-counting connectors because the planner filtered `dataConnector` resources too aggressively and silently dropped anything that did not map cleanly into the local solution catalog.
- Users compare Step 4 directly against the Sentinel Data Connectors blade, so hidden unmatched connectors and fallback-only table inference made the topology feel incorrect.
- The existing Step 4 toolbar, connected/new badges, and dark-theme layout must stay intact.

## Decision
Treat every workspace `dataConnector` resource returned by Sentinel as connected inventory, union it with table-derived connector hints, and surface unmapped connectors as synthetic `Other / Unmatched` topology entries with a visible diagnostic summary.

## Rules
- Keep `filterActiveWorkspaceDataConnectors()` as a confidence-only helper; do not use it to exclude API connector resources from discovery.
- Deduplicate API and table-derived connector signals by connector kind / friendly-name before mapping so the topology does not double-count the same connector.
- Preserve the existing `connectorKindToSolutionIds` table, but whenever a connector cannot be mapped, render it in topology as a synthetic connected item rather than silently dropping it.
- Show the connector breakdown both in console logging and in a topology-header tooltip/badge so users can reconcile workspace totals without opening dev tools.

## Implementation Notes
- `js/app.js` now builds the API + table union, computes discovery diagnostics, and passes the summary into the solutions module for downstream UI use.
- `js/modules/solutions.js` now stores synthetic unmatched connectors plus connector-summary metadata alongside the resolved connected solution IDs.
- `js/modules/topology.js` reads that metadata to render the `Other / Unmatched Connectors` group and the topology header summary badge without changing the existing filter/reset toolbar placement.

## Files
- `js/app.js`
- `js/modules/solutions.js`
- `js/modules/topology.js`
- `css/style.css`


---

# K — Connector count fix

**Date:** 2026-06-05T11:36:58.415+02:00
**Author:** K
**Status:** Implemented

## Context
- Step 1 workspace discovery feeds Step 3 `connectedSolutionIds` so the planner can mark already-connected data sources.
- The code already calls the Sentinel `Microsoft.SecurityInsights/dataConnectors` endpoint, but it was unioning every returned connector resource with synthetic connector guesses built from active workspace tables.
- Generic active tables such as `CommonSecurityLog` can map to multiple local solutions, which inflates the connected count far beyond what the Sentinel Data Connectors blade shows.

## Decision
Use active Sentinel data connector resources as the primary source of truth for workspace-connected solution state.

## Rules
- Treat a connector resource as active only when it exposes an explicit connected/enabled signal (`properties.connected`, enabled data-type states, status/connection-state fields, or last-received-data markers).
- Only map filtered active connector resources into `connectedSolutionIds` when the workspace returns any active connector resources.
- Use table-derived synthetic connectors only as a fallback when the workspace reports no active connector resources at all.
- Keep logging both raw connector-resource counts and filtered active-resource counts so future debugging can compare API payloads against UI totals.

## Implementation Notes
- `js/app.js` owns the new active-connector filtering helpers and the revised workspace discovery / auto-reconnect merge strategy.
- `js/modules/solutions.js` remains the mapper from connector lookup values to planner solution IDs; the fix reduces bad inputs before that mapper runs.


---

# Decision: Active/Stale/New Connector Status with Last-Log Timestamps

**Date:** 2026-06-09T15:36:29+02:00  
**Author:** K  
**Status:** Implemented

## Context

Users were confused by "Connected" badges in the topology — a connector marked Connected only means the DCR/connector resource *exists* in the workspace. It says nothing about whether logs are actually flowing. The app had no way to distinguish a correctly ingesting connector from one that was configured months ago and has gone silent.

## Decision

Introduce a tri-state connector status system tied to real log timestamps from the workspace Usage table:

| State | Badge | Condition |
|-------|-------|-----------|
| **Active** | `✅ Active · Xh ago` | `max(TimeGenerated)` within last 24 h |
| **Stale** | `⚠️ Stale · Xd ago` | DCR exists + logs received, but NOT within 24 h |
| **New** | `✨ New` | Planned, not yet deployed (no DCR) |

The existing `✓ Connected` badge is kept as a safe fallback when the Usage query fails.

## Implementation

### KQL query change (app.js)
The Usage query now projects two columns instead of one:
```kql
Usage | where TimeGenerated > ago(14d)
| summarize TotalMB=sum(Quantity), LastLog=max(TimeGenerated) by DataType
| where TotalMB > 0 | project DataType, LastLog
```
`queryWorkspace` was extended with a `returnRows: true` option (default `false` for backward compat) returning `{ columns, rows }` — no change to callers that use the single-column path.

### Data pipeline (app.js → solutions.js → topology.js)
1. Call sites parse `rows` into `dataTypeList` (strings) + `lastLogMap` (`Map<DataType, ISO>`)
2. `buildConnectorsFromDataTypes(dataTypes, lastLogMap)` attaches `._lastLog` to each connector object
3. `selectWorkspaceDiscoveryConnectors` passes `lastLogMap` through
4. `resolveConnectedSolutionIds` — when resolving connector → solutionIds, for any connector carrying `._lastLog`, that timestamp is copied to `localSolutionLastLogMap` for each matched solutionId
5. `setConnectedSolutionsFromWorkspace` stores the result as module-level `solutionLastLogMap` and exposes it as `window.connectorLastSeenMap` (plain object keyed by solutionId)

### Topology badge rendering (topology.js)
`getConnectorStatusMeta(solution)`:
- If not connected → `new`
- If connected but no entry in `window.connectorLastSeenMap` → `connected` (legacy safe fallback)
- If entry exists and diff ≤ 24 h → `active` with relative time
- If entry exists and diff > 24 h → `stale` with relative time

`formatLastSeen(isoDate)` is a pure utility returning `"Xm ago"` / `"Xh ago"` / `"Xd ago"`.

### CSS colors (dark theme)
- Active: green `#4caf50` background tint + badge
- Stale: amber `#ff9800` background tint + badge
- Light theme overrides included for both states

### Graceful degradation
If the KQL query fails (and Tables ARM API fallback fires), `lastLogMap` stays `null`, connectors get `._lastLog = null`, resolution produces an empty `solutionLastLogMap`, and topology shows `✓ Connected` with no timestamp — exactly the same UX as before this change.

### Cache-busting
`index.html` bumped from `?v=3` to `?v=4` for both `style.css` and `app.js`.

## Alternatives Considered

- **Query a separate `table | summarize max(TimeGenerated)`** — rejected because that requires an additional per-table KQL call; the Usage summarize already gives us max ingestion time per DataType in a single query.
- **Store lastLog on `window.connectorLastSeenMap` keyed by DataType** — rejected because topology works with solutionIds, not DataTypes; bridging would require topology to know the solutions.json `tables` array, which doesn't exist in the current data model.
- **Import `getSolutionLastLog` into topology.js** — possible but the `window.connectorLastSeenMap` plain-object approach avoids a new ES module import dependency and keeps topology.js self-contained.


---

# K — tables are not connectors

**Date:** 2026-06-05T12:35:08.459+02:00
**Author:** K
**Status:** Implemented

## Context
- Workspace discovery was unioning real Sentinel `dataConnector` resources with synthetic connector guesses derived from active workspace tables.
- That caused Step 1 status copy and Step 4 topology to over-count dramatically and filled `Other / Unmatched Connectors` with table names instead of actual connector resources.
- Users expect planner counts to stay close to the Sentinel Data Connectors blade, while keeping unmatched real connectors visible.

## Decision
Use the Sentinel `Microsoft.SecurityInsights/dataConnectors` API as the only normal source of workspace connector inventory. Treat table-derived connector guesses as a heuristic fallback only when the API returns zero connector resources.

## Rules
- Pass only deduplicated API connector resources into workspace solution resolution when the API returns any connectors.
- Keep `Other / Unmatched Connectors` for real API connector resources that do not map to the local solution catalog.
- If the API returns zero connectors, allow a table-derived fallback but label it clearly as an estimate.
- Keep connected/new badges, topology filters, and saved layout/reset behavior unchanged.

## Implementation Notes
- `js/app.js` now selects discovery connectors from the API first, uses table heuristics only on zero-API fallback, and emits short status messages based on connector counts.
- `js/modules/solutions.js` now carries a `usedTableFallback` summary flag alongside connector counts for downstream UI.
- `js/modules/topology.js` now reports workspace connector totals from discovery summary metadata instead of table-inflated topology counts.

## Files
- `js/app.js`
- `js/modules/solutions.js`
- `js/modules/topology.js`


---

# K decision: Cribl checkbox fixes

- Default Cribl ingestion to checked only when the saved seed never explicitly stored `criblIngestion`; this preserves deliberate opt-outs while treating older drafts as pre-Cribl data.
- Reused the existing final `renderDraftState(draft)` call as the initial Cribl UI sync, because it already runs after the grid and Windows relation fieldset are created and now applies the disabled styling safely.


---

# K — Cribl collection-layer rendering

- **Date:** 2026-06-10T13:15:00+02:00
- **Owner:** K
- **Scope:** Step 4 topology rendering for Cribl-routed connectors

## Decision
- Remove the standalone Cribl-only topology fallback. If `cribl-stream` is selected without any routed source, Step 4 shows a notice state instead of fabricating a source path.
- Render Cribl as a shared collection-layer intermediary, not a Sentinel sidecar. Use explicit band-scoped node IDs (`shared-cribl-node-top`, `shared-cribl-node-bottom`) so routed sources map to the correct shared Cribl node.
- Treat Cribl-routed shared rows as DCR-bearing paths and render the existing Cribl shared DCR plans, producing the visual flow `Source → Cribl → Custom DCR (Logs Ingestion API) → Sentinel`.

## Why
- The topology spec’s transport-layer model requires Cribl to live in the Collection Layer, not as a top-level source or workspace-adjacent sidecar.
- Band-scoped IDs remove the dangling-edge risk Sebastian flagged if routed sources ever span multiple bands.
- Reusing the existing `criblWindowsDcrPlan`, `criblLinuxDcrPlan`, and `criblSyslogDcrPlan` preserves the current route-aware data model instead of introducing a parallel Cribl-only renderer.

## Impact
- Cribl no longer creates its own uber box or standalone topology path.
- Sentinel no longer needs a special right-side sidecar handle for Cribl traffic.
- Cribl-routed firewall and AMA paths now visibly satisfy the intermediary-hop requirement before reaching DCRs.


---

# K decision: cyan plus for pending selections

- Switched the generic `.solution-item-check:checked` state to a dedicated cyan treatment (`#22d3ee` / rgba) instead of `--accent`, because the current accent token is purple and would not meet the requested visual distinction.
- Added an explicit `.already-connected .solution-item-check:checked` safeguard so connected cards always keep the existing green check styling even when the checkbox is technically checked.


---

# Decision: Discovered VM Topology Rendering

**Date:** 2026-06-10T11:18:31+02:00  
**Author:** K (Frontend Dev)  
**Status:** Implemented

## Context

Sebastian is building DCR-association discovery in `app.js` that will produce `window.discoveredInfrastructure` with real customer VM data (names, OS, EPS, role, source devices). The topology step needs to render these VMs as distinct "existing infrastructure" nodes so planners can see what's already deployed before planning new collectors.

## Decisions

### 1. Purely additive, no existing path changes

The new code path (`buildDiscoveredInfrastructureNodes()`) only runs when `window.discoveredInfrastructure?.vms` has entries. If the global is absent, undefined, or an empty array, the function returns `{ nodes: [], edges: [] }` and the topology renders exactly as before. Zero regression risk.

### 2. Green = existing, blue = planned

Existing collector VMs (planned in the planner) use blue (`pc.color` from `PATH_CONFIGS`). Discovered VMs use solid green (`#22c55e`) to clearly signal "this already exists in your tenant." Arc machines get a dashed green border (`.rf-discovered-vm-node--arc`), mirroring the existing planned-collector dashed blue pattern.

### 3. Positioning: reuse planned collector Y, offset X

When a planned collector VM is already placed in `collectorVmPlacementById` for the same band, discovered VMs inherit that Y so they appear side-by-side. The X is offset by `collectorVmWidth + DISC_VM_GAP` to avoid overlap. When no planned collector exists, Y falls back to `getTopLayerY(max(1, topDcrLayerIndex-1))`.

### 4. Role-to-band mapping

| Role | Band |
|------|------|
| `syslog-collector`, `cef-collector`, `hybrid-syslog` | top (syslog_cef rows) |
| `windows-events`, `hybrid-windows` | top (windows_events rows) |

If both syslog and windows groups exist, windows VMs are staggered one `intermediaryLayerGapY` below syslog to avoid vertical overlap.

### 5. Summary node beside Sentinel

A compact `discoveredInfraSummary` node is placed at `sentinelCenterX + sentinelNodeWidth/2 + 48, sentinelY` — right of the Sentinel node. It shows Linux/Windows/Arc counts and total EPS. This gives planners a fast overview without needing to read each individual VM node.

### 6. Source devices are display-only

`vm.sourceDevices` (firewall hostnames) are shown as text inside the VM node (`📡 PA-5260, ...`), but no edges are drawn from those device names to the VM node — the device names are not ReactFlow node IDs and cannot be reliably resolved to existing source nodes. This is intentional; the source→VM routing is implicit from the role.

## Files Changed

- `js/modules/topology.js` — `buildDiscoveredInfrastructureNodes()` function, `DiscoveredVmNode` and `DiscoveredInfraSummaryNode` React components, updated `nt` nodeTypes map
- `css/style.css` — `.rf-discovered-vm-node`, `.rf-discovered-vm-node--arc`, `.rf-discovered-infra-summary` and sub-element classes with dark+light theme support

## Contract with Sebastian

`window.discoveredInfrastructure` must be set before `renderTopology()` is called for the first render, OR Sebastian must call the topology re-render after the async discovery completes. Topology reads the global synchronously at render time — no subscription/listener mechanism needed.


---

# Decision: Multi-Pack Duration Scaling Architecture

**Date:** 2026-06-11  
**Author:** K  
**Status:** Implemented  
**File:** `js/gantt-planner.js`

---

## Context

`scaleTaskDurationDays()` originally only scaled tasks for the `windows-security-events` solution. With multiple field packs now generating tasks (syslog-cef, wec-wef, windows-ama), duration scaling needed to extend across all of them.

---

## Key Architectural Decision: Two Scaling Paths

The Gantt planner has **two distinct task rendering paths**, each requiring a separate scaling hook:

### Path 1 — Solution tasks → `scaleTaskDurationDays()`
Covers: solution-specific planner tasks (e.g., `wse-arc-onboarding`), and per-connector generated tasks (`{abbrev}-01..04`) after they are wrapped by `createEngineBackedSolution()`.

### Path 2 — Shared infra tasks → `addGeneratedInfrastructureRows()`
Covers: `WIN-INFRA-xx`, `CEF-INFRA-xx`, `WEC-INFRA-xx` shared tasks. These bypass `scaleTaskDurationDays()` entirely — duration is set via `businessHoursToWeeks(durationHours)` directly.

**The original spec requested extending `scaleTaskDurationDays()`, which is correct for Path 1.  
Path 2 required a new helper: `scaleGeneratedInfraDurationHours(task, capacityProfile)`.**

---

## Scaling Rules Implemented

### Windows AMA (Path 1 — generalized)
- **Before:** gated on `solutionId === 'windows-security-events'`  
- **After:** applies to any solution where `capacityProfile.type === 'windows' && populationKind !== 'wec'`
- Arc onboarding: threshold 15 on-prem servers, step 10, +1 day/step
- Deploy AMA/DCR: threshold 15 total servers, step 10, +0.5 days/step (label: includes `'deploy ama'`)
- Validation: threshold 20 servers, step 20, +0.5 days/step

### WEC/WEF (Path 2 — new)
- Capacity source: `capacityProfile.type === 'windows' && populationKind === 'wec'`, `result.servers`
- `WEC-INFRA-01` (design topology): threshold 10 WEC servers, step 10, +4h/step
- `WEC-INFRA-02` (deploy WEC servers): threshold 10, step 10, +8h (1 day)/step
- `WEC-INFRA-03` (Arc onboarding): threshold 10, step 10, +8h (1 day)/step

### Syslog/CEF (Path 1 + Path 2 — new)
- Capacity source: `capacityProfile.type === 'firewall'`, `result.vmCount`
- **Path 2** `CEF-INFRA-01` (provision forwarders): threshold 2 VMs, step 2, +4h/step
- **Path 2** `CEF-INFRA-04` (configure rsyslog): threshold 2 VMs, step 2, +1h/step
- **Path 1** PC-02 source-config tasks: threshold 5 VMs, step 5, +0.5 days/step

---

## Known Limitation: Syslog/CEF Device Count

The spec calls for scaling PC-02 "Configure source device" by **number of source devices** (e.g., 50 firewalls vs 5). However, the current capacity model for `firewall` type tracks **EPS and forwarder VM count** — not a source device count.

**Workaround:** forwarder VM count (from EPS) is used as a proxy for source volume.  
**Future improvement:** add a `device_count` or `source_count` field to the firewall sizing form so that per-device scaling is accurate. This would affect both the CEF-INFRA shared tasks and per-connector PC-02 tasks.

The same proxy applies to `CEF-INFRA-01` and `CEF-INFRA-04` in the shared infra path — scaling is driven by the **representative solution's** forwarder VM count (first selected syslog/CEF solution), not an aggregate across all selected CEF sources.

---

## Files Changed
- `js/gantt-planner.js`
  - `scaleTaskDurationDays()` — generalized Windows AMA, added syslog-cef per-connector scaling
  - `scaleGeneratedInfraDurationHours()` — new helper for shared infra task scaling
  - `addGeneratedInfrastructureRows()` — resolves pack capacity profile, calls new helper


---

# K — Expired workspace connection UX

**Date:** 2026-06-04T11:55:30.000+02:00
**Author:** K
**Status:** Implemented

## Context
- Step 1 lets users connect an Azure workspace and Step 3 reuses mapped `connectedSolutionIds` to render green connected badges.
- The app persists connector mappings in localStorage, but the Azure access token is in-memory only.
- That mismatch can leave cached green ticks visible after reload or token expiry, even though there is no active workspace connection.

## Decision
Treat cached connector mappings as invalid the moment the workspace connection is stale or expired.

## Rules
- Persist only non-secret workspace connection metadata needed for stale-state detection (`status`, `selectedWorkspace`, `tokenExpiresAt`, `lastValidatedAt`, warning message).
- Never persist the Azure bearer token.
- If cached connected-solution IDs are restored without an active token, immediately mark the connection expired, clear the connected IDs, and show a global warning banner.
- If any Azure workspace discovery call returns 401 / unauthorized, use the same expired-state path: clear connected IDs, reset the picker UI, and require reconnect.
- The expired-state banner is dismissible for the current page view only; it must reappear after reload while the expired state persists.

## UX Pattern
- Show a sticky warning bar above the app shell with amber styling, an alert icon, reconnect CTA, and dismiss control.
- Mirror the same state in the welcome card status text so the reconnect path is visible where the user entered the token.
- Remove stale green connector badges by clearing `connectedSolutionIds` rather than leaving environment data looking current.

## Implementation Notes
- `index.html` owns the welcome-page workspace copy and the banner host markup.
- `css/style.css` owns the warning banner and reconnect button styling.
- `js/app.js` owns token expiry decoding, unauthorized response handling, banner state, and stale cached-connection invalidation.


---

# K Decision: Four-Bug Fix (2026-06-10)

**By:** K (Frontend Dev)  
**Date:** 2026-06-10T10:20:00+02:00  
**Requested by:** madesous

## Summary

Four bugs fixed across `topology.js` and `solutions.js`. All fixes are surgical and do not change any unrelated logic.

---

## Bug 1 — `classifySolution` must check `fieldPack` (topology.js)

**Decision:** `fieldPack === 'syslog-cef'` is added as the _first_ condition in the syslog_cef branch of `classifySolution`, before the existing infra/tag checks. This mirrors the identical check already present in `solutionUsesCollectorVm` at line 1555 and ensures firewall solutions (Zscaler, CheckPoint, FortiGate, Barracuda CloudGen) that carry `fieldPack: "syslog-cef"` but lack `linux-forwarder` in infra are correctly classified as `syslog_cef`, routed into the syslog_cef entry group, and connected to the Linux VM collector node.

---

## Bug 2 — Stale localStorage connected-solution state (BUG-ENV-002)

**Decision:** A two-part session guard is used rather than switching to `sessionStorage` for the whole key (which would break reload continuity for active sessions).  
1. `setConnectedSolutionsFromWorkspace` sets `sessionStorage.sentinelPlanner.activeWorkspace = '1'` on every live workspace sync.  
2. At module-level init in `solutions.js`, if the sessionStorage flag is absent, `localStorage.removeItem(CONNECTED_SOLUTIONS_STORAGE_KEY)` is called before `app.js` can read it.  
This clears ghost badges in fresh tabs/sessions while preserving the expected reload-continuity behaviour for users actively connected to a workspace.

---

## Bug 3 — Linux environment never recommends Syslog (BUG-SOL-001)

**Decision:** `matchesVendorSignature` now extracts `fieldPack` from the solution object (same pattern used in capacity/topology helpers) and the `linux` case adds `fieldPack === 'syslog-cef'` and `tags.includes('syslog')` alongside the existing `solutionId === 'linux-syslog'` check. This ensures the "Syslog" connector (id `linux-syslog`, fieldPack `syslog-cef`, tag `syslog`) is recommended for Linux environments regardless of its display name.

---

## Bug 4 — GCP incorrectly recommends Google Workspace (BUG-SOL-002)

**Decision:** The `gcp` case is refactored to a block statement with an explicit `isWorkspace` negative filter. Solutions whose id contains `workspace` or `gsuite`, or whose tags include `workspace`, are excluded even if they also match a GCP signal. The positive `isGcp` check is extended with `tags.includes('google-cloud')` and `tags.includes('google cloud platform')` for broader GCP tag coverage.

---

## Cache Bust

`index.html` updated from `?v=9` → `?v=10` for `css/style.css` and `js/app.js`.


---

# Decision: Gantt FS Dependency Arrows — Implementation Choices

**By:** K (Frontend Dev)
**Date:** 2026-06-11T12:38:35Z
**Status:** Implemented

---

## Decision: Arrows render *behind* task bars (not in front)

Dependency arrows are inserted into a `g.gantt-dependency-layer` that is placed **before** the Frappe bars parent group in the SVG, so bars visually overlay the arrow endpoints. This keeps the chart readable — bars remain prominent and arrows are connective guides, not foreground elements.

---

## Decision: Single `<marker>` in `<defs>`, never recreated

The arrowhead SVG marker (`id="gantt-dep-arrowhead"`) is created once and stored in `<defs>`. It is not removed on each `inspect()` redraw cycle. Only the `g.gantt-dependency-layer` paths are cleared and redrawn. This avoids flicker and the overhead of re-creating the marker every render cycle.

---

## Decision: `pointer-events: none` on the entire dependency layer

The `g.gantt-dependency-layer` has `pointer-events: none` in CSS. Hover interactions are implemented by binding `mouseenter`/`mouseleave` on the existing bar-wrapper elements (not the arrow paths). This ensures arrows never block clicks/hovers on bars.

---

## Decision: Hover-highlight bindings are one-time per bar-wrapper lifetime

Hover event listeners are guarded by `wrapper.dataset.depArrowHoverBound`. Once bound, they are never rebound. The handlers close over the `layer` DOM element (which persists across redraw cycles). On each hover, `layer.querySelectorAll(...)` finds the current cycle's paths. This avoids listener accumulation across inspect() cycles.

---

## Decision: Elbow routing — fixed 8px horizontal offset before vertical segment

The elbow connector uses a fixed `ELBOW_OFFSET = 8px` horizontal extension from the predecessor bar's right edge before going vertical. This prevents the vertical segment from visually touching/clashing with the bar's right edge. Value chosen to match the existing Frappe Gantt bar padding (`padding: 14`).

---

## Decision: Skip arrows for collapsed tasks silently (no error state)

If a predecessor or successor bar-wrapper is absent from the DOM (because its group is collapsed), `svg.querySelector('.bar-wrapper[data-id="..."]')` returns `null` and the arrow is skipped. No warning is emitted. This is correct behavior — collapsed group → no visible bar → no arrow.


---

# K — Phase 0 layer uber boxes

**Date:** 2026-06-10  
**Status:** Implemented for review

## Decision

Render the new topology layer uber boxes as **full-width background bands per occupied segment** (`top`, `bottom`, `center`) rather than as one continuous rectangle per conceptual layer.

## Why

The current Step 4 topology is intentionally symmetric around the Sentinel workspace: top sources/collectors/DCRs sit above Sentinel, while bottom sources/collectors/DCRs sit below it. Phase 0 explicitly forbids moving nodes, so a single global "Sources" or "Transformation" rectangle would overlap unrelated layers and make the diagram harder to read.

Segmented bands preserve the current geometry while still making the four conceptual layers visible:

- **Sources** wraps source nodes plus the existing zone uber boxes
- **Collection** wraps collectors, server/path nodes, Cribl, and discovered VM cards
- **Transformation** wraps DCR nodes
- **Workspace** wraps Sentinel plus the discovered infra summary

Each band spans the current diagram width, stays non-interactive (`pointer-events: none`), and renders behind the zone boxes (`z-index: -2` vs `-1`).

## Follow-up

When P1-P4 move nodes into their final topology-spec positions, the segmented implementation can collapse into one rectangle per conceptual layer if the geometry becomes strictly ordered top-to-bottom.


---

### 2026-06-02T14:20:53Z: GitHub logo implementation pattern
**By:** K
**Scope:** Step 2 environment cards, Step 3 solution badges, Step 4 topology source/Cribl nodes

- Load vendor/product logos from remote GitHub raw URLs only; do not add local image assets for this feature.
- Always keep an existing emoji or generic icon fallback in the DOM/UI path so the wizard stays usable when a remote logo 404s or GitHub is unreachable.
- For Step 2 use DOM-bound `load`/`error` listeners on static markup; for Step 4 use React image handlers inside the node components; avoid inline event attributes to stay aligned with the app's CSP-safe DOM rules.
- Prefer dark-theme-friendly logo surfaces, and use a lighter badge only where a vendor mark (for example AWS) needs contrast against the planner's dark UI.


---

# K — Gantt progress shading

**Date:** 2026-06-09T15:43:54.258+02:00
**Author:** K
**Status:** Implemented

## Context
- Step 5 renders planner bars as SVG rectangles in `js/gantt-planner.js`.
- Group and summary rows need a meaningful partial-progress signal instead of the old binary 0/100 overlay.

## Decision
Treat solution-group progress as completion across leaf tasks inside the group, not the summary placeholder rows, so grouped subtasks are counted once and the shaded portion reflects real completed work.

## Implementation Notes
- Summary rows compute progress from their direct `parentId` children.
- Individual tasks keep the simple 100 / 50 / 0 mapping for Completed, In Progress/In Review, and Planned/Skipped.
- Partial bars use a lighter base fill plus a darker left-side overlay for the completed portion.

## Files
- `js/gantt-planner.js`
- `css/style.css`
- `js/app.js`


---

# K — Workspace validation CTA gate

**Date:** 2026-06-05T11:48:00.721+02:00
**Author:** K
**Status:** Implemented

## Context
- Step 1 lets users pick a Sentinel workspace before they continue into planning or resume directly at Topology.
- Workspace selection kicks off async connector discovery, but the welcome CTAs stayed clickable before that validation completed.
- That timing window could show the "you haven't selected a workspace" warning even though the user had already picked one and the validation call was still running.

## Decision
Treat workspace selection as a pending validation state that blocks welcome-page progression until the active workspace validation request settles.

## Rules
- The moment the workspace selection changes, clear the previously confirmed workspace and connected-solution state.
- While workspace validation is pending, disable both `Start planning` and `Resume at Topology` and show a loading spinner on the buttons.
- Only re-enable those CTAs after the active validation request completes successfully or fails.
- Guard workspace validation with a monotonically increasing request id so stale async responses cannot re-enable the buttons or restore an older workspace selection.

## Implementation Notes
- `js/app.js` owns the validation-pending state, request-id guard, and welcome CTA enablement.
- `css/style.css` owns the button loading state styling.


---

# K — topology and gantt fixes

## Decisions

1. **Syslog/CEF shared DCRs now anchor to the collector VM, not the source column.**
   - The collector node was already being created, but the shared Syslog/CEF DCR stack was still centered on the source row.
   - That made the collector-to-downstream wiring route back toward the source lane instead of reading as a collector hop.
   - I changed the shared DCR anchor for standard Syslog/CEF flows to use the collector VM center and rendered the collector hop with dashed edges.

2. **Connector last-log badges now use the freshest timestamp from both Usage data and connector metadata.**
   - The Usage query was running, but API-backed connectors could still miss `_lastLog` because table-derived connector rows were being suppressed once an API connector already covered that product.
   - I now enrich API connectors with last-log timestamps from their mapped data types and any reported `lastDataReceivedDataTypes`, then keep the freshest solution-level timestamp.
   - Topology is explicitly re-rendered after workspace discovery completes so status badges refresh as soon as data arrives.

3. **The Gantt “tree line” complaint is most likely about dependency arrows, not a custom tree renderer.**
   - In `gantt-planner.js`, the visible chart arrows come from Frappe Gantt dependency links.
   - The long vertical runs are consistent with shared prerequisite tasks driving later connector work across groups, not with a separate bespoke hierarchy-line drawing routine. In the current plan model, `Create Windows Security Events DCR` fans out to six downstream tasks, which explains why that arrow visually continues far beyond its local group.
   - I did not change Gantt dependency rendering in this pass because the topology issues were higher priority and the Gantt behavior needs a product decision (hide/reduce cross-group arrows vs redesign dependency presentation).


---

# K — topology straight lines

**Date:** 2026-06-02T11:20:47.206+02:00
**By:** K
**Status:** PROPOSED

## Decision
Use hard step-routed topology edges and allow sentinel-aligned source rows (`azure_native`, `direct`) to break out of the main in-zone horizontal packing so their source cards can sit directly under the intermediary box they feed.

## Why
The previous single-row zone packing forced Azure/native source cards off-axis from their downstream boxes, which made otherwise-simple links render with avoidable bends and curves.

## Impact
- Azure and SaaS uber-boxes can grow taller/wider when a straight alignment row is needed.
- `Diagnostic Settings` / native connector paths can now render as straight vertical segments where the geometry allows it.
- Shared-plan routes keep the existing topology structure, but all edges now prefer crisp 90-degree step routing.

## Files
- `js/modules/topology.js`
- `css/style.css`


---

# K — topology UX enhancements

**Date:** 2026-06-05T12:03:53.524+02:00
**Author:** K
**Status:** Implemented

## Context
- Step 4 topology is rendered in `js/modules/topology.js` with React Flow and dark-theme styling from `css/style.css`.
- Users want every connector visible inside each source group, even when that makes the source box or zone box taller.
- The topology also needs a lightweight way to compare already-connected vs planned connectors without changing the approved topology architecture.

## Decision
Implement a Step 4 topology toolbar with connector filters and layout reset, persist draggable node positions in workspace-scoped localStorage, and size source-group rows from the full connector count instead of truncating the list.

## Rules
- Keep `All` as the default topology filter whenever Step 4 is freshly rendered from wizard navigation.
- Render the filter/reset toolbar as a sibling above `#architectureDiagram` so exports keep capturing only the topology canvas.
- Save and restore only draggable React Flow node positions; use the current workspace identity when available to scope the layout key.
- Show every connector row in source nodes and let the row-height estimator expand zone uber-boxes to fit the full list.

## Implementation Notes
- `renderTopology()` now owns the filter state, toolbar rendering, empty-state copy, and workspace-scoped layout persistence helpers.
- Standard source rows use a connector-count-based height estimate so Azure/Microsoft/SaaS group boxes stay large enough when lists grow.
- The reset action clears the saved layout key and re-renders the current filtered topology with the default auto layout.

## Files
- `js/modules/topology.js`
- `css/style.css`


---

# K — Workspace connector state

## Context
- Step 3 solution cards can show a green connected state based on `connectedSolutionIds`.
- Those IDs are restored from localStorage on page load for reload continuity.
- Reconnecting to Azure or changing subscription/resource group resets workspace selection before any new workspace connector data is loaded.

## Decision
Treat connector connected-state as strictly workspace-scoped UI state.

## Rule
- If no workspace is currently selected, no solution card may render as already connected.
- `connectWithToken()` success must clear `connectedSolutionIds` after subscriptions load.
- `onSubscriptionChange()` must clear `connectedSolutionIds` when it invalidates the current workspace.
- `onRgChange()` must clear `connectedSolutionIds` when it invalidates the current workspace.
- Restoring `connectedSolutionIds` on page load remains acceptable only for reload continuity until the user changes tenant/workspace selection.

## Implementation note
This keeps the convenience of reload persistence without letting stale connector badges survive across tenant/workspace resets.


---

# Gantt Parallel Rendering Fix — Review Findings

**Date:** 2026-06-08T12:06:13.373+02:00  
**Author:** Luv  
**Type:** QA finding — code review  
**Affects:** `js/gantt-planner.js` lines 3835–3862 (`buildGanttPlanData`)

---

## Verdict: ACCEPT with one caveat (state migration risk — existing saved plans only)

---

## What was reviewed

The fix in `[1, 2, 3].forEach` connector scheduling loop that:
- Replaced advancing `baselineCursor` with fixed `parallelStartWeek` for all connectors in the same phase bucket
- Set `previousPhaseBaselineEnd = Math.max(...)` across all connector estimated end times

---

## What looks good ✅

### 1. `usesGeneratedTasks=true` — joinRowId delay still correct
The `joinRowId` appears in `defaultDependencies` for generated-tasks connectors. The downstream `applyRowDisplayOverrides` pass (line 2285) iterates rows in array order. Generated-infra rows are always pushed to `rows` before connector rows (`addGeneratedInfrastructureRows` at line 3806 runs before the connector forEach). By the time `applyRowDisplayOverrides` processes a connector row, the join row is already in `appliedRowsById` with its resolved `endWeek`. `getDependencyEndWeek` correctly returns `max(previousPhaseTerminals, joinRow.endWeek)`, delaying the connector as needed.

### 2. Single-connector phase — no regression
With 1 connector: `latestPhaseEndWeek = parallelStartWeek + singleEstimatedDuration`. `previousPhaseBaselineEnd` is identical to what the old cursor would have produced. Zero functional change.

### 3. `latestSolutionEndWeek` for Training/Go-Live — correct
`latestSolutionEndWeek = Math.max(..., terminalRow.endWeek)` accumulates across all phases correctly. The `Math.max` is already inside the parallel placements loop at line 3916, so it catches all connectors. Training's `defaultStartWeek` may slightly underestimate for generated-tasks connectors delayed by `joinRowId`, but Training also has `dependencies: allSolutionTerminalIds`, so `applyRowDisplayOverrides` re-resolves its start from actual dependency end weeks. Training placement is correct after the dependency pass.

### 4. `estimateSolutionPlanDuration` with shared `parallelStartWeek`
The function returns `endWeek - phaseStartWeek` — a relative duration. Since all connectors now share the same `parallelStartWeek`, they all receive a correctly-relative estimate. No behavioural difference from using different cursor values (connector durations are not absolute-week-dependent in the current task model).

### 5. `applySolutionGroupShift` with `shiftWeeks=0`
Line 3517: `if (Math.abs(safeShiftWeeks) < 0.0001) return rows;` — pure no-op. All connectors sharing the same `baselineStartWeek` with no user override produce `shiftWeeks=0`, which passes through without modification. Correct.

### 6. `applyRowDisplayOverrides` dependency pass handles parallel case correctly
Connectors sharing the same `parallelStartWeek` and the same `previousPhaseTerminalIds` dependency list both resolve to the same `dependencyDrivenStartWeek`. They start in parallel. The pass does NOT skip solution-group child rows (they have `hasDirectStartWeekOverride=false`), so their final start weeks are correctly driven by dependencies. ✅

### 7. Cross-phase sequencing still enforced
`previousPhaseTerminalIds` is collected from actual `terminalRow.id` values (line 3914), not from the estimated cursor. Phase N+1 connectors depend on all Phase N terminal rows. The `applyRowDisplayOverrides` pass resolves Phase N+1 starts from the actual Phase N final end weeks. Correct.

---

## Risk remaining ⚠️

### State migration: stored solutionGroup startWeek overrides from old sequential plans

`readSolutionGroupState` determines whether a stored `startWeek` is a user override by comparing it against `defaultStartWeek` (= `baselineStartWeek` = `parallelStartWeek`):

```js
const hasDirectStartWeekOverride = hasStoredStartWeek &&
    Math.abs(overrideStartWeek - safeDefaultStartWeek) >= 0.0001;
```

**Before the fix:** For a second connector in a phase, `baselineStartWeek` was `cursor_after_first_connector`. The stored `startWeek` (if not user-edited) equalled the cursor → `hasDirectStartWeekOverride = false` → clean baseline.

**After the fix:** All connectors share `parallelStartWeek = previousPhaseBaselineEnd` (earlier). The stored `startWeek` from the old sequential position (e.g. week 8) now differs from the new baseline (e.g. week 6) → `hasDirectStartWeekOverride = true` → connector appears "custom scheduled" even though the user never touched it.

**Impact:**  
- Purely a display/UX issue for existing saved plans — "custom schedule" badge appears incorrectly  
- Scheduling still ends up correct after the dependency pass  
- New plans and reset plans are completely unaffected  
- Plans where the user DID manually set start weeks: unaffected (their overrides are still valid)

**Recommendation:**  
Acceptable for now — this is a cosmetic artifact only for users with pre-fix saved state. No action required unless users report unexpected "custom schedule" badges. If it does surface, a one-time migration that clears `solutionGroup.startWeek` entries that now equal or precede `parallelStartWeek` would resolve it.

---

## Manual test scenarios recommended

1. **Two connectors same phase (e.g. AWS + Windows Security Events):** Confirm both bars start at the same week on the Gantt timeline.
2. **One generated-tasks connector + one standard connector same phase:** Confirm the generated-tasks connector is correctly delayed past the infra join row; standard connector starts at phase baseline.
3. **Fresh plan, no saved state:** Verify no unexpected "custom schedule" indicators appear on connector group rows.
4. **Existing saved plan (pre-fix, multi-connector phase):** Check whether connector group rows incorrectly show "custom schedule" badge. Expected: may appear; scheduling is still correct.
5. **User override on one connector, parallel connector untouched:** Confirm only the overridden connector shows custom badge; the other resolves cleanly.
6. **Training & Go-Live start weeks:** With a generated-tasks connector delayed by infra join task, confirm Training starts after the delayed connector finishes (not at the pre-delay estimated time).


---

# Luv test findings — Environment / Solutions / Topology

- **Date:** 2026-06-02T11:20:47.206+02:00
- **Status:** REJECT
- **Scope:** Step 2 Environment, Step 3 Solutions, Step 4 Topology
- **Primary report:** `test-results/test-report-env-sol-topo.md`

## Critical findings
1. **Environment intent is polluted before the user acts.** Step 2 still defaults Azure/Microsoft 365, and stale workspace-connected solutions are restored from localStorage on startup.
2. **Recommendation accuracy is not release-safe.** Linux misses its main Syslog connector, GCP incorrectly recommends Google Workspace Reports, and several vendor-primary connectors are not highlighted because recommendation logic is gated by packaged-content richness.
3. **Topology correctness has release blockers.** Cribl-only selection produces a false empty state, shared Syslog/CEF collector nodes are duplicated, and Azure collector placement wires collector-to-DCR edges with the wrong band/handles.

## Reassignment
- **K:** Fix Step 2 state seeding, Step 3 recommendation logic, and Step 4 topology rendering/edge handling.
- **Sebastian:** Only needed if K decides the recommendation engine requires explicit vendor metadata additions in `data/solutions.json`.

## QA call
Do not accept this slice until the issues above are fixed and re-tested.


---

# Luv test findings — Exhaustive QA pass: gantt-tasks.js, topology, solutions, cross-module

- **Date:** 2026-06-03
- **Status:** REJECT
- **Scope:** All modules — topology visualization, connector persistence, `gantt-tasks.js` engine, solutions data, app structure, cross-module integration
- **Primary report:** `docs/testing-report-2026-06-03.md`

## Critical findings

### B-001 🔴 — `gantt-tasks.js` is completely unimported; the entire new Gantt engine is dead code

`gantt-tasks.js` exports `buildGanttPlan`, `calculatePlanDuration`, and all task catalogs but **zero other files in the project import it**. `gantt-planner.js` imports only from `capacity.js` and `scoring.js`. `app.js` only imports `initGanttPlanner`. No integration path exists.

**Impact:** The new Gantt task engine (TASK_CATALOG, field packs, critical path, duration calculation) has never run in production. The app still uses `gantt-planner.js` exclusively, which does not know about the new task infrastructure.

**Required action:** K needs to wire `gantt-tasks.js` exports into `gantt-planner.js` where plans are built and rendered.

## High-priority findings

- **B-002:** `CEF-INFRA-05.dependsOn` references `CEF-INFRA-03` instead of `CEF-INFRA-04`, making tasks 04 and 05 run in parallel. Fix: change `dependsOn` to `['CEF-INFRA-04']` in gantt-tasks.js TASK_CATALOG.
- **B-003:** `microsoft-sysmon-for-linux` has conflicting classification in all three data sources (topology: linux_server, gantt-tasks: WINDOWS_AMA, solutions.json fieldPack: syslog-cef). Needs a single authoritative classification.
- **I-001 (Security):** React, ReactDOM, and ReactFlow CDN scripts in `index.html` lines 7–10 are missing SRI `integrity=` hashes. frappe-gantt and exceljs already have SRI. Violates decisions.md policy. Fix: add sha384 integrity hashes for all 4 unpkg.com resources.

## Medium-priority findings

- **B-004:** `WFE` abbreviation collision in `KNOWN_ABBREVS` — two distinct connectors map to the same abbreviation, causing non-deterministic renaming to `WFE-2`.
- **I-002:** `inferFieldPack()` ignores the explicit `fieldPack` field in solutions.json. 43 solutions have this field defined; it is never read.
- **I-003:** `sentinelPlanner.taskDurationOverrides.v1` is not in `PLANNER_STORAGE_KEYS`, so duration overrides survive "Reset saved progress".
- **I-004:** Connected solutions persist to localStorage (same issue as 2026-06-02 session; still not fixed). Intent was session-only.
- **I-005:** `inferFieldPack()` fallback assigns `syslog-cef` (Linux forwarder infra) to API/cloud connectors that have no on-premises infrastructure requirement.
- **I-006:** No Content Security Policy in `index.html`.

## Reassignment

- **K:** B-001 (wire gantt-tasks.js), B-002 (CEF-INFRA-05 dep), B-003 (sysmon classification), B-004 (WFE collision), I-001 (SRI hashes), I-002 (inferFieldPack read fieldPack first), I-003 (add duration key to PLANNER_STORAGE_KEYS reset), I-005 (api connector fallback).
- **Sebastian (if needed):** I-004 (connected solutions persistence — requires spec call: is this intentional or session-only?), B-003 data side (update solutions.json fieldPack for microsoft-sysmon-for-linux).

## QA call

Do not accept the `gantt-tasks.js` engine integration as complete until B-001 is fixed and verified with a live build. Do not ship the current security posture until I-001 (missing SRI) is addressed.


---

# Topology Layer Box Bugs — QA Audit Findings

**By:** Luv (QA)
**Date:** 2026-06-10T14:30:17.276+02:00
**Relates to:** `js/modules/topology.js` — `createLayerBoxNodes()` and collectorVm placement
**Full report:** `.squad/agents/luv/topology-qa-report.md`

---

## Decision 1: Reclassify `cribl` and `pathBox` into Collection layer

**What:** In `createLayerBoxNodes()` (line 1988–1996), change `layerConfigs` so that:
- `collection` and `collection-bottom` types include `'cribl'` and `'pathBox'`
- `transformation` and `transformation-bottom` types contain only `'dcr'`

**Why:** Cribl is rendered at `bandBottomY + 80` (collection Y range) but is currently classified in `transformation`. This causes the transformation box to include Cribl's Y as `minY`, so after gap enforcement the transformation box is pushed 177px below Cribl — Cribl ends up completely outside its own layer box. The spec explicitly states Cribl belongs in Collection. `pathBox` nodes (Native Connector, Diagnostic Settings, Logic App, API Connector) are all collection-layer intermediaries per the spec; none of them are transformation steps.

**Impact:** Fixes the transformation box clipping/thinness issue. Fixes spec compliance for Cribl and pathBox classification. Cascades to correct workspace isolation and layer separation.

**Owner to implement:** K

---

## Decision 2: Fix bottom-band collectorVm Y formula

**What:** At line 1794, change:
```javascript
// BEFORE — wrong direction (places collectorVm ABOVE DCR, towards Sentinel)
? getBottomLayerY(1) - intermediaryLayerGapY * 0.5

// AFTER — places collectorVm BELOW DCR, between DCR and sources
? getBottomLayerY(bottomDcrLayerIndex || 1) + intermediaryNodeHeight + 60
```

Also increase `bottomSourceGapY` from `140` to `260` (line 1037) so sources are pushed far enough down to accommodate the collectorVm.

**Why:** In the bottom band, sources are at LARGE Y and Sentinel is at SMALL Y. The collectorVm must sit between sources (large Y) and the DCR (medium Y), i.e., at a LARGER Y than the DCR. The current formula uses minus, placing it at `sentinelY + 192` — above the DCR at `sentinelY + 292` — causing a 20px physical overlap and visually backward edge routing (data flows source → up → back down → up). With `bottomSourceGapY = 140`, there isn't even enough vertical space to fit a 120px collectorVm plus gaps between DCR and sources; 260px resolves this.

**Impact:** Fixes 20px bottom-band DCR/collectorVm overlap. Fixes transformation-bottom box being an 80px stub that doesn't contain its DCR nodes (cascade from wrong collectorVm placement). Correct bottom-band edge routing.

**Owner to implement:** K

---

## Decision 3: Update topology-spec.md constants to match current code

**What:** Update `docs/topology-spec.md` §5 to reflect actual code values:
- `topIntermediaryOffsetY`: 72 → **280**
- `intermediaryLayerGapY`: 152 → **200**
- `topSentinelGapY`: 96 → **160**
- `bottomSentinelGapY`: 120 → **160**
- Update §11 Cribl note from "pending refactor" to current architecture (Cribl at `bandBottomY + 80`, belongs in Collection layer)

**Why:** The spec is a living reference document and currently gives incorrect constants that could mislead future development.

**Owner to implement:** Whoever picks up the next topology pass (Sebastian or K)


---

### 2026-06-10T12:17: Topology Layer Boxes
**By:** Maria (via Copilot)
**What:** Each logical layer in the topology should have its own uber box:
1. **Sources** (top) — data-generating devices (firewalls, servers, SaaS)
2. **Collection Layer** — intermediaries that receive/aggregate data (Cribl, collector VMs, Linux forwarders)
3. **Transformation Layer** — DCRs/DCEs that define transformation and routing rules
4. **Workspace** (bottom) — Microsoft Sentinel

This means Cribl and collector VMs share the Collection Layer box. DCRs get their own Transformation Layer box. Every component must belong to exactly one layer box — no floating/orphaned nodes.
**Why:** Structural clarity — every node has a named home, reinforces the strict vertical hierarchy.


---

# Sebastian — Cribl Routing Refactor Plan

**Date:** 2026-06-10  
**Scope:** Analysis only for Step 4 topology refactor (`js/modules/topology.js`)  
**Requested by:** Maria

## Executive summary

The current topology already has the right **routing signal** (`ROUTE_CRIBL`) and already computes **route-specific shared DCR plans** for Cribl. The rendering layer is where the model breaks: Cribl is drawn as a singleton sidecar at the Sentinel Y-level, sources connect straight to that sidecar, and the calculated Cribl DCR plans never get rendered.

That is why the current visual path is effectively:

`Source → Cribl → Sentinel`

instead of the spec-required:

`Source → Cribl (collection/transport) → DCR → Sentinel`

---

## 1) Current `topology.js` Cribl behavior

### 1.1 How `ROUTE_CRIBL` is used

`ROUTE_CRIBL` is declared at `js/modules/topology.js:291-293` and is already threaded through the row model:

- `isCriblRoutedSolution()` (`318-320`) treats a solution as Cribl-routed when `getSolutionCapacityProfile(...).criblIngestion` is true.
- `splitSolutionsByRoute()` (`1581-1606`) only creates route splits for:
  - `windows_events`
  - `linux_server`
  - `syslog_cef`
- For those three types, Cribl-routed solutions get a separate row entry with:
  - `route: ROUTE_CRIBL`
  - a route-specific `sourceId` suffix (`getTopologySourceId(..., route)` at `307-310`)
- Route ordering keeps standard rows before Cribl rows within the same type (`1631-1638`).
- Collector VM logic is explicitly disabled for Cribl rows:
  - `entryUsesCollectorVm()` returns false when `route === ROUTE_CRIBL` (`1563-1565`)

### 1.2 Which rows can currently enter the Cribl path

In `topology.js`, only these topology families can enter the Cribl route:

- `windows_events`
- `linux_server`
- `syslog_cef`

Everything else stays `ROUTE_STANDARD`, even if the solution is marked `cribl_eligible`.

### 1.3 How `shared-cribl-node` is positioned

Cribl is currently rendered as a singleton node:

- `CRIBL_NODE_ID = 'shared-cribl-node'` (`293`)
- X position is computed as a **right-side sidecar** of Sentinel:
  - `criblX = sentinelX + sentinelNodeWidth + criblSentinelGapX` (`2003-2005`)
- Y position is exactly the Sentinel row:
  - `position.y = sentinelY` (`2349-2352`)

So the current placement is explicitly **workspace-adjacent**, not collection-layer placement.

Sentinel also gets a special right-side target handle when Cribl exists:

- `hasSidecarTarget: criblSourceIds.length > 0` (`2398-2401`)
- used by `SentinelNode` right handle (`3159-3163`)

### 1.4 How Cribl edges are built

There are two active Cribl edge patterns:

1. **Source → Cribl**
   - built with `buildSourceToMiddleEdge(sourceId, CRIBL_NODE_ID, ...)` (`2457-2458`)
   - this uses the normal top/bottom flow handles

2. **Cribl → Sentinel**
   - built with `buildCriblToSentinelEdge()` (`1427-1433`)
   - rendered at `2367-2369`
   - this is a special sidecar edge using:
     - Cribl left source handle
     - Sentinel right target handle

There is currently **no Cribl → DCR edge path**.

### 1.5 How Cribl DCRs are calculated vs rendered

This is the most important gap.

#### Calculated

`buildSharedPlans()` (`1795-1815`) already creates route-specific shared DCR plans:

- `criblWindowsDcrPlan`
- `criblLinuxDcrPlan`
- `criblSyslogDcrPlan`

Those plans are generated by cloning layouts for `ROUTE_CRIBL` only (`1762-1767`) and renaming the DCR IDs/labels with the Cribl DCR label:

- `"Custom DCR (Logs Ingestion API)"` via `PATH_CONFIGS.cribl.dcr`

#### Not rendered

The render pipeline only adds **standard** shared DCR entries:

- `addSharedDcrEntries(windowsSharedDcrPlan, ...)` (`2277-2283`)
- `addSharedDcrEntries(linuxSharedDcrPlan, ...)` (`2284-2290`)
- `addSharedDcrEntries(syslogCefCollectorPlan, ...)` (`2291-2297`)

It never adds:

- `criblWindowsDcrPlan`
- `criblLinuxDcrPlan`
- `criblSyslogDcrPlan`

Also, the Cribl collapsed IDs are declared but unused:

- `criblWindowsCollapsedId` (`1478`)
- `criblLinuxCollapsedId` (`1479`)
- `criblSyslogCollapsedId` (`1480`)

#### Layout currently suppresses DCRs for Cribl rows

`rowHasDcr()` explicitly returns false for Cribl-routed shared paths (`1891-1898`):

- if `route === ROUTE_CRIBL`, it returns false

That means the layout engine reserves only **one intermediary layer** for Cribl rows (`1880-1904`), which is why the visual path terminates at the sidecar node instead of continuing through a DCR layer.

### 1.6 Cribl-only behavior today

There is an explicit standalone fallback:

- `hasStandaloneCriblSelection` (`1132-1133`)
- if there are no other groups, the code injects `groups.cribl = [criblSolution]` (`1154-1158`)

This is the current TOPO-001 workaround, but it directly conflicts with the transport-layer model in the spec.

---

## 2) `data/solutions.json` findings

### 2.1 Cribl-related records in data

There are two distinct data concepts:

1. **The Cribl environment/intermediary record**
   - `cribl-stream` (`data/solutions.json:58158-58183`)
   - tagged as Cribl and marked `fieldPack: "cribl-intermediary"`

2. **Source records marked as Cribl-eligible**
   - `cribl_eligible: true`

### 2.2 Solutions marked `cribl_eligible`

I found **16** `cribl_eligible` solutions:

| ID | Name | Notes |
|---|---|---|
| `azure-firewall` | Azure Firewall | Marked eligible in data, but topology classifies as `azure_native` |
| `azure-waf` | Azure Web Application Firewall (WAF) | Marked eligible in data, but topology classifies as `azure_native` |
| `microsoft-sysmon-for-linux` | Microsoft Sysmon For Linux | Linux path |
| `barracuda-cloud-gen-firewall` | Barracuda Cloud Gen Firewall | Syslog/CEF-style source |
| `citrix-web-app-firewall` | Citrix Web App Firewall | Syslog/CEF-style source |
| `fortinet-forti-gate-next-generation-firewall-connector-for-microsoft-sentinel` | Fortinet Forti Gate NGFW | Syslog/CEF-style source |
| `sonic-wall-firewall` | Sonic Wall Firewall | Syslog/CEF-style source |
| `sophos` | Sophos XG Firewall | Syslog/CEF-style source |
| `windows-firewall` | Windows Firewall | Windows AMA path |
| `amazon-web-services-network-firewall` | AWS Network Firewall | Marked eligible in data, but not in current AMA route families |
| `google-cloud-platform-firewall-logs` | GCP Firewall Logs | Marked eligible in data, but classifies as `api` |
| `forge-rock-common-audit-for-cef` | Forge Rock Common Audit for CEF | Syslog/CEF-style source |
| `common-event-format` | Common Event Format | Shared firewall/CEF transport base |
| `linux-syslog` | Syslog | Linux path |
| `windows-forwarded-events` | Windows Forwarded Events | WEC/Windows path |
| `windows-security-events` | Windows Security Events | Windows AMA path |

### 2.3 Effective Cribl-routing set today

The **data flag alone is not enough**.

The actual UI/topology route requires:

- Cribl environment selected
- `solution.cribl_eligible === true`
- capacity profile type in `['windows', 'linux', 'firewall']` (`js/modules/solutions.js:116-117`, `1068-1072`)
- saved `criblIngestion` flag true

Based on current capacity-profile logic, the **effective per-connector Cribl route set today** is:

- `windows-security-events`
- `windows-forwarded-events`
- `windows-firewall`
- `linux-syslog`
- `microsoft-sysmon-for-linux`
- `common-event-format`

### 2.4 Important data/model gap for the Barracuda scenario

This is the main product-risk item:

- The spec/user story says **“Barracuda + Cribl”**
- But today Barracuda itself does **not** appear to carry a usable capacity profile / `criblIngestion` route flag
- So the row that can be Cribl-routed is currently the shared base connector (`common-event-format`), not necessarily the vendor row (`barracuda-cloud-gen-firewall`)

If K is expected to make the **Barracuda source row itself** route through Cribl, the team needs one of these decisions:

1. **Propagate Cribl routing from the shared base connector to dependent vendor rows** in topology assembly, or
2. **Broaden capacity metadata/profile typing** so those vendor firewall records carry their own `firewall` profile and `criblIngestion` state

Without that, the refactor will improve Cribl rendering but still miss the exact “Barracuda + Cribl” visual story.

---

## 3) Refactoring plan

## 3.1 Node placement changes

### A. Remove Cribl from the Sentinel sidecar position

Current behavior to remove:

- `criblX` right of Sentinel
- `y = sentinelY`
- Sentinel right-handle dependency (`hasSidecarTarget`)

### B. Place Cribl in the Collection Layer

Cribl should render in the same **collection/intermediary layer family** as collector VMs and server nodes:

- **Top band:** Cribl sits on the first intermediary layer below the source row
- **Bottom band:** Cribl sits on the intermediary layer between source and DCR (below the bottom-band DCR layer, not at Sentinel Y)

That makes the visual stack:

- **Top band:** `Source → Cribl → DCR → Sentinel`
- **Bottom band:** `Source → Cribl → DCR → Sentinel` (from bottom upward)

### C. Recommended placement model: shared Cribl node per rendered anchor/band

I do **not** recommend keeping a single global `shared-cribl-node` if Cribl-routed sources can exist in both top and bottom bands.

Recommended approach:

- Keep the concept of a **shared Cribl instance**
- Render it as:
  - one Cribl node for the **top band** when top-band Cribl rows exist
  - one Cribl node for the **bottom band** when bottom-band Cribl rows exist

Reason:

- a single node cannot cleanly live in both the top and bottom collection layers
- band-aware rendering avoids long crossing edges through the workspace axis
- it fits the existing band-aware edge helpers already in `topology.js`

If only one band has Cribl-routed sources, only one Cribl node renders.

### D. No Cribl uber box

Cribl should **not** create its own topology group or uber box.

It should exist only as an inline collection-layer intermediary associated with Cribl-routed source rows.

---

## 3.2 Edge routing changes

### A. Replace direct `Cribl → Sentinel` with `Cribl → DCR`

The direct sidecar edge should be removed for normal routed flows.

New routing:

- `Source → Cribl`
- `Cribl → Custom DCR (Logs Ingestion API)`
- `DCR → Sentinel`

### B. Render the already-computed Cribl DCR plans

K should wire the existing plans into `sharedDcrEntries`:

- `criblWindowsDcrPlan`
- `criblLinuxDcrPlan`
- `criblSyslogDcrPlan`

using the existing route-specific labels generated by `renameSharedPlan()`.

### C. Make Cribl routes count as DCR-bearing paths

Layout changes required:

- `rowHasDcr()` must no longer return false for Cribl-routed shared rows
- the intermediary count / DCR-layer math must reserve a DCR layer for Cribl routes

That is the structural change that makes the DCR layer visible again.

### D. Preferred helper usage

- `Source → Cribl`: keep using the normal vertical flow edge helper pattern
- `Cribl → DCR`: use the same vertical middle-edge pattern as other intermediary-to-DCR flows
- `DCR → Sentinel`: keep existing shared DCR rendering path

`buildCriblToSentinelEdge()` becomes obsolete for valid routed scenarios and should only survive if K wants a temporary invalid-state fallback.

---

## 3.3 Scenario-by-scenario target behavior

### a) Single source + Cribl (example: Barracuda via Cribl)

**Target visual flow**

- Barracuda remains in **Sources**
- Cribl appears directly below/inside the Barracuda flow in **Collection Layer**
- One or more **Custom DCR (Logs Ingestion API)** nodes appear in **Transformation Layer**
- Sentinel remains in **Workspace**

**Path**

`Barracuda → Cribl → Custom DCR → Sentinel`

**What must not appear**

- no standalone Cribl sidecar at Sentinel Y
- no standalone “Cribl” source group
- no Cribl uber box

### b) Multiple sources sharing one Cribl instance

**Target visual flow**

- Multiple Cribl-routed sources fan into one shared Cribl node **within the band**
- That Cribl node fans out to one or more shared custom DCRs
- Those DCRs connect to Sentinel

**Path**

`Source A →`
  
`Source B → Cribl → Shared Custom DCR(s) → Sentinel`
  
`Source C →`

**Placement recommendation**

- Center the shared Cribl node on the weighted average of the routed source rows in that band
- Anchor the Cribl DCR group beneath that Cribl node (or at least on the same band-centered anchor) to reduce zig-zag lines

### c) Cribl-only selection (no source)

**Recommendation: block upstream**

Preferred product behavior:

- Do not allow Step 4 to render a transport-only topology
- Show guidance earlier: **Cribl is a delivery layer; select at least one Cribl-eligible source**

**Topology fallback if it still happens**

- Do **not** render a standalone Cribl flow
- Show an empty/notice state instead of fabricating a topology

This means the current TOPO-001 standalone Cribl workaround should be removed or downgraded to a non-topology empty state.

---

## 3.4 Which §10 constraints this fixes

### Constraint #4 — No Cribl as a top-level source

This refactor fixes it by:

- eliminating standalone `groups.cribl` rendering for valid topologies
- preventing Cribl from presenting as its own source path
- tying Cribl rendering to source-owned routed flows only

### Constraint #5 — No uber box for Cribl

This refactor fixes/preserves it by:

- keeping Cribl out of the group/uber-box model
- rendering Cribl only as a shared collection-layer intermediary

**Note:** §10/#5 still contains older “workspace Y-level sidecar” wording, but §11 clearly updates the desired behavior to embed Cribl under the source context. I would treat §11 as the operative clarification.

### Constraint #6 — No firewall source connecting directly to DCR

This refactor improves it by ensuring Cribl-routed firewall sources have an explicit intermediary hop before DCR:

`Firewall source → Cribl → DCR → Sentinel`

Important nuance:

- This satisfies the **“not direct to DCR”** intent
- It does **not** preserve the older wording that every firewall path must go through a Linux Forwarder VM

Because the current Cribl spec explicitly wants `Source → Cribl → DCR → Sentinel`, the team should treat Cribl as the collection-layer intermediary for Cribl-routed firewall paths unless a separate design decision says **Linux Forwarder + Cribl** is required.

---

## 4) Risks and watch-outs

### 1. Dangling-edge risk

If K switches from one global Cribl node to band/anchor-scoped nodes, the mapping from routed source rows to Cribl node IDs must be explicit. Otherwise some rows will still point to `shared-cribl-node` and lose their path.

### 2. Cribl DCRs are easy to calculate but easy to orphan

The plans already exist, but if K renders the Cribl node without wiring `addSharedDcrEntries()` for Cribl plans, the topology will still stop one layer early.

### 3. Top/bottom band collision risk

One global Cribl node is likely to create awkward or crossing edges when routed sources exist in both bands. That is why I recommend band-scoped rendering.

### 4. Layout-stability risk

Removing the Sentinel sidecar changes:

- `diagramRightX`
- node clamping bounds
- Sentinel centering behavior

K should validate filter toggles and mixed-zone layouts to avoid regressions against §10/#9 and §10/#10.

### 5. Barracuda / vendor-firewall inheritance risk

The data model says many vendor solutions are Cribl-eligible, but the current effective route flag lives only on a small subset of capacity-bearing records. If that is not resolved, the UI may still fail the “Barracuda + Cribl” story even after the rendering refactor.

### 6. Collapsed Cribl DCR IDs are currently dead code

The three `cribl*CollapsedId` constants are already declared. If K uses collapsed rendering for Cribl DCRs, wire them now; otherwise remove them later to avoid confusion.

### 7. Spec conflict on firewall intermediary semantics

There is a tension between:

- older constraint text saying firewall paths must visibly traverse Linux Forwarder VMs
- newer Cribl bug/spec text saying Cribl becomes the transport hop

K should implement the §11 path, but the team should explicitly confirm that this is the intended override.

---

## Recommended implementation order for K

1. **Remove standalone Cribl-only topology rendering**
2. **Render Cribl in collection-layer Y positions instead of Sentinel Y**
3. **Make Cribl routes DCR-bearing in layout math**
4. **Add Cribl shared DCR entries to the rendered node set**
5. **Swap direct `Cribl → Sentinel` edges to `Cribl → DCR`**
6. **Validate mixed scenarios**
   - single routed source
   - multiple routed sources in one band
   - routed sources in both bands
   - Cribl selected with no routed source
   - Barracuda/Common Event Format dependency case

---

## Bottom line

The foundation is already in the file: `ROUTE_CRIBL`, route-split rows, and route-specific shared DCR plans all exist. The refactor is mainly about making the rendering layer respect that model: **move Cribl into the collection layer, render the Cribl DCRs, and remove the direct sidecar hop to Sentinel.**


---

# Decision: DCR/VM Infrastructure Discovery Layer

**Author:** Sebastian (Data Engineer)
**Date:** 2026-06-10T11:13:38+02:00
**Status:** Implemented

---

## Context

Step 4 (Topology) needs to show which VMs and Arc machines are already sending data to the workspace, what DCRs govern them, and at what EPS. Without this layer, the topology view can only show connector types, not the actual machines behind them.

---

## Decision: Two-Phase Resource Graph + KQL Discovery

Discovery runs in five queries after connector discovery completes:

1. **Resource Graph — Workspace DCRs**: Get all DCRs whose `destinations.logAnalytics.workspaceResourceId` contains the workspace name. This seeds the `dcrById` map with stream information.
2. **Resource Graph — DCR Associations**: Get all `microsoft.insights/datacollectionruleassociations` across the subscription. Filter to only those referencing a workspace-targeting DCR. Group by VM resource ID.
3. **Resource Graph — VM Details**: For the discovered VM names, fetch `hardwareProfile.vmSize`, `storageProfile.osDisk.osType`, `location`, `resourceGroup` from both `microsoft.compute/virtualmachines` and `microsoft.hybridcompute/machines`.
4. **KQL — EPS**: `union Syslog, CommonSecurityLog, SecurityEvent` over last 24h — `AvgEPS`, `MaxEPS`, `TotalEvents` per computer.
5. **KQL — CEF Source Devices**: `CommonSecurityLog` over last 24h — deduplicated source device names per collector computer.

All five are individually fault-tolerant (`safeGraph`/`safeKql`). The overall function is non-blocking (fire-and-forget at the call site).

---

## Alternatives Considered

**Single joined Resource Graph query:** Resource Graph supports `join kind=inner` across `resources` and `insightsresources`, but the association table often returns 100k+ rows in large subscriptions and the join hits the 3MB response cap. Two-pass filtering is safer.

**Polling approach (setInterval until data arrives):** Rejected — adds timing complexity and risks rendering stale data. A simple `.then(() => renderTopologyStep())` is cleaner and sufficient.

---

## Output Shape

```
window.discoveredInfrastructure = {
    vms: [{ name, type, size, os, location, resourceGroup, resourceId, dcrs[], eps, sourceDevices[], role }],
    summary: { totalVMs, syslogCollectors, cefCollectors, windowsSources, arcMachines, totalEPS },
    discoveredAt: ISO string,
    status: 'complete' | 'partial' | 'failed'
}
```

Role classification priority (Linux): cef-collector > syslog-collector  
Role classification priority (Windows): windows-events  
Arc machines: hybrid-syslog or hybrid-windows

---

## Impact

- `js/app.js`: ~190 lines added (`resourceGraphQuery` helper + `discoverExistingInfrastructure` function + two fire-and-forget insertion points)
- `index.html`: cache-bust v=11 → v=12
- No existing behavior changed; discovery is additive and non-blocking

---

## For Agent K (Topology)

`window.discoveredInfrastructure` is available after the `.then()` resolves. Check `status !== 'failed'` and `vms.length > 0` before rendering. If `getCurrentStep() === 4` when discovery completes, `renderTopologyStep()` is called automatically. The `role` field maps directly to topology node types: `syslog-collector`, `cef-collector`, `windows-events`, `hybrid-syslog`, `hybrid-windows`.


---

# Decision: Syslog/CEF fieldPack Coverage Rule

**By:** Sebastian (Data Engineer)
**Date:** 2026-06-10
**Status:** APPLIED

## What

Added `"fieldPack": "syslog-cef"` to 53 solutions in `data/solutions.json` that were missing the field despite connecting to Sentinel via Syslog or CEF (i.e., requiring a Linux VM collector).

Total `fieldPack: "syslog-cef"` entries: 31 → 84.

## Rule Established

**A solution MUST have `"fieldPack": "syslog-cef"` if its Microsoft Sentinel documentation or description states it uses one of:**
- "Syslog via AMA" connector
- "CEF via AMA" connector
- "Agent-based log collection (CEF over Syslog)"

**A solution MUST NOT have `"fieldPack": "syslog-cef"` if it connects via:**
- Custom logs via AMA (DCR-based custom logs)
- Azure Monitor HTTP Data Collector API
- Azure Logic Apps (API-based integration)
- Native Azure / Microsoft connector (no Linux forwarder)

## Exceptions Applied

- `zscaler-private-access-zpa` — uses Custom logs via AMA; excluded.
- `sysmon-via-ama` — Windows path uses WEF/DCR; only Linux path uses syslog. Mixed transport excluded to avoid incorrect topology wiring.

## Why

The topology visualization code classifies solutions as `syslog_cef` type and wires them to the Linux VM collector node using `fieldPack: "syslog-cef"`. Without this field, the collector VM node is not rendered for these solutions and the customer sees an incomplete deployment topology.

## Solutions Patched

Five task-specified: `zscaler`, `checkpoint`, `fortinet-forti-gate-next-generation-firewall-connector-for-microsoft-sentinel`, `barracuda-cloud-gen-firewall`, `cisco-aci`.

Forty-eight additional confirmed syslog/CEF sources including: sophos, sonic-wall-firewall, palo-alto-cdl, juniper-srx, akamai-security-events, arista-awake-security, aruba-clear-pass, blackberry-cylance-protect, broadcom-symantec-dlp, cisco-ise, cisco-secure-cloud-analytics, cisco-seg, cisco-ucs, cisco-wsa, citrix-adc, citrix-web-app-firewall, claroty, cyber-ark-privilege-access-manager-pam-events, digital-guardian-data-loss-prevention, exabeam-advanced-analytics, fire-eye-network-security, forcepoint-casb, forcepoint-csg, forcepoint-ngfw, git-lab, illumio-core, infoblox-cloud-data-connector, infoblox-nios, isc-bind, ivanti-unified-endpoint-management, mc-afee-e-policy-orchestrator, mc-afee-network-security-platform, nasuni, netwrix-auditor, nozomi-networks, open-vpn, oracle-database-audit, ossec, ping-federate, pulse-connect-secure, rsa-secur-id, symantec-proxy-sg, symantec-vip, trend-micro-apex-one, trend-micro-deep-security, trend-micro-tipping-point, vectra-ai-detect, vm-ware-es-xi.


---

### 2026-06-10T12:47Z: Topology fix prioritization
**By:** Maria (via Squad)
**What:** Prioritized topology spec compliance fixes in dependency order:
- P0: Add 4-layer uber boxes (foundational — Sources/Collection/Transformation/Workspace)
- P1: Refactor Cribl into Collection Layer (bug-cribl-001, high risk)
- P2: Sentinel weighted centering (constraint #10, isolated)
- P3: Stabilize layout across filter changes (constraint #9)
- P4: Fix discovered VM banding (minor, follows P0)
**Why:** Audit revealed structural non-compliance with topology-spec.md. P0 is foundational — all other fixes depend on the layer model existing.

