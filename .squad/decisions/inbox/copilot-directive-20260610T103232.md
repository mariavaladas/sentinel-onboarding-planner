### 20260610T103232: User directive
**By:** madesous (via Copilot)
**What:** Solutions with `connectors === 0` are content packs (analytic rules, workbooks, playbooks only). They must NOT appear in the topology and must NOT have sizing. They should still appear in the solutions panel but with appropriate content-pack designation.
**Why:** User request — DNS Essentials (0 connectors, 9 rules, 1 workbook, 1 playbook) was incorrectly shown in topology with sizing badge. 156 solutions have connectors=0 and are content-only.
