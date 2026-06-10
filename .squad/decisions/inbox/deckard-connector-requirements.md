# Deckard decision: connector requirements classification

- Reviewed the live connector catalog in `data/solutions.json` and found **333 connector-bearing entries**, not 332. The analysis and rollout plan therefore use the live 333-entry catalog.
- Locked the sizing rule: **First-party Microsoft APIs and Diagnostic Settings do not need sizing fields**; **AMA, MMA, Syslog/CEF collectors, WEC/WEF, AMA custom logs, and Cribl/intermediary patterns do**.
- Identified **43 connectors** that need sizing/detail fields. The highest-value anchors are AI Analyst Darktrace, Azure Cloud NGFW By Palo Alto Networks, Barracuda WAF, Cisco ASA, Cisco Firepower E Streamer, Cisco SD-WAN, Common Event Format, Contrast Protect.
- Confirmed the app currently has **no `sizingInputs` / `additionalDetails` schema**. Only **10 of 43** size-needed connectors have any core structured sizing metadata, and **33** are still completely missing it.
- Prioritized implementation around reusable field packs (**Syslog/CEF, Windows AMA, WEC/WEF, AMA custom logs, Cribl**) before connector-by-connector rollout. Biggest metadata gap cluster: AI Analyst Darktrace, Azure Cloud NGFW By Palo Alto Networks, Barracuda WAF, Cisco ASA, Cisco Firepower E Streamer, Cisco SD-WAN, Contrast Protect, Cribl Stream.
- Detailed analysis written to `C:\Users\madesous\value-pack-planner\docs\connector-requirements-analysis.md`.