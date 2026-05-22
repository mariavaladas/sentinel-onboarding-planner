# History — Joi

## Project Context
- **Project:** Sentinel Onboarding Planner v2
- **Stack:** HTML/CSS/JS, Fluent UI web components, solutions.json data catalog
- **User:** madesous
- **Created:** 2026-05-20
- **Docs location:** docs/ directory at project root
- **Target audience:** IT admins and SOC engineers onboarding Microsoft Sentinel

## Learnings
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
