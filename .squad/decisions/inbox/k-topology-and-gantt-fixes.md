# K — topology and gantt fixes

## Decisions

1. **Syslog/CEF shared DCRs now anchor to the collector VM, not the source column.**
   - The collector node was already being created, but the shared Syslog/CEF DCR stack was still centered on the source row.
   - That made the collector-to-downstream wiring route back toward the source lane instead of reading as a collector hop.
   - I changed the shared DCR anchor for standard Syslog/CEF flows to use the collector VM center and rendered the collector hop with dashed edges.

2. **Connector last-log badges now use the freshest timestamp from both Usage data and connector metadata.**
   - The Usage query was running, but API-backed connectors could still miss `_lastLog` because table-derived connector rows were being suppressed once an API connector already covered that product.
   - I now enrich API connectors with last-log timestamps from their mapped data types and any reported `lastDataReceivedDataTypes`, then keep the freshest solution-level timestamp.
   - Topology is explicitly re-rendered after workspace discovery completes so status badges refresh as soon as data arrives.

3. **The Gantt “tree line” complaint is most likely about dependency arrows, not a custom tree renderer.**
   - In `gantt-planner.js`, the visible chart arrows come from Frappe Gantt dependency links.
   - The long vertical runs are consistent with shared prerequisite tasks driving later connector work across groups, not with a separate bespoke hierarchy-line drawing routine. In the current plan model, `Create Windows Security Events DCR` fans out to six downstream tasks, which explains why that arrow visually continues far beyond its local group.
   - I did not change Gantt dependency rendering in this pass because the topology issues were higher priority and the Gantt behavior needs a product decision (hide/reduce cross-group arrows vs redesign dependency presentation).
