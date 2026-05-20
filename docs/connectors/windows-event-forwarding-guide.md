# Windows Event Forwarding (WEF/WEC) Guide for Microsoft Sentinel

## Quick Reference

| Item | Guidance |
| --- | --- |
| Best for | On-premises Windows servers, domain controllers, and workstation fleets that need centralized Windows Security or event-log collection without installing AMA on every source machine |
| Permissions needed | Domain admin or delegated GPO administration for source machines; local admin on the WEC server; Azure Connected Machine Resource Administrator or equivalent for non-Azure WEC onboarding; Monitoring Contributor for the DCR; workspace read/write permissions in Microsoft Sentinel |
| Core components | Active Directory or equivalent source management, Windows Event Forwarding (WEF), one or more Windows Event Collector (WEC) servers, Azure Arc or Azure VM hosting, Azure Monitor Agent (AMA), Data Collection Rule (DCR), Log Analytics workspace, Microsoft Sentinel |
| Estimated setup time | 4-8 hours for a pilot; longer for production GPO rollout, collector sizing, and validation |
| Difficulty | Hard |
| Key ports | WinRM over TCP 5985 or 5986 between source machines and the WEC; outbound TCP 443 from the WEC to Azure Monitor |
| Output table | `WindowsEvent` |
| Read this with | [AMA setup guide](./ama-setup-guide.md) and [Azure Monitor Pipeline guide](./azure-monitor-pipeline-guide.md) |

## When to Use This

Use this guide when you want Windows hosts to forward events to a central collector first, and then use AMA on that collector to send the forwarded stream into Microsoft Sentinel.

### Decision Tree

1. **Do you need native Windows Security or event-log collection from many on-premises Windows servers without AMA on every source?**
   - **Yes** -> Use WEF with one or more WEC servers.
   - **No** -> Continue.
2. **Can every source server run AMA directly, and is per-server agent management acceptable?**
   - **Yes** -> Start with the [AMA setup guide](./ama-setup-guide.md).
   - **No** -> Continue.
3. **Do you already have WEF infrastructure or want one collector tier for domain controllers and other Windows servers?**
   - **Yes** -> This WEF/WEC pattern is the best fit.
   - **No** -> Continue.
4. **Do you need centralized buffering, transformations, or ingestion scale beyond what a few WEC servers should handle?**
   - **Yes** -> Review the [Azure Monitor Pipeline guide](./azure-monitor-pipeline-guide.md), but note that Pipeline is not the native Windows Event channel collection path today. For raw Windows Security logs, WEF or direct AMA are still the primary designs.
   - **No** -> WEF plus AMA on the WEC is usually the right compromise between scale and operational simplicity.

## Architecture Overview

Windows Event Forwarding keeps the Windows-native collection path on the source machines and centralizes the cloud handoff on the WEC layer.

```text
Source Windows servers / domain controllers / workstations
                         |
                         |  WEF subscriptions over WinRM
                         |  (usually source-initiated via GPO)
                         v
            Windows Event Collector (WEC) server(s)
                  Forwarded Events log on Windows
                         |
                         |  Azure Monitor Agent on the WEC
                         v
              Data Collection Rule (All or XPath filter)
                         |
                         v
                Log Analytics workspace for Sentinel
                         |
                         v
                   Microsoft Sentinel analytics
```

### Component roles

| Component | Role |
| --- | --- |
| Source machines | Generate Windows Security, System, Application, or other Windows event channels |
| WEF subscription | Defines which events are forwarded and whether the pattern is source-initiated or collector-initiated |
| WEC server | Receives events, stores them in **Forwarded Events**, and centralizes the AMA deployment |
| AMA | Reads the forwarded stream from the WEC and sends it to Azure Monitor |
| DCR | Decides which Windows forwarded events to ingest into the Sentinel workspace |
| Microsoft Sentinel | Uses the `WindowsEvent` table for analytics, hunting, workbooks, and detections |

## Prerequisites

### Directory and Windows platform readiness

- An Active Directory domain is strongly recommended for large WEF rollouts because **source-initiated** subscriptions scale best when you can manage source machines with Group Policy.
- A dedicated Windows Server for the WEC role is strongly recommended. Avoid sharing the collector with busy line-of-business workloads.
- Windows Event Collector and WinRM must be enabled on the collector.
- Source machines must be able to reach the collector over WinRM on **5985 (HTTP)** or **5986 (HTTPS)**.
- If you will collect the **Security** log, the **Network Service** account on the source machines must have read access to that log.

### Azure and Sentinel readiness

- Microsoft Sentinel must already be enabled on the target Log Analytics workspace.
- Install the **Windows Forwarded Events** solution from the Sentinel **Content hub** before you create the production DCR.
- The WEC must be an Azure VM or an **Azure Arc-enabled** server so AMA can be deployed and managed.
- Keep the DCR in the **same Azure region** as the destination workspace.
- Read and write access to the Sentinel workspace is required.
- Microsoft recommends the **ASIM Windows Event parsers** so normalized analytics and hunting content work more consistently.

### WEC server sizing starting point

| Expected role | Suggested starting point | Notes |
| --- | --- | --- |
| Pilot or small branch collector | 2-4 vCPU, 8-16 GiB RAM | Good for proving the pattern and measuring actual event mix |
| Shared production WEC | 4 vCPU, 16 GiB RAM, fast disks | Microsoft guidance for an average 2,000-4,000 clients with 1-2 subscriptions |
| Large enterprise WEF tier | Multiple WEC servers | Split clients across collectors instead of pushing one WEC too far |

Important sizing notes:
- Microsoft guidance for large environments recommends **more than one collector** and typically **2,000-4,000 clients per collector** rather than one oversized WEC.
- Fast disks matter. If possible, place the **Forwarded Events** log on a separate fast volume.
- More subscriptions mean more connections and more `WecSvc` memory pressure.

## Setup Steps

### 1) Prepare the workspace and install the Sentinel solution

1. Confirm the Log Analytics workspace is already connected to Microsoft Sentinel.
2. Open **Content hub** in Microsoft Sentinel and install **Windows Forwarded Events**.
3. Decide where you want to filter events:
   - **WEF subscription filter** to suppress noise before the collector stores it.
   - **DCR XPath filter** to control what AMA forwards from the WEC into Azure.
4. For most customers, filter as early as you safely can so the WEC and workspace both handle less noise.

### 2) Configure the WEC server

Build or select a dedicated Windows Server, join it to the domain if appropriate, and enable the collector role.

```powershell
wecutil qc
winrm qc
Get-Service Wecsvc, WinRM
```

Operational guidance:
- Confirm DNS, time sync, and domain trust are healthy before onboarding sources.
- Use HTTPS if the environment requires encrypted WinRM transport end to end; otherwise start with HTTP 5985 for a simpler pilot.
- If the WEC is on-premises or in another cloud, onboard it to **Azure Arc** before you deploy AMA.

### 3) Create the WEF subscription

You can create subscriptions in **Event Viewer** on the WEC under **Subscriptions**.

| Subscription type | Best when | Guidance |
| --- | --- | --- |
| Source-initiated | Large domain-joined fleets | Preferred for most enterprise rollouts because sources discover the WEC via GPO |
| Collector-initiated | Small, static, or exceptional source lists | More manual to maintain; usually not the first choice for broad server fleets |

Recommended choices:
1. Set **Destination log** to **Forwarded Events**.
2. Prefer **Source computer initiated** for domain-managed servers.
3. Add the source computer groups or OUs that should participate.
4. Use **Select Events** to define the event channels and filters you actually need.
5. Keep the subscription count low unless you have a clear separation reason.

Design note: if you already know you only need a targeted Security-event set, it is usually better to narrow the WEF subscription first and use the DCR as the second line of control.

### 4) Configure source machines with Group Policy

Create or update a GPO that targets the Windows sources that should forward events.

**Configure target subscription manager**

Path:
`Computer Configuration -> Policies -> Administrative Templates -> Windows Components -> Event Forwarding -> Configure target Subscription Manager`

Example value:

```text
Server=http://wec01.contoso.local:5985/wsman/SubscriptionManager/WEC,Refresh=3600
```

Recommended GPO tasks:
1. Point sources to the WEC using the **Configure target Subscription Manager** setting.
2. Ensure the **WinRM** service starts automatically on source systems.
3. Allow firewall communication to the WEC on 5985 or 5986.
4. If collecting the **Security** log, configure **Event Log Service -> Security -> Configure log access** so the existing Security log ACL also includes **Network Service**.

Practical Security-log tip:
- On a reference machine, run `wevtutil gl security` and preserve the existing SDDL.
- If the SDDL does not already include Network Service, append the permission needed for `NS` instead of replacing the ACL blindly.

### 5) Install Azure Monitor Agent on the WEC

1. If the WEC is an Azure VM, deploy AMA directly.
2. If the WEC is on-premises or in another cloud, onboard it to **Azure Arc** and then deploy AMA.
3. Confirm the WEC is healthy before you create the final DCR.

**Heartbeat validation**

```kusto
Heartbeat
| where Computer == "<wec-name>"
| take 10
```

### 6) Create the Data Collection Rule for Windows Forwarded Events

From Microsoft Sentinel:

1. Go to **Configuration -> Data connectors**.
2. Open **Windows Forwarded Events**.
3. Select **Open connector page**.
4. Under **Configuration**, select **+ Add data collection rule**.
5. Add the WEC server resource.
6. Choose **All events** or **Custom** and define the Windows-event XPath filters you want AMA to ingest.
7. Create the DCR and confirm the association to the WEC.

Filtering guidance:
- AMA supports **XPath 1.0** for Windows event filters.
- Use the WEF subscription for broad event selection and the DCR for Azure ingestion tuning.
- Avoid overlapping DCRs for the same forwarded stream, or you may create duplicate ingestion and extra cost.

### 7) Validate end-to-end data flow

Validate at both layers:

**On the WEC**
- The **Forwarded Events** log should populate.
- The subscription runtime status should show connected source machines.
- CPU, memory, disk, and `WecSvc` behavior should stay healthy during test bursts.

**In Microsoft Sentinel**

```kusto
WindowsEvent
| where TimeGenerated > ago(15m)
| summarize Events=count() by Computer, EventLog
| order by Events desc
```

Expected outcome:
- `Computer` should normally reflect the original source machine, not only the collector.
- You should see the event channels you selected in the subscription and DCR.

## Sizing and Performance

Treat WEF sizing as both a **collector** problem and an **AMA handoff** problem.

### Published planning anchors

| Topic | Practical planning guidance |
| --- | --- |
| Clients per collector | For large deployments, Microsoft recommends splitting load across collectors and planning roughly **2,000-4,000 clients per WEC** |
| Baseline WEC hardware | Start around **4 processors and 16 GiB RAM** for an average collector with 1-2 subscriptions |
| WecSvc memory growth | With 4,000 clients and 5-7 subscriptions, `WecSvc` memory can exceed **4 GiB** and continue growing |
| AMA handoff | Use roughly **5,000 EPS** as the safer planning point for one WEC/AMA path; above that, scale out rather than relying on one server |
| Storage | Use fast disks and consider moving **Forwarded Events** to a separate disk |

### When to add more WEC servers

Add another collector when one or more of these appear:
- Sustained event bursts create visible delays in the **Forwarded Events** log.
- `WecSvc` memory or CPU keeps climbing during normal production periods.
- Disk latency becomes the bottleneck for event writes.
- You are approaching the 2,000-4,000 source range with multiple subscriptions.
- You are pushing near the 5,000 EPS planning point on the collector-to-AMA path.

### Practical design guidance

- Prefer **source-initiated** subscriptions for scale.
- Keep collectors **dedicated**.
- Split domain controllers, high-noise servers, or remote sites across multiple WECs if event bursts are uneven.
- Pilot with realistic security-audit volume before finalizing production counts.

## Integration with Microsoft Sentinel

The **Windows Forwarded Events** solution in the Sentinel **Content hub** provides the connector experience for this pattern.

### What the solution does

- Installs the **Windows Forwarded Events** connector experience in Microsoft Sentinel.
- Uses AMA on a **Windows** collector resource.
- Writes ingested data to the **`WindowsEvent`** table.
- Provides sample queries and packaged analytics content.

### Current content notes

Based on the current Microsoft Sentinel solution package and public solution metadata:
- The solution provides **1 data connector**.
- The packaged analytics commonly include:
  - **Caramel Tsunami Actor IOC - July 2021**
  - **Chia_Crypto_Mining IOC - June 2021**
- Content Hub packages change over time, so verify the exact rule set in your own tenant during installation.

### Operational note

The connector itself writes to **`WindowsEvent`**. If you see other Windows-event tables elsewhere in your workspace, do not assume they came from this connector unless you validate the ingestion path.

## Comparison Table

| Design option | WEF + WEC + AMA | Direct AMA on each Windows server | Azure Monitor Pipeline |
| --- | --- | --- | --- |
| Native fit for Windows Security/Event channels | Yes | Yes | No, not as the native Windows-event connector path |
| Agent on every source machine | No | Yes | No |
| Best when | You want centralized Windows-event collection and minimal source-agent footprint | You want the simplest supported pattern and can manage AMA per server | You need a scale-out ingestion tier for supported inputs such as Syslog or OTLP |
| Filtering point | WEF subscription first, DCR second | DCR on each server | Pipeline processing layer before Azure |
| Operational overhead | Medium to high | Low to medium | High |
| Scaling model | Add more WEC servers | Add more AMA-managed servers individually | Scale cluster nodes and replicas |
| Main strength | Centralizes Windows-event collection without per-source AMA | Lowest architectural complexity for supported Windows servers | Strongest option for buffering, transformation, and very high supported-input throughput |
| Main trade-off | WEC sizing, GPO hygiene, and WinRM troubleshooting matter | More agents to deploy and manage | More platform complexity, and not the primary path for raw Windows event channels |

## Validation Steps

Use this checklist before you call the design production-ready.

1. **Forwarded Events populates on the WEC** from at least one known test source.
2. **Heartbeat is present** for the WEC after AMA deployment.
3. **`WindowsEvent` records arrive** in the Sentinel workspace and show the expected source computers and channels.
4. **No duplicate collection** exists from overlapping DCRs or overlapping WEF subscriptions.
5. **Collector CPU, memory, and disk headroom** stay healthy during a realistic peak window.

## Common Pitfalls

- Treating WEF as "free" just because it is built into Windows. The collector tier still needs sizing, storage, and monitoring.
- Building too many subscriptions when one carefully filtered subscription would be easier to scale.
- Filtering only in the DCR and letting the WEC fill with noise that should have been trimmed earlier in the WEF subscription.
- Forgetting to grant **Network Service** access to the **Security** log on source machines.
- Stretching one WEC too far instead of adding another collector.
- Assuming Azure Monitor Pipeline is a drop-in replacement for raw Windows event-channel collection.

## Common Issues and Troubleshooting

| Symptom | Likely cause | What to check |
| --- | --- | --- |
| Source machines never appear in **Forwarded Events** | GPO not applied, WinRM disabled, or the subscription manager URL is wrong | `gpresult`, the **Microsoft-Windows-Forwarding/Operational** log, WinRM service state, and TCP 5985/5986 connectivity |
| Security events do not forward | **Network Service** cannot read the Security log | `wevtutil gl security`, the **Configure log access** GPO value, and whether the Security ACL preserved existing entries |
| Event ID 105 or HTTP URL errors on the collector | URL ACL conflict between `WecSvc` and WinRM | Review `netsh http show urlacl` and apply Microsoft's documented 5985/5986 URL ACL fix for affected Windows Server builds |
| Events reach the WEC but not Sentinel | AMA missing, DCR not associated, or wrong workspace wiring | `Heartbeat`, DCR associations, WEC AMA status, and the connector page in Sentinel |
| Delivery is slow or bursty | Too many clients or subscriptions on one WEC, or slow disk | Collector CPU, memory, disk latency, source count, and whether you need another WEC |
| Duplicate or noisy data | Filters are too broad or multiple DCRs overlap | WEF subscription scope, DCR XPath filters, and other DCRs targeting the same WEC |

### Useful checks

**Collector status**

```powershell
wecutil gr <subscription-name>
Get-WinEvent -LogName "Forwarded Events" -MaxEvents 20
```

**XPath validation on a Windows host**

```powershell
$XPath = '*[System[EventID=4624]]'
Get-WinEvent -LogName 'Security' -FilterXPath $XPath
```

## Further Reading

- [Connect Microsoft Sentinel to Windows-based services with AMA](https://learn.microsoft.com/en-us/azure/sentinel/connect-services-windows-based)
- [Windows Forwarded Events connector reference](https://learn.microsoft.com/en-us/azure/sentinel/data-connectors-reference)
- [Windows Forwarded Events solution on Azure Marketplace](https://marketplace.microsoft.com/en-us/product/saas/azuresentinel.azure-sentinel-solution-windowsforwardedevents?tab=overview)
- [Forward on-premises Windows Security Event Logs to Microsoft Sentinel](https://techcommunity.microsoft.com/blog/coreinfrastructureandsecurityblog/forward-on-premises-windows-security-event-logs-to-microsoft-sentinel/3040784)
- [AMA setup guide](./ama-setup-guide.md)
- [Azure Monitor Pipeline guide](./azure-monitor-pipeline-guide.md)
