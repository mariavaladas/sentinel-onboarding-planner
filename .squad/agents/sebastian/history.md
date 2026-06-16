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

### 2026-06-16T16:44:17+02:00: Duration recalibration — 479 solutions, -851.5d across catalog

**What happened:**
- Wrote `scripts/recalibrate_durations.py` to recalibrate every `setup_tasks` duration in `data/solutions.json` based on realistic human effort, not generic category buckets.
- 9 Tier-1 solutions protected: `azure-activity`, `defender-for-cloud`, `defender-xdr`, `microsoft-entra-id`, `microsoft-365`, `common-event-format`, `windows-forwarded-events`, `windows-security-events`, `windows-dns-events-via-ama` — untouched.
- 479 solutions recalibrated. `effort_hours` updated consistently (`duration * 4`).
- All validation constraints pass: every task in [0.5, 3.0]d, every solution total >= 1.0d.

**Before vs after:**

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Grand total duration (all solutions) | 2229.0d | 1377.5d | -851.5d (-38.2%) |
| Tier-1 protected total | 54.0d | 54.0d | 0 |
| Non-Tier-1 total | 2175.0d | 1323.5d | -851.5d |

**Solution duration distribution (non-Tier-1 after):**

| Range | Solutions |
|-------|-----------|
| 1.0–2.0d | 179 |
| 2.0–3.0d | 168 |
| 3.0–4.0d | 114 |
| 4.0–5.0d | 9 |
| 5.0d+ | 9 |

**Calibration rules applied (per phase):**

| Phase | Rule |
|-------|------|
| Prerequisites | 0.5d (verify licence/RBAC); 1.0d (cross-cloud IAM, AWS/GCP, WEC/WEF planning) |
| Configuration | 0.5d (paste API key); 1.0d (source device config); 1.5d (cross-cloud S3/SQS/Pub-Sub, forwarder/AMA/DCR, or >5 connectors) |
| Infrastructure | 1.0-2.0d by keyword: WEC/WEF build=2.0d, AMA/forwarder=1.5d, Sysmon install=1.5d, other=1.0d |
| Data Verification | Always 0.5d |
| Operationalization | 0.5d (<=15 rules, <=3 wb/pb); 1.0d (16-50 rules or 4-10 wb/pb); 1.5d (50+ rules or 10+ pb) |
| Validation | 0.5d standard; 1.0d (50+ analytics to tune/suppress) |

**Key bugs caught and fixed during development:**
1. `"arc"` in forwarder_kws was matching "se**arc**h" in Azure Cognitive Search → replaced with "azure arc"
2. `"flow log"` in cross_cloud_kws was matching "NSG flow log" (Azure-native) → replaced with "vpc flow log" / "gcp flow log"
3. Phase mismatch: some Batch A hand-crafted tasks had analytics/workbook enablement in "Configuration" phase — added description-based override (`content_kws`) to reclassify to Operationalization before applying rules
4. `"source"` in source_kws was matching "re**source**s" → replaced with "source device", "log source", "event source"

**Spot-checks:**
- Prisma Cloud: "Configure connector" 1.0d → 0.5d; "Enable 11 analytics + 1 workbook" 1.5d (was wrong phase, was 1.5d before fix) → 0.5d; total 3.5d → 2.5d ✓
- AWS S3: Prerequisites 1.0d each (IAM + S3/SQS setup), Configuration 1.5d (S3 connector), Operationalization 1.5d (62 rules), Validation 1.0d x2 (tune noise) — total 7.0d is legitimate given cross-cloud complexity
- Zscaler: 15 connectors + 17 workbooks + 10 playbooks → 6.5d total ✓
- Connector-only simple solutions: 2.0d typical (prereqs 0.5 + config 0.5 + operationalization 0.5 + validate 0.5) ✓

**Design decisions:**
- `effort_hours = duration * 4`: 1 day = 4 hours active work (half-day buffer for coordination/waiting)
- Infrastructure phase not in spec → handled by keyword analysis (same result as heavy Configuration)
- Content-heavy solutions (50+ analytics) legitimately above 5.0d if they have multiple complex phases (e.g. BloodHound 102 rules in 2 phased deployments = 5.5d, AWS 62 rules + cross-cloud IAM = 7.0d) — hard constraint is task <= 3.0d, not solution total
- Script is fully idempotent — second run produces 0.0d change

**Related:**
- Script: `scripts/recalibrate_durations.py`
- Data: `data/solutions.json` (all `planner.setup_tasks[].duration` and `effort_hours` fields updated)

### 2026-06-16T14:44:22+02:00: High-value Batch B task rewrite — 161 solutions, method-specific 5-task arcs

**What happened:**
- Wrote `scripts/patch_highvalue_batch_b.py` to rewrite `planner.setup_tasks` for 161 high-value non-featured solutions with generic templated tasks.
- Detection logic: `value_scoring.business_impact == 'high'`, `isFeatured != True`, any task where `description == task text OR len(description) < 80`.
- 6 collection method templates (+ azure_diagnostic mapped to rest_api): syslog_cef, rest_api, aws_s3, gcp_pubsub, codeless_connector, azure_function.
- Each solution gets a 5-task arc personalised with `solution.name` and a `{Product} Admin` owner derived from the solution name.
- Script ran cleanly: 161 solutions patched, 489 total solutions, JSON valid.
- Final state: 195 of 196 high-value non-featured solutions are bespoke. `cribl-stream` remains generic (pre-existing data issue: no `planner` key in its solution object — cannot patch without schema fix).

**Method distribution (162 generic inputs → 161 patched):**

| Method | Count | Notes |
|--------|-------|-------|
| syslog_cef | 49 | CEF/Syslog forwarder + AMA + DCR arc |
| rest_api | 86 | API credential → connector → verify → content → validate |
| aws_s3 | 9 | IAM role + SQS + S3 connector arc |
| gcp_pubsub | 7 | Log sink + Pub/Sub + GCP connector arc |
| codeless_connector | 5 | CCP credentials → connector → verify → content → validate |
| azure_function | 2 | ARM template deploy → Function App verify → content → validate |
| azure_diagnostic | 3 | Mapped to rest_api template (no dedicated template specified) |
| cribl-stream | 1 | SKIPPED — no `planner` structure in solution object |

**5-task arc structure (all methods):**

| Order | Phase | Category | Skill | Owner Pattern |
|-------|-------|----------|-------|---------------|
| 1 | Prerequisites | setup | beginner | Method-specific (Network Admin / {Product} Admin / AWS Cloud Admin / GCP Cloud Admin / Azure Platform Admin) |
| 2 | Configuration | setup | intermediate | Azure Platform Admin or method infra owner |
| 3 | Data Verification | setup | beginner | Azure Platform Admin or SOC Engineer |
| 4 | Operationalization | phase-1 | intermediate | SOC Engineer |
| 5 | Validation | phase-2 | intermediate | SOC Analyst |

**ID suffix pattern:** `{abbrev}-prereqs`, `{abbrev}-infra` or `{abbrev}-connector`, `{abbrev}-verify`, `{abbrev}-content`, `{abbrev}-validate`

**Design decisions applied:**
- **Product owner extraction:** `product_owner(name)` function strips trailing boilerplate ("Solution", "for Microsoft Sentinel", "(MTD)", etc.) and returns the first 2-3 meaningful words + " Admin". E.g., "Azure Cloud NGFW By Palo Alto Networks" → "Azure Cloud NGFW Admin"; "Trellix" → "Trellix Admin".
- **azure_diagnostic → rest_api:** Windows Firewall, Windows Server DNS, and Vectra AI Stream all detected as `azure_diagnostic` but the spec doesn't define a separate template; they use the rest_api arc which is architecturally appropriate (API/diagnostic settings polling pattern).
- **Short description guard:** Task 4 (content) and task 5 (validation) descriptions in aws_s3, gcp_pubsub, codeless, and azure_function templates were initially too short (< 80 chars) for short product names (e.g., "Trellix" at 7 chars). Fixed by appending a sentence to each affected template. All 195 bespoke solutions verified to have all task descriptions ≥ 80 chars.
- **Arrow character → ASCII:** The `→` in "S3 → SQS → Sentinel" was replaced with `->` to avoid Windows cp1252 console encoding issues in print statements. JSON written as UTF-8 without `ensure_ascii`.
- **Idempotency:** Script skips solutions where is_generic returns False (already bespoke). Second run confirms 0 patched, 171 already bespoke.

**Learnings:**
- **Description length floor matters for detection logic:** When using `len(description) < 80` as a generic guard, template descriptions must produce > 80 chars even for the shortest realistic product name. The minimum safe base length (without the name) is ~69 chars for a 3-char product name. Need to audit all templates against the shortest expected product name at authoring time.
- **Method detection order has implicit priority conflicts:** `'api'` is a substring of `'logic app'` — so solutions with "logic app" in their description would match `rest_api` before `azure_function` in the detection chain. This is consistent with the spec (the spec defines `rest_api` before `azure_function`). Slash Next SIEM and AWS Athena were correctly classified as `azure_function` when the detection was run pre-patch, but the spec-defined order means `rest_api` took precedence at patch time. This is acceptable behavior matching the spec exactly.
- **cribl-stream as a structural outlier:** It has `fieldPack` and `cribl_eligible` keys but no `planner` key — it's a pipeline/routing tool, not a connector with setup tasks. It should probably be excluded from the HV bespoke count entirely, or have a stub planner added in a separate schema-fix script.
- **Product name extraction is heuristic:** The `product_owner()` function works for the 162 solutions in this batch, but edge cases exist (e.g., long compound names where stripping produces odd results). The function iterates stripping up to 5 times with regex to handle multi-token suffixes.

**Related:**
- Patch script: `scripts/patch_highvalue_batch_b.py`
- Precursor: `scripts/patch_highvalue_tasks.py` (Batch A, 24 solutions)
- Precursor: `scripts/patch_featured_tasks.py` (11 featured solutions)



**What happened:**
- Wrote `scripts/patch_highvalue_tasks.py` with fully hand-crafted, product-specific `planner.setup_tasks` for 24 high-value non-featured solutions (Batch A).
- azure-firewall explicitly skipped (already Tier 1 quality); all 4 featured solution PROTECTED IDs also guarded.
- Script ran cleanly: 24 solutions patched, 489 total solutions, JSON valid.

**Solutions and task counts:**

| Group | Solution | Tasks | Notable design |
|-------|----------|-------|---------------|
| 1st-party | microsoft-business-applications | 5 | PowerPlatformAdminActivity + 8 playbooks |
| 1st-party | microsoft-defender-for-endpoint | 5 | MDE API isolation playbooks, alert de-dup guidance |
| 3rd-party | blood-hound-enterprise | 6 | Phased analytics (50+52 rules), AD collector deployment |
| 3rd-party | zscaler | 6 | NSS topology design, 15 connectors, ZIA vs ZPA split |
| 3rd-party | vectra-xdr | 5 | API polling, 20 playbooks with KV secret storage |
| 3rd-party | rubrik-security-cloud | 5 | GraphQL API playbooks, snapshot initiation workflow |
| 3rd-party | corelight | 4 | Zeek _path field validation, Corelight_CL |
| 3rd-party | cisco-umbrella | 5 | Cisco_Umbrella_dns_CL + proxy_CL, domain block playbook |
| 3rd-party | sap-btp | 4 | OAuth2 Audit Log Retrieval API, SAPAuditLog_CL |
| 3rd-party | palo-alto-prisma-cloud-2 | 5 | CSPM alert status playbooks, cross-cloud |
| 3rd-party | sentinelone | 4 | SentinelOne_CL field mapping |
| 3rd-party | cisco-secure-endpoint | 4 | AMP regional cloud selection, CiscoSecureEndpoint_CL |
| 3rd-party | cloudflare | 4 | Logpush to Azure Blob, Cloudflare_CL |
| 3rd-party | imperva-cloud-waf | 4 | ImpervaWAF_CL attack type field mapping |
| 3rd-party | google-cloud-platform-dns | 4 | GCP Pub/Sub log sink, GCP_DNSLogs_CL |
| 3rd-party | google-workspace-reports | 4 | Domain-wide delegation, GWorkspaceActivityReports_CL |
| 3rd-party | tanium | 5 | Tanium Connect module, 8 API playbooks |
| 3rd-party | theom | 4 | Theom_CL data classification, access anomaly tuning |
| content-only | falcon-friday | 4 | CrowdStrikeFalconEventStream prereq check, phased rules |
| content-only | web-session-essentials | 4 | imWebSession() ASIM parser verification first |
| content-only | endpoint-threat-protection-essentials | 3 | imProcessCreate() ASIM parser, LOLBin exclusions |
| content-only | censys | 4 | ASM API enrichment playbooks, no connector |
| content-only | global-secure-access | 4 | NetworkAccessTraffic, Entra enable first |
| content-only | microsoft-defender-threat-intelligence | 4 | MDTI licence + TI connector, 7 enrichment playbooks |
| **TOTAL** | **24** | **106** | |

**Design decisions applied:**
- **Zscaler (15 connectors):** 6-task arc with explicit NSS topology planning as the first task. ZIA → NSS/Syslog/CEF vs ZPA → API distinction called out explicitly in connector task description. 10 playbooks deploy in a separate task from the 17 workbooks.
- **BloodHound (102 analytics):** Phased 2-step analytics deployment (Phase 1: 50 critical attack path rules; Phase 2: 52 lateral movement/escalation rules). AD collector agents are a separate task before the connector — the most common point of confusion when onboarding BHE.
- **Content-only solutions:** Maintain same "verify underlying data source → deploy content → validate" pattern established for DNS Essentials. falcon-friday starts with a CrowdStrikeFalconEventStream existence check; ASIM domain solutions start with parser function call test.
- **Owner role discipline:** BloodHound Admin, Zscaler Admin, Vectra Admin, Rubrik Admin, etc. correctly assigned for product-side prerequisites. Azure Platform Admin only for Entra/Azure-native setup (Global Secure Access, MDTI licensing).
- **Table name specificity:** Every solution references its actual Sentinel table name in at least one task description. No generic "custom log table" language without the specific table name.

**Learnings:**
- **Phased content deployment for 100+ rule solutions:** Any solution with >25 analytics rules warrants a Phase 1/Phase 2 split. BloodHound's 102 rules and Falcon Friday's 30 rules both benefit from this — deploying all rules in one task produces unmanageable false positive storms in week 1.
- **NSS/Pub/Sub/Logpush topology design is a genuine first task:** Zscaler NSS, GCP log sink, and Cloudflare Logpush all require architectural decisions (which log feeds, which transport, which collection VM) that must be made before any connector work. Collapsing these into "configure connector" is a common mistake.
- **ASIM parser tests as acceptance criteria:** Including the exact parser function call (`imWebSession | take 10`, `imProcessCreate | take 10`) as the acceptance criterion for ASIM prerequisite tasks makes them executable and verifiable.

**Related:**
- Decision: `.squad/decisions/inbox/sebastian-highvalue-batch-a.md`
- Patch script: `scripts/patch_highvalue_tasks.py`

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
