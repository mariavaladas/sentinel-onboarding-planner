# Windows Security Events via AMA — Deployment Tasks

> **Connector:** Windows Security Events via AMA  
> **Purpose:** Ingest Windows security event logs into Microsoft Sentinel  
> **Source:** [Microsoft Docs](https://learn.microsoft.com/en-us/azure/sentinel/connect-windows-security-events-via-ama)

---

## Prerequisites

| Requirement | Details |
|-------------|---------|
| Azure subscription | With Sentinel-enabled Log Analytics workspace |
| Permissions | Log Analytics Contributor + VM Contributor |
| Windows machines | Server 2012 R2+, Windows 10/11, or Azure Arc-enabled |
| Agent | Azure Monitor Agent (AMA) — not legacy MMA |

---

## Deployment Tasks

| # | Task | Description | Duration | Dependencies |
|---|------|-------------|----------|--------------|
| 1 | **Planning & readiness assessment** | Identify target machines, verify Azure subscription, confirm workspace exists, validate network connectivity (port 443 outbound) | 1 day* | — |
| 2 | **Verify permissions** | Ensure deploying identity has Log Analytics Contributor on workspace + Contributor on target VMs/resource groups | 30m | Task 1 |
| 3 | **Onboard non-Azure machines to Arc** | Install Azure Arc agent on any on-premises or non-Azure Windows servers (skip if all machines are Azure VMs) | 1 week* | Task 2 |
| 4 | **Deploy & Configure (main task)** | Install AMA, create DCR, enable connector, validate, and tune — see sub-tasks below | 1 day | Task 3 |
| 4a | ↳ Install Azure Monitor Agent (AMA) | Deploy AMA to target machines — via Azure Policy (at scale) or manually per VM in the portal | — | — |
| 4b | ↳ Create Data Collection Rule (DCR) | Define DCR: select Security log, choose event levels (Information, Warning, Error, Critical), assign target resource group/VMs | — | 4a |
| 4c | ↳ Enable connector in Sentinel | Navigate to Data Connectors → "Windows Security Events via AMA" → Open connector page → Confirm DCR association | — | 4b |
| 4d | ↳ Validate data ingestion | Wait for logs to appear, run `SecurityEvent | take 10` in Logs, confirm events from target machines | — | 4c |
| 4e | ↳ Tune event collection | Refine DCR filters — include/exclude specific Event IDs for cost optimization and noise reduction | — | 4d |
| 5 | **Configure analytics rules** | Enable relevant Sentinel analytics rules that use the SecurityEvent table (e.g., brute force detection, privilege escalation) | 1h | Task 4 |
| 6 | **Documentation & handoff** | Document deployed configuration, DCR settings, machines covered, and create runbook for adding new machines | 2h | Task 4, Task 5 |

> *Durations marked with `*` are configurable defaults — actual time depends on environment complexity and team availability.

---

## Total Estimated Duration

| Scenario | Duration | Key differences |
|----------|----------|-----------------|
| Small environment (< 20 VMs, all Azure, no Arc needed) | ~2 days | Skip Task 3 entirely; planning ½ day; deploy ½ day |
| Medium environment (20-100 VMs, mixed Azure + on-prem) | ~9 days | As defined above — 1 week for Arc onboarding |
| Large environment (100+ VMs, multi-region, all on-prem) | ~4 weeks | Planning 2-3 days; Arc onboarding 2-3 weeks; deploy 2-3 days; docs 1 day |

---

## Notes

- Durations marked `*` are configurable — adjust based on environment complexity and team capacity
- Task 3 (Arc onboarding) can be skipped entirely if all target machines are native Azure VMs
- Task 4 is a single "Deploy & Configure" block (1 day) composed of 5 sub-tasks done sequentially
- Tasks 5 and 6 can run in parallel after Task 4 completes
- Do NOT install both MMA and AMA on the same machine — migrate MMA first if present

---

## Gantt Chart Mapping

These tasks map to the planner Gantt chart as follows:

- **Phase 1 — Prepare:** Tasks 1–3 (~1 day + 30m + 1 week)
- **Phase 2 — Deploy:** Task 4 with sub-tasks 4a–4e (1 day)
- **Phase 3 — Operationalize:** Tasks 5–6 (1h + 2h, can run in parallel)
