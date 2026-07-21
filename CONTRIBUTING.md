# Contributing to Sentinel Onboarding Planner

Thank you for your interest in contributing! This is a fully static application (no backend, no build step, no npm install required), so contributions can range from bug reports and feature ideas to improving the solutions catalog or refining task generation logic.

## Ways to Contribute

### Report Bugs or Request Features

Open a GitHub Issue with a clear description. We track bugs, feature requests, and documentation improvements using the Issues tab. Describe what you observed, what you expected to happen, and how to reproduce the issue if applicable.

### Improve the Solutions Catalog

The 489 Sentinel solutions are stored in `data/solutions.json`. You can add new solutions, update descriptions, refine categorization, or fix inaccuracies. Each solution entry includes vendor, category, analytics count, workbook count, playbook count, and associated field pack mappings.

### Add or Refine Task Generation

Task generation logic lives in `js/modules/gantt-tasks.js` and drives the Planner view. You can improve task templates, add new ingestion path tasks, refine duration estimates, or enhance dependency logic for better project planning accuracy.

### Improve Documentation

Documentation improvements are always welcome. This includes README clarifications, in-code comments, or better inline help text within the application itself.

## Running Locally

Serve the repo root with any static file server. The application loads `data/solutions.json` over HTTP, so it must be served (not opened via `file://`).

Choose one of these:

```bash
# Node.js (recommended)
npx http-server -p 8080

# Python
python -m http.server 8080

# VS Code
# Use the "Live Server" extension
```

Then open `http://localhost:8080` in your browser.

## Project Layout

The application structure is documented in the Project Structure section of the README. Key files you may work with:

- `js/app.js` — Wizard flow orchestration and save/load configuration
- `js/gantt-planner.js` — Gantt chart rendering and plan data builder
- `js/modules/` — Modular logic for capacity sizing, Excel export, topology visualization, solution catalog management, and more
- `data/solutions.json` — 489 Sentinel solutions catalog with metadata and task mappings

## Making Changes

### PR Workflow

1. Fork the repository
2. Create a feature branch with a clear name (`feature/short-description-of-change`)
3. Keep your changes focused (one feature or fix per PR)
4. Test your changes in a browser, walking through the wizard steps to ensure nothing breaks
5. For UI changes, include a screenshot in your PR description
6. Open a Pull Request against `main` with a clear description of what you changed and why

### Coding Conventions

- **Vanilla JavaScript** — No framework build or transpilation. Code runs directly in the browser.
- **Match existing style** — Follow the patterns you see in existing files (naming, indentation, structure).
- **Dependencies are CDN-loaded** — All libraries are loaded via CDN with Subresource Integrity (SRI) hashes (see `index.html`). If you add a new dependency, it must be loaded the same way with an integrity hash. Prefer built-in browser APIs where possible to keep dependencies light.

## Reporting Bugs

When you report a bug, please include:

- **Steps to reproduce** — Exactly what actions led to the problem
- **Browser and version** — For example, Chrome 120, Edge 119, Firefox 121, Safari 17
- **Expected vs actual behavior** — What should have happened vs what actually happened
- **Console errors** — Any JavaScript errors visible in the browser developer console
- **Screenshot** — If applicable, attach a screenshot showing the issue

## License

By contributing, you agree that your contributions are accepted under the project's MIT License.

Thank you for helping make the Sentinel Onboarding Planner better!
