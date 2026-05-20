# Azure Monitor Pipeline Guide for Microsoft Sentinel

## Quick Reference

| Item | Guidance |
| --- | --- |
| Best for | High-volume hybrid or multicloud telemetry, transformation-heavy ingestion, unreliable connectivity, and sources that cannot run AMA |
| Permissions needed | Azure deployment rights, Monitoring Contributor for workspace integration, Arc-enabled Kubernetes onboarding rights, and cluster administration for the Kubernetes environment |
| Core components | Arc-enabled Kubernetes cluster, Azure Monitor Pipeline, optional gateway, optional persistent storage, Log Analytics workspace, Microsoft Sentinel |
| Estimated setup time | 1-3 days for design and proof of concept; longer for production Kubernetes rollout |
| Difficulty | Advanced |
| Supported inputs | Syslog including CEF over Syslog (**GA**) and OpenTelemetry logs / OTLP (**Preview**) |
| Default receiver ports | Syslog TCP or UDP 514, OTLP TCP 4317 |
| Read this with | [AMA setup guide](./ama-setup-guide.md) and [Syslog / CEF forwarding guide](./syslog-forwarding-guide.md) |

## What the Pipeline Is

Azure Monitor Pipeline is a **containerized, centrally managed ingestion layer** that runs on an **Arc-enabled Kubernetes cluster** close to your data sources. It receives telemetry over standard protocols, processes that telemetry locally, and then sends the result to Azure Monitor and the Log Analytics workspace used by Microsoft Sentinel.

It is most relevant when direct-to-cloud collection is too expensive, too noisy, too fragile, or too operationally distributed.

## When to Use This

### Decision Tree

1. **Can the source run AMA and send directly to Azure with acceptable cost and reliability?**
   - **Yes** -> Stay with direct AMA unless you need central processing.
   - **No** -> Pipeline becomes relevant.
2. **Do you need local filtering, aggregation, or routing before cloud ingestion?**
   - **Yes** -> Pipeline is a strong fit.
3. **Do you need data to survive connectivity loss and backfill later?**
   - **Yes** -> Pipeline with persistent storage is a strong fit.
4. **Do you have thousands of devices or a site that concentrates more telemetry than a single forwarder should carry?**
   - **Yes** -> Prefer Pipeline over stretching a single AMA forwarder design.

### Practical customer thresholds

These thresholds are planning guidance, not service limits.

| Customer profile | Typical recommendation |
| --- | --- |
| Small deployment: low-to-moderate volume, direct Azure connectivity, minimal filtering need | Direct AMA ingestion |
| Medium deployment: several remote sites, 2,000-10,000 EPS at a site, or clear need to cut noise before ingestion | Evaluate Pipeline during design |
| Large deployment: sustained site-level volume above a single AMA forwarder design point, thousands of sources, or disconnected operations | Pipeline is usually worth the added platform complexity |

A helpful planning anchor is the AMA forwarding benchmark: once a design starts depending on a single collector near the **10,000 EPS sustained** range, Pipeline should be considered for scale-out, local processing, and resiliency.

## Architecture Overview

```text
Devices / apps / forwarders / OTLP clients
                   |
                   v
        Azure Monitor Pipeline on Arc-enabled Kubernetes
                   |
         +---------+---------+
         | filter / transform |
         | aggregate / route  |
         | buffer locally     |
         +---------+---------+
                   |
                   v
        Log Analytics workspace -> Microsoft Sentinel
```

### Where Pipeline fits

| Layer | Role |
| --- | --- |
| Data sources | Syslog, CEF over Syslog, and OTLP senders |
| Pipeline | Local ingestion, filtering, transformation, aggregation, routing, optional persistence |
| Optional gateway | Exposes Pipeline receivers to clients outside the cluster |
| Workspace | Central Azure Monitor or Sentinel storage and analytics |
| Sentinel | Uses the workspace for detections, hunting, and incident workflows |

## Why Customers Choose Pipeline

| Need | How Pipeline helps |
| --- | --- |
| Ingestion cost pressure | Drops or aggregates low-value telemetry before it reaches Azure |
| High telemetry volume | Processes data locally at scale and can scale horizontally across replicas |
| Intermittent connectivity | Uses persistent storage so telemetry can survive outages and backfill later |
| Data shaping requirements | Filters and reshapes telemetry before it lands in the workspace |
| Non-agent sources | Accepts data from devices and clients that cannot host AMA |

## Supported Inputs and Platform Constraints

### Supported inputs from Microsoft Learn

| Data source | Details | Status |
| --- | --- | --- |
| Syslog | RFC 3164 and RFC 5424 over TCP and UDP; CEF is supported as Syslog data through the same receiver | Generally available |
| OpenTelemetry logs (OTLP) | OTLP log ingestion from clients into Azure Monitor | Preview |

### Platform reality

- Pipeline runs on **Arc-enabled Kubernetes**.
- Azure provides the management plane and Azure Monitor integration, but the customer operates the Kubernetes environment.
- External clients usually connect over **TCP or UDP 514** for Syslog or **TCP 4317** for OTLP.
- An optional gateway can expose the receivers to clients outside the cluster.
- TLS and optional mutual TLS (mTLS) are supported for secure ingestion.
- Support depends on both the Azure region and the Kubernetes distribution supported for the required `cert-manager` extension.

Supported Kubernetes distributions listed in Microsoft Learn include:
- VMware Tanzu Kubernetes Grid multicloud (TKGm)
- SUSE Rancher K3s
- AKS Arc

## Performance and Sizing

Pipeline sizing is dramatically different from AMA sizing. For high-volume Syslog and CEF ingestion, Microsoft publishes end-to-end throughput results into Log Analytics for a single replica.

### Measured throughput by node size

| vCPU | Example node | Syslog Basic | Syslog Fully Formed | CEF Fully Formed |
| --- | --- | --- | --- | --- |
| 2 | `Standard_D2as_v6` | ~50,000/sec | ~35,000/sec | ~17,000/sec |
| 4 | `Standard_D4as_v6` | ~100,000/sec | ~70,000/sec | ~35,000/sec |
| 8 | `Standard_D8as_v6` | ~200,000/sec | ~150,000/sec | ~65,000/sec |
| 16 | `Standard_D16as_v6` | ~400,000/sec | ~300,000/sec | ~130,000/sec |

### Per-vCPU planning baselines

| Pipeline type | Per-vCPU throughput | Per-vCPU memory at saturation |
| --- | --- | --- |
| Syslog Basic | ~25,000 logs/sec | ~330 MB |
| Syslog Fully Formed | ~18,000 logs/sec | ~350 MB |
| CEF Fully Formed | ~8,000 logs/sec | ~300 MB |

Planning notes:
- A single 8-core replica can sustain roughly **200,000 basic Syslog events/sec**, **150,000 fully formed Syslog events/sec**, or **65,000 CEF events/sec**.
- Idle memory is about **150 MB** per replica. An 8-core Syslog Basic replica needs roughly **2.8 GB** of working-set memory at saturation.
- Throughput scales linearly with replicas when each replica has a dedicated node.
- When overloaded, Pipeline applies **TCP backpressure** to senders instead of silently dropping data.
- Ensure senders open at least as many concurrent TCP connections as the node has CPU cores so traffic is distributed evenly.

## Configuration Steps

### 1) Prepare prerequisites

Before you build the Pipeline instance, confirm:
- Azure resource providers `Microsoft.Insights` and `Microsoft.Monitor` are registered.
- You have an Arc-enabled Kubernetes cluster with an external IP.
- **Custom locations** are enabled on that cluster.
- A Log Analytics workspace exists for the target Sentinel deployment.
- If you want a custom table instead of `Syslog` or `CommonSecurityLog`, create it first.

### 2) Install the Azure `cert-manager` extension

Microsoft's setup flow requires the Azure-managed `cert-manager` extension on the Arc-enabled Kubernetes cluster.

**Connect the cluster to Azure Arc if needed**

```bash
az connectedk8s connect --name ${CLUSTER_NAME} --resource-group ${RESOURCE_GROUP} --location ${LOCATION}
```

**Install the extension**

```bash
az k8s-extension create \
  --resource-group ${RESOURCE_GROUP} \
  --cluster-name ${CLUSTER_NAME} \
  --cluster-type connectedClusters \
  --name "azure-cert-management" \
  --extension-type "microsoft.certmanagement" \
  --release-train stable \
  --config subcharts.zdtrcontroller.enabled=true
```

If you already have open-source `cert-manager` or `trust-manager` installed, remove those versions before installing the Azure extension.

### 3) Choose deployment method

| Method | Best when | Notes |
| --- | --- | --- |
| Azure portal | First deployment, quick proof of concept, guided validation | Easiest place to start |
| CLI or ARM templates | Automation, custom requirements, persistent volume buffering, custom tables | Better for repeatable enterprise deployment |

After deployment, add optional features only when needed:
- **Gateway** if clients are outside the cluster
- **TLS or mTLS** if encrypted ingestion is required
- **Transformations** if you need local filtering, aggregation, or reshaping
- **Pod placement** if you need isolation or predictable performance on specific nodes

### 4) Connect senders

- Send Syslog or CEF sources to the Pipeline receiver on **TCP or UDP 514** by default.
- Send OTLP log sources to **TCP 4317**.
- If the sources sit outside the cluster, connect them to the gateway IP and port you exposed.

### 5) Verify the deployment

In the Azure portal, open the Arc-enabled Kubernetes cluster and verify the following services exist:
- `<pipeline-name>-external-service`
- `<pipeline-name>-service`

The Pipeline also emits a `Heartbeat` record every minute to the first configured workspace.

```kusto
Heartbeat
| where OSMajorVersion == "<pipeline-name>"
| take 20
```

## Cost Considerations

| Cost driver | What it means for customers |
| --- | --- |
| Cloud ingestion volume | Filtering and aggregation before export is the main reason Pipeline reduces cost |
| Cluster infrastructure | You trade some Azure Monitor ingestion cost for Kubernetes node, storage, and operational cost |
| Durable buffering | Persistent volumes improve resilience but add storage and I/O cost |
| Parsing intensity | CEF Fully Formed needs more CPU per event than basic Syslog |
| Gateway and TLS | Extra components and encryption overhead can require more infrastructure |

## Validation Steps

Use this checklist before you declare the design production-ready.

1. **Pipeline services exist** in the Arc-enabled cluster.
2. **Heartbeat records arrive** in the target workspace every minute.
3. **Receiver connectivity works** from each source network on the intended ports.
4. **Filtered or transformed output matches expectations** in the destination table.
5. **Node CPU and memory headroom** remain healthy at peak load.
6. **Backpressure behavior is understood** by the sending teams.

## Common Pitfalls

- Treating Pipeline as a drop-in replacement for AMA without budgeting for Kubernetes operations.
- Forgetting to install the Azure `cert-manager` extension before deploying the Pipeline.
- Putting multiple replicas on one node and losing the linear scaling benefit.
- Under-connecting senders so only part of the node's CPU is actually used.
- Assuming OTLP is GA when it is still in Preview.
- Skipping persistent storage in environments that actually need outage survival and backfill.

## Troubleshooting

| Symptom | Likely cause | What to check |
| --- | --- | --- |
| Operator pod in `CrashLoopBackOff` | Azure `cert-manager` extension missing | Install the extension and confirm it shows `Succeeded` |
| Sources cannot reach the receiver | Gateway or port exposure incomplete | Verify gateway configuration, external IP, firewall rules, and source target settings |
| Heartbeat missing | Pipeline deployment incomplete or workspace wiring wrong | Check cluster services, workspace configuration, and pipeline instance name |
| Throughput lower than planned | Too few TCP connections, shared nodes, or transformations adding cost | Increase source connections, dedicate nodes, and review transformation complexity |
| Delivery slows under load | Pipeline is backpressuring senders | Scale up or out instead of assuming silent loss |
| Private link path fails | DNS or routing for the private endpoint is incomplete | Validate DNS from inside pods and private endpoint network routing |

**Verify the `cert-manager` extension state**

```bash
az k8s-extension list --cluster-name <cluster-name> --resource-group <resource-group> --cluster-type connectedClusters --query "[?extensionType=='microsoft.certmanagement'].{Name:name, State:provisioningState}" -o table
```

## Further Reading

- [What is Azure Monitor Pipeline?](https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/pipeline-overview)
- [Configure Azure Monitor Pipeline](https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/pipeline-configure)
- [Size Azure Monitor Pipeline](https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/pipeline-sizing)
- [AMA setup guide](./ama-setup-guide.md)
- [Syslog / CEF forwarding guide](./syslog-forwarding-guide.md)

