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

