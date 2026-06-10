# Ceremonies

## Design Review

- **When:** before
- **Condition:** Task touches architecture or adds new wizard steps
- **Facilitator:** Deckard
- **Participants:** K, Sebastian
- **Duration:** Quick (1 round)
- **Output:** Decision on approach, captured to decisions inbox

## Spec Clarity Check
- **When:** before
- **Condition:** New feature implementation (not bug fixes or style-only tweaks)
- **Facilitator:** Luv
- **Participants:** Spec author (Deckard or user-provided requirements)
- **Duration:** Quick (1 round)
- **Output:** Approve (spec is implementable and testable) or flag gaps (specific questions that must be answered before work starts)
- **Focus:** Edge cases, data model ambiguity, numeric handling rules, per-item vs per-group semantics, validation behavior

## Test Gate

- **When:** after
- **Condition:** Implementation work completed (code changes)
- **Facilitator:** Luv
- **Participants:** Author of the work
- **Duration:** Quick (1 round)
- **Output:** Approve or reject with specific issues
