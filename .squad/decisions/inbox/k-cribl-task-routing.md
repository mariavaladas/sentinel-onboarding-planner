# K — Per-connector Cribl task routing

- **Date:** 2026-06-18T10:15:33+02:00
- **Owner:** K
- **Scope:** `js/modules/gantt-tasks.js`, `js/gantt-planner.js`

## Decision

- Generated Gantt planning must choose the standard VM/AMA/DCR task path vs the Cribl Stream task path per syslog/CEF connector, using the connector's saved sizing preference.
- Phase 1 infrastructure generation must allow mixed routing by keeping `CEF-INFRA` for standard connectors and adding `CRIBL-INFRA` only when at least one connector explicitly routes through Cribl.
- Planner-level join-task sorting and dependency wiring must use the same per-connector routing rule so VM-routed connectors do not inherit Cribl-only dependencies.

## Why

- A global `criblActive` flag incorrectly makes every syslog/CEF connector appear Cribl-routed as soon as Cribl Stream is selected, even when the sizing drawer explicitly kept some connectors on the VM path.
- Topology already respects those per-connector preferences, so the generated Gantt plan needs the same routing logic to avoid contradictory implementation guidance.

## Impact

- Mixed estates now show the right task copy for each connector: forwarder/AMA/DCR work for VM-routed sources and Cribl listener/pipeline work for explicitly Cribl-routed sources.
- Shared infrastructure rows can now include both CEF and Cribl preparation in the same plan when the environment genuinely uses both routes.
