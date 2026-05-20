# Syslog and CEF Forwarding Guide with Azure Monitor Agent

## Quick Reference

| Item | Guidance |
| --- | --- |
| Best for | Firewalls, network devices, appliances, and Linux hosts that need Syslog or CEF data forwarded into Sentinel |
| Permissions needed | VM Contributor or Azure Connected Machine Resource Administrator for the Linux collector; Monitoring Contributor for the DCR; OS-level sudo or root on the Linux collector; firewall or network changes for port 514 |
| Core components | Linux collector VM or Arc-enabled server, AMA, Syslog daemon (`rsyslog` or `syslog-ng`), DCR, Log Analytics workspace |
| Estimated setup time | 4-8 hours for a first forwarder; longer if firewall changes or device-specific parsing is required |
| Difficulty | Hard |
| Default ports | Source devices typically send Syslog over TCP or UDP 514; AMA receives forwarded logs locally on `127.0.0.1:28330` after the daemon hands them off |
| Output table | `Syslog` for Linux Syslog DCRs; CEF can later feed `CommonSecurityLog` depending on downstream parsing or connector design |
| Read this with | [AMA setup guide](./ama-setup-guide.md) for the base platform and [Azure Monitor Pipeline guide](./azure-monitor-pipeline-guide.md) for large-scale or transformation-heavy cases |

## When to Use This

Use this guide when the source device cannot run AMA itself or when you want one Linux host to receive logs from multiple devices and pass them to Microsoft Sentinel.

### Decision Tree

1. **Is the source a Linux server you control and can install AMA on directly?**
   - **Yes** -> Direct AMA on the source is usually simpler.
   - **No** -> Use a dedicated Linux forwarder VM or Arc-enabled server.
2. **Are many devices, sites, or high-volume feeds converging on one collector?**
   - **Yes** -> Consider whether [Azure Monitor Pipeline](./azure-monitor-pipeline-guide.md) is a better long-term pattern.
   - **No** -> AMA on a dedicated forwarder is typically the fastest path.
3. **Do you need buffering, transformations, or scale far beyond one Linux collector?**
   - **Yes** -> Prefer Azure Monitor Pipeline.
   - **No** -> AMA plus a dedicated forwarder is still the standard pattern.

## Architecture Options

### Option A: Direct AMA on the source host

Use this when the source is a supported Linux server that you own.

```text
Linux source host
   |
   v
AMA on the same host
   |
   v
DCR -> Log Analytics workspace -> Microsoft Sentinel
```

### Option B: Dedicated forwarder VM or Arc-enabled server

Use this when the source is an appliance, network device, or vendor-managed platform that cannot run AMA.

```text
Firewall / appliance / network device
               |
               v
Dedicated Linux forwarder (rsyslog or syslog-ng + AMA)
               |
               v
DCR -> Log Analytics workspace -> Microsoft Sentinel
```

### Which option should you choose?

| Situation | Recommended pattern |
| --- | --- |
| Supported Linux host you control | Direct AMA on the source |
| Firewall, switch, appliance, or SaaS relay | Dedicated forwarder |
| One collector shared by many noisy sources | Dedicated forwarder with careful sizing |
| Need centralized filtering, local buffering, or scale-out across thousands of sources | Azure Monitor Pipeline |

## Linux Collector Requirements

- Azure VM or Azure Arc-enabled Linux server.
- Linux operating system supported by Azure Monitor Agent.
- Network path from sources to the collector on **TCP or UDP 514** as required.
- Local administrative access to update `rsyslog` or `syslog-ng`.
- Enough CPU, memory, and disk to handle bursts.
- Prefer a **dedicated collector** for reliability.

### Practical host sizing

| Expected load | Starting guidance |
| --- | --- |
| Small pilot or few devices | 2-4 vCPU, 8 GiB RAM |
| Shared forwarder or steady production | 4-8 vCPU, 8-16 GiB RAM |
| High sustained volume | Scale out to multiple collectors or evaluate Azure Monitor Pipeline |

For gateway-style forwarding, use the AMA benchmark in the [AMA setup guide](./ama-setup-guide.md) as the reference point: Linux forwarders are best planned around **10,000 EPS sustained** on dedicated infrastructure.

## Step-by-Step Setup

### 1) Build the Linux collector

1. Deploy the Azure VM or Arc-enabled Linux server.
2. Install Azure Monitor Agent.
3. Confirm the collector is reporting with a `Heartbeat` event before configuring source devices.

```kusto
Heartbeat
| where Computer == "<collector-name>"
| take 10
```

### 2) Create the DCR for Linux Syslog

In Azure Monitor:

1. Go to **Monitor** -> **Data Collection Rules** -> **Create**.
2. Add the Linux collector resource.
3. On **Collect and deliver**, choose **Linux Syslog**.
4. Select the facilities you need and define the **minimum log level** for each facility.
5. Add an **Azure Monitor Logs** destination and select the Log Analytics workspace that Sentinel uses.

Important DCR details:
- Syslog data is delivered to the `Syslog` table.
- Syslog data can only be sent to a Log Analytics workspace. Multiple workspace destinations create **duplicate ingestion cost**.
- A DCR can include up to **10 data sources**. A VM can use multiple DCRs, but overlapping Syslog sources create duplication.
- Severity is hierarchical. If you set a facility to `Warning`, you also collect `Error`, `Critical`, `Alert`, and `Emergency`.

### 3) Open inbound port 514 on the collector

If the collector is an Azure VM, add an inbound rule for the protocol you need.

| Setting | Value |
| --- | --- |
| Destination port | 514 |
| Protocol | TCP or UDP |
| Action | Allow |
| Example rule name | `AllowSyslogInbound` |

If `firewalld` is active on the Linux collector, allow the listener there too:

```bash
sudo firewall-cmd --zone=public --add-port=514/tcp --permanent
sudo firewall-cmd --zone=public --add-port=514/udp --permanent
sudo systemctl restart firewalld.service
```

### 4) Configure the Linux Syslog daemon on the collector

Microsoft publishes a helper script that can configure either `rsyslog` or `syslog-ng`:

```bash
sudo wget -O Forwarder_AMA_installer.py https://raw.githubusercontent.com/Azure/Azure-Sentinel/master/DataConnectors/Syslog/Forwarder_AMA_installer.py && sudo python3 Forwarder_AMA_installer.py
```

If you need manual configuration, use the following examples as starting templates.

#### `rsyslog` listener example on the collector

```conf
module(load="imudp")
input(type="imudp" port="514")
module(load="imtcp")
input(type="imtcp" port="514")
```

#### `syslog-ng` listener example on the collector

```conf
source s_net_tcp { network(ip("0.0.0.0") port(514) transport("tcp")); };
source s_net_udp { network(ip("0.0.0.0") port(514) transport("udp")); };
```

> Avoid unnecessary local file writes for forwarded logs. Microsoft explicitly warns that full-disk conditions can break AMA on Linux collectors.

### 5) Understand the AMA handoff for `rsyslog` vs `syslog-ng`

When Syslog is enabled in a DCR, AMA drops in daemon-specific configuration and restarts the daemon automatically.

| Daemon | AMA-installed path | Key behavior |
| --- | --- | --- |
| `rsyslog` | `/etc/opt/microsoft/azuremonitoragent/syslog/rsyslogconf/` -> installed into `/etc/rsyslog.d/10-azuremonitoragent-omfwd.conf` | Uses `omfwd` to forward logs to `127.0.0.1:28330` over TCP |
| `syslog-ng` | `/etc/opt/microsoft/azuremonitoragent/syslog/syslog-ngconf/azuremonitoragent-tcp.conf` -> installed into `/etc/syslog-ng/conf.d/azuremonitoragent-tcp.conf` | Uses a local network destination to `127.0.0.1:28330` with `log-fifo-size(25000)` |

**Published `rsyslog` forwarding pattern**

```conf
template(name="AMA_RSYSLOG_TraditionalForwardFormat" type="string" string="<%PRI%>%TIMESTAMP% %HOSTNAME% %syslogtag%%msg:::sp-if-no-1st-sp%%msg%")
*.* action(type="omfwd"
  template="AMA_RSYSLOG_TraditionalForwardFormat"
  queue.type="LinkedList"
  queue.filename="omfwd-azuremonitoragent"
  queue.maxFileSize="32m"
  queue.maxDiskSpace="1g"
  action.resumeRetryCount="-1"
  action.resumeInterval="5"
  action.reportSuspension="on"
  action.reportSuspensionContinuation="on"
  queue.size="25000"
  queue.workerThreads="100"
  queue.dequeueBatchSize="2048"
  queue.saveonshutdown="on"
  target="127.0.0.1" Port="28330" Protocol="tcp")
```

**Published `syslog-ng` forwarding pattern**

```conf
destination d_azure_mdsd {
  network("127.0.0.1"
    port(28330)
    log-fifo-size(25000));
};

log {
  source(s_src);
  destination(d_azure_mdsd);
  flags(flow-control);
};
```

Daemon-specific notes:
- On `rsyslog`, AMA forwards only from the **default ruleset**. Inputs bound to nondefault rulesets are not forwarded unless you redesign the rules.
- On older Red Hat Enterprise Linux 5 or Oracle Linux systems, the legacy `sysklog` daemon is **not supported**. Install and use `rsyslog` instead.
- When SELinux requires Unix sockets, AMA can use a socket-based configuration instead of TCP loopback.

### 6) Configure the sending side

#### `rsyslog` sender example

```conf
*.* action(
  type="omfwd"
  target="syslog-forwarder.contoso.local"
  port="514"
  protocol="tcp"
  action.resumeRetryCount="-1"
  queue.type="linkedList"
  queue.size="10000"
)
```

#### `syslog-ng` sender example

```conf
destination d_ama {
  network("syslog-forwarder.contoso.local" port(514) transport("tcp"));
};

log {
  source(s_src);
  destination(d_ama);
};
```

For CEF-producing sources, keep the same transport pattern and validate the downstream Sentinel connector or parser expected for that vendor.

## Validation Steps

### Basic network checks

Verify the collector is listening:

```bash
sudo ss -lunpt | grep 514
```

Generate a test event from a Linux sender:

```bash
logger -p authpriv.notice "AMA syslog forwarding test"
```

### Validate the collector is receiving logs

```kusto
Syslog
| where TimeGenerated > ago(15m)
| summarize Count=count() by Computer, HostName, Facility, SeverityLevel
| order by Count desc
```

### Validate host names seen by Sentinel

```kusto
Syslog
| where Computer == "<collector-name>"
| summarize by HostName
```

### What success looks like

- The collector shows regular `Heartbeat` records.
- New `Syslog` events arrive after the test.
- `HostName` values reflect the originating devices you expect.
- Volume and severity match the DCR settings.
- `TimeGenerated` and `EventTime` are understood and documented for the team.

> Microsoft notes that **TimeGenerated** is when the collector processed the record in UTC, while **EventTime** comes from the Syslog header and is converted using the collector's local time zone. These fields can differ when source devices and collectors live in different time zones.

## Cost Considerations

| Cost driver | Why it matters |
| --- | --- |
| Multiple workspaces in one DCR | Syslog is duplicated to each workspace |
| Overly broad facilities or severities | Low-value operational noise can dominate ingestion cost |
| Local file retention on the collector | Disk growth can create operational incidents and extra storage cost |
| Too many appliances on one VM | Overload can force emergency scale-out later |
| CEF over Syslog without parser planning | You may pay to ingest data that never lands in the table you expected |

## Common Pitfalls

- Forgetting to open both the Azure NSG path and the host firewall path for port 514.
- Leaving the collector writing forwarded logs locally until the disk fills and AMA stops working.
- Assuming every `rsyslog` input is forwarded when the daemon uses multiple rulesets.
- Sending to multiple workspaces in the same DCR and creating duplicate cost.
- Ignoring time zone differences between `TimeGenerated` and `EventTime` during investigations.
- Treating a single collector as infinitely scalable instead of using the 10,000 EPS benchmark as a design guardrail.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| No data in `Syslog` | Port 514 blocked or daemon not listening | Check NSG, local firewall, and `rsyslog` or `syslog-ng` listener state |
| Collector heartbeat present but no device logs | Source device still points elsewhere or wrong protocol | Verify sender target, protocol, and port |
| Some expected events missing | DCR facility or severity too restrictive | Review minimum log levels and facility mapping |
| Disk usage grows fast | Collector is storing forwarded logs locally | Reduce redundant local writes and rotate any required logs aggressively |
| Collector CPU spikes | Too many devices on one VM | Split sources across multiple collectors or move toward [Azure Monitor Pipeline](./azure-monitor-pipeline-guide.md) |
| CEF arrives but parser output is inconsistent | Vendor format or parser expectation mismatch | Validate the vendor-specific Sentinel connector guidance and sample raw Syslog payloads |
| Timestamps look wrong | Collector and device are in different time zones | Compare `TimeGenerated` and `EventTime` and document the offset |

## Further Reading

- [Tutorial: Forward Syslog data with Microsoft Sentinel by using Azure Monitor Agent](https://learn.microsoft.com/en-us/azure/sentinel/forward-syslog-monitor-agent)
- [Collect Syslog events with Azure Monitor Agent](https://learn.microsoft.com/en-us/azure/azure-monitor/agents/data-collection-syslog)
- [AMA setup guide](./ama-setup-guide.md)
- [Azure Monitor Pipeline guide](./azure-monitor-pipeline-guide.md)

