# K decision: cyan plus for pending selections

- Switched the generic `.solution-item-check:checked` state to a dedicated cyan treatment (`#22d3ee` / rgba) instead of `--accent`, because the current accent token is purple and would not meet the requested visual distinction.
- Added an explicit `.already-connected .solution-item-check:checked` safeguard so connected cards always keep the existing green check styling even when the checkbox is technically checked.
