# History — Sebastian

## Project Context
- **Project:** Sentinel Onboarding Planner v2
- **Stack:** HTML/CSS/JS, Fluent UI web components, solutions.json data catalog
- **User:** madesous
- **Created:** 2026-05-18

## Summary (Consolidated 2026-06-12)

**Key learning areas established (May 18–June 11):**
- **Data Model:** solutions.json enrichment with value_scoring, planner tasks, export metadata; field pack enum (9 packs); Cribl eligibility marking and routing.
- **Task Hierarchy:** Windows Security Events pattern (subtasks, dependencies, effort rollups); RBAC deduplication via fingerprint matching; Excel export formatting.
- **Capacity & Sizing:** AMA, WEC, Pipeline throughput patterns; EPS-driven collector scaling; Windows-conservative (5k EPS) vs Linux-aggressive (10k EPS) thresholds.
- **Topology & Routing:** Cribl-eligible solution filtering; fieldPack enum application; vendor-row Cribl eligibility; connector visibility in routing logic.
- **Business Logic:** Priority scoring (40% impact, 20% complexity, 15% setup time, 15% detection, 10% maturity); phased deployment grouping; connector sequencing for onboarding.

**Detailed prior work archived to history-archive.md** (entries 2026-05-18 through 2026-06-09, 15+ sections covering data enrichment, RBAC analysis, solutions QA, capacity validation, topology refactoring).

## Recent Work

### 2026-06-15T12:10:52+02:00: Tier 1 duration data — 8 connectors enriched

**What happened:**
- Populated `duration`, `effort_hours`, `skill_level`, `id`, `category`, `phase`, `depends_on`, `owner_role`, and `description` for 8 Tier 1 connectors in `data/solutions.json`.
- 5 native/cloud connectors (azure-activity, microsoft-entra-id, defender-xdr, azure-firewall, microsoft-365): each received a clean 4-task array preserving existing task text, adding all missing fields.
- common-event-format: expanded from 4 generic tasks to 8-task infrastructure arc (prereqs × 2 → forwarder VM/AMA → DCR + rsyslog config → source device config → validation → analytics content → operationalization doc).
- windows-dns-events-via-ama: 8 existing detailed tasks, duration added in-place (0.5–2 days per task).
- windows-forwarded-events: 10 existing detailed tasks, duration added in-place (0.5–3 days per task).

**Learnings:**
- **Owner role split pattern (Maria's directive):** content deployment tasks (analytics rules, workbooks, hunting queries) → `SOC Engineer`; tuning and verification tasks → `SOC Analyst`. This is now the canonical pattern for all future connector enrichment.
- **Native connector total durations:** simple M365/Azure diagnostic connectors land at 2 days total (4 × 0.5d). Azure Firewall and Entra ID content tasks take 1d each, giving a 2.5d total.
- **CEF infrastructure arc:** 8 tasks totalling ~8 days (1+0.5+2+1.5+1+1+0.5+0.5). This is the reference pattern for any connector requiring a Linux syslog/CEF forwarder.
- **Patch script pattern:** surgical Python JSON patch via `scripts/patch_tier1_durations.py` — load → iterate by id → replace or patch-in-place → write. Kept as a reproducible artifact in scripts/ for future batch enrichment.
- **Phase mapping for native connectors:** prereqs → `setup/Prerequisites`; connector enable → `setup/Configuration`; content deploy → `phase-1/Operationalization`; validation → `phase-2/Validation`.

**Related:**
- Decision: `.squad/decisions/inbox/sebastian-tier1-durations.md`
- Patch script: `scripts/patch_tier1_durations.py`

### 2026-06-12T09:00:00Z: Topology Cribl routing fix — connector filtering gate removal

**What happened:**
- Coordinator fixed the connector filtering logic in js/modules/topology.js (line 815).
- Previous logic silently dropped solutions with fieldPack or cribl_eligible markers by filtering to connectors: 0 only.
- Fixed to allow these solutions through to topology routing decision logic.

**Impact:**
- 52 syslog-cef connectors now correctly visible in topology rendering.
- Cribl vs forwarder routing now honors user's sizing drawer choice for all eligible sources.
- Data domain: Removed the disconnect between upstream data model (cribl_eligible, fieldPack) and topology-layer routing visibility.

**Related:**
- .squad/decisions/inbox/sebastian-cribl-refactor-plan.md — cribl_eligible field population strategy
- Coordinator's topology fix log: .squad/orchestration-log/2026-06-12T0900-topology-fix.md
