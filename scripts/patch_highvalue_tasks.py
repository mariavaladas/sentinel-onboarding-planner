"""
patch_highvalue_tasks.py
Replaces planner.setup_tasks for the top 25 high-value non-featured solutions
with bespoke, product-specific tasks.
azure-firewall is SKIPPED (already Tier 1 quality).
"""

import json
from pathlib import Path

SOLUTIONS_PATH = "data/solutions.json"

# Solutions that must never be touched
PROTECTED = {
    "azure-activity",
    "defender-for-cloud",
    "defender-xdr",
    "microsoft-entra-id",
    "azure-firewall",  # already Tier 1 quality
}

HIGHVALUE_TASKS = {

    # ─────────────────────────────────────────────
    # MICROSOFT 1ST-PARTY
    # ─────────────────────────────────────────────

    "microsoft-business-applications": [
        {
            "id": "mba-prereqs",
            "order": 1,
            "task": "Verify Power Platform licensing and environment prerequisites",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "Azure Platform Admin",
            "description": (
                "Confirm Microsoft 365 and Power Platform licenses include Dataverse audit logging. "
                "Ensure the Power Platform admin center has audit log export enabled and that the "
                "service principal for the Sentinel connector has the required roles."
            ),
        },
        {
            "id": "mba-connector",
            "order": 2,
            "task": "Deploy Microsoft Business Applications data connector",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["mba-prereqs"],
            "owner_role": "SOC Engineer",
            "description": (
                "Install the Microsoft Business Applications connector in Microsoft Sentinel to ingest "
                "Power Platform activity events into the PowerPlatformAdminActivity and "
                "PowerAutomateActivity tables. "
                "Configure the workspace and verify the connector shows a Connected status."
            ),
        },
        {
            "id": "mba-analytics",
            "order": 3,
            "task": "Enable Power Platform analytics rules and workbook",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["mba-connector"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the 49 included analytics rules covering data exfiltration, suspicious app creation, "
                "and policy bypass scenarios in Power Platform. "
                "Install the Power Platform activity workbook and confirm it renders data from "
                "PowerPlatformAdminActivity."
            ),
        },
        {
            "id": "mba-playbooks",
            "order": 4,
            "task": "Configure Power Platform incident response playbooks",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "advanced",
            "category": "phase-2",
            "phase": "Operationalization",
            "depends_on": ["mba-analytics"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy and authorise the 8 included Logic App playbooks for automated Power Platform "
                "incident response, including environment isolation and app revocation actions. "
                "Connect each playbook to the Microsoft Sentinel incident trigger and test end-to-end "
                "execution with a sandbox alert."
            ),
        },
        {
            "id": "mba-validate",
            "order": 5,
            "task": "Validate Power Platform telemetry and tune alert thresholds",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["mba-playbooks"],
            "owner_role": "SOC Analyst",
            "description": (
                "Confirm that PowerPlatformAdminActivity events are flowing within expected latency. "
                "Review analytics rule thresholds for bulk data export detections and adjust entity "
                "mapping to match the organisation's Power Platform naming conventions."
            ),
        },
    ],

    "microsoft-defender-for-endpoint": [
        {
            "id": "mde-prereqs",
            "order": 1,
            "task": "Verify Microsoft Defender for Endpoint licensing and onboarding status",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "Azure Platform Admin",
            "description": (
                "Confirm Defender for Endpoint Plan 2 (or Microsoft 365 Defender) licences are assigned "
                "and that endpoints are onboarded to MDE. "
                "Verify the Microsoft 365 Defender connector is enabled in Sentinel so raw device events "
                "stream into the DeviceEvents and DeviceAlertEvents tables."
            ),
        },
        {
            "id": "mde-connector",
            "order": 2,
            "task": "Enable Microsoft Defender for Endpoint data connector",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["mde-prereqs"],
            "owner_role": "SOC Engineer",
            "description": (
                "Enable the Microsoft Defender for Endpoint connector in Sentinel and confirm data "
                "is populating the SecurityAlert (MDE) and DeviceProcessEvents tables. "
                "Validate that alert synchronisation between the M365 Defender portal and Sentinel "
                "incidents is functioning correctly."
            ),
        },
        {
            "id": "mde-analytics",
            "order": 3,
            "task": "Deploy MDE analytics rules and tune severity levels",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["mde-connector"],
            "owner_role": "SOC Engineer",
            "description": (
                "Enable the 22 included Sentinel analytics rules for MDE covering credential access, "
                "lateral movement, and defence evasion scenarios. "
                "Adjust alert severity and de-duplication settings to avoid overlap with alerts already "
                "surfaced natively from the M365 Defender portal."
            ),
        },
        {
            "id": "mde-playbooks",
            "order": 4,
            "task": "Configure MDE response playbooks for automated endpoint isolation",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "advanced",
            "category": "phase-2",
            "phase": "Operationalization",
            "depends_on": ["mde-analytics"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy and authorise the included Logic App playbooks that call the MDE API to isolate "
                "endpoints, run antivirus scans, and collect investigation packages on incident trigger. "
                "Ensure the managed identity or service principal has the MachineAction permission in "
                "the Defender portal."
            ),
        },
        {
            "id": "mde-validate",
            "order": 5,
            "task": "Validate MDE telemetry coverage and incident workflows",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["mde-playbooks"],
            "owner_role": "SOC Analyst",
            "description": (
                "Confirm all targeted endpoint OS types appear in DeviceInfo and that expected "
                "alert categories are present. "
                "Run a test incident to verify playbook execution, entity enrichment, and incident "
                "closure flows work end-to-end."
            ),
        },
    ],

    # ─────────────────────────────────────────────
    # MAJOR THIRD-PARTY CONNECTORS
    # ─────────────────────────────────────────────

    "blood-hound-enterprise": [
        {
            "id": "bhe-prereqs",
            "order": 1,
            "task": "Provision BloodHound Enterprise licensing and AD permissions",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "BloodHound Admin",
            "description": (
                "Obtain a BloodHound Enterprise (SpecterOps) licence and create a dedicated service "
                "account with Domain Reader rights in Active Directory. "
                "Whitelist BloodHound data collection hosts in endpoint protection and network egress "
                "rules to allow LDAP and SMB enumeration traffic."
            ),
        },
        {
            "id": "bhe-collector",
            "order": 2,
            "task": "Deploy BloodHound data collection agents across domain controllers",
            "duration": 1.5,
            "effort_hours": 12,
            "skill_level": "advanced",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["bhe-prereqs"],
            "owner_role": "BloodHound Admin",
            "description": (
                "Install and configure the BHE SharpHound collector agents on each domain controller "
                "or collection host, scheduling recurrent AD graph ingestion. "
                "Verify that attack path data (users, groups, GPOs, ACLs) is appearing in the "
                "BloodHound Enterprise portal before proceeding to the Sentinel connector."
            ),
        },
        {
            "id": "bhe-connector",
            "order": 3,
            "task": "Configure BloodHound Enterprise Sentinel connector and log ingestion",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "advanced",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["bhe-collector"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the BHE API-based Sentinel connector using the BloodHound Enterprise API key "
                "and endpoint URL from the BHE settings portal. "
                "Verify that attack path findings and exposure events are being written to the "
                "BloodHoundEnterprise_CL custom log table in the Sentinel workspace."
            ),
        },
        {
            "id": "bhe-analytics-phase1",
            "order": 4,
            "task": "Deploy BloodHound analytics rules — Phase 1 (critical attack paths)",
            "duration": 1.5,
            "effort_hours": 12,
            "skill_level": "advanced",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["bhe-connector"],
            "owner_role": "SOC Engineer",
            "description": (
                "Enable the first 50 analytics rules from the 102 included, focusing on Tier-0 "
                "asset exposure, DCSync path detection, and Kerberoastable account alerts querying "
                "BloodHoundEnterprise_CL. "
                "Review entity mappings and ensure Account, Host, and IP entities resolve correctly "
                "against your AD schema."
            ),
        },
        {
            "id": "bhe-analytics-phase2",
            "order": 5,
            "task": "Deploy BloodHound analytics rules — Phase 2 (lateral movement and privilege escalation)",
            "duration": 1.5,
            "effort_hours": 12,
            "skill_level": "advanced",
            "category": "phase-2",
            "phase": "Operationalization",
            "depends_on": ["bhe-analytics-phase1"],
            "owner_role": "SOC Engineer",
            "description": (
                "Enable the remaining 52 analytics rules covering ACL abuse, shadow admin detection, "
                "and cross-domain attack paths from BloodHoundEnterprise_CL. "
                "Configure workbook deployment to visualise AD attack path trends and validate that "
                "the workbook queries return data for your domain topology."
            ),
        },
        {
            "id": "bhe-validate",
            "order": 6,
            "task": "Validate BloodHound coverage and tune false-positive thresholds",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "advanced",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["bhe-analytics-phase2"],
            "owner_role": "SOC Analyst",
            "description": (
                "Simulate a common attack path scenario (e.g., Kerberoasting a service account) and "
                "confirm the corresponding rule fires within expected latency. "
                "Review the top noisy rules from Phase 1 deployment, add allowlist logic for "
                "known-good service accounts, and document baseline attack path exposure metrics."
            ),
        },
    ],

    "zscaler": [
        {
            "id": "zscaler-prereqs",
            "order": 1,
            "task": "Validate Zscaler licensing and plan NSS deployment architecture",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "advanced",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "Zscaler Admin",
            "description": (
                "Confirm active licences for ZIA (Internet Access) and ZPA (Private Access) in the "
                "Zscaler Admin Portal. "
                "Design the NSS (Nanolog Streaming Service) topology: determine which ZIA log feeds "
                "(web, DNS, firewall, tunnel) will stream via Syslog/CEF and which ZPA components "
                "will use the API connector, then document the target Log Analytics workspace and DCR."
            ),
        },
        {
            "id": "zscaler-nss",
            "order": 2,
            "task": "Deploy and configure ZIA Nanolog Streaming Service (NSS) for Sentinel",
            "duration": 2.0,
            "effort_hours": 16,
            "skill_level": "advanced",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["zscaler-prereqs"],
            "owner_role": "Zscaler Admin",
            "description": (
                "In the ZIA Admin Portal, create NSS feeds for web, DNS, firewall, and tunnel log types, "
                "targeting the Log Analytics agent (MMA/AMA) or CEF forwarder on a dedicated collector VM. "
                "Validate that logs arrive in ZscalerNSSLogs_CL (or the relevant typed tables) within "
                "the Sentinel workspace before proceeding to connector configuration."
            ),
        },
        {
            "id": "zscaler-connectors",
            "order": 3,
            "task": "Enable Zscaler Sentinel data connectors for ZIA and ZPA",
            "duration": 1.5,
            "effort_hours": 12,
            "skill_level": "advanced",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["zscaler-nss"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy all applicable Zscaler connectors from the solution (up to 15 connectors "
                "covering ZIA Web, ZIA DNS, ZIA Firewall, ZPA, and more), each targeting the "
                "ZscalerNSSLogs_CL table or its product-specific variants. "
                "For ZPA, configure the API-based connector using the ZPA Client ID and Secret from "
                "the Zscaler Admin Portal and confirm event ingestion from ZPAAppLogs_CL."
            ),
        },
        {
            "id": "zscaler-workbooks",
            "order": 4,
            "task": "Deploy Zscaler workbooks and analytics rules",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["zscaler-connectors"],
            "owner_role": "SOC Engineer",
            "description": (
                "Install the 17 included Zscaler workbooks covering URL filtering trends, shadow IT "
                "discovery, and ZPA access summaries. "
                "Enable analytics rules detecting anomalous web categories, data exfiltration via "
                "allowed applications, and ZPA access policy violations querying ZscalerNSSLogs_CL."
            ),
        },
        {
            "id": "zscaler-playbooks",
            "order": 5,
            "task": "Configure Zscaler incident response playbooks",
            "duration": 1.5,
            "effort_hours": 12,
            "skill_level": "advanced",
            "category": "phase-2",
            "phase": "Operationalization",
            "depends_on": ["zscaler-workbooks"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the 10 included Logic App playbooks that call the Zscaler API to block URLs, "
                "quarantine users, or update category policies in response to Sentinel incidents. "
                "Authorise each playbook's managed identity with the Zscaler API key stored in "
                "Azure Key Vault and test isolation actions in a Zscaler sandbox tenant."
            ),
        },
        {
            "id": "zscaler-validate",
            "order": 6,
            "task": "Validate Zscaler log coverage and tune detection rules",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["zscaler-playbooks"],
            "owner_role": "SOC Analyst",
            "description": (
                "Query ZscalerNSSLogs_CL to confirm all expected log types (web, DNS, firewall, tunnel) "
                "are present and that field parsing is correct for action, url, and user columns. "
                "Run a test block action via the playbook and verify the URL category update propagates "
                "in the Zscaler portal within the expected SLA."
            ),
        },
    ],

    "vectra-xdr": [
        {
            "id": "vectra-prereqs",
            "order": 1,
            "task": "Provision Vectra XDR API credentials and network sensor access",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "Vectra Admin",
            "description": (
                "Generate a Vectra AI API token with read-access to detections, hosts, accounts, "
                "and events from the Vectra XDR portal under Settings → API Clients. "
                "Confirm network sensors are deployed on key segments and that detection events are "
                "appearing in the Vectra UI before integrating with Sentinel."
            ),
        },
        {
            "id": "vectra-connector",
            "order": 2,
            "task": "Configure Vectra XDR data connector and validate VectraAI_CL ingestion",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["vectra-prereqs"],
            "owner_role": "SOC Engineer",
            "description": (
                "Install the Vectra XDR connector in Sentinel, entering the Vectra portal URL and API "
                "token to begin polling detection and audit events via the REST API. "
                "Verify data appears in VectraAI_CL with correct detection_type, src_ip, and "
                "certainty_score fields populated before enabling analytics."
            ),
        },
        {
            "id": "vectra-analytics",
            "order": 3,
            "task": "Enable Vectra XDR analytics rules and workbook",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["vectra-connector"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the 7 included analytics rules detecting command-and-control, lateral movement, "
                "and data exfiltration based on high-certainty Vectra AI detections in VectraAI_CL. "
                "Install the Vectra XDR workbook to visualise top attacked hosts, detection trends, "
                "and sensor coverage across network segments."
            ),
        },
        {
            "id": "vectra-playbooks",
            "order": 4,
            "task": "Deploy and authorise Vectra XDR response playbooks",
            "duration": 1.5,
            "effort_hours": 12,
            "skill_level": "advanced",
            "category": "phase-2",
            "phase": "Operationalization",
            "depends_on": ["vectra-analytics"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the 20 included Logic App playbooks for Vectra-driven incident response, "
                "including host/account lock actions that call back to the Vectra API and "
                "enrichment playbooks that add Vectra threat score context to Sentinel incidents. "
                "Store the Vectra API token in Azure Key Vault and reference it via a Key Vault "
                "connection from each playbook."
            ),
        },
        {
            "id": "vectra-validate",
            "order": 5,
            "task": "Validate Vectra coverage and test automated response workflows",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["vectra-playbooks"],
            "owner_role": "SOC Analyst",
            "description": (
                "Trigger a test detection in Vectra (using the built-in detection simulator if available) "
                "and confirm the event flows into VectraAI_CL and raises a Sentinel incident within SLA. "
                "Verify the host-lock playbook completes successfully and that the Vectra portal reflects "
                "the lock state change."
            ),
        },
    ],

    "rubrik-security-cloud": [
        {
            "id": "rubrik-prereqs",
            "order": 1,
            "task": "Provision Rubrik Security Cloud API access and enable audit logging",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "Rubrik Admin",
            "description": (
                "In Rubrik Security Cloud, create a service account with Security Auditor or Admin "
                "role and generate a client ID and secret for API access. "
                "Enable the audit log and security event streams in RSC Settings to ensure ransomware "
                "detection events, policy violations, and backup anomalies are surfaced via the API."
            ),
        },
        {
            "id": "rubrik-connector",
            "order": 2,
            "task": "Configure Rubrik Security Cloud Sentinel connectors",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["rubrik-prereqs"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy both included Rubrik connectors (RSC events and activity log) in Sentinel, "
                "providing the RSC API client credentials and GraphQL endpoint URL. "
                "Confirm that backup job anomalies and ransomware threat hunt results populate the "
                "Rubrik_CL custom log table with expected fields including objectType, clusterName, "
                "and anomalyProbability."
            ),
        },
        {
            "id": "rubrik-analytics",
            "order": 3,
            "task": "Enable Rubrik analytics rules for ransomware and data protection alerts",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["rubrik-connector"],
            "owner_role": "SOC Engineer",
            "description": (
                "Enable the 2 included analytics rules detecting high-probability ransomware anomalies "
                "and sensitive data policy violations from Rubrik_CL. "
                "Tune the anomalyProbability threshold in the KQL queries to match the organisation's "
                "risk tolerance, and confirm entity mapping for the affected host and object fields."
            ),
        },
        {
            "id": "rubrik-playbooks",
            "order": 4,
            "task": "Deploy Rubrik ransomware response playbooks",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "advanced",
            "category": "phase-2",
            "phase": "Operationalization",
            "depends_on": ["rubrik-analytics"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the 18 included Logic App playbooks for automated ransomware response, including "
                "on-demand snapshot initiation, quarantine-snapshot enforcement, and recovery point "
                "verification workflows that call the Rubrik Security Cloud GraphQL API. "
                "Validate authorisation with the RSC service account and run a test recovery point "
                "check in a non-production environment."
            ),
        },
        {
            "id": "rubrik-validate",
            "order": 5,
            "task": "Validate Rubrik telemetry and test recovery workflow",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["rubrik-playbooks"],
            "owner_role": "SOC Analyst",
            "description": (
                "Query Rubrik_CL to verify backup event coverage across all protected workloads "
                "(VMs, databases, NAS) and check anomaly detection events for completeness. "
                "Trigger a simulated ransomware detection playbook run and confirm a snapshot is "
                "initiated and the incident is updated with recovery point details."
            ),
        },
    ],

    "corelight": [
        {
            "id": "corelight-prereqs",
            "order": 1,
            "task": "Verify Corelight sensor deployment and Zeek log availability",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "Network Admin",
            "description": (
                "Confirm Corelight sensors (hardware appliances or Corelight Cloud Sensor) are "
                "deployed on key network taps and that Zeek logs (conn, dns, http, ssl, files) "
                "are being generated. "
                "Identify the syslog or Kafka export target and ensure network routing allows "
                "log forwarding to the Sentinel ingestion endpoint."
            ),
        },
        {
            "id": "corelight-connector",
            "order": 2,
            "task": "Configure Corelight Sentinel connector and Zeek log ingestion",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["corelight-prereqs"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the Corelight connector in Sentinel, configuring the log forwarding agent "
                "or Azure Monitor Agent DCR to parse and route Zeek JSON log streams into Corelight_CL. "
                "Verify all expected Zeek log types appear in Corelight_CL and that the _path field "
                "correctly identifies conn, dns, http, ssl, and notice log types."
            ),
        },
        {
            "id": "corelight-analytics",
            "order": 3,
            "task": "Deploy Corelight analytics rules and workbooks",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["corelight-connector"],
            "owner_role": "SOC Engineer",
            "description": (
                "Enable the 10 included analytics rules covering DNS tunnelling, C2 beaconing, "
                "lateral movement via SMB, and TLS certificate anomalies detected from Corelight_CL. "
                "Install the 6 included workbooks for network traffic baseline, protocol distribution, "
                "and threat hunting dashboards."
            ),
        },
        {
            "id": "corelight-validate",
            "order": 4,
            "task": "Validate Corelight network evidence coverage and tune rules",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["corelight-analytics"],
            "owner_role": "SOC Analyst",
            "description": (
                "Query Corelight_CL to verify event volume and log type distribution are consistent "
                "with expected sensor coverage. "
                "Test DNS tunnelling detection by querying against known-bad domains and adjust "
                "query thresholds to eliminate noise from legitimate long-label DNS patterns in "
                "the environment."
            ),
        },
    ],

    "cisco-umbrella": [
        {
            "id": "umbrella-prereqs",
            "order": 1,
            "task": "Validate Cisco Umbrella licensing and enable S3/API log export",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "Cisco Umbrella Admin",
            "description": (
                "Confirm an active Cisco Umbrella Advantage or higher licence that includes log export. "
                "In the Umbrella dashboard navigate to Admin → Log Management and enable DNS, proxy, "
                "and firewall log exports to the S3 bucket or directly configure the API-based "
                "Sentinel connector credentials."
            ),
        },
        {
            "id": "umbrella-connectors",
            "order": 2,
            "task": "Configure Cisco Umbrella Sentinel connectors",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["umbrella-prereqs"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy both included Umbrella connectors (DNS Logs and Proxy Logs) in Sentinel, "
                "providing the Umbrella organisation ID, API key, and API secret. "
                "Confirm that DNS query events populate Cisco_Umbrella_dns_CL and proxy events "
                "populate Cisco_Umbrella_proxy_CL with expected fields including action, verdict, "
                "and identities."
            ),
        },
        {
            "id": "umbrella-analytics",
            "order": 3,
            "task": "Enable Cisco Umbrella analytics rules and workbook",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["umbrella-connectors"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the 10 included analytics rules for Cisco Umbrella covering DNS-based C2, "
                "DGA domain detection, and newly registered domain access from Cisco_Umbrella_dns_CL. "
                "Install the Umbrella workbook to visualise DNS query volume, top blocked categories, "
                "and policy violation trends."
            ),
        },
        {
            "id": "umbrella-playbooks",
            "order": 4,
            "task": "Configure Umbrella blocking playbooks",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "advanced",
            "category": "phase-2",
            "phase": "Operationalization",
            "depends_on": ["umbrella-analytics"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the 5 included Logic App playbooks that call the Umbrella Enforcement API "
                "to block domains identified in Sentinel incidents. "
                "Store the Umbrella API credentials in Azure Key Vault and validate that a test "
                "domain block propagates to the Umbrella enforcement list within expected latency."
            ),
        },
        {
            "id": "umbrella-validate",
            "order": 5,
            "task": "Validate Umbrella DNS log coverage and test domain blocking workflow",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["umbrella-playbooks"],
            "owner_role": "SOC Analyst",
            "description": (
                "Query Cisco_Umbrella_dns_CL to confirm DNS query volume covers all expected user "
                "populations and office locations. "
                "Trigger a test incident for a DGA detection rule and verify the domain block playbook "
                "adds the indicator to the Umbrella destination list."
            ),
        },
    ],

    "sap-btp": [
        {
            "id": "sap-prereqs",
            "order": 1,
            "task": "Enable SAP BTP audit logging and provision API access",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "advanced",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "SAP Admin",
            "description": (
                "In the SAP BTP cockpit, enable the Audit Log Retrieval API in your subaccount and "
                "bind the Audit Log Management service to obtain OAuth2 client credentials. "
                "Confirm the service plan includes audit log retrieval (Premium or standard with audit "
                "log retention) and that user activity, security, and system events are being logged."
            ),
        },
        {
            "id": "sap-connector",
            "order": 2,
            "task": "Configure SAP BTP Sentinel connector for audit log ingestion",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "advanced",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["sap-prereqs"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the SAP BTP connector in Sentinel, entering the BTP OAuth2 token URL, "
                "client ID, and client secret to begin polling the Audit Log Retrieval API. "
                "Verify that audit events are populating the SAPAuditLog_CL table with correct "
                "fields including user, service, action, and timestamp."
            ),
        },
        {
            "id": "sap-analytics",
            "order": 3,
            "task": "Deploy SAP BTP analytics rules covering privilege misuse and data access",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["sap-connector"],
            "owner_role": "SOC Engineer",
            "description": (
                "Enable the 15 included analytics rules detecting privilege escalation, sensitive "
                "data access, and configuration changes in SAP BTP environments via SAPAuditLog_CL. "
                "Install the SAP BTP workbook to visualise user activity, admin operations, and "
                "service-level event trends across subaccounts."
            ),
        },
        {
            "id": "sap-validate",
            "order": 4,
            "task": "Validate SAP BTP audit coverage and tune detection thresholds",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["sap-analytics"],
            "owner_role": "SOC Analyst",
            "description": (
                "Query SAPAuditLog_CL to verify that user activity, security events, and system "
                "configuration changes are all represented and that field parsing matches expected "
                "SAP BTP audit schema. "
                "Review analytics rule thresholds for sensitive service access and adjust user "
                "allowlists to reduce noise from automated SAP integration accounts."
            ),
        },
    ],

    "palo-alto-prisma-cloud-2": [
        {
            "id": "prisma-prereqs",
            "order": 1,
            "task": "Generate Prisma Cloud API credentials and configure alert export",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "Prisma Cloud Admin",
            "description": (
                "In the Prisma Cloud console, navigate to Settings → Access Keys and generate a "
                "read-only service account key and secret for Sentinel integration. "
                "Enable alert notifications and confirm that CSPM findings, config alerts, and "
                "anomaly alerts are enabled for the cloud accounts you want to monitor."
            ),
        },
        {
            "id": "prisma-connector",
            "order": 2,
            "task": "Configure Palo Alto Prisma Cloud v2 Sentinel connector",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["prisma-prereqs"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the Prisma Cloud 2 connector in Sentinel using the Prisma Cloud API URL, "
                "Access Key ID, and Secret Key. "
                "Verify that cloud posture findings and anomaly detections populate the "
                "PrismaCloud_CL or SecurityAlert table with correct alert_id, resource, and "
                "severity fields."
            ),
        },
        {
            "id": "prisma-analytics",
            "order": 3,
            "task": "Enable Prisma Cloud CSPM analytics rules and workbook",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["prisma-connector"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the 11 included analytics rules for Prisma Cloud covering critical CSPM "
                "misconfigurations, network exposure findings, and IAM risk detections. "
                "Install the Prisma Cloud workbook to visualise cloud posture trends, alert severity "
                "distribution, and top violated policies across AWS, Azure, and GCP."
            ),
        },
        {
            "id": "prisma-playbooks",
            "order": 4,
            "task": "Configure Prisma Cloud remediation playbooks",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "advanced",
            "category": "phase-2",
            "phase": "Operationalization",
            "depends_on": ["prisma-analytics"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the 3 included Logic App playbooks for automated Prisma Cloud alert "
                "status update, suppression, and ticketing integration. "
                "Authorise playbooks using the stored Prisma Cloud API credentials and run a test "
                "alert dismiss action to confirm bidirectional status synchronisation."
            ),
        },
        {
            "id": "prisma-validate",
            "order": 5,
            "task": "Validate Prisma Cloud posture findings and tune noise",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["prisma-playbooks"],
            "owner_role": "SOC Analyst",
            "description": (
                "Review the top-volume analytics rule alerts and suppress expected findings from "
                "known-compliant resources using Sentinel alert suppression or Prisma Cloud alert "
                "suppression rules. "
                "Confirm entity enrichment (cloud account, resource ARN/ID) is populating correctly "
                "in Sentinel incidents for prioritised investigation."
            ),
        },
    ],

    "sentinelone": [
        {
            "id": "s1-prereqs",
            "order": 1,
            "task": "Generate SentinelOne API token and verify agent coverage",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "SentinelOne Admin",
            "description": (
                "In the SentinelOne management console, create a service user with Viewer role "
                "and generate a long-lived API token for Sentinel integration. "
                "Confirm that all target endpoints have active SentinelOne agents at the expected "
                "protection policy level (Protect or Detect) before configuring the connector."
            ),
        },
        {
            "id": "s1-connectors",
            "order": 2,
            "task": "Configure SentinelOne Sentinel connectors",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["s1-prereqs"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the 2 included SentinelOne connectors (Threats and Alerts) in Sentinel, "
                "providing the SentinelOne management console URL and API token. "
                "Verify threat events are populating SentinelOne_CL with critical fields including "
                "threatInfo_classification, agentInfo_computerName, and mitigationStatus."
            ),
        },
        {
            "id": "s1-analytics",
            "order": 3,
            "task": "Deploy SentinelOne analytics rules and workbook",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["s1-connectors"],
            "owner_role": "SOC Engineer",
            "description": (
                "Enable the 11 included analytics rules for SentinelOne detecting unmitigated threats, "
                "suspicious process chains, and agent health degradation from SentinelOne_CL. "
                "Install the SentinelOne workbook to track threat volume by classification, "
                "mitigation status, and top affected endpoints."
            ),
        },
        {
            "id": "s1-validate",
            "order": 4,
            "task": "Validate SentinelOne threat event coverage and tune false positives",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["s1-analytics"],
            "owner_role": "SOC Analyst",
            "description": (
                "Query SentinelOne_CL to confirm threat classifications and mitigation statuses match "
                "what is visible in the SentinelOne management console. "
                "Review analytics rules for false positives from approved testing tools and apply "
                "entity-based exclusions for known-good security tooling."
            ),
        },
    ],

    "cisco-secure-endpoint": [
        {
            "id": "cse-prereqs",
            "order": 1,
            "task": "Provision Cisco Secure Endpoint API credentials and verify AMP coverage",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "Cisco Secure Endpoint Admin",
            "description": (
                "In Cisco Secure Endpoint (formerly AMP for Endpoints) console, navigate to "
                "Accounts → API Credentials and generate a read-only API client ID and key. "
                "Confirm all target endpoints have active Cisco Secure Endpoint connectors and "
                "that events are visible in the AMP console before configuring Sentinel ingestion."
            ),
        },
        {
            "id": "cse-connector",
            "order": 2,
            "task": "Configure Cisco Secure Endpoint Sentinel connector",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["cse-prereqs"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the Cisco Secure Endpoint connector in Sentinel, providing the API client "
                "ID and API key for the appropriate regional AMP cloud (US, EU, APJC). "
                "Verify that threat detection events populate CiscoSecureEndpoint_CL with fields "
                "including event_type, computer_hostname, detection, and disposition."
            ),
        },
        {
            "id": "cse-analytics",
            "order": 3,
            "task": "Enable Cisco Secure Endpoint analytics rules and workbook",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["cse-connector"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the 11 included analytics rules for Cisco Secure Endpoint covering malware "
                "detection, policy violation, and retrospective detection events from "
                "CiscoSecureEndpoint_CL. "
                "Install the Cisco Secure Endpoint workbook to visualise detection trends, "
                "top infected hosts, and event type distribution."
            ),
        },
        {
            "id": "cse-validate",
            "order": 4,
            "task": "Validate AMP telemetry ingestion and tune detection rules",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["cse-analytics"],
            "owner_role": "SOC Analyst",
            "description": (
                "Query CiscoSecureEndpoint_CL to confirm event volume and event_type distribution "
                "match what is reported in the AMP console. "
                "Review analytics rule thresholds for retrospective detection alerts and confirm "
                "that entity mapping for host and file hash fields is resolving correctly."
            ),
        },
    ],

    "cloudflare": [
        {
            "id": "cf-prereqs",
            "order": 1,
            "task": "Enable Cloudflare Logpush and provision API token",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "Cloudflare Admin",
            "description": (
                "In the Cloudflare dashboard, navigate to Analytics → Logs → Logpush and create a "
                "Logpush job targeting the Azure Blob Storage or HTTP endpoint connected to the "
                "Sentinel workspace. "
                "Ensure the Cloudflare plan includes Logpush (Business or Enterprise) and select "
                "HTTP requests, Firewall events, and DNS log datasets for export."
            ),
        },
        {
            "id": "cf-connectors",
            "order": 2,
            "task": "Configure Cloudflare Sentinel connectors",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["cf-prereqs"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy both included Cloudflare connectors (HTTP Requests and Firewall Events) "
                "in Sentinel, configuring the Logpush destination to route logs into Cloudflare_CL. "
                "Verify that WAF action events, bot scores, and firewall rule triggers appear in "
                "Cloudflare_CL with the ClientIP, Action, and RuleID fields populated."
            ),
        },
        {
            "id": "cf-analytics",
            "order": 3,
            "task": "Deploy Cloudflare analytics rules and WAF workbook",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["cf-connectors"],
            "owner_role": "SOC Engineer",
            "description": (
                "Enable the 10 included analytics rules for Cloudflare covering WAF bypass attempts, "
                "DDoS spike detection, bot traffic anomalies, and repeated block events from the "
                "same source IP via Cloudflare_CL. "
                "Install the Cloudflare workbook to visualise threat event volume, top attacker IPs, "
                "and WAF rule effectiveness."
            ),
        },
        {
            "id": "cf-validate",
            "order": 4,
            "task": "Validate Cloudflare log coverage and tune WAF detection rules",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["cf-analytics"],
            "owner_role": "SOC Analyst",
            "description": (
                "Query Cloudflare_CL to confirm firewall event volume and dataset coverage across "
                "all zones. "
                "Adjust analytics rule thresholds for blocked request spike detection to reflect "
                "normal traffic patterns for your origin application, and add source IP exceptions "
                "for legitimate security scanners."
            ),
        },
    ],

    "imperva-cloud-waf": [
        {
            "id": "imperva-prereqs",
            "order": 1,
            "task": "Enable Imperva Cloud WAF log export and provision API credentials",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "Imperva Admin",
            "description": (
                "In the Imperva Cloud Security Console, navigate to Site → Settings → Log Configuration "
                "and enable SIEM integration to stream WAF access logs and security events to the "
                "Sentinel log collector via S3 or HTTPS endpoint. "
                "Generate an API ID and API Key under Account → API Keys for the Sentinel connector."
            ),
        },
        {
            "id": "imperva-connectors",
            "order": 2,
            "task": "Configure Imperva Cloud WAF Sentinel connectors",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["imperva-prereqs"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy both included Imperva connectors (WAF events and access logs) in Sentinel, "
                "providing the Imperva API ID and API Key. "
                "Verify that WAF block and challenge events populate ImpervaWAF_CL with fields "
                "including attackType, clientIp, and siteName."
            ),
        },
        {
            "id": "imperva-analytics",
            "order": 3,
            "task": "Enable Imperva WAF analytics rules and security workbook",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["imperva-connectors"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the 10 included analytics rules for Imperva Cloud WAF covering SQL injection, "
                "XSS, remote file inclusion, and DDoS mitigation events from ImpervaWAF_CL. "
                "Install the Imperva WAF workbook to visualise attack type trends, top source IPs, "
                "and blocked vs. challenged request ratios."
            ),
        },
        {
            "id": "imperva-validate",
            "order": 4,
            "task": "Validate Imperva WAF event coverage and tune detection thresholds",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["imperva-analytics"],
            "owner_role": "SOC Analyst",
            "description": (
                "Query ImpervaWAF_CL to confirm attack type coverage and verify that the severity "
                "field mapping aligns with Imperva's severity classification. "
                "Review analytics rules for high-volume attack type detections and add threshold "
                "adjustments to reduce noise from legitimate security testing traffic."
            ),
        },
    ],

    "google-cloud-platform-dns": [
        {
            "id": "gcpdns-prereqs",
            "order": 1,
            "task": "Enable GCP Cloud DNS logging and configure log export to Pub/Sub",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "GCP Admin",
            "description": (
                "In Google Cloud Console, enable Cloud DNS query logging for the target DNS zones "
                "under DNS → Zones → Logging. "
                "Create a Cloud Logging export sink routing DNS query logs to a Pub/Sub topic or "
                "Cloud Storage bucket that the Sentinel connector can access via a GCP service account "
                "with Pub/Sub Subscriber or Storage Object Viewer permissions."
            ),
        },
        {
            "id": "gcpdns-connector",
            "order": 2,
            "task": "Configure GCP DNS Sentinel connector",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["gcpdns-prereqs"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the Google Cloud Platform DNS connector in Sentinel, providing the GCP "
                "project ID and service account key JSON for the Pub/Sub subscription. "
                "Verify that DNS query events populate GCP_DNSLogs_CL with fields including "
                "queryName, queryType, responseCode, and sourceIP."
            ),
        },
        {
            "id": "gcpdns-analytics",
            "order": 3,
            "task": "Deploy GCP DNS analytics rules covering DNS-based threats",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["gcpdns-connector"],
            "owner_role": "SOC Engineer",
            "description": (
                "Enable the 11 included analytics rules for GCP Cloud DNS covering DNS tunnelling, "
                "DGA domain queries, high query rate anomalies, and queries to threat intelligence "
                "indicators from GCP_DNSLogs_CL. "
                "Review entity mapping for source IP and domain fields to ensure Sentinel incident "
                "generation includes accurate host and domain entities."
            ),
        },
        {
            "id": "gcpdns-validate",
            "order": 4,
            "task": "Validate GCP DNS log ingestion and tune threshold-based rules",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["gcpdns-analytics"],
            "owner_role": "SOC Analyst",
            "description": (
                "Query GCP_DNSLogs_CL to confirm zone coverage and verify DNS query volume aligns "
                "with GCP project-level DNS traffic expectations. "
                "Tune query rate anomaly detection thresholds to baseline normal GCP workload DNS "
                "patterns and exclude internal GCP service discovery queries."
            ),
        },
    ],

    "google-workspace-reports": [
        {
            "id": "gws-prereqs",
            "order": 1,
            "task": "Configure Google Workspace Admin SDK access and service account delegation",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "Google Workspace Admin",
            "description": (
                "In Google Cloud Console, create a service account with domain-wide delegation "
                "enabled and grant it the Reports API read scope "
                "(https://www.googleapis.com/auth/admin.reports.audit.readonly). "
                "In the Google Workspace Admin Console under Security → API Controls, authorise "
                "the service account client ID for the audit reporting scope."
            ),
        },
        {
            "id": "gws-connector",
            "order": 2,
            "task": "Configure Google Workspace Reports Sentinel connector",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["gws-prereqs"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the Google Workspace Reports connector in Sentinel, providing the service "
                "account key JSON, admin email (for delegation), and the Workspace customer ID. "
                "Verify that audit events populate GWorkspaceActivityReports_CL with correct fields "
                "including actor_email, event_name, ipAddress, and application_name."
            ),
        },
        {
            "id": "gws-analytics",
            "order": 3,
            "task": "Enable Google Workspace analytics rules and workbook",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["gws-connector"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the 10 included analytics rules for Google Workspace covering suspicious admin "
                "actions, external file sharing anomalies, OAuth application grants, and login from "
                "unusual locations from GWorkspaceActivityReports_CL. "
                "Install the Workspace Reports workbook to visualise admin activity, Drive sharing "
                "events, and login geography."
            ),
        },
        {
            "id": "gws-validate",
            "order": 4,
            "task": "Validate Workspace audit log coverage and tune user behaviour rules",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["gws-analytics"],
            "owner_role": "SOC Analyst",
            "description": (
                "Query GWorkspaceActivityReports_CL to confirm all expected Workspace applications "
                "(Login, Drive, Admin, Gmail) are represented. "
                "Review anomalous external share rules and set allowed domain exceptions for known "
                "partner organisations to reduce noise from legitimate external collaboration."
            ),
        },
    ],

    "tanium": [
        {
            "id": "tanium-prereqs",
            "order": 1,
            "task": "Provision Tanium Connect module and configure Sentinel output",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "Tanium Admin",
            "description": (
                "Confirm that the Tanium Connect module is licensed and active on the Tanium server. "
                "Create a Connect connection targeting the Log Analytics HTTP Data Collector endpoint "
                "and configure the endpoint management event types (discover, comply, threat response) "
                "to be forwarded to Sentinel."
            ),
        },
        {
            "id": "tanium-connector",
            "order": 2,
            "task": "Configure Tanium Sentinel connector and validate log ingestion",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["tanium-prereqs"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the Tanium connector in Sentinel and confirm it reaches Connected status. "
                "Verify that endpoint management events are flowing into Tanium_CL with fields "
                "including computer_name, event_type, and finding_details populated for both "
                "compliance and threat response event types."
            ),
        },
        {
            "id": "tanium-analytics",
            "order": 3,
            "task": "Enable Tanium analytics rule and workbook for endpoint visibility",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["tanium-connector"],
            "owner_role": "SOC Engineer",
            "description": (
                "Enable the included Tanium analytics rule for endpoint compliance and threat response "
                "signals from Tanium_CL. "
                "Deploy the Tanium workbook to visualise endpoint compliance posture, vulnerability "
                "exposure, and threat response alert trends across the managed endpoint estate."
            ),
        },
        {
            "id": "tanium-playbooks",
            "order": 4,
            "task": "Configure Tanium incident response playbooks",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "advanced",
            "category": "phase-2",
            "phase": "Operationalization",
            "depends_on": ["tanium-analytics"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the 8 included Logic App playbooks that call the Tanium REST API to initiate "
                "endpoint isolation, run on-demand sensor queries, and trigger remediation package "
                "deployments from Sentinel incidents. "
                "Authorise each playbook's managed identity against the Tanium API server and validate "
                "a test isolation action on a non-critical endpoint."
            ),
        },
        {
            "id": "tanium-validate",
            "order": 5,
            "task": "Validate Tanium endpoint coverage and test automated remediation",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["tanium-playbooks"],
            "owner_role": "SOC Analyst",
            "description": (
                "Query Tanium_CL to confirm endpoint event coverage and that compliance findings "
                "are updating at the expected cadence. "
                "Trigger a test Sentinel incident and run the Tanium playbook to execute a quick "
                "question query, verifying the response is returned and attached to the incident."
            ),
        },
    ],

    "theom": [
        {
            "id": "theom-prereqs",
            "order": 1,
            "task": "Provision Theom API credentials and configure data store scanning",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "Theom Admin",
            "description": (
                "In the Theom console, generate an API key for the Sentinel integration under "
                "Settings → API Keys. "
                "Confirm that Theom is connected to your cloud data stores (S3, GCS, Azure Blob, "
                "databases) and that data classification scans are completing successfully before "
                "enabling log export to Sentinel."
            ),
        },
        {
            "id": "theom-connector",
            "order": 2,
            "task": "Configure Theom Sentinel connector and validate Theom_CL ingestion",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["theom-prereqs"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the Theom connector in Sentinel, entering the Theom API key and endpoint URL. "
                "Verify that data risk findings and data access anomalies are populating Theom_CL "
                "with fields including riskLevel, dataStoreName, dataClassification, and actorEmail."
            ),
        },
        {
            "id": "theom-analytics",
            "order": 3,
            "task": "Deploy Theom analytics rules and data risk workbook",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["theom-connector"],
            "owner_role": "SOC Engineer",
            "description": (
                "Enable the 20 included Theom analytics rules covering sensitive data exfiltration, "
                "over-privileged data access, shadow data stores, and unusual query patterns from "
                "Theom_CL. "
                "Install the Theom workbook to visualise data risk posture, sensitive data hotspots, "
                "and access anomaly trends across cloud data stores."
            ),
        },
        {
            "id": "theom-validate",
            "order": 4,
            "task": "Validate Theom data risk findings and tune access anomaly rules",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["theom-analytics"],
            "owner_role": "SOC Analyst",
            "description": (
                "Query Theom_CL to confirm that all targeted cloud data stores appear in findings "
                "and that riskLevel classifications align with Theom's data sensitivity policies. "
                "Review access anomaly rule thresholds and exclude known ETL service accounts and "
                "data pipeline identities that generate high query volumes legitimately."
            ),
        },
    ],

    # ─────────────────────────────────────────────
    # HIGH-VALUE CONTENT-ONLY
    # ─────────────────────────────────────────────

    "falcon-friday": [
        {
            "id": "ff-prereqs",
            "order": 1,
            "task": "Verify CrowdStrike Falcon data connector and event stream status",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "SOC Engineer",
            "description": (
                "Confirm the CrowdStrike Falcon Data Replicator (FDR) or Streaming API connector "
                "is active and populating CrowdStrikeFalconEventStream or CommonSecurityLog in the "
                "Sentinel workspace. "
                "The Falcon Friday analytics rules require Falcon detection and process events to be "
                "present; validate row counts are non-zero before deploying rules."
            ),
        },
        {
            "id": "ff-analytics-phase1",
            "order": 2,
            "task": "Deploy Falcon Friday detection rules — Phase 1 (process and network)",
            "duration": 1.5,
            "effort_hours": 12,
            "skill_level": "advanced",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["ff-prereqs"],
            "owner_role": "SOC Engineer",
            "description": (
                "Enable the first 15 Falcon Friday analytics rules from CrowdStrike's Friday "
                "threat research series, covering malicious process execution, living-off-the-land "
                "binary (LOLBin) abuse, and C2 network indicators sourced from "
                "CrowdStrikeFalconEventStream. "
                "Review MITRE ATT&CK technique mapping for each rule and confirm KQL field references "
                "match your Falcon data stream schema."
            ),
        },
        {
            "id": "ff-analytics-phase2",
            "order": 3,
            "task": "Deploy Falcon Friday detection rules — Phase 2 (credential and persistence)",
            "duration": 1.5,
            "effort_hours": 12,
            "skill_level": "advanced",
            "category": "phase-2",
            "phase": "Operationalization",
            "depends_on": ["ff-analytics-phase1"],
            "owner_role": "SOC Engineer",
            "description": (
                "Enable the remaining 15 Falcon Friday analytics rules covering credential theft "
                "techniques, persistence via scheduled tasks and registry, and lateral movement "
                "detection from CrowdStrikeFalconEventStream. "
                "Tune detection thresholds for process ancestry checks to match your environment's "
                "normal parent-child process patterns."
            ),
        },
        {
            "id": "ff-validate",
            "order": 4,
            "task": "Validate Falcon Friday rule coverage and suppress known-good patterns",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "advanced",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["ff-analytics-phase2"],
            "owner_role": "SOC Analyst",
            "description": (
                "Review the top-alerting Falcon Friday rules over the first week and identify "
                "false positives from approved penetration testing tools or IT management scripts. "
                "Add allowlist entries or adjust query conditions to suppress known-good activity "
                "while preserving detection fidelity for adversarial techniques."
            ),
        },
    ],

    "web-session-essentials": [
        {
            "id": "wse-prereqs",
            "order": 1,
            "task": "Verify ASIM Web Session parser (imWebSession) is deployed and active",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "SOC Engineer",
            "description": (
                "Confirm the ASIM Web Session normalisation schema parsers are installed in the "
                "Sentinel workspace — specifically the imWebSession unifying parser and any "
                "product-specific parsers (e.g., for Palo Alto, Zscaler, or squid proxy sources). "
                "Run `imWebSession | take 10` to verify the parser returns data before deploying "
                "the Web Session Essentials content."
            ),
        },
        {
            "id": "wse-analytics",
            "order": 2,
            "task": "Deploy Web Session Essentials analytics rules using ASIM parsers",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["wse-prereqs"],
            "owner_role": "SOC Engineer",
            "description": (
                "Enable the 15 included analytics rules for the Web Session Essentials domain solution, "
                "covering rare user agents, mass download anomalies, long outbound sessions, and "
                "access to threat intelligence URLs — all querying via the imWebSession() ASIM parser. "
                "Verify that entity mapping for SrcIpAddr, DstFQDN, and SrcUsername resolves correctly "
                "across your web proxy data sources."
            ),
        },
        {
            "id": "wse-workbook",
            "order": 3,
            "task": "Deploy Web Session Essentials workbook for baseline visibility",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "beginner",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["wse-analytics"],
            "owner_role": "SOC Engineer",
            "description": (
                "Install the Web Session Essentials workbook to provide a normalised view of web "
                "traffic patterns across all ASIM-compatible proxy data sources. "
                "Validate that the workbook renders data correctly and that the parser source selector "
                "reflects all active web session data sources."
            ),
        },
        {
            "id": "wse-validate",
            "order": 4,
            "task": "Validate ASIM web session coverage and tune normalisation",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["wse-workbook"],
            "owner_role": "SOC Analyst",
            "description": (
                "Query imWebSession() to confirm that all expected proxy/firewall sources are "
                "contributing events and that key ASIM fields (EventResult, HttpStatusCode, "
                "NetworkApplicationProtocol) are populated across all sources. "
                "Document any field gaps in product-specific parsers and create GitHub issues or "
                "parser extensions to address coverage gaps."
            ),
        },
    ],

    "endpoint-threat-protection-essentials": [
        {
            "id": "etpe-prereqs",
            "order": 1,
            "task": "Verify ASIM Process Event parsers (imProcessCreate) are deployed",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "SOC Engineer",
            "description": (
                "Confirm the ASIM Process Event normalisation parsers are installed — specifically "
                "imProcessCreate and product-specific parsers for your EDR/endpoint data sources "
                "(e.g., Microsoft Defender for Endpoint, SentinelOne, CrowdStrike). "
                "Run `imProcessCreate | take 10` to verify parser output before deploying endpoint "
                "threat protection content."
            ),
        },
        {
            "id": "etpe-analytics",
            "order": 2,
            "task": "Deploy Endpoint Threat Protection Essentials analytics rules",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["etpe-prereqs"],
            "owner_role": "SOC Engineer",
            "description": (
                "Enable the 14 included analytics rules for the Endpoint Threat Protection Essentials "
                "domain solution, covering process injection, credential dumping with known tools, "
                "suspicious parent-child process chains, and LOLBin execution — all querying via "
                "imProcessCreate() ASIM parser. "
                "Review MITRE ATT&CK mappings and confirm entity mapping for ActorUsername and "
                "TargetProcessName is resolving across all endpoint data sources."
            ),
        },
        {
            "id": "etpe-validate",
            "order": 3,
            "task": "Validate ASIM endpoint coverage and tune process detection rules",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "advanced",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["etpe-analytics"],
            "owner_role": "SOC Analyst",
            "description": (
                "Run imProcessCreate() to confirm all expected endpoint data sources contribute events "
                "and that CommandLine, ParentProcessName, and ActorUsername fields are populated. "
                "Review top-firing rules for LOLBin and credential dump detections and add exclusions "
                "for approved IT administration scripts that trigger these rules in your environment."
            ),
        },
    ],

    "censys": [
        {
            "id": "censys-prereqs",
            "order": 1,
            "task": "Provision Censys ASM API key and define asset monitoring scope",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "Censys Admin",
            "description": (
                "In the Censys Attack Surface Management console, generate an API ID and Secret "
                "under Integrations → API for use in Sentinel playbooks. "
                "Define the organisation's seed data (domains, IP ranges, ASNs) in Censys ASM to "
                "scope internet-facing asset discovery, and confirm that certificate and host data "
                "is populating the Censys inventory before configuring playbooks."
            ),
        },
        {
            "id": "censys-playbooks",
            "order": 2,
            "task": "Deploy Censys ASM playbooks for attack surface enrichment",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "advanced",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["censys-prereqs"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the 11 included Logic App playbooks that query the Censys ASM API to enrich "
                "Sentinel incidents with internet-facing asset context, including open ports, "
                "certificate details, and associated CVEs for IP and domain entities. "
                "Store the Censys API credentials in Azure Key Vault and validate that the enrichment "
                "playbook appends Censys data to incident comments on trigger."
            ),
        },
        {
            "id": "censys-workbook",
            "order": 3,
            "task": "Deploy Censys attack surface workbook",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["censys-playbooks"],
            "owner_role": "SOC Engineer",
            "description": (
                "Install the Censys workbook that provides an attack surface overview, visualising "
                "internet-exposed assets, open service counts, certificate expiry status, and "
                "exposure trends over time. "
                "Validate that the workbook renders correctly using data from Censys enrichment "
                "playbook outputs stored in the Sentinel workspace."
            ),
        },
        {
            "id": "censys-validate",
            "order": 4,
            "task": "Validate Censys enrichment playbooks with live incident test",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["censys-workbook"],
            "owner_role": "SOC Analyst",
            "description": (
                "Trigger a test Sentinel incident containing an external IP entity and run the "
                "Censys enrichment playbook manually to verify it returns asset details and "
                "appends them to the incident comment field. "
                "Confirm the Censys workbook reflects the organisation's current internet attack "
                "surface and schedule a weekly review cadence for new asset discoveries."
            ),
        },
    ],

    "global-secure-access": [
        {
            "id": "gsa-prereqs",
            "order": 1,
            "task": "Enable Global Secure Access in Microsoft Entra and configure traffic profiles",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "Azure Platform Admin",
            "description": (
                "In the Microsoft Entra admin centre, navigate to Global Secure Access and activate "
                "the service for the tenant. "
                "Configure Internet Access and Microsoft 365 traffic forwarding profiles, deploy the "
                "Global Secure Access client to pilot devices, and confirm that network access events "
                "are appearing in the Entra sign-in logs and the NetworkAccessTraffic table."
            ),
        },
        {
            "id": "gsa-analytics",
            "order": 2,
            "task": "Deploy Global Secure Access analytics rules",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["gsa-prereqs"],
            "owner_role": "SOC Engineer",
            "description": (
                "Enable the 7 included analytics rules for Global Secure Access covering blocked "
                "traffic anomalies, token theft via impossible travel, and conditional access policy "
                "bypass attempts — querying the NetworkAccessTraffic and EnrichedMicrosoft365AuditLogs "
                "tables. "
                "Confirm that rule entity mapping for UserPrincipalName and SourceIP resolves "
                "correctly against your Entra ID user population."
            ),
        },
        {
            "id": "gsa-workbooks",
            "order": 3,
            "task": "Deploy Global Secure Access workbooks for SSE traffic visibility",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "beginner",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["gsa-analytics"],
            "owner_role": "SOC Engineer",
            "description": (
                "Install the 3 included Global Secure Access workbooks covering internet access "
                "traffic trends, M365 access patterns, and Private Access application usage. "
                "Validate that workbooks render data from NetworkAccessTraffic and confirm the "
                "traffic profile selector functions correctly."
            ),
        },
        {
            "id": "gsa-validate",
            "order": 4,
            "task": "Validate Global Secure Access log coverage and tune Conditional Access rules",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["gsa-workbooks"],
            "owner_role": "SOC Analyst",
            "description": (
                "Query NetworkAccessTraffic to confirm traffic profiles are capturing the expected "
                "user and device populations. "
                "Review impossible travel and token theft analytics rules for false positives from "
                "legitimate VPN or travel scenarios and apply named location exclusions as needed."
            ),
        },
    ],

    "microsoft-defender-threat-intelligence": [
        {
            "id": "mdti-prereqs",
            "order": 1,
            "task": "Enable Defender Threat Intelligence licence and TI connector",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "Azure Platform Admin",
            "description": (
                "Confirm that Microsoft Defender Threat Intelligence (MDTI) licences are assigned "
                "to SOC analysts who will consume the premium threat intel data. "
                "In Sentinel, enable the Microsoft Defender Threat Intelligence connector to import "
                "MDTI indicators into the ThreatIntelligenceIndicator table and verify indicators "
                "are flowing within the expected polling interval."
            ),
        },
        {
            "id": "mdti-workbook",
            "order": 2,
            "task": "Deploy MDTI threat intelligence workbook",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "beginner",
            "category": "phase-1",
            "phase": "Configuration",
            "depends_on": ["mdti-prereqs"],
            "owner_role": "SOC Engineer",
            "description": (
                "Install the MDTI workbook in Sentinel to visualise threat intelligence indicator "
                "coverage, indicator type distribution, and indicator match events. "
                "Validate the workbook renders data from ThreatIntelligenceIndicator and confirm "
                "the MDTI-specific indicator enrichment fields (confidence, tags, threat actor) "
                "are visible."
            ),
        },
        {
            "id": "mdti-playbooks",
            "order": 3,
            "task": "Deploy MDTI enrichment playbooks for incident investigation",
            "duration": 1.0,
            "effort_hours": 8,
            "skill_level": "advanced",
            "category": "phase-2",
            "phase": "Operationalization",
            "depends_on": ["mdti-workbook"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the 7 included Logic App playbooks that query the MDTI API to enrich "
                "Sentinel incidents with threat actor profiles, infrastructure analysis, and "
                "vulnerability associations for IP, domain, and hash entities. "
                "Authorise each playbook's managed identity with an MDTI API subscription key "
                "stored in Azure Key Vault."
            ),
        },
        {
            "id": "mdti-validate",
            "order": 4,
            "task": "Validate MDTI indicator ingestion and test enrichment playbooks",
            "duration": 0.5,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["mdti-playbooks"],
            "owner_role": "SOC Analyst",
            "description": (
                "Query ThreatIntelligenceIndicator to confirm MDTI indicators are refreshing on "
                "schedule and that indicator types (IP, URL, file hash, domain) are well represented. "
                "Trigger a test incident with a known-malicious IP entity and run the MDTI enrichment "
                "playbook to verify threat actor and infrastructure context is appended to the incident."
            ),
        },
    ],
}


def patch(solutions_path: str) -> None:
    path = Path(solutions_path)
    with path.open(encoding="utf-8") as f:
        data = json.load(f)

    patched, skipped_protected, skipped_missing = [], [], []

    for _cat_name, cat in data["categories"].items():
        for sol in cat.get("solutions", []):
            sid = sol["id"]
            if sid in PROTECTED:
                if sid in HIGHVALUE_TASKS:
                    skipped_protected.append(sid)
                continue
            if sid not in HIGHVALUE_TASKS:
                continue
            tasks = HIGHVALUE_TASKS[sid]
            sol["planner"]["setup_tasks"] = tasks
            patched.append(sid)

    # Re-serialise
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\n[OK] Patched {len(patched)} solutions:")
    for sid in patched:
        task_count = len(HIGHVALUE_TASKS[sid])
        print(f"   - {sid} ({task_count} tasks)")

    if skipped_protected:
        print(f"\n[WARN] Skipped {len(skipped_protected)} PROTECTED solutions:")
        for sid in skipped_protected:
            print(f"   - {sid}")

    expected = set(HIGHVALUE_TASKS.keys())
    actually_patched = set(patched)
    not_found = expected - actually_patched - set(skipped_protected)
    if not_found:
        print(f"\n[ERR] Could not find in solutions.json ({len(not_found)}):")
        for sid in sorted(not_found):
            print(f"   - {sid}")

    print(f"\nTotal solutions defined: {len(HIGHVALUE_TASKS)}")
    print(f"Total patched: {len(patched)}")
    print("Done.\n")


if __name__ == "__main__":
    patch(SOLUTIONS_PATH)
