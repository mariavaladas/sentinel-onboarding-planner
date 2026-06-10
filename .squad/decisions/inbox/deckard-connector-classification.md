# Deckard analysis — connector ingestion classification

- **Analyzed file:** `data/solutions.json`
- **Timestamp:** `2026-06-03T15:56:12+02:00`
- **Scope:** 332 entries where `is_connector: true`

## Decision summary

- I treated the **native/default ingestion path** in connector metadata as the primary category.
- **Cribl** is handled as an **overlay** for eligible connectors, because most connectors are not natively intermediary-based even when the app can route them through Cribl.
- Result: **only AMA-style connectors currently surface sizing fields in the app**. No first-party or hybrid connector currently shows sizing fields.

## Counts by primary category

| Category | Count | App sizing status |
| --- | ---: | --- |
| First-Party / API-based | 35 | 0 with sizing |
| AMA-based (Azure Monitor Agent) | 50 | 25 with sizing, 25 missing |
| Intermediary | 1 | 0 with standard sizing |
| Hybrid / Other | 246 | 0 with sizing |
| **Total** | **332** |  |

## AMA sizing coverage callout

- **AMA connectors already sized in the app:** 25
- **AMA connectors still missing sizing in the app:** 25
- **Cribl overlay eligible connectors in the app:** 11

### AMA connectors already sized in app

- Azure Cloud NGFW By Palo Alto Networks
- Barracuda WAF
- Cisco Firepower E Streamer
- Common Event Format
- Cortex XDR
- Eset Security Management Center
- ESETPROTECT
- F5 Networks
- Fortinet Forti Web Cloud WAF-as-a-Service connector for Microsoft Sentinel
- Imperva Cloud WAF
- Imperva WAF Gateway
- Microsoft Sysmon For Linux
- Palo Alto Cortex XDR CCP
- Palo Alto Cortex Xpanse CCF
- Syslog
- Sysmon via AMA
- Watchguard Firebox
- Windows DNS Events via AMA
- Windows Firewall
- Windows Firewall via AMA
- Windows Forwarded Events
- Windows Forwarded Events via AMA
- Windows Security Events
- Windows Server DNS
- Zscaler Internet Access

### AMA connectors missing sizing in app

- AI Analyst Darktrace
- ALC-Web CTRL
- Cisco ASA
- Cisco SD-WAN
- Contrast Protect
- Delinea Secret Server
- Extra Hop Reveal(x)
- Forescout (Legacy)
- Forge Rock Common Audit for CEF
- iboss
- Illusive Platform
- Infoblox SOC Insights
- Iron Net Iron Defense
- Onapsis Platform
- One Identity
- Radiflow
- Ridge Security
- Security Bridge App
- Silverfort
- v Armour Application Controller
- V Mware SASE
- Vectra AI Stream
- Votiro
- Wire X Network Forensics Platform
- With Secure Elements Via Connector

### Cribl overlay eligible connectors

- Amazon Web Services Network Firewall — current primary classification: Hybrid / Other
- Azure Firewall — current primary classification: First-Party / API-based
- Azure Web Application Firewall (WAF) — current primary classification: First-Party / API-based
- Common Event Format — current primary classification: AMA-based (Azure Monitor Agent)
- Forge Rock Common Audit for CEF — current primary classification: AMA-based (Azure Monitor Agent)
- Google Cloud Platform Firewall Logs — current primary classification: Hybrid / Other
- Microsoft Sysmon For Linux — current primary classification: AMA-based (Azure Monitor Agent)
- Syslog — current primary classification: AMA-based (Azure Monitor Agent)
- Windows Firewall — current primary classification: AMA-based (Azure Monitor Agent)
- Windows Forwarded Events — current primary classification: AMA-based (Azure Monitor Agent)
- Windows Security Events — current primary classification: AMA-based (Azure Monitor Agent)

## First-Party / API-based (35)

These are Microsoft/Azure-native cloud connectors. They do **not** need customer sizing fields.

| Connector | Ingestion mechanism indicator | Sizing fields in app | Notes |
| --- | --- | --- | --- |
| Agent 365 | Microsoft 365 service API / service-native connector | No |  |
| Azure Activity | Azure Diagnostic Settings / Azure-native telemetry | No |  |
| Azure Batch Account | Azure Diagnostic Settings / Azure-native telemetry | No |  |
| Azure Cognitive Search | Azure Diagnostic Settings / Azure-native telemetry | No |  |
| Azure DDoS Protection | Azure-native service connector / diagnostic pipeline | No |  |
| Azure DevOps Auditing | Azure-native service connector / diagnostic pipeline | No |  |
| Azure Event Hubs | Azure Diagnostic Settings / Azure-native telemetry | No |  |
| Azure Firewall | Azure-native service connector / diagnostic pipeline | No | Cribl overlay supported in app |
| Azure Key Vault | Azure-native service connector / diagnostic pipeline | No |  |
| Azure Kubernetes Service | Azure-native service connector / diagnostic pipeline | No |  |
| Azure Logic Apps | Azure Diagnostic Settings / Azure-native telemetry | No |  |
| Azure Network Security Groups | Azure Diagnostic Settings / Azure-native telemetry | No |  |
| Azure Resource Graph | Azure-native service connector / diagnostic pipeline | No |  |
| Azure Service Bus | Azure Diagnostic Settings / Azure-native telemetry | No |  |
| Azure SQL Database Solution for Sentinel | Azure-native service connector / diagnostic pipeline | No |  |
| Azure Storage | Azure-native service connector / diagnostic pipeline | No |  |
| Azure Stream Analytics | Azure Diagnostic Settings / Azure-native telemetry | No |  |
| Azure Web Application Firewall (WAF) | Azure-native service connector / diagnostic pipeline | No | Cribl overlay supported in app |
| Microsoft 365 | Microsoft 365 service API / service-native connector | No |  |
| Microsoft 365 Assets | Microsoft 365 service API / service-native connector | No |  |
| Microsoft Business Applications | Microsoft 365 service API / service-native connector | No |  |
| Microsoft Copilot | Microsoft 365 service API / service-native connector | No |  |
| Microsoft Defender for Cloud | Microsoft Defender service API | No |  |
| Microsoft Defender for Cloud Apps | Microsoft Defender service API | No |  |
| Microsoft Defender For Endpoint | Microsoft Defender service API | No |  |
| Microsoft Defender for Identity | Microsoft Defender service API | No |  |
| Microsoft Defender for Office 365 | Microsoft Defender service API | No |  |
| Microsoft Defender XDR | Microsoft Defender service API | No |  |
| Microsoft Entra ID | Azure Diagnostic Settings / Azure-native telemetry | No |  |
| Microsoft Entra ID Assets | Microsoft 365 service API / service-native connector | No |  |
| Microsoft Entra ID Protection | Entra / identity service API | No |  |
| Microsoft Power BI | Microsoft 365 service API / service-native connector | No |  |
| Microsoft Project | Microsoft 365 service API / service-native connector | No |  |
| Microsoft Purview | Microsoft 365 service API / service-native connector | No |  |
| Microsoft Purview Information Protection | Microsoft 365 service API / service-native connector | No |  |

## AMA-based (Azure Monitor Agent) (50)

These connectors rely on AMA, a forwarder, Windows Event Collector, or an AMA-backed custom-log path. These **do** need source/forwarder sizing details.

| Connector | Ingestion mechanism indicator | Sizing fields in app | Notes |
| --- | --- | --- | --- |
| AI Analyst Darktrace | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| ALC-Web CTRL | Agent + DCR / forwarder pattern | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Azure Cloud NGFW By Palo Alto Networks | CEF via AMA / Syslog forwarder | Yes |  |
| Barracuda WAF | Syslog via AMA / Linux forwarder | Yes |  |
| Cisco ASA | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Cisco Firepower E Streamer | Syslog via AMA / Linux forwarder | Yes |  |
| Cisco SD-WAN | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Common Event Format | Syslog via AMA / Linux forwarder | Yes | Cribl overlay supported in app |
| Contrast Protect | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Cortex XDR | Syslog via AMA / Linux forwarder | Yes |  |
| Delinea Secret Server | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Eset Security Management Center | Syslog via AMA / Linux forwarder | Yes |  |
| ESETPROTECT | Syslog via AMA / Linux forwarder | Yes |  |
| Extra Hop Reveal(x) | CEF via AMA / Syslog forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| F5 Networks | Syslog via AMA / Linux forwarder | Yes |  |
| Forescout (Legacy) | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Forge Rock Common Audit for CEF | Syslog via AMA / Linux forwarder | No | Cribl overlay supported in app; AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Fortinet Forti Web Cloud WAF-as-a-Service connector for Microsoft Sentinel | Syslog via AMA / Linux forwarder | Yes |  |
| iboss | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Illusive Platform | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Imperva Cloud WAF | Syslog via AMA / Linux forwarder | Yes |  |
| Imperva WAF Gateway | Syslog via AMA / Linux forwarder | Yes |  |
| Infoblox SOC Insights | CEF via AMA / Syslog forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Iron Net Iron Defense | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Microsoft Sysmon For Linux | Syslog via AMA / Linux forwarder | Yes | Cribl overlay supported in app |
| Onapsis Platform | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| One Identity | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Palo Alto Cortex XDR CCP | Syslog via AMA / Linux forwarder | Yes |  |
| Palo Alto Cortex Xpanse CCF | Syslog via AMA / Linux forwarder | Yes |  |
| Radiflow | Agent + DCR / forwarder pattern | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Ridge Security | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Security Bridge App | Custom Logs via AMA | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Silverfort | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Syslog | Syslog via AMA / Linux forwarder | Yes | Cribl overlay supported in app |
| Sysmon via AMA | Syslog via AMA / Linux forwarder | Yes |  |
| v Armour Application Controller | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| V Mware SASE | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Vectra AI Stream | Legacy Log Analytics agent with AMA migration path | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Votiro | CEF via AMA / Syslog forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Watchguard Firebox | Syslog via AMA / Linux forwarder | Yes |  |
| Windows DNS Events via AMA | Windows DNS via AMA / legacy agent path | Yes |  |
| Windows Firewall | Windows Firewall via AMA | Yes | Cribl overlay supported in app |
| Windows Firewall via AMA | Windows Firewall via AMA | Yes |  |
| Windows Forwarded Events | Windows Event Collector / Windows events via AMA | Yes | Cribl overlay supported in app |
| Windows Forwarded Events via AMA | Windows Event Collector / Windows events via AMA | Yes |  |
| Windows Security Events | Windows Security Events via AMA / legacy agent path | Yes | Cribl overlay supported in app |
| Windows Server DNS | Windows DNS via AMA / legacy agent path | Yes |  |
| Wire X Network Forensics Platform | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| With Secure Elements Via Connector | Syslog via AMA / Linux forwarder | No | AMA/custom-log path is present, but the app does not currently prompt for sizing |
| Zscaler Internet Access | Syslog via AMA / Linux forwarder | Yes |  |

## Intermediary (1)

This is the native intermediary connector bucket. Most Cribl-capable connectors stay in their native bucket and use Cribl only as an overlay.

| Connector | Ingestion mechanism indicator | Sizing fields in app | Notes |
| --- | --- | --- | --- |
| Cribl | Intermediary processing engine (Cribl) | No (Cribl-specific controls exist, but no sizing card) | `cribl-stream` also exists in solutions.json, but it is not counted in the 332 connectors because it is not flagged `is_connector:true` |

## Hybrid / Other (246)

These connectors do not fit the pure first-party or AMA pattern. Most are REST API, codeless, Azure Function, HTTP Data Collector, or other custom ingestion approaches.

| Connector | Ingestion mechanism indicator | Sizing fields in app | Notes |
| --- | --- | --- | --- |
| 1 Password | Azure Function-backed connector | No |  |
| 42 Crunch API Protection | Service API / connector-specific ingestion | No |  |
| Abnormal Security | Azure Function-backed connector | No |  |
| Agari | Service API / connector-specific ingestion | No |  |
| Agile Sec Analytics Connector | HTTP Data Collector API | No |  |
| AI Shield AI Security Monitoring | HTTP Data Collector API | No |  |
| Alibaba Cloud | REST API polling / pull-based ingestion | No |  |
| Alibaba Cloud Action Trail | Service API / connector-specific ingestion | No |  |
| Alibaba Cloud Networking | Service API / connector-specific ingestion | No |  |
| Alsid For AD | Service API / connector-specific ingestion | No |  |
| Amazon Web Services | Service API / connector-specific ingestion | No |  |
| Amazon Web Services Network Firewall | Cloud storage / queue integration | No | Cribl overlay supported in app |
| Amazon Web Services Route 53 | Service API / connector-specific ingestion | No |  |
| Anvilogic | Service API / connector-specific ingestion | No |  |
| ARGOS Cloud Security | Service API / connector-specific ingestion | No |  |
| Armis | REST API polling / pull-based ingestion | No |  |
| Armorblox | REST API polling / pull-based ingestion | No |  |
| Atlassian Confluence Audit | Service API / connector-specific ingestion | No |  |
| Atlassian Jira Audit | REST API polling / pull-based ingestion | No |  |
| Auth0 | Azure Function-backed connector | No |  |
| Authomize | Service API / connector-specific ingestion | No |  |
| AWS Access Logs | Service API / connector-specific ingestion | No |  |
| AWS Cloud Front | Cloud storage / queue integration | No |  |
| AWS EKS | Service API / connector-specific ingestion | No |  |
| AWS ELB | Service API / connector-specific ingestion | No |  |
| AWS Security Hub | Service API / connector-specific ingestion | No |  |
| AWS VPC Flow Logs | Service API / connector-specific ingestion | No |  |
| BETTER Mobile Threat Defense (MTD) | HTTP Data Collector API | No |  |
| Beyond Security be SECURE | HTTP Data Collector API | No |  |
| Beyond Trust PM Cloud | Azure Function-backed connector | No |  |
| Big ID | Service API / connector-specific ingestion | No |  |
| Bit Sight | Azure Function-backed connector | No |  |
| Bitglass | REST API polling / pull-based ingestion | No |  |
| Bitwarden | Service API / connector-specific ingestion | No |  |
| Blacklens | Logs Ingestion API | No |  |
| Blood Hound Enterprise | Service API / connector-specific ingestion | No |  |
| Box | REST API polling / pull-based ingestion | No |  |
| Check Point Cloud Guard CNAPP | Codeless Connector Platform (CCP) | No |  |
| Check Point Cyberint Alerts | Codeless Connector Platform (CCP) | No |  |
| Check Point Cyberint IOC | Service API / connector-specific ingestion | No |  |
| Cisco Duo Security | Azure Function-backed connector | No |  |
| Cisco ETD | Azure Function-backed connector | No |  |
| Cisco Meraki Events via REST API | REST API polling / pull-based ingestion | No |  |
| Cisco Secure Endpoint | Service API / connector-specific ingestion | No |  |
| Cisco Umbrella | REST API polling / pull-based ingestion | No |  |
| Citrix Analytics CCF | Logs Ingestion API | No |  |
| Citrix Analytics for Security | HTTP Data Collector API | No |  |
| Claroty x Dome | Service API / connector-specific ingestion | No |  |
| Cloudflare | Azure Function-backed connector | No |  |
| Cloudflare CCF | HTTP Data Collector API | No |  |
| Cofense Intelligence | Azure Function-backed connector | No |  |
| Cofense Triage | Service API / connector-specific ingestion | No |  |
| Cognni | HTTP Data Collector API | No |  |
| Cognyte Luminar | Service API / connector-specific ingestion | No |  |
| Cohesity Security | Service API / connector-specific ingestion | No |  |
| Commvault Security IQ | Azure Function-backed connector | No |  |
| Contrast ADR | Service API / connector-specific ingestion | No |  |
| Corelight | Other agent / collector pattern (non-explicit AMA) | No |  |
| Crowd Strike Falcon Endpoint Protection | Azure Function-backed connector | No |  |
| CTERA | Service API / connector-specific ingestion | No |  |
| Cybersixgill-Actionable-Alerts | Service API / connector-specific ingestion | No |  |
| Cyble Vision | Service API / connector-specific ingestion | No |  |
| Cyborg Security HUNTER | Service API / connector-specific ingestion | No |  |
| Cyera DSPM | Codeless Connector Platform (CCP) | No |  |
| Cyfirma Attack Surface | Service API / connector-specific ingestion | No |  |
| Cyfirma Brand Intelligence | Service API / connector-specific ingestion | No |  |
| Cyfirma Compromised Accounts | Service API / connector-specific ingestion | No |  |
| Cyfirma Cyber Intelligence | Service API / connector-specific ingestion | No |  |
| Cyfirma Digital Risk | Service API / connector-specific ingestion | No |  |
| Cyfirma Vulnerabilities Intel | Service API / connector-specific ingestion | No |  |
| Cyjax | REST API polling / pull-based ingestion | No |  |
| Cynerio | Service API / connector-specific ingestion | No |  |
| Cyren Threat Intelligence | REST API polling / pull-based ingestion | No |  |
| D3 Smart SOAR | Service API / connector-specific ingestion | No |  |
| Darktrace | Service API / connector-specific ingestion | No |  |
| Databahn | Service API / connector-specific ingestion | No |  |
| Datalake2 Sentinel | REST API polling / pull-based ingestion | No |  |
| Dataminr Pulse | Service API / connector-specific ingestion | No |  |
| Datawiza | Service API / connector-specific ingestion | No |  |
| Digital Shadows | REST API polling / pull-based ingestion | No |  |
| Doppel | Service API / connector-specific ingestion | No |  |
| Dragos | Service API / connector-specific ingestion | No |  |
| Druva Data Security Cloud | Codeless Connector Platform (CCP) | No |  |
| Dynamics 365 | Service API / connector-specific ingestion | No |  |
| Dynatrace | Logic Apps / serverless workflow | No |  |
| Egress Defend | Service API / connector-specific ingestion | No |  |
| Elastic Agent | Other agent / collector pattern (non-explicit AMA) | No |  |
| Ermes Browser Security | Service API / connector-specific ingestion | No |  |
| ESET Inspect | REST API polling / pull-based ingestion | No |  |
| ESET Protect Platform | REST API polling / pull-based ingestion | No |  |
| Extra Hop | Azure Function-backed connector | No |  |
| F5 Big-IP | HTTP Data Collector API | No |  |
| Feedly | Service API / connector-specific ingestion | No |  |
| Flare | HTTP Data Collector API | No |  |
| Forcepoint DLP | HTTP Data Collector API | No |  |
| Forescout eye Inspect for OT Security | Service API / connector-specific ingestion | No |  |
| Forescout Host Property Monitor | Service API / connector-specific ingestion | No |  |
| Fortinet Forti NDR Cloud | Service API / connector-specific ingestion | No |  |
| Garrison ULTRA | Service API / connector-specific ingestion | No |  |
| Gigamon Connector | HTTP Data Collector API | No |  |
| Google Apigee | Azure Function-backed connector | No |  |
| Google Cloud Platform Audit Logs | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform CDN | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform Cloud Monitoring | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform Cloud Run | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform Compute Engine | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform DNS | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform Firewall Logs | Service API / connector-specific ingestion | No | Cribl overlay supported in app |
| Google Cloud Platform IAM | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform IDS | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform Load Balancer Logs | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform NAT | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform Resource Manager | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform Security Command Center | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform SQL | Service API / connector-specific ingestion | No |  |
| Google Cloud Platform VPC Flow Logs | Service API / connector-specific ingestion | No |  |
| Google Kubernetes Engine | Service API / connector-specific ingestion | No |  |
| Google Workspace Reports | Service API / connector-specific ingestion | No |  |
| Gravity Zone | Service API / connector-specific ingestion | No |  |
| Grey Noise Threat Intelligence | Service API / connector-specific ingestion | No |  |
| Halcyon | Service API / connector-specific ingestion | No |  |
| Holm Security | Azure Function-backed connector | No |  |
| HYAS Protect | Service API / connector-specific ingestion | No |  |
| I Pinfo | Azure Function-backed connector | No |  |
| Illumio Insight | Codeless Connector Platform (CCP) | No |  |
| Infoblox | Service API / connector-specific ingestion | No |  |
| Integration for Atlassian Beacon | HTTP Data Collector API | No |  |
| Io TOT Threat Monitoringwith Defenderfor Io T | Codeless Connector Platform (CCP) | No |  |
| IONIX | Codeless Connector Platform (CCP) | No |  |
| Island | Codeless Connector Platform (CCP) | No |  |
| Jamf Protect | Service API / connector-specific ingestion | No |  |
| Joe Sandbox | Service API / connector-specific ingestion | No |  |
| Keeper Security | Service API / connector-specific ingestion | No |  |
| Know Be4 Defend | Service API / connector-specific ingestion | No |  |
| Lastpass Enterprise Activity Monitoring | Codeless Connector Platform (CCP) | No |  |
| Lookout | Codeless Connector Platform (CCP) | No |  |
| Lookout Cloud Security Platform for Microsoft Sentinel | Service API / connector-specific ingestion | No |  |
| Lumen Defender Threat Feed | Service API / connector-specific ingestion | No |  |
| Mail Risk | REST API polling / pull-based ingestion | No |  |
| mesh Stack | Service API / connector-specific ingestion | No |  |
| Microsoft Exchange Security - Exchange On-Premises | Mixed on-prem Windows event logs + custom ingestion | No |  |
| Microsoft Exchange Security - Exchange Online | REST API polling / pull-based ingestion | No |  |
| Mimecast | Azure Function-backed connector | No |  |
| Mimecast Audit | Azure Function-backed connector | No |  |
| Mimecast SEG | Azure Function-backed connector | No |  |
| Mimecast TI Regional | Azure Function-backed connector | No |  |
| Mimecast TTP | Azure Function-backed connector | No |  |
| Miro | REST API polling / pull-based ingestion | No |  |
| MISP2 Sentinel | REST API polling / pull-based ingestion | No |  |
| Mongo DB Atlas | Service API / connector-specific ingestion | No |  |
| Morphisec | Service API / connector-specific ingestion | No |  |
| Mulesoft | REST API polling / pull-based ingestion | No |  |
| NC Protect Data Connector | Service API / connector-specific ingestion | No |  |
| Net Clean Pro Active | HTTP Data Collector API | No |  |
| Netskope | Azure Function-backed connector | No |  |
| Netskope Web Tx | Service API / connector-specific ingestion | No |  |
| Netskopev2 | Azure Function-backed connector | No |  |
| Noname API Security Solution for Microsoft Sentinel | Service API / connector-specific ingestion | No |  |
| Nord Pass | Azure Function-backed connector | No |  |
| Obsidian Datasharing | Service API / connector-specific ingestion | No |  |
| Onapsis Defend | Service API / connector-specific ingestion | No |  |
| One Trust | Service API / connector-specific ingestion | No |  |
| OneLogin IAM | Service API / connector-specific ingestion | No |  |
| Open AI | Service API / connector-specific ingestion | No |  |
| Oracle Cloud Infrastructure | REST API polling / pull-based ingestion | No |  |
| Orca Security Alerts | HTTP Data Collector API | No |  |
| Palo Alto Prisma Cloud | HTTP Data Collector API | No |  |
| Palo Alto Prisma Cloud CWPP | Codeless Connector Platform (CCP) | No |  |
| Pathlock T Dn R | Service API / connector-specific ingestion | No |  |
| Perimeter 81 | HTTP Data Collector API | No |  |
| Phosphorus | Codeless Connector Platform (CCP) | No |  |
| Ping One | Service API / connector-specific ingestion | No |  |
| Proof Point Tap | Service API / connector-specific ingestion | No |  |
| Proofpoint On demand(POD) Email Security | Service API / connector-specific ingestion | No |  |
| Qualys VM Knowledgebase | Azure Function-backed connector | No |  |
| Quokka | Service API / connector-specific ingestion | No |  |
| Rapid7 InsightVM | Azure Function-backed connector | No |  |
| Red Sift | Service API / connector-specific ingestion | No |  |
| RSAID Plus Admin Logs Connector | Service API / connector-specific ingestion | No |  |
| Rubrik Security Cloud | Azure Function-backed connector | No |  |
| Sail Point Identity Now | REST API polling / pull-based ingestion | No |  |
| Salesforce Service Cloud | Service API / connector-specific ingestion | No |  |
| Samsung Knox Asset Intelligence | Service API / connector-specific ingestion | No |  |
| SAP BTP | Service API / connector-specific ingestion | No |  |
| SAP ETD Cloud | Service API / connector-specific ingestion | No |  |
| SAP Log Serv | Service API / connector-specific ingestion | No |  |
| SAP S4 Cloud Public Edition | Service API / connector-specific ingestion | No |  |
| Security Scorecard Cybersecurity Ratings | Azure Function-backed connector | No |  |
| Semperis Directory Services Protector | Other agent / collector pattern (non-explicit AMA) | No |  |
| Semperis Lightning | Service API / connector-specific ingestion | No |  |
| Senserva Pro | HTTP Data Collector API | No |  |
| Sentinel One | Azure Function-backed connector | No |  |
| Seraphic Security | Service API / connector-specific ingestion | No |  |
| Sevco Security | Service API / connector-specific ingestion | No |  |
| SIGNL4 | Service API / connector-specific ingestion | No |  |
| SINEC Security Guard | Service API / connector-specific ingestion | No |  |
| Slash Next | Azure Function-backed connector | No |  |
| Snowflake | Service API / connector-specific ingestion | No |  |
| SOC Prime CCF | Codeless Connector Platform (CCP) | No |  |
| Sonrai Security | REST API polling / pull-based ingestion | No |  |
| Sophos Cloud Optix | HTTP Data Collector API | No |  |
| Sophos Endpoint Protection | Codeless Connector Platform (CCP) | No |  |
| Squadra Technologies Sec Rmm | Service API / connector-specific ingestion | No |  |
| Strider Shield | Service API / connector-specific ingestion | No |  |
| Styx Intelligence | Service API / connector-specific ingestion | No |  |
| Symantec Integrated Cyber Defense | HTTP Data Collector API | No |  |
| Synqly Integration Connector | Service API / connector-specific ingestion | No |  |
| Tacit Red Threat Intelligence | REST API polling / pull-based ingestion | No |  |
| Talon | HTTP Data Collector API | No |  |
| Tanium | Service API / connector-specific ingestion | No |  |
| Team Cymru Scout | Service API / connector-specific ingestion | No |  |
| Tenable App | REST API polling / pull-based ingestion | No |  |
| Tenable IO | REST API polling / pull-based ingestion | No |  |
| The Hive | Azure Function-backed connector | No |  |
| Theom | HTTP Data Collector API | No |  |
| Threat Intelligence | Service API / connector-specific ingestion | No |  |
| Threat Intelligence (NEW) | Service API / connector-specific ingestion | No |  |
| Threat Intelligence Solution for Azure Government | Service API / connector-specific ingestion | No |  |
| Transmit Security | REST API polling / pull-based ingestion | No |  |
| Trellix | Service API / connector-specific ingestion | No |  |
| Trend Micro Cloud App Security | Azure Function-backed connector | No |  |
| Trend Micro Vision One | HTTP Data Collector API | No |  |
| Tropico | Service API / connector-specific ingestion | No |  |
| Upwind | Azure Function-backed connector | No |  |
| V Mware Carbon Black Cloud | Azure Function-backed connector | No |  |
| Vaikora-Sentinel | REST API polling / pull-based ingestion | No |  |
| Valence Security | Service API / connector-specific ingestion | No |  |
| Valimail Enforce | Service API / connector-specific ingestion | No |  |
| Varonis Purview | Service API / connector-specific ingestion | No |  |
| Varonis Saa S | Azure Function-backed connector | No |  |
| Vectra XDR | Service API / connector-specific ingestion | No |  |
| Versasec CMS | REST API polling / pull-based ingestion | No |  |
| Virtual Metric Data Stream | Service API / connector-specific ingestion | No |  |
| Visa Threat Intelligence (VTI) | Service API / connector-specific ingestion | No |  |
| VM Ray | Service API / connector-specific ingestion | No |  |
| With Secure Elements Via Function | Azure Function-backed connector | No |  |
| Wiz | REST API polling / pull-based ingestion | No |  |
| Workday | Codeless Connector Platform (CCP) | No |  |
| Workplace from Facebook | Azure Function-backed connector | No |  |
| XBOW | Azure Function-backed connector | No |  |
| Zero Fox | Azure Function-backed connector | No |  |
| Zero Fox Alerts | HTTP Data Collector API | No |  |
| Zero Fox Threat Intelligence | Logs Ingestion API | No |  |
| Zero Networks | REST API polling / pull-based ingestion | No |  |
| Zimperium Mobile Threat Defense | Service API / connector-specific ingestion | No |  |
| Zoom Reports | REST API polling / pull-based ingestion | No |  |

