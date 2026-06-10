### 2026-06-02T14:20:53Z: GitHub logo implementation pattern
**By:** K
**Scope:** Step 2 environment cards, Step 3 solution badges, Step 4 topology source/Cribl nodes

- Load vendor/product logos from remote GitHub raw URLs only; do not add local image assets for this feature.
- Always keep an existing emoji or generic icon fallback in the DOM/UI path so the wizard stays usable when a remote logo 404s or GitHub is unreachable.
- For Step 2 use DOM-bound `load`/`error` listeners on static markup; for Step 4 use React image handlers inside the node components; avoid inline event attributes to stay aligned with the app's CSP-safe DOM rules.
- Prefer dark-theme-friendly logo surfaces, and use a lighter badge only where a vendor mark (for example AWS) needs contrast against the planner's dark UI.
