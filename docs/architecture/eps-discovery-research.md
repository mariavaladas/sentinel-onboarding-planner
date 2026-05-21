# EPS Discovery Research for On-Prem Sources

- **Prepared by:** Deckard
- **Prepared:** 2026-05-20T11:24:51.073+02:00
- **Scope:** How customers can discover real EPS (events per second) for on-prem Windows, Linux, firewall, and network-device sources, and how that should drive Sentinel collection architecture.

## Executive summary

EPS discovery should be **measured first, estimated last**.

The strongest order of operations is:

1. Reuse **existing measured data** if it already exists (legacy SIEM, firewall dashboards, partial Azure ingestion).
2. If not, run a **short-lived measurement** at the source or collector (Windows event logs, `rsyslog`, `syslog-ng`, WEC/WEF collector, SPAN/TAP).
3. Only use **rules of thumb** when nothing measurable exists yet.

Three design anchors matter most:

- **Windows/WEC planning:** treat **~5,000 EPS per collector** as the safer planning point because the Windows Event service becomes the limiting component in forwarder scenarios. Microsoft also recommends scaling WEF collectors horizontally and sizing collectors with meaningful CPU, memory, and disk headroom for large estates.
- **Linux AMA forwarders:** use **~10,000 EPS sustained per dedicated forwarder** as the practical planning anchor from Microsoft's AMA gateway benchmark on `Standard_F8s_v2` (8 vCPU / 16 GiB / 10 GB cache). Above that, scale out and stop treating one box as enough.
- **Azure Monitor Pipeline:** becomes compelling once a site moves beyond single-forwarder territory, needs local filtering or buffering, or is concentrating large CEF or Syslog volumes. Microsoft now publishes pipeline sizing figures that are far above AMA forwarder throughput for the same class of hardware.

Two additional principles should shape the planner:

- **Measure peak and sustained rate**, not daily average alone. Use at least **average EPS**, **peak 1-minute EPS**, and ideally **P95 1-minute EPS** over a representative window.
- **EPS alone is not enough**. Capture **source mix**, **site concentration**, **burstiness**, and **average event size / daily GB** when possible, because cost and architecture are driven by both message rate and payload size.

## Recommended discovery order

| Order | Method | Confidence | Why it should come first |
| --- | --- | --- | --- |
| 1 | Existing SIEM / logging platform | Very high | Already production data; usually already normalized as EPS or daily ingest |
| 2 | Source-native dashboards (firewalls, VPNs, appliances) | High | Best device-side truth before forwarding is built |
| 3 | Partial Azure ingestion + KQL | High | Fast for pilots or mixed estates already sending some data |
| 4 | Host/collector-side scripts and counters | Medium-high | Precise enough if run over the right sample window |
| 5 | Network SPAN / TAP counting | Medium | Useful when you cannot log into the source or collector |
| 6 | Estimation formulas / archetypes | Low | Good for first-pass planning only; never final sign-off |

## 1. Discovery methods — how a customer can measure EPS

### 1.1 Windows Event Log methods

Windows sources are the hardest place to rely on a single technique because volume varies wildly by role, audit policy, and tooling (Defender, Sysmon, legacy agents, custom apps). The best practice is to combine **log-window counts** with **collector-side measurements** if WEF is in scope.

#### Method A — PowerShell event counting with `Get-WinEvent`

Use [`Get-WinEvent`](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent?view=powershell-7.5) with a bounded time window and count returned records.

**Best for**
- A server you can log into directly
- Measuring `Security`, `System`, `Application`, `ForwardedEvents`, or a high-value operational log such as `Microsoft-Windows-Sysmon/Operational`
- Sampling over 5 minutes, 1 hour, or 24 hours

**What it tells you**
- Actual event count over the chosen time window
- EPS by log and total EPS on that host

**Strengths**
- Native, no extra software
- Good enough for pilot sizing
- Works on source servers or WEC collectors

**Limitations**
- Point-in-time only unless scheduled repeatedly
- Very broad queries against `Security` can be expensive on very busy hosts
- Needs local permissions to query protected logs

**Practical guidance**
- Sample at least **24 hours** if possible.
- Break out high-volume logs separately (`Security`, `Sysmon`, app-specific logs).
- For WEF/WEC design, run the same measurement against the **WEC collector's `ForwardedEvents` log** after a pilot subscription exists.

#### Method B — Performance counters / PerfMon on Event Log

Windows exposes Event Log performance data that can be collected with **Performance Monitor** / Data Collector Sets. Use PerfMon to watch the **Event Log** object (for example `Events/sec` where available on the OS build) and log the counters over time. If scripting is preferred, discover exact counter names on the host first with PowerShell or PerfMon.

**Best for**
- Short-term burst analysis
- Producing a chart for peak busy periods
- Proving that the environment spikes beyond steady-state averages

**Strengths**
- Lightweight rolling measurement
- Good for seeing burst shape, not just totals

**Limitations**
- Counter names and availability can vary by OS/build
- Less useful than log-window counts if you need per-log breakdowns

**Practical guidance**
- Use a **5s–15s sample interval** for short burst analysis.
- Pair the counter with log-window queries so you know **which** log is hot, not just that the host is hot.

#### Method C — Metadata and delta checks with `Get-WinEvent -ListLog` and `wevtutil`

[`Get-WinEvent -ListLog *`](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent?view=powershell-7.5) exposes metadata such as `RecordCount`, `FileSize`, `MaximumSizeInBytes`, and `LastWriteTime`. [`wevtutil`](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/wevtutil) provides similar metadata and can query/export events when PowerShell is constrained.

**Best for**
- Quick triage on locked-down systems
- Spotting the noisiest logs before running a heavier sample
- Estimating deltas by reading metadata twice over a known interval

**Strengths**
- Native tooling, no install
- Useful for host triage and scripting

**Limitations**
- Metadata deltas are less precise than counting actual events in a bounded time range
- Log rollover can distort simple `RecordCount` comparisons

#### Method D — WEF/WEC collector-side measurement

If the target architecture includes **Windows Event Forwarding**, the collector is part of the bottleneck. Microsoft guidance for WEF scaling emphasizes **collector sizing, disk layout, refresh intervals, and scaling collectors horizontally** rather than assuming one collector can absorb everything. Treat the WEC collector as a first-class measurement point.

Relevant Microsoft guidance:
- [Best practice of configuring EventLog forwarding performance](https://learn.microsoft.com/en-us/troubleshoot/windows-server/admin-development/configure-eventlog-forwarding-performance)
- [Use Windows Event Forwarding to assist intrusion detection](https://learn.microsoft.com/en-us/windows/security/operating-system-security/device-management/use-windows-event-forwarding-to-assist-in-intrusion-detection)

**Best for**
- Deciding whether one WEC is enough
- Understanding collector saturation before onboarding to Sentinel

**What to measure**
- `ForwardedEvents` growth rate
- CPU, memory, and especially disk behavior on the collector
- Source count per collector
- Burst windows for domain controllers and heavily audited systems

**Important architecture implication**
- Even if total environment EPS looks moderate, a **Windows-heavy estate** can still need multiple WECs earlier than a Syslog estate because Windows collection becomes constrained around the Event service / collector tier sooner than Linux Syslog forwarding does.

### 1.2 Syslog methods

Syslog and CEF are usually easier to measure because the collector or daemon already maintains counters.

#### Method A — `rsyslog` internal counters with `impstats`

[`impstats`](https://www.rsyslog.com/doc/configuration/modules/impstats.html) emits periodic `rsyslog` internal counters. This is the best native method on `rsyslog` collectors.

**Best for**
- Linux collectors that already use `rsyslog`
- Measuring processed, submitted, queue, and action counters over fixed intervals

**Strengths**
- Native, precise, collector-side truth
- Lets you observe both throughput and stress signals such as queue buildup

**Limitations**
- Must be enabled/configured first
- Counter naming differs by ruleset/input/action
- Adds small overhead in very high-load environments

**What to capture**
- Processed/submitted counts per 60-second interval
- Queue growth and drops
- Separate counts for `imudp`, `imtcp`, and forwarding actions if possible

#### Method B — `syslog-ng` statistics with `syslog-ng-ctl stats`

`syslog-ng` exposes processed message counters via [`syslog-ng-ctl stats`](https://man7.org/linux/man-pages/man1/syslog-ng-ctl.1.html). The syslog-ng administration guide also documents stats and counters.

**Best for**
- Linux collectors that use `syslog-ng`
- Measuring exact processed counts over a sampled interval

**Strengths**
- Native, no extra capture tooling
- Easy to reset counters, sleep, and calculate EPS

**Limitations**
- Stats are collector-wide unless you parse by source/destination
- You still need a representative sample window

#### Method C — Collector file or queue-based counting

Some customers already land raw Syslog or CEF into local files before forwarding. In those cases, counting lines over time is a pragmatic approximation of messages per second.

**Best for**
- Existing legacy collectors that already spool raw messages locally

**Limitations**
- Only valid when one line equals one message
- Not ideal for AMA collector patterns because Microsoft explicitly warns against unnecessary local writes on Linux collectors

#### Method D — Socket and packet observation

If daemon counters are unavailable, measure inbound traffic with `tcpdump`, `tshark`, or packet brokers on the Syslog/CEF ports.

**Best for**
- Emergency triage
- Devices you cannot log into
- Pre-forwarder architecture studies

**Limitations**
- Works best for **UDP Syslog** where packet ~= message
- For **TCP Syslog/CEF**, packet count is **not** message count unless you reassemble the stream correctly
- Encrypted transport hides payload details

### 1.3 Firewall and network-device native dashboards

For appliances, the best initial answer is often already on the device or its management plane.

| Vendor | Native method | Practical use |
| --- | --- | --- |
| Palo Alto Networks | CLI `debug log-receiver statistics` and ACC / monitoring views ([KB](https://knowledgebase.paloaltonetworks.com/KCSArticleDetail?id=kA10g000000ClHCCA0), [ACC](https://docs.paloaltonetworks.com/ngfw/administration/monitoring/use-the-application-command-center)) | Shows incoming/written log rate directly; excellent for pre-SIEM sizing |
| Fortinet FortiGate | **Log Rate** widget in the dashboard ([Fortinet technical tip](https://community.fortinet.com/fortigate-3/technical-tip-fortigate-dashboard-log-rate-widget-and-how-to-configure-it-199866), [log settings docs](https://docs.fortinet.com/document/fortigate/7.4.3/administration-guide/250999/log-settings-and-targets)) | Quick live logs/sec measurement without building a collector first |
| Check Point | `cpstat mg -f log_server`, `doctor-log.sh`, SmartConsole / SmartView dashboards ([logging guide](https://sc1.checkpoint.com/documents/R81.20/WebAdminGuides/EN/CP_R81.20_LoggingAndMonitoring_AdminGuide/Content/Topics-LOGGAM/LOGGAM_Introduction.htm)) | Gives receive rate and sustained logging rate, useful for sizing management / export paths |
| Cisco Secure Firewall / ASA | FMC dashboards, external logging stats, ASA syslog rate-limit guidance ([logging best practices](https://secure.cisco.com/secure-firewall/docs/logging-best-practices), [external logging](https://secure.cisco.com/secure-firewall/docs/external-logging-configuration)) | Good for validating whether connection logging or threat logging will swamp the downstream path |

**Why this matters**
- Firewalls and VPN concentrators are often the biggest EPS drivers.
- They are also the most bursty sources. A calm average may hide a much higher peak during business hours, internet scanning, or incident windows.
- Native device dashboards are often the **fastest route** to a credible first EPS number.

### 1.4 Network TAP / SPAN approaches

Mirror traffic from the logging network path to a capture point and count messages in the observed stream.

**Best for**
- Sources you cannot administer directly
- Appliance estates managed by another team
- Validating what is actually sent toward the collector

**Tooling**
- `tcpdump`
- `tshark`
- Packet brokers / NDR tools
- Cloud packet capture if traffic traverses virtual networks

**Strengths**
- Independent of source configuration
- Useful for proving real network-side burst behavior

**Limitations**
- Best for UDP Syslog; TCP needs stream-aware counting
- Cannot see messages filtered before they hit the mirrored link
- Cannot see encrypted or tunneled payload content without decryption
- Good for approximation, but not the first choice if a native counter already exists

### 1.5 Existing SIEM or logging-platform data

If the customer already runs a SIEM, log lake, or NDR/NPM platform, it may already know the answer.

#### Splunk

Splunk licensing is typically ingest-per-day rather than EPS, but the platform still exposes rate information through the **Monitoring Console** and `_internal` metrics. This is usually good enough to derive both steady and peak EPS.

Helpful references:
- [Monitoring Console overview](https://docs.splunk.com/Documentation/Splunk/latest/DMC/DMCoverview)
- [Splunk license types](https://docs.splunk.com/Documentation/Splunk/latest/Admin/Licensetypes)

#### QRadar

QRadar is explicitly EPS-aware because licensing and capacity are tied to event rate. The **System and License Management** views are excellent sizing sources.

Helpful references:
- [Understanding EPS average, peak, and license threshold](https://www.ibm.com/support/pages/qradar-understanding-eps-average-eps-peak-and-license-threshold)
- [Monitoring license usage](https://www.ibm.com/docs/en/qsip/7.4.0?topic=management-monitoring-license-usage)

#### Generic guidance

If the customer says, “Our current SIEM is licensed at 12,000 EPS,” that is already a strong input — but still validate:

- Is that **enterprise-wide** or **site-specific**?
- Is it **average**, **peak**, or **licensed maximum**?
- Does it include **all sources** or only the subset moving to Sentinel first?
- Does the current SIEM ingest raw logs, filtered logs, or normalized events?

### 1.6 Azure-side estimation when some data already lands in Log Analytics

If the customer is already partially ingested into Azure Monitor or Sentinel, KQL is one of the best ways to derive real numbers quickly.

**Built-in tools**
- [Analyze usage in a Log Analytics workspace](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/analyze-usage)
- Workspace **Usage** insights
- The [`Usage`](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/usage) table for billable-data analysis

**Best for**
- Pilots where some connectors are already live
- Validating actual daily GB, average bytes per event, and peak event rate
- Cost sizing as well as architecture sizing

**Strengths**
- Real production data
- Easy to break down by table (`Event`, `Syslog`, `CommonSecurityLog`) and by machine/device

**Limitations**
- Only measures the subset already ingested
- Must account for filters, DCR scope, and any missing sites or devices

### 1.7 Estimation formulas and rules of thumb

Estimation is necessary sometimes, but it should be clearly labeled as **low confidence**.

#### Core formulas

```text
Average EPS = Total events in sample / Sample seconds
Peak 1-minute EPS = Max(events in any 1-minute bucket) / 60
P95 1-minute EPS = 95th percentile of per-minute event counts / 60
Daily GB = EPS × AvgBytesPerEvent × 86400 / 1024^3
EPS from GB/day = (GB/day × 1024^3) / (AvgBytesPerEvent × 86400)
Design EPS = Peak or P95 EPS × headroom factor (typically 1.3)
```

#### Useful heuristics (for first-pass only)

These ranges are intentionally broad. They are not architecture sign-off numbers.

| Source type | Low-noise profile | Medium profile | High / bursty profile | Notes |
| --- | --- | --- | --- | --- |
| Windows member server | 0.1-2 EPS | 2-10 EPS | 10-50+ EPS | Audit policy, Sysmon, AV, and app logging dominate variance |
| Domain controller / identity server | 5-20 EPS | 20-100 EPS | 100-200+ EPS | Often the hottest Windows tier |
| Linux server | 0.1-1 EPS | 1-5 EPS | 5-20+ EPS | `auth`, `auditd`, and verbose apps matter most |
| Network switch / router | <1 EPS | 1-10 EPS | 10-50+ EPS | Depends on whether only important events or operational chatter is sent |
| Firewall / VPN / proxy | 10-100 EPS | 100-1,000 EPS | 1,000-10,000+ EPS | Connection logging and threat logging can explode rate quickly |

**Recommendation:** never let the planner hide the fact that these are broad heuristics. The UI should mark estimate-only answers with a lower confidence score and produce a follow-up action: “Run measurement script or check device dashboard before final architecture approval.”

### 1.8 Microsoft-provided sizing tools or calculators

There is **no single official Microsoft Sentinel EPS calculator** that should be treated as canonical.

What Microsoft does provide today is a set of **official sizing anchors**:

- [Azure Monitor Agent performance benchmark](https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-performance)
- [Azure Monitor Pipeline sizing](https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/pipeline-sizing)
- [WEF / EventLog forwarding performance guidance](https://learn.microsoft.com/en-us/troubleshoot/windows-server/admin-development/configure-eventlog-forwarding-performance)
- [Log Analytics usage analysis](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/analyze-usage)
- [Azure pricing calculator](https://azure.microsoft.com/pricing/calculator/) for cost modeling once daily GB is known

**Implication for the planner:**
- The planner should **not** present itself as “the Microsoft EPS calculator.”
- It should present itself as a **decision assistant** that combines measured EPS, official throughput benchmarks, and customer architecture preferences.

## 2. Decision framework — what EPS ranges map to what architecture

### 2.1 Design principles

Use these rules before applying the tables:

1. **Decide per site or collector zone, not only globally.** Ten branch offices at 500 EPS each are a different problem than one data center at 5,000 EPS.
2. **Separate Windows-heavy and Syslog/CEF-heavy designs.** Their bottlenecks are different.
3. **Design to peak or P95, not average.** Average EPS hides burst risk.
4. **Apply headroom.** A 30% buffer is a sensible starting point for planning; more for bursty firewall estates.
5. **Need for filtering, buffering, offline tolerance, or local routing can move the design to Pipeline earlier than EPS alone would.**

### 2.2 Recommended architecture bands

The following bands align with the AMA and Pipeline sizing guidance already documented in this repo, while making the decision framework easier to use in customer conversation.

| Peak site EPS (after headroom) | Recommended pattern | Load balancer | Typical starting shape | Notes |
| --- | --- | --- | --- | --- |
| **< 500 EPS** | Direct AMA on sources where possible, or **1 small dedicated forwarder** | No | 1 host, 2-4 vCPU / 8 GiB | Great for pilots, small sites, or a few appliances |
| **500-2,000 EPS** | **1 dedicated AMA forwarder** or **1 WEC** with monitoring | Usually no | 1 host, 2-4 vCPU / 8 GiB; monitor CPU, memory, disk | Single collector is usually fine, but start watching burst windows |
| **2,000-5,000 EPS** | **1 stronger dedicated forwarder** or **separate WEC tier** | Optional active/passive | 1 host, 4-8 vCPU / 8-16 GiB | Split Windows from Syslog if the source mix is mixed or bursty |
| **5,000-10,000 EPS** | **Multiple collectors**; for Syslog/CEF use **multiple forwarders behind load balancing**; for Windows use **multiple WECs** | Yes for Syslog/CEF; usually yes or explicit source sharding for WEF | 2+ hosts, each around 8 vCPU / 16 GiB | Do not treat one collector as enough in this band |
| **10,000-20,000 EPS** | **Multi-forwarder minimum**; **Azure Monitor Pipeline strongly recommended** | Yes | 2+ forwarders or Pipeline cluster | Especially true if CEF-heavy, multi-site, or filtering/buffering is required |
| **20,000+ EPS** | **Azure Monitor Pipeline preferred default** | Yes / ingress design required | Arc-enabled Kubernetes with dedicated nodes and replicas | Use non-pipeline multi-forwarder designs only as engineered exceptions |

### 2.3 Source-specific adjustments

#### Windows / WEF-heavy estates

- Treat **~5,000 EPS per collector** as the safer planning ceiling.
- Scale out sooner if:
  - domain controllers dominate the load,
  - the customer uses verbose Advanced Audit Policy / Sysmon,
  - the collector shows disk stress,
  - many subscriptions / sources converge on the same WEC.
- Separate collector pools for **domain controllers**, **member servers**, and **workstations** is often cleaner than one giant collector pool.

#### Syslog / CEF-heavy estates

- Treat **~10,000 EPS sustained per AMA forwarder** as the planning anchor, not a guaranteed hard limit.
- If the estate is **firewall-heavy, CEF-heavy, or very bursty**, behave as though you are already in the next band up.
- Above 10,000 EPS at a site, stop debating whether to scale out; scale out or move to Pipeline.

#### When Azure Monitor Pipeline becomes the right answer before the EPS limit

Recommend Pipeline early if any of the following are true:

- the customer needs **local filtering** to reduce ingestion cost,
- the customer needs **buffering / outage survival / backfill**,
- the site already has **Kubernetes / Arc** maturity,
- many devices converge on one site and **simple VM collectors are becoming operationally fragile**,
- there is **heavy CEF parsing** where local scale-out and replica control are valuable.

### 2.4 Simple planning guidance the tool can surface

The planner can safely summarize the above as:

- **<500 EPS:** single forwarder is fine.
- **500-2,000 EPS:** still single forwarder territory, but monitor it.
- **2,000-5,000 EPS:** one strong collector can work; separate Windows and Syslog if needed.
- **5,000-10,000 EPS:** multiple collectors become the default; WEF should scale out; Syslog/CEF should use load balancing or clear source sharding.
- **10,000+ EPS:** Pipeline should be actively considered, and **20,000+ EPS** should default to Pipeline unless there is a strong reason not to.

That is directionally very close to Maria's proposed bands, with two important refinements:

1. **Windows should be treated more conservatively than Linux Syslog forwarding** because the WEF/WEC path saturates earlier.
2. **CEF-heavy firewalls should also be treated more conservatively** because parsing and burstiness make “headline EPS” more dangerous.

## 3. Planner integration — how this should work in the Sentinel Onboarding Planner

### Recommended product shape

The best product pattern is:

1. **Primary UX:** a new **wizard step** called **EPS Assessment** that appears after source selection and before final architecture recommendation.
2. **Secondary UX:** a small **standalone calculator view** or modal that can be launched from the wizard and from documentation.

Why the wizard step should be primary:

- EPS directly changes architecture recommendations (direct AMA vs forwarder vs WEF tier vs Pipeline).
- It is part of planning, not an external reference task.
- The planner already asks customers about sources and priorities; EPS is the missing infrastructure-sizing input.

Why a secondary standalone calculator still helps:

- Architects may want to test “what if we onboard only Palo Alto first?” without replaying the full wizard.
- Documentation can deep-link to the calculator.

### 3.1 Recommended UX flow

#### Mode selection

Offer three modes up front:

1. **Measured** — “I have EPS or event counts already.”
2. **From existing platform** — “I can pull this from SIEM / firewall / Azure.”
3. **Estimate** — “I need help estimating.”

#### Per-site assessment cards

For each site / collector zone, ask for:

| Input | Why it matters |
| --- | --- |
| Site / zone name | Architecture is per concentration point, not only enterprise-wide |
| Source families present (Windows, Linux Syslog, firewalls, network devices, other CEF) | Source mix changes safe thresholds |
| Can AMA run directly on the source? | Decides whether forwarding is even needed |
| Average EPS and peak EPS, or total events over sample window | Core sizing input |
| Sample duration and confidence | Distinguishes 5-minute spot checks from 24-hour measurements |
| Daily GB or average bytes/event (optional) | Required for cost estimates |
| Need local filtering, buffering, or disconnected operation? | Pushes the decision toward Pipeline |
| Need WEF / WEC? | Pushes Windows-specific architecture logic |
| Need HA / no single point of failure? | Changes forwarder and LB recommendation even at modest EPS |

#### Estimate mode inputs

If the customer does not know EPS, ask for:

- number of Windows servers by role (domain controller, member server, application server),
- number of Linux servers,
- number and type of firewalls / proxies / VPN concentrators,
- current audit posture (light / medium / heavy),
- whether connection logging is enabled on firewalls,
- whether logs are already filtered or normalized elsewhere.

Then produce an **estimated EPS range** rather than a fake precise number.

### 3.2 Recommended outputs

The EPS Assessment should produce a structured result, not just a paragraph.

| Output | Why it matters |
| --- | --- |
| Recommended pattern (Direct AMA / Single Forwarder / Multi-Forwarder + LB / WEC Tier / Pipeline) | Core planner decision |
| Forwarder count and starting VM sizes | Turns EPS into deployable architecture |
| WEC collector guidance | Necessary for Windows estates |
| Load balancer recommendation | Important for 5,000+ EPS Syslog/CEF designs |
| Pipeline posture (`No`, `Evaluate`, `Recommended`, `Strongly Recommended`) | Keeps the architecture honest |
| Estimated daily GB and cost band | Helps planning and customer buy-in |
| Confidence score (`Measured`, `Observed on platform`, `Estimated`) | Prevents false precision |
| Follow-up action | Example: “Run 24h sample on top 3 domain controllers before sign-off.” |

### 3.3 Recommended planner logic

The planner should store these fields in state:

```json
{
  "eps_assessment": {
    "mode": "measured | existing-platform | estimate",
    "confidence": "high | medium | low",
    "sites": [
      {
        "name": "HQ",
        "source_mix": ["windows", "firewall", "linux-syslog"],
        "avg_eps": 1800,
        "peak_1m_eps": 4200,
        "design_eps": 5460,
        "daily_gb": 92,
        "needs_wef": true,
        "needs_filtering_or_buffering": false,
        "recommended_pattern": "multi-forwarder-plus-lb",
        "forwarder_count": 2,
        "wec_count": 2,
        "load_balancer_required": true,
        "pipeline_recommendation": "evaluate"
      }
    ]
  }
}
```

### 3.4 How interactive it should be

This feature should be **interactive**, not just static guidance.

Static guidance alone fails because:

- the right answer depends on the source mix,
- the same EPS can imply different architectures for Windows vs CEF,
- the availability of measured data changes the confidence of the recommendation,
- the planner should produce outputs the customer can act on immediately.

The planner can still show a **static reference sidebar** with threshold bands and links to measurement scripts, but the main experience should be interactive.

## 4. Scripts and tools we could provide

The planner or docs package should ship with a small “measurement kit”. It does not need to be fancy to be useful.

### 4.1 PowerShell — measure Windows EPS over a sample period

This is the most useful starter script for Windows hosts or WEC collectors.

```powershell
param(
    [int]$SampleSeconds = 300,
    [string[]]$Logs = @(
        'Security',
        'System',
        'Application',
        'Microsoft-Windows-Sysmon/Operational'
    )
)

$startTime = (Get-Date).AddSeconds(-$SampleSeconds)

$rows = foreach ($log in $Logs) {
    try {
        $count = (Get-WinEvent -FilterHashtable @{ LogName = $log; StartTime = $startTime } -ErrorAction Stop | Measure-Object).Count
        [pscustomobject]@{
            LogName       = $log
            SampleSeconds = $SampleSeconds
            Events        = $count
            EPS           = [math]::Round($count / [double]$SampleSeconds, 2)
        }
    }
    catch {
        [pscustomobject]@{
            LogName       = $log
            SampleSeconds = $SampleSeconds
            Events        = 0
            EPS           = 0
            Error         = $_.Exception.Message
        }
    }
}

$rows | Sort-Object EPS -Descending

$total = ($rows | Measure-Object -Property Events -Sum).Sum
[pscustomobject]@{
    LogName       = 'TOTAL'
    SampleSeconds = $SampleSeconds
    Events        = $total
    EPS           = [math]::Round($total / [double]$SampleSeconds, 2)
}
```

**Suggested usage**
- Run it on the host or WEC collector every 5 minutes via Task Scheduler for 24 hours.
- Store results in CSV and calculate **average EPS**, **P95**, and **peak**.
- Swap `Security` / `Sysmon` / `ForwardedEvents` depending on the use case.

### 4.2 Bash — measure Syslog EPS with `syslog-ng`

For `syslog-ng` collectors, this is a strong lightweight option because it uses native counters.

```bash
#!/usr/bin/env bash
set -euo pipefail

SAMPLE_SECONDS=${1:-300}

if ! command -v syslog-ng-ctl >/dev/null 2>&1; then
  echo "syslog-ng-ctl not found. Use rsyslog impstats or another method."
  exit 1
fi

sudo syslog-ng-ctl stats --reset >/dev/null
sleep "$SAMPLE_SECONDS"

sudo syslog-ng-ctl stats \
  | awk -F';' -v s="$SAMPLE_SECONDS" '/;processed;[0-9]+$/ {sum += $NF} END {printf("events=%d\neps=%.2f\n", sum, sum / s)}'
```

**Notes**
- This is a sketch, not a productized script.
- For multi-source collectors, parse by source or destination name as needed.

### 4.3 `rsyslog` measurement pattern with `impstats`

For `rsyslog`, the best pattern is:

1. Enable [`impstats`](https://www.rsyslog.com/doc/configuration/modules/impstats.html).
2. Emit counters every **60 seconds**.
3. Parse processed/submitted counters and queue depth.

**Sketch configuration approach**
- emit `impstats` every 60 seconds,
- reset counters after each interval,
- send output to a local file or dedicated syslog target,
- calculate `processed / 60` for EPS.

This is more robust than counting packets, and it also tells you whether the collector is beginning to queue or drop data.

### 4.4 KQL — derive EPS from partial Azure ingestion

If the customer already has a pilot in Sentinel or Azure Monitor, use KQL.

#### Query A — average, peak, and P95 EPS by table

```kusto
let sample = 24h;
let events = union isfuzzy=true
    (Event | project TimeGenerated, SourceType = "Windows Event"),
    (Syslog | project TimeGenerated, SourceType = "Syslog"),
    (CommonSecurityLog | project TimeGenerated, SourceType = "CEF / CommonSecurityLog");
events
| where TimeGenerated > ago(sample)
| summarize EventsPerMinute = count() by SourceType, bin(TimeGenerated, 1m)
| summarize
    TotalEvents = sum(EventsPerMinute),
    AvgEPS = round(sum(EventsPerMinute) / 86400.0, 2),
    Peak1mEPS = round(max(EventsPerMinute) / 60.0, 2),
    P95_1m_EPS = round(percentile(EventsPerMinute, 95) / 60.0, 2)
  by SourceType
| order by Peak1mEPS desc
```

#### Query B — estimate daily GB and average bytes per event

```kusto
union isfuzzy=true
    (Event | project TimeGenerated, SourceType = "Windows Event", _BilledSize),
    (Syslog | project TimeGenerated, SourceType = "Syslog", _BilledSize),
    (CommonSecurityLog | project TimeGenerated, SourceType = "CEF / CommonSecurityLog", _BilledSize)
| where TimeGenerated > ago(24h)
| summarize
    Events = count(),
    DataGB = round(sum(_BilledSize) / 1024.0 / 1024.0 / 1024.0, 2),
    AvgBytesPerEvent = round(sum(_BilledSize) * 1.0 / count(), 1)
  by SourceType
| order by DataGB desc
```

### 4.5 Firewall / appliance quick-check instructions

The planner should be able to print simple instructions such as:

| Source | Quick check |
| --- | --- |
| Palo Alto | Run `debug log-receiver statistics` on the firewall or Panorama; record incoming/written log rate during peak hour |
| FortiGate | Add the **Log Rate** widget to the dashboard and capture peak logs/sec during busy hour |
| Check Point | Run `cpstat mg -f log_server` and record current / peak log receive rate |
| Cisco | Use FMC or ASA logging views to record event rate during representative traffic windows |

This is exactly the kind of practical instruction that helps an architect collect a usable number in one meeting.

## 5. Recommended top approach for the planner

The planner should adopt a **triangulated, measured-first EPS Assessment**.

### Top recommendation

1. **Ask first for an existing measured source**:
   - SIEM / log platform
   - firewall dashboard
   - partial Azure ingestion
2. **If none exists, offer the right measurement script per source family**:
   - PowerShell for Windows / WEC
   - `syslog-ng` / `rsyslog` counter approach for Linux collectors
   - vendor quick-check instructions for firewalls
3. **Only then fall back to estimation mode**, and visibly mark it as lower confidence.

### Why this is the right planner strategy

- It aligns with how real customer environments vary.
- It avoids false precision from one-size-fits-all formulas.
- It gives architects practical next steps, not just a threshold table.
- It integrates cleanly with the planner's job: turning source selection into architecture and effort planning.

### The one thing the planner must not do

It must **not** ask only “How many EPS do you have?” and accept a single unqualified number.

It should ask:

- Is that **measured** or **estimated**?
- Is that **site-level** or **global**?
- Is that **average** or **peak**?
- Is the source mix **Windows**, **Syslog**, **CEF**, or mixed?
- Do you need **filtering / buffering / WEF**?

That is the difference between a calculator and an architecture assistant.

## 6. Final recommendations

1. Add **EPS Assessment** as a planner wizard step.
2. Support **Measured / Existing Platform / Estimate** modes.
3. Store both **average EPS** and **peak EPS**, plus a **confidence score**.
4. Use source-specific thresholds:
   - **Windows / WEF:** start scaling out at **~5,000 EPS per collector**.
   - **Linux AMA forwarder:** treat **~10,000 EPS sustained** as the design anchor.
   - **Pipeline:** strongly recommend at **10,000+ site EPS**, and prefer by default at **20,000+** or earlier if filtering/buffering is needed.
5. Ship a small **measurement kit**: PowerShell, Syslog bash, KQL, and firewall quick-check instructions.
6. Present results in human terms:
   - recommended pattern,
   - forwarder count,
   - WEC count,
   - load balancer yes/no,
   - pipeline recommendation,
   - daily GB / cost band,
   - follow-up validation action.

## Further reading

- [Azure Monitor Agent performance benchmark](https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-performance)
- [Azure Monitor Pipeline sizing](https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/pipeline-sizing)
- [Analyze usage in a Log Analytics workspace](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/analyze-usage)
- [Get-WinEvent documentation](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent?view=powershell-7.5)
- [wevtutil documentation](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/wevtutil)
- [WEF collector performance guidance](https://learn.microsoft.com/en-us/troubleshoot/windows-server/admin-development/configure-eventlog-forwarding-performance)
- [Windows Event Forwarding for intrusion detection](https://learn.microsoft.com/en-us/windows/security/operating-system-security/device-management/use-windows-event-forwarding-to-assist-in-intrusion-detection)
- [rsyslog impstats](https://www.rsyslog.com/doc/configuration/modules/impstats.html)
- [syslog-ng-ctl man page](https://man7.org/linux/man-pages/man1/syslog-ng-ctl.1.html)
- [AMA setup guide](../connectors/ama-setup-guide.md)
- [Syslog forwarding guide](../connectors/syslog-forwarding-guide.md)
- [Azure Monitor Pipeline guide](../connectors/azure-monitor-pipeline-guide.md)
