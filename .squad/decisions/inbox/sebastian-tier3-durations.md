# Decision: Populate full planner task metadata for 438 Tier 3 third-party connectors

**Author:** Sebastian  
**Date:** 2026-06-16T13:00:41+02:00  
**Status:** Implemented  
**Requested by:** Maria (madesous)

## Context

After Tier 1 (9 connectors) and Tier 2 (41 connectors) enrichment, 438 third-party solutions remained without full `planner.setup_tasks` metadata. All had `effort_hours` populated but were missing `id`, `duration`, `category`, `phase`, `owner_role`, `depends_on`, and `description`. The Gantt planner and task board cannot render these connectors without this data.

This decision covers batch enrichment of all 438 Tier 3 solutions via `scripts/patch_tier3_durations.py`.

## What Was Applied

### Standard 4-task metadata table (uniform across all 438 solutions)

| Order | `category` | `phase` | `owner_role` | `skill_level` |
|---|---|---|---|---|
| 1 | `setup` | `Prerequisites` | `Azure Platform Admin` | `beginner` |
| 2 | `setup` | `Configuration` | `SOC Engineer` | `beginner` |
| 3 | `phase-1` | `Operationalization` | `SOC Engineer` | `intermediate` |
| 4 | `phase-2` | `Validation` | `SOC Analyst` | `intermediate` |

### Duration derivation formula

```
effort_hours <= 1.5  →  duration = 0.5 days
effort_hours <= 3.0  →  duration = 1.0 day
effort_hours <= 5.0  →  duration = 1.5 days
effort_hours <= 8.0  →  duration = 2.0 days
effort_hours >  8.0  →  duration = 3.0 days
```

### ID abbreviation scheme

- Take the first letter of each hyphen-separated word in the solution `id`, max 4 chars
- Append suffix: `-prereqs`, `-configure`, `-content`, `-validate`
- Examples:
  - `azure-cloud-ngfw-by-palo-alto-networks` → `acnb-prereqs`, `acnb-configure`, `acnb-content`, `acnb-validate`
  - `crowdstrike` → `cro-prereqs`, `cro-configure`, `cro-content`, `cro-validate`
  - `blackberry-cylance-protect` → `bcp-prereqs`, `bcp-configure`, `bcp-content`, `bcp-validate`

### Dependency chain

Sequential: each task depends on the previous one.
- Task 1: `depends_on = []`
- Task 2: `depends_on = ["{abbrev}-prereqs"]`
- Task 3: `depends_on = ["{abbrev}-configure"]`
- Task 4: `depends_on = ["{abbrev}-content"]`

### Description

Reused existing `task` text verbatim. This is explicitly acceptable for third-party connector batch enrichment at this scale — bespoke per-connector descriptions are not warranted when the existing task text is already actionable.

## Decisions Made

### 1. Uniform owner_role for task 1 across all Tier 3 solutions

All Tier 3 solutions use `Azure Platform Admin` for task 1 (Prerequisites), unlike Tier 2 where M365 solutions used `Identity / RBAC Admin`. Rationale: third-party connectors (CEF/syslog, REST APIs, agent-based) route through Azure infrastructure (DCRs, event hubs, Log Analytics ingestion endpoints) — the Azure Platform Admin is the correct prerequisite owner. None of the 438 Tier 3 solutions are pure M365 licensing-gated connectors.

### 2. Description strategy: reuse task text

With 438 solutions × 4 tasks = 1,752 task records, writing bespoke descriptions would produce marginal value for third-party connectors where the existing `task` field is already sufficiently descriptive. Maria's brief confirmed this is acceptable. Descriptions are identical to `task` text.

### 3. Batch script approach (no CATALOG dict)

Unlike the Tier 2 script (which maintained a CATALOG dict with per-solution abbreviations and descriptions), the Tier 3 script derives all metadata algorithmically. No per-solution catalog is needed or practical at 438-connector scale.

### 4. Skill level override

Existing tasks had `skill_level: "beginner"` for all 4 tasks. The script overwrites tasks 3 and 4 with `skill_level: "intermediate"` to conform to the canonical 4-task pattern. This is a data correction: operationalization and validation tasks require intermediate skill regardless of connector tier.

## Verification

Post-enrichment verification confirmed:
- **488 total solutions** with full duration data (9 Tier 1 + 41 Tier 2 + 438 Tier 3)
- **0 validation errors** — all 438 × 4 tasks have non-empty `id`, `category`, `phase`, `owner_role`, `skill_level`, `description`; non-null `duration` and `depends_on`
- **0 Tier 1/2 solutions modified** — idempotency guard prevented any re-patching
- **JSON valid** — parseable with `json.load()`
- **Duration distribution (Tier 3):** `{0.5: 98, 1.0: 683, 1.5: 629, 2.0: 265, 3.0: 141}` tasks across all 438 solutions (1,816 tasks total)

## Files Changed

- `data/solutions.json` — 438 connectors' `planner.setup_tasks` arrays updated in-place
- `scripts/patch_tier3_durations.py` — reproducible algorithmic patch script
