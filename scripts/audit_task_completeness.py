"""
audit_task_completeness.py
Sebastian — 2026-06-16

Audit and fix task COMPLETENESS across all solutions in solutions.json.

Phase 1 — Report: find solutions that are missing required tasks.
Phase 2 — Fix:   insert the missing tasks in logical order, renumber, and
                  rewrite depends_on chains.
"""

import json
import re
from pathlib import Path

# ── Paths ───────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
DATA_FILE = ROOT / "data" / "solutions.json"

# ── Tier-1 protected solutions — do NOT modify ──────────────────────────────
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

# ── Task-type sentinel keywords ──────────────────────────────────────────────
PLAYBOOK_KWS   = ["playbook", "logic app", "automation", "soar"]
ANALYTICS_KWS  = ["analytics", "detection", "rule"]
WORKBOOK_KWS   = ["workbook", "dashboard", "visualization"]
SOURCE_KWS     = ["source device", "source to", "export logs",
                  "configure.*to send", "source config"]
VALIDATION_KWS = ["validat", "verify", "confirm data", "kql", "query"]


# ── Abbreviation extraction ──────────────────────────────────────────────────

def get_abbrev(solution: dict) -> str:
    """
    Return the task-ID abbreviation for a solution.
    Prefer the prefix of the first existing task ID; fall back to a
    computed abbreviation from the solution ID.
    """
    tasks = solution.get("planner", {}).get("setup_tasks", [])
    if tasks:
        first_id = tasks[0].get("id", "")
        # The abbreviation is everything before the last dash-segment
        # that indicates the task type (prereqs, configure, validate…)
        parts = first_id.split("-")
        # Drop the well-known trailing segment
        known_suffixes = {
            "prereqs", "configure", "validate", "content", "connector",
            "playbooks", "analytics", "workbooks", "infra", "source",
            "setup", "deploy", "enable",
        }
        prefix_parts = [p for p in parts if p not in known_suffixes]
        if prefix_parts:
            return "-".join(prefix_parts)
        return parts[0]

    # Fallback: shorten solution ID
    sol_id = solution.get("id", "unknown")
    words = sol_id.replace("-", " ").split()
    if len(words) == 1:
        return sol_id[:6]
    # Initials of each word, max 6 chars
    abbrev = "".join(w[0] for w in words if w)[:6]
    return abbrev


def _has_kw(text: str, kws: list) -> bool:
    """Return True if any keyword (supporting simple .* glob) matches text."""
    for kw in kws:
        if ".*" in kw:
            if re.search(kw, text):
                return True
        else:
            if kw in text:
                return True
    return False


# ── Completeness check ───────────────────────────────────────────────────────

def find_missing_tasks(solution: dict) -> list[str]:
    """
    Return a list of missing-task codes for this solution.
    """
    tasks    = solution.get("planner", {}).get("setup_tasks", [])
    analytics = solution.get("analytics", 0) or 0
    workbooks = solution.get("workbooks",  0) or 0
    playbooks = solution.get("playbooks",  0) or 0
    is_conn   = solution.get("is_connector", False)
    desc      = (solution.get("description", "") or "").lower()

    task_texts = " ".join(
        (t.get("task", "") + " " + t.get("description", "")).lower()
        for t in tasks
    )

    missing = []

    # 1. Playbook task required when playbooks > 0
    if playbooks > 0:
        if not _has_kw(task_texts, PLAYBOOK_KWS):
            missing.append(
                f"PLAYBOOK_TASK (has {playbooks} playbook(s) but no playbook config task)"
            )

    # 2. Analytics task required when analytics > 0
    if analytics > 0:
        if not _has_kw(task_texts, ANALYTICS_KWS):
            missing.append(
                f"ANALYTICS_TASK (has {analytics} analytics but no analytics deployment task)"
            )

    # 3. Workbook task required when workbooks > 3
    if workbooks > 3:
        if not _has_kw(task_texts, WORKBOOK_KWS):
            missing.append(
                f"WORKBOOK_TASK (has {workbooks} workbooks but no workbook task)"
            )

    # 4. Source device config required for syslog/cef connectors
    if "syslog" in desc or "cef" in desc:
        if not _has_kw(task_texts, SOURCE_KWS):
            missing.append(
                "SOURCE_CONFIG (syslog/cef connector but no source device configuration task)"
            )

    return missing


# ── Duration helpers (consistent with recalibrate_durations.py rules) ────────

def analytics_duration(analytics: int) -> float:
    if analytics <= 15:
        return 0.5
    if analytics <= 50:
        return 1.0
    return 1.5


def workbook_duration(workbooks: int) -> float:
    return 0.5 if workbooks <= 5 else 1.0


def playbook_duration(playbooks: int) -> float:
    if playbooks <= 3:
        return 0.5
    if playbooks <= 10:
        return 1.0
    return 1.5


# ── Validation task template ─────────────────────────────────────────────────

def build_validation_task(abbrev: str, order: int, prev_id: str,
                          solution: dict) -> dict:
    analytics = solution.get("analytics", 0) or 0
    dur = 1.0 if analytics > 50 else 0.5
    return {
        "id": f"{abbrev}-validate",
        "order": order,
        "task": f"Validate {solution['name']} data flow and detection coverage",
        "duration": dur,
        "effort_hours": round(dur * 4, 1),
        "skill_level": "intermediate",
        "category": "setup",
        "phase": "Validation",
        "depends_on": [prev_id] if prev_id else [],
        "owner_role": "SOC Analyst",
        "description": (
            f"Query the primary log tables ingested by {solution['name']} to confirm "
            "recent events are arriving. Fire at least one packaged analytics rule "
            "against live data and verify an incident is generated in Sentinel."
        ),
    }


# ── Missing-task builders ────────────────────────────────────────────────────

def build_analytics_task(abbrev: str, order: int, prev_id: str,
                         solution: dict) -> dict:
    analytics = solution.get("analytics", 0) or 0
    dur = analytics_duration(analytics)
    name = solution["name"]
    return {
        "id": f"{abbrev}-analytics",
        "order": order,
        "task": f"Enable {name} analytics rules",
        "duration": dur,
        "effort_hours": round(dur * 4, 1),
        "skill_level": "intermediate",
        "category": "phase-1",
        "phase": "Operationalization",
        "depends_on": [prev_id] if prev_id else [],
        "owner_role": "SOC Engineer",
        "description": (
            f"Enable the {analytics} included analytics rules from the {name} content "
            "hub package. Review rule logic and tune thresholds to match the "
            "environment's event volume."
        ),
    }


def build_workbook_task(abbrev: str, order: int, prev_id: str,
                        solution: dict) -> dict:
    workbooks = solution.get("workbooks", 0) or 0
    dur = workbook_duration(workbooks)
    name = solution["name"]
    return {
        "id": f"{abbrev}-workbooks",
        "order": order,
        "task": f"Deploy and configure {name} workbooks",
        "duration": dur,
        "effort_hours": round(dur * 4, 1),
        "skill_level": "intermediate",
        "category": "phase-1",
        "phase": "Operationalization",
        "depends_on": [prev_id] if prev_id else [],
        "owner_role": "SOC Engineer",
        "description": (
            f"Deploy the {workbooks} included workbooks. Configure workspace "
            "parameters, time range defaults, and subscription filters for "
            "each workbook."
        ),
    }


def build_playbook_task(abbrev: str, order: int, prev_id: str,
                        solution: dict) -> dict:
    playbooks = solution.get("playbooks", 0) or 0
    dur = playbook_duration(playbooks)
    name = solution["name"]
    return {
        "id": f"{abbrev}-playbooks",
        "order": order,
        "task": f"Configure {name} playbooks and automation rules",
        "duration": dur,
        "effort_hours": round(dur * 4, 1),
        "skill_level": "intermediate",
        "category": "phase-1",
        "phase": "Operationalization",
        "depends_on": [prev_id] if prev_id else [],
        "owner_role": "SOC Engineer",
        "description": (
            f"Deploy the {playbooks} included Logic App playbooks. Authorize API "
            "connections (e.g., Teams, M365, Sentinel) for each playbook. Attach "
            "playbooks to automation rules for automatic incident enrichment or response."
        ),
    }


def build_source_config_task(abbrev: str, order: int, prev_id: str,
                             solution: dict) -> dict:
    name = solution["name"]
    dur = 1.0
    return {
        "id": f"{abbrev}-source",
        "order": order,
        "task": f"Configure {name} source devices to export logs",
        "duration": dur,
        "effort_hours": round(dur * 4, 1),
        "skill_level": "intermediate",
        "category": "setup",
        "phase": "Configuration",
        "depends_on": [prev_id] if prev_id else [],
        "owner_role": "SOC Engineer",
        "description": (
            f"Configure each {name} device or appliance to forward Syslog/CEF events "
            "to the Linux log-forwarder. Set the correct facility, severity, and "
            "port settings; confirm that log streams arrive on the forwarder host."
        ),
    }


# ── ID-collision guard ────────────────────────────────────────────────────────

def next_available_id(base_id: str, existing_ids: set) -> str:
    """Return base_id if unused, else base_id-2, base_id-3, ..."""
    if base_id not in existing_ids:
        return base_id
    n = 2
    while f"{base_id}-{n}" in existing_ids:
        n += 1
    return f"{base_id}-{n}"


# ── Core fix logic ────────────────────────────────────────────────────────────

def _is_validation_task(t: dict) -> bool:
    """
    Identify a validation task by phase field first (most reliable),
    then fall back to 'Validat' keyword in task title only.
    """
    if t.get("phase") == "Validation":
        return True
    # Keyword fallback: check ONLY the task title (not description) to avoid
    # false-positives from "verify" appearing in configure task descriptions.
    task_title = t.get("task", "").lower()
    return "validat" in task_title


def _last_config_idx(tasks: list) -> int:
    """
    Return the index of the last task whose phase is 'Configuration'
    or 'Infrastructure'.  Returns -1 if none found.
    """
    config_phases = {"Configuration", "Infrastructure"}
    result = -1
    for i, t in enumerate(tasks):
        if t.get("phase") in config_phases:
            result = i
    return result


def fix_solution(solution: dict) -> int:
    """
    Insert missing tasks into solution's setup_tasks array in logical order:
      Configuration tasks (source) after last existing Config task,
      Operationalization tasks (analytics, workbooks, playbooks) before Validation,
      Validation always last.
    Returns the number of tasks added.
    """
    missing = find_missing_tasks(solution)
    if not missing:
        return 0

    abbrev = get_abbrev(solution)
    tasks  = solution["planner"]["setup_tasks"]

    need_analytics = any("ANALYTICS_TASK" in m for m in missing)
    need_workbooks = any("WORKBOOK_TASK"  in m for m in missing)
    need_playbooks = any("PLAYBOOK_TASK"  in m for m in missing)
    need_source    = any("SOURCE_CONFIG"  in m for m in missing)

    existing_ids = {t["id"] for t in tasks}
    added = 0

    def _val_idx() -> int | None:
        """Re-find validation index after each mutation (stable: uses phase field)."""
        return next((i for i, t in enumerate(tasks) if _is_validation_task(t)), None)

    # ── 1. Insert source task right after the last Configuration-phase task ─
    if need_source:
        lc = _last_config_idx(tasks)
        vi = _val_idx()
        if lc >= 0:
            src_at = lc + 1
            if vi is not None and src_at > vi:
                src_at = vi
        else:
            src_at = vi if vi is not None else len(tasks)
        src_prev = tasks[src_at - 1]["id"] if src_at > 0 else ""
        src_id = next_available_id(f"{abbrev}-source", existing_ids)
        src_task = build_source_config_task(abbrev, 0, src_prev, solution)
        src_task["id"] = src_id
        existing_ids.add(src_id)
        tasks.insert(src_at, src_task)
        added += 1

    # ── 2-4. Insert operationalization tasks one-by-one before Validation ──
    # Each step re-finds the validation index (which shifts after each insert).
    # _is_validation_task uses phase == "Validation", so newly inserted oper
    # tasks (phase = "Operationalization") are never mis-identified.
    for task_type, needed, builder, base_id in (
        ("analytics", need_analytics, build_analytics_task, f"{abbrev}-analytics"),
        ("workbooks", need_workbooks, build_workbook_task,  f"{abbrev}-workbooks"),
        ("playbooks", need_playbooks, build_playbook_task,  f"{abbrev}-playbooks"),
    ):
        if not needed:
            continue
        vi = _val_idx()
        insert_at = vi if vi is not None else len(tasks)
        prev_id = tasks[insert_at - 1]["id"] if insert_at > 0 else ""
        new_id = next_available_id(base_id, existing_ids)
        new_task = builder(abbrev, 0, prev_id, solution)
        new_task["id"] = new_id
        existing_ids.add(new_id)
        tasks.insert(insert_at, new_task)
        added += 1

    # ── 5. Ensure a validation task is present at the end ──────────────────
    if not any(_is_validation_task(t) for t in tasks):
        prev_id = tasks[-1]["id"] if tasks else ""
        vid = next_available_id(f"{abbrev}-validate", existing_ids)
        vt = build_validation_task(abbrev, 0, prev_id, solution)
        vt["id"] = vid
        tasks.append(vt)
        existing_ids.add(vid)
        added += 1

    # ── 6. Rebuild full linear depends_on chain ────────────────────────────
    for i, t in enumerate(tasks):
        t["depends_on"] = [] if i == 0 else [tasks[i - 1]["id"]]

    # ── 7. Renumber order fields ───────────────────────────────────────────
    for i, t in enumerate(tasks):
        t["order"] = i + 1

    return added


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    with open(DATA_FILE, encoding="utf-8") as f:
        data = json.load(f)

    cats = data["categories"]

    all_solutions: list[dict] = []
    for cat_val in cats.values():
        all_solutions.extend(cat_val.get("solutions", []))

    # ── Phase 1: Report ──────────────────────────────────────────────────────
    print("=" * 70)
    print("PHASE 1 -- COMPLETENESS AUDIT")
    print("=" * 70)

    issues: dict[str, list[str]] = {}   # solution_id -> [missing codes]
    protected_skipped = 0

    for sol in all_solutions:
        sid = sol["id"]
        if sid in TIER1_PROTECTED:
            protected_skipped += 1
            continue
        if not sol.get("planner", {}).get("setup_tasks"):
            continue
        missing = find_missing_tasks(sol)
        if missing:
            issues[sid] = missing

    # Group by issue type
    by_type: dict[str, list[str]] = {
        "PLAYBOOK_TASK":   [],
        "ANALYTICS_TASK":  [],
        "WORKBOOK_TASK":   [],
        "SOURCE_CONFIG":   [],
    }
    for sid, ms in issues.items():
        for m in ms:
            for key in by_type:
                if m.startswith(key):
                    by_type[key].append(sid)

    for key, sids in by_type.items():
        if sids:
            print(f"\n  {key} -- {len(sids)} solution(s) affected:")
            for sid in sorted(sids):
                detail = next(m for m in issues[sid] if m.startswith(key))
                print(f"    - {sid:50s}  [{detail}]")

    total_affected = len(issues)
    total_missing  = sum(len(v) for v in issues.values())
    print(f"\n  Summary: {total_affected} solutions affected, {total_missing} missing tasks total")
    print(f"  ({protected_skipped} Tier-1 protected solutions skipped)\n")

    # ── Phase 2: Fix ─────────────────────────────────────────────────────────
    print("=" * 70)
    print("PHASE 2 -- INSERTING MISSING TASKS")
    print("=" * 70)

    solutions_fixed = 0
    tasks_added     = 0
    by_type_added: dict[str, int] = {
        "PLAYBOOK_TASK":  0,
        "ANALYTICS_TASK": 0,
        "WORKBOOK_TASK":  0,
        "SOURCE_CONFIG":  0,
    }

    for sol in all_solutions:
        sid = sol["id"]
        if sid in TIER1_PROTECTED:
            continue
        if not sol.get("planner", {}).get("setup_tasks"):
            continue

        before_missing = find_missing_tasks(sol)
        if not before_missing:
            continue

        n_added = fix_solution(sol)

        # Re-check to confirm all fixed
        after_missing = find_missing_tasks(sol)

        if n_added > 0:
            solutions_fixed += 1
            tasks_added += n_added
            flag = "OK" if not after_missing else "!! STILL INCOMPLETE"
            print(f"  [{flag}] {sid:50s}  +{n_added} task(s)")
            for m in before_missing:
                for key in by_type_added:
                    if m.startswith(key):
                        by_type_added[key] += 1
            if after_missing:
                for m in after_missing:
                    print(f"      STILL MISSING: {m}")

    # ── Phase 3: Post-fix re-audit ────────────────────────────────────────
    print()
    print("=" * 70)
    print("PHASE 3 -- POST-FIX VALIDATION")
    print("=" * 70)

    remaining = 0
    for sol in all_solutions:
        sid = sol["id"]
        if sid in TIER1_PROTECTED:
            continue
        if not sol.get("planner", {}).get("setup_tasks"):
            continue
        missing = find_missing_tasks(sol)
        if missing:
            remaining += 1
            print(f"  STILL MISSING — {sid}: {missing}")

    if remaining == 0:
        print("  [PASS] All solutions pass completeness check -- 0 remaining gaps.\n")
    else:
        print(f"\n  [WARN] {remaining} solution(s) still have gaps after fix.\n")

    # ── Save ─────────────────────────────────────────────────────────────────
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("  [SAVED] solutions.json saved.\n")

    # ── Final summary ─────────────────────────────────────────────────────────
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"  Total solutions audited : {len(all_solutions) - protected_skipped}")
    print(f"  Tier-1 protected        : {protected_skipped}")
    print(f"  Solutions fixed         : {solutions_fixed}")
    print(f"  Tasks added             : {tasks_added}")
    print()
    print("  By type:")
    for key, count in by_type_added.items():
        if count:
            print(f"    {key:20s} {count}")
    print()


if __name__ == "__main__":
    main()
