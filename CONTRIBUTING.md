# Contributing

Thanks for helping keep Hero Combo Creator accurate for the community. Small, well-sourced updates are the easiest to review and ship.

## What To Send

- Hero stats, skills, season tags, troop type, placement notes, and copy requirements.
- Combo ranking corrections, counter matchups, and short reason notes.
- Skin data, including rarity, bio attributes, inheriting skill changes, preserving skill, and Hidden Power bonuses.
- Eden screenshots or coordinate corrections for structures, sector labels, terrain, and route-planning issues.
- OCR examples where the parser misreads structure names, durability, players, alliances, or attack values.
- Translation fixes for existing UI text.

## Data Evidence

When possible, include:

- Screenshot or screen recording from the current game build.
- Exact hero, structure, season, state, and event context.
- Before/after value if correcting existing data.
- The app tab where you found the issue.
- Whether the data is confirmed in-game or inferred from another community source.

Avoid sending private alliance plans, personal API keys, or player information that should not be public.

## Eden Screenshot Guidelines

- Capture the full visible map area at the highest practical resolution.
- Do not crop out sector names, coordinates, or structure labels when they are relevant.
- Prefer clean screenshots without chat overlays, notification banners, or editing marks.
- Name files with season and sector when possible, for example `eden-x12-n3-strongholds.png`.
- If reporting a coordinate issue, include the expected structure name and approximate map location.

## OCR Example Guidelines

- Include the original screenshot and the incorrect parsed output.
- Mention the expected structure name, durability, alliance, player name, and attack value.
- Note whether the image came from mobile, emulator, or a compressed chat upload.

## Shipping Flow

Every change follows the same path, regardless of whether it was authored by a person or an agent:

1. Fetch the latest `origin/gh-pages` and create a separate branch. Codex-authored branches use the `codex/` prefix by default.
2. Make a focused change and use `npm run check:fast` for quick feedback while working.
3. For a user-visible release, update every version surface and `CHANGELOG.md`, then run `npm run version:check`.
4. Run `npm run check` before committing or pushing a user-visible release.
5. For a major version upgrade, broad overhaul, or change that explicitly needs Firebase Hosting
   validation, also run `npm run firebase:preview`, fix every preview failure, and record the green
   URL in the PR evidence.
6. Open a pull request targeting `gh-pages`; never push the change directly to the production branch.
7. Wait for the required `deploy-verification` check and owner review. The owner merges only after both pass.

The repository owner should protect `gh-pages` by requiring pull requests, owner approval, and the `deploy-verification` status check.

## Local Checks

Before opening a pull request:

```bash
npm ci
npm run check
```

`npm run check` is the authoritative local gate. It covers version consistency, lint and format checks, unit/data/i18n validation, a production build, file-size budgets, and browser smoke tests. `npm run check:fast` is intentionally narrower and must not be the only pre-PR check.

CI and the GitHub Pages build both use `npm run verify:deploy`. That wrapper first validates required build configuration and injects the admin-auth hashes, then runs the same full check suite. Pull-request CI uses deterministic values marked as non-secrets; production deploys use protected repository environment values. Never copy production secrets into a branch, workflow, test, log, or pull-request description.

When required, the optional Firebase preview channel is Hosting-only and does not replace the
GitHub Pages production flow. It uses the real `abocombo` backend; automated smoke initializes
anonymous Auth and Analytics but performs no intentional Firestore writes. Keep additional preview
QA read-only unless a production write has been explicitly reviewed. See
`docs/firebase-preview-workflow.md` for the command, target, expiry, and Auth/App Check boundaries.

If the built CSS total grows intentionally, either trim CSS in the same change or update `scripts/check-size.mjs` with the measured build output and a short reason. Do this before pushing so GitHub Actions does not become the first size-budget signal.

## Pull Requests

- Keep changes focused and explain the player/community impact.
- Link related issues when one exists.
- Include screenshots for visual changes.
- Include source evidence for hero, combo, skin, OCR, research, or Eden data changes.
- Call out any skipped checks and why.
- Confirm the `deploy-verification` check passes before merge.
- Do not commit secrets, private API keys, admin credentials, or private alliance data.

## `gh-pages` Pull Request Rule

The live site is deployed from the `gh-pages` production source branch through a verified `dist/` artifact. Do not commit or push directly to it. Create a branch from the latest `origin/gh-pages`, keep the change focused, run the full check suite, and open a pull request back into `gh-pages` for owner review and merge.

Use direct `gh-pages` commits only when the owner explicitly asks for an emergency direct deploy.

## Release Notes

Every user-visible change should update `CHANGELOG.md`. Keep the version in sync across `package.json`, the lockfile, the app constants, public HTML footers, the README release heading, and the latest changelog heading. Run `npm run version:check` before the full suite. The normal build refreshes cache and service-worker timestamps; do not hand-edit those stamps.

Use SemVer-style judgment: major for broad redesigns or data model changes, minor for new features or datasets, and patch for fixes, copy, cache, or low-risk polish.

Patch releases run through `.20` before the next minor. For the current train: `14.0.0` through `14.0.20`, then `14.1.0`; `14.1.1` through `14.1.20`, then `14.2.0`.
