# Architecture and data ownership

[Documentation index](README.md) · [Local setup](../README.md#local-setup) · [Operations](operations.md)

## Frontend boundaries

Vite builds multiple root HTML pages. js/app.js coordinates the main app; hub controllers activate feature controllers. Models perform calculations, stores handle persistence, and templates/styles render the result. This separation is established in several tools but not universal: state.js still combines shared state, computed helpers, and DOM bindings.

| Feature | Start reading |
|---|---|
| Generator/manual builder | js/app-generator.js, js/app-builder.js, js/state.js |
| Atlas and Hero Tables | js/app-hero-atlas.js, js/codex-loader.js |
| Research | js/app-research.js, js/research-planner-model.js, js/tech-db.js |
| Towers | js/specialization-towers-v2-app.js, its model/store/data modules |
| DM Materials | js/material-calculator.js, js/material-planner-model.js |
| Eden | js/eden-hub.js, js/eden-map.js, js/eden-playbook.js |
| Admin | js/admin-page.js, js/ocr-dashboard.js, js/ocr-shared.js |
| VtsScore | vtsscore.html, js/vts-score-store.js, functions/src/vts-score.js |
| Battle Simulator | js/battle-simulator-app.js and battle-simulator-* modules |

## Data sources and generated outputs

Eden source tables and database/eden-datasets.manifest.json feed scripts/eden/build-eden-datasets.py. Codex/Hero Tables sources in database/codex/ feed scripts/codex/build-codex-payload.mjs. The build emits encoded payloads loaded by the corresponding runtime decoders. Keep source provenance and generation scripts with every derived dataset.

Hero and research changes cross tool boundaries. Season availability, roster membership, paid-hero planning, schema validation, and server allowlists must agree. Preserve incomplete values and source conflicts; tests should assert those distinctions rather than replacing them with apparently precise values.

## Identity and persistence

Local state can support work before cloud availability, but a local save is not proof of a successful server write. UI status must distinguish pending, saved, and rejected operations. Profiles, roster matching, scoring, and admin roles have different authorities; do not let a display name or local flag become authorization.

Firebase SDK wrappers use dynamic package imports. Firestore rules govern browser access; server Functions and Worker handlers enforce their own authentication and authorization. Retired BoH UI does not make all all-star-boh-* service modules obsolete.

## Build and cache path

1. Validate/build source data and release metadata.
2. Vite bundles the configured HTML entries and module graph.
3. post-build copies selected static files/directories and excludes source-only originals.
4. CSS post-processing minifies the final styles.
5. Size checks measure the finished graph and require installed toolchain versions to match the lockfile.
6. Deployment publishes dist/. Its generated service-worker manifest includes public JS/CSS for offline availability, with protected All-Star chunks excluded.

Deferred UI initialization and background offline precaching are different behaviors. A feature can be lazy-loaded by navigation but fetched during service-worker installation. Preserve previous-release recovery when changing cache ownership.

## Localization and visual behavior

The core language registry exposes 13 locales, with hr intentionally partial. Dedicated domains can have their own pack registry and fallback policy. Derive coverage from each registry/checker; do not copy a historical locale count into a new feature contract. Preserve interpolation tokens, accessible labels, RTL behavior, themes, and reduced-motion handling.

CSS combines shared tokens and feature styles. A filename with few references is not sufficient proof of unused styles: dynamic classes, templates, cascade order, and embedded assets require browser verification.
