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

### 2026-06-16T12:02:17+02:00: Tier 2 duration enrichment — 41 connectors enriched

**What happened:**
- Wrote `scripts/patch_tier2_durations.py` to enrich all 41 Tier 2 connectors with full `planner.setup_tasks` metadata.
- **38 standard (4-task) solutions** received: `id`, `category`, `phase`, `owner_role`, `depends_on`, `description`, and `duration` derived from `effort_hours`.
  - 20 M365 Security solutions (defender-for-cloud through microsoft-business-applications)
  - 18 Azure native solutions (azure-batch-account through microsoft-windows-sql-server-database-audit)
- **3 infrastructure solutions** (windows-firewall-via-ama, windows-forwarded-events-via-ama, sysmon-via-ama): already had ids, phases, and descriptions — `duration` added in-place only, preserving all existing task structure.
- Total solutions with full duration data after enrichment: **50** (9 Tier 1 + 41 Tier 2).
- Verified Tier 1 solutions untouched; verified JSON is valid and parseable.

**Learnings:**
- **Duration derivation formula** (confirmed canonical): effort_hours ≤1.5 → 0.5d; ≤3 → 1.0d; ≤5 → 1.5d; ≤8 → 2.0d; >8 → 3.0d.
- **Idempotency guard:** script checks `all("duration" in t for t in tasks)` before patching — important because solutions with `duration: null` (null key) would satisfy `"duration" in t` even with null values. Always check both key presence AND non-null value.
- **M365 vs Azure task 1 owner role:** M365 prerequisites = `Identity / RBAC Admin` (licensing, admin consent); Azure prerequisites = `Azure Platform Admin` (diagnostic settings scope, RBAC).
- **Infra solutions are already fully enriched:** windows-firewall-via-ama (7 tasks), windows-forwarded-events-via-ama (10 tasks), sysmon-via-ama (10 tasks) had complete metadata from prior work — only `duration` was missing.
- **ID abbreviation pattern:** 3-6 char abbreviation + suffix (-prereqs, -configure, -content, -validate). All 38 four-task solutions follow `{abbrev}-{suffix}` convention.
- **Connector-specific descriptions:** referenced actual Sentinel table names (e.g., CloudAppEvents, DeviceAlertEvents, AzureDiagnostics filtered by resource type, KeyVaultData, AzureDevOpsAuditing) to make descriptions actionable for SOC engineers.
- **Patch script as catalog:** the CATALOG dict in patch_tier2_durations.py now serves as a human-readable data source for all 38 solutions' task descriptions and abbreviations.

**Related:**
- Decision: `.squad/decisions/inbox/sebastian-tier2-durations.md`
- Patch script: `scripts/patch_tier2_durations.py`

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
