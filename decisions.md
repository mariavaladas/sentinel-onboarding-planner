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

