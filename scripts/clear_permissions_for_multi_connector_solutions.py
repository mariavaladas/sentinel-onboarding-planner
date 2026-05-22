from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOLUTIONS_PATH = ROOT / "data" / "solutions.json"


def main() -> None:
    data = json.loads(SOLUTIONS_PATH.read_text(encoding="utf-8-sig"))

    total = 0
    kept = 0
    cleared = 0

    for category in data.get("categories", {}).values():
        for solution in category.get("solutions", []):
            total += 1
            connectors = int(solution.get("connectors", 0) or 0)
            if connectors > 1:
                if solution.get("permissions") != {}:
                    cleared += 1
                solution["permissions"] = {}
            else:
                kept += 1

    SOLUTIONS_PATH.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8-sig",
    )

    print(
        json.dumps(
            {
                "total_solutions": total,
                "permissions_cleared_for_multi_connector_solutions": cleared,
                "single_or_zero_connector_solutions_kept": kept,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
