# Decision: Populate full planner task metadata for 41 Tier 2 connectors

**Author:** Sebastian  
**Date:** 2026-06-16T12:02:17+02:00  
**Status:** Implemented  
**Requested by:** Maria (madesous)

## Context

After Tier 1 enrichment (9 connectors), 479 solutions remained without `duration` in their `planner.setup_tasks`. The Gantt planner cannot render effort bars without `duration`. This decision covers the enrichment of all 41 Tier 2 connectors — the next highest-priority layer.

## Solutions Enriched

### M365 Security (20 solutions — 4 tasks each)

| Connector | Abbrev | Total Duration |
|---|---|---|
| `defender-for-cloud` | dfc | 4.0 days |
| `defender-for-cloud-apps` | dfca | 4.0 days |
| `microsoft-defender-for-endpoint` | mde | 4.0 days |
| `microsoft-defender-for-identity` | mdi | 2.5 days |
| `defender-for-office-365` | dfo | 4.0 days |
| `microsoft-defender-threat-intelligence` | mdti | 4.0 days |
| `global-secure-access` | gsa | 4.5 days |
| `microsoft-entra-id-assets` | eia | 2.5 days |
| `microsoft-entra-id-protection` | eip | 2.5 days |
| `agent-365` | a365 | 2.5 days |
| `microsoft-365-assets` | m365a | 2.0 days |
| `microsoft-copilot` | mcop | 4.5 days |
| `microsoft-exchange-security-exchange-on-premises` | exop | 2.0 days |
| `microsoft-exchange-security-exchange-online` | exol | 2.0 days |
| `microsoft-power-bi` | pbi | 4.5 days |
| `microsoft-project` | proj | 4.5 days |
| `microsoft-purview` | purv | 4.5 days |
| `microsoft-purview-information-protection` | pip | 4.5 days |
| `teams` | teams | 4.5 days |
| `microsoft-business-applications` | mba | 8.0 days |

### Azure Native (18 solutions — 4 tasks each)

| Connector | Abbrev | Total Duration |
|---|---|---|
| `azure-batch-account` | abatch | 2.0 days |
| `azure-cognitive-search` | acsrch | 2.0 days |
| `azure-ddos-protection` | ddos | 2.0 days |
| `azure-devops-auditing` | ado | 6.5 days |
| `azure-event-hubs` | aeh | 2.5 days |
| `azure-key-vault` | akv | 2.0 days |
| `azure-kubernetes-service` | aks | 2.5 days |
| `azure-logic-apps` | ala | 2.5 days |
| `azure-network-security-group` | nsg | 2.0 days |
| `azure-resource-graph` | arg | 2.0 days |
| `azure-security-benchmark` | asb | 2.0 days |
| `azure-service-bus` | asbus | 2.5 days |
| `azure-sql-database-solution-for-sentinel` | asql | 2.5 days |
| `azure-storage` | astor | 2.5 days |
| `azure-stream-analytics` | asa | 2.5 days |
| `azure-waf` | waf | 2.0 days |
| `microsoft-sysmon-for-linux` | sysml | 8.0 days |
| `microsoft-windows-sql-server-database-audit` | wssql | 4.5 days |

### Infrastructure (3 solutions — in-place duration addition only)

| Connector | Tasks | Total Duration |
|---|---|---|
| `windows-firewall-via-ama` | 7 | 6.5 days |
| `windows-forwarded-events-via-ama` | 10 | 10.0 days |
| `sysmon-via-ama` | 10 | 11.0 days |

## Decisions Made

### 1. Standard 4-task phase mapping applied consistently

All 38 standard solutions follow the canonical 4-task pattern from Tier 1:

| Order | `category` | `phase` | Owner Role | Skill |
|---|---|---|---|---|
| 1 | `setup` | `Prerequisites` | `Identity / RBAC Admin` (M365) / `Azure Platform Admin` (Azure) | beginner |
| 2 | `setup` | `Configuration` | `Azure Platform Admin` | beginner |
| 3 | `phase-1` | `Operationalization` | `SOC Engineer` | intermediate |
| 4 | `phase-2` | `Validation` | `SOC Analyst` | intermediate |

This is identical to the pattern proven in Tier 1 (azure-activity, microsoft-entra-id, defender-xdr).

### 2. M365 vs Azure task-1 owner role

Following Maria's directive:
- **M365 solutions** — task 1 (`Prerequisites`) → `Identity / RBAC Admin`  
  Reason: M365 prerequisites involve licensing verification, admin consent, and delegated permissions — squarely identity-team territory.
- **Azure solutions** — task 1 (`Prerequisites`) → `Azure Platform Admin`  
  Reason: Azure diagnostic connector prerequisites center on subscription scope, Monitoring Contributor RBAC, and workspace connectivity — platform admin territory.

### 3. Infrastructure solutions: in-place duration addition only

The 3 infrastructure solutions (windows-firewall-via-ama, windows-forwarded-events-via-ama, sysmon-via-ama) already had fully specified task arrays with ids, phases, categories, owner roles, depends_on chains, and descriptions from prior enrichment work. Only `duration` was added — derived from each task's `effort_hours` using the standard formula. All existing ids and depends_on chains were preserved unchanged.

### 4. Duration derivation formula

Canonical formula applied across all 41 solutions:
```
effort_hours <= 1.5  →  duration = 0.5 days
effort_hours <= 3.0  →  duration = 1.0 day
effort_hours <= 5.0  →  duration = 1.5 days
effort_hours <= 8.0  →  duration = 2.0 days
effort_hours >  8.0  →  duration = 3.0 days
```

### 5. Task descriptions reference actual Sentinel tables

Each task description names the specific Sentinel data tables involved (e.g., `CloudAppEvents`, `DeviceAlertEvents`, `AzureDiagnostics` filtered to resource type, `AzureDevOpsAuditing`, `KeyVaultData`, `InformationProtectionLogs_CL`). This makes the descriptions actionable for SOC engineers performing the onboarding work.

### 6. ID abbreviation scheme

IDs follow `{abbrev}-{suffix}` pattern. Suffixes: `prereqs`, `configure`, `content`, `validate`.
Sequential dependency chain: task 2 depends on task 1, task 3 on task 2, task 4 on task 3. Infrastructure solutions with existing `depends_on` chains were not modified.

## Verification

Post-enrichment verification confirmed:
- **50 total solutions** with full duration data (9 Tier 1 + 41 Tier 2)
- **9 Tier 1 solutions untouched** — all duration values, descriptions, and phase metadata intact
- **JSON valid** — parseable with `json.load()`
- **Zero Tier 2 tasks missing any of:** `id`, `duration`, `category`, `phase`, `owner_role`, `depends_on`, `description`

## Files Changed

- `data/solutions.json` — 41 connectors' `planner.setup_tasks` arrays updated
- `scripts/patch_tier2_durations.py` — reproducible patch script with full CATALOG dict (kept as data source artifact)
