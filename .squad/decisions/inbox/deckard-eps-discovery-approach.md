# Deckard — EPS discovery approach proposal

- **Date:** 2026-05-20T11:24:51.073+02:00
- **By:** Deckard (Lead)
- **Status:** Proposed for merge

## Recommendation

Adopt a new **EPS Assessment** wizard step in the planner and make it **measured-first, estimate-last**.

The planner should collect EPS in this order:

1. **Existing measured source** — legacy SIEM, firewall dashboard, or partial Azure ingestion
2. **Targeted measurement** — PowerShell on Windows / WEC, `rsyslog` or `syslog-ng` counters on Linux collectors
3. **Estimate fallback** — source-count archetypes only when no measured data exists

## Why this is the right approach

- It produces architecture decisions from **real customer data** whenever possible.
- It avoids false precision from one-size-fits-all EPS guesses.
- It supports all key planning decisions Maria called out: forwarder count, load balancer need, AMA vs Pipeline, and WEF/WEC design.

## Architecture thresholds to encode

- **<500 EPS:** single AMA forwarder or direct AMA is fine
- **500-2,000 EPS:** single dedicated forwarder with monitoring
- **2,000-5,000 EPS:** stronger dedicated forwarder or separate WEC tier
- **5,000-10,000 EPS:** multiple collectors become the default; load balancing for Syslog/CEF, multiple WECs for Windows
- **10,000+ EPS:** Azure Monitor Pipeline should be actively evaluated
- **20,000+ EPS:** Pipeline should be the default recommendation unless there is a strong exception

## Important refinement

The planner must treat **Windows-heavy** and **CEF-heavy firewall** estates more conservatively than generic Syslog:

- **Windows / WEF:** use **~5,000 EPS per collector** as the safer planning ceiling
- **Linux AMA forwarder:** use **~10,000 EPS sustained** as the planning anchor
- **Pipeline:** recommend earlier whenever the customer needs filtering, buffering, outage survival, or strong burst handling

## Output the planner should produce

For each site / collector zone, output:

- recommended pattern,
- forwarder count,
- WEC count,
- load balancer requirement,
- pipeline recommendation,
- estimated daily GB / cost band,
- confidence level (`measured`, `platform-derived`, `estimated`),
- follow-up validation action.

## Bottom line

The top approach is **not** a static threshold table by itself. It is an **interactive EPS Assessment** backed by measured data first, official Microsoft sizing anchors second, and estimates only as a visible fallback.
