"""
restructure_validation_order.py
Sebastian — 2026-06-17

Moves ingestion validation immediately after connector/infrastructure setup for
standard onboarding flows, rewrites validation language to focus on data
arrival, and fixes the Amazon Web Services featured solution so its tasks cover
CloudTrail, VPC Flow Logs, GuardDuty, and CloudWatch.
"""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "solutions.json"

SETUPISH_PHASES = {
    "prerequisites",
    "configuration",
    "infrastructure",
    "data verification",
}

CONTENT_TASK_PATTERNS = (
    re.compile(r"\bdeploy\b.*\b(analytics|workbooks|playbooks|content)\b"),
    re.compile(r"\benable\b.*\b(analytics|workbooks|playbooks|content)\b"),
    re.compile(r"\bturn on\b.*\b(analytics|workbooks|playbooks|content)\b"),
    re.compile(r"\bconfigure\b.*\b(playbook|logic app|automation)\b"),
    re.compile(r"\binstall\b.*\bworkbook\b"),
    re.compile(r"\bdeploy\b.*\b(analytics|detection)\s+rules\b"),
    re.compile(r"\benable\b.*\b(analytics|detection)\s+rules\b"),
    re.compile(r"\bpublish\b.*\bhunting\b"),
)

CONTENT_ID_HINTS = (
    "-analytics",
    "-workbook",
    "-workbooks",
    "-playbook",
    "-playbooks",
)

SOURCE_CONFIG_HINTS = (
    "agent",
    "ama",
    "api permissions",
    "cloudwatch connector",
    "collection rule",
    "configure the connector",
    "configure to send",
    "connector",
    "data collection rule",
    "diagnostic settings",
    "dcr",
    "deploy or update the forwarder",
    "export logs",
    "forwarder",
    "guardduty connector",
    "iam",
    "install",
    "log stream",
    "queue",
    "role arn",
    "s3 bucket",
    "send the correct log stream",
    "send to the correct log stream",
    "source device",
    "stream to the log analytics workspace",
    "sqs",
)

INGESTION_HINTS = (
    "table",
    "tables",
    "ingest",
    "ingestion",
    "log",
    "logs",
    "event",
    "events",
    "record",
    "records",
    "telemetry",
    "latency",
    "kql",
    "query",
    "source data",
)

NON_INGESTION_HINTS = (
    "playbook",
    "logic app",
    "incident",
    "comment field",
    "enrichment",
    "7-day",
    "7 day",
    "baseline",
    "baselining",
)

TABLE_TOKEN_RE = re.compile(r"\b[A-Z][A-Za-z0-9_]+\b")
TABLE_HINTS = (
    "activity",
    "alert",
    "audit",
    "behavior",
    "cloud",
    "commonsecuritylog",
    "device",
    "dns",
    "email",
    "event",
    "guardduty",
    "heartbeat",
    "identity",
    "incident",
    "indicator",
    "log",
    "network",
    "office",
    "security",
    "signin",
    "syslog",
    "threat",
    "trail",
    "url",
    "watch",
)
TABLE_NOISE = {
    "Activity",
    "Alert",
    "Azure",
    "Amazon",
    "AWS",
    "Cloud",
    "CloudTrail",
    "CloudWatch",
    "Common",
    "Configure",
    "Confirm",
    "Enable",
    "GuardDuty",
    "Google",
    "Incident",
    "Incidents",
    "Identity",
    "KQL",
    "Log",
    "Logic",
    "Microsoft",
    "Networks",
    "Query",
    "Recent",
    "Run",
    "Security",
    "Sentinel",
    "Use",
    "Verify",
}


def iter_solutions(data: dict):
    for category in data["categories"].values():
        for solution in category.get("solutions", []):
            yield solution


def task_text(task: dict, *, include_description: bool = True) -> str:
    fields = [str(task.get("id", "")), str(task.get("task", ""))]
    if include_description:
        fields.append(str(task.get("description", "")))
    return " ".join(fields).lower()


def is_tuning_task(task: dict) -> bool:
    id_text = str(task.get("id", "")).lower()
    task_only = str(task.get("task", "")).lower()
    description = str(task.get("description", "")).lower()
    return (
        "-tune" in id_text
        or task_only.startswith("tune ")
        or " tune " in f" {task_only} "
        and any(
            hint in f"{task_only} {description}"
            for hint in ("false positive", "false positives", "threshold", "noise", "correlation")
        )
    )


def is_validation_task(task: dict) -> bool:
    return str(task.get("phase", "")).lower() == "validation" and not is_tuning_task(task)


def is_contentish_task(task: dict) -> bool:
    id_text = str(task.get("id", "")).lower()
    task_only = str(task.get("task", "")).lower()
    if any(hint in id_text for hint in CONTENT_ID_HINTS):
        return True
    if "-content" in id_text and any(
        hint in task_only
        for hint in ("analytics", "workbook", "playbook", "content pack", "content hub", "detection")
    ):
        return True
    return any(pattern.search(task_only) for pattern in CONTENT_TASK_PATTERNS)


def is_setupish_task(task: dict) -> bool:
    if is_validation_task(task) or is_tuning_task(task) or is_contentish_task(task):
        return False
    phase = str(task.get("phase", "")).lower()
    category = str(task.get("category", "")).lower()
    task_only = str(task.get("task", "")).lower()
    description = str(task.get("description", "")).lower()
    setup_text = f"{task_only} {description}"
    return (
        phase in SETUPISH_PHASES
        or category == "setup"
        or any(hint in setup_text for hint in SOURCE_CONFIG_HINTS)
    )


def has_non_ingestion_validation(solution: dict, validation_task: dict) -> bool:
    if (solution.get("connectors", 0) or 0) > 0:
        return False
    text = " ".join(
        [
            task_text(validation_task),
            str(solution.get("description", "")),
            " ".join(solution.get("planner", {}).get("validation_steps", []) or []),
        ]
    ).lower()
    return any(hint in text for hint in NON_INGESTION_HINTS) and not any(
        hint in text for hint in INGESTION_HINTS
    )


def has_late_setup_task(tasks: list[dict]) -> bool:
    seen_non_setup = False
    for task in tasks:
        if is_validation_task(task) or is_tuning_task(task):
            continue
        if is_setupish_task(task) and seen_non_setup:
            return True
        if not is_setupish_task(task):
            seen_non_setup = True
    return False


def extract_table_names(solution: dict, validation_task: dict) -> list[str]:
    texts = [
        str(solution.get("description", "")),
        str(validation_task.get("description", "")),
        str(validation_task.get("task", "")),
        *list(solution.get("planner", {}).get("validation_steps", []) or []),
    ]
    seen: list[str] = []
    for text in texts:
        for token in TABLE_TOKEN_RE.findall(text):
            if token in TABLE_NOISE:
                continue
            lowered = token.lower()
            if any(hint in lowered for hint in TABLE_HINTS) and token not in seen:
                seen.append(token)
    return seen[:4]


def format_table_phrase(tables: list[str]) -> str:
    if not tables:
        return "the expected Sentinel table(s)"
    if len(tables) == 1:
        return f"the {tables[0]} table"
    if len(tables) == 2:
        return f"the {tables[0]} and {tables[1]} tables"
    return "the " + ", ".join(tables[:-1]) + f", and {tables[-1]} tables"


def describe_remaining_content(solution: dict) -> str:
    remaining = []
    if (solution.get("analytics", 0) or 0) > 0:
        remaining.append("analytics")
    if (solution.get("workbooks", 0) or 0) > 0:
        remaining.append("workbooks")
    if (solution.get("playbooks", 0) or 0) > 0:
        remaining.append("playbooks")
    if not remaining:
        return "the remaining onboarding tasks"
    if len(remaining) == 1:
        return remaining[0]
    if len(remaining) == 2:
        return f"{remaining[0]} and {remaining[1]}"
    return ", ".join(remaining[:-1]) + f", and {remaining[-1]}"


def rewrite_validation_task(solution: dict, validation_task: dict) -> tuple[dict, list[str]]:
    tables = extract_table_names(solution, validation_task)
    table_phrase = format_table_phrase(tables)
    remaining_content = describe_remaining_content(solution)

    rewritten = dict(validation_task)
    rewritten["task"] = f"Validate {solution['name']} ingestion in Sentinel."
    rewritten["description"] = (
        f"Query {table_phrase} to confirm recent {solution['name']} records are arriving within the connector's expected latency window. "
        f"Verify timestamps, source identifiers, and core fields are populated and parsable before enabling {remaining_content}."
    )
    rewritten["duration"] = 0.5
    rewritten["effort_hours"] = 2.0
    rewritten["owner_role"] = "SOC Analyst"
    rewritten["phase"] = "Validation"
    return rewritten, tables


def rewrite_validation_steps(solution: dict, tables: list[str]) -> list[str]:
    table_phrase = format_table_phrase(tables)
    remaining_content = describe_remaining_content(solution)
    name = solution["name"]
    return [
        f"Verify recent {name} records appear in {table_phrase} within the connector's normal service latency window.",
        f"Run a simple KQL query against {table_phrase} to confirm timestamps, entities, and core fields are populated and parsable.",
        f"Use a recent {name} event to confirm the ingested data is searchable in Sentinel before enabling {remaining_content}.",
    ]


def renumber_and_rechain(tasks: list[dict]) -> None:
    previous_id = None
    for order, task in enumerate(tasks, start=1):
        task["order"] = order
        task["depends_on"] = [] if previous_id is None else [previous_id]
        previous_id = task["id"]


def move_validation_after_setup(tasks: list[dict], validation_task: dict) -> list[dict]:
    tune_tasks = [dict(task) for task in tasks if is_tuning_task(task)]
    other_tasks = [
        dict(task)
        for task in tasks
        if task["id"] != validation_task["id"] and not is_tuning_task(task)
    ]

    leading_setup = []
    remaining = []
    setup_block_open = True

    for task in other_tasks:
        if setup_block_open and is_setupish_task(task):
            leading_setup.append(task)
            continue
        setup_block_open = False
        remaining.append(task)

    return leading_setup + [validation_task] + remaining + tune_tasks


def patch_aws_solution(solution: dict) -> None:
    solution["planner"]["setup_tasks"] = [
        {
            "id": "aws-prereqs",
            "order": 1,
            "task": "Set up AWS IAM permissions and enable CloudTrail, GuardDuty, CloudWatch, and VPC Flow Log collection across target accounts.",
            "duration": 1.0,
            "effort_hours": 4.0,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "AWS Cloud Admin",
            "description": "Create or confirm the IAM role and access policies required for the Amazon Web Services S3, GuardDuty, and CloudWatch connectors. Enable AWS CloudTrail across the target accounts, confirm GuardDuty is active in every in-scope region, and verify the CloudWatch log groups or VPC Flow Log exports needed for Sentinel ingestion are enabled before connector onboarding begins.",
        },
        {
            "id": "aws-s3-setup",
            "order": 2,
            "task": "Create and configure the S3 bucket and SQS queue used for CloudTrail and any VPC Flow Logs exported through the S3 path.",
            "duration": 1.0,
            "effort_hours": 4.0,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": ["aws-prereqs"],
            "owner_role": "AWS Cloud Admin",
            "description": "Create or designate the S3 bucket that stores CloudTrail files and any VPC Flow Logs exported through the S3-based collection path, then configure bucket event notifications to publish object-create events to a dedicated SQS queue. Grant the Sentinel IAM role the bucket read permissions and SQS receive/delete permissions required to poll new objects reliably.",
        },
        {
            "id": "aws-connector",
            "order": 3,
            "task": "Configure the Amazon Web Services S3, GuardDuty, and CloudWatch connectors in Microsoft Sentinel.",
            "duration": 1.5,
            "effort_hours": 6.0,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Configuration",
            "depends_on": ["aws-s3-setup"],
            "owner_role": "AWS Cloud Admin",
            "description": "In Microsoft Sentinel, configure the Amazon Web Services S3 connector for CloudTrail and any S3-routed VPC Flow Logs, add the Amazon GuardDuty connector for threat findings, and configure the Amazon Web Services CloudWatch connector for CloudWatch and VPC log streams collected through that path. Confirm all three connectors show Connected with the correct queue, role, and account scope before moving on.",
        },
        {
            "id": "aws-validate",
            "order": 4,
            "task": "Validate Amazon Web Services ingestion in Sentinel.",
            "duration": 0.5,
            "effort_hours": 2.0,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["aws-connector"],
            "owner_role": "SOC Analyst",
            "description": "Query the AWSCloudTrail, AWSGuardDuty, and AWSCloudWatch tables to confirm recent CloudTrail management events, GuardDuty findings, and CloudWatch or VPC Flow Log records are arriving within the expected latency window. Verify account identifiers, regions, event names, and timestamps are populated and searchable before enabling the remaining analytics and workbooks.",
        },
        {
            "id": "aws-content",
            "order": 5,
            "task": "Deploy the Amazon Web Services analytics rules and workbooks from the solution content pack.",
            "duration": 1.5,
            "effort_hours": 6.0,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Operationalization",
            "depends_on": ["aws-validate"],
            "owner_role": "SOC Engineer",
            "description": "Enable the 62 packaged AWS analytics rules spanning CloudTrail activity, GuardDuty findings, CloudWatch or VPC Flow Log telemetry, and cross-source correlation scenarios. Deploy the 2 AWS workbooks and review entity mappings, severity defaults, and workspace parameters so the content aligns with the AWS account and region model used in production.",
        },
        {
            "id": "aws-tune",
            "order": 6,
            "task": "Tune Amazon Web Services analytics rules to reduce noise for your account topology, service accounts, and GuardDuty correlation patterns.",
            "duration": 1.0,
            "effort_hours": 4.0,
            "skill_level": "advanced",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["aws-content"],
            "owner_role": "SOC Analyst",
            "description": "Review the first 48 hours of CloudTrail, GuardDuty, and CloudWatch or VPC Flow Log driven incidents, then add environment-specific exclusions for approved automation, shared services, and known noisy assets. Adjust thresholds and correlation logic so GuardDuty findings enrich related CloudTrail and network detections without generating duplicate analyst work.",
        },
    ]

    solution["planner"]["validation_steps"] = [
        "Verify recent Amazon Web Services records appear in the AWSCloudTrail, AWSGuardDuty, and AWSCloudWatch tables within the connectors' normal service latency windows.",
        "Run simple KQL queries against AWSCloudTrail, AWSGuardDuty, and AWSCloudWatch to confirm timestamps, account identifiers, and core event fields are populated and parsable.",
        "Use recent CloudTrail, GuardDuty, and CloudWatch or VPC Flow Log events to confirm the ingested data is searchable in Sentinel before enabling the AWS analytics rules and workbooks.",
    ]


def main() -> None:
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))

    moved = 0
    rewritten = 0
    skipped_non_ingestion: list[str] = []
    skipped_bespoke: list[str] = []

    for solution in iter_solutions(data):
        tasks = solution.get("planner", {}).get("setup_tasks") or []
        if not tasks:
            continue

        if solution.get("id") == "aws":
            patch_aws_solution(solution)
            rewritten += 1
            moved += 1
            continue

        validation_task = next((task for task in tasks if is_validation_task(task)), None)
        if validation_task is None:
            continue

        if has_non_ingestion_validation(solution, validation_task):
            skipped_non_ingestion.append(solution["id"])
            continue

        if has_late_setup_task(tasks):
            skipped_bespoke.append(solution["id"])
            continue

        rewritten_validation, tables = rewrite_validation_task(solution, validation_task)
        new_tasks = move_validation_after_setup(tasks, rewritten_validation)

        old_ids = [task["id"] for task in tasks]
        new_ids = [task["id"] for task in new_tasks]
        if old_ids != new_ids:
            moved += 1

        renumber_and_rechain(new_tasks)
        solution["planner"]["setup_tasks"] = new_tasks
        solution["planner"]["validation_steps"] = rewrite_validation_steps(solution, tables)
        rewritten += 1

    DATA_FILE.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(f"Updated validation tasks: {rewritten}")
    print(f"Moved validation tasks: {moved}")
    print(f"Skipped non-ingestion flows: {len(skipped_non_ingestion)}")
    if skipped_non_ingestion:
        print("  " + ", ".join(skipped_non_ingestion))
    print(f"Skipped bespoke late-setup flows: {len(skipped_bespoke)}")
    if skipped_bespoke:
        print("  " + ", ".join(skipped_bespoke))


if __name__ == "__main__":
    main()
