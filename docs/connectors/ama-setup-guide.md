# Azure Monitor Agent (AMA) Setup Guide for Microsoft Sentinel

## Quick Reference

| Item | Guidance |
| --- | --- |
| Best for | Azure VMs, Arc-enabled servers, and dedicated Linux forwarders that can run AMA |
| Permissions needed | VM Contributor or Azure Connected Machine Resource Administrator to deploy AMA; Monitoring Contributor to create or edit DCRs; deployment rights (`Microsoft.Resources/deployments/*`) at subscription, resource group, or DCR scope |
| Core components | AMA, Data Collection Rule (DCR), optional Data Collection Endpoint (DCE), Log Analytics workspace, Microsoft Sentinel |
| Estimated setup time | 2-6 hours for a first deployment; longer if Arc onboarding or network changes are required |
| Difficulty | Moderate for direct VM collection; Hard for forwarder patterns |
| Microsoft sizing anchor | Linux forwarder benchmark: `Standard_F8s_v2`, 8 vCPU, 16 GiB RAM, 10 GB cache, target 10,000 EPS |
| Read this with | [Syslog / CEF forwarding guide](./syslog-forwarding-guide.md) and [Azure Monitor Pipeline guide](./azure-monitor-pipeline-guide.md) |

## When to Use This

Use this guide when you can install Azure Monitor Agent on the machine that will collect or relay data.

### Decision Tree

1. **Can the source system run AMA directly?**
   - **Yes** -> Use AMA directly on the source VM or Arc-enabled server.
   - **No** -> Use a dedicated Linux forwarder VM and then continue with the [Syslog / CEF forwarding guide](./syslog-forwarding-guide.md).
2. **Do you need centralized filtering, buffering, or routing before data reaches Azure?**
   - **Yes** -> Review the [Azure Monitor Pipeline guide](./azure-monitor-pipeline-guide.md).
   - **No** -> Direct AMA + DCR + Log Analytics is usually the simplest pattern.
3. **Will a single collector need to sustain more than about 10,000 Linux Syslog EPS?**
   - **Yes** -> Treat Pipeline as the primary design candidate instead of stretching one forwarder.
   - **No** -> AMA on the source or on a dedicated forwarder is still a good fit.

## Architecture Overview

AMA is the collection engine. The DCR tells AMA **what** to collect and **where** to send it. Log Analytics stores the data, and Microsoft Sentinel uses that workspace for analytics, hunting, workbooks, and detections.

```text
Data source / server
        |
        v
Azure Monitor Agent (AMA)
        |
        v
Data Collection Rule (DCR)
        |
        v
Log Analytics workspace
        |
        v
Microsoft Sentinel
```

### Component Roles

| Component | Role |
| --- | --- |
| AMA | Collects local telemetry or forwarded events from the machine where it is installed |
| DCR | Defines sources, filters, facilities, severity, and destination workspace |
| DCE | Required only for specific collection patterns such as private link or data sources that need a DCE |
| Log Analytics workspace | Stores incoming operational and security data |
| Microsoft Sentinel | Uses the workspace for content, analytics, incidents, hunting, and reporting |

## Prerequisites

### Infrastructure

- An Azure subscription.
- A Log Analytics workspace already connected to Microsoft Sentinel.
- One of the following compute targets:
  - Azure VM
  - Azure VM scale set
  - Azure Arc-enabled server
- A supported Windows or Linux operating system for AMA.
- For appliance or network-device scenarios, a **dedicated Linux forwarder** VM or Arc-enabled server is strongly recommended.

### Permissions

| Task | Minimum role guidance |
| --- | --- |
| Deploy AMA to Azure VMs or scale sets | Virtual Machine Contributor |
| Deploy AMA to Arc-enabled servers | Azure Connected Machine Resource Administrator |
| Create or edit DCRs | Monitoring Contributor |
| Deploy ARM-based resources or associations | Any role that includes `Microsoft.Resources/deployments/*` |
| Create a workspace destination | Contributor on the Log Analytics workspace or equivalent delegated permission |

### Network and platform readiness

- Outbound connectivity from the AMA host to Azure Monitor and the target workspace.
- Enough local disk for AMA cache and temporary backpressure handling.
- If you are using a forwarder, open the inbound ports required by the source protocol before cutover.
- Decide early whether a **forwarder VM** or **Azure Monitor Pipeline** is the better pattern if the source cannot host AMA.
- If you will use private link, plan a Data Collection Endpoint (DCE) and private DNS before rollout.

## Step-by-Step Setup

### 1) Prepare the workspace

1. Create or identify the Log Analytics workspace that Sentinel will use.
2. Ensure Microsoft Sentinel is enabled on that workspace.
3. Decide which tables you expect to populate (for example `Syslog`, `Perf`, `Event`, `CommonSecurityLog`, or custom tables).
4. Keep the DCR in the **same Azure region** as the destination workspace. If you need multiple workspace regions, plan multiple DCRs.

### 2) Prepare the collection host

1. For Azure resources, confirm the VM or scale set exists and is reachable.
2. For on-premises or multicloud machines, onboard the host to Azure Arc.
3. For forwarder scenarios, keep the host dedicated to collection work whenever possible.
4. Confirm the machine can resolve Azure endpoints and reach them over outbound HTTPS.

### 3) Deploy Azure Monitor Agent

Deploy AMA to each target resource that will collect or forward data.

**Portal path:** **Monitor** -> **Data Collection Rules** -> **Create**, or deploy AMA from the VM / Arc machine experience before associating a DCR.

Operational guidance:
- Use direct AMA installation on individual servers when each server has unique local telemetry you care about.
- Use a dedicated collector when multiple devices send data to one Linux host.
- When you add resources to a DCR in the portal, Azure enables a **system-assigned managed identity** by default. If you already rely on a user-assigned identity, keep that design explicit during rollout.
- Confirm the agent reports health before you continue.

### 4) Create the Data Collection Rule (DCR)

In the Azure portal, go to **Monitor** -> **Data Collection Rules** -> **Create** and work through these tabs:

1. **Basics**
   - Give the rule a descriptive name.
   - Store it in the same region as the destination workspace.
   - Set **Platform type** to match the hosts you will associate.
   - Specify a **DCE** only if your data source requires one or if you are using Azure Monitor Private Link.
2. **Resources**
   - Add the pilot VM, scale set instances, or Arc-enabled servers.
   - Skip per-resource DCE selection unless you are explicitly using private link.
3. **Collect and deliver**
   - Add the required data source such as **Linux Syslog**, **Windows events**, or **Performance counters**.
   - Add an **Azure Monitor Logs** destination and select the Sentinel workspace.
   - A DCR can contain up to **10 data sources**. A VM can use multiple DCRs, but overlapping sources create duplicate ingestion and cost.

Design tips:
- Keep DCRs small and purposeful rather than building one giant rule for every scenario.
- Separate high-volume feeds from low-volume feeds so you can tune them independently.
- Avoid sending the same feed to multiple workspaces unless duplicate cost is acceptable.
- If you add JSON-only features such as unsupported transformations, keep editing that DCR in JSON. Portal edits can overwrite unsupported settings.

### 5) Associate the DCR to resources

Attach the DCR to the Azure VM, scale set, or Arc-enabled server.

**CLI example**

```bash
az monitor data-collection rule association create \
  --name ama-association \
  --rule-id "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Insights/dataCollectionRules/<dcr-name>" \
  --resource "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Compute/virtualMachines/<vm-name>"
```

Recommended practice:
- Use separate DCR associations for materially different collection patterns.
- For staged rollout, attach the DCR to a pilot set first and validate before broad deployment.

### 6) Validate health and ingestion

The agent writes a `Heartbeat` record every minute when it is healthy. New collection can take up to **5 minutes** to appear after the DCR is created or changed.

**Agent heartbeat**

```kusto
Heartbeat
| where Computer == "<host-name>"
| take 10
```

**Recent Syslog example**

```kusto
Syslog
| where TimeGenerated > ago(15m)
| summarize Count=count() by Computer, Facility, SeverityLevel
| order by Count desc
```

**Recent performance data example**

```kusto
Perf
| where TimeGenerated > ago(15m)
| summarize AvgCounterValue=avg(CounterValue) by Computer, ObjectName, CounterName
| order by Computer asc
```

### 7) Move into steady-state operations

- Monitor host CPU, memory, and disk.
- Review ingestion volume and cost trends in the workspace.
- Revisit DCR severity thresholds after the first week so you can remove noisy data.
- Track every DCR association so you can spot duplicate collection before the bill does.

## Performance Considerations

Microsoft publishes a Linux forwarder benchmark for AMA. Treat it as a planning anchor, not an SLA.

### Microsoft benchmark summary

| Metric | Published result for the 10,000 EPS Linux gateway-forwarder benchmark |
| --- | --- |
| Test host | `Standard_F8s_v2` |
| vCPU / memory | 8 vCPU / 16 GiB |
| AMA version | Linux AMA 1.25.2 |
| Event cache | 10 GB |
| Test duration | 7 days |
| Average CPU | 51% |
| Peak CPU | 262% |
| Average memory RSS | 276 MB |
| Peak memory RSS | 1,017 MB |
| Network average | 338 KBps |
| Network peak | 18,033 KBps |

### Practical limits and operating guidance

- **Linux forwarders:** design around **10,000 EPS sustained** on dedicated infrastructure.
- **Warning threshold:** a **20,000 EPS** warning can appear, but Microsoft does **not** guarantee lossless delivery above the 10,000 EPS target.
- **Windows event forwarding:** use **5,000 EPS** as the safer planning point because the Windows Event service becomes the limiter.
- Throughput changes with event size, mix, transformations, and hardware, so pilot testing matters.
- Dedicated forwarders are preferred because competing workloads make drops more likely.
- Redundant forwarders and load balancing improve reliability and scale.

## Sizing Recommendations

Use these as customer-facing planning ranges. Validate them with a pilot before final sign-off.

| Sustained volume | Recommended pattern | Suggested starting size | Notes |
| --- | --- | --- | --- |
| Up to 2,000 EPS | Direct AMA or small forwarder | 2-4 vCPU, 8 GiB RAM | Good fit for pilots, branch offices, or low-noise workloads |
| 2,000-10,000 EPS | Dedicated Linux forwarder | 4-8 vCPU, 8-16 GiB RAM | Best starting point for shared collectors and appliance feeds |
| 10,000-20,000 EPS | Multiple forwarders behind load balancing | 2+ nodes, each around 8 vCPU / 16 GiB | Do not rely on a single host for this range |
| Over 20,000 EPS or multi-site concentration | Evaluate [Azure Monitor Pipeline](./azure-monitor-pipeline-guide.md) | Arc-enabled Kubernetes cluster | Use centralized filtering, buffering, and scale-out controls |

### Simple customer sizing rule of thumb

- **Small:** one site, a handful of servers, low event volume -> start with direct AMA.
- **Medium:** multiple source systems or appliances feeding one collector -> use a dedicated forwarder.
- **Large or noisy:** thousands of sources, sustained high EPS, or transformation needs -> move toward [Azure Monitor Pipeline](./azure-monitor-pipeline-guide.md).

## Cost Considerations

| Cost driver | What to watch |
| --- | --- |
| Duplicate destinations | Sending one source to multiple workspaces creates duplicate ingestion charges |
| Duplicate DCRs | Associating overlapping DCRs to the same VM can duplicate collection into the same table |
| Noisy facilities or counters | Wide Syslog severity settings or broad performance collection can drive unnecessary volume |
| Oversized pilot scopes | Start with a pilot association first, then widen after you understand the data profile |
| Forwarder sprawl | Multiple underused collector VMs can cost more than right-sized direct AMA on the sources |

## Validation Steps

Use this checklist before you call the deployment complete.

1. **Heartbeat present** for every target machine.
2. **Expected table populated** (`Syslog`, `Perf`, `Event`, or custom table).
3. **No duplicate collection** from overlapping DCRs.
4. **CPU, memory, and disk headroom** remain healthy during peak collection windows.
5. **Sentinel content works** against the table you expected.

**Check DCR associations**

```powershell
Get-AzDataCollectionRuleAssociation -resourceUri <vm-resource-id>
```

**Check for duplicate Syslog volume by collector**

```kusto
Syslog
| where TimeGenerated > ago(1h)
| summarize Count=count() by Computer, HostName, Facility, SeverityLevel
| order by Count desc
```

## Troubleshooting

| Symptom | Likely cause | What to check |
| --- | --- | --- |
| No `Heartbeat` from the host | AMA not installed, not started, or blocked outbound | Confirm extension health, Arc status, outbound connectivity, and identity state |
| DCR created but no data arrives | DCR not associated or wrong scope | Validate the DCR association to the exact VM or Arc server |
| Advanced transformation disappeared after a portal edit | Portal overwrite of unsupported JSON-only settings | Reapply the DCR in JSON and manage that rule outside the portal |
| High CPU or intermittent drops | Forwarder overloaded | Check EPS, CPU, memory, disk, and whether the host is shared with other workloads |
| Sudden ingestion spike | Severity threshold too broad or multiple DCRs overlap | Tighten collection scope and review DCR associations |
| Duplicate data in Sentinel | Same stream sent to multiple workspaces or multiple collectors | Review DCR destinations and upstream forwarding paths |
| Disk pressure on Linux collector | Local logging or cache growth | Reduce redundant local storage, monitor cache, and follow the hardening steps in the [Syslog guide](./syslog-forwarding-guide.md) |

## Common Pitfalls

- Editing a JSON-customized DCR in the portal and unintentionally removing unsupported transformation settings.
- Associating multiple DCRs with the same source without making the filters mutually exclusive.
- Treating the 10,000 EPS benchmark as a promise instead of a sizing starting point.
- Using a shared Linux host as a forwarder and discovering another workload consumes the CPU or disk headroom.
- Forgetting that DCR region must match the Log Analytics workspace region.
- Rolling directly to production without validating `Heartbeat`, table population, and EPS under a representative load.

## Further Reading

- [Azure Monitor Agent performance benchmark](https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-performance)
- [Collect data from virtual machine clients with Azure Monitor](https://learn.microsoft.com/en-us/azure/azure-monitor/vm/data-collection)
- [Collect Syslog events with Azure Monitor Agent](https://learn.microsoft.com/en-us/azure/azure-monitor/agents/data-collection-syslog)
- [Syslog / CEF forwarding guide](./syslog-forwarding-guide.md)
- [Azure Monitor Pipeline guide](./azure-monitor-pipeline-guide.md)

