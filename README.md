# Hero Combo Creator - VTS 1097 (v16.0.3)

A community toolkit for **Rise of Castles: Ice & Fire**, built for VTS State 1097. Build hero combinations, inspect skills and research, plan progression and Eden activity, and manage alliance records through dedicated member and administrator tools.

**[Open the toolkit](https://roc-vts.com)** · **[Documentation](docs/README.md)** · **[Contributing](CONTRIBUTING.md)** · **[Release history](CHANGELOG.md)** · **[Report a security issue](SECURITY.md)**

## Start with your task

| I want to…                        | Open                             | What to expect                                                                  |
| --------------------------------- | -------------------------------- | ------------------------------------------------------------------------------- |
| Find combinations from my heroes  | Heroes & Combos → Generator      | Filter seasons, select heroes, generate ranked combinations, and share results  |
| Assemble a particular lineup      | Heroes & Combos → Manual Builder | Choose three heroes and inspect the combination's rating and counters           |
| Compare heroes, skills, and skins | Hero Atlas / Hero Tables         | Season filters, hero details, table views, and source-qualified information     |
| Plan specialization and research  | Research & Towers                | Towers progress, hero paths, tech levels, and research cost planning            |
| Plan Dragon Master equipment      | DM Materials                     | Crafting routes, material balances, enhancement milestones, and plan sharing    |
| Prepare for Eden                  | VTS Eden                         | Royal Bounty, map planning, loyalty, playbook guidance, and previous seasons    |
| Explore battle outcomes           | Battle Simulator                 | Deterministic beta simulations with explicit stats, equipment, and evidence     |
| Play community mini-games         | Arcade                           | Separate game lobby; game code opens on demand                                  |
| Submit an event score             | VtsScore                         | Gated event intake; access and submission eligibility are server-checked        |
| Manage alliance activity          | VTS Admin                        | Account-based access to OCR, roster, contribution, match-result, and role tools |

On small screens, use **More** for secondary tools. The command palette provides another navigation path with Ctrl/Cmd+K. Account-dependent operations require the appropriate signed-in identity and permissions; opening a page alone does not grant access.

## Current scope and data limits

- X10 and X12 are represented in the hero catalog. The supported research ladder is separate from hero availability; X10 is not a research season.
- Season **Select all** fills the visible strip and restores that strip's defaults on the next press.
- The current Artifact interface covers **Sword of Judgment**. Retained Redemption Grail source data is not a promise that its former interface is available.
- X12 Charge has editable data without an invented tree topology. Unverified or conflicting research evidence remains qualified in the interface.
- Strife recommendations intentionally cover S0–S4 and X1–X2. A hero's presence in the Atlas does not imply coverage in every recommendation tool.
- Battle Simulator results are model output, not guaranteed in-game outcomes. Check stat sources and the evidence behind a comparison.
- The former All-Star BoH signup hub, team mapper, and command center are retired. Some server access, OCR, schedule, and legacy-data contracts remain in use by VtsScore; do not remove that backend merely because the old UI is gone.

For changes to hero or research facts, include the source, capture date, season scope, and verification status. Unknown costs, unlock rules, or skill values must not be guessed. See the [source package](docs/sources/x10-x12/README.md) and [data contribution guidance](CONTRIBUTING.md#data-and-evidence).

## Local setup

Use the repository's **Node 20** baseline from [.nvmrc](.nvmrc) and **Python 3.11**, matching CI. Firebase Functions have a separate **Node 22** runtime and dependency tree; see [Functions](functions/README.md).

From an existing clone:

```powershell
git fetch origin
git switch -c codex/my-change origin/gh-pages
npm ci
npm run dev
```

If that checkout contains unfinished work, create an isolated worktree instead of switching or resetting it:

```powershell
git fetch origin
git worktree add -b codex/my-change ../hero-combo-my-change origin/gh-pages
cd ../hero-combo-my-change
npm ci
npm run dev
```

Vite prints the local URL. Use its server rather than opening index.html through file://. npm ci installs the exact lockfile versions; an existing node_modules directory from another branch can produce misleading chunk graphs and size failures.

### Firebase and protected local flows

Public/static development can start without production credentials. Cloud-dependent operations need valid configuration; copied placeholder values do not enable them.

```powershell
Copy-Item .env.example .env.local
# Edit .env.local with the appropriate public web configuration.
npm run dev -- --host 127.0.0.1 --port 5174
```

Port 5174 is the project's documented local origin for protected-flow testing. Firebase Auth authorized domains, App Check registration, and the Worker origin allowlist are separate controls. Restart Vite after changing environment values. Never put service-account credentials, provider API secrets, private PINs, or App Check debug tokens in a tracked file.

The supported variable names and placeholders live in [.env.example](.env.example). See [operations and troubleshooting](docs/operations.md) for boundaries and failure diagnosis.

## Development commands

| Command               | Purpose                                                                        |
| --------------------- | ------------------------------------------------------------------------------ |
| npm run dev           | Start the development server                                                   |
| npm run version:check | Validate release surfaces and version cadence                                  |
| npm run test:unit     | Run the complete Node unit suite                                               |
| npm run check:fast    | Version, lint, formatting, unit tests, and translation checks                  |
| npm run build         | Validate/build data, refresh generated metadata, bundle, and post-process dist |
| npm run size:check    | Check a fresh build's asset budgets and installed toolchain versions           |
| npm run smoke         | Development-server browser smoke coverage                                      |
| npm run smoke:prod    | Built-artifact browser smoke coverage                                          |
| npm run check         | Full local gate, including rules check, build, size, and browser checks        |
| npm run verify:deploy | CI/deploy wrapper with required build configuration and auth injection         |
| npm run towers:test   | Focused Towers model and browser tests                                         |
| npm run velo:lab      | Start the isolated local Velo/Ollama workshop                                  |

Install Chromium once for browser checks with npx playwright install chromium. On Linux, CI uses npx playwright install --with-deps chromium. Some screenshot baselines are Windows-specific and explicitly skipped in CI; a passing CI run does not claim those snapshots were compared.

For a quick Towers loop, use npm run towers:dev, npm run towers:test:unit, and npm run towers:test:ui. For another tool, select its existing unit/browser tests. The [contribution guide](CONTRIBUTING.md#choose-the-right-checks) explains when focused checks are sufficient and when the full gate is required.

## Project map

| Location                  | Responsibility                                                                 |
| ------------------------- | ------------------------------------------------------------------------------ |
| Root HTML pages and tabs/ | Application entry points and fetched templates                                 |
| js/                       | Feature controllers, state, domain models, catalogs, storage, and translations |
| css/                      | Shared theme tokens, components, responsive styles, and feature styles         |
| assets/ and images/       | Runtime media plus explicitly retained source originals                        |
| database/                 | Canonical source tables, manifests, and evidence used by data builders         |
| scripts/                  | Build, validation, release, data import, and administrative helpers            |
| tests/                    | Unit contracts, browser scenarios, fixtures, and active visual baselines       |
| workers/                  | OCR/AI proxy and associated server components                                  |
| functions/                | Separately deployed Firebase Functions and their package lock                  |
| docs/                     | Current guides, source evidence, and clearly marked historical plans           |
| dist/                     | Generated deployment artifact; not tracked source                              |

See [architecture](docs/architecture.md) for feature ownership, data paths, and cache behavior. The documentation index lists every maintained guide and retained historical Markdown document.

## Architecture in practice

The frontend is a Vite-built collection of native JavaScript modules and HTML entry pages. Large tools and locale packs use dynamic imports. Firebase SDK modules are imported from the installed firebase package through js/firebase-sdk.js and bundled into same-origin hashed assets; they are not loaded through the old gstatic module scheme.

The build copies selected static directories and files through scripts/post-build.mjs. Its sourceOnlyDeployPaths list keeps selected original images in Git without shipping them. Do not assume every file under assets/ is deployed, or that an image without a literal filename reference is unused: several features construct paths from IDs, levels, or coordinates.

The service worker builds its cache manifest from the finished artifact. Offline precaching can fetch optional public JS/CSS after registration even though their UI is lazy-loaded. Changing this behavior needs offline and previous-version recovery tests.

## Release and deployment

**gh-pages is production source. All changes go through a pull request.** GitHub Actions validates and deploys dist/, not the raw checkout. [AGENTS.md](AGENTS.md) is the authoritative workflow policy; the [release guide](docs/version-control-workflow.md) explains the sequence.

- Small reversible changes use focused tests and check:fast when practical, plus relevant build/version/size checks.
- Major upgrades, broad application overhauls, security/auth changes, Firebase rules/schema changes, and major dependency upgrades require npm run check.
- Firebase Hosting preview is an optional high-risk gate, not a requirement for every UI fix. Its public preview uses the real backend; see the [preview guide](docs/firebase-preview-workflow.md).
- Workers, Firebase Functions, rules, and indexes deploy separately when their code or contracts change. Merging a frontend PR does not deploy them.
- User-visible changes update release metadata and CHANGELOG.md. Documentation and internal cleanup do not need an app-version bump unless requested. Patch releases run through .20 before the next minor.
- Leave normal merging to the owner. An explicit fast-merge request can use protected auto-merge; never push directly to production.

## Screenshots

These illustrations show the toolkit's main workflows; they are documentation media, not a promise of pixel-perfect parity with every release.

![Combo Generator and Hero Atlas](docs/media/toolkit-core-tools.webp)

![Specialization Towers desktop and mobile examples](docs/media/specialization-towers-responsive.webp)

Use sanitized demo data for screenshots. Keep curated documentation images in docs/media/ and regression baselines beside their tests. Root-level scratch captures, rendered PDF pages, local videos, caches, and worktrees belong outside tracked source. See [repository maintenance](docs/repository-maintenance.md).

## Community contributions and support

Bug reports should identify the page, release, language, theme, viewport, reproduction steps, and expected result. Data corrections need source evidence; suggestions should describe the player task and a concrete success condition. [CONTRIBUTING.md](CONTRIBUTING.md) includes both workflows.

Report credential, access-control, and private-data issues through [SECURITY.md](SECURITY.md), not a public issue. Operational alliance messages follow the [R5 communications guide](docs/r5-communications-guide.md) and [append-only message ledger](docs/r5-message-log.md). Keep private orders and player records out of reusable Velo knowledge.

For licensing, see [LICENSE](LICENSE). Source-specific credits and verification limits remain attached to the relevant data/evidence documents.
