# Dead code reference cleanup

## When to use
Use this pattern when a static frontend has suspected dead UI code mixed with still-live shared helpers or CSS, and you need to remove only the unreachable pieces without destabilizing the active flow.

## Pattern
1. Create a rollback point first (for example a git tag) before editing runtime files.
2. Verify each candidate with repo-wide reference searches across HTML, JS, and CSS instead of relying on nearby comments or old snapshots.
3. Trace neighboring helpers and selectors separately so shared primitives (like common stat-card styles) are preserved even if adjacent renderers are dead.
4. Remove dead exports, helpers, selectors, and orphaned IDs surgically without reformatting surrounding code.
5. Re-run reference searches after cleanup to confirm the removed symbols no longer exist and no live code still points at them.
6. Load the page through a local HTTP server and inspect the browser output for runtime errors, distinguishing app issues from browser/CDN noise.

## Validation checklist
- Rollback tag or equivalent restore point exists before cleanup edits.
- Removed symbols have no remaining references in runtime files.
- Shared live styles/helpers next to dead blocks are still present and working.
- The app serves over HTTP and loads modified modules/assets without new JS errors.
- Temporary validation artifacts are deleted after the check.
