# Decision: Syslog/CEF fieldPack Coverage Rule

**By:** Sebastian (Data Engineer)
**Date:** 2026-06-10
**Status:** APPLIED

## What

Added `"fieldPack": "syslog-cef"` to 53 solutions in `data/solutions.json` that were missing the field despite connecting to Sentinel via Syslog or CEF (i.e., requiring a Linux VM collector).

Total `fieldPack: "syslog-cef"` entries: 31 → 84.

## Rule Established

**A solution MUST have `"fieldPack": "syslog-cef"` if its Microsoft Sentinel documentation or description states it uses one of:**
- "Syslog via AMA" connector
- "CEF via AMA" connector
- "Agent-based log collection (CEF over Syslog)"

**A solution MUST NOT have `"fieldPack": "syslog-cef"` if it connects via:**
- Custom logs via AMA (DCR-based custom logs)
- Azure Monitor HTTP Data Collector API
- Azure Logic Apps (API-based integration)
- Native Azure / Microsoft connector (no Linux forwarder)

## Exceptions Applied

- `zscaler-private-access-zpa` — uses Custom logs via AMA; excluded.
- `sysmon-via-ama` — Windows path uses WEF/DCR; only Linux path uses syslog. Mixed transport excluded to avoid incorrect topology wiring.

## Why

The topology visualization code classifies solutions as `syslog_cef` type and wires them to the Linux VM collector node using `fieldPack: "syslog-cef"`. Without this field, the collector VM node is not rendered for these solutions and the customer sees an incomplete deployment topology.

## Solutions Patched

Five task-specified: `zscaler`, `checkpoint`, `fortinet-forti-gate-next-generation-firewall-connector-for-microsoft-sentinel`, `barracuda-cloud-gen-firewall`, `cisco-aci`.

Forty-eight additional confirmed syslog/CEF sources including: sophos, sonic-wall-firewall, palo-alto-cdl, juniper-srx, akamai-security-events, arista-awake-security, aruba-clear-pass, blackberry-cylance-protect, broadcom-symantec-dlp, cisco-ise, cisco-secure-cloud-analytics, cisco-seg, cisco-ucs, cisco-wsa, citrix-adc, citrix-web-app-firewall, claroty, cyber-ark-privilege-access-manager-pam-events, digital-guardian-data-loss-prevention, exabeam-advanced-analytics, fire-eye-network-security, forcepoint-casb, forcepoint-csg, forcepoint-ngfw, git-lab, illumio-core, infoblox-cloud-data-connector, infoblox-nios, isc-bind, ivanti-unified-endpoint-management, mc-afee-e-policy-orchestrator, mc-afee-network-security-platform, nasuni, netwrix-auditor, nozomi-networks, open-vpn, oracle-database-audit, ossec, ping-federate, pulse-connect-secure, rsa-secur-id, symantec-proxy-sg, symantec-vip, trend-micro-apex-one, trend-micro-deep-security, trend-micro-tipping-point, vectra-ai-detect, vm-ware-es-xi.
