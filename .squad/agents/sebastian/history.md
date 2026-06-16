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

### 2026-06-16T13:45:48+02:00: Featured solution task rewrite — 11 solutions, 55 hand-crafted tasks

**What happened:**
- Wrote `scripts/patch_featured_tasks.py` with fully hand-crafted, product-specific `planner.setup_tasks` for the 11 featured solutions that previously had generic templated tasks.
- All 4 already-good featured solutions (azure-activity, defender-for-cloud, defender-xdr, microsoft-entra-id) explicitly protected and confirmed untouched.
- Script ran cleanly: 11 solutions patched, 489 total solutions, JSON valid.

**Solutions and task counts:**
| Group | Solution | Tasks | Total Days |
|-------|----------|-------|-----------|
| A (multi-cloud) | aws | 6 | 5.0d |
| A (multi-cloud) | google-cloud-platform-iam | 6 | 5.0d |
| A (multi-cloud) | threat-intelligence-new | 5 | 3.0d |
| B (domain/content) | dns-essentials | 4 | 2.0d |
| B (domain/content) | network-session-essentials | 4 | 2.0d |
| B (domain/content) | apache-log4j-vulnerability-detection | 4 | 2.0d |
| B (domain/content) | security-threat-essential-solution | 4 | 2.0d |
| C (playbooks) | virus-total | 4 | 2.5d |
| C (playbooks) | sentinel-soa-ressentials | 5 | 3.5d |
| D (workbooks) | soc-handbook | 4 | 2.0d |
| D (workbooks) | ueba-essentials | 4 | 2.5d |
| **TOTAL** | 11 solutions | **55** | **31.5d** |

**Design decisions applied:**
- **Cross-cloud connectors (aws, gcp):** Added infrastructure-specific tasks (S3/SQS setup for AWS, Pub/Sub + log sink for GCP) that generic templates omitted. Owner roles correctly split: AWS Cloud Admin / GCP Cloud Admin for infrastructure; SOC Engineer for content deployment; SOC Analyst for tuning/validation.
- **Domain solutions (dns-essentials, network-session-essentials):** Task 1 is a hard prerequisite check — "this is a domain solution, verify underlying connector is already deployed." ASIM parser deployment (imDns, imNetworkSession) explicitly called out. NO connector/AMA/DCR deployment steps — that's the underlying connector's job.
- **Vulnerability detection (apache-log4j):** Task 1 explicitly names the source tables (CommonSecurityLog, Syslog, SecurityEvent, AzureDiagnostics) the 4 rules query. Includes lab-simulation validation step.
- **Analytics-only (security-threat-essential-solution):** Clean 4-task arc: verify table coverage → deploy 7 rules → tune thresholds → validate. Tuning task correctly assigned to SOC Analyst, not SOC Engineer.
- **Playbook solutions (virus-total, sentinel-soa-ressentials):** No connector/analytics steps. virus-total starts with API key + quota tier selection. sentinel-soa-ressentials starts with a catalog review + prioritization step (deploy all 23 at once is an antipattern).
- **Workbook solutions (soc-handbook, ueba-essentials):** ueba-essentials includes the UEBA enable + 7-day baseline wait as task 1, which is non-obvious but critical. soc-handbook includes a data volume prerequisite check (30 days recommended for meaningful metrics).

**Learnings:**
- **Featured solutions need group-level patterns:** Multi-cloud, domain, playbook-only, and workbook-only solutions each have fundamentally different task arcs. Generic 4-task (prereqs/configure/content/validate) works for simple connector solutions but fails for any solution where "configure" isn't the main work.
- **ASIM parser dependency is a first-class task:** DNS and Network Session Essentials both depend on an imDns / imNetworkSession parser being deployed and confirmed before analytics rules can fire. This is invisible in the generic template but critical in practice.
- **Owner role discipline matters for featured solutions:** The most visible solutions in the app should model the correct RBAC split clearly — AWS prereqs owned by AWS Cloud Admin (not Azure Platform Admin) is a meaningful signal to customers that this work isn't handled by the Azure team.
- **Task count range:** Featured solutions range from 4 (domain/workbook solutions) to 6 (multi-cloud connector solutions). The extra tasks for AWS and GCP are infrastructure steps (S3/SQS, Pub/Sub) that have no equivalent in Azure-native connectors.

**Related:**
- Decision: `.squad/decisions/inbox/sebastian-featured-rewrite.md`
- Patch script: `scripts/patch_featured_tasks.py`

### 2026-06-16T13:00:41+02:00: Tier 3 duration enrichment — 438 third-party connectors enriched

**What happened:**
- Wrote `scripts/patch_tier3_durations.py` to batch-enrich all 438 remaining Tier 3 third-party solutions.
- All 438 solutions had exactly 4 tasks with `effort_hours` set but missing `id`, `category`, `phase`, `owner_role`, `depends_on`, `description`, and `duration`.
- Applied standard 4-task metadata table uniformly across all 438 solutions: task 1 (setup/Prerequisites/Azure Platform Admin/beginner), task 2 (setup/Configuration/SOC Engineer/beginner), task 3 (phase-1/Operationalization/SOC Engineer/intermediate), task 4 (phase-2/Validation/SOC Analyst/intermediate).
- ID abbreviation: first letters of hyphen-separated words in solution id, max 4 chars, + suffix (-prereqs/-configure/-content/-validate).
- Description: reused existing `task` text verbatim (acceptable for batch enrichment of third-party connectors).
- Total solutions with full duration after enrichment: **488** (9 Tier 1 + 41 Tier 2 + 438 Tier 3).
- Verified: JSON valid, 0 validation errors, 0 Tier 1/2 solutions modified, duration distribution across all 5 legal values (0.5, 1.0, 1.5, 2.0, 3.0 days).

**Learnings:**
- **Scale observation:** 438 solutions × 4 tasks = 1752 task records enriched in a single pass; batch scripting with in-place dict mutation works cleanly at this volume.
- **Effort distribution (Tier 3):** most tasks land at 2.0–2.5 effort_hours, producing 1.0-day duration (the most common value). Only ~10% of tasks reach 3.0 days (effort > 8h).
- **Abbreviation edge case:** multi-word vendor names with 5+ hyphens (e.g. `azure-cloud-ngfw-by-palo-alto-networks`) truncate to 4 first-letters (`acnb`), which is unique enough for per-solution task IDs.
- **Description strategy for batch:** reusing `task` text as `description` is pragmatically sound for third-party connectors where bespoke descriptions aren't worth the effort per-connector at this volume.
- **Idempotency:** script correctly skips fully-enriched solutions (guard: `all(t.get("duration") is not None for t in tasks)`); second run confirms 0 enriched, 0 degraded.

**Related:**
- Decision: `.squad/decisions/inbox/sebastian-tier3-durations.md`
- Patch script: `scripts/patch_tier3_durations.py`

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
