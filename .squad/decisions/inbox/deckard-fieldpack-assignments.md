# Decision: Field Pack Assignments for solutions.json

**Date:** 2026-06-03T16:42:31+02:00
**Author:** Deckard
**Status:** Implemented

---

## Summary

`data/solutions.json` now carries a `fieldPack` property on all 43 connectors that need customer-supplied infrastructure details. Seven high-priority connectors also carry `ganttTaskOverrides.sourceConfigSubtasks` with vendor-specific task guidance for the Gantt PC-02 step.

---

## Field Pack Assignments

### `syslog-cef` — 31 connectors
AMA-based Syslog/CEF forwarder path. Customer provides: EPS, collector VM count, on-prem %, syslog/CEF receiver hostname.

| ID | Name |
|---|---|
| ai-analyst-darktrace | AI Analyst Darktrace |
| azure-cloud-ngfw-by-palo-alto-networks | Azure Cloud NGFW By Palo Alto Networks |
| barracuda-waf | Barracuda WAF |
| cisco-asa-2 | Cisco ASA |
| cisco-firepower-e-streamer | Cisco Firepower E Streamer |
| cisco-sd-wan | Cisco SD-WAN |
| common-event-format | Common Event Format |
| contrast-protect | Contrast Protect |
| delinea-secret-server | Delinea Secret Server |
| eset-security-management-center | Eset Security Management Center |
| esetprotect | ESETPROTECT |
| extra-hop-reveal-x | Extra Hop Reveal(x) |
| f5-networks | F5 Networks |
| forge-rock-common-audit-for-cef | Forge Rock Common Audit for CEF |
| fortinet-forti-web-cloud-waf-as-a-service-connector-for-microsoft-sentinel | Fortinet FortiWeb Cloud WAF-as-a-Service |
| iboss | iboss |
| illusive-platform | Illusive Platform |
| infoblox-soc-insights | Infoblox SOC Insights |
| iron-net-iron-defense | Iron Net Iron Defense |
| linux-syslog | Syslog (Linux) |
| microsoft-sysmon-for-linux | Microsoft Sysmon For Linux |
| onapsis-platform | Onapsis Platform |
| one-identity | One Identity |
| ridge-security | Ridge Security |
| silverfort | Silverfort |
| v-armour-application-controller | v Armour Application Controller |
| v-mware-sase | VMware SASE |
| votiro | Votiro |
| watchguard-firebox | WatchGuard Firebox |
| wire-x-network-forensics-platform | WireX Network Forensics Platform |
| with-secure-elements-via-connector | WithSecure Elements Via Connector |

### `windows-ama` — 4 connectors
AMA on Windows hosts collecting via Windows Event Log channel. Customer provides: server count, on-prem %, Arc requirement.

| ID | Name |
|---|---|
| windows-security-events | Windows Security Events |
| windows-dns-events-via-ama | Windows DNS Events via AMA |
| windows-server-dns | Windows Server DNS |
| sysmon-via-ama | Sysmon via AMA |

### `wec-wef` — 2 connectors
Windows Event Collector / Windows Event Forwarding path. Customer provides: WEC server count, subscription design, collector topology.

| ID | Name |
|---|---|
| windows-forwarded-events | Windows Forwarded Events |
| windows-forwarded-events-via-ama | Windows Forwarded Events via AMA |

### `ama-custom-logs` — 5 connectors
AMA custom log ingestion (text files, not Event Log channels). Customer provides: server count, log file paths, DCR/DCE details.

| ID | Name | Notes |
|---|---|---|
| radiflow | Radiflow | — |
| security-bridge-app | Security Bridge App | — |
| vectra-ai-stream | Vectra AI Stream | — |
| windows-firewall | Windows Firewall | pfirewall.log text path — NOT Event Log channel |
| windows-firewall-via-ama | Windows Firewall via AMA | pfirewall.log text path — NOT Event Log channel |

**Important:** `windows-firewall` and `windows-firewall-via-ama` are `ama-custom-logs`, not `windows-ama`. These connectors collect `pfirewall.log` text files via AMA Custom Logs, which is architecturally distinct from the Windows Event Log channel path used by `windows-ama`.

### `cribl-intermediary` — 1 connector
Cribl Stream as pipeline intermediary. Customer provides: Cribl Stream deployment type, sources connected through it.

| ID | Name |
|---|---|
| cribl-stream | Cribl Stream |

---

## Gantt Task Overrides (PC-02 source configuration subtasks)

Seven high-priority connectors carry `ganttTaskOverrides.sourceConfigSubtasks` for vendor-specific Gantt guidance:

### cisco-asa-2
```
- Configure ASA: logging host <forwarder-IP> 6514
- Set logging level: informational or above
- Test with: show logging
```

### azure-cloud-ngfw-by-palo-alto-networks
```
- Create syslog server profile in PAN-OS/Panorama
- Select log types: Traffic, Threat, URL Filtering, WildFire
- Assign profile to security policy
- Set format to CEF
```

### f5-networks
```
- Configure F5 BIG-IP remote syslog destination
- Set log level and facility
- Test connectivity to forwarder
```

### common-event-format
```
- Point CEF-emitting sources to forwarder/Cribl
- Verify CEF header format: CEF:0|Vendor|Product|Version|...
- Confirm no format mismatch
```

### windows-security-events
```
- Configure Group Policy Security Audit settings
- Select Event IDs (4624, 4625, 4648, 4672, 4688)
- Confirm policy applied to target machines
```

### windows-forwarded-events
```
- Design WEF subscription scope (source-initiated vs collector-initiated)
- Configure FQDN targeting
- Validate subscription status on WEC
```

### sysmon-via-ama
```
- Deploy Sysmon with config XML on target hosts
- Validate Sysmon events in Event Viewer
- Configure DCR for both Sysmon Windows Events and Linux Syslog
```

---

## Schema Pattern

```json
{
  "id": "cisco-asa-2",
  "fieldPack": "syslog-cef",
  "ganttTaskOverrides": {
    "sourceConfigSubtasks": [
      "Configure ASA: logging host <forwarder-IP> 6514",
      "Set logging level: informational or above",
      "Test with: show logging"
    ]
  }
}
```

- `fieldPack` — tells the planner which sizing/detail form template to render for this connector
- `ganttTaskOverrides` — connector-specific variations on generic Gantt task steps; currently only `sourceConfigSubtasks` (PC-02 overrides), but structure is open for `sourceConfigDuration` and other per-step overrides

---

## Implementation Notes

- Change is additive only. Zero existing properties were removed or altered.
- Connectors that already had `capacity_type`, `server_population_kind`, `shared_population_group`, etc. retain all of those. `fieldPack` is complementary metadata, not a replacement.
- The remaining 290 connectors (no infrastructure dependency) are intentionally left without `fieldPack` — absence means "no sizing form needed."
