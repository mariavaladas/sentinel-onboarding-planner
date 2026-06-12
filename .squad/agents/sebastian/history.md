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
