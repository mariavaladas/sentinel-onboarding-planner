# Windows-family connector research — Luv

_Date:_ 2026-05-22  
_Scope:_ Windows Forwarded Events, Windows Firewall, Windows DNS Events via AMA, and Sysmon (Windows + Linux)

## Baseline I used
- Approved reference shape: `docs/connector-tasks-windows-security-events.md` + current `data/solutions.json` `windows-security-events` planner entry.
- Reused the same planning pattern: **Prerequisites → Infrastructure → Configuration → Validation → Handoff**.
- Reused the same Azure RBAC baseline where applicable:
  - **Monitoring Contributor** — create/edit DCRs
  - **Log Analytics Contributor** — workspace data source and workspace configuration changes
  - **Microsoft Sentinel Contributor** — connector setup in Sentinel
  - **Virtual Machine Contributor** or **Azure Connected Machine Resource Administrator** — deploy AMA / Arc on target hosts

> Duration defaults below assume a medium mixed estate and should scale up the same way Windows Security Events does.

---

## 1) Windows Forwarded Events (via AMA)

### Overview
| Item | Finding |
|---|---|
| What it does | Streams **Windows Event Forwarding (WEF)** logs from a **Windows Event Collector (WEC)** into Microsoft Sentinel using AMA |
| Official docs | `https://learn.microsoft.com/en-us/azure/sentinel/connect-services-windows-based` and official connector definition in Azure-Sentinel `Solutions/Windows Forwarded Events/Data Connectors/WindowsForwardedEvents.JSON` |
| Log Analytics table | **`WindowsEvent`** |
| Relevant channel | **`ForwardedEvents`** on the WEC server |
| DCR pattern | Windows agent-based DCR scoped to the **collector server**, using **All events** or **Custom XPath** |
| Special prerequisite | **WEC must already be enabled and receiving subscriptions** from source endpoints |
| Validation target | `WindowsEvent | where Channel == "ForwardedEvents" | take 10` |

### Connector-specific prerequisites
- WEC service enabled and running on the collector.
- WEF subscriptions and source-initiated or collector-initiated forwarding already configured.
- AMA installed on the **collector**, not on every forwarding source just for this connector.
- Azure Arc required if the collector is not an Azure VM.
- ASIM Windows Event parsers are recommended in the official Windows-based connector guidance.

### Relevant XPath / collection notes
- Default broad collection can use the **ForwardedEvents** channel.
- Example custom XPath for broad severity collection:

```text
ForwardedEvents!*[System[(Level=1 or Level=2 or Level=3 or Level=4)]]
```

- Use XPath 1.0 only.
- Prefer filtering at the WEF subscription layer first, then DCR XPath second, to avoid duplicate or noisy forwarding.

### Proposed task / subtask structure
```json
{
  "connector": "windows-forwarded-events",
  "phases": [
    {
      "name": "Prerequisites",
      "tasks": [
        {
          "id": "wfe-readiness-scope",
          "task": "Confirm WEC topology, pilot scope, workspace, and connectivity",
          "description": "Identify the WEC collector servers, confirm Microsoft Sentinel workspace readiness, and verify outbound 443 for AMA plus inbound WEF traffic from forwarders.",
          "required_roles": [
            "Azure Platform Admin (Log Analytics Contributor)",
            "Windows Server Admin"
          ],
          "duration_hours": 3,
          "dependencies": []
        },
        {
          "id": "wfe-verify-rbac",
          "task": "Verify Azure and host permissions",
          "description": "Confirm the deployment identity has Monitoring Contributor, Log Analytics Contributor, Microsoft Sentinel Contributor, and VM Contributor or Azure Connected Machine Resource Administrator as needed.",
          "required_roles": [
            "Azure Platform Admin",
            "Identity / RBAC Admin"
          ],
          "duration_hours": 0.5,
          "dependencies": ["wfe-readiness-scope"]
        }
      ]
    },
    {
      "name": "Infrastructure",
      "tasks": [
        {
          "id": "wfe-wec-prepare",
          "task": "Prepare or validate the Windows Event Collector",
          "description": "Enable WEC, confirm subscriptions are active, validate the ForwardedEvents channel is populated, and document whether GPO-based or collector-initiated subscriptions are in use.",
          "required_roles": [
            "Windows Server Admin",
            "Group Policy Admin"
          ],
          "duration_hours": 6,
          "dependencies": ["wfe-verify-rbac"],
          "subtasks": [
            {
              "id": "wfe-enable-wec",
              "task": "Enable and health-check WEC service",
              "duration_hours": 1.5,
              "dependencies": []
            },
            {
              "id": "wfe-validate-subscriptions",
              "task": "Validate active WEF subscriptions and event flow into ForwardedEvents",
              "duration_hours": 2,
              "dependencies": ["wfe-enable-wec"]
            },
            {
              "id": "wfe-gpo-source-check",
              "task": "Confirm endpoint forwarding policy / subscription targeting",
              "duration_hours": 2.5,
              "dependencies": ["wfe-validate-subscriptions"]
            }
          ]
        },
        {
          "id": "wfe-arc-ama",
          "task": "Onboard collector to Arc if needed and deploy AMA",
          "description": "If the collector is outside Azure, onboard it to Azure Arc first; then install or validate AMA on the WEC collector.",
          "required_roles": [
            "Azure Platform Admin (VM Contributor or Azure Connected Machine Resource Administrator)",
            "Windows Server Admin"
          ],
          "duration_hours": 4,
          "dependencies": ["wfe-wec-prepare"]
        }
      ]
    },
    {
      "name": "Configuration",
      "tasks": [
        {
          "id": "wfe-create-dcr",
          "task": "Create and associate the Forwarded Events DCR",
          "description": "Create the Windows-based AMA DCR for the collector, scope it to the WEC server, and choose All events or Custom XPath against the ForwardedEvents channel.",
          "required_roles": [
            "Azure Platform Admin (Monitoring Contributor, Log Analytics Contributor)",
            "Microsoft Sentinel Contributor"
          ],
          "duration_hours": 2,
          "dependencies": ["wfe-arc-ama"],
          "subtasks": [
            {
              "id": "wfe-dcr-scope",
              "task": "Add collector resources to the rule",
              "duration_hours": 0.5,
              "dependencies": []
            },
            {
              "id": "wfe-dcr-xpath",
              "task": "Define ForwardedEvents collection scope / XPath filters",
              "duration_hours": 1,
              "dependencies": ["wfe-dcr-scope"]
            },
            {
              "id": "wfe-dcr-apply",
              "task": "Apply DCR and confirm AMA association",
              "duration_hours": 0.5,
              "dependencies": ["wfe-dcr-xpath"]
            }
          ]
        }
      ]
    },
    {
      "name": "Validation",
      "tasks": [
        {
          "id": "wfe-validate-ingestion",
          "task": "Validate forwarded event ingestion and field quality",
          "description": "Confirm records arrive in WindowsEvent, verify the expected provider/event IDs are present, and confirm no duplicate collection from overlapping WEF or DCR scope.",
          "required_roles": [
            "SOC Engineer",
            "Azure Platform Admin"
          ],
          "duration_hours": 2,
          "dependencies": ["wfe-create-dcr"]
        }
      ]
    },
    {
      "name": "Operationalization",
      "tasks": [
        {
          "id": "wfe-handoff",
          "task": "Document collector ownership and WEF onboarding process",
          "description": "Capture WEC server ownership, subscription model, XPath filters, and the runbook for adding new forwarded log sources.",
          "required_roles": [
            "Windows Server Admin",
            "SOC Engineer"
          ],
          "duration_hours": 1.5,
          "dependencies": ["wfe-validate-ingestion"]
        }
      ]
    }
  ]
}
```

### Differences from Windows Security Events
- Collects from **`ForwardedEvents` on the collector**, not directly from the **Security** channel on every endpoint.
- Adds a hard prerequisite for **WEC / WEF infrastructure**.
- Uses **`WindowsEvent`**, not **`SecurityEvent`**.
- Best filtering split is **WEF subscription filtering first**, **DCR XPath second**.

### Recommended owners
- **Primary:** Windows Platform / Server Team
- **Azure owner:** Azure Platform Admin
- **Validation owner:** SOC Engineer

---

## 2) Windows Firewall (via AMA / Windows Defender Firewall logs)

### Overview
| Item | Finding |
|---|---|
| What it does | Collects **Windows Defender Firewall** log files via AMA for Sentinel analysis |
| Official docs | Azure Monitor firewall log collection doc `https://learn.microsoft.com/en-us/azure/azure-monitor/vm/data-collection-firewall-logs` + official connector template `Solutions/Windows Firewall/Data Connectors/template_WindowsFirewallAma.JSON` |
| Sentinel-normalized table | **`ASimNetworkSessionLogs`** (`EventProduct == "Windows Firewall"`) |
| Raw validation table | **`WindowsFirewall`** |
| Log source | **`C:\windows\system32\logfiles\firewall\pfirewall.log`** |
| DCR pattern | **Firewall Logs** data source in DCR; select domain/private/public profiles |
| Special connector behavior | Connector template notes a **DCE is automatically created** in the workspace region |
| Validation target | `ASimNetworkSessionLogs | where EventProduct == "Windows Firewall" | take 10` |

### Connector-specific prerequisites
- Firewall logging enabled on the required profiles.
- Logging of **allowed** and **dropped** connections enabled if the use case needs both.
- Security and Audit solution / table support present so `WindowsFirewall` exists for raw validation.
- Azure Arc required for non-Azure Windows servers.

### Relevant source details
- Official default firewall log path: `C:\windows\system32\logfiles\firewall\pfirewall.log`.
- DCR uses **Firewall Logs** data source rather than Windows Event Logs.
- Profile selection matters: **domain**, **private**, **public** should match the environment being monitored.

### Proposed task / subtask structure
```json
{
  "connector": "windows-firewall",
  "phases": [
    {
      "name": "Prerequisites",
      "tasks": [
        {
          "id": "wf-readiness-scope",
          "task": "Confirm firewall monitoring scope and workspace readiness",
          "description": "Define which Windows servers/workstations need firewall telemetry, confirm the workspace region, and verify whether the existing Security and Audit support is present for raw table validation.",
          "required_roles": [
            "Azure Platform Admin",
            "Network Security Engineer"
          ],
          "duration_hours": 2,
          "dependencies": []
        },
        {
          "id": "wf-verify-rbac",
          "task": "Verify Azure and host permissions",
          "description": "Confirm Monitoring Contributor, Log Analytics Contributor, Microsoft Sentinel Contributor, and VM Contributor or Azure Connected Machine Resource Administrator before connector rollout.",
          "required_roles": [
            "Azure Platform Admin",
            "Identity / RBAC Admin"
          ],
          "duration_hours": 0.5,
          "dependencies": ["wf-readiness-scope"]
        }
      ]
    },
    {
      "name": "Infrastructure",
      "tasks": [
        {
          "id": "wf-enable-source-logging",
          "task": "Enable Windows Defender Firewall logging on target profiles",
          "description": "Turn on firewall logging and confirm the pfirewall.log file is being written for the required profiles and actions.",
          "required_roles": [
            "Windows Server Admin",
            "Network Security Engineer"
          ],
          "duration_hours": 2,
          "dependencies": ["wf-verify-rbac"],
          "subtasks": [
            {
              "id": "wf-enable-profiles",
              "task": "Enable domain/private/public profile logging as required",
              "duration_hours": 1,
              "dependencies": []
            },
            {
              "id": "wf-allow-drop-settings",
              "task": "Enable allowed and dropped connection logging where needed",
              "duration_hours": 0.5,
              "dependencies": ["wf-enable-profiles"]
            },
            {
              "id": "wf-verify-log-file",
              "task": "Verify pfirewall.log timestamps and write activity",
              "duration_hours": 0.5,
              "dependencies": ["wf-allow-drop-settings"]
            }
          ]
        },
        {
          "id": "wf-arc-ama",
          "task": "Onboard non-Azure hosts if needed and deploy AMA",
          "description": "Use Azure Arc for non-Azure machines, then deploy or validate AMA on the Windows hosts that own the firewall logs.",
          "required_roles": [
            "Azure Platform Admin",
            "Windows Server Admin"
          ],
          "duration_hours": 4,
          "dependencies": ["wf-enable-source-logging"]
        }
      ]
    },
    {
      "name": "Configuration",
      "tasks": [
        {
          "id": "wf-create-dcr",
          "task": "Create DCR / DCE and associate firewall log collection",
          "description": "Create the AMA firewall log DCR, confirm or reuse the same-region DCE, and assign the DCR to the target Windows machines.",
          "required_roles": [
            "Azure Platform Admin (Monitoring Contributor, Log Analytics Contributor)",
            "Microsoft Sentinel Contributor"
          ],
          "duration_hours": 2,
          "dependencies": ["wf-arc-ama"],
          "subtasks": [
            {
              "id": "wf-dce-check",
              "task": "Confirm auto-created or existing DCE in workspace region",
              "duration_hours": 0.5,
              "dependencies": []
            },
            {
              "id": "wf-dcr-source",
              "task": "Configure Firewall Logs data source and target profiles",
              "duration_hours": 1,
              "dependencies": ["wf-dce-check"]
            },
            {
              "id": "wf-dcr-associate",
              "task": "Associate DCR to target machines",
              "duration_hours": 0.5,
              "dependencies": ["wf-dcr-source"]
            }
          ]
        }
      ]
    },
    {
      "name": "Validation",
      "tasks": [
        {
          "id": "wf-validate-ingestion",
          "task": "Validate raw and normalized firewall telemetry",
          "description": "Verify recent records in WindowsFirewall and ASimNetworkSessionLogs, confirm EventProduct = Windows Firewall, and check that expected allowed/dropped actions are present.",
          "required_roles": [
            "SOC Engineer",
            "Network Security Engineer"
          ],
          "duration_hours": 2,
          "dependencies": ["wf-create-dcr"]
        }
      ]
    },
    {
      "name": "Operationalization",
      "tasks": [
        {
          "id": "wf-tune-handoff",
          "task": "Tune profile scope and document log ownership",
          "description": "Reduce unnecessary collection by narrowing profiles where possible, document the firewall logging standard, and hand off validation queries to the SOC.",
          "required_roles": [
            "Network Security Engineer",
            "SOC Engineer"
          ],
          "duration_hours": 1.5,
          "dependencies": ["wf-validate-ingestion"]
        }
      ]
    }
  ]
}
```

### Differences from Windows Security Events
- Source is a **firewall log file / firewall logs data source**, not a Windows event channel.
- Validation should check both **raw `WindowsFirewall`** and **normalized `ASimNetworkSessionLogs`**.
- Needs **DCE awareness** and **profile-level** logging choices.
- Depends on host-side **Windows Defender Firewall logging settings**, not only DCR scope.

### Recommended owners
- **Primary:** Network Security / Windows Platform Team
- **Azure owner:** Azure Platform Admin
- **Validation owner:** SOC Engineer

---

## 3) Windows DNS Events via AMA

### Overview
| Item | Finding |
|---|---|
| What it does | Streams **Windows DNS analytical logs** into Microsoft Sentinel using the DNS AMA extension |
| Official docs | `https://learn.microsoft.com/en-us/azure/sentinel/connect-dns-ama` + `https://learn.microsoft.com/en-us/azure/sentinel/dns-ama-fields` + official connector template `template_ASimDnsActivityLogs.JSON` |
| Log Analytics table | **`ASimDnsActivityLogs`** |
| Relevant source | **`Microsoft-Windows-DNSServer/Analytical`** |
| DCR pattern | Connector creates a **Windows DCR** with extension **`MicrosoftDnsAgent`** and stream **`Microsoft-ASimDnsActivityLogs`** |
| Special prerequisite | **DNS analytical logging must be enabled**; official current doc says this connector supports **analytical** events |
| Filter fields | `EventOriginalType`, `EventResultDetails`, `DnsQuery`, `DnsQueryTypeName` |
| Relevant event IDs | **256-280** |
| Validation target | `ASimDnsActivityLogs | where EventProduct == "DNS Server" | take 10` |

### Connector-specific prerequisites
- DNS Server role installed.
- Windows Server 2016+ supported, or 2012 R2 with the required auditing hotfix.
- **Analytical event logging is not enabled by default** and must be turned on first.
- Azure Arc required for non-Azure servers.
- Official current doc: this connector supports **analytical log events**.

### Relevant channel / filter notes
- Channel: `Microsoft-Windows-DNSServer/Analytical`
- Example broad collection XPath shown in docs:

```xml
<QueryList>
  <Query Id="0" Path="Microsoft-Windows-DNSServer/Analytical">
    <Select Path="Microsoft-Windows-DNSServer/Analytical">*</Select>
  </Query>
</QueryList>
```

- The connector's API-based DCR model uses extension settings such as:
  - `extensionName: MicrosoftDnsAgent`
  - `streams: ["Microsoft-ASimDnsActivityLogs"]`
- Best cost control is via **advanced filters** on normalized fields rather than broad allow-all collection.

### Proposed task / subtask structure
```json
{
  "connector": "windows-dns-events-via-ama",
  "phases": [
    {
      "name": "Prerequisites",
      "tasks": [
        {
          "id": "dns-readiness-scope",
          "task": "Confirm DNS server scope, OS support, and workspace readiness",
          "description": "Identify authoritative/recursive DNS servers in scope, confirm supported Windows versions, and validate that Microsoft Sentinel is enabled on the target workspace.",
          "required_roles": [
            "Azure Platform Admin",
            "DNS Admin"
          ],
          "duration_hours": 2,
          "dependencies": []
        },
        {
          "id": "dns-verify-rbac",
          "task": "Verify Azure and host permissions",
          "description": "Confirm Monitoring Contributor, Log Analytics Contributor, Microsoft Sentinel Contributor, and machine onboarding permissions before DNS extension deployment.",
          "required_roles": [
            "Azure Platform Admin",
            "Identity / RBAC Admin"
          ],
          "duration_hours": 0.5,
          "dependencies": ["dns-readiness-scope"]
        }
      ]
    },
    {
      "name": "Infrastructure",
      "tasks": [
        {
          "id": "dns-enable-analytical-logging",
          "task": "Enable DNS analytical logging on target servers",
          "description": "Enable the DNS analytical channel on each Windows DNS server and verify local event generation before cloud collection is enabled.",
          "required_roles": [
            "DNS Admin",
            "Windows Server Admin"
          ],
          "duration_hours": 2,
          "dependencies": ["dns-verify-rbac"],
          "subtasks": [
            {
              "id": "dns-enable-channel",
              "task": "Enable Microsoft-Windows-DNSServer/Analytical",
              "duration_hours": 1,
              "dependencies": []
            },
            {
              "id": "dns-local-check",
              "task": "Confirm local DNS analytical events are being generated",
              "duration_hours": 1,
              "dependencies": ["dns-enable-channel"]
            }
          ]
        },
        {
          "id": "dns-arc-ama",
          "task": "Onboard non-Azure hosts if needed and deploy AMA",
          "description": "Use Azure Arc for non-Azure DNS servers and confirm the DNS extension deployment path is supported for each target host.",
          "required_roles": [
            "Azure Platform Admin",
            "Windows Server Admin"
          ],
          "duration_hours": 4,
          "dependencies": ["dns-enable-analytical-logging"]
        }
      ]
    },
    {
      "name": "Configuration",
      "tasks": [
        {
          "id": "dns-create-dcr",
          "task": "Create the DNS AMA DCR and assign servers",
          "description": "Create the connector DCR for stream Microsoft-ASimDnsActivityLogs, add target DNS servers, and apply the rule from the portal or API.",
          "required_roles": [
            "Azure Platform Admin (Monitoring Contributor, Log Analytics Contributor)",
            "Microsoft Sentinel Contributor"
          ],
          "duration_hours": 2,
          "dependencies": ["dns-arc-ama"],
          "subtasks": [
            {
              "id": "dns-dcr-resources",
              "task": "Add DNS servers as scoped resources",
              "duration_hours": 0.5,
              "dependencies": []
            },
            {
              "id": "dns-dcr-stream",
              "task": "Enable MicrosoftDnsAgent / Microsoft-ASimDnsActivityLogs stream",
              "duration_hours": 0.5,
              "dependencies": ["dns-dcr-resources"]
            },
            {
              "id": "dns-dcr-apply",
              "task": "Apply the DCR and confirm agent association",
              "duration_hours": 1,
              "dependencies": ["dns-dcr-stream"]
            }
          ]
        },
        {
          "id": "dns-advanced-filters",
          "task": "Apply advanced DNS filters for cost and signal quality",
          "description": "Use normalized filter fields such as EventOriginalType, EventResultDetails, DnsQuery, and DnsQueryTypeName to remove noisy or low-value traffic before ingestion.",
          "required_roles": [
            "DNS Admin",
            "SOC Engineer"
          ],
          "duration_hours": 1.5,
          "dependencies": ["dns-create-dcr"]
        }
      ]
    },
    {
      "name": "Validation",
      "tasks": [
        {
          "id": "dns-validate-ingestion",
          "task": "Validate normalized DNS telemetry and event coverage",
          "description": "Verify records in ASimDnsActivityLogs, confirm EventProduct = DNS Server, and test common event ranges such as 256-280 and expected query/result combinations.",
          "required_roles": [
            "SOC Engineer",
            "DNS Admin"
          ],
          "duration_hours": 2,
          "dependencies": ["dns-advanced-filters"]
        }
      ]
    },
    {
      "name": "Operationalization",
      "tasks": [
        {
          "id": "dns-handoff",
          "task": "Document DNS filter policy and server onboarding runbook",
          "description": "Capture analytical logging prerequisites, DCR filter policy, excluded domains/types, and the runbook for onboarding additional DNS servers.",
          "required_roles": [
            "DNS Admin",
            "SOC Engineer"
          ],
          "duration_hours": 1.5,
          "dependencies": ["dns-validate-ingestion"]
        }
      ]
    }
  ]
}
```

### Differences from Windows Security Events
- Uses a **specialized AMA DNS extension**, not the Security log connector pattern.
- Official current connector supports **analytical DNS events** and depends on the **DNS analytical channel** being enabled.
- Data lands in **`ASimDnsActivityLogs`**, not `SecurityEvent`.
- Filtering is strongest when done with **connector-normalized DNS fields**, not only Event IDs.

### Recommended owners
- **Primary:** DNS / Windows Infrastructure Team
- **Azure owner:** Azure Platform Admin
- **Validation owner:** SOC Engineer / Detection Engineer

---

## 4) Sysmon via AMA (Windows + Linux)

> **Important planning note:** I did **not** find a current first-party Microsoft Sentinel Content Hub connector that behaves like Windows Security Events for **Windows Sysmon via AMA**. The clean official path today is:
> - **Windows Sysmon:** collect the `Microsoft-Windows-Sysmon/Operational` channel using the **Windows Event Logs** AMA data source.
> - **Linux Sysmon:** use **Syslog via AMA**. The official **Microsoft Sysmon For Linux** connector definition is currently marked **deprecated**, but it still documents the data shape and ASIM dependency.

### Overview
| Item | Windows Sysmon | Linux Sysmon |
|---|---|---|
| Official docs | Azure Monitor Windows Events AMA + Windows Sysmon docs | Syslog via AMA tutorial + official `Microsoft Sysmon For Linux` connector JSON + Sysinternals SysmonForLinux repo |
| Source | `Microsoft-Windows-Sysmon/Operational` | Syslog output from Sysmon for Linux (`/var/log/syslog` or distro-equivalent) |
| Log Analytics table | **`Event`** (official Windows Event Logs AMA destination) | **`Syslog`** |
| Sentinel content dependency | Custom queries / parsers using Sysmon channel fields | **ASIM** dependency explicitly called out in official connector |
| Key prerequisite | Sysmon service + config must be installed on Windows hosts | Sysmon for Linux package + config + syslog daemon path must be active |
| Validation target | `Event | where EventLog == "Microsoft-Windows-Sysmon/Operational" | take 10` | `Syslog | where ProcessName == "sysmon" | take 10` |

### Connector-specific prerequisites
#### Windows Sysmon
- Sysmon installed (`sysmon -accepteula -i <configfile>`).
- Sysmon writes to `Applications and Services Logs/Microsoft/Windows/Sysmon/Operational`.
- Decide the minimum event IDs to collect before DCR rollout to control cost.
- Azure Arc required for non-Azure Windows hosts.

#### Linux Sysmon
- Sysmon for Linux installed from the official Microsoft repositories / Sysinternals package path.
- Sysmon for Linux writes to syslog; official README shows output in `/var/log/syslog`.
- Syslog daemon may need tuning for **large events**.
- If using a forwarder, port **514** and daemon listener configuration must be in place.
- Official connector definition says the Linux path depends on **ASIM parsers** and uses **Syslog** telemetry.

### Relevant channels / collection notes
#### Windows
- Channel: `Microsoft-Windows-Sysmon/Operational`
- Recommended initial XPath for high-value event IDs:

```text
Microsoft-Windows-Sysmon/Operational!*[System[(EventID=1 or EventID=3 or EventID=7 or EventID=11 or EventID=13 or EventID=22)]]
```

- Rationale:
  - 1 = Process Create
  - 3 = Network Connection
  - 7 = Image Load
  - 11 = File Create
  - 13 = Registry Value Set
  - 22 = DNS Query

#### Linux
- DCR data source: **Linux Syslog**
- Table: `Syslog`
- Official connector health checks use `ProcessName == 'sysmon'`
- If using a forwarder, configure daemon reception on TCP/UDP 514 and run the AMA forwarder installer / daemon config workflow.

### Proposed task / subtask structure
```json
{
  "connector": "sysmon-via-ama-windows-linux",
  "phases": [
    {
      "name": "Prerequisites",
      "tasks": [
        {
          "id": "sysmon-readiness-design",
          "task": "Decide Windows/Linux scope and Sysmon event policy",
          "description": "Identify which Windows and Linux hosts require Sysmon, decide the minimum Windows event IDs and Linux use cases to collect, and confirm Sentinel workspace readiness.",
          "required_roles": [
            "SOC Architect",
            "Azure Platform Admin"
          ],
          "duration_hours": 3,
          "dependencies": []
        },
        {
          "id": "sysmon-verify-rbac",
          "task": "Verify Azure and host permissions",
          "description": "Confirm Monitoring Contributor, Log Analytics Contributor, Microsoft Sentinel Contributor, and host deployment rights for Windows/Arc and Linux/Arc or VM management.",
          "required_roles": [
            "Azure Platform Admin",
            "Identity / RBAC Admin"
          ],
          "duration_hours": 0.5,
          "dependencies": ["sysmon-readiness-design"]
        }
      ]
    },
    {
      "name": "Infrastructure",
      "tasks": [
        {
          "id": "sysmon-install-windows",
          "task": "Install and configure Sysmon on Windows hosts",
          "description": "Install Sysmon with an approved configuration file, verify the Operational channel is populated locally, and tune the baseline before cloud collection starts.",
          "required_roles": [
            "Windows Endpoint Admin",
            "Security Engineering"
          ],
          "duration_hours": 4,
          "dependencies": ["sysmon-verify-rbac"]
        },
        {
          "id": "sysmon-install-linux",
          "task": "Install and configure Sysmon for Linux",
          "description": "Install Sysmon for Linux from official Microsoft repositories, apply the approved config, and verify events are written to syslog.",
          "required_roles": [
            "Linux Admin",
            "Security Engineering"
          ],
          "duration_hours": 4,
          "dependencies": ["sysmon-verify-rbac"]
        },
        {
          "id": "sysmon-ama-forwarder",
          "task": "Prepare AMA and forwarding path",
          "description": "Deploy AMA on Windows hosts and Linux origin/forwarder nodes, onboard non-Azure machines to Arc if needed, and prepare Syslog reception on Linux collectors if using a forwarder pattern.",
          "required_roles": [
            "Azure Platform Admin",
            "Windows Endpoint Admin",
            "Linux Admin"
          ],
          "duration_hours": 6,
          "dependencies": ["sysmon-install-windows", "sysmon-install-linux"]
        }
      ]
    },
    {
      "name": "Configuration",
      "tasks": [
        {
          "id": "sysmon-windows-dcr",
          "task": "Create the Windows Event Logs DCR for Sysmon",
          "description": "Use the Windows Event Logs AMA data source, target Microsoft-Windows-Sysmon/Operational with custom XPath, and send the data to the Log Analytics workspace Event table.",
          "required_roles": [
            "Azure Platform Admin (Monitoring Contributor, Log Analytics Contributor)",
            "Microsoft Sentinel Contributor"
          ],
          "duration_hours": 2,
          "dependencies": ["sysmon-ama-forwarder"],
          "subtasks": [
            {
              "id": "sysmon-win-xpath",
              "task": "Define Windows Sysmon XPath scope",
              "duration_hours": 1,
              "dependencies": []
            },
            {
              "id": "sysmon-win-associate",
              "task": "Associate DCR with target Windows hosts",
              "duration_hours": 1,
              "dependencies": ["sysmon-win-xpath"]
            }
          ]
        },
        {
          "id": "sysmon-linux-dcr",
          "task": "Create the Linux Syslog DCR for Sysmon",
          "description": "Use the Linux Syslog AMA data source, select the required facilities/severities, and confirm Sysmon messages are forwarded into the Syslog table.",
          "required_roles": [
            "Azure Platform Admin (Monitoring Contributor, Log Analytics Contributor)",
            "Linux Admin"
          ],
          "duration_hours": 2,
          "dependencies": ["sysmon-ama-forwarder"],
          "subtasks": [
            {
              "id": "sysmon-linux-facilities",
              "task": "Choose facilities and minimum severity for Sysmon messages",
              "duration_hours": 1,
              "dependencies": []
            },
            {
              "id": "sysmon-linux-port514",
              "task": "Enable port 514 / daemon listener if using a log forwarder",
              "duration_hours": 1,
              "dependencies": ["sysmon-linux-facilities"]
            }
          ]
        },
        {
          "id": "sysmon-asim",
          "task": "Enable ASIM content and parser dependencies",
          "description": "For Linux especially, deploy the ASIM parsers/functions needed by the official connector guidance so detections and normalized queries work as expected.",
          "required_roles": [
            "SOC Engineer",
            "Detection Engineer"
          ],
          "duration_hours": 1.5,
          "dependencies": ["sysmon-linux-dcr"]
        }
      ]
    },
    {
      "name": "Validation",
      "tasks": [
        {
          "id": "sysmon-validate",
          "task": "Validate Windows and Linux Sysmon telemetry end to end",
          "description": "Confirm Windows Sysmon events arrive in Event with EventLog = Microsoft-Windows-Sysmon/Operational, confirm Linux Sysmon arrives in Syslog with ProcessName = sysmon, and test at least one hunting / analytic query per platform.",
          "required_roles": [
            "SOC Engineer",
            "Detection Engineer"
          ],
          "duration_hours": 3,
          "dependencies": ["sysmon-windows-dcr", "sysmon-asim"]
        }
      ]
    },
    {
      "name": "Operationalization",
      "tasks": [
        {
          "id": "sysmon-handoff",
          "task": "Document Sysmon configuration ownership and tuning policy",
          "description": "Document the Windows config XML, Linux Sysmon config, chosen event IDs/facilities, ASIM dependencies, and the process for future tuning as event volume changes.",
          "required_roles": [
            "Security Engineering",
            "SOC Engineer"
          ],
          "duration_hours": 2,
          "dependencies": ["sysmon-validate"]
        }
      ]
    }
  ]
}
```

### Differences from Windows Security Events
- There is **no clean like-for-like current Windows Sysmon Sentinel connector** equivalent to Windows Security Events via AMA in the sources I found.
- Windows and Linux need **different ingestion patterns**:
  - **Windows:** Windows Event Logs AMA data source
  - **Linux:** Syslog via AMA
- This family adds a **host software deployment prerequisite** (install Sysmon itself) before Sentinel work starts.
- Linux path has an explicit **ASIM dependency**, and the official Microsoft Sysmon For Linux connector definition is marked **deprecated**.

### Recommended owners
- **Primary:** Security Engineering / Endpoint Engineering
- **Windows owner:** Windows Endpoint Admin
- **Linux owner:** Linux Admin
- **Azure owner:** Azure Platform Admin
- **Validation owner:** SOC Engineer / Detection Engineer

---

## Cross-connector reuse notes

### Tasks reusable from Windows Security Events
- Workspace and connector readiness assessment
- RBAC verification
- Azure Arc onboarding for non-Azure servers
- AMA deployment pattern
- DCR creation / association pattern
- Validation flow in Log Analytics / Sentinel
- Documentation and handoff

### Main planning deltas by connector
- **Windows Forwarded Events:** add **WEC / WEF** design and subscription validation.
- **Windows Firewall:** add **host firewall logging** and **pfirewall.log** verification.
- **Windows DNS:** add **DNS analytical logging** and **connector-native filters**.
- **Sysmon:** add **Sysmon software deployment** and split **Windows vs Linux** ingestion.

## Recommended catalog takeaways
- **Windows Forwarded Events** should be modeled as a WEC-centric connector with a WEF infrastructure prerequisite.
- **Windows Firewall** should call out both **`ASimNetworkSessionLogs`** and **`WindowsFirewall`** to avoid validation confusion.
- **Windows DNS Events via AMA** should explicitly say **analytical logs only** in current documentation.
- **Sysmon** should be modeled as a **dual-path connector family**, not a single homogeneous Windows-style AMA connector.
