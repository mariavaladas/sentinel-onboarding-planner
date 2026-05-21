# RBAC Data Model Comparison — Two Approaches

**Document**: Design decision for modeling RBAC/permissions tasks in the Sentinel Onboarding Planner  
**Date**: 2026-05-21  
**Author**: Sebastian, Data Engineer  

---

## Executive Summary

The planner currently stores RBAC requirements in `permissions` metadata at the connector level (read-only display). As users select multiple connectors, many will share identical RBAC requirements—e.g., "Log Analytics Contributor" or "Security Reader in M365". 

This document compares two approaches for *surfacing* shared RBAC as actionable **planner tasks** visible in the Gantt timeline:

1. **Approach A — Single Grouped Task** — RBAC appears once in the timeline, listing all connectors it covers
2. **Approach B — Per-Connector Subtask with Shared Indicator** — RBAC appears under each connector, marked "already done" (0h) if already assigned for another connector

Both approaches preserve existing subtask hierarchy and avoid duplicating effort estimates.

---

## Real-World RBAC Scenario

Four selected connectors with overlapping RBAC requirements:

| Connector | Required RBAC |
|-----------|---------------|
| Windows Security Events (AMA) | VM Contributor, Monitoring Contributor, Sentinel Contributor |
| Microsoft Defender XDR | Security Admin or Security Reader in M365 |
| Azure Activity | Sentinel Contributor, Reader on subscription |
| Microsoft Entra ID | Global Reader or Security Reader in M365 |

**Overlaps identified:**
- Sentinel Contributor needed by 3 connectors (Windows Security, Azure Activity, others)
- M365 Security Reader needed by 2 connectors (Defender XDR, Entra ID)
- All 4 eventually depend on someone having Sentinel Contributor role

---

## Approach A: Single Grouped Task

### Concept

RBAC consolidation happens *outside* the per-connector task tree. A new top-level "setup" phase contains a single RBAC task that lists which connectors it enables. This task runs *before* any connector tasks, in parallel with generic Sentinel workspace setup.

### ASCII Gantt View (3 connectors, 5 weeks)

```
Timeline:                    Week 1        Week 2        Week 3        Week 4        Week 5
                             |---|---------|---|---------|---|---------|---|---------|---|

Setup Phase
├─ RBAC: Configure Sentinel Contributor role      [████]  ↓
│  Covers: Windows Security Events, Azure Activity, Entra ID (3 connectors)
│
Connector: Windows Security Events  
├─ Prepare collection host                              [████████]
├─ Establish management path                                       [█████]
├─ Deploy AMA and DCR                                             [██████████]
└─ Validate ingestion                                                        [███]

Connector: Azure Activity
├─ Confirm permissions and scope                                  [███]
├─ Enable data collection                                          [███]
└─ Validate with KQL                                                    [███]

Connector: Microsoft Entra ID
├─ Confirm M365 admin access                                      [███]
├─ Configure the connector                                         [██████]
└─ Validate sync                                                       [███]
```

### Key characteristics:
- RBAC appears *once* as a top-level entry, before connector work
- Grouped RBAC roles are listed inline (e.g., "Covers: Sentinel Contributor for Windows Security Events, Azure Activity, Entra ID")
- When the same RBAC is required by multiple connectors, they all reference that single task
- Simpler Gantt view, less visual repetition
- No "is this already done?" logic needed at the task level

### JSON Data Model (Approach A)

The `planner` object gains an optional `rbac_tasks` array at the **solution** level (global to all selected connectors):

```json
{
  "planner": {
    "rbac_tasks": [
      {
        "id": "rbac-sentinel-contributor",
        "order": 0.1,
        "task": "Assign Sentinel Contributor role to the operator on the target workspace and subscribe to break-glass alerts.",
        "effort_hours": 0.5,
        "skill_level": "beginner",
        "phase": "Setup",
        "azure_roles": ["Microsoft Sentinel Contributor"],
        "connectors_enabled": [
          "windows-security-events",
          "azure-activity",
          "microsoft-entra-id"
        ],
        "notes": "This role allows all data connector management, rule creation, and workspace administration."
      },
      {
        "id": "rbac-m365-security-reader",
        "order": 0.2,
        "task": "Assign Security Reader or Security Admin role in Microsoft 365 / Entra tenant for XDR and identity connectors.",
        "effort_hours": 0.5,
        "skill_level": "intermediate",
        "phase": "Setup",
        "m365_roles": ["Security Reader"],
        "connectors_enabled": [
          "microsoft-defender-xdr",
          "microsoft-entra-id"
        ],
        "notes": "Cross-tenant consent may be required for non-tenant admin operators."
      }
    ],
    "setup_tasks": [
      {
        "id": "prepare-collection-host",
        "order": 1,
        "task": "Prepare the pilot host...",
        "effort_hours": 4,
        ...
      }
    ]
  }
}
```

### Scaling to 5+ Connectors

When the user selects 5–10 connectors with overlapping RBAC:
- The `rbac_tasks` array may grow to 5–8 entries (one per unique RBAC "bundle")
- The `connectors_enabled` list on each RBAC task may balloon (e.g., "covers: Windows, Defender XDR, Azure Activity, Entra ID, Custom App, Third-party API connector")
- **Pro:** Still just 5–8 RBAC rows in the Gantt; high-level clarity
- **Con:** `connectors_enabled` lists become verbose; UI rendering of "Covers: [very long list]" needs truncation/expansion UI pattern

---

## Approach B: Per-Connector Subtask with Shared Indicator

### Concept

RBAC is modeled as a *subtask* under each connector's existing task tree. If an RBAC requirement was already configured for a *different* connector (detected by comparing `azure_roles` + `m365_roles` fingerprints), that RBAC subtask is marked `status: "shared"` with `effort_hours: 0` and a note like "Already assigned for Azure Activity."

### ASCII Gantt View (3 connectors, 5 weeks)

```
Timeline:                    Week 1        Week 2        Week 3        Week 4        Week 5
                             |---|---------|---|---------|---|---------|---|---------|---|

Connector: Windows Security Events
├─ Prepare collection host                         [████████]
├─ Establish management path                                   [█████]
├─ RBAC: Assign VM Contributor, Monitoring Contributor (Windows only)
│   └─ [TASK]                                              [██]
├─ Deploy AMA and DCR                                       [██████████]
└─ Validate ingestion                                              [███]

Connector: Azure Activity
├─ RBAC: Assign Sentinel Contributor (shared—already done for Windows)
│   └─ [SHARED ✓] 0h — Already assigned for Windows Security Events
├─ Enable data collection                                   [███]
└─ Validate with KQL                                            [███]

Connector: Microsoft Entra ID
├─ RBAC: Assign M365 Security Reader (new requirement)
│   └─ [TASK]                                              [██]
├─ Configure the connector                                  [██████]
└─ Validate sync                                               [███]
```

### Key characteristics:
- RBAC appears *per-connector* as a subtask or parent task in the connector's own hierarchy
- Each connector is independent; the planner can "show" Sentinel Contributor as needed for each
- Shared RBAC shows `effort_hours: 0` and displays "Already assigned for [Connector X]"
- Longer Gantt view (more rows), but each connector's task tree is self-contained
- Requires logic to fingerprint and match RBAC across connectors

### JSON Data Model (Approach B)

The `permissions` object is enriched with an `id` field and a `fingerprint` hash (computed once during catalog build):

```json
{
  "id": "windows-security-events",
  "permissions": {
    "id": "perms-windows-security-events",
    "azure_roles": [
      "Microsoft Sentinel Contributor",
      "Virtual Machine Contributor",
      "Azure Connected Machine Resource Administrator",
      "Monitoring Contributor"
    ],
    "m365_roles": [],
    "fingerprint": "sha256:abc123...def456",
    "notes": "..."
  },
  "planner": {
    "setup_tasks": [
      {
        "id": "prepare-collection-host",
        "order": 1,
        "task": "Prepare the pilot host...",
        "effort_hours": 4,
        "skill_level": "intermediate",
        "phase": "Preparation",
        "subtasks": [
          {
            "id": "rbac-windows-security-events",
            "order": 0,
            "task": "Assign the required roles: Virtual Machine Contributor or Azure Connected Machine Resource Administrator, Monitoring Contributor, and Sentinel Contributor.",
            "effort_hours": 0.5,
            "skill_level": "beginner",
            "depends_on": [],
            "status": "pending",  // or "shared" if already assigned
            "shared_by_connector": null  // "azure-activity" if shared
          },
          {
            "id": "set-up-vm",
            "order": 1,
            "task": "Set up a Windows virtual machine...",
            "effort_hours": 3,
            "depends_on": ["rbac-windows-security-events"]
          }
        ]
      }
    ]
  }
}
```

At **planner render time**, the UI scans all selected connectors' `permissions.fingerprint` values and updates any RBAC subtask with matching fingerprints to `status: "shared"` and `shared_by_connector: "connector-id"`.

### Scaling to 5+ Connectors

When the user selects 5–10 connectors with overlapping RBAC:
- Each connector has its own RBAC subtask under its root task
- If 5 connectors share the same RBAC fingerprint, 4 of them are marked `status: "shared"` (0h effort)
- **Pro:** Each connector's task tree is complete and self-contained; no hidden dependencies
- **Con:** Many "Already done" placeholders clutter the Gantt; visual noise increases with more connectors

---

## Comparison Table

| Criterion | Approach A | Approach B |
|-----------|-----------|-----------|
| **Gantt rows (5 connectors)** | ~12–15 rows (consolidated RBAC + per-connector work) | ~30–40 rows (includes 0h "shared" RBAC rows) |
| **Visual clarity** | Cleaner; RBAC phase is clearly separated | Noisier; shared RBAC marked as "already done" |
| **Per-connector visibility** | RBAC is implicit in `connectors_enabled` list | RBAC is explicit in each connector's tree |
| **Data model change** | New top-level `rbac_tasks` array on `planner` | Extend existing `permissions` + add RBAC subtask to `setup_tasks[].subtasks` |
| **UI complexity** | Display `rbac_tasks` above connector phase, render `connectors_enabled` list | Implement fingerprint matching at render time; mark shared RBAC subtasks |
| **Excel export** | One RBAC row per task; "Covers: A, B, C" in notes | RBAC rows appear under each connector; shared rows show "Already done for B" |
| **Dependencies** | RBAC tasks can have `depends_on` or explicit order | RBAC subtasks can depend on other RBAC subtasks or be part of the connector flow |
| **Scalability (5–10 connectors)** | RBAC list grows but Gantt stays ~5–8 RBAC rows | Gantt adds shared-RBAC rows (~4–8 "already done" items) |
| **Backward compatibility** | New `rbac_tasks` is optional; existing `setup_tasks` unchanged | Extends `setup_tasks` with optional RBAC subtask; `permissions` gains `id` and `fingerprint` |

---

## Recommendation: **Approach B** (Per-Connector Subtask with Shared Indicator)

### Rationale

1. **Self-contained connector tasks** — Each connector's task tree is complete and independent. Users can understand "what I need to do for Connector X" without scanning a separate RBAC section. This aligns with the existing planner philosophy: task hierarchy mirrors deployment sequence.

2. **Minimal data model change** — Approach B extends the existing subtask pattern (already proven with Windows Security Events). No new top-level `rbac_tasks` array required. Existing code that reads `setup_tasks[]` remains unchanged.

3. **Clear "already done" semantics** — When an RBAC subtask is marked `status: "shared"` with 0h effort and a note like "Already assigned for Azure Activity," it's immediately obvious that the planner has de-duped the work. Users don't need to cross-reference a separate RBAC section.

4. **Better for Excel export** — The Excel export naturally groups RBAC rows under each connector. Users see:
   - Connector: Windows Security Events
     - Task: Prepare collection host (4h)
     - Task: RBAC: Assign roles (0.5h)
     - …
   - Connector: Azure Activity
     - Task: RBAC: Sentinel Contributor (0h) *[Already done for Windows Security Events]*
     - Task: Enable data collection (1h)
   - …

5. **Scales well to 5–10 connectors** — Visual noise from "already done" rows is manageable if the UI uses collapsible sections or a filter ("Show only pending tasks"). The data model itself is clean.

### Implementation notes:

- **RBAC subtask placement:** Insert RBAC subtask at `setup_tasks[].subtasks[0]` (before other steps) so permission assignment is always the first thing users see for each connector.
- **Fingerprint computation:** Build fingerprint at catalog generation time (hash of sorted `azure_roles + m365_roles`). Store in `permissions.fingerprint`.
- **Render-time deduplication:** At planner render, iterate through all selected connectors' `permissions.fingerprint` values. If a fingerprint appears more than once, mark all instances after the first as `status: "shared"` with `shared_by_connector: "first-connector-id"`.
- **Effort rollup:** When computing total planner effort, skip 0h shared RBAC subtasks.

---

## Alternative: Hybrid Approach (C)

For teams that want both benefits, a **hybrid** is possible:

- Store RBAC at the *connector level* (as subtask, per Approach B)
- Offer an optional *summary view* or *Excel sheet* that groups and deduplicates RBAC across all selected connectors (similar to Approach A's `rbac_tasks`)

This trades implementation complexity for UI flexibility: the Gantt stays per-connector (Approach B), but Excel or a summary panel shows the consolidated RBAC view (Approach A).

**Status:** Deferred; implement Approach B first and validate with users. If the Gantt becomes too noisy with 10+ connectors, revisit Hybrid.

---

## Open Questions for Deckard & Product

1. **RBAC subtask visibility in the Gantt planner UI** — Should shared RBAC subtasks be visible by default, or should there be a filter/collapse to hide "already done" rows?
2. **Excel export grouping** — Should the Excel export have a separate "RBAC Summary" sheet, or is per-connector RBAC sufficient?
3. **M365 + Azure mixed scenarios** — When a connector needs both Azure roles (for the workspace) and M365 roles (for API consent), should they be separate subtasks or merged?

---

## Files Affected by Approach B Implementation

1. **data/solutions.json** — Add `permissions.id` and `permissions.fingerprint` to all 342 solutions. Add RBAC subtask to `setup_tasks[].subtasks[]` for solutions that have permission requirements.
2. **js/planning.js** — Implement fingerprint matching logic at render time. Mark RBAC subtasks as `status: "shared"` when fingerprint matches another connector.
3. **js/export.js** — Skip 0h shared RBAC subtasks from total effort calculation. Optionally add "RBAC Summary" sheet.
4. **docs/connectors/ama-setup-guide.md** — Update to clarify where RBAC subtask appears in the Windows Security Events task tree.

---

## Appendix: Real-World RBAC Examples

### Example 1: Windows Security Events + Azure Activity
Both require `Microsoft Sentinel Contributor`. First connector assigns it (0.5h); second connector shows 0h "Already assigned."

### Example 2: Defender XDR + Entra ID + Microsoft 365 Threat Intelligence
All three require `Security Admin` or `Security Reader` in M365. First occurrence is 1h; next two show 0h "Already done."

### Example 3: Custom Scenario with No Overlap
- Windows Security Events: needs Sentinel Contributor (0.5h)
- Third-party CEF appliance: needs VM Contributor on the forwarder (0.5h, different role)
- Azure Activity: needs Sentinel Contributor (0h, already done)

Effort total: 1h (two unique RBAC assignments).

---

**Next steps**: 
- Deckard confirms Approach B recommendation.
- Sebastian implements fingerprint logic in data/solutions.json and js/planning.js.
- K reviews and updates Gantt rendering for shared RBAC subtasks.
- Luv adds test coverage for RBAC deduplication logic.
