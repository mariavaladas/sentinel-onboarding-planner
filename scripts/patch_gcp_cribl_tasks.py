"""
patch_gcp_cribl_tasks.py
========================
Fixes QA blockers B2 and B3:
  B2 — cribl-stream: add planner.setup_tasks, export_metadata, category, isFeatured
  B3 — 17 GCP connectors: add planner.setup_tasks (Pub/Sub-based ingestion pattern)

Run from repo root:  python scripts/patch_gcp_cribl_tasks.py
"""

import json
import copy

INPUT_FILE  = "data/solutions.json"
OUTPUT_FILE = "data/solutions.json"

# ---------------------------------------------------------------------------
# GCP connector catalogue
# Each entry drives task generation for the Pub/Sub-based connector pattern.
# ---------------------------------------------------------------------------
GCP_CATALOG = {
    "google-cloud-platform-audit-logs": {
        "abbrev": "gcpal",
        "short_name": "GCP Audit Logs",
        "log_description": "Admin Activity, Data Access, System Event, and Policy Denied audit logs",
        "resource_type": "gce_project / audited_resource",
        "log_filter": 'protoPayload.@type="type.googleapis.com/google.cloud.audit.AuditLog"',
        "topic_name": "sentinel-gcp-audit-logs",
        "tables": "GCPAuditLogs and Logging tables",
        "analytics": 7, "workbooks": 0, "playbooks": 0,
        "is_featured": False,
    },
    "google-cloud-platform-big-query": {
        "abbrev": "gcpbq",
        "short_name": "GCP BigQuery",
        "log_description": "BigQuery job, dataset, table, and data-access audit logs",
        "resource_type": "bigquery_project / bigquery_dataset",
        "log_filter": 'resource.type=("bigquery_project" OR "bigquery_dataset" OR "bigquery_table")',
        "topic_name": "sentinel-gcp-bigquery",
        "tables": "GCPBigQueryDataAccess and Logging tables",
        "analytics": 0, "workbooks": 0, "playbooks": 4,
        "is_featured": False,
    },
    "google-cloud-platform-cdn": {
        "abbrev": "gcpcdn",
        "short_name": "GCP CDN",
        "log_description": "Cloud CDN request and cache-hit/miss logs",
        "resource_type": "http_load_balancer (CDN-enabled backend)",
        "log_filter": 'resource.type="http_load_balancer" AND httpRequest.cacheHit!=""',
        "topic_name": "sentinel-gcp-cdn",
        "tables": "Audit, Logging, and Technologies tables",
        "analytics": 0, "workbooks": 0, "playbooks": 0,
        "is_featured": False,
    },
    "google-cloud-platform-cloud-monitoring": {
        "abbrev": "gcpcm",
        "short_name": "GCP Cloud Monitoring",
        "log_description": "Monitoring alert policy evaluation and incident logs",
        "resource_type": "monitoring_alert_policy",
        "log_filter": 'resource.type="monitoring_alert_policy"',
        "topic_name": "sentinel-gcp-monitoring",
        "tables": "Technologies table",
        "analytics": 0, "workbooks": 0, "playbooks": 0,
        "is_featured": False,
    },
    "google-cloud-platform-cloud-run": {
        "abbrev": "gcpcr",
        "short_name": "GCP Cloud Run",
        "log_description": "Cloud Run service request, container, and system logs",
        "resource_type": "cloud_run_revision",
        "log_filter": 'resource.type="cloud_run_revision"',
        "topic_name": "sentinel-gcp-cloudrun",
        "tables": "Logging and Technologies tables",
        "analytics": 0, "workbooks": 0, "playbooks": 0,
        "is_featured": False,
    },
    "google-cloud-platform-compute-engine": {
        "abbrev": "gcpce",
        "short_name": "GCP Compute Engine",
        "log_description": "VM instance activity, OS-level system, and serial console logs",
        "resource_type": "gce_instance",
        "log_filter": 'resource.type="gce_instance"',
        "topic_name": "sentinel-gcp-compute",
        "tables": "Audit and Technologies tables",
        "analytics": 0, "workbooks": 0, "playbooks": 0,
        "is_featured": False,
    },
    "google-cloud-platform-dns": {
        "abbrev": "gcpdns",
        "short_name": "GCP DNS",
        "log_description": "Cloud DNS query and response logs for all managed zones",
        "resource_type": "dns_query",
        "log_filter": 'resource.type="dns_query"',
        "topic_name": "sentinel-gcp-dns",
        "tables": "GCPDNSLogs and Logging tables",
        "analytics": 11, "workbooks": 0, "playbooks": 0,
        "is_featured": False,
    },
    "google-cloud-platform-firewall-logs": {
        "abbrev": "gcpfw",
        "short_name": "GCP Firewall Logs",
        "log_description": "VPC firewall rule allow and deny decision logs for all subnets",
        "resource_type": "gce_subnetwork (firewall reporter)",
        "log_filter": 'resource.type="gce_subnetwork" AND jsonPayload.reporter="FIREWALL"',
        "topic_name": "sentinel-gcp-firewall",
        "tables": "Logs table",
        "analytics": 0, "workbooks": 0, "playbooks": 0,
        "is_featured": False,
    },
    "google-cloud-platform-iam": {
        "abbrev": "gcpiam",
        "short_name": "GCP IAM",
        "log_description": "IAM policy change, role grant/revoke, service account creation, and key management audit logs",
        "resource_type": "iam.googleapis.com / cloudresourcemanager.googleapis.com",
        "log_filter": (
            'protoPayload.serviceName=('
            '"iam.googleapis.com" OR "cloudresourcemanager.googleapis.com")'
        ),
        "topic_name": "sentinel-gcp-iam",
        "tables": "Logging, Technologies, and GCPAuditLogs tables",
        "analytics": 10, "workbooks": 1, "playbooks": 4,
        "is_featured": True,
    },
    "google-cloud-platform-ids": {
        "abbrev": "gcpids",
        "short_name": "GCP IDS",
        "log_description": "Cloud IDS threat detection and network traffic inspection logs",
        "resource_type": "ids_endpoint",
        "log_filter": 'resource.type="ids_endpoint"',
        "topic_name": "sentinel-gcp-ids",
        "tables": "Audit, Threat, and Technologies tables",
        "analytics": 0, "workbooks": 0, "playbooks": 0,
        "is_featured": False,
    },
    "google-cloud-platform-load-balancer-logs": {
        "abbrev": "gcplb",
        "short_name": "GCP Load Balancer",
        "log_description": "HTTP(S) and TCP/UDP load balancer request and health-check logs",
        "resource_type": "http_load_balancer",
        "log_filter": 'resource.type="http_load_balancer"',
        "topic_name": "sentinel-gcp-loadbalancer",
        "tables": "Logs table",
        "analytics": 0, "workbooks": 0, "playbooks": 0,
        "is_featured": False,
    },
    "google-cloud-platform-nat": {
        "abbrev": "gcpnat",
        "short_name": "GCP NAT",
        "log_description": "Cloud NAT translation and error logs for all NAT gateway instances",
        "resource_type": "nat_gateway",
        "log_filter": 'resource.type="nat_gateway"',
        "topic_name": "sentinel-gcp-nat",
        "tables": "Audit, Logging, and Technologies tables",
        "analytics": 0, "workbooks": 0, "playbooks": 0,
        "is_featured": False,
    },
    "google-cloud-platform-resource-manager": {
        "abbrev": "gcprm",
        "short_name": "GCP Resource Manager",
        "log_description": "Project, folder, and organisation resource creation, deletion, and policy change audit logs",
        "resource_type": "cloudresourcemanager.googleapis.com",
        "log_filter": 'protoPayload.serviceName="cloudresourcemanager.googleapis.com"',
        "topic_name": "sentinel-gcp-resourcemanager",
        "tables": "Audit, Logging, and Technologies tables",
        "analytics": 0, "workbooks": 0, "playbooks": 0,
        "is_featured": False,
    },
    "google-cloud-platform-security-command-center": {
        "abbrev": "gcpscc",
        "short_name": "GCP Security Command Center",
        "log_description": "Security Command Center finding, asset discovery, and threat signal logs",
        "resource_type": "securitycenter.googleapis.com",
        "log_filter": (
            'protoPayload.serviceName="securitycenter.googleapis.com" OR '
            'resource.type="audited_resource"'
        ),
        "topic_name": "sentinel-gcp-scc",
        "tables": "SecurityCommandCenterFindings and Logging tables",
        "analytics": 5, "workbooks": 0, "playbooks": 0,
        "is_featured": False,
    },
    "google-cloud-platform-sql": {
        "abbrev": "gcpsql",
        "short_name": "GCP SQL",
        "log_description": "Cloud SQL instance activity, slow-query, general-query, and error logs",
        "resource_type": "cloudsql_database",
        "log_filter": 'resource.type="cloudsql_database"',
        "topic_name": "sentinel-gcp-sql",
        "tables": "Logging and Technologies tables",
        "analytics": 0, "workbooks": 0, "playbooks": 0,
        "is_featured": False,
    },
    "google-cloud-platform-vpc-flow-logs": {
        "abbrev": "gcpvpc",
        "short_name": "GCP VPC Flow Logs",
        "log_description": "VPC subnet network flow records including source/destination IP, port, protocol, and bytes transferred",
        "resource_type": "gce_subnetwork (vpc_flows)",
        "log_filter": 'resource.type="gce_subnetwork" AND logName=~"vpc_flows"',
        "topic_name": "sentinel-gcp-vpcflow",
        "tables": "Logs table",
        "analytics": 0, "workbooks": 0, "playbooks": 0,
        "is_featured": False,
    },
    "google-kubernetes-engine": {
        "abbrev": "gke",
        "short_name": "Google Kubernetes Engine",
        "log_description": "GKE cluster admin activity, control-plane audit, and node system logs",
        "resource_type": "k8s_cluster / gke_cluster",
        "log_filter": 'resource.type=("k8s_cluster" OR "gke_cluster" OR "gke_nodepool")',
        "topic_name": "sentinel-gke-logs",
        "tables": "AKSAudit and Logging tables",
        "analytics": 0, "workbooks": 0, "playbooks": 0,
        "is_featured": False,
    },
}

# ---------------------------------------------------------------------------
# Helper: build GCP setup_tasks for one connector
# ---------------------------------------------------------------------------
def make_gcp_tasks(sid, cfg):
    a = cfg["abbrev"]
    name = cfg["short_name"]
    log_desc = cfg["log_description"]
    resource_type = cfg["resource_type"]
    log_filter = cfg["log_filter"]
    topic = cfg["topic_name"]
    tables = cfg["tables"]
    has_any_content = (cfg["analytics"] > 0 or cfg["workbooks"] > 0 or cfg["playbooks"] > 0)
    content_count = cfg["analytics"] + cfg["workbooks"] + cfg["playbooks"]
    analytics = cfg["analytics"]
    workbooks = cfg["workbooks"]
    playbooks = cfg["playbooks"]
    is_high_content = analytics >= 10 or (analytics + workbooks + playbooks) >= 14

    tasks = []

    # ----- Task 1: Prerequisites -----
    content_label = ""
    if analytics > 0:
        content_label += f"{analytics} analytic rule{'s' if analytics != 1 else ''}"
    if workbooks > 0:
        content_label += (", " if content_label else "") + f"{workbooks} workbook{'s' if workbooks != 1 else ''}"
    if playbooks > 0:
        content_label += (", " if content_label else "") + f"{playbooks} playbook{'s' if playbooks != 1 else ''}"

    tasks.append({
        "id": f"{a}-prereqs",
        "order": 1,
        "task": f"Confirm GCP project prerequisites and IAM permissions required to export {name} data to Microsoft Sentinel.",
        "duration": 1.0,
        "effort_hours": 4,
        "skill_level": "intermediate",
        "category": "setup",
        "phase": "Prerequisites",
        "depends_on": [],
        "owner_role": "GCP Cloud Admin",
        "description": (
            f"Identify the GCP project(s) in scope and confirm that Cloud Logging is enabled for {log_desc}. "
            f"Create a GCP service account (or validate an existing one) and grant it the roles/pubsub.subscriber "
            f"and roles/logging.admin IAM roles on the target project. Download the service account JSON key for use "
            f"in the Sentinel connector. Confirm the operator holds Microsoft Sentinel Contributor and Log Analytics "
            f"Contributor on the target Sentinel workspace."
        ),
    })

    # ----- Task 2: GCP Pub/Sub infrastructure -----
    tasks.append({
        "id": f"{a}-pubsub",
        "order": 2,
        "task": f"Create GCP Pub/Sub topic, subscription, and Cloud Logging sink for {name}.",
        "duration": 1.0,
        "effort_hours": 4,
        "skill_level": "intermediate",
        "category": "setup",
        "phase": "Configuration",
        "depends_on": [f"{a}-prereqs"],
        "owner_role": "GCP Cloud Admin",
        "description": (
            f"In the GCP Console (or via gcloud CLI), create a Pub/Sub topic named {topic} and a corresponding "
            f"pull subscription with a 7-day message retention window. Create a Cloud Logging sink at the project "
            f"(or organisation) level with the inclusion filter: {log_filter}. Set the sink destination to the "
            f"Pub/Sub topic. Verify the sink is active by checking Cloud Logging for {name} events and confirming "
            f"they land in the Pub/Sub subscription before proceeding to connector configuration."
        ),
    })

    # ----- Task 3: Sentinel connector configuration -----
    tasks.append({
        "id": f"{a}-connector",
        "order": 3,
        "task": f"Configure the {name} data connector in Microsoft Sentinel.",
        "duration": 0.5,
        "effort_hours": 2,
        "skill_level": "beginner",
        "category": "setup",
        "phase": "Configuration",
        "depends_on": [f"{a}-pubsub"],
        "owner_role": "Azure Platform Admin",
        "description": (
            f"Open the {name} connector page in the Microsoft Sentinel Content Hub (or Data Connectors blade). "
            f"Enter the GCP Project ID, the Pub/Sub subscription name ({topic}-sub), and paste the service account "
            f"JSON credentials. Save and enable the connector. Confirm the connector status changes to Connected "
            f"and that the last data received timestamp is updating within the expected polling interval."
        ),
    })

    # ----- Task 4: Data verification -----
    tasks.append({
        "id": f"{a}-verify",
        "order": 4,
        "task": f"Validate {name} ingestion in Microsoft Sentinel.",
        "duration": 0.5,
        "effort_hours": 2,
        "skill_level": "beginner",
        "category": "setup",
        "phase": "Validation",
        "depends_on": [f"{a}-connector"],
        "owner_role": "SOC Analyst",
        "description": (
            f"Run KQL queries against the {tables} to confirm recent {name} records are arriving with correct "
            f"timestamps, resource identifiers, and log payloads. Verify that the GCP project ID, resource type, "
            f"and severity fields are populated. Generate a representative {name} event in GCP (for example, "
            f"modify an IAM policy, trigger a DNS query, or create a resource) and confirm it appears in Sentinel "
            f"within the connector's expected polling latency (typically 5–15 minutes)."
        ),
    })

    # ----- Task 5: Operationalization (only when content exists) -----
    if has_any_content:
        content_parts = []
        if analytics > 0:
            content_parts.append(f"{analytics} analytic rule{'s' if analytics != 1 else ''}")
        if workbooks > 0:
            content_parts.append(f"{workbooks} workbook{'s' if workbooks != 1 else ''}")
        if playbooks > 0:
            content_parts.append(f"{playbooks} automation playbook{'s' if playbooks != 1 else ''}")
        content_str = " and ".join(content_parts)

        op_duration = 1.0 if (analytics >= 8 or content_count >= 10) else 0.5

        tasks.append({
            "id": f"{a}-content",
            "order": 5,
            "task": f"Deploy and configure the {name} solution content ({content_str}).",
            "duration": op_duration,
            "effort_hours": int(op_duration * 4),
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Operationalization",
            "depends_on": [f"{a}-verify"],
            "owner_role": "SOC Engineer",
            "description": (
                f"From the Microsoft Sentinel Content Hub, install the {name} solution to deploy the packaged "
                + (f"{analytics} analytics rules covering {_describe_detection_scope(sid)}" if analytics > 0 else "")
                + (f", the {workbooks} workbook{'s' if workbooks != 1 else ''}" if workbooks > 0 else "")
                + (f", and the {playbooks} automation playbook{'s' if playbooks != 1 else ''}" if playbooks > 0 else "")
                + f". Enable each rule in Active status, review the default entity mappings for GCP resource IDs "
                f"and IP addresses, and assign rules to the appropriate analytic rule template. "
                f"{'Configure playbook Logic App connections and grant them API permissions as required.' if playbooks > 0 else ''}"
                f"{'Deploy the workbook and validate it renders correctly against the ingested data.' if workbooks > 0 else ''}"
            ),
        })

        # ----- Task 6: Tuning (only for high-content solutions) -----
        if is_high_content:
            tasks.append({
                "id": f"{a}-validate",
                "order": 6,
                "task": f"Tune {name} analytics rules to reduce false positives for your GCP environment.",
                "duration": 0.5,
                "effort_hours": 2,
                "skill_level": "intermediate",
                "category": "phase-2",
                "phase": "Validation",
                "depends_on": [f"{a}-content"],
                "owner_role": "SOC Analyst",
                "description": (
                    f"Review the first 48 hours of {name}-driven incidents and alerts. Add "
                    f"allow-list exclusions for known-good service accounts, GCP automation principals, and "
                    f"CI/CD pipeline identities that produce expected high-volume activity. Adjust rule thresholds "
                    f"for scheduled-query rules where GCP audit log volume is significantly higher than expected. "
                    f"Confirm at least one analytic rule has triggered or can be manually triggered with a synthetic "
                    f"GCP event before signing off the onboarding."
                ),
            })

    return tasks


def _describe_detection_scope(sid):
    scopes = {
        "google-cloud-platform-audit-logs": "suspicious admin activity, policy changes, and data-access anomalies",
        "google-cloud-platform-dns": "DNS-based exfiltration, tunnelling, C2 beaconing, and domain generation algorithms",
        "google-cloud-platform-iam": "privilege escalation, service account abuse, cross-project role grants, and key misuse",
        "google-cloud-platform-security-command-center": "GCP Security Command Center findings and threat signals",
        "google-cloud-platform-big-query": "anomalous data access and exfiltration via BigQuery jobs",
    }
    return scopes.get(sid, "threat patterns specific to this GCP service")


# ---------------------------------------------------------------------------
# Cribl Stream bespoke tasks
# ---------------------------------------------------------------------------
CRIBL_TASKS = [
    {
        "id": "cs-prereqs",
        "order": 1,
        "task": "Plan Cribl Stream deployment architecture and prepare Azure Sentinel Logs Ingestion API prerequisites.",
        "duration": 1.0,
        "effort_hours": 4,
        "skill_level": "intermediate",
        "category": "setup",
        "phase": "Prerequisites",
        "depends_on": [],
        "owner_role": "Azure Platform Admin",
        "description": (
            "Define the Cribl Stream deployment topology: identify all log sources that will route through "
            "Cribl (syslog, HTTP, S3, cloud-native), estimate total throughput in EPS, and decide on a "
            "single-instance vs Worker Group deployment. In Azure, create a Data Collection Endpoint (DCE) "
            "and one or more Data Collection Rules (DCRs) for each log type to be ingested into Sentinel — "
            "note the DCE Logs Ingestion API URL and the DCR Immutable ID for each stream. Register an "
            "Entra ID application (client ID + secret) with the Monitoring Metrics Publisher role on each DCR. "
            "Confirm the operator holds Microsoft Sentinel Contributor and Log Analytics Contributor on the "
            "target workspace."
        ),
    },
    {
        "id": "cs-infra",
        "order": 2,
        "task": "Deploy or validate Cribl Stream Leader and Worker Group, and configure network connectivity to Sentinel.",
        "duration": 1.5,
        "effort_hours": 6,
        "skill_level": "intermediate",
        "category": "setup",
        "phase": "Configuration",
        "depends_on": ["cs-prereqs"],
        "owner_role": "Cribl Admin",
        "description": (
            "Deploy the Cribl Stream Leader node (on-premises VM, Docker container, or Cribl Cloud) and "
            "provision at least one Worker Group sized for the expected EPS throughput (1 Worker per 10k EPS "
            "as a starting point). Open outbound HTTPS (port 443) from Worker nodes to the DCE endpoint URL. "
            "If on-premises, also open inbound ports for Syslog (TCP 514 / UDP 514), HTTP Event Collector "
            "(TCP 8088), or whichever source protocols are in scope. Validate Cribl licence activation, "
            "install any required Cribl Packs (e.g., the Microsoft Sentinel Pack from Cribl.io/packs if "
            "available), and confirm Worker nodes are connected to the Leader in the Cribl UI."
        ),
    },
    {
        "id": "cs-sources",
        "order": 3,
        "task": "Configure Cribl Stream Sources for all incoming log types.",
        "duration": 1.5,
        "effort_hours": 6,
        "skill_level": "intermediate",
        "category": "setup",
        "phase": "Configuration",
        "depends_on": ["cs-infra"],
        "owner_role": "Cribl Admin",
        "description": (
            "For each log type in scope, create and enable the corresponding Cribl Stream Source: "
            "Syslog (TCP/UDP on port 514 or 601) for network devices and Linux endpoints; "
            "HTTP Event Collector (port 8088) for applications and security tools sending JSON; "
            "S3 / Azure Blob / GCS inputs for batch-uploaded logs; "
            "or Splunk Forwarder (port 9997) if migrating from an existing Splunk deployment. "
            "Assign each source to the correct Worker Group and verify events are arriving in the Cribl "
            "Live Capture view. Tag each source with a custom _sourcetype field to simplify downstream "
            "pipeline routing."
        ),
    },
    {
        "id": "cs-destination",
        "order": 4,
        "task": "Configure Cribl Stream Sentinel HTTP destination, build normalisation pipelines, and create Routes.",
        "duration": 1.5,
        "effort_hours": 6,
        "skill_level": "advanced",
        "category": "setup",
        "phase": "Configuration",
        "depends_on": ["cs-sources"],
        "owner_role": "Cribl Admin",
        "description": (
            "Create a Cribl Stream HTTP destination of type Microsoft Sentinel (Logs Ingestion API): "
            "set the endpoint to the DCE URL, configure OAuth2 client-credentials authentication using the "
            "Entra ID app client ID and secret, and map each stream name to the corresponding DCR Immutable ID. "
            "For each log type, build a Cribl Pipeline to normalise field names to the target Sentinel table "
            "schema (e.g., rename fields to match CommonSecurityLog for CEF data, or map to a custom table "
            "column list for proprietary formats). Create Routes that match each source's _sourcetype and "
            "direct events through the appropriate pipeline to the Sentinel destination. Use Cribl's Live "
            "Capture to validate that sample events transit the route, transform correctly through the pipeline, "
            "and arrive at the destination without HTTP errors."
        ),
    },
    {
        "id": "cs-verify",
        "order": 5,
        "task": "End-to-end test and validate data arrival in Microsoft Sentinel.",
        "duration": 0.5,
        "effort_hours": 2,
        "skill_level": "intermediate",
        "category": "setup",
        "phase": "Validation",
        "depends_on": ["cs-destination"],
        "owner_role": "SOC Engineer",
        "description": (
            "Send representative test events through each configured Cribl Source (e.g., send a syslog message "
            "via netcat, post a JSON event to the HEC endpoint, or replay a sample log file via S3 input). "
            "In Cribl, confirm events flow through the Route without drops or serialisation errors in the "
            "Worker Metrics dashboard. In Microsoft Sentinel, run KQL queries against the target tables "
            "(CommonSecurityLog, custom tables, or built-in tables per DCR stream mapping) to confirm records "
            "arrive with correct timestamps, expected field names, and non-null values for key fields. "
            "Verify ingestion volume in the Sentinel Ingestion health workbook matches expected EPS from Cribl."
        ),
    },
    {
        "id": "cs-operationalise",
        "order": 6,
        "task": "Operationalise Cribl Stream: monitoring, alerting, and runbook documentation.",
        "duration": 0.5,
        "effort_hours": 2,
        "skill_level": "intermediate",
        "category": "phase-1",
        "phase": "Operationalization",
        "depends_on": ["cs-verify"],
        "owner_role": "SOC Engineer",
        "description": (
            "Enable Cribl's built-in monitoring: configure Worker throughput and queue-depth alerts to fire "
            "when EPS drops below 80% of baseline or the destination queue exceeds 5 minutes of backlog. "
            "Create a Cribl health-check scheduled job or external probe to detect Worker-to-Leader "
            "disconnects. Document the route and pipeline map (source → pipeline → Sentinel table) in the "
            "SOC runbook so analysts can trace data lineage during investigations. Review Sentinel's Data "
            "Connector health blade after 24 hours of operation to confirm no ingestion gaps or Logs "
            "Ingestion API throttling events have occurred."
        ),
    },
]

CRIBL_EXPORT_METADATA = {
    "group": "Integration Platforms",
    "priority_score": 68,
    "phased_deployment": 2,
    "integrates_with": [
        "common-event-format",
        "windows-forwarded-events",
        "aws",
        "azure-activity",
    ],
    "estimated_monthly_cost": "medium",
}

CRIBL_PLANNER_BASE = {
    "validation_steps": [
        "Verify events from each configured source arrive in the expected Sentinel tables (CommonSecurityLog, custom tables, or built-in tables) within Cribl's pipeline flush interval.",
        "Run KQL queries to confirm timestamp accuracy, field completeness, and non-null values for resource identifiers, source IPs, and severity fields across all mapped log streams.",
        "Confirm Cribl Worker throughput metrics in the Monitoring dashboard align with expected EPS from upstream sources and that no destination HTTP errors or queue-depth alerts are firing.",
    ],
    "documentation_url": "https://docs.cribl.io/stream/destinations-sentinel/",
    "owner_recommended": "Cribl Admin",
    "common_issues": [
        "DCR Immutable ID or DCE endpoint URL misconfigured in the Cribl HTTP destination, causing 400 or 403 errors on the Logs Ingestion API.",
        "Entra ID app registration missing the Monitoring Metrics Publisher role on the DCR, resulting in authentication failures after initial connector setup.",
        "Pipeline field mappings do not match the target table schema, producing null or unmapped columns in Sentinel custom tables.",
    ],
}


# ---------------------------------------------------------------------------
# Main patch logic
# ---------------------------------------------------------------------------
def main():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Build a lookup: solution_id -> (cat_key, list_index)
    sol_index = {}
    for cat_key, cat_val in data["categories"].items():
        for idx, sol in enumerate(cat_val["solutions"]):
            sol_index[sol["id"]] = (cat_key, idx)

    patched_gcp = 0
    skipped_gcp = 0

    # ----- B3: GCP connectors -----
    for sid, cfg in GCP_CATALOG.items():
        if sid not in sol_index:
            print(f"  WARN: {sid} not found in solutions.json — skipped")
            skipped_gcp += 1
            continue

        cat_key, idx = sol_index[sid]
        sol = data["categories"][cat_key]["solutions"][idx]

        if "setup_tasks" in sol.get("planner", {}):
            print(f"  SKIP (already has setup_tasks): {sid}")
            skipped_gcp += 1
            continue

        tasks = make_gcp_tasks(sid, cfg)

        if "planner" not in sol:
            sol["planner"] = {}
        sol["planner"]["setup_tasks"] = tasks
        patched_gcp += 1
        print(f"  PATCHED {sid}: {len(tasks)} tasks, total {sum(t['duration'] for t in tasks):.1f}d")

    # ----- B2: cribl-stream -----
    if "cribl-stream" not in sol_index:
        print("  ERROR: cribl-stream not found in solutions.json")
    else:
        cat_key, idx = sol_index["cribl-stream"]
        sol = data["categories"][cat_key]["solutions"][idx]

        # Add missing fields
        sol["category"] = "cloud"
        sol["isFeatured"] = True

        # export_metadata
        if "export_metadata" not in sol:
            sol["export_metadata"] = {}
        sol["export_metadata"].update(CRIBL_EXPORT_METADATA)

        # planner (full replacement — was missing entirely)
        planner = copy.deepcopy(CRIBL_PLANNER_BASE)
        planner["setup_tasks"] = CRIBL_TASKS
        sol["planner"] = planner

        total_d = sum(t["duration"] for t in CRIBL_TASKS)
        print(f"  PATCHED cribl-stream: {len(CRIBL_TASKS)} tasks, total {total_d:.1f}d, category=cloud, isFeatured=True")

    # ----- Write output -----
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"\nDone. GCP patched={patched_gcp} skipped={skipped_gcp}. Output: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
