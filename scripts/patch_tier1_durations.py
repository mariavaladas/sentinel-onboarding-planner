"""
patch_tier1_durations.py
Sebastian — 2026-06-15
Populates duration data for 8 Tier 1 connectors in solutions.json.
"""
import json, copy

SOLUTIONS_FILE = r"C:\Users\madesous\value-pack-planner\data\solutions.json"

# ---------------------------------------------------------------------------
# Replacement task arrays for the 5 native + CEF connectors
# ---------------------------------------------------------------------------

NATIVE_TASKS = {

"azure-activity": [
  {
    "id": "act-prereqs",
    "order": 1,
    "task": "Confirm Azure resource scope, diagnostic settings requirements, and Sentinel RBAC for Azure Activity.",
    "duration": 0.5,
    "effort_hours": 1,
    "skill_level": "beginner",
    "category": "setup",
    "phase": "Prerequisites",
    "depends_on": [],
    "owner_role": "Azure Platform Admin",
    "description": "Identify which Azure subscriptions and resource groups are in scope, confirm the Sentinel workspace exists, and verify the operator holds Monitoring Contributor and Microsoft Sentinel Contributor on the target workspace."
  },
  {
    "id": "act-configure",
    "order": 2,
    "task": "Enable Azure Activity data collection into the target Sentinel workspace and verify the right resource set is connected.",
    "duration": 0.5,
    "effort_hours": 2,
    "skill_level": "beginner",
    "category": "setup",
    "phase": "Configuration",
    "depends_on": ["act-prereqs"],
    "owner_role": "Azure Platform Admin",
    "description": "Open the Azure Activity connector in Microsoft Sentinel, configure diagnostic settings for the target subscriptions to stream to the Log Analytics workspace, and confirm the connector status shows Connected."
  },
  {
    "id": "act-content",
    "order": 3,
    "task": "Turn on packaged analytics, workbooks, and any optional content that depends on Azure Activity telemetry.",
    "duration": 0.5,
    "effort_hours": 2,
    "skill_level": "intermediate",
    "category": "phase-1",
    "phase": "Operationalization",
    "depends_on": ["act-configure"],
    "owner_role": "SOC Engineer",
    "description": "Enable Azure Activity analytics rules, deploy the Azure Activity workbook for subscription-level change visibility, and review any automation playbooks bundled with the solution content pack."
  },
  {
    "id": "act-validate",
    "order": 4,
    "task": "Validate Azure Activity with a recent Azure event and confirm the expected records arrive in Sentinel.",
    "duration": 0.5,
    "effort_hours": 2,
    "skill_level": "intermediate",
    "category": "phase-2",
    "phase": "Validation",
    "depends_on": ["act-content"],
    "owner_role": "SOC Analyst",
    "description": "Query AzureActivity for recent write operations across the scoped subscriptions, verify caller identity and resource fields are populated, and fire at least one enabled analytics rule end-to-end to confirm incident creation."
  }
],

"microsoft-entra-id": [
  {
    "id": "entra-prereqs",
    "order": 1,
    "task": "Verify licensing, tenant prerequisites, and delegated permissions required to onboard Microsoft Entra ID.",
    "duration": 0.5,
    "effort_hours": 2,
    "skill_level": "beginner",
    "category": "setup",
    "phase": "Prerequisites",
    "depends_on": [],
    "owner_role": "Identity / RBAC Admin",
    "description": "Confirm the tenant holds Microsoft Entra ID P1 or P2 licensing where required for sign-in and audit logs, and that the operator has Global Reader or Security Reader plus Microsoft Sentinel Contributor on the workspace."
  },
  {
    "id": "entra-configure",
    "order": 2,
    "task": "Enable the Microsoft Entra ID connector in Sentinel and choose the required data types or workloads.",
    "duration": 0.5,
    "effort_hours": 2,
    "skill_level": "beginner",
    "category": "setup",
    "phase": "Configuration",
    "depends_on": ["entra-prereqs"],
    "owner_role": "Azure Platform Admin",
    "description": "Open the Microsoft Entra ID connector in Sentinel, enable Sign-in logs, Audit logs, and any additional streams needed such as Non-interactive sign-ins or Provisioning logs, and confirm the connector status shows Connected."
  },
  {
    "id": "entra-content",
    "order": 3,
    "task": "Deploy packaged analytics, workbooks, and automations for Microsoft Entra ID, then tune noisy content.",
    "duration": 1,
    "effort_hours": 4,
    "skill_level": "intermediate",
    "category": "phase-1",
    "phase": "Operationalization",
    "depends_on": ["entra-configure"],
    "owner_role": "SOC Engineer",
    "description": "Enable Entra ID analytics rules covering impossible travel, legacy authentication, and MFA bypass patterns. Deploy the Entra ID workbook and configure UEBA entity behaviour analytics for users and sign-in telemetry."
  },
  {
    "id": "entra-validate",
    "order": 4,
    "task": "Validate Microsoft Entra ID with a recent workload event and confirm incidents or records appear in Sentinel.",
    "duration": 0.5,
    "effort_hours": 2,
    "skill_level": "intermediate",
    "category": "phase-2",
    "phase": "Validation",
    "depends_on": ["entra-content"],
    "owner_role": "SOC Analyst",
    "description": "Query SigninLogs and AuditLogs to confirm records are flowing with expected fields populated, and validate that at least one analytics rule has generated a test incident in the Sentinel incidents queue."
  }
],

"defender-xdr": [
  {
    "id": "xdr-prereqs",
    "order": 1,
    "task": "Verify licensing, tenant prerequisites, and delegated permissions required to onboard Microsoft Defender XDR.",
    "duration": 0.5,
    "effort_hours": 1,
    "skill_level": "beginner",
    "category": "setup",
    "phase": "Prerequisites",
    "depends_on": [],
    "owner_role": "Identity / RBAC Admin",
    "description": "Confirm the tenant has active Microsoft 365 Defender licences, the operator holds Security Administrator and Microsoft Sentinel Contributor, and that Defender XDR incident creation is enabled in the M365 Defender portal."
  },
  {
    "id": "xdr-configure",
    "order": 2,
    "task": "Enable the Microsoft Defender XDR connector in Sentinel and choose the required data types or workloads.",
    "duration": 0.5,
    "effort_hours": 2,
    "skill_level": "beginner",
    "category": "setup",
    "phase": "Configuration",
    "depends_on": ["xdr-prereqs"],
    "owner_role": "Azure Platform Admin",
    "description": "Open the Microsoft Defender XDR connector in Sentinel, enable incident and alert bi-directional sync, select advanced hunting tables such as DeviceEvents, AlertEvidence, and EmailEvents, and confirm the connector shows Connected."
  },
  {
    "id": "xdr-content",
    "order": 3,
    "task": "Deploy packaged analytics, workbooks, and automations for Microsoft Defender XDR, then tune noisy content.",
    "duration": 1,
    "effort_hours": 4,
    "skill_level": "intermediate",
    "category": "phase-1",
    "phase": "Operationalization",
    "depends_on": ["xdr-configure"],
    "owner_role": "SOC Engineer",
    "description": "Enable Defender XDR analytics rules, deploy the Microsoft Defender XDR workbook, publish curated hunting queries for endpoint and email threats, and tune high-volume alert correlation rules to reduce duplicate incidents."
  },
  {
    "id": "xdr-validate",
    "order": 4,
    "task": "Validate Microsoft Defender XDR with a recent workload event and confirm incidents or records appear in Sentinel.",
    "duration": 0.5,
    "effort_hours": 2,
    "skill_level": "intermediate",
    "category": "phase-2",
    "phase": "Validation",
    "depends_on": ["xdr-content"],
    "owner_role": "SOC Analyst",
    "description": "Confirm Defender XDR incidents appear in the Sentinel queue and that bi-directional sync is working. Query SecurityIncident and SecurityAlert to verify fields are populated, and confirm at least one rule produces an incident alert."
  }
],

"azure-firewall": [
  {
    "id": "afw-prereqs",
    "order": 1,
    "task": "Confirm Azure resource scope, diagnostic settings requirements, and Sentinel RBAC for Azure Firewall.",
    "duration": 0.5,
    "effort_hours": 2,
    "skill_level": "beginner",
    "category": "setup",
    "phase": "Prerequisites",
    "depends_on": [],
    "owner_role": "Azure Platform Admin",
    "description": "Inventory all Azure Firewall instances in scope, identify which log categories are missing from existing diagnostic settings, and confirm the operator has Monitoring Contributor and Microsoft Sentinel Contributor on the target workspace."
  },
  {
    "id": "afw-configure",
    "order": 2,
    "task": "Enable Azure Firewall data collection into the target Sentinel workspace and verify the right resource set is connected.",
    "duration": 0.5,
    "effort_hours": 2,
    "skill_level": "beginner",
    "category": "setup",
    "phase": "Configuration",
    "depends_on": ["afw-prereqs"],
    "owner_role": "Azure Platform Admin",
    "description": "Configure diagnostic settings on each Azure Firewall resource to send AzureFirewallApplicationRule, AzureFirewallNetworkRule, and AzureFirewallDnsProxy categories to the Sentinel workspace. Confirm the connector status shows Connected."
  },
  {
    "id": "afw-content",
    "order": 3,
    "task": "Turn on packaged analytics, workbooks, and any optional content that depends on Azure Firewall telemetry.",
    "duration": 1,
    "effort_hours": 4,
    "skill_level": "intermediate",
    "category": "phase-1",
    "phase": "Operationalization",
    "depends_on": ["afw-configure"],
    "owner_role": "SOC Engineer",
    "description": "Enable Azure Firewall analytics rules for threat intelligence IP matches and anomalous traffic patterns. Deploy the Azure Firewall workbook showing traffic volume, denied connections, and FQDN breakdowns. Configure playbooks for automated blocking integration where applicable."
  },
  {
    "id": "afw-validate",
    "order": 4,
    "task": "Validate Azure Firewall with a recent Azure event and confirm the expected records arrive in Sentinel.",
    "duration": 0.5,
    "effort_hours": 2,
    "skill_level": "intermediate",
    "category": "phase-2",
    "phase": "Validation",
    "depends_on": ["afw-content"],
    "owner_role": "SOC Analyst",
    "description": "Query AzureDiagnostics for Category in ApplicationRule, NetworkRule, DnsProxy to confirm all three streams arrive. Generate a test firewall rule trigger and verify the corresponding event appears in Sentinel within the expected latency window."
  }
],

"microsoft-365": [
  {
    "id": "m365-prereqs",
    "order": 1,
    "task": "Verify licensing, tenant prerequisites, and delegated permissions required to onboard Microsoft 365.",
    "duration": 0.5,
    "effort_hours": 1,
    "skill_level": "beginner",
    "category": "setup",
    "phase": "Prerequisites",
    "depends_on": [],
    "owner_role": "Identity / RBAC Admin",
    "description": "Confirm the tenant has active Microsoft 365 E3/E5 licensing, the Office 365 Management Activity API is enabled, and the operator has Microsoft Sentinel Contributor plus Global Reader or Exchange Administrator roles."
  },
  {
    "id": "m365-configure",
    "order": 2,
    "task": "Enable the Microsoft 365 connector in Sentinel and choose the required data types or workloads.",
    "duration": 0.5,
    "effort_hours": 2,
    "skill_level": "beginner",
    "category": "setup",
    "phase": "Configuration",
    "depends_on": ["m365-prereqs"],
    "owner_role": "Azure Platform Admin",
    "description": "Open the Microsoft 365 connector in Sentinel and enable the Exchange, SharePoint, and Teams audit log streams. Confirm the connector shows Connected and validate that OfficeActivity table ingestion has started."
  },
  {
    "id": "m365-content",
    "order": 3,
    "task": "Deploy packaged analytics, workbooks, and automations for Microsoft 365, then tune noisy content.",
    "duration": 0.5,
    "effort_hours": 2,
    "skill_level": "intermediate",
    "category": "phase-1",
    "phase": "Operationalization",
    "depends_on": ["m365-configure"],
    "owner_role": "SOC Engineer",
    "description": "Enable Microsoft 365 analytics rules for Exchange mail forwarding, SharePoint mass download, and Teams external access patterns. Deploy the Office 365 workbook and review automation playbooks for incident response workflows."
  },
  {
    "id": "m365-validate",
    "order": 4,
    "task": "Validate Microsoft 365 with a recent workload event and confirm incidents or records appear in Sentinel.",
    "duration": 0.5,
    "effort_hours": 2,
    "skill_level": "intermediate",
    "category": "phase-2",
    "phase": "Validation",
    "depends_on": ["m365-content"],
    "owner_role": "SOC Analyst",
    "description": "Query OfficeActivity to confirm Exchange, SharePoint, and Teams operations flow with expected fields populated. Validate at least one analytics rule has produced an incident and that data latency is within acceptable bounds."
  }
],

"common-event-format": [
  {
    "id": "cef-prereqs-design",
    "order": 1,
    "task": "Design the Syslog or CEF forwarding path, Linux forwarder placement, and network prerequisites for Common Event Format.",
    "duration": 1,
    "effort_hours": 4,
    "skill_level": "advanced",
    "category": "setup",
    "phase": "Prerequisites",
    "depends_on": [],
    "owner_role": "Network Admin",
    "description": "Define the end-to-end forwarding architecture: source device types, network zones, forwarder VM placement, syslog port and protocol selection (UDP 514, TCP 514, or TLS), and firewall rule requirements between sources and the forwarder."
  },
  {
    "id": "cef-prereqs-permissions",
    "order": 2,
    "task": "Verify permissions for Azure, VM provisioning, and monitoring resources.",
    "duration": 0.5,
    "effort_hours": 1,
    "skill_level": "beginner",
    "category": "setup",
    "phase": "Prerequisites",
    "depends_on": ["cef-prereqs-design"],
    "owner_role": "Identity / RBAC Admin",
    "description": "Confirm the deployment operator has Monitoring Contributor, Log Analytics Contributor, Microsoft Sentinel Contributor, and Virtual Machine Contributor (or Azure Connected Machine Resource Administrator for Arc-onboarded hosts)."
  },
  {
    "id": "cef-infra-forwarder",
    "order": 3,
    "task": "Deploy or update the forwarder, Azure Monitor Agent, and data collection rules required for Common Event Format.",
    "duration": 2,
    "effort_hours": 8,
    "skill_level": "advanced",
    "category": "setup",
    "phase": "Infrastructure",
    "depends_on": ["cef-prereqs-permissions"],
    "owner_role": "Azure Platform Admin",
    "description": "Provision the Linux forwarder VM (Ubuntu 20.04+ or RHEL 8+ recommended), onboard to Azure Arc if not Azure-native, install the Azure Monitor Agent extension, and validate the agent is reporting healthy to the workspace."
  },
  {
    "id": "cef-config-dcr",
    "order": 4,
    "task": "Configure Common Event Format to send the correct log stream and tune filters to avoid unnecessary ingestion.",
    "duration": 1.5,
    "effort_hours": 6,
    "skill_level": "advanced",
    "category": "phase-1",
    "phase": "Configuration",
    "depends_on": ["cef-infra-forwarder"],
    "owner_role": "Azure Platform Admin",
    "description": "Create the Syslog or CEF DCR targeting the CommonSecurityLog table, configure rsyslog or syslog-ng on the forwarder to accept CEF on the agreed port, and apply facility and severity filters in the DCR to suppress noisy low-value messages."
  },
  {
    "id": "cef-config-sources",
    "order": 5,
    "task": "Configure source devices to send CEF-formatted events to the Linux forwarder.",
    "duration": 1,
    "effort_hours": 4,
    "skill_level": "advanced",
    "category": "phase-1",
    "phase": "Configuration",
    "depends_on": ["cef-config-dcr"],
    "owner_role": "Network Admin",
    "description": "Update each source device (firewall, IDS, NAC, endpoint sensor) to forward syslog/CEF to the forwarder IP and agreed port. Verify the CEF header is correctly formatted with Version, DeviceVendor, DeviceProduct, and DeviceEventClassID fields populated."
  },
  {
    "id": "cef-validate",
    "order": 6,
    "task": "Validate parser health, record mapping, and one packaged detection using live Common Event Format telemetry.",
    "duration": 1,
    "effort_hours": 4,
    "skill_level": "advanced",
    "category": "phase-2",
    "phase": "Validation",
    "depends_on": ["cef-config-sources"],
    "owner_role": "SOC Analyst",
    "description": "Query CommonSecurityLog to verify records from each source device are arriving, validate that DeviceVendor, DeviceProduct, Activity, SourceIP, and DestinationIP are populated, and confirm the ASIM normalization parser maps correctly to the expected schema."
  },
  {
    "id": "cef-content",
    "order": 7,
    "task": "Deploy analytics rules and workbooks for Common Event Format sources.",
    "duration": 0.5,
    "effort_hours": 2,
    "skill_level": "intermediate",
    "category": "phase-2",
    "phase": "Operationalization",
    "depends_on": ["cef-validate"],
    "owner_role": "SOC Engineer",
    "description": "Enable CEF-based analytics rules covering network perimeter threats, deploy the Common Event Format workbook for source visibility and event volume trending, and configure relevant Microsoft Sentinel solution content packs aligned to the onboarded device vendors."
  },
  {
    "id": "cef-operationalize",
    "order": 8,
    "task": "Document the forwarding topology, source onboarding procedure, and operational runbook.",
    "duration": 0.5,
    "effort_hours": 2,
    "skill_level": "intermediate",
    "category": "phase-3",
    "phase": "Operationalization",
    "depends_on": ["cef-content"],
    "owner_role": "SOC Engineer",
    "description": "Produce a topology diagram of the forwarder architecture, document how to add new source devices including CEF format requirements, and capture the runbook for restarting rsyslog/syslog-ng and AMA on the forwarder VM."
  }
]

}  # end NATIVE_TASKS

# ---------------------------------------------------------------------------
# Duration additions for windows-dns-events-via-ama (by task id)
# ---------------------------------------------------------------------------
DNS_DURATIONS = {
    "dns-readiness-scope":         {"duration": 0.5, "effort_hours": 2},
    "dns-verify-rbac":             {"duration": 0.5, "effort_hours": 1},
    "dns-enable-analytical-logging": {"duration": 1,  "effort_hours": 4},
    "dns-arc-ama":                 {"duration": 2,   "effort_hours": 8},
    "dns-create-dcr":              {"duration": 1,   "effort_hours": 4},
    "dns-advanced-filters":        {"duration": 1,   "effort_hours": 4},
    "dns-validate-ingestion":      {"duration": 1,   "effort_hours": 4},
    "dns-handoff":                 {"duration": 0.5, "effort_hours": 2},
}

# ---------------------------------------------------------------------------
# Duration additions for windows-forwarded-events (by task id)
# ---------------------------------------------------------------------------
WFE_DURATIONS = {
    "wfe-wec-readiness":      {"duration": 0.5, "effort_hours": 2},
    "wfe-collector-topology": {"duration": 1,   "effort_hours": 4},
    "wfe-subscription-design":{"duration": 1.5, "effort_hours": 6},
    "wfe-channel-sizing":     {"duration": 0.5, "effort_hours": 2},
    "wfe-verify-rbac":        {"duration": 0.5, "effort_hours": 1},
    "wfe-build-wec":          {"duration": 3,   "effort_hours": 12},
    "wfe-collector-ama":      {"duration": 2,   "effort_hours": 8},
    "wfe-create-dcr":         {"duration": 1,   "effort_hours": 4},
    "wfe-validate-ingestion": {"duration": 1,   "effort_hours": 4},
    "wfe-handoff":            {"duration": 0.5, "effort_hours": 2},
}


def patch_by_id(tasks, duration_map):
    """Add/update duration and effort_hours on tasks that match an id in duration_map."""
    for task in tasks:
        tid = task.get("id")
        if tid and tid in duration_map:
            task["duration"] = duration_map[tid]["duration"]
            task["effort_hours"] = duration_map[tid]["effort_hours"]
    return tasks


def main():
    with open(SOLUTIONS_FILE, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    changed = []

    for cat_name, cat_obj in data["categories"].items():
        for solution in cat_obj.get("solutions", []):
            sid = solution.get("id")

            # 1. Native / CEF replacements
            if sid in NATIVE_TASKS:
                solution["planner"]["setup_tasks"] = NATIVE_TASKS[sid]
                changed.append(sid)

            # 2. DNS: patch in-place
            elif sid == "windows-dns-events-via-ama":
                patch_by_id(solution["planner"]["setup_tasks"], DNS_DURATIONS)
                changed.append(sid)

            # 3. WFE: patch in-place
            elif sid == "windows-forwarded-events":
                patch_by_id(solution["planner"]["setup_tasks"], WFE_DURATIONS)
                changed.append(sid)

    if len(changed) != 8:
        print(f"WARNING: expected 8 connectors, patched {len(changed)}: {changed}")
    else:
        print(f"Patched {len(changed)} connectors: {changed}")

    with open(SOLUTIONS_FILE, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    print("solutions.json written successfully.")


if __name__ == "__main__":
    main()
