"""
patch_tier3_durations.py
Sebastian – Data Engineer
2026-06-16

Enriches all 438 Tier 3 (third-party) solutions with full planner.setup_tasks
metadata. These solutions already have 'task', 'effort_hours', 'order', and
'skill_level' — this script adds the missing fields:
  id, category, phase, owner_role, depends_on, description, duration

Rules:
  - Duration derived from effort_hours using canonical formula
  - Standard 4-task metadata table (same for all Tier 3 solutions)
  - ID abbreviation: first letter of each hyphen-separated word in solution id,
    max 4 chars; appends -prereqs / -configure / -content / -validate
  - Description: reuses the existing task text (acceptable for third-party batch)
  - Skips any solution already fully enriched (no null duration)
"""

import json
import re

SOLUTIONS_PATH = "data/solutions.json"


# ---------------------------------------------------------------------------
# Duration derivation
# ---------------------------------------------------------------------------
def derive_duration(effort_hours: float) -> float:
    if effort_hours <= 1.5:
        return 0.5
    elif effort_hours <= 3:
        return 1.0
    elif effort_hours <= 5:
        return 1.5
    elif effort_hours <= 8:
        return 2.0
    else:
        return 3.0


# ---------------------------------------------------------------------------
# Standard 4-task metadata table (Tier 3 canonical)
# ---------------------------------------------------------------------------
TASK_META = {
    1: ("setup",   "Prerequisites",    "Azure Platform Admin", "beginner"),
    2: ("setup",   "Configuration",    "SOC Engineer",         "beginner"),
    3: ("phase-1", "Operationalization","SOC Engineer",         "intermediate"),
    4: ("phase-2", "Validation",       "SOC Analyst",          "intermediate"),
}

TASK_SUFFIXES = {
    1: "prereqs",
    2: "configure",
    3: "content",
    4: "validate",
}


# ---------------------------------------------------------------------------
# Abbreviation generator
# ---------------------------------------------------------------------------
def make_abbrev(solution_id: str) -> str:
    """
    Build a short abbreviation from the hyphen-separated solution id.
    Strategy:
      1. Take first letter of each hyphen-separated word (up to 4 words).
      2. If total < 2 chars (single-word id), take first 3 chars of the id.
    Examples:
      palo-alto-networks  -> pan
      cisco-asa           -> ca
      azure-cloud-ngfw-by-palo-alto-networks -> acnb (first 4 words)
    """
    parts = solution_id.split("-")
    abbrev = "".join(p[0] for p in parts[:4] if p)
    if len(abbrev) < 2:
        abbrev = re.sub(r"[^a-z0-9]", "", solution_id)[:3]
    return abbrev.lower()


# ---------------------------------------------------------------------------
# Main patch logic
# ---------------------------------------------------------------------------
def patch_solution(solution: dict) -> bool:
    """
    Enrich a single solution's setup_tasks in-place.
    Returns True if patched, False if skipped (already enriched).
    """
    tasks = solution.get("planner", {}).get("setup_tasks", [])
    if not tasks:
        return False

    # Skip if all tasks already have a non-null duration
    if all(t.get("duration") is not None for t in tasks):
        return False

    abbrev = make_abbrev(solution["id"])

    for task in tasks:
        order = task.get("order")
        if order not in TASK_META:
            continue  # safety guard

        category, phase, owner_role, skill_level = TASK_META[order]
        suffix    = TASK_SUFFIXES[order]
        task_id   = f"{abbrev}-{suffix}"
        duration  = derive_duration(task.get("effort_hours", 2))
        desc      = task.get("task", "")  # reuse existing task text

        # Dependency chain: each task depends on the previous one
        if order == 1:
            depends_on = []
        else:
            prev_suffix = TASK_SUFFIXES[order - 1]
            depends_on  = [f"{abbrev}-{prev_suffix}"]

        task["id"]         = task_id
        task["category"]   = category
        task["phase"]      = phase
        task["owner_role"] = owner_role
        task["skill_level"]= skill_level
        task["depends_on"] = depends_on
        task["description"]= desc
        task["duration"]   = duration

    return True  # at least one task was enriched


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main():
    with open(SOLUTIONS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    cats = data["categories"]

    # Flatten all solutions while keeping references into the original structure
    # (we patch in-place so just iterating is sufficient)
    all_solutions = []
    for cat_val in cats.values():
        if isinstance(cat_val, dict) and "solutions" in cat_val:
            all_solutions.extend(cat_val["solutions"])
        elif isinstance(cat_val, list):
            all_solutions.extend(cat_val)

    enriched = 0
    patched_ids = []

    for solution in all_solutions:
        if patch_solution(solution):
            enriched += 1
            patched_ids.append(solution["id"])

    # Write back
    with open(SOLUTIONS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # ── Summary ──────────────────────────────────────────────────────────────
    print(f"\nTier 3 enrichment complete.")
    print(f"    Enriched:  {enriched} solutions")

    print(f"\n    Sample (first 5 enriched IDs):")
    for sid in patched_ids[:5]:
        print(f"      {sid}")

    # Verify final totals
    with open(SOLUTIONS_PATH, "r", encoding="utf-8") as f:
        verify = json.load(f)

    all_v = []
    for cat_val in verify["categories"].values():
        if isinstance(cat_val, dict) and "solutions" in cat_val:
            all_v.extend(cat_val["solutions"])
        elif isinstance(cat_val, list):
            all_v.extend(cat_val)

    with_dur = sum(
        1 for s in all_v
        if s.get("planner") and s["planner"].get("setup_tasks")
        and all(t.get("duration") is not None for t in s["planner"]["setup_tasks"])
    )
    still_null = sum(
        1 for s in all_v
        if s.get("planner") and s["planner"].get("setup_tasks")
        and any(t.get("duration") is None for t in s["planner"]["setup_tasks"])
    )

    print(f"\n    Total solutions with full duration after patch: {with_dur}")
    print(f"    Solutions still missing duration:                {still_null}")
    print(f"    Total solutions in catalog:                      {len(all_v)}")


if __name__ == "__main__":
    main()
