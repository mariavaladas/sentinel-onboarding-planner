# Sentinel Value Pack Setup

An interactive web application that guides new or immature customers through onboarding to Microsoft Sentinel — helping them see value in one day.

## Purpose

This tool helps customers:
1. **Identify** what data sources they want to bring into Sentinel
2. **Discover** the right connectors from the Azure Sentinel GitHub
3. **Visualize** what analytics rules, workbooks, and playbooks come with each connector
4. **Plan** their deployment with an exportable plan

## How It Works

### Step 1: Welcome
Overview of what Sentinel Value Pack delivers (Connect → Detect → Respond → Visualize).

### Step 2: Data Source Categories
Choose from a full Sentinel content hub catalog, including:
- **Azure First Party** — Azure Activity, Firewall, Key Vault, Storage, AKS, Event Hubs, and more
- **Microsoft Security & Productivity** — Microsoft XDR, Microsoft Entra, and Microsoft 365 workloads such as Defender, Purview, Intune, Teams, and Exchange
- **Partner & Platform Categories** — Endpoint Protection, Network Security, Cloud Platforms, Identity & Access, Email Security, SIEM Migration, Threat Intelligence, and Infrastructure

### Step 3: Select Specific Logs
- Browse connectors per category
- Use **natural language input** for partner and custom solutions (e.g., "crowdstrike alerts, palo alto logs")
- See at-a-glance metrics (analytics rules, workbooks, playbooks) per connector

### Step 4: Planner View
- Visual summary of selected solutions and packaged content
- Interactive **Gantt chart** with Day / Week / Month views
- Task cards for milestone, owner, dependency, and effort review
- **Export** the onboarding plan to Excel in a DEX-style project plan format

## Running Locally

Simply open `index.html` in a browser, or serve it with any static file server:

```bash
# Python
python -m http.server 8000

# Node.js
npx serve .

# VS Code
# Use the "Live Server" extension
```

## Data Source

Connector data is sourced from the [Azure Sentinel GitHub](https://github.com/Azure/Azure-Sentinel/tree/master/Solutions). The `data/solutions.json` file now contains a planning-ready content hub catalog of 485 Sentinel solutions with counts, scoring, onboarding, permissions, and export metadata.

## Project Structure

```
value-pack-setup/
├── index.html          # Main application
├── css/
│   └── style.css       # Dark theme styling
├── js/
│   ├── app.js          # Wizard orchestration
│   ├── gantt-planner.js# Gantt planner transformation + rendering
│   └── modules/        # Wizard, planner, export, scoring, search modules
├── data/
│   └── solutions.json  # Connector catalog
├── img/                # (future) Local icons
└── README.md
```

## Future Enhancements

- [ ] Live GitHub API integration for real-time connector counts
- [ ] Named owner assignment and status updates inside the exported workbook
- [ ] Customer-editable project baselines and saved plan re-import
- [ ] Richer dependency rules for connector prerequisites and use case waves
- [ ] Integration with Sentinel API for implementation readiness checks
