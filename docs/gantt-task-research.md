# Gantt Task Research — Sentinel Onboarding Wizard

_Lead: Deckard_  
_Date: 2026-06-03T16:34:21+02:00_  
_Scope: Granularity, grouping strategy, task taxonomy, and a concrete worked example_

---

## Part 1 — Gantt Chart Granularity

### The question

What is the right level of detail for Gantt tasks in a Sentinel connector onboarding plan?

Three possible failure modes exist:

| Level | Example | Problem |
|---|---|---|
| Too coarse | "Onboard Cisco ASA" | Unschedulable — no single engineer can "onboard Cisco ASA" in one sitting. No useful duration. No clear owner. |
| Right | "Configure Cisco ASA syslog output to forwarder" | One action, one owner, estimable duration (1–2h), clear dependency on "Forwarder deployed". |
| Too granular | "Log in to ASDM, navigate to Configuration → Device Management → Logging" | Brittle (UI changes break it), creates noise, and insults the security engineer doing the work. |

### How Microsoft documents Sentinel connector deployment

Microsoft's own connector documentation — including the `Learn > Microsoft Sentinel > Connect data sources` series — consistently uses **role-action granularity**:

- "Install the Azure Monitor Agent on the Windows machine"
- "Create a Data Collection Rule"
- "Configure Cisco ASA to forward logs in CEF format to the Linux machine"
- "Verify data is flowing using the query `CommonSecurityLog | take 10`"

Each task names a **role** (implicitly: the admin doing the work), an **action** (install, create, configure, verify), and a **target** (the thing being acted on). They do not specify which button to click, but they are specific enough to schedule.

### The sweet spot for security architects and engineers

This planner's audience plans deployments for others to execute. They need tasks that are:

1. **Schedulable** — can be assigned a start date and duration (30 min to 2 days; anything over 2 days should be a parent task with sub-tasks)
2. **Assignable** — has a clear owner role (Windows Admin, Network Admin, Sentinel Engineer, Security Architect)
3. **Blockable** — maps to a dependency that could hold up progress (waiting for firewall rule approval, waiting for Azure Arc rollout, waiting for vendor change window)
4. **Verifiable** — has a done condition ("logs visible in workspace" is a clear done condition; "understand the connector" is not)

### Recommended granularity rule

> **One task = one engineering action that a single role completes, with a clear done condition, in a range of 30 minutes to 2 business days.**

Anything longer should become a **parent task** with sub-tasks (as the existing `connector-tasks-windows-security-events.md` already shows for Task 4). Anything shorter should be collapsed into the nearest meaningful parent unless it represents a dependency gate.

### Why sub-tasks matter for this planner

The existing Windows Security Events task spec already validates this approach correctly. Task 4 ("Deploy & Configure") takes 1 day and decomposes into five sub-tasks (4a–4e): install AMA, create DCR, enable connector, validate, tune. That is exactly the right shape. A customer needs to see the parent block on the Gantt timeline, but also needs the sub-task checklist to understand what "1 day" actually means.

---

## Part 2 — Task Grouping Strategy

### The shared infrastructure problem

When a customer selects 8 Syslog/CEF connectors (Cisco ASA, Palo Alto, Barracuda, F5, etc.), all 8 connectors depend on the same physical infrastructure: a Linux log forwarder with AMA installed, a DCR, and network routing from each appliance to the forwarder. There are three ways to handle this in the Gantt.

### Option A — Shared prerequisite tasks (appears once, multiple connectors depend on it)

```
[Phase 1 — Infrastructure]
  ✦ Deploy Linux Log Forwarder              ← appears ONCE
  ✦ Install AMA on forwarder                ← appears ONCE
  ✦ Create Syslog/CEF DCR                  ← appears ONCE

[Phase 2 — Per-Connector Config]
  ↳ Configure Cisco ASA CEF output          ← depends on forwarder task
  ↳ Configure Palo Alto syslog output       ← depends on forwarder task
  ↳ Configure Barracuda WAF output          ← depends on forwarder task
```

**UX impact:** Clean. Customers see what is shared and what is connector-specific. Dependency arrows show that 8 connectors unblock the moment the forwarder is live. Easy to reason about critical path. The shared task's duration has high impact (delays it = delays all 8). Low noise.

**Risk:** Requires the planner to understand which connectors share infrastructure. Dependency edges multiply. Harder to implement initially.

### Option B — Per-connector tasks (each connector gets its own forwarder task)

```
[Cisco ASA]
  ✦ Deploy Linux Forwarder for Cisco ASA
  ✦ Install AMA for Cisco ASA
  ✦ Configure Cisco ASA CEF output

[Palo Alto]
  ✦ Deploy Linux Forwarder for Palo Alto
  ✦ Install AMA for Palo Alto
  ...
```

**UX impact:** Honest about the work tree, but creates massive duplication. If the customer has 8 Syslog/CEF connectors, they see 8 identical "Deploy Linux Forwarder" tasks. This is wrong: they do NOT need 8 separate forwarders. It overstates cost, confuses planning, and obscures the critical path.

**Verdict: Reject.** Factually incorrect for most deployments.

### Option C — Hybrid (shared infra tasks + per-connector config tasks) ← RECOMMENDED

```
[Phase 0 — Project Setup]
  ✦ Validate workspace & permissions        ← shared across all connectors
  ✦ Validate network connectivity           ← shared

[Phase 1 — Shared Infrastructure — Syslog/CEF Pack]
  ✦ Provision Linux log forwarder(s)        ← shared: generated ONCE per field pack
  ✦ Install & register AMA on forwarder     ← shared
  ✦ Configure rsyslog/syslog-ng             ← shared
  ✦ Create base Syslog/CEF DCR              ← shared

[Phase 2 — Per-Connector: Cisco ASA]
  ↳ Configure Cisco ASA syslog → forwarder  ← per-connector
  ↳ Enable connector in Sentinel            ← per-connector
  ↳ Validate CommonSecurityLog (Cisco ASA)  ← per-connector

[Phase 2 — Per-Connector: Palo Alto]
  ↳ Configure PAN-OS syslog profile         ← per-connector
  ↳ Enable connector in Sentinel            ← per-connector
  ↳ Validate CommonSecurityLog (PAN-OS)     ← per-connector

[Phase 3 — Operationalize]
  ✦ Enable analytics rules                  ← shared across selected connectors
  ✦ Documentation & handoff                 ← shared
```

**UX impact:** This is the model that enterprise project management tools (Smartsheet, MS Project) use for infrastructure projects. Shared resources appear once. Per-connector work appears per connector. The customer can see:
- What they build once (the forwarder stack)
- What they do per-connector (device configuration + validation)
- What they do at the end (analytics, docs)

**This is the correct model for this planner.** It also aligns directly with the field pack architecture: each field pack generates one block of shared infra tasks + per-connector tasks for each connector assigned to that pack.

### How dependencies work

Dependencies use **Finish-to-Start (FS)** semantics throughout:

```
Provision Linux Forwarder → Install AMA → Configure rsyslog/syslog-ng → Create DCR
                                                                              ↓
Configure Cisco ASA output ──────────────────────────────────────────────── can now start
Configure Palo Alto output ──────────────────────────────────────────────── can now start
Configure Barracuda output ──────────────────────────────────────────────── can now start
```

The shared DCR creation task is the **join node** — all per-connector work depends on it. Per-connector tasks run **in parallel** after the join node, which accurately reflects reality: once the forwarder is live, a security engineer can configure all appliances simultaneously (or in any order).

### How the planner should implement grouping

The field pack → task generation rule:

1. **On connector selection**, the planner identifies which field packs are needed.
2. **For each unique field pack**, one set of shared infrastructure tasks is generated (and deduplicated — selecting 10 Syslog/CEF connectors still generates ONE forwarder task set).
3. **For each selected connector within a field pack**, per-connector tasks are generated.
4. **Dependency edges** connect the shared infra close task → all per-connector tasks in that pack.
5. **Project bookend tasks** (workspace validation, operationalize) wrap the whole plan.

---

## Part 3 — Proposed Task Taxonomy

### Categories

| Category | Tag | Color (suggested) | Shared or per-connector? | Phases |
|---|---|---|---|---|
| Project Setup | `SETUP` | Steel blue | Shared | Phase 0 |
| Infrastructure | `INFRA` | Amber/orange | Shared (per field pack) | Phase 1 |
| Source Configuration | `SRC-CFG` | Teal/green | Per-connector | Phase 2 |
| Sentinel Configuration | `SENT-CFG` | Purple | Per-connector (mostly) | Phase 2 |
| Validation | `VALID` | Cyan | Per-connector | Phase 2 |
| Operationalize | `OPS` | Slate | Shared | Phase 3 |

### Task hierarchy

Two-level hierarchy:

```
Parent task (shows on Gantt bar)
  └── Sub-task 1 (checklist item in detail panel, not a separate bar)
  └── Sub-task 2
  └── Sub-task 3
```

Parent tasks appear as Gantt bars. Sub-tasks appear as a checklist in the detail panel (consistent with the existing Windows Security Events task spec). This keeps the Gantt readable — a 15-connector plan should not have 90 Gantt bars — while preserving enough detail for execution.

**When a parent task should be promoted to a separate Gantt bar:** Any sub-task that has a duration > 1 day or that can run in parallel with other sub-tasks.

### Master task catalog

#### Phase 0 — Project Setup (shared, generated once per session)

| Task ID | Task name | Sub-tasks | Duration (default) | Owner role | Dependencies |
|---|---|---|---|---|---|
| `SETUP-01` | Validate workspace & permissions | Confirm LAW exists; assign RBAC roles (Log Analytics Contributor, Sentinel Contributor, VM Contributor); document workspace ID/resource group | 4h | Security Architect | — |
| `SETUP-02` | Validate network connectivity | Confirm outbound 443 to AMA endpoints; confirm syslog ports (514/6514) reachable to planned forwarder(s); document firewall rules needed | 2h | Network/Security Admin | `SETUP-01` |

**Total Phase 0 default duration:** 6h (~1 day)

---

#### Phase 1 — Infrastructure (shared per field pack, generated once per pack)

##### Syslog/CEF Pack infra tasks

| Task ID | Task name | Sub-tasks | Duration (default) | Owner role | Dependencies |
|---|---|---|---|---|---|
| `CEF-INFRA-01` | Provision Linux log forwarder(s) | Choose dedicated vs shared; provision VM(s) (RHEL/CentOS 8+ or Debian 11+, 2 vCPU, 4 GB RAM min); apply OS hardening baseline | 1d | Linux Admin / Cloud Ops | `SETUP-02` |
| `CEF-INFRA-02` | Onboard forwarder(s) to Azure Arc | Install Arc agent; register in Azure; assign managed identity | 2h | Cloud Ops | `CEF-INFRA-01` |
| `CEF-INFRA-03` | Install & register AMA on forwarder | Deploy AMA extension via Azure portal or CLI; confirm heartbeat | 1h | Cloud Ops / Sentinel Engineer | `CEF-INFRA-02` |
| `CEF-INFRA-04` | Configure rsyslog/syslog-ng | Set listen port (default UDP 514 / TCP 514 / TLS 6514); configure AMA syslog source; validate daemon restart | 1h | Linux Admin / Sentinel Engineer | `CEF-INFRA-03` |
| `CEF-INFRA-05` | Create Syslog/CEF Data Collection Rule (DCR) | Define DCR in Azure; select facility filters; associate forwarder; confirm DCE linkage if applicable | 1h | Sentinel Engineer | `CEF-INFRA-03` |

**Total Syslog/CEF infra default duration:** ~1.5d (with Arc onboarding; skip `CEF-INFRA-02` if forwarder is an Azure VM)

##### Windows AMA Pack infra tasks

| Task ID | Task name | Sub-tasks | Duration (default) | Owner role | Dependencies |
|---|---|---|---|---|---|
| `WIN-INFRA-01` | Assess Windows host estate | Inventory target machines; identify Azure VMs vs on-prem; confirm OS versions (2012 R2+); check for legacy MMA | 4h | Security Architect | `SETUP-01` |
| `WIN-INFRA-02` | Onboard non-Azure hosts to Azure Arc | Install Arc agent on on-premises/non-Azure Windows servers; register in Azure. **Skip if all targets are Azure VMs.** | 1w* | Windows/Cloud Admin | `WIN-INFRA-01` |
| `WIN-INFRA-03` | Deploy Azure Monitor Agent (AMA) | Deploy via Azure Policy (preferred, at scale) or manually per VM; confirm AMA version ≥ 1.10 | 2h | Windows/Cloud Admin | `WIN-INFRA-02` |
| `WIN-INFRA-04` | Create Windows Security Events DCR | Define event levels; choose event set (Minimal / Common / All); assign VMs/resource group | 1h | Sentinel Engineer | `WIN-INFRA-03` |

*`WIN-INFRA-02` duration is customer-configurable: 0 (Azure VMs only) → 1d (small) → 1w (medium) → 3w (large on-prem fleet).

**Total Windows AMA infra default duration:** ~1.5d (Azure VMs only; up to 3+ weeks with Arc)

##### WEC/WEF Pack infra tasks

| Task ID | Task name | Sub-tasks | Duration (default) | Owner role | Dependencies |
|---|---|---|---|---|---|
| `WEC-INFRA-01` | Design WEC topology | Size collector count; plan subscription types (push vs pull); design ForwardedEvents channel capacity; document collector placement per site | 4h | Security Architect | `SETUP-01` |
| `WEC-INFRA-02` | Deploy & configure WEC server(s) | Install/configure Windows Event Collector role; create WEF subscriptions; tune ForwardedEvents channel size | 1d | Windows Admin | `WEC-INFRA-01` |
| `WEC-INFRA-03` | Onboard WEC server(s) to Azure Arc | Install Arc agent; register; assign managed identity | 2h | Cloud Admin | `WEC-INFRA-02` |
| `WEC-INFRA-04` | Install AMA on WEC server(s) | Deploy AMA; confirm heartbeat | 1h | Cloud Admin | `WEC-INFRA-03` |
| `WEC-INFRA-05` | Create WEF/Forwarded Events DCR | Define DCR for ForwardedEvents channel; associate WEC servers | 1h | Sentinel Engineer | `WEC-INFRA-04` |

**Total WEC/WEF infra default duration:** ~2d

##### AMA Custom Logs Pack infra tasks

| Task ID | Task name | Sub-tasks | Duration (default) | Owner role | Dependencies |
|---|---|---|---|---|---|
| `CL-INFRA-01` | Identify custom log sources | Confirm file paths, channels, or event IDs; document log schema (JSON/text/delimiter); confirm rotation/retention | 2h | Security Architect / App Owner | `SETUP-01` |
| `CL-INFRA-02` | Deploy AMA on log source hosts | Install AMA on source VMs (via Arc or native Azure extension) | 2h | Windows/Linux Admin | `CL-INFRA-01` |
| `CL-INFRA-03` | Create Custom Logs DCR | Define AMA custom log source; set file/channel path; configure transformation if needed | 2h | Sentinel Engineer | `CL-INFRA-02` |

**Total AMA Custom Logs infra default duration:** ~6h (~1 day)

##### Cribl Pack infra tasks

| Task ID | Task name | Sub-tasks | Duration (default) | Owner role | Dependencies |
|---|---|---|---|---|---|
| `CRIBL-INFRA-01` | Design Cribl topology | Choose cloud vs on-prem; leader + worker counts; site distribution; buffering/HA requirements | 4h | Security Architect | `SETUP-02` |
| `CRIBL-INFRA-02` | Deploy Cribl Stream (leader + workers) | Provision VMs; install Cribl; configure leader/worker mesh; validate licensing | 1d | Cloud/Linux Admin | `CRIBL-INFRA-01` |
| `CRIBL-INFRA-03` | Configure Cribl → Sentinel DCE output | Set up Logs Ingestion API destination; configure DCR/DCE endpoint; test pipeline | 2h | Sentinel Engineer | `CRIBL-INFRA-02` |
| `CRIBL-INFRA-04` | Configure Cribl syslog/CEF source pipeline | Create syslog listener; route to Sentinel output; validate pass-through | 2h | Sentinel Engineer | `CRIBL-INFRA-03` |

**Total Cribl infra default duration:** ~2d

---

#### Phase 2 — Per-Connector Tasks

Each selected connector generates this set. The specific task name includes the connector name.

##### Universal per-connector tasks (all AMA connectors)

| Slot | Task name template | Duration (default) | Owner role | Dependencies |
|---|---|---|---|---|
| `PC-01` | Enable {Connector} in Sentinel portal | Navigate to Data Connectors; open connector page; confirm DCR association | 30min | Sentinel Engineer | Shared infra pack task complete |
| `PC-02` | Configure {Connector} source device/service | Vendor-specific: configure syslog output IP/port, event format, log level — see connector notes | 1h | Network/Security Admin (or Vendor Admin) | `PC-01` |
| `PC-03` | Validate {Connector} data ingestion | Run KQL against target table; confirm events from expected host; check event count and timestamp recency | 1h | Sentinel Engineer | `PC-02` |
| `PC-04` | Tune {Connector} collection | Refine DCR filters (event IDs, facilities, severity); optimize for cost vs coverage | 1h | Sentinel Engineer | `PC-03` |

**Per-connector task set default duration: ~3.5h** (can run in parallel with other connectors sharing the same infra pack)

##### Connector-specific task variations

Some connectors have additional source-configuration complexity. These extend `PC-02`:

| Connector type | Additional source-config tasks | Extra duration |
|---|---|---|
| Syslog/CEF appliance (Cisco ASA, PAN-OS, F5, etc.) | Configure syslog server profile on appliance; specify CEF vs raw Syslog; set facility/severity; test connectivity to forwarder or Cribl | +30min–1h |
| Windows Security Events | Configure Windows Security Audit Policy (Group Policy or local); select event set (Minimal/Common/All); validate no MMA conflict | +1h |
| Windows Forwarded Events | Design WEF subscription scope (source-initiated vs collector-initiated); configure FQDN targeting; validate subscription status | +2h |
| Windows DNS Events | Enable DNS Analytical logging; configure DNS debug log path; validate ETW provider | +1h |
| Sysmon via AMA | Deploy Sysmon with config XML; validate sysmon events; configure both Windows Event DCR and Linux Syslog DCR | +2h |
| Cribl Stream (intermediary) | Configure Cribl as intermediary destination; map source connectors to Cribl pipelines; validate routing table | +2h |

---

#### Phase 3 — Operationalize (shared, generated once per session)

| Task ID | Task name | Sub-tasks | Duration (default) | Owner role | Dependencies |
|---|---|---|---|---|---|
| `OPS-01` | Enable analytics rules | Review built-in analytics rules for selected connectors; enable relevant detection rules; configure alert thresholds | 1h | Security Architect / Sentinel Engineer | All `PC-03` tasks complete |
| `OPS-02` | Configure workbooks & dashboards | Enable/configure Microsoft Sentinel workbooks for selected connectors; verify data binding | 1h | Sentinel Engineer | `OPS-01` |
| `OPS-03` | Document configuration & create runbook | Record DCR settings, forwarder topology, host inventory, connector config; create runbook for adding new sources | 4h | Security Architect | `OPS-01` |

**Total Phase 3 default duration:** ~6h (partially parallel)

---

### Summary: field pack → Gantt task mapping

| Field pack | Generates shared infra tasks | Generates per-connector tasks |
|---|---|---|
| Syslog/CEF Pack | `CEF-INFRA-01` through `CEF-INFRA-05` | `PC-01` through `PC-04` per Syslog/CEF connector |
| Windows AMA Pack | `WIN-INFRA-01` through `WIN-INFRA-04` | `PC-01` through `PC-04` + audit policy for Windows connectors |
| WEC/WEF Pack | `WEC-INFRA-01` through `WEC-INFRA-05` | `PC-01` through `PC-04` + WEF subscription design |
| AMA Custom Logs Pack | `CL-INFRA-01` through `CL-INFRA-03` | `PC-01` through `PC-04` per custom-log connector |
| Cribl Pack | `CRIBL-INFRA-01` through `CRIBL-INFRA-04` | Added to Syslog/CEF or Windows connectors that are Cribl-eligible; replaces direct forwarder for CEF connectors |

---

## Part 4 — Concrete Example

### Scenario

Customer selects:
- Windows Security Events via AMA
- Cisco ASA (Syslog/CEF via AMA)
- Palo Alto Networks (Syslog/CEF via AMA)
- Common Event Format — CEF (Syslog/CEF via AMA)
- Cribl Stream (intermediary, routes the three Syslog/CEF sources)

### Field pack resolution

| Connector | Field pack | Infra block |
|---|---|---|
| Windows Security Events | Windows AMA Pack | `WIN-INFRA-01..04` |
| Cisco ASA | Syslog/CEF Pack (via Cribl) | `CRIBL-INFRA-01..04` (replaces Linux rsyslog forwarder) |
| Palo Alto | Syslog/CEF Pack (via Cribl) | Same Cribl block (shared — not duplicated) |
| Common Event Format | Syslog/CEF Pack (via Cribl) | Same Cribl block (shared — not duplicated) |
| Cribl Stream | Cribl Pack | `CRIBL-INFRA-01..04` |

> **Grouping note:** Because Cribl Stream is selected as an intermediary, the Syslog/CEF connectors (Cisco ASA, Palo Alto, CEF) route through Cribl rather than a dedicated Linux rsyslog forwarder. The three Syslog/CEF connectors share the Cribl infrastructure block. No separate `CEF-INFRA` tasks are generated.

---

### Full task list

```
PHASE 0 — PROJECT SETUP
─────────────────────────────────────────────────────────────────
[SETUP-01] Validate workspace & permissions
           Duration: 4h | Owner: Security Architect | Depends: —
           ↳ Confirm Log Analytics workspace exists
           ↳ Assign RBAC: Log Analytics Contributor, Sentinel Contributor, VM Contributor
           ↳ Document workspace ID and resource group

[SETUP-02] Validate network connectivity
           Duration: 2h | Owner: Network Admin | Depends: SETUP-01
           ↳ Confirm outbound 443 to AMA endpoints (*.monitoring.azure.com)
           ↳ Confirm TCP/UDP 514 (or TLS 6514) reachable to planned Cribl worker IPs
           ↳ Document any firewall rule change requests needed

PHASE 1A — WINDOWS AMA INFRASTRUCTURE (shared for Windows Security Events)
─────────────────────────────────────────────────────────────────
[WIN-INFRA-01] Assess Windows host estate
               Duration: 4h | Owner: Security Architect | Depends: SETUP-01
               ↳ Inventory target Windows machines (Azure VMs vs Arc candidates)
               ↳ Confirm Windows Server 2012 R2+ / Windows 10+
               ↳ Check for legacy MMA — plan migration if present

[WIN-INFRA-02] Onboard non-Azure Windows hosts to Azure Arc      ← CONFIGURABLE DURATION
               Duration: 1w (default) | Owner: Windows Admin | Depends: WIN-INFRA-01
               ↳ Install Arc agent on on-premises servers
               ↳ Register agents in Azure portal
               ↳ Assign managed identity
               NOTE: Set to 0 if all targets are Azure VMs.

[WIN-INFRA-03] Deploy Azure Monitor Agent (AMA) to Windows hosts
               Duration: 2h | Owner: Windows/Cloud Admin | Depends: WIN-INFRA-02
               ↳ Deploy via Azure Policy (at-scale) or manually per VM
               ↳ Confirm AMA version ≥ 1.10 and heartbeat visible

[WIN-INFRA-04] Create Windows Security Events DCR
               Duration: 1h | Owner: Sentinel Engineer | Depends: WIN-INFRA-03
               ↳ Create DCR in Azure portal
               ↳ Select event set: Minimal / Common / All (customer choice)
               ↳ Assign target VMs or resource group

PHASE 1B — CRIBL INFRASTRUCTURE (shared for Cisco ASA + Palo Alto + CEF)
─────────────────────────────────────────────────────────────────
[CRIBL-INFRA-01] Design Cribl Stream topology
                 Duration: 4h | Owner: Security Architect | Depends: SETUP-02
                 ↳ Choose cloud vs on-prem deployment
                 ↳ Determine leader + worker count; plan HA/redundancy
                 ↳ Plan site distribution (where appliances send logs)
                 ↳ Document required capacity (EPS from Cisco ASA + PAN-OS + CEF sources)

[CRIBL-INFRA-02] Deploy Cribl Stream (leader + workers)
                 Duration: 1d | Owner: Cloud/Linux Admin | Depends: CRIBL-INFRA-01
                 ↳ Provision VMs or containers
                 ↳ Install Cribl Stream; configure leader/worker mesh
                 ↳ Validate Cribl UI accessible and licensed

[CRIBL-INFRA-03] Configure Cribl → Sentinel output (DCE/Logs Ingestion API)
                 Duration: 2h | Owner: Sentinel Engineer | Depends: CRIBL-INFRA-02
                 ↳ Create DCE (Data Collection Endpoint) in Azure
                 ↳ Configure Cribl output: Azure Log Analytics type, workspace ID, DCR stream name
                 ↳ Test dummy event through pipeline; confirm receipt in LAW

[CRIBL-INFRA-04] Configure Cribl syslog/CEF source listener
                 Duration: 2h | Owner: Sentinel Engineer | Depends: CRIBL-INFRA-03
                 ↳ Create Syslog source in Cribl (port 514/6514)
                 ↳ Set up CEF routing pipeline → Sentinel output
                 ↳ Validate parser: test with synthetic CEF event

PHASE 2 — PER-CONNECTOR CONFIGURATION (all run in parallel after their infra block)
─────────────────────────────────────────────────────────────────
[WSE-01] Windows Security Events — Configure Audit Policy
         Duration: 1h | Owner: Windows Admin | Depends: WIN-INFRA-04
         ↳ Configure Group Policy or local policy for Security Audit
         ↳ Select specific Event IDs to collect (e.g., 4624, 4625, 4648, 4672, 4688)
         ↳ Confirm policy applied to all target machines

[WSE-02] Windows Security Events — Enable connector in Sentinel
         Duration: 30min | Owner: Sentinel Engineer | Depends: WSE-01
         ↳ Open Data Connectors → Windows Security Events via AMA
         ↳ Confirm DCR association from WIN-INFRA-04

[WSE-03] Windows Security Events — Validate ingestion
         Duration: 1h | Owner: Sentinel Engineer | Depends: WSE-02
         ↳ Run: SecurityEvent | take 10
         ↳ Confirm events from expected machines; check timestamp lag

[WSE-04] Windows Security Events — Tune event collection
         Duration: 1h | Owner: Sentinel Engineer | Depends: WSE-03
         ↳ Refine DCR event ID filters for cost/coverage balance
         ↳ Remove or add Event IDs based on initial data review

─────────────────────────────────────────────────────────────────
[ASA-01] Cisco ASA — Configure syslog output to Cribl
         Duration: 1h | Owner: Network Admin | Depends: CRIBL-INFRA-04
         ↳ Configure ASA: logging host <Cribl-IP> 6514 format emblem
         ↳ Set logging level: informational or above
         ↳ Test: logging list SENTINEL level informational

[ASA-02] Cisco ASA — Enable connector in Sentinel
         Duration: 30min | Owner: Sentinel Engineer | Depends: ASA-01
         ↳ Open Data Connectors → Cisco ASA
         ↳ Confirm CEF format selection; link to Cribl DCR

[ASA-03] Cisco ASA — Validate ingestion
         Duration: 1h | Owner: Sentinel Engineer | Depends: ASA-02
         ↳ Run: CommonSecurityLog | where DeviceVendor == "Cisco" | take 10
         ↳ Confirm DeviceProduct, Activity fields; check event timestamp

[ASA-04] Cisco ASA — Tune CEF output
         Duration: 1h | Owner: Sentinel Engineer | Depends: ASA-03
         ↳ Tune ASA message IDs included/excluded
         ↳ Validate ASIM normalization if applicable

─────────────────────────────────────────────────────────────────
[PAN-01] Palo Alto — Configure syslog profile to Cribl
         Duration: 1h | Owner: Network Admin | Depends: CRIBL-INFRA-04
         ↳ Create syslog server profile in PAN-OS (Panorama or device)
         ↳ Select log types: Traffic, Threat, URL Filtering, WildFire
         ↳ Assign to security policy; set format to CEF or LEEF
         ↳ Test syslog connectivity

[PAN-02] Palo Alto — Enable connector in Sentinel
         Duration: 30min | Owner: Sentinel Engineer | Depends: PAN-01
         ↳ Open Data Connectors → Palo Alto Networks
         ↳ Confirm CEF DCR linkage

[PAN-03] Palo Alto — Validate ingestion
         Duration: 1h | Owner: Sentinel Engineer | Depends: PAN-02
         ↳ Run: CommonSecurityLog | where DeviceVendor == "Palo Alto Networks" | take 10
         ↳ Confirm log types present; spot-check threat events

[PAN-04] Palo Alto — Tune log selection
         Duration: 1h | Owner: Sentinel Engineer | Depends: PAN-03
         ↳ Add/remove PAN-OS log types based on volume and coverage needs
         ↳ Confirm WildFire and URL logs not over-generating noise

─────────────────────────────────────────────────────────────────
[CEF-01] Common Event Format — Configure CEF source(s) to Cribl
         Duration: 1h | Owner: Security Admin | Depends: CRIBL-INFRA-04
         ↳ Point additional CEF-emitting sources to Cribl listener
         ↳ Verify CEF header format: CEF:0|Vendor|Product|Version|...
         ↳ Confirm no format mismatch with Cribl parser

[CEF-02] Common Event Format — Create CEF DCR
         Duration: 1h | Owner: Sentinel Engineer | Depends: CEF-01
         ↳ Create DCR for CommonSecurityLog table
         ↳ Associate Cribl as the DCE source

[CEF-03] Common Event Format — Enable connector in Sentinel
         Duration: 30min | Owner: Sentinel Engineer | Depends: CEF-02
         ↳ Open Data Connectors → Common Event Format
         ↳ Confirm DCR association

[CEF-04] Common Event Format — Validate ingestion
         Duration: 1h | Owner: Sentinel Engineer | Depends: CEF-03
         ↳ Run: CommonSecurityLog | take 10 to confirm multi-vendor events
         ↳ Check DeviceVendor distribution; confirm all expected sources present

PHASE 3 — OPERATIONALIZE (shared close-out)
─────────────────────────────────────────────────────────────────
[OPS-01] Enable analytics rules
         Duration: 1h | Owner: Security Architect | Depends: WSE-03, ASA-03, PAN-03, CEF-04
         ↳ Review built-in MSFT rules for SecurityEvent, CommonSecurityLog
         ↳ Enable: brute force detection, privilege escalation, lateral movement rules
         ↳ Configure alert thresholds and grouping

[OPS-02] Configure workbooks & dashboards
         Duration: 1h | Owner: Sentinel Engineer | Depends: OPS-01
         ↳ Enable Sentinel workbooks for Windows Security Events + network devices
         ↳ Pin key visualizations to Sentinel overview

[OPS-03] Documentation & handoff runbook
         Duration: 4h | Owner: Security Architect | Depends: OPS-01
         ↳ Document DCR settings (event sets, filters, table targets)
         ↳ Document forwarder topology (Cribl architecture diagram)
         ↳ Document host inventory (Windows machines in scope)
         ↳ Create runbook for adding new Windows machines or CEF sources
```

---

### Duration summary for this scenario

| Phase | Tasks | Default duration | Notes |
|---|---|---|---|
| Phase 0 — Setup | SETUP-01, SETUP-02 | 6h (~1 day) | Shared |
| Phase 1A — Windows AMA infra | WIN-INFRA-01..04 | 4h + Arc time* + 3h = ~1.5d | *Arc: 0 (Azure VMs) → 3 weeks (on-prem fleet) |
| Phase 1B — Cribl infra | CRIBL-INFRA-01..04 | 4h + 1d + 2h + 2h = ~2d | Shared across 3 Syslog/CEF connectors |
| Phase 2 — Windows Security Events | WSE-01..04 | 3.5h | Parallel with Phase 2 Syslog/CEF |
| Phase 2 — Cisco ASA | ASA-01..04 | 3.5h | Parallel |
| Phase 2 — Palo Alto | PAN-01..04 | 3.5h | Parallel |
| Phase 2 — CEF | CEF-01..04 | 3.5h | Parallel |
| Phase 3 — Operationalize | OPS-01..03 | 6h | Shared |

**Critical path (non-parallel):** ~5–6 days, assuming Azure VMs only (no Arc)  
**Critical path (on-prem, Arc required):** ~3–4 weeks (Arc onboarding dominates)

> The configurable duration on `WIN-INFRA-02` is the single most important factor in total plan length for Windows-heavy deployments. The planner should surface this as a prominent sizing input with scenario guidance.

---

### Gantt visualization (ASCII, week-oriented)

```
Week →          W1      W2      W3      W4      W5
─────────────────────────────────────────────────────
SETUP          ██
WIN-INFRA-01    █
WIN-INFRA-02*    ░░░░░░░░░░░░░░░░░░░░░░░░  ← variable, shown here as 3 weeks
WIN-INFRA-03..04                         ██
CRIBL-INFRA-01  █
CRIBL-INFRA-02   ██
CRIBL-INFRA-03    █
CRIBL-INFRA-04    █
─────────────────────────────────────────────────────
WSE-01..04  (after WIN-INFRA-04)               ██
ASA-01..04  (after CRIBL-INFRA-04)        ██
PAN-01..04  (after CRIBL-INFRA-04)         ██
CEF-01..04  (after CRIBL-INFRA-04)          ██
─────────────────────────────────────────────────────
OPS-01..03  (after all PC tasks)                  ██

* WIN-INFRA-02 shown at 3 weeks (on-prem Arc scenario)
  Azure-VM-only scenario: collapses to 0 and WIN-INFRA-03 starts immediately
```

---

## Implementation Notes for the Planner

### Grouping engine logic (pseudo-code)

```
function buildGanttPlan(selectedConnectors) {
  // 1. Identify unique field packs needed
  const fieldPacks = deduplicateFieldPacks(selectedConnectors)

  // 2. Generate bookend tasks (always appear once)
  tasks.push(SETUP-01, SETUP-02)

  // 3. Generate shared infra tasks per field pack (each pack appears ONCE)
  for (pack of fieldPacks) {
    tasks.push(...getInfraTasks(pack))
  }

  // 4. Generate per-connector tasks for each selected connector
  for (connector of selectedConnectors) {
    const pack = connector.fieldPack
    const infraCloseTask = getInfraCloseTask(pack) // the last infra task = join node
    tasks.push(...getPerConnectorTasks(connector, infraCloseTask))
  }

  // 5. Generate close-out tasks (always appear once)
  const allValidationTasks = tasks.filter(t => t.type === 'VALID')
  tasks.push(OPS-01(dependsOn: allValidationTasks), OPS-02, OPS-03)

  return tasks
}
```

### Key design decisions captured here

1. **Shared infra = deduplicated by field pack.** Selecting 15 Syslog/CEF connectors generates ONE `CEF-INFRA` block, not 15.
2. **Cribl replaces the rsyslog forwarder.** When Cribl Stream is in the selection, the Syslog/CEF connectors route through `CRIBL-INFRA` instead of `CEF-INFRA`. The planner should detect `cribl_eligible=true` connectors and suppress duplicate infra blocks.
3. **Arc onboarding is the biggest duration variable.** `WIN-INFRA-02` should be prominently configurable in the planner UI (the "how many on-prem machines" sizing field drives this).
4. **Per-connector tasks run in parallel** after their shared infra join node. The Gantt should reflect this — all per-connector bars start at the same time after infra is complete.
5. **Two-level task hierarchy:** Parent tasks show on Gantt bars; sub-tasks appear as a checklist in the detail panel. This keeps the Gantt readable for complex multi-connector plans.
6. **Task IDs are stable and namespaced.** Format: `{PACK}-{PHASE}-{SEQ}` for infra tasks; `{CONNECTOR-ABBREV}-{SEQ}` for per-connector tasks. This supports the `sentinelPlanner.taskDurationOverrides.v1` localStorage schema already defined in the editable-duration research.

---

## Sources

- Microsoft Sentinel — Connect Windows Security Events via AMA: https://learn.microsoft.com/en-us/azure/sentinel/connect-windows-security-events-via-ama
- Microsoft Sentinel — CEF-formatted logs via AMA: https://learn.microsoft.com/en-us/azure/sentinel/connect-cef-syslog-ama
- Microsoft Sentinel — Syslog data collection: https://learn.microsoft.com/en-us/azure/sentinel/connect-syslog
- Microsoft Sentinel — Deployment guide overview: https://learn.microsoft.com/en-us/azure/sentinel/deploy-overview
- Microsoft Sentinel — Windows Forwarded Events via AMA: https://learn.microsoft.com/en-us/azure/sentinel/data-connectors/windows-forwarded-events
- Cribl Docs — Microsoft Sentinel destination: https://docs.cribl.io/stream/destinations-azure-sentinel/
- Azure Monitor Agent overview: https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-overview
- Azure Arc — Connected Machine agent overview: https://learn.microsoft.com/en-us/azure/azure-arc/servers/agent-overview
- Project references: `docs/connector-requirements-analysis.md`, `docs/connector-tasks-windows-security-events.md`, `docs/research/editable-task-durations.md`
