# Decision: Populate duration data for 8 Tier 1 connectors

**Author:** Sebastian  
**Date:** 2026-06-15T12:10:52+02:00  
**Status:** Implemented  
**Requested by:** Maria (madesous)

## Context

Only Windows Security Events had fully populated `planner.setup_tasks` duration data. The remaining 488 connectors had `duration: null`, breaking the planning card view and effort bar in the Gantt planner. This decision covers the enrichment of the 8 highest-priority Tier 1 connectors.

## Connectors Enriched

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

## Decisions Made

### 1. Owner role split for content vs. tuning

Maria's directive: "Any task related to content deployment (analytics, workbooks) → SOC Engineer; anything related to tuning or verification that the content is good → SOC Analyst."

Applied consistently across all 8 connectors:
- Task deploying analytics rules, workbooks, hunting queries → `owner_role: "SOC Engineer"`
- Task validating data quality, checking records, testing rule triggers → `owner_role: "SOC Analyst"`

### 2. Phase mapping for native connectors (4-task pattern)

| Order | Task type | `category` | `phase` | Owner |
|---|---|---|---|---|
| 1 | Prerequisites (licensing, permissions, scope) | `setup` | `Prerequisites` | varies |
| 2 | Connector enablement / diagnostic settings | `setup` | `Configuration` | Azure Platform Admin |
| 3 | Content deployment (analytics, workbooks) | `phase-1` | `Operationalization` | SOC Engineer |
| 4 | Validation (verify data, test rules) | `phase-2` | `Validation` | SOC Analyst |

### 3. M365 connector prerequisite owner

For M365 connectors (entra-id, defender-xdr, microsoft-365), task 1 (licensing, admin consent, delegated permissions) is owned by `Identity / RBAC Admin` rather than `Azure Platform Admin`, as the licensing verification sits with identity teams.

For Azure diagnostic connectors (azure-activity, azure-firewall), task 1 (scope confirmation, diagnostic settings gap analysis) is owned by `Azure Platform Admin`.

### 4. CEF expansion from 4 to 8 tasks

The original 4 generic tasks were insufficient for a connector that requires VM provisioning, Arc onboarding, AMA installation, DCR creation, and source device configuration. The expanded 8-task arc follows the same pattern established for syslog-based connectors:

```
cef-prereqs-design (1d, Network Admin)
cef-prereqs-permissions (0.5d, Identity / RBAC Admin)
cef-infra-forwarder (2d, Azure Platform Admin)   ← Linux VM + Arc + AMA
cef-config-dcr (1.5d, Azure Platform Admin)      ← DCR + rsyslog/syslog-ng
cef-config-sources (1d, Network Admin)           ← source device config
cef-validate (1d, SOC Analyst)
cef-content (0.5d, SOC Engineer)
cef-operationalize (0.5d, SOC Engineer)
```

### 5. In-place patching for windows-dns-events-via-ama and windows-forwarded-events

These connectors already had fully structured tasks with ids, phases, categories, depends_on, owner_role, and descriptions. Only `duration` was missing. The patch added `duration` per task and aligned `effort_hours` to the authoritative values in the task specification (existing values were at roughly half the correct amount, likely from an earlier auto-generation pass).

## Rationale

- Duration data is required by the Gantt planner effort bar and the planning card view to render correctly.
- Using consistent phase/category taxonomy across all connectors enables effort rollups and phase-gating in the UI.
- The owner role split aligns to the actual skill and responsibility boundary in a SOC engagement: engineers deploy, analysts tune.

## Files Changed

- `data/solutions.json` — 8 connectors' `planner.setup_tasks` arrays updated
- `scripts/patch_tier1_durations.py` — reproducible patch script (kept for future batch enrichment runs)
