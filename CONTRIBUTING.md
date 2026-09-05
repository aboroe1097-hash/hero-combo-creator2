# Contributing

Contributions should solve a clear player or maintainer problem and be independently reviewable. Start with the [README](README.md), [documentation index](docs/README.md), and authoritative [agent/release policy](AGENTS.md).

## Before editing

1. Fetch origin and inspect your checkout status. Preserve uncommitted work.
2. Start a descriptive branch from latest origin/gh-pages; use codex/ for Codex-authored branches.
3. Use a separate worktree when another task owns the checkout.
4. Install the lockfile with npm ci. Record the affected features and an observable done-condition.

Keep the patch focused. Do not change bundle budgets to disguise stale dependencies, remove data because its name says backup, or sweep unrelated assets into a cleanup.

## Data and evidence

For hero, combo, skin, research, Artifact, or Eden changes, record the source, author/credit, capture date, season/game scope, and verification status. Separate raw evidence from derived values. Preserve unknowns and conflicts instead of inventing costs, prerequisites, or topology.

- Eden screenshots should show enough map context to identify the season, sector, structure, and relevant coordinates.
- OCR examples must be sanitized. Keep the original reading and proposed correction distinguishable; do not merge similar player names without identity evidence.
- Multi-account players may have distinct main, alt, and banner accounts. See [name grouping](docs/name-grouping-workflow.md).
- Hero additions can affect roster allowlists, paid-hero paths, consumers, and tests. They are not automatically data-only changes.
- Keep durable evidence in docs/sources/ or the established data-evidence directory. Put temporary extraction output under ignored scratch directories.

## Choose the right checks

| Change                                                                                     | Local evidence before PR                                                                      |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Small reversible fix or add-on                                                             | Relevant unit/browser cases; npm run check:fast when practical                                |
| CSS, bundled assets, or build inputs                                                       | Relevant build and npm run size:check in addition to focused checks                           |
| User-visible release metadata                                                              | npm run version:check                                                                         |
| Major upgrade, broad application overhaul, auth/security, rules/schema, major dependencies | npm run check                                                                                 |
| Explicit Firebase Hosting validation or high-risk release needing it                       | npm run firebase:preview; record its limitations                                              |
| Documentation-only or internal cleanup                                                     | Link/path/command validation and checks for affected consumers; no automatic app-version bump |

The full check includes build, size, rules, translations, and browser gates. CI and production invoke npm run verify:deploy with different configuration values. A focused local pass does not substitute for required CI or branch protection.

For browser tests, install Chromium first. Keep screenshot names aligned with the test-generated names; never regenerate a baseline merely to hide a functional regression. Some Windows baselines are explicitly excluded from Linux CI.

## Pull requests

Use the [PR template](.github/PULL_REQUEST_TEMPLATE.md). Explain the trigger/problem, resulting behavior, affected surfaces, and test evidence. Include before/after measurements for cleanup or performance work, screenshots for layout changes, and sources for data changes. State skipped checks and genuine limitations.

Stage only intended files. Review generated metadata after builds and retain intentional output changes. Do not publish secrets, private roster data, raw account records, or local credentials.

Open against gh-pages and leave the normal merge to the owner. Explicit fast-merge requests still use the PR and required checks; there is no direct-production-push exception. If CI fails, address the failure with a focused correction rather than weakening the gate.

## Release notes

User-visible changes update CHANGELOG.md and every version surface checked by npm run version:check. The cadence permits patch .0 through .20 before advancing the minor. Documentation and internal cleanup can retain the current version. Build scripts own cache stamps; do not hand-edit them.

## Reporting issues

Use the [bug template](.github/ISSUE_TEMPLATE/bug_report.md) for reproducible failures and the [feature template](.github/ISSUE_TEMPLATE/feature_request.md) for proposals. Security reports follow [SECURITY.md](SECURITY.md). A feature request should describe one useful outcome, its audience, and how success can be checked.
