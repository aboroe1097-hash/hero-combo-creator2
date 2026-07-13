# V14 Platform Roadmap

This document is the shared technical direction for people and coding agents working on the VTS 1097 toolkit after the v14 visual overhaul.

## Decision Summary

- Do **not** rewrite the whole site in React (or another framework) during v14. The current bottlenecks are large synchronous renders, duplicated state/theme code, and loosely owned data—not the JavaScript language itself. A full rewrite would delay fixes, increase the first-load bundle, and create a long parity period.
- Move new and high-risk modules to **TypeScript incrementally**, starting with pure models and Firestore contracts. Vite already supports this without changing hosting.
- Keep static game knowledge in versioned repository datasets. Keep member-specific, collaborative, and admin state in Firestore. Keep resilient local drafts/outboxes in IndexedDB or localStorage.
- Preserve progressive enhancement: the shell and core calculators must remain usable on low-memory mobile devices and intermittent connections.

## Target Architecture

| Layer | Ownership | Direction |
|---|---|---|
| App shell and navigation | shared UI | One responsive shell controller and token set; no feature may create its own global navigation behavior |
| Feature UI | per tool | Feature-scoped styles/modules, semantic events, no global selectors unless they are design tokens |
| Pure calculation/data models | per tool | TypeScript first; deterministic functions with unit contracts |
| Local member state | browser | Versioned schemas, small durable drafts, explicit export/import, IndexedDB for larger queues |
| Shared member state | Firestore under `users/{uid}` | Per-user documents, validated sizes, timestamps, conflict-aware updates |
| Alliance/admin state | Firestore under `vts_admin` | Admin-claim writes, minimum public reads, immutable history where auditability matters |
| OCR/AI calls | Cloudflare Worker | No provider secrets in the client; bounded payloads, timeouts, retries, and redacted logs |
| Static game datasets/assets | Git + GitHub Pages artifact | Source evidence, deterministic generation, lazy feature chunks, hashed immutable output |

## Migration Stages

### 1. Stabilize v14

- Finish the visual/mobile overhaul and maintain one final release gate.
- Enforce no body-level horizontal overflow at 390, 768, 1024, and 1440 px.
- Keep third-party media user-triggered and pause expensive work while a tab is hidden.
- Add visual QA evidence for dark, light, RTL, mobile, and desktop.

### 2. Type the boundaries

- Convert planner models, share payloads, Firestore normalizers, and dataset loaders from `.js` to `.ts` one module at a time.
- Define explicit schemas for versioned local storage and Firestore documents.
- Reject unknown/oversized fields at every URL, local import, and cloud boundary.
- Keep DOM renderers in JavaScript until their models are typed and stable.

### 3. Remove synchronous hot paths

- Virtualize or incrementally render hero, Eden, leaderboard, and history lists.
- Move expensive ranking, map decoding, and export preparation to Web Workers where measurement justifies it.
- Cache derived results by dataset version and input fingerprint.
- Use one visibility scheduler so hidden tabs stop timers, animation, video, and subscriptions that are not needed.

### 4. Consolidate member data

- Introduce `users/{uid}/preferences/main` for language/theme/accessibility preferences.
- Introduce feature documents such as `users/{uid}/dmPlans/current` only when cross-device planning is requested and rules/tests ship with it.
- Keep an offline outbox for writes and expose sync/conflict state instead of silently overwriting.
- Add retention/TTL only for append-only operational data such as Admin Activity; never apply TTL to user plans or source datasets.

### 5. Re-evaluate a component runtime

Reconsider React, Preact, Lit, or another component runtime only after measurements show that repeated DOM orchestration—not data volume or synchronous computation—is the remaining maintenance/performance bottleneck. Any proposal must include:

- a route-by-route parity plan;
- measured mobile bundle and interaction budgets;
- a coexistence strategy with the current Vite app;
- no duplicate Firestore subscriptions or state stores;
- a rollback path that keeps `gh-pages` deployable.

## Performance Budgets

- Mobile is the default design target; desktop is the enhanced layout.
- Avoid work longer than one frame in input handlers. Split larger renders into scheduled batches.
- Prefer `transform` and `opacity` for motion. Respect reduced motion and data saver.
- Do not autoplay third-party video or create hidden iframes.
- Every feature must fit its measured production chunk budget; do not raise limits without recording the build evidence and reason.

## Data and Security Rules

- Public clients are untrusted. UI hiding is never authorization.
- Admin writes require the Firebase admin custom claim.
- Logs synchronize controlled message keys and primitive parameters—not OCR text, stacks, paths, tokens, or arbitrary user strings.
- Collaborative writes use revisions, fingerprints, transactions, or immutable events according to the data model.
- Firebase rules/config and Cloudflare Worker changes deploy separately from GitHub Pages and must be called out in the PR.

## Release Flow

All humans and agents follow the same path: branch from the latest `origin/gh-pages`, update release metadata for visible changes, run `npm run check`, open a PR to `gh-pages`, wait for `deploy-verification`, and let the owner review and merge. Direct production pushes are emergency-only and require explicit owner instruction.
