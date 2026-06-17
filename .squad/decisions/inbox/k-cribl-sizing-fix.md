# K — Cribl sizing signal and explicit routing

**Date:** 2026-06-17  
**Scope:** `data/solutions.json`, `js/modules/topology.js`, planner table defaults

## Decision

- Syslog/CEF content packs that depend on shared CEF infrastructure but do not look like firewalls by name should carry explicit sizing metadata via `capacity_type: "eps"` instead of relying on text heuristics.
- Topology Cribl routing should only activate when the saved sizing profile records an explicit drawer choice (`criblIngestionExplicit: true`) and the saved value is opted in.
- The planner table's Task Name column default width must be updated in both CSS fallback layout and `gantt-planner.js` default column metadata because runtime JS sets `--gantt-table-columns`.

## Why

- Trend Micro Deep Security, Tipping Point, and Apex One were `cribl_eligible` and `fieldPack: "syslog-cef"`, but their names did not match the firewall-family heuristic, so no EPS sizing drawer rendered.
- Without an explicit drawer save, topology fallback routing could still send those solutions through Cribl, which contradicted the user's actual choice surface.
- The Task Name column width change in CSS alone would be ignored in the default planner render because JS overwrites the column template.
