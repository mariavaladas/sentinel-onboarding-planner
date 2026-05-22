### 2026-05-22T16:26:15Z: UX Decision — Collapsible solution groups
**By:** madesous (via Copilot)
**What:** Gantt planner should use a two-level tree hierarchy:
- Shared phases (Stakeholder Kickoff, Define Workspace Topology, Training & Handover, Go Live & Monitoring) stay as flat top-level rows
- Each solution/connector becomes a collapsible group header with chevron toggle
- Collapsed by default so stakeholders see the big picture
- Group header bar spans the full duration of its child tasks (aggregate bar)
- Expanding shows individual subtasks indented beneath
**Why:** Scalability — as more connectors are added (currently 5+), the flat task list becomes overwhelming. This keeps the view manageable.
