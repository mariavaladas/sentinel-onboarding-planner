# Sebastian — Windows AMA connector records

- **Date:** 2026-05-22T16:20:26.073+02:00
- **Scope:** `data/solutions.json`

## Decision
Add four AMA-specific companion connector records in `categories.third_party.solutions`:
- `windows-forwarded-events-via-ama`
- `windows-firewall-via-ama`
- `windows-dns-events-via-ama`
- `sysmon-via-ama`

Keep the existing umbrella Windows solution records unchanged.

## Why
- The existing `Windows Forwarded Events`, `Windows Firewall`, `Windows Server DNS`, and `Windows Security Events` records mix legacy and modern paths or contain generic planner content.
- The planner needs connector-specific AMA onboarding data with explicit owners, dependencies, and infrastructure requirements.
- Companion records let the product surface precise plans without deleting legacy Content Hub bundle metadata that other screens still reference.

## Data model notes
- New records carry both `setup_tasks` (explicit phase/task model) and `planner.setup_tasks` (backward-compatible mirror for current UI/export code).
- Added `contentCounts` and `requiredInfrastructure` as richer metadata while preserving existing `analytics`, `workbooks`, and onboarding fields.
- `vendor: "Microsoft"` is stored as descriptive metadata only; no current UI logic depends on it.
