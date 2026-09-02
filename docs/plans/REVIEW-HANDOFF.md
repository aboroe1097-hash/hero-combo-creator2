# 16.0.0 Overhaul — review handoff (5.6 SOL + Opus 5.0)

Cut 2026-09-02 by the T0 orchestrator (ZCode session, PR #176). The planning
phase is complete: master plan rev 5 + five lane plans, all T0-blessed at rev 2.
Implementation has started (lane 5) — this review can run in parallel; findings
feed revision commits on the same branch.

## What to review

| File | Scope |
|---|---|
| `docs/plans/overhaul-16.0.0.md` (rev 5) | Master plan: release framing, §0.5 gate status (corrected), commit spine, §0.7 no-vision protocol + roster chain, Workstreams A/B, rights rules, corrections log (includes the lane-reconciliation block), open decisions D1–D5 |
| `docs/plans/lanes/overhaul-16.0.0-lane1-gate-theme.md` (rev 2) | Token authority + override retirement, budget invariant (§0.3), 768px, tap targets, tests |
| `docs/plans/lanes/overhaul-16.0.0-lane2-seasons-roster.md` (rev 2) | Season scaffolding re-apply, 6-step roster chain incl. dual firestore.rules caps, staged 9-free split, X12 tech-db import |
| `docs/plans/lanes/overhaul-16.0.0-lane3-codex-data.md` (rev 2) | 13-dataset layout + schemas, payload pipeline, provenance render-gate, alias/quarantine, positional-relation transform (§3.6) |
| `docs/plans/lanes/overhaul-16.0.0-lane4-hero-ui.md` (rev 2) | Atlas Codex mode (three tables), drawer 1–8 skills (payload-only rule), field-data panel, per-surface locale sets |
| `docs/plans/lanes/overhaul-16.0.0-lane5-planners-release.md` (rev 2) | Research planner, preset engine, stamina/castle, export+branding kit, release-metadata runbook |

Supporting sources (read-only context): `docs/sources/x10-x12/` (roster,
skills, X12 research + provenance; correction banner included).

## Review priorities (highest value first)

1. **Cross-lane contracts** (master plan corrections log, last block):
   `requirements/requirementGroups` format, `access` enum, i18n key ownership
   split, file-count ledger, sequencing pins. Are they complete and consistent?
2. **Lane 2's roster chain** — the riskiest change in the release: dual rules
   caps (`firestore.rules:1053` `values.size() <= 78` AND `:2189`
   `stats.usableHeroNames.size() <= 78`), deepEqual order sensitivity, the
   1000-expression budget, single post-merge deploy at 89. Anything that can
   403 BoH signup or fail CI that the plan misses?
3. **Budget invariants** — lane 1 §0.3 vs every other lane's additions
   (eden-x2 desktop 0.0 kB headroom; battle-sim 59/59; zero eager bytes).
4. **Lane 3 data ethics** — facts-vs-compilations handling of the 36-tree
   third-party dataset, credit blocks, quarantine design, pending datasets.
5. **Lane 5 release runbook** — completeness of the version:check surface
   table and the gate/preview/rules-deploy ordering.
6. **Anything stale** — claims that describe the old vite8 worktree rather
   than gh-pages at `beafd73a` (the §0.5 lesson: three prior documents carried
   stale-tree numbers).

## Known open items (not defects)

- D2 owner inputs: placement/minCopies, ImgBB portrait list, 7 badge
  confirmations. D5: Al-Hawra/Achilles tower profiles. D4: DonPablone contact.
- Lane 5 O2 (tech-db vs codex payload double-maintenance) and O4 (D4 gating).
- X12 Charge prerequisite gap (0/30 relations in source data) ships flagged.

## Output format

Findings as: file · line/section · severity (blocking / should-fix / nit) ·
one-line rationale · suggested fix. T0 (ZCode session) arbitrates and lands
revision commits; nothing is applied to code directly from review.
