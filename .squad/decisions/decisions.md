# Decisions

## 2026-05-25

### K — Wizard-first resume and responsive planner

- **Date:** 2026-05-25T10:29:47.633+02:00
- **Owner:** K
- **Scope:** `index.html`, `css/style.css`, `js/app.js`, `js/modules/wizard.js`, `js/gantt-planner.js`

**Decision**
1. The app should always land on the Welcome step on page load, even when a later wizard step is saved in local storage.
2. Saved progress should remain resumable through an explicit CTA on the Welcome step instead of auto-opening the planner.
3. Native select controls must opt into the dark theme with explicit option styling.
4. Planner task rows must keep custom schedule badges inline, and the mobile planner layout should take over at narrower viewport widths.

**Why**
- Auto-restoring directly into Step 5 hides the wizard and makes the navigation feel broken.
- Explicit resume keeps saved work available without surprising the user.
- Chromium native dropdowns otherwise fall back to light option styling in the dark UI.
- Absolute-positioned table rows cannot safely stack multi-line badge content on compact screens.

**Impact**
- Users start in the full wizard flow and can intentionally jump back to saved progress.
- Timeline zoom and related native selects read correctly in the dark theme.
- Smaller screens move to the mobile planner earlier, while desktop task rows stay contained.

## 2026-05-26

### K — Capacity-driven planner duration scaling

- **Date:** 2026-05-26T11:41:35+02:00
- **Owner:** K
- **Scope:** `data/solutions.json`, `js/gantt-planner.js`

**Decision**
- Treat explicit `planner.setup_tasks[*].duration` values as the authoritative base schedule for planner rows when present.
- Apply Windows Security Events sizing adjustments on top of those base durations instead of replacing them:
  - Azure Arc onboarding scales from on-prem host count.
  - AMA/DCR deployment scales from total Windows server count.
  - SecurityEvent validation scales lightly from total Windows server count.
- Keep `effort_hours` unchanged as effort metadata / weighting input rather than the only source of schedule length.

**Why**
- Deckard's revised estimates are task-specific and cannot be represented reliably through the old solution-level duration allocation alone.
- Capacity already changed task copy; the planner now needs the same sizing inputs to affect actual schedule length.
- The Gantt header customization must preserve Frappe's hidden date-range highlight elements so hover/click handlers do not throw `null.classList` errors after re-renders.

**Impact**
- Windows Security Events now shows the revised baseline durations, two new post-validation tasks, and size-sensitive duration growth for larger estates.
- Cross-tab planner refreshes keep the Table authoritative immediately while forcing the Gantt timeline to rebuild from current plan data instead of stale cached DOM.

---

### K — Step 3 solution search + category tabs

- **Date:** 2026-05-26T12:12:51+02:00
- **Owner:** K
- **Scope:** `index.html`, `js/app.js`, `js/modules/search.js`, `js/modules/solutions.js`, `css/style.css`, `data/solutions.json`

**Decision**
- Remove the redundant Step 3 "Find matches" button and treat the search input as the single search interaction.
- Keep search global across the Solutions step: matching cards update live across Azure, Microsoft 365/Security, and third-party connectors as the user types.
- Reorganize only the third-party catalog into seven tabs with an `All` tab first: `cloud`, `firewalls`, `servers`, `email-security`, `endpoint-security`, `threat-intelligence`, and `identity-access`.
- When search is active, temporarily flatten the third-party tab filter to `All` so cross-category matches stay visible; clearing search returns the browser to tabbed category browsing.

**Why**
- Step 3 already behaved like live search, so the extra button added friction without adding capability.
- The third-party catalog is large enough that a single long list is hard to scan, while tabs provide a cleaner browse-first flow.
- Search must still override local category browsing so users can find a connector by name, description, or keywords without hunting through every tab.

**Impact**
- Users can type once and immediately see the card grid narrow in place.
- Third-party cards now expose a category badge and are grouped behind accessible tabs for faster browsing.
- Azure and Microsoft-first-party sections keep their current panel structure while participating in the same live search behavior.

---

### Luv — QA Findings — Gantt and Table tabs

**Date:** 2026-05-26T09:09:34+02:00  
**Agent:** Luv  
**Status:** REJECT — K to fix before sign-off

**Scope**
Live QA pass on:
- `js/gantt-planner.js`
- `css/style.css`
- `index.html`

**What passed**
- Table tab showed no inline `+ Add task` rows between groups
- Dependencies text stayed contained and did not bleed into Priority
- Task label typography rendered at `13px / 400`
- Group-row and task-row clicks opened the detail panel
- Detail panel closed via X, backdrop, and Escape
- Toolbar `+ Add task` created a new editable row
- Gantt bars rendered for all visible rows
- Gantt labels were outside-right for solution groups
- Gantt bar clicks and label clicks opened the detail panel
- No underlined task labels were found
- Zoom control worked for Weeks / Months / Quarters
- `console.debug` is gone from active `js/gantt-planner.js`

**Critical Bug — Start-date inline edit saves state but does not update the rendered plan**
- Owner: K
- Repro: Edit start date in Table, check renders in Table and Gantt detail—both show old date despite persisted override state.

**Medium Bug — Gantt interactions emit runtime exceptions from `frappe-gantt`**
- Owner: K
- Error signature: `TypeError: Cannot read properties of null (reading 'classList')`

---

### Luv — k-20 verification

- **Date:** 2026-05-26T12:03:28+02:00
- **Owner:** Luv
- **Verdict:** REJECT
- **Severity:** Medium

**Summary**
`js/gantt-planner.js` checks out for the requested fixes: capacity-driven duration scaling is wired correctly, inline date saves now rebuild and refresh planner state in the right order, and the Frappe `null.classList` fix preserves required header nodes instead of only masking the error.

The blocker is in `data/solutions.json`: Windows Security Events has two task-definition blocks, and only `planner.setup_tasks` was updated.

**BUG-K20-001 — duplicate Windows Security Events task definitions are out of sync**
- File: `data/solutions.json`
- What is wrong: `planner.setup_tasks` includes the new tasks (`wse-workbooks`, `wse-tune-event-set`) but the duplicated top-level `setup_tasks` block does not; old durations persist in the duplicate.
- Why: Catalog now contains two contradictory schedules. Current planner code reads `planner.setup_tasks`, but any consumer reading top-level `setup_tasks` gets stale tasks, sequencing, and estimates.
- Owner to fix: K

---

### Sebastian — Step 3 search relevance tightening

- **Date:** 2026-05-26T13:52:33.092+02:00
- **Owner:** Sebastian
- **Scope:** `js/modules/solutions.js`

**Decision**
- Restrict Step 3 search indexing to connector identity fields only: solution name, tags, export group, and third-party category label.
- Exclude `description` and `onboarding.notes` from the searchable text because they frequently mention prerequisites or dependencies that create false-positive matches.
- Update Step 3 panel and third-party section heading counts to reflect filtered visibility, using visible/total when search hides part of a section.

**Why**
- QA found that searches like "defender" were surfacing unrelated third-party connectors because dependency notes mentioned Microsoft Defender.
- Headings need to stay trustworthy during filtering so users can see how much of each section still matches without opening every group.

**Impact**
- Search now behaves like connector discovery instead of full-text documentation search.
- Third-party and top-level section counts stay in sync with the cards currently visible in Step 3.

---

### Sebastian — Search event-chain hardening

- **Date:** 2026-05-26T14:02:43.261+02:00
- **Scope:** Step 3 solution search

**Decision**
Decouple Step 3 card filtering from suggestion-list rendering. `handleNlpInput()` and `processNlpInput()` must always run `applySolutionSearch()` first, with the suggestion chips treated as optional secondary UI.

**Why**
The filtering behavior is core planner state, while the suggestion container is auxiliary chrome. If the suggestion host is missing, late-rendered, or otherwise unavailable, card filtering must still hide/show `.solution-item[data-id]` elements, collapse empty sections, and refresh counts.

**Validation**
- `node --check js/modules/search.js`
- `node --check js/modules/solutions.js`
- Headless browser run on `http://localhost:8080`: searching `crowdstrike` hid 487 of 488 cards and clearing the input restored all cards.

## 2026-05-27

### User directive

- **Date:** 2026-05-27T14:07:42
- **By:** madesous (via Copilot)
- **What:** Before K starts implementing new features, have someone (Luv) check whether specs are totally clear to avoid iteration loops. Catch ambiguity in requirements before code is written.
- **Why:** User request — too many rework cycles caused by unclear specs (e.g., capacity inputs: per-solution vs per-instance, numeric handling rules). Pre-implementation spec review reduces iterations.

---

### Deckard — Windows Connector Sizing — Shared Server Model

- **Date:** 2026-05-27T14:12:46.945+02:00
- **Status:** PROPOSAL (awaiting user approval)
- **Owner:** Deckard (Lead)
- **What:** Refine the current shared Windows sizing approach into a pool-based model that handles overlap explicitly.

**Pools**
- **Windows Security Events via AMA** and **Windows Firewall via AMA** belong to the **Windows AMA host** category.
- Default assumption: if multiple Windows AMA connectors are selected, they target the **same server population** unless the user says they are additional servers.
- Users must be able to switch a connector between **same servers** and **additional servers** without losing sizing work.
- **Windows Forwarded Events** is **not** part of the Windows AMA host pool. It is always sized as a **WEC server** population.
- Scope note: this proposal sizes the operational host estate used for the onboarding plan. Legacy-agent wording inside package descriptions does not create separate sizing pools.

**UX Flow**
1. **When only one Windows AMA connector is selected**
   - No sharing question appears.
   - Show the normal server-count inputs only: `How many Windows servers?` and `What split — on-prem vs. Azure?`
   - Save this as one Windows AMA server pool tied to that connector.
2. **When a second Windows AMA connector is selected**
   - Show a relation control at the top of the sizing drawer/detail editor.
   - Default the new connector to **Same servers as the existing Windows AMA connector/pool**.
   - Offer two choices: `Same servers` or `Additional servers`.
   - If **Same servers**: Reuse the existing Windows AMA pool and show a shared summary like `Shared with Windows Firewall · 120 servers · 40% on-prem`. Editing from either connector updates the same pool.
   - If **Additional servers**: Create a second Windows AMA pool for that connector with normal server fields.
3. **If more than two Windows AMA connectors exist later**
   - Keep the same default: new AMA connectors join the first existing AMA pool.
   - Promote the relation control to `Use existing AMA pool` vs `Use additional servers`.
   - If the user chooses an existing pool, list available pools by summary instead of making them guess.
4. **When Windows Forwarded Events is selected**
   - Do **not** ask whether it shares servers with the AMA connectors.
   - Treat it as a separate sizing card/editor with WEC-specific language: `How many WEC servers?` and `What split — on-prem vs. Azure?`
   - Summary text, pills, and badges must say `WEC servers`, not `Windows servers`.
5. **Step 5 / planner editing behavior**
   - The same pool relationship choices must be editable in the Gantt detail sizing editor.
   - Planner recomputation happens immediately when pool membership or pool counts change.
   - Pool summaries should show connector membership so the user understands what else will change.

**Data Model**
- **`solutions.json` metadata**
  - Add explicit sizing metadata:
    - `capacity_type: "server_count"` for `windows-security-events`, `windows-firewall`, and `windows-forwarded-events`
    - `server_population_kind: "windows_ama"` for `windows-security-events` and `windows-firewall`
    - `server_population_kind: "wec"` for `windows-forwarded-events`
    - `shared_population_group: "windows-ama"` for AMA connectors only
    - `server_count_label` to drive the correct prompt text
  - Replace the current single shared Windows sizing entry with pool-based state:
    - `serverPools[poolId] = { kind, serverCount, onPremPercent, connectorIds[] }`
    - `connectorSizing[solutionId] = { poolId, relation }`
  - WEC sizing remains a dedicated pool for `windows-forwarded-events`; it never joins `windows-ama` pools.
  - Migration: If a session only has the old single shared Windows sizing entry, migrate it into one Windows AMA pool and attach all selected AMA connectors to that pool.
- **Edge Cases**
  - Only one Windows connector selected: no sharing question shown.
  - User changes from shared to separate: create a new pool prefilled from current values so user doesn't start over.
  - User changes from separate to shared: reattach the connector to the chosen shared pool; keep the detached pool draft in-session so toggling back restores prior values.
  - User deselects a shared connector: remove only that connector from the pool. If one connector remains, keep the pool and hide the sharing question. If no connectors remain, delete the empty pool.
  - User deselects the connector currently acting as the visible shared-pool owner: transfer pool ownership to another connector without changing values.
  - User selects Windows Forwarded Events plus AMA connectors: show two independent sizing summaries; never merge WEC into AMA host counts.
  - User enters 0%, 100%, all Azure, or all on-prem splits: valid; planner uses the split exactly as entered.
  - Solution descriptions mention legacy connectors: ignored for overlap modeling; this proposal applies to the AMA host estate and the separate WEC estate only.

**Next:** Luv reviews for spec clarity (Spec Clarity Check ceremony), then K implements

---

### K — Windows sizing pools in shared planner state

- **Date:** 2026-05-27T14:21:21.238+02:00
- **Owner:** K
- **Scope:** `js/modules/capacity.js`, `js/modules/solutions.js`, `js/gantt-planner.js`, `css/style.css`, `data/solutions.json`

**Decision**
- Store Windows server sizing as pool-based state under the existing shared sizing entry so AMA connectors can share or detach without introducing a second persistence surface.
- Keep Windows Forwarded Events as a dedicated WEC pool with its own labels and summaries; never offer AMA sharing controls on WEC.
- Surface the same relation choices in both Step 3 and Step 5 so planner edits and wizard edits stay behaviorally aligned.
- Preserve detached AMA pool drafts when a connector rejoins a shared pool, so toggling back to `Additional servers` restores the prior values instead of resetting the form.

## 2026-06-10

### Maria — Topology Layer Boxes

- **Date:** 2026-06-10T12:17:00+02:00
- **Owner:** Maria
- **Scope:** Topology visualization structure

**Decision**
Each logical layer in the topology should have its own uber box:
1. **Sources** (top) — data-generating devices (firewalls, servers, SaaS)
2. **Collection Layer** — intermediaries that receive/aggregate data (Cribl, collector VMs, Linux forwarders)
3. **Transformation Layer** — DCRs/DCEs that define transformation and routing rules
4. **Workspace** (bottom) — Microsoft Sentinel

Every component must belong to exactly one layer box — no floating/orphaned nodes.

**Why**
Structural clarity — every node has a named home, reinforces the strict vertical hierarchy.

---

### Maria — Topology fix prioritization

**Date:** 2026-06-10T12:47:00+02:00  
**By:** Maria (via Squad)  
**Scope:** Topology spec compliance audit

**What**
Prioritized topology spec compliance fixes in dependency order:
- **P0:** Add 4-layer uber boxes (foundational — Sources/Collection/Transformation/Workspace)
- **P1:** Refactor Cribl into Collection Layer (bug-cribl-001, high risk)
- **P2:** Sentinel weighted centering (constraint #10, isolated)
- **P3:** Stabilize layout across filter changes (constraint #9)
- **P4:** Fix discovered VM banding (minor, follows P0)

**Why**
Audit revealed structural non-compliance with topology-spec.md. P0 is foundational — all other fixes depend on the layer model existing.

## 2026-06-12

### Joi — VM+DCR Chain Validation for Source Status

**Date:** 2026-06-12  
**Author:** Joi (documentation)  
**Requested by:** Maria  
**Status:** Implemented  

**Context**

Prior to v1.3, source status for all connector types (including `syslog_cef`, `windows_events`, and `linux_server`) was determined via table-based detection: if the connector's target table had recent rows, it was marked CONNECTED. This led to false-positive CONNECTED status when data arrived via legacy paths (e.g., direct syslog write) without the modern VM+AMA+DCR chain being deployed.

**Decision**

Source status for VM-dependent types (`syslog_cef`, `windows_events`, `linux_server`) is now determined by **VM+DCR chain validation** instead of table detection alone.

**Chain:** Source → VM (with a matching DCR for that source type) → active data flow

**DCR Type Mapping**

| Source Type | Matching DCR Types |
|-------------|-------------------|
| `syslog_cef` | `cef`, `syslog` |
| `windows_events` | `windows` |
| `linux_server` | `syslog` |

**Status Rules**

| Condition | Resolved Status |
|-----------|----------------|
| Active VMs (EPS > 0) with matching DCR exist | CONNECTED |
| Idle VMs (EPS = 0, heartbeat) with matching DCR exist | IDLE |
| No VMs with matching DCR exist | NEW |

Stale VMs are excluded from all chain validation and not rendered.

**Impact**
- `getSourceStatus()` in `topology.js` updated.
- Existing VMs node rendering logic updated.
- Calculated VMs node rendering logic updated.
- Documentation: `docs/topology-spec.md` updated (v1.3), new §7 added.

---

## 2026-06-15

### K — Layer Box Gap Increase — topology.js

**Date:** 2026-06-15  
**Author:** K (Frontend Dev)  
**Status:** Applied

**Problem**

The "PIPELINE & TRANSFORMATIONS" layer box visually overlapped the "COLLECTION INFRASTRUCTURE" layer box in the top band of the topology diagram. Root cause: `LAYER_GAP = 20` in `createLayerBoxNodes` provided only 20 px between box borders — visually indistinguishable from overlap given 2 px dashed borders and labels.

**Changes Applied**

| File | Line | Change | Reason |
|---|---|---|---|
| `js/modules/topology.js` | 1129 | `topIntermediaryOffsetY` 420 → **460** | Extra separation between source band bottom and first intermediary layer (server/DCR nodes) |
| `js/modules/topology.js` | 1837 | collectorVm Y offset `+80` → **`+120`** | Without this, collectorVm nodes protrude ABOVE the collection layer box when LAYER_GAP=45. `topIntermediaryOffsetY` does NOT control collectorVm positioning. |
| `js/modules/topology.js` | 2005 | Same collectorVm offset for syslog path | Same reason as above |
| `js/modules/topology.js` | 2338 | `LAYER_GAP` 20 → **45** | Primary fix — enforces 45 px minimum between layer box borders |

**Rule reinforced**

Do NOT fix layer overlap by shrinking box heights (FAILURE 5). The fix direction is always to ADD SPACE between nodes or increase gap constants.

---

### K — Measured EPS into syslog/CEF sizing drawer default

**Author:** K  
**Date:** 2026-06-15T12:10:52+02:00  
**Status:** Implemented

**Context**

The workspace discovery KQL query (app.js lines 1016–1040) already measures actual EPS from Syslog + CommonSecurityLog + SecurityEvent tables over the last 24 h. The result lands at `window.discoveredInfrastructure.summary.totalEPS`. Until now, the syslog/CEF sizing drawer always defaulted to `DEFAULT_FIREWALL_EPS = 1000` regardless of what had been measured.

**Decision**

`createDefaultSizingDraft(type, options = {})` gains an optional second parameter. When `type === 'firewall'` and `options.measuredEps` is a positive number, it uses that value as the default EPS; otherwise it falls back to `DEFAULT_FIREWALL_EPS`.

Both `solutions.js` and `gantt-planner.js` read `window.discoveredInfrastructure?.summary?.totalEPS` at the moment the drawer opens and pass it via `{ measuredEps }` to `createDefaultSizingDraft`.

When `measuredEpsValue > 0` a note "📊 Based on workspace measurement (24h avg)" is shown immediately below the EPS input field in both drawers.

**Files changed**

- `js/modules/capacity.js` — `createDefaultSizingDraft` signature
- `js/modules/solutions.js` — `buildDraft`, defaults button, EPS field visual indicator
- `js/gantt-planner.js` — draft init, defaults button, EPS field visual indicator
- `css/style.css` — `.solution-sizing-measurement-note`, `.gantt-detail-sizing__measurement-note`

---

### Sebastian — Populate duration data for 8 Tier 1 connectors

**Author:** Sebastian  
**Date:** 2026-06-15T12:10:52+02:00  
**Status:** Implemented  
**Requested by:** Maria (madesous)

**Context**

Only Windows Security Events had fully populated `planner.setup_tasks` duration data. The remaining 488 connectors had `duration: null`, breaking the planning card view and effort bar in the Gantt planner. This decision covers the enrichment of the 8 highest-priority Tier 1 connectors.

**Connectors Enriched**

| Connector | Type | Tasks | Total Duration |
|---|---|---|---|
| `azure-activity` | Native / Azure diagnostic | 4 | 2.0 days |
| `microsoft-entra-id` | Native / M365 | 4 | 2.5 days |
| `defender-xdr` | Native / M365 | 4 | 2.5 days |
| `azure-firewall` | Native / Azure diagnostic | 4 | 2.5 days |
| `microsoft-365` | Native / M365 | 4 | 2.0 days |
| `common-event-format` | Infrastructure / CEF forwarder | 8 | 8.0 days |
| `windows-dns-events-via-ama` | Infrastructure / AMA | 8 | 7.0 days |
| `windows-forwarded-events` | Infrastructure / WEC + AMA | 10 | 11.0 days |

**Key Decisions**

1. Owner role split for content vs. tuning: Deployment → SOC Engineer; Validation → SOC Analyst
2. Standard 4-task phase mapping for native connectors
3. M365 connector prerequisite owner is Identity / RBAC Admin; Azure diagnostic is Azure Platform Admin
4. CEF expansion from 4 to 8 tasks for VM provisioning, Arc onboarding, AMA installation, DCR creation, source device config

**Files Changed**

- `data/solutions.json` — 8 connectors' `planner.setup_tasks` arrays updated
- `scripts/patch_tier1_durations.py` — reproducible patch script

---

## 2026-06-16

### K — Cribl sizing signal and explicit routing

**Date:** 2026-06-16 (~morning)  
**Status:** Implemented  
**Scope:** `data/solutions.json`, `js/modules/topology.js`, planner table defaults

**Decision**

- Syslog/CEF content packs that depend on shared CEF infrastructure but do not look like firewalls by name should carry explicit sizing metadata via `capacity_type: "eps"` instead of relying on text heuristics.
- Topology Cribl routing should only activate when the saved sizing profile records an explicit drawer choice (`criblIngestionExplicit: true`) and the saved value is opted in.
- The planner table's Task Name column default width must be updated in both CSS fallback layout and `gantt-planner.js` default column metadata because runtime JS sets `--gantt-table-columns`.

**Why**

- Trend Micro Deep Security, Tipping Point, and Apex One were `cribl_eligible` and `fieldPack: "syslog-cef"`, but their names did not match the firewall-family heuristic, so no EPS sizing drawer rendered.
- Without an explicit drawer save, topology fallback routing could still send those solutions through Cribl, which contradicted the user's actual choice surface.
- The Task Name column width change in CSS alone would be ignored in the default planner render because JS overwrites the column template.

---

### K — Cribl Default Routing for Eligible Connectors

**Date:** 2026-06-15T12:10:52+02:00  
**Author:** K  
**Status:** Implemented  
**File:** `js/modules/topology.js`

**Context**

When a user selects Cribl Stream (Step 2) and then adds a `cribl_eligible` connector (e.g. Barracuda) without opening its sizing drawer, the topology was incorrectly placing a collector VM on that connector path instead of routing it through Cribl Stream.

**Decision**

`isCriblRoutedSolution` was extended to accept a third parameter `criblActive: boolean` and now applies a three-priority resolution:

1. **Explicit user preference (`criblIngestionExplicit: true`)** — return the saved `criblIngestion` value in either direction (opt-in or opt-out both respected).
2. **Saved sizing with `criblIngestion: true`** (no explicit flag) — return `true`.
3. **Default fallback** — return `criblActive && solution.cribl_eligible === true`.

**Test Scenario**

1. Select Cribl in Step 2.
2. Select Barracuda (syslog/CEF, `cribl_eligible: true`) in Step 3.
3. Navigate directly to topology (Step 4) without opening Barracuda's sizing drawer.
4. **Expected:** Barracuda routes Source → Cribl Stream → Custom DCR → Sentinel (no collector VM).

---

### K — Welcome CTA workspace gate only applies to expired linked workspaces

**Date:** 2026-06-16T10:38:59.953+02:00  
**Author:** K  
**Status:** Implemented  
**File:** `js/app.js`

**Context**

The welcome CTA gate was disabling both **Start planning** and **Resume saved progress** whenever no workspace token was present, including immediately after a full reset. Reset clears `sentinelPlanner.workspaceConnectionState`, so a fresh reload should behave like an optional workspace connection, not a forced reconnect flow.

**Decision**

`syncWorkspaceValidationButtons()` now distinguishes between:

1. **Expired workspace with preserved `selectedWorkspace`** → gate the CTA buttons and prompt a reconnect.
2. **Plain disconnected state with no saved workspace** → keep CTA buttons enabled.

**Outcome**

- Reset/fresh-start flows are no longer blocked on workspace connection.
- Saved progress that never used a workspace remains resumable without a reconnect prompt.
- Expired linked workspace sessions still protect the user from continuing with stale workspace-bound state.

---

### Sebastian — Featured Solution Task Rewrite

**Date:** 2026-06-16T13:45:48+02:00
**Author:** Sebastian (Data Engineer)
**Requested by:** Maria (madesous)
**Status:** Implemented

**Context**

15 solutions are flagged `isFeatured: true`. Of these, 4 already had hand-crafted tasks (azure-activity, defender-for-cloud, defender-xdr, microsoft-entra-id). The remaining 11 had been enriched by the Tier 3 batch script with generic templated tasks. These are the most visible solutions in the app, so low-quality tasks were a UX and credibility problem.

**Decision**

Replace `planner.setup_tasks` for all 11 remaining featured solutions with product-specific, hand-crafted tasks written directly as Python data structures in `scripts/patch_featured_tasks.py`.

**Solutions patched (11)**

| Group | Solution | Old Tasks | New Tasks | Total Days |
|-------|----------|-----------|-----------|------------|
| A — Multi-cloud | aws | 4 (generic) | 6 | 5.0d |
| A — Multi-cloud | google-cloud-platform-iam | 4 (generic) | 6 | 5.0d |
| A — Multi-cloud | threat-intelligence-new | 4 (generic) | 5 | 3.0d |
| B — Domain/content | dns-essentials | 4 (generic) | 4 | 2.0d |
| B — Domain/content | network-session-essentials | 4 (generic) | 4 | 2.0d |
| B — Domain/content | apache-log4j-vulnerability-detection | 4 (generic) | 4 | 2.0d |
| B — Domain/content | security-threat-essential-solution | 4 (generic) | 4 | 2.0d |
| C — Playbooks | virus-total | 4 (generic) | 4 | 2.5d |
| C — Playbooks | sentinel-soa-ressentials | 4 (generic) | 5 | 3.5d |
| D — Workbooks | soc-handbook | 4 (generic) | 4 | 2.0d |
| D — Workbooks | ueba-essentials | 4 (generic) | 4 | 2.5d |

**Key Design Choices**

1. **Group-specific task arcs** — Multi-cloud needs infrastructure-setup; Domain solutions need prerequisite *verification*; Vulnerability packs name source tables explicitly; Playbook-only skip connector/analytics; Workbook-only include UEBA baseline window requirement.
2. **Owner role discipline** — Infrastructure tasks to AWS/GCP Cloud Admin; Connector config to AWS Cloud Admin; Content deployment to SOC Engineer; Validation to SOC Analyst.
3. **ASIM parser as first-class task** — DNS Essentials and Network Session Essentials require ASIM parsers deployed before analytics rules can function.
4. **Realistic durations** — Multi-cloud infrastructure 1.0–1.5d; Content deployment 0.5d; Playbook API 0.5–1.0d; Validation/tuning 0.5d each.

**Impact**

The 11 most visible solutions in the planner app now show accurate, actionable onboarding task descriptions. Engineers will no longer be misled by generic descriptions that omit critical infrastructure steps.

---

### Sebastian — High-Value Non-Featured Task Rewrite — Batch A

**Date:** 2026-06-16T13:51:05+02:00
**Author:** Sebastian (Data Engineer)
**Requested by:** Maria (madesous)
**Status:** Implemented

**Context**

After rewriting tasks for 11 featured solutions, the next tier is the 25 highest-impact non-featured solutions. These are major enterprise security products (Zscaler, BloodHound Enterprise, Vectra XDR) where onboarding complexity warrants product-specific guidance.

**Decision**

Replace `planner.setup_tasks` for 24 high-value non-featured solutions with bespoke, product-specific tasks written directly as Python data structures in `scripts/patch_highvalue_tasks.py`.

**Key Design Choices**

1. **Phased analytics deployment** — BloodHound Enterprise (102 rules) and Falcon Friday (30 rules) use Phase 1 / Phase 2 analytics deployment tasks to avoid false positive storms.
2. **NSS/log-streaming topology as dedicated task** — Zscaler NSS requires architectural decisions before connector config begins (2.0-day task).
3. **AD collector agents separate from BloodHound connector** — Makes explicit that BHE portal data collection is the prerequisite to Sentinel connector.
4. **ASIM parser test as task acceptance criterion** — Content-only ASIM domain solutions include exact KQL parser calls as verifiable acceptance criteria.
5. **Owner role discipline for third-party products** — Product-side prerequisites assigned to appropriate product admin role (BloodHound Admin, Zscaler Admin, etc.).
6. **Table name specificity** — Every solution references its actual Sentinel log table.

**Solutions patched (24)**

Includes microsoft-business-applications, microsoft-defender-for-endpoint, blood-hound-enterprise, zscaler, vectra-xdr, rubrik-security-cloud, corelight, cisco-umbrella, sap-btp, palo-alto-prisma-cloud-2, sentinelone, cisco-secure-endpoint, cloudflare, imperva-cloud-waf, google-cloud-platform-dns, google-workspace-reports, tanium, theom, falcon-friday, web-session-essentials, endpoint-threat-protection-essentials, censys, global-secure-access, microsoft-defender-threat-intelligence

**Protected / skipped solutions**

- azure-activity, defender-for-cloud, defender-xdr, microsoft-entra-id (existing Tier 1)
- azure-firewall (already Tier 1 quality, explicitly skipped per brief)

**Impact**

The 24 highest-value non-featured solutions now show accurate, actionable onboarding task descriptions. The 3 most complex third-party solutions (Zscaler, BloodHound Enterprise, Vectra XDR) have task arcs specifically designed around their unique onboarding requirements.

---

### Sebastian — Populate full planner task metadata for 41 Tier 2 connectors

**Author:** Sebastian  
**Date:** 2026-06-16T12:02:17+02:00  
**Status:** Implemented  
**Requested by:** Maria (madesous)

**Context**

After Tier 1 enrichment (9 connectors), 479 solutions remained without `duration` in their `planner.setup_tasks`. This decision covers enrichment of all 41 Tier 2 connectors.

**Standard 4-task phase mapping**

| Order | `category` | `phase` | Owner Role | Skill |
|---|---|---|---|---|
| 1 | `setup` | `Prerequisites` | `Identity / RBAC Admin` (M365) / `Azure Platform Admin` (Azure) | beginner |
| 2 | `setup` | `Configuration` | `Azure Platform Admin` | beginner |
| 3 | `phase-1` | `Operationalization` | `SOC Engineer` | intermediate |
| 4 | `phase-2` | `Validation` | `SOC Analyst` | intermediate |

**Solutions enriched (41)**

- M365 Security: 20 solutions (defender-for-cloud, defender-for-cloud-apps, mde, mdi, dfo, mdti, gsa, eia, eip, a365, m365a, mcop, exop, exol, pbi, proj, purv, pip, teams, mba)
- Azure Native: 18 solutions (batch, cognitive-search, ddos, devops-auditing, event-hubs, key-vault, aks, logic-apps, nsg, resource-graph, security-benchmark, service-bus, sql-database, storage, stream-analytics, waf, sysmon-for-linux, windows-sql)
- Infrastructure: 3 solutions (windows-firewall-via-ama, windows-forwarded-events-via-ama, sysmon-via-ama — duration addition only)

**Files Changed**

- `data/solutions.json` — 41 connectors' `planner.setup_tasks` arrays updated
- `scripts/patch_tier2_durations.py` — reproducible patch script with full CATALOG dict

---

### Sebastian — Populate full planner task metadata for 438 Tier 3 third-party connectors

**Author:** Sebastian  
**Date:** 2026-06-16T13:00:41+02:00  
**Status:** Implemented  
**Requested by:** Maria (madesous)

**Context**

After Tier 1 (9) and Tier 2 (41) enrichment, 438 third-party solutions remained without full `planner.setup_tasks` metadata. All had `effort_hours` populated but were missing `id`, `duration`, `category`, `phase`, `owner_role`, `depends_on`, and `description`.

**Standard 4-task metadata table (uniform across all 438 solutions)**

| Order | `category` | `phase` | `owner_role` | `skill_level` |
|---|---|---|---|---|
| 1 | `setup` | `Prerequisites` | `Azure Platform Admin` | `beginner` |
| 2 | `setup` | `Configuration` | `SOC Engineer` | `beginner` |
| 3 | `phase-1` | `Operationalization` | `SOC Engineer` | `intermediate` |
| 4 | `phase-2` | `Validation` | `SOC Analyst` | `intermediate` |

**ID abbreviation scheme**

- Take the first letter of each hyphen-separated word in the solution `id`, max 4 chars
- Append suffix: `-prereqs`, `-configure`, `-content`, `-validate`
- Examples: `azure-cloud-ngfw-by-palo-alto-networks` → `acnb-*`; `crowdstrike` → `cro-*`; `blackberry-cylance-protect` → `bcp-*`

**Duration derivation formula**

```
effort_hours <= 1.5  →  duration = 0.5 days
effort_hours <= 3.0  →  duration = 1.0 day
effort_hours <= 5.0  →  duration = 1.5 days
effort_hours <= 8.0  →  duration = 2.0 days
effort_hours >  8.0  →  duration = 3.0 days
```

**Key Decisions**

1. **Uniform owner_role for task 1** across all Tier 3 solutions is `Azure Platform Admin`. Third-party connectors (CEF/syslog, APIs, agents) route through Azure infrastructure.
2. **Description strategy:** Reuse task text verbatim — with 438 × 4 tasks, bespoke descriptions have marginal value when existing `task` field is already descriptive.
3. **Batch script approach** — Derives all metadata algorithmically. No per-solution catalog needed at 438-connector scale.
4. **Skill level override** — Overwrites tasks 3 and 4 with `skill_level: "intermediate"` to conform to canonical 4-task pattern.

**Verification**

- **488 total solutions** with full duration data (9 Tier 1 + 41 Tier 2 + 438 Tier 3)
- **0 validation errors**
- **0 Tier 1/2 solutions modified** — idempotency guard prevented any re-patching
- **JSON valid** — parseable with `json.load()`
- **Duration distribution (Tier 3):** `{0.5: 98, 1.0: 683, 1.5: 629, 2.0: 265, 3.0: 141}` tasks across all 438 solutions (1,816 tasks total)

**Files Changed**

- `data/solutions.json` — 438 connectors' `planner.setup_tasks` arrays updated in-place
- `scripts/patch_tier3_durations.py` — reproducible algorithmic patch script

