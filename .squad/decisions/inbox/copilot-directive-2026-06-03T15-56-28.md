### 2026-06-03T15:56:28: User directive
**By:** madesous (via Copilot)
**What:** First-party Microsoft connectors (M365, Entra ID, etc.) do NOT require additional sizing/detail fields (tenant count, user count, etc.). Only connectors that rely on AMA (Azure Monitor Agent) need sizing inputs. Connectors using intermediaries like Cribl also need detail fields. The correct approach is: first classify all connectors by ingestion method (first-party API vs AMA vs intermediary), THEN only add detail fields to AMA/intermediary ones.
**Why:** User correction — Deckard's prior research incorrectly included first-party connectors in the "needs sizing" list.
