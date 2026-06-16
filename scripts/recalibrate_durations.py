"""
recalibrate_durations.py
Recalibrate ALL task durations in solutions.json based on realistic human effort.
Sebastian — 2026-06-16
"""

import json
import copy
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
DATA_FILE = ROOT / "data" / "solutions.json"

# ── Protected solutions — hand-calibrated Tier 1, do NOT touch ────────────────
TIER1_PROTECTED = {
    "azure-activity",
    "defender-for-cloud",
    "defender-xdr",
    "microsoft-entra-id",
    "microsoft-365",
    "common-event-format",
    "windows-forwarded-events",
    "windows-security-events",
    "windows-dns-events-via-ama",
}


def recalibrate_task(task: dict, solution: dict) -> float:
    """
    Return the new duration (in days) for a single task, based on the
    calibration rules.  Enforces min=0.5, max=3.0 at call site.
    """
    phase = task.get("phase", "")
    desc = (task.get("description", "") or "").lower()

    # ── Description-based phase override ──────────────────────────────────────
    # Some hand-crafted Batch A tasks have wrong phase labels.
    # If the description clearly describes analytics/workbook/playbook enablement,
    # treat it as Operationalization regardless of the phase field.
    content_kws = ["analytics rule", "analytic rule", "enable rule",
                   "detection rule", "scheduled rule", "content hub",
                   "playbook", "logic app playbook", "automation rule"]
    workbook_deploy_kws = ["workbook", "deploy workbook", "install workbook",
                           "visuali"]
    if phase == "Configuration" and any(kw in desc for kw in content_kws):
        phase = "Operationalization"  # override to correct logical phase

    analytics = solution.get("analytics", 0) or 0
    workbooks  = solution.get("workbooks",  0) or 0
    playbooks  = solution.get("playbooks",  0) or 0
    connectors = solution.get("connectors", 0) or 0

    # ── Prerequisites ──────────────────────────────────────────────────────────
    if phase == "Prerequisites":
        cross_cloud_kws = ["iam role", "aws", "gcp", "s3", "pub/sub", "nss",
                           "topology", "cross-account", "cross-cloud"]
        infra_kws = ["forwarder", "placement", "design", "architecture",
                     "wec", "wef", "collector", "windows event forward"]
        if any(kw in desc for kw in cross_cloud_kws):
            return 1.0
        elif any(kw in desc for kw in infra_kws):
            return 1.0
        else:
            return 0.5  # verify licence, check permissions, confirm RBAC

    # ── Configuration ─────────────────────────────────────────────────────────
    elif phase == "Configuration":
        cross_cloud_kws = ["s3 bucket", "sqs queue", "sqs ", " s3 ", "pub/sub",
                           "log sink", "nss ", "nanolog", "iam role",
                           "cross-account", " gcp ", "google cloud",
                           "cloudtrail", "vpc flow log", "gcp flow log"]
        forwarder_kws   = ["forwarder", "azure monitor agent", "dcr ",
                           "data collection rule", "azure arc",
                           "linux vm", "linux node", "syslog forwarder",
                           "log forwarder", "cef forwarder"]
        source_kws      = ["source device", "log source", "event source",
                           "export log", "logging setting", "syslog ",
                           " cef ", "firewall log", "firewall rule"]
        if any(kw in desc for kw in cross_cloud_kws):
            return 1.5  # cross-cloud infra: IAM, S3/SQS, Pub/Sub
        elif any(kw in desc for kw in forwarder_kws):
            return 1.5  # AMA/DCR/forwarder deployment
        elif any(kw in desc for kw in source_kws):
            return 1.0  # configure source device to emit logs
        elif connectors > 5:
            return 1.5  # multi-connector product (e.g. Zscaler 15 connectors)
        else:
            return 0.5  # simple: paste API key, pick log types, save

    # ── Infrastructure (non-standard phase used by AMA/WEC/Sysmon solutions) ──
    elif phase == "Infrastructure":
        wec_wef_kws     = ["wec ", "wef ", "windows event forward",
                           "windows event collector", "windows event forwarder",
                           "event collector", "forwarded event"]
        ama_kws         = ["ama", "azure monitor agent", "forwarder", "arc",
                           "data collection rule", "dcr", "linux node",
                           "forwarding path"]
        source_inst_kws = ["sysmon", "install", "configure sysmon",
                           "source device", "firewall log", "windows defender firewall"]
        if any(kw in desc for kw in wec_wef_kws):
            # WEC/WEF foundation — complex conditional setup
            if any(kw in desc for kw in ["remediat", "from scratch", "build", "stand up",
                                         "healthy wec", "remediate"]):
                return 2.0  # full WEC/WEF build
            else:
                return 1.5  # partial WEC or existing estate
        elif any(kw in desc for kw in ama_kws):
            return 1.5  # deploy Linux forwarder + AMA + DCR
        elif any(kw in desc for kw in source_inst_kws):
            return 1.5  # install/configure Sysmon or similar host agent
        else:
            return 1.0  # generic infrastructure prep

    # ── Data Verification ─────────────────────────────────────────────────────
    elif phase == "Data Verification":
        return 0.5  # always: wait for data, run a table query

    # ── Operationalization ────────────────────────────────────────────────────
    elif phase == "Operationalization":
        if playbooks > 10:
            return 1.5  # 10-23 playbooks: selection + auth + test each
        elif playbooks > 3:
            return 1.0  # 4-10 playbooks: API connections + test flows
        elif analytics > 50:
            return 1.5  # 50+ rules: phased enablement, noise assessment
        elif analytics > 15:
            return 1.0  # 16-50 rules: review each, decide applicability
        elif workbooks > 10:
            return 1.0  # 10+ workbooks: configure parameters per workbook
        else:
            return 0.5  # ≤15 rules, ≤3 workbooks, ≤3 playbooks: quick enable

    # ── Validation ────────────────────────────────────────────────────────────
    elif phase == "Validation":
        if analytics > 50:
            return 1.0  # tune 50+ rules, suppress noise, validate field mapping
        else:
            return 0.5  # standard: KQL query + verify + fire one rule

    # ── Fallback — non-standard phase name: keyword analysis on description ───
    else:
        # Try to classify by description keywords when phase is unexpected
        heavy_kws = ["s3", "sqs", "pub/sub", "iam role", "ama",
                     "azure monitor agent", "forwarder", "dcr", "wec", "wef",
                     "sysmon", "cross-account", "gcp", "nss"]
        medium_kws = ["source", "device", "export", "firewall rule",
                      "syslog", "cef", "aws", "credentials"]
        if any(kw in desc for kw in heavy_kws):
            return 1.5
        elif any(kw in desc for kw in medium_kws):
            return 1.0
        else:
            # Preserve existing duration — this task was likely hand-crafted
            return task.get("duration", 0.5)


def validate_and_clamp(task_dur: float, solution_total_new: float,
                       num_tasks: int) -> float:
    """Enforce per-task bounds: 0.5 ≤ d ≤ 3.0."""
    return max(0.5, min(3.0, task_dur))


def recalibrate_solution(solution: dict) -> tuple[float, float]:
    """
    Mutate solution's setup_tasks in place.
    Returns (old_total, new_total).
    """
    tasks = solution.get("planner", {}).get("setup_tasks", [])
    if not tasks:
        return 0.0, 0.0

    old_total = sum(t.get("duration", 0) for t in tasks)

    new_durations = []
    for t in tasks:
        raw = recalibrate_task(t, solution)
        clamped = max(0.5, min(3.0, raw))
        new_durations.append(clamped)

    new_total = sum(new_durations)

    # Enforce minimum viable solution total of 1.0d
    if new_total < 1.0:
        # Scale up proportionally (edge case: single ultra-short task)
        scale = 1.0 / new_total
        new_durations = [max(0.5, min(3.0, d * scale)) for d in new_durations]
        new_total = sum(new_durations)

    # Write back
    for t, nd in zip(tasks, new_durations):
        t["duration"] = nd
        t["effort_hours"] = round(nd * 4, 1)

    return old_total, sum(t["duration"] for t in tasks)


def main():
    with open(DATA_FILE, encoding="utf-8") as f:
        data = json.load(f)

    cats = data["categories"]

    before_grand = 0.0
    after_grand  = 0.0
    tier1_total  = 0.0

    deltas = []          # (solution_id, name, before, after, delta)
    new_totals = []      # (solution_id, name, after)

    solutions_recalibrated = 0

    for cat_key, cat_val in cats.items():
        for solution in cat_val["solutions"]:
            sid = solution["id"]
            tasks = solution.get("planner", {}).get("setup_tasks", [])
            if not tasks:
                continue

            sol_before = sum(t.get("duration", 0) for t in tasks)

            if sid in TIER1_PROTECTED:
                tier1_total += sol_before
                before_grand += sol_before
                after_grand  += sol_before
                continue

            old_total, new_total = recalibrate_solution(solution)
            solutions_recalibrated += 1
            before_grand += old_total
            after_grand  += new_total

            delta = new_total - old_total
            deltas.append((sid, solution.get("name", sid), old_total, new_total, delta))
            new_totals.append((sid, solution.get("name", sid), new_total))

    # Write updated JSON
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    # ── Report ─────────────────────────────────────────────────────────────────
    print("=" * 65)
    print("  Duration Recalibration Report")
    print("=" * 65)
    print(f"  Solutions recalibrated : {solutions_recalibrated}")
    print(f"  Tier-1 protected       : {len(TIER1_PROTECTED)} (untouched)")
    print(f"  Before total duration  : {before_grand:.1f}d")
    print(f"  After total duration   : {after_grand:.1f}d")
    print(f"  Net change             : {after_grand - before_grand:+.1f}d  "
          f"({100 * (after_grand - before_grand) / before_grand:+.1f}%)")
    print()

    # Top 10 biggest reductions
    deltas_sorted = sorted(deltas, key=lambda x: x[4])  # most negative first
    print("  Top 10 BIGGEST duration reductions:")
    for sid, name, bef, aft, delta in deltas_sorted[:10]:
        print(f"    {name[:40]:<40}  {bef:5.1f}d -> {aft:5.1f}d  ({delta:+.1f}d)")
    print()

    # Top 10 smallest totals (sanity check)
    new_totals_sorted = sorted(new_totals, key=lambda x: x[2])
    print("  Top 10 SMALLEST total duration (sanity check):")
    for sid, name, tot in new_totals_sorted[:10]:
        print(f"    {name[:40]:<40}  {tot:.1f}d")
    print()

    # Validation checks
    print("  Validation:")
    violations = []
    for cat_key, cat_val in cats.items():
        for solution in cat_val["solutions"]:
            sid = solution["id"]
            if sid in TIER1_PROTECTED:
                continue
            tasks = solution.get("planner", {}).get("setup_tasks", [])
            if not tasks:
                continue
            sol_total = sum(t["duration"] for t in tasks)
            for t in tasks:
                d = t["duration"]
                if d < 0.5:
                    violations.append(f"  UNDER: {sid} / {t['id']} = {d}d")
                if d > 3.0:
                    violations.append(f"  OVER:  {sid} / {t['id']} = {d}d")
            if sol_total < 1.0:
                violations.append(f"  SOL_MIN: {sid} total = {sol_total:.1f}d")

    if violations:
        print(f"  [!] {len(violations)} violation(s):")
        for v in violations:
            print("    " + v)
    else:
        print("  [OK] All tasks in range [0.5, 3.0]d")
        print("  [OK] All solutions total >= 1.0d")
    print("=" * 65)


if __name__ == "__main__":
    main()
