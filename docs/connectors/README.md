# Connector Guides for Microsoft Sentinel

## Quick Reference

| Item | Guidance |
| --- | --- |
| Best for | IT admins and SOC engineers deciding which connector setup guide to follow |
| What this page does | Helps you choose the right guide, then jump straight into the detailed instructions |
| Estimated reading time | 5-10 minutes for selection; then use the linked guide for implementation |
| Difficulty | Easy to choose; implementation difficulty depends on the selected pattern |
| Start here if | You know the data source but are unsure whether to use direct AMA, WEF/WEC, a Linux forwarder, or Azure Monitor Pipeline |

## When to Use This

Use this page first when planning Microsoft Sentinel connector onboarding. It helps you choose the right implementation path before you start deploying agents, forwarders, or Kubernetes infrastructure.

### Decision Tree

1. **Do you need native Windows Security or event-log collection from many on-premises Windows servers without AMA on every source?**
   - **Yes** -> Use the [Windows Event Forwarding guide](./windows-event-forwarding-guide.md).
   - **No** -> Continue.
2. **Can the source run Azure Monitor Agent directly?**
   - **Yes** -> Start with the [AMA setup guide](./ama-setup-guide.md).
   - **No** -> Continue.
3. **Is the source sending Syslog or CEF to a Linux collector?**
   - **Yes** -> Use the [Syslog and CEF forwarding guide](./syslog-forwarding-guide.md).
   - **No** -> Continue.
4. **Do you need filtering, buffering, transformations, or large-scale centralized ingestion close to the source?**
   - **Yes** -> Use the [Azure Monitor Pipeline guide](./azure-monitor-pipeline-guide.md).
   - **No** -> Re-evaluate whether a simpler AMA, WEF/WEC, or Linux forwarder design is enough.

## Guide Directory

| Guide | One-line description |
| --- | --- |
| [AMA setup guide](./ama-setup-guide.md) | Deploy Azure Monitor Agent, create DCRs, size collectors, and validate direct or forwarder-based collection. |
| [Windows Event Forwarding guide](./windows-event-forwarding-guide.md) | Centralize Windows Security and event-log collection on one or more WEC servers, then use AMA on the collector to send `WindowsEvent` data to Sentinel. |
| [Syslog and CEF forwarding guide](./syslog-forwarding-guide.md) | Configure a Linux collector with `rsyslog` or `syslog-ng`, open the right ports, and forward appliance or network-device logs into Sentinel. |
| [Azure Monitor Pipeline guide](./azure-monitor-pipeline-guide.md) | Design and validate an Arc-enabled Kubernetes ingestion layer for high-volume, transformation-heavy, or disconnected environments. |

## Which Guide Do I Need?

| Scenario | Recommended guide | Why |
| --- | --- | --- |
| Azure VM, Arc server, or Linux host that can run AMA directly | [AMA setup guide](./ama-setup-guide.md) | Lowest operational overhead and the default Microsoft pattern |
| Many on-premises Windows servers or domain controllers need centralized Security/event-log collection | [Windows Event Forwarding guide](./windows-event-forwarding-guide.md) | Uses one or more WEC servers so you do not need AMA on every Windows source |
| Existing WEF deployment needs Microsoft Sentinel integration | [Windows Event Forwarding guide](./windows-event-forwarding-guide.md) | Adds AMA and DCR guidance for the WEC tier and `WindowsEvent` ingestion |
| Firewall, switch, appliance, or vendor-managed source that sends Syslog or CEF | [Syslog and CEF forwarding guide](./syslog-forwarding-guide.md) | Uses a dedicated Linux collector when the source cannot host AMA |
| Centralized ingestion for many remote sites or very high-volume Syslog and CEF | [Azure Monitor Pipeline guide](./azure-monitor-pipeline-guide.md) | Adds scale-out, local processing, and optional buffering |
| Need to filter, aggregate, or transform data before it reaches Azure | [Azure Monitor Pipeline guide](./azure-monitor-pipeline-guide.md) | Pipeline is the design built for this requirement |
| Need a quick benchmark and sizing anchor for Linux forwarders | [AMA setup guide](./ama-setup-guide.md) | Includes Microsoft's published 10,000 EPS forwarder benchmark |
| Need exact `rsyslog` versus `syslog-ng` guidance | [Syslog and CEF forwarding guide](./syslog-forwarding-guide.md) | Covers AMA handoff paths, config locations, and listener details |

## Cross-Guide Navigation

- Start with the [AMA setup guide](./ama-setup-guide.md) for the baseline Azure Monitor Agent and DCR workflow.
- Move to the [Windows Event Forwarding guide](./windows-event-forwarding-guide.md) when Windows sources should forward native event logs to a central WEC before cloud ingestion.
- Move to the [Syslog and CEF forwarding guide](./syslog-forwarding-guide.md) when the source cannot host AMA and needs a Linux collector.
- Move to the [Azure Monitor Pipeline guide](./azure-monitor-pipeline-guide.md) when volume, transformation, or resiliency requirements exceed what one forwarder or WEC tier should handle.

## Further Reading

- [Azure Monitor Agent performance benchmark](https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-performance)
- [Forward Syslog data with Microsoft Sentinel by using Azure Monitor Agent](https://learn.microsoft.com/en-us/azure/sentinel/forward-syslog-monitor-agent)
- [Azure Monitor Pipeline overview](https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/pipeline-overview)

