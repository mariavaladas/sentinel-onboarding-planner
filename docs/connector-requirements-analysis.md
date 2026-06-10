# Connector Requirements Analysis

_Generated from `data/solutions.json` on 2026-06-03T16:29:33_

## 1. Executive Summary

- `solutions.json` currently contains **333 connector-bearing entries** (`connectors > 0`). The user request referenced 332; the live file now contains **333**, so this analysis covers the full current dataset.
- **43 connectors need customer-supplied sizing/detail fields** because their ingestion path depends on AMA, MMA, WEC/WEF, custom logs, Syslog/CEF collectors, or an intermediary such as Cribl Stream.
- The remaining **290 connectors do not currently need infrastructure sizing**. They are primarily first-party APIs, Diagnostic Settings, CCP-based connectors, or serverless/API-driven integrations.
- The current app has **no `sizingInputs` or `additionalDetails` schema at all**. The only structured sizing-related signals are `capacity_type`, `server_population_kind`, `server_count_label`, `shared_population_group`, `requiredInfrastructure`, `ama_only`, and `cribl_eligible`.
- Of the **43** connectors that need fields, only **10** have any core structured sizing metadata, only **5** have three or more core metadata fields, and **33** are missing all structured sizing/detail metadata.
- The reusable work should start with four field packs: **Syslog/CEF**, **Windows AMA**, **WEC/WEF**, **AMA custom logs**, followed by **Cribl/intermediary** support. After that, connector rollout becomes mostly data-entry work rather than bespoke UX work.

| Category | Connector count | Needs sizing? |
| --- | ---: | --- |
| Codeless Connector Platform (CCP) | 150 | No |
| Azure Functions / Logic Apps | 83 | No |
| AMA — Syslog/CEF | 31 | Yes |
| First-Party API | 21 | No |
| Direct REST API ingestion | 19 | No |
| Diagnostic Settings | 17 | No |
| AMA — Windows Events | 6 | Yes |
| AMA — Custom Logs | 5 | Yes |
| Cribl / Intermediary | 1 | Yes |

### Size-needed connectors by category

| Category | Connector count |
| --- | ---: |
| AMA — Syslog/CEF | 31 |
| AMA — Windows Events | 6 |
| AMA — Custom Logs | 5 |
| Cribl / Intermediary | 1 |

## 2. Full Classification Table

Interpretation notes:
- **Needs sizing = Yes** means the connector depends on customer-managed collectors, agents, log forwarders, WEC/WEF, custom-log hosts, or an intermediary layer.
- **Confidence** is lower for connectors whose `solutions.json` metadata only says “export path, API connection, or cloud-native integration” without naming the exact connector implementation.

| ID | Connector | Category | Needs sizing? | Confidence | Current hints |
| --- | --- | --- | --- | --- | --- |
| radiflow | Radiflow | AMA — Custom Logs | Yes | Medium | — |
| security-bridge-app | Security Bridge App | AMA — Custom Logs | Yes | Medium | — |
| vectra-ai-stream | Vectra AI Stream | AMA — Custom Logs | Yes | Medium | — |
| windows-firewall | Windows Firewall | AMA — Custom Logs | Yes | High | capacity_type=server_count, server_population_kind=windows_ama, server_count_label=How many Windows servers?, shared_population_group=windows-ama, cribl_eligible=True |
| windows-firewall-via-ama | Windows Firewall via AMA | AMA — Custom Logs | Yes | High | capacity_type=server_count, server_population_kind=windows_ama, server_count_label=How many Windows servers?, shared_population_group=windows-ama, requiredInfrastructure=[windows-firewall-logging, agent, dcr, dce, azure-arc], ama_only=True |
| ai-analyst-darktrace | AI Analyst Darktrace | AMA — Syslog/CEF | Yes | Medium | — |
| azure-cloud-ngfw-by-palo-alto-networks | Azure Cloud NGFW By Palo Alto Networks | AMA — Syslog/CEF | Yes | Medium | — |
| barracuda-waf | Barracuda WAF | AMA — Syslog/CEF | Yes | Medium | — |
| cisco-asa-2 | Cisco ASA | AMA — Syslog/CEF | Yes | High | — |
| cisco-firepower-e-streamer | Cisco Firepower E Streamer | AMA — Syslog/CEF | Yes | Medium | — |
| cisco-sd-wan | Cisco SD-WAN | AMA — Syslog/CEF | Yes | Medium | — |
| common-event-format | Common Event Format | AMA — Syslog/CEF | Yes | High | capacity_type=eps, ama_only=True, cribl_eligible=True |
| contrast-protect | Contrast Protect | AMA — Syslog/CEF | Yes | Medium | — |
| delinea-secret-server | Delinea Secret Server | AMA — Syslog/CEF | Yes | Medium | — |
| eset-security-management-center | Eset Security Management Center | AMA — Syslog/CEF | Yes | Medium | — |
| esetprotect | ESETPROTECT | AMA — Syslog/CEF | Yes | Medium | — |
| extra-hop-reveal-x | Extra Hop Reveal(x) | AMA — Syslog/CEF | Yes | Medium | — |
| f5-networks | F5 Networks | AMA — Syslog/CEF | Yes | High | — |
| forge-rock-common-audit-for-cef | Forge Rock Common Audit for CEF | AMA — Syslog/CEF | Yes | High | cribl_eligible=True |
| fortinet-forti-web-cloud-waf-as-a-service-connector-for-microsoft-sentinel | Fortinet Forti Web Cloud WAF-as-a-Service connector for Microsoft Sentinel | AMA — Syslog/CEF | Yes | Medium | — |
| iboss | iboss | AMA — Syslog/CEF | Yes | Medium | — |
| illusive-platform | Illusive Platform | AMA — Syslog/CEF | Yes | Medium | — |
| infoblox-soc-insights | Infoblox SOC Insights | AMA — Syslog/CEF | Yes | Medium | — |
| iron-net-iron-defense | Iron Net Iron Defense | AMA — Syslog/CEF | Yes | Medium | — |
| microsoft-sysmon-for-linux | Microsoft Sysmon For Linux | AMA — Syslog/CEF | Yes | High | capacity_type=server_count, server_population_kind=linux, cribl_eligible=True |
| onapsis-platform | Onapsis Platform | AMA — Syslog/CEF | Yes | Medium | — |
| one-identity | One Identity | AMA — Syslog/CEF | Yes | Medium | — |
| ridge-security | Ridge Security | AMA — Syslog/CEF | Yes | Medium | — |
| silverfort | Silverfort | AMA — Syslog/CEF | Yes | Medium | — |
| linux-syslog | Syslog | AMA — Syslog/CEF | Yes | High | capacity_type=server_count, server_population_kind=linux, ama_only=True, cribl_eligible=True |
| v-armour-application-controller | v Armour Application Controller | AMA — Syslog/CEF | Yes | Medium | — |
| v-mware-sase | V Mware SASE | AMA — Syslog/CEF | Yes | Medium | — |
| votiro | Votiro | AMA — Syslog/CEF | Yes | Medium | — |
| watchguard-firebox | Watchguard Firebox | AMA — Syslog/CEF | Yes | High | — |
| wire-x-network-forensics-platform | Wire X Network Forensics Platform | AMA — Syslog/CEF | Yes | Medium | — |
| with-secure-elements-via-connector | With Secure Elements Via Connector | AMA — Syslog/CEF | Yes | Medium | — |
| sysmon-via-ama | Sysmon via AMA | AMA — Windows Events | Yes | High | requiredInfrastructure=[sysmon-windows, sysmon-linux, agent, windows-event-dcr, linux-syslog-dcr, azure-arc, asim], ama_only=True |
| windows-dns-events-via-ama | Windows DNS Events via AMA | AMA — Windows Events | Yes | High | requiredInfrastructure=[dns-server, dns-analytical-logging, agent, dcr, azure-arc], ama_only=True |
| windows-forwarded-events | Windows Forwarded Events | AMA — Windows Events | Yes | High | capacity_type=server_count, server_population_kind=wec, server_count_label=How many WEC servers?, requiredInfrastructure=[windows-event-collector, wef-subscription-design, forwarded-events-channel-sizing, collector-topology-planning, agent, dcr, azure-arc], ama_only=True, cribl_eligible=True |
| windows-forwarded-events-via-ama | Windows Forwarded Events via AMA | AMA — Windows Events | Yes | High | capacity_type=server_count, server_population_kind=wec, server_count_label=How many WEC servers?, requiredInfrastructure=[windows-event-collector, wef-subscription-design, forwarded-events-channel-sizing, collector-topology-planning, agent, dcr, azure-arc], ama_only=True |
| windows-security-events | Windows Security Events | AMA — Windows Events | Yes | High | capacity_type=server_count, server_population_kind=windows_ama, server_count_label=How many Windows servers?, shared_population_group=windows-ama, requiredInfrastructure=[windows-host-readiness, windows-security-audit-policy, windows-security-event-set-selection, agent, dcr, azure-arc], ama_only=True, cribl_eligible=True |
| windows-server-dns | Windows Server DNS | AMA — Windows Events | Yes | Medium | — |
| 1-password | 1 Password | Azure Functions / Logic Apps | No | Medium | — |
| alibaba-cloud | Alibaba Cloud | Azure Functions / Logic Apps | No | Medium | — |
| alibaba-cloud-action-trail | Alibaba Cloud Action Trail | Azure Functions / Logic Apps | No | Low | — |
| alibaba-cloud-networking | Alibaba Cloud Networking | Azure Functions / Logic Apps | No | Low | — |
| aws | Amazon Web Services | Azure Functions / Logic Apps | No | Low | — |
| amazon-web-services-network-firewall | Amazon Web Services Network Firewall | Azure Functions / Logic Apps | No | Medium | cribl_eligible=True |
| amazon-web-services-route-53 | Amazon Web Services Route 53 | Azure Functions / Logic Apps | No | Low | — |
| armis | Armis | Azure Functions / Logic Apps | No | Medium | — |
| armorblox | Armorblox | Azure Functions / Logic Apps | No | Medium | — |
| auth0 | Auth0 | Azure Functions / Logic Apps | No | Medium | — |
| aws-access-logs | AWS Access Logs | Azure Functions / Logic Apps | No | Low | — |
| aws-cloud-front | AWS Cloud Front | Azure Functions / Logic Apps | No | Medium | — |
| aws-eks | AWS EKS | Azure Functions / Logic Apps | No | Low | — |
| aws-elb | AWS ELB | Azure Functions / Logic Apps | No | Low | — |
| aws-security-hub | AWS Security Hub | Azure Functions / Logic Apps | No | Low | — |
| aws-vpc-flow-logs | AWS VPC Flow Logs | Azure Functions / Logic Apps | No | Low | — |
| beyond-trust-pm-cloud | Beyond Trust PM Cloud | Azure Functions / Logic Apps | No | Medium | — |
| big-id | Big ID | Azure Functions / Logic Apps | No | Medium | — |
| bit-sight | Bit Sight | Azure Functions / Logic Apps | No | Medium | — |
| bitglass | Bitglass | Azure Functions / Logic Apps | No | Medium | — |
| box | Box | Azure Functions / Logic Apps | No | Medium | — |
| cisco-duo-security | Cisco Duo Security | Azure Functions / Logic Apps | No | Medium | — |
| cisco-etd | Cisco ETD | Azure Functions / Logic Apps | No | Medium | — |
| cisco-umbrella | Cisco Umbrella | Azure Functions / Logic Apps | No | Medium | — |
| citrix-analytics-for-security | Citrix Analytics for Security | Azure Functions / Logic Apps | No | Medium | — |
| commvault-security-iq | Commvault Security IQ | Azure Functions / Logic Apps | No | Medium | — |
| contrast-adr | Contrast ADR | Azure Functions / Logic Apps | No | Medium | — |
| crowdstrike | Crowd Strike Falcon Endpoint Protection | Azure Functions / Logic Apps | No | Medium | — |
| ermes-browser-security | Ermes Browser Security | Azure Functions / Logic Apps | No | Medium | — |
| eset-inspect | ESET Inspect | Azure Functions / Logic Apps | No | Medium | — |
| eset-protect-platform | ESET Protect Platform | Azure Functions / Logic Apps | No | Medium | — |
| extra-hop | Extra Hop | Azure Functions / Logic Apps | No | Medium | — |
| feedly | Feedly | Azure Functions / Logic Apps | No | Medium | — |
| flare | Flare | Azure Functions / Logic Apps | No | Medium | — |
| google-cloud-platform-audit-logs | Google Cloud Platform Audit Logs | Azure Functions / Logic Apps | No | Low | — |
| google-cloud-platform-firewall-logs | Google Cloud Platform Firewall Logs | Azure Functions / Logic Apps | No | Low | cribl_eligible=True |
| google-cloud-platform-load-balancer-logs | Google Cloud Platform Load Balancer Logs | Azure Functions / Logic Apps | No | Low | — |
| google-cloud-platform-security-command-center | Google Cloud Platform Security Command Center | Azure Functions / Logic Apps | No | Low | — |
| google-cloud-platform-vpc-flow-logs | Google Cloud Platform VPC Flow Logs | Azure Functions / Logic Apps | No | Low | — |
| google-kubernetes-engine | Google Kubernetes Engine | Azure Functions / Logic Apps | No | Low | — |
| gravity-zone | Gravity Zone | Azure Functions / Logic Apps | No | Medium | — |
| halcyon | Halcyon | Azure Functions / Logic Apps | No | Medium | — |
| holm-security | Holm Security | Azure Functions / Logic Apps | No | Medium | — |
| i-pinfo | I Pinfo | Azure Functions / Logic Apps | No | Medium | — |
| jamf-protect | Jamf Protect | Azure Functions / Logic Apps | No | Medium | — |
| mesh-stack | mesh Stack | Azure Functions / Logic Apps | No | Medium | — |
| mimecast | Mimecast | Azure Functions / Logic Apps | No | Medium | — |
| mimecast-audit | Mimecast Audit | Azure Functions / Logic Apps | No | Medium | — |
| mimecast-seg | Mimecast SEG | Azure Functions / Logic Apps | No | Medium | — |
| mimecast-ti-regional | Mimecast TI Regional | Azure Functions / Logic Apps | No | Medium | — |
| mimecast-ttp | Mimecast TTP | Azure Functions / Logic Apps | No | Medium | — |
| morphisec | Morphisec | Azure Functions / Logic Apps | No | Medium | — |
| mulesoft | Mulesoft | Azure Functions / Logic Apps | No | Medium | — |
| netskope | Netskope | Azure Functions / Logic Apps | No | Medium | — |
| netskopev2 | Netskopev2 | Azure Functions / Logic Apps | No | Medium | — |
| nord-pass | Nord Pass | Azure Functions / Logic Apps | No | Medium | — |
| one-trust | One Trust | Azure Functions / Logic Apps | No | Medium | — |
| orca-security-alerts | Orca Security Alerts | Azure Functions / Logic Apps | No | Medium | — |
| palo-alto-prisma-cloud-2 | Palo Alto Prisma Cloud | Azure Functions / Logic Apps | No | Medium | — |
| qualys-vm-knowledgebase | Qualys VM Knowledgebase | Azure Functions / Logic Apps | No | Medium | — |
| rapid7-insightvm | Rapid7 InsightVM | Azure Functions / Logic Apps | No | Medium | — |
| rubrik-security-cloud | Rubrik Security Cloud | Azure Functions / Logic Apps | No | Medium | — |
| sail-point-identity-now | Sail Point Identity Now | Azure Functions / Logic Apps | No | Medium | — |
| security-scorecard-cybersecurity-ratings | Security Scorecard Cybersecurity Ratings | Azure Functions / Logic Apps | No | Medium | — |
| sentinelone | Sentinel One | Azure Functions / Logic Apps | No | Medium | — |
| slash-next | Slash Next | Azure Functions / Logic Apps | No | Medium | — |
| sophos-cloud-optix | Sophos Cloud Optix | Azure Functions / Logic Apps | No | Medium | — |
| styx-intelligence | Styx Intelligence | Azure Functions / Logic Apps | No | Medium | — |
| tenable-app | Tenable App | Azure Functions / Logic Apps | No | Medium | — |
| tenable-io | Tenable IO | Azure Functions / Logic Apps | No | Medium | — |
| the-hive | The Hive | Azure Functions / Logic Apps | No | Medium | — |
| theom | Theom | Azure Functions / Logic Apps | No | Medium | — |
| transmit-security | Transmit Security | Azure Functions / Logic Apps | No | Medium | — |
| trend-micro-cloud-app-security | Trend Micro Cloud App Security | Azure Functions / Logic Apps | No | Medium | — |
| tropico | Tropico | Azure Functions / Logic Apps | No | Medium | — |
| upwind | Upwind | Azure Functions / Logic Apps | No | Medium | — |
| v-mware-carbon-black-cloud | V Mware Carbon Black Cloud | Azure Functions / Logic Apps | No | Medium | — |
| varonis-saa-s | Varonis Saa S | Azure Functions / Logic Apps | No | Medium | — |
| wiz | Wiz | Azure Functions / Logic Apps | No | Medium | — |
| workplace-from-facebook | Workplace from Facebook | Azure Functions / Logic Apps | No | Medium | — |
| xbow | XBOW | Azure Functions / Logic Apps | No | Medium | — |
| zero-networks | Zero Networks | Azure Functions / Logic Apps | No | Medium | — |
| zoom-reports | Zoom Reports | Azure Functions / Logic Apps | No | Medium | — |
| 42-crunch-api-protection | 42 Crunch API Protection | Codeless Connector Platform (CCP) | No | High | — |
| abnormal-security | Abnormal Security | Codeless Connector Platform (CCP) | No | High | — |
| agari | Agari | Codeless Connector Platform (CCP) | No | High | — |
| agile-sec-analytics-connector | Agile Sec Analytics Connector | Codeless Connector Platform (CCP) | No | High | — |
| ai-shield-ai-security-monitoring | AI Shield AI Security Monitoring | Codeless Connector Platform (CCP) | No | High | — |
| alsid-for-ad | Alsid For AD | Codeless Connector Platform (CCP) | No | High | — |
| anvilogic | Anvilogic | Codeless Connector Platform (CCP) | No | High | — |
| atlassian-confluence-audit | Atlassian Confluence Audit | Codeless Connector Platform (CCP) | No | High | — |
| atlassian-jira-audit | Atlassian Jira Audit | Codeless Connector Platform (CCP) | No | High | — |
| authomize | Authomize | Codeless Connector Platform (CCP) | No | High | — |
| better-mobile-threat-defense-mtd | BETTER Mobile Threat Defense (MTD) | Codeless Connector Platform (CCP) | No | High | — |
| beyond-security-be-secure | Beyond Security be SECURE | Codeless Connector Platform (CCP) | No | High | — |
| bitwarden | Bitwarden | Codeless Connector Platform (CCP) | No | High | — |
| blacklens | Blacklens | Codeless Connector Platform (CCP) | No | High | — |
| blood-hound-enterprise | Blood Hound Enterprise | Codeless Connector Platform (CCP) | No | High | — |
| check-point-cloud-guard-cnapp | Check Point Cloud Guard CNAPP | Codeless Connector Platform (CCP) | No | High | — |
| check-point-cyberint-alerts | Check Point Cyberint Alerts | Codeless Connector Platform (CCP) | No | High | — |
| check-point-cyberint-ioc | Check Point Cyberint IOC | Codeless Connector Platform (CCP) | No | High | — |
| cisco-meraki-events-via-rest-api | Cisco Meraki Events via REST API | Codeless Connector Platform (CCP) | No | High | — |
| cisco-secure-endpoint | Cisco Secure Endpoint | Codeless Connector Platform (CCP) | No | High | — |
| citrix-analytics-ccf | Citrix Analytics CCF | Codeless Connector Platform (CCP) | No | High | — |
| claroty-x-dome | Claroty x Dome | Codeless Connector Platform (CCP) | No | High | — |
| cloudflare | Cloudflare | Codeless Connector Platform (CCP) | No | High | — |
| cloudflare-ccf | Cloudflare CCF | Codeless Connector Platform (CCP) | No | High | — |
| cofense-intelligence | Cofense Intelligence | Codeless Connector Platform (CCP) | No | High | — |
| cofense-triage | Cofense Triage | Codeless Connector Platform (CCP) | No | High | — |
| cognni | Cognni | Codeless Connector Platform (CCP) | No | High | — |
| cognyte-luminar | Cognyte Luminar | Codeless Connector Platform (CCP) | No | High | — |
| corelight | Corelight | Codeless Connector Platform (CCP) | No | High | — |
| cribl | Cribl | Codeless Connector Platform (CCP) | No | High | — |
| ctera | CTERA | Codeless Connector Platform (CCP) | No | High | — |
| cybersixgill-actionable-alerts | Cybersixgill-Actionable-Alerts | Codeless Connector Platform (CCP) | No | High | — |
| cyble-vision | Cyble Vision | Codeless Connector Platform (CCP) | No | High | — |
| cyborg-security-hunter | Cyborg Security HUNTER | Codeless Connector Platform (CCP) | No | High | — |
| cyera-dspm | Cyera DSPM | Codeless Connector Platform (CCP) | No | High | — |
| cyfirma-attack-surface | Cyfirma Attack Surface | Codeless Connector Platform (CCP) | No | High | — |
| cyfirma-brand-intelligence | Cyfirma Brand Intelligence | Codeless Connector Platform (CCP) | No | High | — |
| cyfirma-compromised-accounts | Cyfirma Compromised Accounts | Codeless Connector Platform (CCP) | No | High | — |
| cyfirma-cyber-intelligence | Cyfirma Cyber Intelligence | Codeless Connector Platform (CCP) | No | High | — |
| cyfirma-digital-risk | Cyfirma Digital Risk | Codeless Connector Platform (CCP) | No | High | — |
| cyfirma-vulnerabilities-intel | Cyfirma Vulnerabilities Intel | Codeless Connector Platform (CCP) | No | High | — |
| cyjax | Cyjax | Codeless Connector Platform (CCP) | No | High | — |
| cynerio | Cynerio | Codeless Connector Platform (CCP) | No | High | — |
| cyren-threat-intelligence | Cyren Threat Intelligence | Codeless Connector Platform (CCP) | No | High | — |
| d3-smart-soar | D3 Smart SOAR | Codeless Connector Platform (CCP) | No | High | — |
| darktrace | Darktrace | Codeless Connector Platform (CCP) | No | High | — |
| databahn | Databahn | Codeless Connector Platform (CCP) | No | High | — |
| datalake2-sentinel | Datalake2 Sentinel | Codeless Connector Platform (CCP) | No | High | — |
| dataminr-pulse | Dataminr Pulse | Codeless Connector Platform (CCP) | No | High | — |
| digital-shadows | Digital Shadows | Codeless Connector Platform (CCP) | No | High | — |
| doppel | Doppel | Codeless Connector Platform (CCP) | No | High | — |
| dragos | Dragos | Codeless Connector Platform (CCP) | No | High | — |
| druva-data-security-cloud | Druva Data Security Cloud | Codeless Connector Platform (CCP) | No | High | — |
| dynatrace | Dynatrace | Codeless Connector Platform (CCP) | No | High | — |
| egress-defend | Egress Defend | Codeless Connector Platform (CCP) | No | High | — |
| elastic-agent | Elastic Agent | Codeless Connector Platform (CCP) | No | High | — |
| f5-big-ip | F5 Big-IP | Codeless Connector Platform (CCP) | No | High | — |
| forcepoint-dlp | Forcepoint DLP | Codeless Connector Platform (CCP) | No | High | — |
| forescout-eye-inspect-for-ot-security | Forescout eye Inspect for OT Security | Codeless Connector Platform (CCP) | No | High | — |
| forescout-host-property-monitor | Forescout Host Property Monitor | Codeless Connector Platform (CCP) | No | High | — |
| garrison-ultra | Garrison ULTRA | Codeless Connector Platform (CCP) | No | High | — |
| gigamon-connector | Gigamon Connector | Codeless Connector Platform (CCP) | No | High | — |
| google-apigee | Google Apigee | Codeless Connector Platform (CCP) | No | High | — |
| google-cloud-platform-cdn | Google Cloud Platform CDN | Codeless Connector Platform (CCP) | No | High | — |
| google-cloud-platform-cloud-monitoring | Google Cloud Platform Cloud Monitoring | Codeless Connector Platform (CCP) | No | High | — |
| google-cloud-platform-cloud-run | Google Cloud Platform Cloud Run | Codeless Connector Platform (CCP) | No | High | — |
| google-cloud-platform-compute-engine | Google Cloud Platform Compute Engine | Codeless Connector Platform (CCP) | No | High | — |
| google-cloud-platform-dns | Google Cloud Platform DNS | Codeless Connector Platform (CCP) | No | High | — |
| google-cloud-platform-iam | Google Cloud Platform IAM | Codeless Connector Platform (CCP) | No | High | — |
| google-cloud-platform-ids | Google Cloud Platform IDS | Codeless Connector Platform (CCP) | No | High | — |
| google-cloud-platform-nat | Google Cloud Platform NAT | Codeless Connector Platform (CCP) | No | High | — |
| google-cloud-platform-resource-manager | Google Cloud Platform Resource Manager | Codeless Connector Platform (CCP) | No | High | — |
| google-cloud-platform-sql | Google Cloud Platform SQL | Codeless Connector Platform (CCP) | No | High | — |
| google-workspace-reports | Google Workspace Reports | Codeless Connector Platform (CCP) | No | High | — |
| grey-noise-threat-intelligence | Grey Noise Threat Intelligence | Codeless Connector Platform (CCP) | No | High | — |
| hyas-protect | HYAS Protect | Codeless Connector Platform (CCP) | No | High | — |
| illumio-insight | Illumio Insight | Codeless Connector Platform (CCP) | No | High | — |
| imperva-cloud-waf | Imperva Cloud WAF | Codeless Connector Platform (CCP) | No | High | — |
| infoblox | Infoblox | Codeless Connector Platform (CCP) | No | High | — |
| integration-for-atlassian-beacon | Integration for Atlassian Beacon | Codeless Connector Platform (CCP) | No | High | — |
| io-tot-threat-monitoringwith-defenderfor-io-t | Io TOT Threat Monitoringwith Defenderfor Io T | Codeless Connector Platform (CCP) | No | High | — |
| ionix | IONIX | Codeless Connector Platform (CCP) | No | High | — |
| island | Island | Codeless Connector Platform (CCP) | No | High | — |
| joe-sandbox | Joe Sandbox | Codeless Connector Platform (CCP) | No | High | — |
| keeper-security | Keeper Security | Codeless Connector Platform (CCP) | No | High | — |
| know-be4-defend | Know Be4 Defend | Codeless Connector Platform (CCP) | No | High | — |
| lastpass-enterprise-activity-monitoring | Lastpass Enterprise Activity Monitoring | Codeless Connector Platform (CCP) | No | High | — |
| lookout | Lookout | Codeless Connector Platform (CCP) | No | High | — |
| lumen-defender-threat-feed | Lumen Defender Threat Feed | Codeless Connector Platform (CCP) | No | High | — |
| mail-risk | Mail Risk | Codeless Connector Platform (CCP) | No | High | — |
| miro | Miro | Codeless Connector Platform (CCP) | No | High | — |
| misp2-sentinel | MISP2 Sentinel | Codeless Connector Platform (CCP) | No | High | — |
| mongo-db-atlas | Mongo DB Atlas | Codeless Connector Platform (CCP) | No | High | — |
| nc-protect-data-connector | NC Protect Data Connector | Codeless Connector Platform (CCP) | No | High | — |
| net-clean-pro-active | Net Clean Pro Active | Codeless Connector Platform (CCP) | No | High | — |
| netskope-web-tx | Netskope Web Tx | Codeless Connector Platform (CCP) | No | High | — |
| noname-api-security-solution-for-microsoft-sentinel | Noname API Security Solution for Microsoft Sentinel | Codeless Connector Platform (CCP) | No | High | — |
| one-login-iam | OneLogin IAM | Codeless Connector Platform (CCP) | No | High | — |
| open-ai | Open AI | Codeless Connector Platform (CCP) | No | High | — |
| oracle-cloud-infrastructure | Oracle Cloud Infrastructure | Codeless Connector Platform (CCP) | No | High | — |
| palo-alto-cortex-xdr-ccp | Palo Alto Cortex XDR CCP | Codeless Connector Platform (CCP) | No | High | — |
| palo-alto-cortex-xpanse-ccf | Palo Alto Cortex Xpanse CCF | Codeless Connector Platform (CCP) | No | High | — |
| palo-alto-prisma-cloud-cwpp | Palo Alto Prisma Cloud CWPP | Codeless Connector Platform (CCP) | No | High | — |
| pathlock-t-dn-r | Pathlock T Dn R | Codeless Connector Platform (CCP) | No | High | — |
| perimeter-81 | Perimeter 81 | Codeless Connector Platform (CCP) | No | High | — |
| phosphorus | Phosphorus | Codeless Connector Platform (CCP) | No | High | — |
| ping-one | Ping One | Codeless Connector Platform (CCP) | No | High | — |
| proof-point-tap | Proof Point Tap | Codeless Connector Platform (CCP) | No | High | — |
| proofpoint-on-demand-pod-email-security | Proofpoint On demand(POD) Email Security | Codeless Connector Platform (CCP) | No | High | — |
| quokka | Quokka | Codeless Connector Platform (CCP) | No | High | — |
| red-sift | Red Sift | Codeless Connector Platform (CCP) | No | High | — |
| salesforce-service-cloud | Salesforce Service Cloud | Codeless Connector Platform (CCP) | No | High | — |
| samsung-knox-asset-intelligence | Samsung Knox Asset Intelligence | Codeless Connector Platform (CCP) | No | High | — |
| semperis-directory-services-protector | Semperis Directory Services Protector | Codeless Connector Platform (CCP) | No | High | — |
| semperis-lightning | Semperis Lightning | Codeless Connector Platform (CCP) | No | High | — |
| senserva-pro | Senserva Pro | Codeless Connector Platform (CCP) | No | High | — |
| seraphic-security | Seraphic Security | Codeless Connector Platform (CCP) | No | High | — |
| sevco-security | Sevco Security | Codeless Connector Platform (CCP) | No | High | — |
| signl4 | SIGNL4 | Codeless Connector Platform (CCP) | No | High | — |
| sinec-security-guard | SINEC Security Guard | Codeless Connector Platform (CCP) | No | High | — |
| snowflake | Snowflake | Codeless Connector Platform (CCP) | No | High | — |
| soc-prime-ccf | SOC Prime CCF | Codeless Connector Platform (CCP) | No | High | — |
| sonrai-security | Sonrai Security | Codeless Connector Platform (CCP) | No | High | — |
| sophos-endpoint-protection | Sophos Endpoint Protection | Codeless Connector Platform (CCP) | No | High | — |
| squadra-technologies-sec-rmm | Squadra Technologies Sec Rmm | Codeless Connector Platform (CCP) | No | High | — |
| strider-shield | Strider Shield | Codeless Connector Platform (CCP) | No | High | — |
| symantec-integrated-cyber-defense | Symantec Integrated Cyber Defense | Codeless Connector Platform (CCP) | No | High | — |
| tacit-red-threat-intelligence | Tacit Red Threat Intelligence | Codeless Connector Platform (CCP) | No | High | — |
| talon | Talon | Codeless Connector Platform (CCP) | No | High | — |
| tanium | Tanium | Codeless Connector Platform (CCP) | No | High | — |
| team-cymru-scout | Team Cymru Scout | Codeless Connector Platform (CCP) | No | High | — |
| threat-intelligence | Threat Intelligence | Codeless Connector Platform (CCP) | No | High | — |
| threat-intelligence-new | Threat Intelligence (NEW) | Codeless Connector Platform (CCP) | No | High | — |
| threat-intelligence-solution-for-azure-government | Threat Intelligence Solution for Azure Government | Codeless Connector Platform (CCP) | No | High | — |
| trellix | Trellix | Codeless Connector Platform (CCP) | No | High | — |
| trend-micro-vision-one | Trend Micro Vision One | Codeless Connector Platform (CCP) | No | High | — |
| vaikora-sentinel | Vaikora-Sentinel | Codeless Connector Platform (CCP) | No | High | — |
| valence-security | Valence Security | Codeless Connector Platform (CCP) | No | High | — |
| valimail-enforce | Valimail Enforce | Codeless Connector Platform (CCP) | No | High | — |
| varonis-purview | Varonis Purview | Codeless Connector Platform (CCP) | No | High | — |
| versasec-cms | Versasec CMS | Codeless Connector Platform (CCP) | No | High | — |
| visa-threat-intelligence-vti | Visa Threat Intelligence (VTI) | Codeless Connector Platform (CCP) | No | High | — |
| vm-ray | VM Ray | Codeless Connector Platform (CCP) | No | High | — |
| with-secure-elements-via-function | With Secure Elements Via Function | Codeless Connector Platform (CCP) | No | High | — |
| workday | Workday | Codeless Connector Platform (CCP) | No | High | — |
| zero-fox | Zero Fox | Codeless Connector Platform (CCP) | No | High | — |
| zero-fox-alerts | Zero Fox Alerts | Codeless Connector Platform (CCP) | No | High | — |
| zero-fox-threat-intelligence | Zero Fox Threat Intelligence | Codeless Connector Platform (CCP) | No | High | — |
| zimperium-mobile-threat-defense | Zimperium Mobile Threat Defense | Codeless Connector Platform (CCP) | No | High | — |
| zscaler | Zscaler Internet Access | Codeless Connector Platform (CCP) | No | High | — |
| cribl-stream | Cribl Stream | Cribl / Intermediary | Yes | High | — |
| azure-activity | Azure Activity | Diagnostic Settings | No | High | — |
| azure-batch-account | Azure Batch Account | Diagnostic Settings | No | High | — |
| azure-cognitive-search | Azure Cognitive Search | Diagnostic Settings | No | High | — |
| azure-ddos-protection | Azure DDoS Protection | Diagnostic Settings | No | High | — |
| azure-event-hubs | Azure Event Hubs | Diagnostic Settings | No | High | — |
| azure-firewall | Azure Firewall | Diagnostic Settings | No | High | cribl_eligible=True |
| azure-key-vault | Azure Key Vault | Diagnostic Settings | No | High | — |
| azure-kubernetes-service | Azure Kubernetes Service | Diagnostic Settings | No | High | — |
| azure-logic-apps | Azure Logic Apps | Diagnostic Settings | No | High | — |
| azure-network-security-group | Azure Network Security Groups | Diagnostic Settings | No | High | — |
| azure-resource-graph | Azure Resource Graph | Diagnostic Settings | No | High | — |
| azure-service-bus | Azure Service Bus | Diagnostic Settings | No | High | — |
| azure-sql-database-solution-for-sentinel | Azure SQL Database Solution for Sentinel | Diagnostic Settings | No | High | — |
| azure-storage | Azure Storage | Diagnostic Settings | No | High | — |
| azure-stream-analytics | Azure Stream Analytics | Diagnostic Settings | No | High | — |
| azure-waf | Azure Web Application Firewall (WAF) | Diagnostic Settings | No | High | cribl_eligible=True |
| microsoft-entra-id | Microsoft Entra ID | Diagnostic Settings | No | High | — |
| alc-web-ctrl | ALC-Web CTRL | Direct REST API ingestion | No | Medium | — |
| argos-cloud-security | ARGOS Cloud Security | Direct REST API ingestion | No | Low | — |
| cohesity-security | Cohesity Security | Direct REST API ingestion | No | Low | — |
| cortex-xdr | Cortex XDR | Direct REST API ingestion | No | Medium | — |
| datawiza | Datawiza | Direct REST API ingestion | No | Low | — |
| forescout-legacy | Forescout (Legacy) | Direct REST API ingestion | No | Medium | — |
| fortinet-forti-ndr-cloud | Fortinet Forti NDR Cloud | Direct REST API ingestion | No | Low | — |
| imperva-waf-gateway | Imperva WAF Gateway | Direct REST API ingestion | No | Medium | — |
| lookout-cloud-security-platform-for-microsoft-sentinel | Lookout Cloud Security Platform for Microsoft Sentinel | Direct REST API ingestion | No | Low | — |
| obsidian-datasharing | Obsidian Datasharing | Direct REST API ingestion | No | Low | — |
| onapsis-defend | Onapsis Defend | Direct REST API ingestion | No | Low | — |
| rsaid-plus-admin-logs-connector | RSAID Plus Admin Logs Connector | Direct REST API ingestion | No | Low | — |
| sap-btp | SAP BTP | Direct REST API ingestion | No | Low | — |
| sap-etd-cloud | SAP ETD Cloud | Direct REST API ingestion | No | Low | — |
| sap-log-serv | SAP Log Serv | Direct REST API ingestion | No | Low | — |
| sap-s4-cloud-public-edition | SAP S4 Cloud Public Edition | Direct REST API ingestion | No | Low | — |
| synqly-integration-connector | Synqly Integration Connector | Direct REST API ingestion | No | Low | — |
| vectra-xdr | Vectra XDR | Direct REST API ingestion | No | Low | — |
| virtual-metric-data-stream | Virtual Metric Data Stream | Direct REST API ingestion | No | Low | — |
| agent-365 | Agent 365 | First-Party API | No | Medium | — |
| azure-devops-auditing | Azure DevOps Auditing | First-Party API | No | Medium | — |
| dynamics-365 | Dynamics 365 | First-Party API | No | High | — |
| microsoft-365 | Microsoft 365 | First-Party API | No | High | — |
| microsoft-365-assets | Microsoft 365 Assets | First-Party API | No | High | — |
| microsoft-business-applications | Microsoft Business Applications | First-Party API | No | High | — |
| microsoft-copilot | Microsoft Copilot | First-Party API | No | High | — |
| defender-for-cloud | Microsoft Defender for Cloud | First-Party API | No | High | — |
| defender-for-cloud-apps | Microsoft Defender for Cloud Apps | First-Party API | No | High | — |
| microsoft-defender-for-endpoint | Microsoft Defender For Endpoint | First-Party API | No | Medium | — |
| microsoft-defender-for-identity | Microsoft Defender for Identity | First-Party API | No | High | — |
| defender-for-office-365 | Microsoft Defender for Office 365 | First-Party API | No | Medium | — |
| defender-xdr | Microsoft Defender XDR | First-Party API | No | High | — |
| microsoft-entra-id-assets | Microsoft Entra ID Assets | First-Party API | No | High | — |
| microsoft-entra-id-protection | Microsoft Entra ID Protection | First-Party API | No | High | — |
| microsoft-exchange-security-exchange-on-premises | Microsoft Exchange Security - Exchange On-Premises | First-Party API | No | High | — |
| microsoft-exchange-security-exchange-online | Microsoft Exchange Security - Exchange Online | First-Party API | No | High | — |
| microsoft-power-bi | Microsoft Power BI | First-Party API | No | Medium | — |
| microsoft-project | Microsoft Project | First-Party API | No | Medium | — |
| microsoft-purview | Microsoft Purview | First-Party API | No | High | — |
| microsoft-purview-information-protection | Microsoft Purview Information Protection | First-Party API | No | High | — |

## 3. Detailed Requirements (only connectors that need fields)

The table below turns each size-needed connector into a reusable field-pack assignment so the planner can ask consistent questions instead of inventing unique forms for every vendor.

| ID | Connector | Category | Field pack | What it ingests | Infrastructure to size | Questions to ask | Current app support |
| --- | --- | --- | --- | --- | --- | --- | --- |
| radiflow | Radiflow | AMA — Custom Logs | AMA custom-log pack | Host-based custom text/JSON/application logs collected by AMA. | Source hosts or relay hosts, AMA, DCR, log file path/schema decisions, optional DCE, parsing/transforms. | How many hosts write the logs? Which file paths or channels? Daily GB/day and burst behavior? Rotation/retention pattern? Need custom parsing or transformations? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| security-bridge-app | Security Bridge App | AMA — Custom Logs | AMA custom-log pack | Host-based custom text/JSON/application logs collected by AMA. | Source hosts or relay hosts, AMA, DCR, log file path/schema decisions, optional DCE, parsing/transforms. | How many hosts write the logs? Which file paths or channels? Daily GB/day and burst behavior? Rotation/retention pattern? Need custom parsing or transformations? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| vectra-ai-stream | Vectra AI Stream | AMA — Custom Logs | AMA custom-log pack | Host-based custom text/JSON/application logs collected by AMA. | Source hosts or relay hosts, AMA, DCR, log file path/schema decisions, optional DCE, parsing/transforms. | How many hosts write the logs? Which file paths or channels? Daily GB/day and burst behavior? Rotation/retention pattern? Need custom parsing or transformations? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| windows-firewall | Windows Firewall | AMA — Custom Logs | Windows firewall custom-log pack | Windows Defender Firewall text logs (for example pfirewall.log) via AMA. | Windows hosts, firewall logging enabled, AMA, DCR/DCE, file path and rotation management. | How many Windows hosts? Which firewall profiles/actions are logged? What is expected file volume? Standard path or custom path? Rotation/retention settings? | Partial: capacity_type=server_count; server_population_kind=windows_ama; server_count_label=How many Windows servers?; shared_population_group=windows-ama; cribl_eligible=True. No generic sizingInputs/additionalDetails schema. |
| windows-firewall-via-ama | Windows Firewall via AMA | AMA — Custom Logs | Windows firewall custom-log pack | Windows Defender Firewall text logs (for example pfirewall.log) via AMA. | Windows hosts, firewall logging enabled, AMA, DCR/DCE, file path and rotation management. | How many Windows hosts? Which firewall profiles/actions are logged? What is expected file volume? Standard path or custom path? Rotation/retention settings? | Partial: capacity_type=server_count; server_population_kind=windows_ama; server_count_label=How many Windows servers?; shared_population_group=windows-ama; requiredInfrastructure=[windows-firewall-logging, agent, dcr, dce, azure-arc]; ama_only=True. No generic sizingInputs/additionalDetails schema. |
| ai-analyst-darktrace | AI Analyst Darktrace | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| azure-cloud-ngfw-by-palo-alto-networks | Azure Cloud NGFW By Palo Alto Networks | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| barracuda-waf | Barracuda WAF | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| cisco-asa-2 | Cisco ASA | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| cisco-firepower-e-streamer | Cisco Firepower E Streamer | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| cisco-sd-wan | Cisco SD-WAN | AMA — Syslog/CEF | Mixed API + Syslog collector pack | A blend of API-fed content and Syslog/CEF-exported security events. | Serverless/API pieces plus Linux collector(s) for the Syslog/CEF portion. | Which log families arrive via API vs Syslog/CEF? Peak EPS for the collector side? Shared or dedicated collectors? Any intermediary such as Cribl? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| common-event-format | Common Event Format | AMA — Syslog/CEF | CEF collector pack | CEF-formatted security events from appliances or services into Sentinel. | Dedicated or shared Linux forwarder, AMA, DCR, parser/ASIM validation, optional Cribl or Pipeline. | How many sources send CEF? What is sustained and peak EPS or GB/day? TCP/UDP/TLS/6514? Dedicated vs shared forwarder? How many forwarders and where are they placed? | Partial: capacity_type=eps; ama_only=True; cribl_eligible=True. No generic sizingInputs/additionalDetails schema. |
| contrast-protect | Contrast Protect | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| delinea-secret-server | Delinea Secret Server | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| eset-security-management-center | Eset Security Management Center | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| esetprotect | ESETPROTECT | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| extra-hop-reveal-x | Extra Hop Reveal(x) | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| f5-networks | F5 Networks | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| forge-rock-common-audit-for-cef | Forge Rock Common Audit for CEF | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | Partial: cribl_eligible=True. No generic sizingInputs/additionalDetails schema. |
| fortinet-forti-web-cloud-waf-as-a-service-connector-for-microsoft-sentinel | Fortinet Forti Web Cloud WAF-as-a-Service connector for Microsoft Sentinel | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| iboss | iboss | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| illusive-platform | Illusive Platform | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| infoblox-soc-insights | Infoblox SOC Insights | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| iron-net-iron-defense | Iron Net Iron Defense | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| microsoft-sysmon-for-linux | Microsoft Sysmon For Linux | AMA — Syslog/CEF | Linux host AMA pack | Sysmon for Linux security events emitted from Linux endpoints. | Linux hosts or collectors, Sysmon config, AMA, DCR, optional shared forwarder/Cribl. | How many Linux hosts run Sysmon? Direct-host AMA or relay? Peak events/sec per host? Which Sysmon config profile? Any remote sites needing local collectors? | Partial: capacity_type=server_count; server_population_kind=linux; cribl_eligible=True. No generic sizingInputs/additionalDetails schema. |
| onapsis-platform | Onapsis Platform | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| one-identity | One Identity | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| ridge-security | Ridge Security | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| silverfort | Silverfort | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| linux-syslog | Syslog | AMA — Syslog/CEF | Syslog forwarder pack | RFC3164/RFC5424 Syslog from Linux hosts, appliances, or apps. | Linux forwarder(s) or direct-host AMA, DCR, facility/severity design, optional legacy MMA migration. | How many Linux servers/devices send Syslog? Which facilities/severities? Peak EPS/GB-day? Direct AMA on host or shared forwarder? Site/region distribution? | Partial: capacity_type=server_count; server_population_kind=linux; ama_only=True; cribl_eligible=True. No generic sizingInputs/additionalDetails schema. |
| v-armour-application-controller | v Armour Application Controller | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| v-mware-sase | V Mware SASE | AMA — Syslog/CEF | Mixed API + Syslog collector pack | A blend of API-fed content and Syslog/CEF-exported security events. | Serverless/API pieces plus Linux collector(s) for the Syslog/CEF portion. | Which log families arrive via API vs Syslog/CEF? Peak EPS for the collector side? Shared or dedicated collectors? Any intermediary such as Cribl? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| votiro | Votiro | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| watchguard-firebox | Watchguard Firebox | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| wire-x-network-forensics-platform | Wire X Network Forensics Platform | AMA — Syslog/CEF | Shared Syslog/CEF appliance pack | Security telemetry exported as Syslog or CEF from appliances, firewalls, WAFs, network or identity platforms. | Linux forwarder(s), AMA, DCR, port/protocol design, parser validation, optional Cribl/Pipeline. | How many appliances/tenants? Sustained and burst EPS or GB/day? TCP/UDP/TLS? Shared or dedicated collector? How many forwarders per site/region? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| with-secure-elements-via-connector | With Secure Elements Via Connector | AMA — Syslog/CEF | Mixed API + Syslog collector pack | A blend of API-fed content and Syslog/CEF-exported security events. | Serverless/API pieces plus Linux collector(s) for the Syslog/CEF portion. | Which log families arrive via API vs Syslog/CEF? Peak EPS for the collector side? Shared or dedicated collectors? Any intermediary such as Cribl? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| sysmon-via-ama | Sysmon via AMA | AMA — Windows Events | Mixed Sysmon pack | Sysmon events from Windows Event Logs and Sysmon for Linux feeds. | Windows hosts, Linux hosts/forwarders, AMA, Windows-event DCRs, Linux-Syslog DCRs, ASIM mapping. | How many Windows hosts and Linux hosts? Shared Linux collectors or direct-host AMA? Which Sysmon config profile? Peak EPS by platform? | Partial: requiredInfrastructure=[sysmon-windows, sysmon-linux, agent, windows-event-dcr, linux-syslog-dcr, azure-arc, asim]; ama_only=True. No generic sizingInputs/additionalDetails schema. |
| windows-dns-events-via-ama | Windows DNS Events via AMA | AMA — Windows Events | Windows DNS analytical pack | Windows DNS analytical / operational events collected from DNS servers. | DNS servers, analytical logging configuration, AMA, DCR, Azure Arc for non-Azure servers. | How many DNS servers? Recursive vs authoritative split? Query volume / expected EPS? Which channels enabled? Any filters or exclusions required? | Partial: requiredInfrastructure=[dns-server, dns-analytical-logging, agent, dcr, azure-arc]; ama_only=True. No generic sizingInputs/additionalDetails schema. |
| windows-forwarded-events | Windows Forwarded Events | AMA — Windows Events | WEC/WEF collector pack | ForwardedEvents collected on Windows Event Collector servers from upstream Windows sources. | WEC servers, WEF subscriptions, ForwardedEvents channel sizing, AMA, DCR, Azure Arc if needed. | How many WEC servers? How many forwarding clients per WEC? Current and peak EPS per collector? Reuse existing WEC or build new? Channel retention/size? | Partial: capacity_type=server_count; server_population_kind=wec; server_count_label=How many WEC servers?; requiredInfrastructure=[windows-event-collector, wef-subscription-design, forwarded-events-channel-sizing, collector-topology-planning, agent, dcr, azure-arc]; ama_only=True; cribl_eligible=True. No generic sizingInputs/additionalDetails schema. |
| windows-forwarded-events-via-ama | Windows Forwarded Events via AMA | AMA — Windows Events | WEC/WEF collector pack | ForwardedEvents collected on Windows Event Collector servers from upstream Windows sources. | WEC servers, WEF subscriptions, ForwardedEvents channel sizing, AMA, DCR, Azure Arc if needed. | How many WEC servers? How many forwarding clients per WEC? Current and peak EPS per collector? Reuse existing WEC or build new? Channel retention/size? | Partial: capacity_type=server_count; server_population_kind=wec; server_count_label=How many WEC servers?; requiredInfrastructure=[windows-event-collector, wef-subscription-design, forwarded-events-channel-sizing, collector-topology-planning, agent, dcr, azure-arc]; ama_only=True. No generic sizingInputs/additionalDetails schema. |
| windows-security-events | Windows Security Events | AMA — Windows Events | Windows AMA event pack | Windows Event Log data collected directly from in-scope Windows hosts. | Windows hosts, AMA, DCR, selected event set/XPath, Azure Arc for non-Azure hosts. | How many Windows hosts? Azure vs Arc split? Which event set/channel scope? Expected EPS or daily GB? Any private-link/DCE requirements? | Partial: capacity_type=server_count; server_population_kind=windows_ama; server_count_label=How many Windows servers?; shared_population_group=windows-ama; requiredInfrastructure=[windows-host-readiness, windows-security-audit-policy, windows-security-event-set-selection, agent, dcr, azure-arc]; ama_only=True; cribl_eligible=True. No generic sizingInputs/additionalDetails schema. |
| windows-server-dns | Windows Server DNS | AMA — Windows Events | Windows DNS analytical pack | Windows DNS analytical / operational events collected from DNS servers. | DNS servers, analytical logging configuration, AMA, DCR, Azure Arc for non-Azure servers. | How many DNS servers? Recursive vs authoritative split? Query volume / expected EPS? Which channels enabled? Any filters or exclusions required? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |
| cribl-stream | Cribl Stream | Cribl / Intermediary | Cribl intermediary pack | Telemetry routed through Cribl Stream before Azure Monitor / Sentinel. | Cribl leader/worker nodes, routes/pipelines, buffering, destination DCR/DCE or Logs Ingestion configuration. | How many source streams and peak EPS/GB-day? Current Cribl node count? HA mode and buffering targets? Regional placement? Output format to Sentinel? | None beyond planner/onboarding text. No generic sizingInputs/additionalDetails schema. |

## 4. Gap Analysis (what exists vs. what is missing)

### What already exists in the app

- `js/modules/capacity.js` only understands **`capacity_type: server_count`** and **`capacity_type: eps`** plus a few supporting fields (`server_population_kind`, `shared_population_group`, `server_count_label`).
- The current UX already has special handling for **Windows AMA pools**, **WEC sizing**, **Linux server counts**, and **EPS-based firewall sizing**, but it does **not** have a generic connector-detail schema.
- `grep` over the repo found **no `sizingInputs` field and no `additionalDetails` field** anywhere in the current catalog.
- `requiredInfrastructure` exists on only a handful of Windows-family entries and is currently descriptive, not an interactive question model.

### Connectors with some structured sizing/detail signals already present

| Connector | Existing structured signals | What is still missing |
| --- | --- | --- |
| Common Event Format | capacity_type=eps, ama_only=True, cribl_eligible=True | no population kind / field pack binding; no requiredInfrastructure list; no generic sizingInputs/additionalDetails schema |
| Microsoft Sysmon For Linux | capacity_type=server_count, server_population_kind=linux, cribl_eligible=True | no requiredInfrastructure list; no generic sizingInputs/additionalDetails schema |
| Syslog | capacity_type=server_count, server_population_kind=linux, ama_only=True, cribl_eligible=True | no requiredInfrastructure list; no generic sizingInputs/additionalDetails schema |
| Sysmon via AMA | requiredInfrastructure=[sysmon-windows, sysmon-linux, agent, windows-event-dcr, linux-syslog-dcr, azure-arc, asim], ama_only=True | no capacity_type; no population kind / field pack binding; no user-facing prompt label; no generic sizingInputs/additionalDetails schema |
| Windows DNS Events via AMA | requiredInfrastructure=[dns-server, dns-analytical-logging, agent, dcr, azure-arc], ama_only=True | no capacity_type; no population kind / field pack binding; no user-facing prompt label; no generic sizingInputs/additionalDetails schema |
| Windows Firewall | capacity_type=server_count, server_population_kind=windows_ama, server_count_label=How many Windows servers?, shared_population_group=windows-ama, cribl_eligible=True | no requiredInfrastructure list; no generic sizingInputs/additionalDetails schema |
| Windows Firewall via AMA | capacity_type=server_count, server_population_kind=windows_ama, server_count_label=How many Windows servers?, shared_population_group=windows-ama, requiredInfrastructure=[windows-firewall-logging, agent, dcr, dce, azure-arc], ama_only=True | no generic sizingInputs/additionalDetails schema |
| Windows Forwarded Events | capacity_type=server_count, server_population_kind=wec, server_count_label=How many WEC servers?, requiredInfrastructure=[windows-event-collector, wef-subscription-design, forwarded-events-channel-sizing, collector-topology-planning, agent, dcr, azure-arc], ama_only=True, cribl_eligible=True | no generic sizingInputs/additionalDetails schema |
| Windows Forwarded Events via AMA | capacity_type=server_count, server_population_kind=wec, server_count_label=How many WEC servers?, requiredInfrastructure=[windows-event-collector, wef-subscription-design, forwarded-events-channel-sizing, collector-topology-planning, agent, dcr, azure-arc], ama_only=True | no generic sizingInputs/additionalDetails schema |
| Windows Security Events | capacity_type=server_count, server_population_kind=windows_ama, server_count_label=How many Windows servers?, shared_population_group=windows-ama, requiredInfrastructure=[windows-host-readiness, windows-security-audit-policy, windows-security-event-set-selection, agent, dcr, azure-arc], ama_only=True, cribl_eligible=True | no generic sizingInputs/additionalDetails schema |

### Connectors still missing all structured sizing/detail metadata

| Category | Connectors still missing all structured sizing/detail metadata |
| --- | --- |
| AMA — Custom Logs | Radiflow, Security Bridge App, Vectra AI Stream |
| AMA — Syslog/CEF | AI Analyst Darktrace, Azure Cloud NGFW By Palo Alto Networks, Barracuda WAF, Cisco ASA, Cisco Firepower E Streamer, Cisco SD-WAN, Contrast Protect, Delinea Secret Server, ESETPROTECT, Eset Security Management Center, Extra Hop Reveal(x), F5 Networks, Forge Rock Common Audit for CEF, Fortinet Forti Web Cloud WAF-as-a-Service connector for Microsoft Sentinel, Illusive Platform, Infoblox SOC Insights, Iron Net Iron Defense, Onapsis Platform, One Identity, Ridge Security, Silverfort, V Mware SASE, Votiro, Watchguard Firebox, Wire X Network Forensics Platform, With Secure Elements Via Connector, iboss, v Armour Application Controller |
| AMA — Windows Events | Windows Server DNS |
| Cribl / Intermediary | Cribl Stream |

### Practical read-out

- The **Windows family** is the furthest along: Windows Security Events, Windows Forwarded Events, Windows Forwarded Events via AMA, Windows Firewall, and Windows Firewall via AMA already expose at least some structured hints.
- The **Syslog/CEF appliance estate** is the biggest gap: almost every vendor-specific collector-based connector still has **zero** structured sizing metadata despite clearly needing the same field pack.
- **Windows DNS via AMA** and **Sysmon via AMA** have descriptive infrastructure notes, but they still need a real field-pack binding and user-facing prompts.
- **Cribl Stream** is the clearest missing intermediary case: it needs detail fields, but the catalog currently has no Cribl-specific structured metadata at all.

## 5. Task Breakdown for Gantt

The work below is intentionally framed as **development tasks**, not research tasks. The sequence is optimized so the team builds reusable field packs once, then applies them across connector groups.

| Task name | Description | Effort | Dependencies | Priority | Target connectors |
| --- | --- | --- | --- | --- | --- |
| Define reusable connector detail schema | Add a catalog-level schema for field packs (asset count, throughput band, collector topology, protocol/port, region/site distribution, parsing notes, intermediary details) instead of relying only on capacity_type heuristics. | L | None | P0 | All size-needed connectors |
| Extend sizing UI and persistence model | Teach the planner to render reusable field packs, save values, and surface them in the topology/Gantt/export flows. Preserve existing server_count and eps flows as compatibility shims. | L | Define reusable connector detail schema | P0 | All size-needed connectors |
| Build the shared Syslog/CEF field pack | Create the reusable questions for device count, EPS/GB-day, protocol, dedicated vs shared collector, forwarder count, and site distribution. | M | Define reusable connector detail schema; Extend sizing UI and persistence model | P0 | Common Event Format, Syslog, Microsoft Sysmon for Linux, appliance/firewall connectors |
| Build the Windows AMA host field pack | Create reusable Windows-host questions for host count, Azure vs Arc split, event scope, expected volume, and DCR/DCE choices. | M | Define reusable connector detail schema; Extend sizing UI and persistence model | P0 | Windows Security Events, Windows DNS, Windows Firewall via AMA, Sysmon via AMA |
| Build the WEC / WEF field pack | Create a dedicated WEC collector editor covering WEC count, forwarding clients per collector, ForwardedEvents channel sizing, and collector placement. | M | Define reusable connector detail schema; Extend sizing UI and persistence model | P0 | Windows Forwarded Events, Windows Forwarded Events via AMA |
| Build the AMA custom-log field pack | Create reusable questions for host count, file path/channel, rotation/retention, expected file volume, and transformation/parsing needs. | M | Define reusable connector detail schema; Extend sizing UI and persistence model | P1 | Security Bridge App, Radiflow, Vectra AI Stream, Windows Firewall family |
| Build the Cribl intermediary field pack | Create reusable intermediary questions for Cribl node count, worker/leader mode, buffering, site placement, output format, and downstream DCR/DCE mapping. | M | Define reusable connector detail schema; Extend sizing UI and persistence model | P1 | Cribl Stream and any future intermediary patterns |
| Apply field packs to foundational high-usage connectors | Wire the new field packs into the most common AMA connectors first so the planner captures real sizing data where it matters most. | L | Build the shared Syslog/CEF field pack; Build the Windows AMA host field pack; Build the WEC / WEF field pack; Build the AMA custom-log field pack; Build the Cribl intermediary field pack | P0 | Common Event Format, Syslog, Windows Security Events, Windows Forwarded Events, Windows Firewall via AMA, Windows DNS Events via AMA, Sysmon via AMA, Cribl Stream |
| Roll out high-volume firewall and appliance connectors | Attach the shared Syslog/CEF field pack to the most commonly deployed network-security connectors and map them to the right collector archetype. | L | Apply field packs to foundational high-usage connectors | P1 | Azure Cloud NGFW, Cisco ASA, Cisco Firepower, F5 Networks, Watchguard Firebox, Barracuda WAF, Fortinet FortiWeb Cloud WAF, iboss, ExtraHop Reveal(x) |
| Roll out medium-usage identity and platform Syslog connectors | Extend the Syslog/CEF field pack to identity, PAM, and application-security connectors that reuse the same collector pattern but need vendor-specific labels. | M | Roll out high-volume firewall and appliance connectors | P2 | Delinea Secret Server, ForgeRock Common Audit for CEF, One Identity, Silverfort, Infoblox SOC Insights, ESET connectors, VMware SASE, WithSecure Elements via Connector |
| Roll out low-volume and niche connectors | Finish the remaining niche OT/app connectors and clean up the dual-mode legacy entries so every size-needed connector has a field-pack assignment. | M | Roll out medium-usage identity and platform Syslog connectors | P3 | Illusive Platform, IronNet Iron Defense, vArmour Application Controller, WireX Network Forensics Platform, Votiro, Contrast Protect, Onapsis Platform, Ridge Security, Windows Server DNS, legacy dual-mode entries |
| Validate topology, export, and Gantt outputs | Show the captured sizing data in topology summaries, Gantt task descriptions, and exports; add QA coverage for field-pack rendering and saved-state replay. | M | Apply field packs to foundational high-usage connectors; Roll out high-volume firewall and appliance connectors; Roll out medium-usage identity and platform Syslog connectors; Roll out low-volume and niche connectors | P1 | Planner UI, exports, topology, saved-session flows |

### Suggested rollout order

1. **Build the reusable data model and UI once** (schema + persistence + field packs).
2. **Land the foundational connectors** that define the patterns for everyone else: Syslog, CEF, Windows Security Events, Windows Forwarded Events, Windows Firewall via AMA, Windows DNS via AMA, Sysmon via AMA, Cribl Stream.
3. **Roll out high-volume appliance connectors** next because they deliver the largest planning benefit with the lowest incremental engineering cost once the shared Syslog/CEF pack exists.
4. **Finish medium and low-usage connectors** after the field packs are stable and visible in topology/export flows.

## Appendix: Low-confidence no-sizing classifications

These connectors were classified as no-sizing because nothing in `solutions.json` suggested customer-managed collectors, but the catalog only described them in generic “export path / API connection / cloud-native integration” terms. They are worth spot-checking against their connector definition files before implementation:

ARGOS Cloud Security, AWS Access Logs, AWS EKS, AWS ELB, AWS Security Hub, AWS VPC Flow Logs, Alibaba Cloud Action Trail, Alibaba Cloud Networking, Amazon Web Services, Amazon Web Services Route 53, Cohesity Security, Datawiza, Fortinet Forti NDR Cloud, Google Cloud Platform Audit Logs, Google Cloud Platform Firewall Logs, Google Cloud Platform Load Balancer Logs, Google Cloud Platform Security Command Center, Google Cloud Platform VPC Flow Logs, Google Kubernetes Engine, Lookout Cloud Security Platform for Microsoft Sentinel, Obsidian Datasharing, Onapsis Defend, RSAID Plus Admin Logs Connector, SAP BTP, SAP ETD Cloud, SAP Log Serv, SAP S4 Cloud Public Edition, Synqly Integration Connector, Vectra XDR, Virtual Metric Data Stream
