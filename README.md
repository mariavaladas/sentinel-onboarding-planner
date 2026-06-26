# Sentinel Onboarding Planner v1.0

An interactive web application that helps customers plan their Microsoft Sentinel onboarding — from scoping data sources to generating a full project plan with topology visualization and exportable Gantt charts.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

## What It Does

The Sentinel Onboarding Planner walks customers through a guided 5-step wizard:

1. **Welcome** — Overview of the onboarding workflow and expected outcomes
2. **Environment** — Select platforms, vendors, and ingestion preferences (Cribl Stream, direct AMA, etc.)
3. **Solutions** — Browse and select from 489 Sentinel content hub solutions with NLP search, capacity sizing, and Cribl routing options
4. **Topology** — Interactive diagram showing how data flows from sources through collection infrastructure into Microsoft Sentinel
5. **Planner** — Full Gantt chart with task cards, dependencies, milestones, and Excel export

## Key Features

- **489 Sentinel solutions** with analytics, workbooks, and playbook counts from the [Azure Sentinel GitHub](https://github.com/Azure/Azure-Sentinel/tree/master/Solutions)
- **Natural language search** — type "firewall logs" or "identity protection" to find relevant connectors
- **Capacity sizing** — EPS-based sizing for syslog/CEF, server counts for Windows/Linux, with Cribl-aware DCR calculations
- **Cribl Stream integration** — optional routing through Cribl with automatic topology and task plan adjustment
- **Interactive topology** — drag-and-drop React Flow diagram with uber boxes, DCR grouping, and ingestion path visualization
- **Gantt planner** — Day/Week/Month views, inline duration editing, auto-shifting dependencies, milestone tracking
- **Excel export** — DEX-style project plan with phases, dependencies, owners, and effort hours
- **Save/Load configuration** — export your selections as JSON and reload them later
- **Dark/Light theme** — toggle in the header (Gantt chart always renders in dark mode for readability)

## Getting Started

### Prerequisites

A modern web browser (Chrome, Edge, Firefox, Safari). No build tools, no npm install, no backend required.

### Run Locally

Serve the project root with any static file server:

```bash
# Node.js (recommended)
npx http-server -p 8080

# Python
python -m http.server 8080

# VS Code
# Use the "Live Server" extension
```

Then open `http://localhost:8080` in your browser.

### Deploy

This is a fully static site. Deploy to any static hosting:

- **GitHub Pages** — push to `main` and enable Pages in repo settings
- **Azure Static Web Apps** — link the repo and deploy
- **Any CDN** — upload the files as-is

## Project Structure

```
sentinel-onboarding-planner/
├── index.html              # Main application entry point
├── css/
│   └── style.css           # Theming (dark/light), layout, components
├── js/
│   ├── app.js              # Wizard orchestration, save/load config
│   ├── gantt-planner.js    # Gantt chart rendering + plan data builder
│   └── modules/
│       ├── capacity.js     # Sizing logic (EPS, server count, Cribl DCR)
│       ├── export.js       # Excel export (ExcelJS)
│       ├── gantt-tasks.js  # Task generation engine per field pack
│       ├── mitre.js        # MITRE ATT&CK mapping
│       ├── scoring.js      # Value scoring for solution prioritization
│       ├── search.js       # NLP search across solutions
│       ├── solutions.js    # Solution catalog, vendor selection, sizing UI
│       ├── topology.js     # React Flow topology diagram
│       └── wizard.js       # Step navigation and state management
├── data/
│   └── solutions.json      # 489 Sentinel solutions catalog
├── img/                    # Icons and assets
└── README.md
```

## How the Planner Works

### Ingestion Routing

The planner supports multiple ingestion paths:

| Path | When | Infrastructure |
|------|------|---------------|
| **AMA (Azure Monitor Agent)** | Default for Windows/Linux servers | AMA → DCR → Sentinel |
| **Cribl Stream** | When Cribl vendor selected + connector opted in | Source → Cribl → DCR → Sentinel |
| **Native/Direct** | Azure and M365 services | Diagnostic Settings → Sentinel |
| **Event Hub** | High-volume Azure services | Azure → Event Hub → DCR → Sentinel |
| **GCP Pub/Sub** | Google Cloud sources | GCP → Pub/Sub → DCR → Sentinel |

### Task Generation

Tasks are generated based on the selected ingestion path:
- **Cribl-routed** connectors get Cribl-specific tasks (configure source → validate → tune pipeline)
- **AMA-routed** connectors get AMA infrastructure tasks (deploy agent, configure DCR, validate)
- Each solution has hand-crafted tasks covering Prerequisites → Configuration → Validation → Operationalization

### Capacity Sizing

- **Windows/Linux**: Number of servers + EPS per server
- **Syslog/CEF/Firewalls**: EPS-based sizing
- **GCP**: EPS-based sizing
- **Cribl mode**: VM counts hidden (Cribl handles collection), EPS still used for DCR capacity planning

## Configuration Persistence

- **Session**: Topology node positions and wizard state persist in `sessionStorage`
- **Save/Load**: Export all configuration to a JSON file (💾 button) and reload later (📂 button)
- **Theme**: Saved to `localStorage`

## Browser Compatibility

| Browser | Supported |
|---------|-----------|
| Chrome 90+ | ✅ |
| Edge 90+ | ✅ |
| Firefox 90+ | ✅ |
| Safari 15+ | ✅ |

## Dependencies (CDN-loaded)

| Library | Version | Purpose |
|---------|---------|---------|
| React | 18.x | Topology diagram UI |
| React DOM | 18.x | React rendering |
| React Flow | 11.x | Interactive node graph |
| Frappe Gantt | 1.2.2 | Gantt chart visualization |
| ExcelJS | 4.4.0 | Excel export |

All loaded via CDN with SRI hashes — no build step needed.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push and open a Pull Request

## License

MIT

## Acknowledgments

- Data sourced from the [Azure Sentinel Solutions](https://github.com/Azure/Azure-Sentinel/tree/master/Solutions) repository
- Built for the Microsoft Sentinel Customer Experience Engineering (CxE) team
