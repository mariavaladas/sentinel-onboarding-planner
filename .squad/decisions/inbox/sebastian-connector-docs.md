# Sebastian — connector reference documentation pattern

- **Date:** 2026-05-20T11:08:20.769+02:00
- **By:** Sebastian (Data Engineer)
- **Status:** Proposed for merge

## What changed
Added a new `docs/connectors/` reference set for complex onboarding paths and seeded it with three customer-facing guides:

1. `ama-setup-guide.md`
2. `syslog-forwarding-guide.md`
3. `azure-monitor-pipeline-guide.md`

## Why
The planner can recommend high-value connectors, but customers still need clear implementation references for infrastructure-heavy patterns such as AMA, Syslog forwarding, and pipeline-based ingestion. Splitting the content by architecture keeps the catalog and future onboarding metadata simpler.

## Implementation notes
- The AMA guide is the base pattern for agent + DCR + workspace setup.
- The Syslog guide extends the AMA pattern for Linux forwarders and appliance-style sources.
- The pipeline guide is positioned as the scale / transformation / resiliency path once direct AMA or single forwarders become limiting.
- Cross-links were added so future connector docs can reuse the same base-vs-extension structure.
