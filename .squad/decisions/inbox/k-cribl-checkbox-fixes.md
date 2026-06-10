# K decision: Cribl checkbox fixes

- Default Cribl ingestion to checked only when the saved seed never explicitly stored `criblIngestion`; this preserves deliberate opt-outs while treating older drafts as pre-Cribl data.
- Reused the existing final `renderDraftState(draft)` call as the initial Cribl UI sync, because it already runs after the grid and Windows relation fieldset are created and now applies the disabled styling safely.
