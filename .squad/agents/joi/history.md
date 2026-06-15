# History — Joi

## Project Context
- **Project:** Sentinel Onboarding Planner v2
- **Stack:** HTML/CSS/JS, Fluent UI web components, solutions.json data catalog
- **User:** madesous
- **Created:** 2026-05-20
- **Docs location:** docs/ directory at project root
- **Target audience:** IT admins and SOC engineers onboarding Microsoft Sentinel

## Learnings
- **2026-06-12T12:49:00Z — VM+DCR chain validation pattern:** For VM-dependent source types, source status is determined by the full chain (Source → VM with matching DCR → active data flow), not by table detection alone. DCR type mapping: `syslog_cef` → `cef`/`syslog`; `windows_events` → `windows`; `linux_server` → `syslog`. Stale VMs are excluded. Cribl-routed `syslog_cef` sources bypass the VM layer entirely (Source → Cribl Stream → Sentinel). Non-VM types (`azure_native`, `direct`, `event_hub`, `api`, `logic_app`) continue using table-based detection.
- **2026-06-11T11:14:55.524+02:00 — Topology spec updated for v1.1:** Documented per-connector inline status chips (`.rf-sol-inline-status` classes for CONNECTED and IDLE states), dynamic source node heights based on solution count, infrastructure status inheritance for PathBox/DCR/Server nodes, all-connectors rendering (removed 5-item limit), filter dimming exclusions for uber boxes and layer boxes, layout constant changes (topIntermediaryOffsetY: 420, LAYER_GAP: 20), and removal of the "active table analysis unavailable" warning. Status badges moved from group-level footer to inline per-solution items. Source: js/modules/topology.js lines 850-869 (status functions), 1217-1230 (dynamic height), 2415-2430 (SourceNode inline rendering), 2504-2516 (PathBoxNode), 2735-2761 (filter logic).
- **2026-05-20T11:15:54.563+02:00 — AMA sizing anchor:** Microsoft publishes a Linux forwarder benchmark on `Standard_F8s_v2` (8 vCPU, 16 GiB RAM, 10 GB cache) showing 10,000 EPS as the normal design target, average CPU 51%, peak CPU 262%, average RSS 276 MB, and peak RSS 1,017 MB. Source: Azure Monitor Agent performance benchmark.
- **2026-05-20T11:15:54.563+02:00 — AMA operating pattern:** DCR region must match the Log Analytics workspace region, portal edits can overwrite unsupported JSON-only DCR settings, and overlapping DCRs are a common source of duplicate ingestion cost. Source: Collect data from VM clients with Azure Monitor.
- **2026-05-20T11:15:54.563+02:00 — Syslog forwarding specifics:** Linux Syslog DCRs write to the `Syslog` table only, severity is hierarchical, and multiple workspace destinations duplicate cost. AMA configures `rsyslog` or `syslog-ng` automatically, forwarding locally to `127.0.0.1:28330`; `rsyslog` nondefault rulesets are not forwarded automatically. Sources: Sentinel Syslog forwarding tutorial and Azure Monitor Syslog collection documentation.
- **2026-05-20T11:15:54.563+02:00 — Syslog investigation nuance:** `TimeGenerated` reflects when the collector processed the message, while `EventTime` comes from the Syslog header and is converted using the collector time zone. This difference needs to be explained in customer docs. Source: Azure Monitor Syslog collection documentation.
- **2026-05-20T11:15:54.563+02:00 — Pipeline positioning:** Azure Monitor Pipeline is the centrally managed Arc-enabled Kubernetes ingestion layer for Syslog and OTLP, with Syslog generally available and OTLP logs in Preview. It becomes the right design when customers need local filtering, aggregation, routing, buffering, or scale beyond a single forwarder. Source: Azure Monitor Pipeline overview.
- **2026-05-20T11:15:54.563+02:00 — Pipeline sizing pattern:** Microsoft publishes end-to-end throughput guidance showing an 8-core replica at roughly 200,000 basic Syslog events/sec, 150,000 fully formed Syslog events/sec, or 65,000 CEF events/sec with about 2.8 GB working-set memory. Pipeline scales linearly with dedicated replicas and uses TCP backpressure rather than silent drops when overloaded. Source: Azure Monitor Pipeline sizing guidance.
- **2026-05-20T11:27:22.544+02:00 — WEF architecture pattern:** For Windows Security and event-log collection without AMA on every source, the supported Sentinel pattern is source machines -> WEC -> AMA on the WEC -> DCR -> `WindowsEvent`. Source-initiated subscriptions via GPO are the preferred enterprise pattern, and Azure Arc is required when the WEC is not an Azure VM.
- **2026-05-20T11:27:22.544+02:00 — WEF sizing guidance:** Microsoft guidance for larger WEF environments is to scale out, not up: plan roughly 2,000-4,000 clients per collector, start around 4 CPU and 16 GiB RAM for an average production WEC, use fast disks, and treat about 5,000 EPS as the safer single WEC/AMA planning point.
- **2026-05-20T11:27:22.544+02:00 — WEF Sentinel content note:** The Windows Forwarded Events solution writes to `WindowsEvent` and currently packages the Windows Forwarded Events connector with analytics such as Caramel Tsunami IOC and Chia Crypto Mining IOC, but Content Hub versions can change so docs should tell customers to verify the exact rule set in their tenant.



## 2026-05-22T11:05 — K's Table UX Fixes
- Agent K completed table numbering reform (flat sequential with nested subtasks)
- Inline editing enabled for all task fields
- Cascade updates implemented for timing changes
- Frontend: js/gantt-planner.js, css/style.css modified
- Status: Ready for QA

## 2026-06-12T12:49 — Topology spec updated for v1.3 (VM+DCR chain validation)
- Added new **§7 Source Status Verification (VM+DCR Chain)** covering: DCR type mapping per source type, VM staleness exclusion, source status decision rules (CONNECTED/IDLE/NEW), Cribl-routed bypass path, full decision tree for syslog/CEF sources, Existing VMs node semantics, Calculated VMs node semantics.
- Updated **§6** (`getSourceStatus()` description) to document split behavior: non-VM types use table detection; VM-dependent types (`syslog_cef`, `windows_events`, `linux_server`) use VM+DCR chain validation.
- Renumbered §§7–13 to §§8–14 to accommodate new §7.
- Added 4 new constraints in **§12** (rules 16–19) covering VM+DCR chain validation invariants and Cribl-routed bypass.
- Added 5 new completed-feature entries in **§13** for v1.3 changes.
- Updated version history to v1.3 and last-reviewed date to 2026-06-12.
- Wrote decision record to `.squad/decisions/inbox/joi-topology-status-validation.md`.
- Key DCR type mapping: `syslog_cef` → `cef`/`syslog`; `windows_events` → `windows`; `linux_server` → `syslog`.

- Wrote comprehensive internal architecture spec for the Step 5 Gantt planner system.
- Key architecture patterns documented:
  - `initGanttPlanner(solutions)` → `buildGanttPlanData()` → `createVisiblePlanData()` → Frappe Gantt + stabilizeGanttRender()
  - FIELD_PACK enum (9 packs): SYSLOG_CEF, WINDOWS_AMA, WEC_WEF, AMA_CUSTOM_LOGS, CRIBL, NATIVE_DIRECT, DIAGNOSTIC_SETTINGS, API_CCP, AZURE_FUNCTION
  - Full packs generate shared infra (Phase 1) + per-connector tasks (Phase 2); minimal packs get single enablement task only
  - `inferFieldPack(connector)` priority chain: explicit fieldPack → CRIBL_IDS → known ID sets → server_population_kind → onboarding.infrastructure_required → tags → NATIVE_DIRECT
  - Cribl hybrid grouping model: Cribl group independent; only criblRouted connectors depend on Cribl join task; non-Cribl connectors have zero Cribl dependency
  - `previousPhaseTerminalIds` starts from standardPlan (Phase 0), not infra terminals — critical for minimal-pack connectors
  - `scaleGeneratedInfraDurationHours()` scales WEC/CEF infra durations from capacity sizing data
  - Inline editor flicker fix: deferred layout rebuilds while editor is active
  - Business-day scheduling eliminates weekend gaps in dependency chains
- Key files: js/gantt-planner.js (~9000 lines), js/modules/gantt-tasks.js, js/modules/capacity.js
- Spec output: docs/planner-spec.md (13 sections, ~600 lines)
