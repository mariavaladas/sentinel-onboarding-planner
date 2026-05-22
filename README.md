# Sentinel Onboarding Planner

An interactive web application that guides new or immature customers through onboarding to Microsoft Sentinel — helping them scope onboarding, visualize topology, and sequence delivery.

## Purpose

This tool helps customers:
1. **Identify** what data sources they want to bring into Sentinel
2. **Discover** the right connectors from the Azure Sentinel GitHub
3. **Visualize** what analytics rules, workbooks, and playbooks come with each connector
4. **Plan** their deployment with an exportable plan

## How It Works

### Step 1: Welcome
Quick overview of the onboarding workflow and expected outcomes.

### Step 2: Environment
Choose the platforms and vendors you expect to bring into Microsoft Sentinel.

### Step 3: Solutions
- Review recommended solution packages
- Use **natural language input** for partner and custom solutions (for example: "crowdstrike alerts, palo alto logs")
- Build the final shortlist for planning

### Step 4: Topology
- Visualize how selected data sources flow into Microsoft Sentinel
- Review likely collection methods and ingestion paths
- Prepare for stakeholder conversations before implementation

### Step 5: Planner
- Review the interactive **Gantt chart** with Day / Week / Month views
- Edit task durations inline from the left grid, or open a task row/bar to adjust start week and full schedule details while untouched tasks still auto-shift
- Switch to task cards for milestone, owner, dependency, and effort detail
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
sentinel-onboarding-planner/
├── index.html          # Main application
├── css/
│   └── style.css       # Dark theme styling
├── js/
│   ├── app.js          # Wizard orchestration
│   ├── gantt-planner.js# Gantt planner transformation + rendering
│   └── modules/        # Wizard, topology, planner, export, scoring, search modules
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
