from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOLUTIONS_PATH = ROOT / "data" / "solutions.json"

# All GCP solution IDs that need capacity_type: "eps"
GCP_SOLUTION_IDS = {
    "google-cloud-platform-audit-logs",
    "google-cloud-platform-big-query",
    "google-cloud-platform-cdn",
    "google-cloud-platform-cloud-monitoring",
    "google-cloud-platform-cloud-run",
    "google-cloud-platform-compute-engine",
    "google-cloud-platform-dns",
    "google-cloud-platform-firewall-logs",
    "google-cloud-platform-iam",
    "google-cloud-platform-ids",
    "google-cloud-platform-load-balancer-logs",
    "google-cloud-platform-nat",
    "google-cloud-platform-resource-manager",
    "google-cloud-platform-security-command-center",
    "google-cloud-platform-sql",
    "google-cloud-platform-vpc-flow-logs",
    "google-kubernetes-engine",
}


def main() -> None:
    data = json.loads(SOLUTIONS_PATH.read_text(encoding="utf-8-sig"))

    total = 0
    updated = 0
    skipped = 0
    not_found = set(GCP_SOLUTION_IDS)

    for category in data.get("categories", {}).values():
        for solution in category.get("solutions", []):
            solution_id = solution.get("id")
            total += 1

            if solution_id in GCP_SOLUTION_IDS:
                not_found.discard(solution_id)
                if solution.get("capacity_type") != "eps":
                    solution["capacity_type"] = "eps"
                    updated += 1
                else:
                    skipped += 1
            else:
                skipped += 1

    SOLUTIONS_PATH.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8-sig",
    )

    result = {
        "total_solutions": total,
        "gcp_solutions_updated": updated,
        "gcp_solutions_already_had_eps": len(GCP_SOLUTION_IDS) - updated - len(not_found),
        "gcp_solutions_not_found": list(sorted(not_found)),
    }

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
