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
Choose from:
- **Azure First Party** — Azure Activity, Firewall, Key Vault, NSG, DDoS, WAF
- **Microsoft 365 & Security** — Entra ID, Office 365, Defender XDR, MDE, MDO, MDI, MDA, Purview
- **Third Party** — CrowdStrike, Palo Alto, Fortinet, Cisco, Zscaler, Okta, AWS, GCP, and more

### Step 3: Select Specific Logs
- Browse connectors per category
- Use **natural language input** for third-party (e.g., "crowdstrike alerts, palo alto logs")
- See at-a-glance metrics (analytics rules, workbooks, playbooks) per connector

### Step 4: Your Value Pack
- Visual summary of total content you'll deploy
- Detailed cards for each selected connector showing:
  - Number of connectors, analytics rules, workbooks, playbooks
  - Direct link to GitHub source
- **Export** a deployment plan as Markdown

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

Connector data is sourced from the [Azure Sentinel GitHub](https://github.com/Azure/Azure-Sentinel/tree/master/Solutions). The `data/solutions.json` file contains a curated catalog of common solutions with their content counts.

## Project Structure

```
value-pack-setup/
├── index.html          # Main application
├── css/
│   └── style.css       # Dark theme styling
├── js/
│   └── app.js          # Wizard logic & NLP matching
├── data/
│   └── solutions.json  # Connector catalog
├── img/                # (future) Local icons
└── README.md
```

## Future Enhancements

- [ ] Live GitHub API integration for real-time connector counts
- [ ] Step 5: Threat Intelligence setup
- [ ] Step 6: Playbook deployment automation
- [ ] ARM/Bicep template generation
- [ ] Integration with Sentinel API for one-click deployment
