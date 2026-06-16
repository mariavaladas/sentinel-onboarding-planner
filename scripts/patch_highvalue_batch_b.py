"""
patch_highvalue_batch_b.py
Sebastian – Data Engineer
2026-06-16

Rewrites planner.setup_tasks for ~162 high-value non-featured solutions that
still carry generic templated tasks.  Each solution gets a 5-task arc tailored
to its collection method (syslog/CEF, REST API, AWS S3, GCP Pub/Sub, codeless
connector, Azure Function).

Detection logic:
  - business_impact == 'high'   (value_scoring.business_impact)
  - isFeatured != True
  - Generic task guard: any task where description == task text OR len(desc) < 80

Collection method detected from solution.description text (see DETECT_METHOD).
"""

import json
import re
from pathlib import Path

SOLUTIONS_PATH = Path("data/solutions.json")

# Solutions with already-bespoke tasks (featured + Batch A). Never touch these.
PROTECTED = {
    # Featured – already bespoke
    "azure-activity",
    "defender-for-cloud",
    "defender-xdr",
    "microsoft-entra-id",
    "azure-firewall",
    # Originally featured – patched by patch_featured_tasks.py
    "aws",
    "google-cloud-platform-iam",
    "threat-intelligence-new",
    "dns-essentials",
    "network-session-essentials",
    "apache-log4j-vulnerability-detection",
    "security-threat-essential-solution",
    "virus-total",
    "sentinel-soa-ressentials",
    "soc-handbook",
    "ueba-essentials",
    # Batch A – patched by patch_highvalue_tasks.py
    "microsoft-business-applications",
    "microsoft-defender-for-endpoint",
    "blood-hound-enterprise",
    "zscaler",
    "vectra-xdr",
    "rubrik-security-cloud",
    "corelight",
    "cisco-umbrella",
    "sap-btp",
    "palo-alto-prisma-cloud-2",
    "sentinelone",
    "cisco-secure-endpoint",
    "cloudflare",
    "imperva-cloud-waf",
    "google-cloud-platform-dns",
    "google-workspace-reports",
    "tanium",
    "theom",
    "falcon-friday",
    "web-session-essentials",
    "endpoint-threat-protection-essentials",
    "censys",
    "global-secure-access",
    "microsoft-defender-threat-intelligence",
}


# ---------------------------------------------------------------------------
# Helper: abbreviated ID prefix (matches existing convention)
# ---------------------------------------------------------------------------
def make_abbrev(solution_id: str) -> str:
    parts = solution_id.split("-")
    abbrev = "".join(p[0] for p in parts[:4] if p)
    if len(abbrev) < 2:
        abbrev = re.sub(r"[^a-z0-9]", "", solution_id)[:3]
    return abbrev.lower()


# ---------------------------------------------------------------------------
# Helper: clean product owner name from solution name
# ---------------------------------------------------------------------------
_STRIP_PATTERNS = re.compile(
    r"\s*(solution|connector|for microsoft sentinel|for sentinel|"
    r"\(mtd\)|\(edr\)|\(xdr\)|\(cspm\)|\(cnapp\)|\(cdr\)|"
    r"\(siem\)|\(ueba\)|\(dlp\)|\(uba\)|\(epp\)|"
    r"microsoft sentinel|microsoft|essentials|platform|security cloud|"
    r"cloud security|security|next generation|next-generation|by palo alto networks)\b",
    re.IGNORECASE,
)

_LEADING_THE = re.compile(r"^\s*the\s+", re.IGNORECASE)


def product_owner(name: str) -> str:
    """Return e.g. 'CrowdStrike Admin' from 'CrowdStrike Falcon Endpoint Protection'."""
    # Strip trailing boilerplate iteratively
    cleaned = _LEADING_THE.sub("", name)
    # Take first 3 words max, then strip known suffixes from each pass
    words = cleaned.split()
    # Keep first 2 meaningful words as the product name
    candidate = " ".join(words[:3]).strip()
    # Remove noise words at end
    for _ in range(5):
        prev = candidate
        candidate = _STRIP_PATTERNS.sub("", candidate).strip().rstrip(",").strip()
        if candidate == prev:
            break
    # Fall back to first word if we stripped everything
    if not candidate:
        candidate = words[0] if words else name
    return f"{candidate} Admin"


# ---------------------------------------------------------------------------
# Duration ↔ effort_hours helpers
# ---------------------------------------------------------------------------
DURATION_TO_EFFORT = {0.5: 1.0, 1.0: 2.0, 1.5: 4.0, 2.0: 6.0, 3.0: 10.0}


# ---------------------------------------------------------------------------
# Collection method detection
# ---------------------------------------------------------------------------
def detect_method(solution: dict) -> str:
    desc = solution.get("description", "").lower()
    if "syslog" in desc or "cef" in desc or "common event format" in desc:
        return "syslog_cef"
    elif "rest api" in desc or "api" in desc or "polling" in desc or "http" in desc:
        return "rest_api"
    elif "codeless" in desc or "ccp" in desc or "data connector definition" in desc:
        return "codeless_connector"
    elif "logic app" in desc or "azure function" in desc or "function app" in desc:
        return "azure_function"
    elif "gcp" in desc or "pub/sub" in desc or "google cloud" in desc:
        return "gcp_pubsub"
    elif "aws" in desc or "s3" in desc or "amazon" in desc:
        return "aws_s3"
    elif "diagnostic" in desc or "azure monitor" in desc:
        return "azure_diagnostic"
    else:
        return "rest_api"


# ---------------------------------------------------------------------------
# Task template builders
# ---------------------------------------------------------------------------

# Phase/category/skill for 5-task arc (order 1..5)
_ARC_META = {
    1: ("Prerequisites",    "setup",   "beginner"),
    2: ("Configuration",    "setup",   "intermediate"),
    3: ("Data Verification","setup",   "beginner"),
    4: ("Operationalization","phase-1","intermediate"),
    5: ("Validation",       "phase-2", "intermediate"),
}


def _make_task(sol_id: str, order: int, task_title: str, duration: float,
               owner: str, description: str, suffix: str,
               depends_on: list[str]) -> dict:
    abbrev = make_abbrev(sol_id)
    phase, category, skill = _ARC_META[order]
    task_id = f"{abbrev}-{suffix}"
    return {
        "id":           task_id,
        "order":        order,
        "task":         task_title,
        "duration":     duration,
        "effort_hours": DURATION_TO_EFFORT[duration],
        "skill_level":  skill,
        "category":     category,
        "phase":        phase,
        "depends_on":   depends_on,
        "owner_role":   owner,
        "description":  description,
    }


def build_syslog_cef(solution: dict) -> list[dict]:
    name = solution["name"]
    sid  = solution["id"]
    prod = product_owner(name)
    ab   = make_abbrev(sid)
    return [
        _make_task(sid, 1, f"Prerequisites & network design for {name}", 1.0,
                   "Network Admin",
                   f"Confirm {name} can reach the log forwarder on the required port (TCP/UDP 514 or custom). "
                   f"Verify firewall rules, DNS, and source device log export capabilities.",
                   "prereqs", []),
        _make_task(sid, 2, f"Log forwarder, AMA, and DCR setup for {name}", 2.0,
                   "Azure Platform Admin",
                   f"Deploy or designate a Linux log forwarder with Azure Monitor Agent. "
                   f"Create a Data Collection Rule targeting the CommonSecurityLog or Syslog table for {name} events.",
                   "infra", [f"{ab}-prereqs"]),
        _make_task(sid, 3, f"Configure {name} to export logs", 1.0,
                   prod,
                   f"Configure {name} to export logs in CEF/Syslog format to the forwarder endpoint. "
                   f"Set facility, severity, and log types per the connector documentation.",
                   "verify", [f"{ab}-infra"]),
        _make_task(sid, 4, f"Deploy {name} content hub package", 0.5,
                   "SOC Engineer",
                   f"Deploy analytics rules, workbooks, and playbooks from the {name} content hub package. "
                   f"Enable rules appropriate for the environment.",
                   "content", [f"{ab}-verify"]),
        _make_task(sid, 5, f"Validate {name} event flow and detection rules", 1.0,
                   "SOC Analyst",
                   f"Query the target Sentinel table for {name} events (last 24h). "
                   f"Verify field mapping, timestamp accuracy, and fire at least one analytics rule end-to-end.",
                   "validate", [f"{ab}-content"]),
    ]


def build_rest_api(solution: dict) -> list[dict]:
    name = solution["name"]
    sid  = solution["id"]
    prod = product_owner(name)
    ab   = make_abbrev(sid)
    return [
        _make_task(sid, 1, f"Prerequisites & API credentials for {name}", 0.5,
                   prod,
                   f"Obtain API credentials (key, OAuth client, or service account) from the {name} admin console. "
                   f"Confirm the account has read-only audit/event API access.",
                   "prereqs", []),
        _make_task(sid, 2, f"Configure {name} data connector in Microsoft Sentinel", 1.0,
                   "Azure Platform Admin",
                   f"Configure the {name} data connector in Microsoft Sentinel. "
                   f"Provide the API endpoint, credentials, and select the log types to ingest.",
                   "connector", [f"{ab}-prereqs"]),
        _make_task(sid, 3, f"Verify initial {name} data flow", 0.5,
                   "SOC Engineer",
                   f"Confirm events from {name} appear in the target Log Analytics table within 15 minutes of connector activation. "
                   f"Check record count and schema.",
                   "verify", [f"{ab}-connector"]),
        _make_task(sid, 4, f"Deploy {name} content hub package", 0.5,
                   "SOC Engineer",
                   f"Deploy analytics rules, workbooks, and playbooks from the {name} content hub package. "
                   f"Tune rule thresholds to match the environment's event volume.",
                   "content", [f"{ab}-verify"]),
        _make_task(sid, 5, f"Validate {name} data quality and detection coverage", 1.0,
                   "SOC Analyst",
                   f"Validate {name} data quality: check field completeness, timestamp alignment, and event type coverage. "
                   f"Test at least one detection rule fires correctly.",
                   "validate", [f"{ab}-content"]),
    ]


def build_aws_s3(solution: dict) -> list[dict]:
    name = solution["name"]
    sid  = solution["id"]
    ab   = make_abbrev(sid)
    return [
        _make_task(sid, 1, f"AWS prerequisites & IAM for {name}", 1.0,
                   "AWS Cloud Admin",
                   f"Create an IAM role or user with read access to the {name} S3 bucket. "
                   f"Configure the trust policy for the Sentinel AWS connector's STS assume-role.",
                   "prereqs", []),
        _make_task(sid, 2, f"S3 bucket & SQS notification setup for {name}", 1.5,
                   "AWS Cloud Admin",
                   f"Enable S3 event notifications to an SQS queue for new log objects. "
                   f"Verify the bucket policy allows the Sentinel connector principal to GetObject.",
                   "infra", [f"{ab}-prereqs"]),
        _make_task(sid, 3, f"Configure {name} S3 connector in Sentinel", 1.0,
                   "Azure Platform Admin",
                   f"Configure the {name} S3 connector in Sentinel with the IAM role ARN, SQS queue URL, and target Log Analytics table.",
                   "verify", [f"{ab}-infra"]),
        _make_task(sid, 4, f"Deploy {name} content hub package", 0.5,
                   "SOC Engineer",
                   f"Deploy analytics rules and workbooks from the {name} content hub package. "
                   f"Review and enable detection rules appropriate for the environment.",
                   "content", [f"{ab}-verify"]),
        _make_task(sid, 5, f"Validate {name} S3 pipeline and detection rules", 1.0,
                   "SOC Analyst",
                   f"Query the target table for recent {name} events. "
                   f"Verify S3 -> SQS -> Sentinel pipeline latency is within acceptable bounds (< 5 min).",
                   "validate", [f"{ab}-content"]),
    ]


def build_gcp_pubsub(solution: dict) -> list[dict]:
    name = solution["name"]
    sid  = solution["id"]
    ab   = make_abbrev(sid)
    return [
        _make_task(sid, 1, f"GCP prerequisites & IAM for {name}", 1.0,
                   "GCP Cloud Admin",
                   f"Create a service account with Pub/Sub Subscriber and Log Viewer roles. "
                   f"Enable the {name} log type in Cloud Logging if not already active.",
                   "prereqs", []),
        _make_task(sid, 2, f"Log sink & Pub/Sub topic for {name}", 1.5,
                   "GCP Cloud Admin",
                   f"Create a log export sink filtered to {name} events routing to a Pub/Sub topic. "
                   f"Create a subscription for the Sentinel connector to pull from.",
                   "infra", [f"{ab}-prereqs"]),
        _make_task(sid, 3, f"Configure GCP connector in Sentinel for {name}", 1.0,
                   "Azure Platform Admin",
                   f"Configure the GCP connector in Sentinel with the project ID, subscription name, and service account credentials.",
                   "verify", [f"{ab}-infra"]),
        _make_task(sid, 4, f"Deploy {name} content hub package", 0.5,
                   "SOC Engineer",
                   f"Deploy analytics rules and workbooks from the {name} content hub package. "
                   f"Review and enable detection rules appropriate for the environment.",
                   "content", [f"{ab}-verify"]),
        _make_task(sid, 5, f"Validate {name} GCP log pipeline", 1.0,
                   "SOC Analyst",
                   f"Query GCP log tables in Sentinel for recent {name} events. "
                   f"Verify schema mapping, timestamp accuracy, and that at least one detection rule fires.",
                   "validate", [f"{ab}-content"]),
    ]


def build_codeless_connector(solution: dict) -> list[dict]:
    name = solution["name"]
    sid  = solution["id"]
    prod = product_owner(name)
    ab   = make_abbrev(sid)
    return [
        _make_task(sid, 1, f"Prerequisites & credentials for {name}", 0.5,
                   prod,
                   f"Obtain API credentials from the {name} platform. "
                   f"Verify the required permissions and network connectivity from Azure to the {name} API endpoint.",
                   "prereqs", []),
        _make_task(sid, 2, f"Configure {name} codeless connector in Sentinel", 1.0,
                   "Azure Platform Admin",
                   f"Configure the {name} codeless connector in Sentinel. "
                   f"Provide credentials and select data types to collect.",
                   "connector", [f"{ab}-prereqs"]),
        _make_task(sid, 3, f"Verify {name} data flow", 0.5,
                   "SOC Engineer",
                   f"Confirm {name} events appear in the custom log table within 15 minutes. "
                   f"Check initial record count and field population.",
                   "verify", [f"{ab}-connector"]),
        _make_task(sid, 4, f"Deploy {name} content hub package", 0.5,
                   "SOC Engineer",
                   f"Deploy analytics rules and workbooks from the {name} content hub package. "
                   f"Review which detection rules are appropriate for the environment before enabling.",
                   "content", [f"{ab}-verify"]),
        _make_task(sid, 5, f"Validate {name} detection coverage", 0.5,
                   "SOC Analyst",
                   f"Validate detection coverage and data quality for {name}. "
                   f"Test at least one analytics rule fires correctly and generates a Sentinel incident.",
                   "validate", [f"{ab}-content"]),
    ]


def build_azure_function(solution: dict) -> list[dict]:
    name = solution["name"]
    sid  = solution["id"]
    ab   = make_abbrev(sid)
    return [
        _make_task(sid, 1, f"Prerequisites for {name} Function App", 0.5,
                   "Azure Platform Admin",
                   f"Confirm Azure subscription capacity for a Function App. "
                   f"Obtain {name} API credentials.",
                   "prereqs", []),
        _make_task(sid, 2, f"Deploy Azure Function App for {name}", 1.5,
                   "Azure Platform Admin",
                   f"Deploy the Azure Function App for {name} data collection using the ARM template from the connector page. "
                   f"Configure app settings with API credentials and workspace keys.",
                   "infra", [f"{ab}-prereqs"]),
        _make_task(sid, 3, f"Verify {name} Function App ingestion", 0.5,
                   "SOC Engineer",
                   f"Confirm the Function App is running and {name} events appear in the custom log table. "
                   f"Check Function App logs for errors.",
                   "verify", [f"{ab}-infra"]),
        _make_task(sid, 4, f"Deploy {name} content hub package", 0.5,
                   "SOC Engineer",
                   f"Deploy analytics rules and workbooks from the {name} content hub package. "
                   f"Review and enable detection rules appropriate for the environment.",
                   "content", [f"{ab}-verify"]),
        _make_task(sid, 5, f"Validate {name} event quality and detection rules", 0.5,
                   "SOC Analyst",
                   f"Validate {name} event quality and detection rule coverage. "
                   f"Confirm at least one analytics rule fires and generates a Sentinel incident.",
                   "validate", [f"{ab}-content"]),
    ]


METHOD_BUILDERS = {
    "syslog_cef":          build_syslog_cef,
    "rest_api":             build_rest_api,
    "aws_s3":               build_aws_s3,
    "gcp_pubsub":           build_gcp_pubsub,
    "codeless_connector":   build_codeless_connector,
    "azure_function":       build_azure_function,
    "azure_diagnostic":     build_rest_api,   # no dedicated template - REST API arc
}


# ---------------------------------------------------------------------------
# Generic task guard
# ---------------------------------------------------------------------------
def is_generic(solution: dict) -> bool:
    """Return True if any task has description == task text OR len(desc) < 80."""
    tasks = solution.get("planner", {}).get("setup_tasks", [])
    if not tasks:
        return True
    for t in tasks:
        desc = t.get("description", "")
        task_text = t.get("task", "")
        if desc == task_text or len(desc) < 80:
            return True
    return False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    with open(SOLUTIONS_PATH, encoding="utf-8") as f:
        data = json.load(f)

    # Collect all solutions (structure: {categories: {azure:[], m365:[], third_party:[]}})
    all_solutions = []
    for cat_val in data["categories"].values():
        if isinstance(cat_val, list):
            all_solutions.extend(cat_val)
        elif isinstance(cat_val, dict) and "solutions" in cat_val:
            all_solutions.extend(cat_val["solutions"])

    patched = 0
    skipped_protected = 0
    skipped_not_hv = 0
    skipped_bespoke = 0
    method_counts: dict[str, int] = {}

    for sol in all_solutions:
        sid = sol.get("id", "")

        # Guard: protected IDs
        if sid in PROTECTED:
            skipped_protected += 1
            continue

        # Guard: business_impact must be 'high'
        if sol.get("value_scoring", {}).get("business_impact") != "high":
            skipped_not_hv += 1
            continue

        # Guard: already bespoke
        if sol.get("isFeatured"):
            skipped_protected += 1
            continue

        if not is_generic(sol):
            skipped_bespoke += 1
            continue

        # Skip solutions with no planner structure at all
        if "planner" not in sol or not isinstance(sol.get("planner"), dict):
            print(f"  WARNING: {sid} has no planner structure — skipping")
            skipped_bespoke += 1
            continue

        # Determine method and build tasks
        method = detect_method(sol)
        builder = METHOD_BUILDERS[method]
        new_tasks = builder(sol)

        sol["planner"]["setup_tasks"] = new_tasks
        method_counts[method] = method_counts.get(method, 0) + 1
        patched += 1

    # Write back
    with open(SOLUTIONS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    # Report
    print(f"\n{'='*60}")
    print(f"  patch_highvalue_batch_b.py - COMPLETE")
    print(f"{'='*60}")
    print(f"  Total solutions scanned : {len(all_solutions)}")
    print(f"  Patched (Batch B)       : {patched}")
    print(f"  Skipped - protected/feat: {skipped_protected}")
    print(f"  Skipped - not high-value: {skipped_not_hv}")
    print(f"  Skipped - already bespoke:{skipped_bespoke}")
    print(f"\n  Method breakdown:")
    for m, c in sorted(method_counts.items()):
        print(f"    {m:<25} {c:>3}")
    print(f"{'='*60}\n")

    # Validation
    print("Validation:")
    with open(SOLUTIONS_PATH, encoding="utf-8") as f:
        check = json.load(f)
    print("  JSON valid: True")

    all_check = []
    for cat_val in check["categories"].values():
        if isinstance(cat_val, list):
            all_check.extend(cat_val)
        elif isinstance(cat_val, dict) and "solutions" in cat_val:
            all_check.extend(cat_val["solutions"])

    hv_nc = [s for s in all_check
             if s.get("value_scoring", {}).get("business_impact") == "high"
             and not s.get("isFeatured")]
    bespoke_after = [s for s in hv_nc if not is_generic(s)]
    print(f"  HV non-featured: {len(hv_nc)}")
    print(f"  Now bespoke    : {len(bespoke_after)}")
    still_generic = [s for s in hv_nc if is_generic(s)]
    print(f"  Still generic  : {len(still_generic)}")
    if still_generic:
        print("  Still-generic IDs:")
        for s in still_generic[:10]:
            print(f"    {s['id']}")

    # -- Samples ---------------------------------------------------------------
    print("\n" + "-"*60)
    print("SAMPLE -- SYSLOG/CEF:")
    _show_sample(all_check, "syslog_cef")
    print("\nSAMPLE -- REST API:")
    _show_sample(all_check, "rest_api")
    print("\nSAMPLE -- AWS S3:")
    _show_sample(all_check, "aws_s3")
    print("\nSAMPLE -- GCP Pub/Sub:")
    _show_sample(all_check, "gcp_pubsub")
    print("\nSAMPLE -- Codeless Connector:")
    _show_sample(all_check, "codeless_connector")


def _show_sample(solutions: list[dict], method: str):
    """Print the first patched solution matching the given method."""
    for sol in solutions:
        if sol.get("id") in PROTECTED:
            continue
        if sol.get("value_scoring", {}).get("business_impact") != "high":
            continue
        if sol.get("isFeatured"):
            continue
        if detect_method(sol) != method:
            continue
        if is_generic(sol):
            continue
        tasks = sol.get("planner", {}).get("setup_tasks", [])
        print(f"  {sol['id']} — {sol['name']}")
        for t in tasks:
            print(f"    [{t['order']}] {t['task']}")
            print(f"         Owner: {t['owner_role']} | Duration: {t['duration']}d | Phase: {t['phase']}")
            print(f"         {t['description'][:120]}...")
        return
    print("  (no sample found)")


if __name__ == "__main__":
    main()
