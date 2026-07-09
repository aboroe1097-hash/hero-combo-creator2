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

## Local Checks

Before opening a pull request:

```bash
npm install
npm run check
```

For data-only changes, still run at least:

```bash
npm run i18n:check
npm run build
```

For CSS, theme, layout, or responsive changes, run a fresh production build before committing or pushing:

```bash
npm run build
npm run size:check
```

If the built CSS total grows intentionally, either trim CSS in the same change or update `scripts/check-size.mjs` with the measured build output and a short reason. Do this before pushing so GitHub Actions does not become the first size-budget signal.

## Pull Requests

- Keep changes focused and explain the player/community impact.
- Link related issues when one exists.
- Include screenshots for visual changes.
- Include source evidence for hero, combo, skin, OCR, research, or Eden data changes.
- Call out any skipped checks and why.
- Do not commit secrets, private API keys, admin credentials, or private alliance data.

## `gh-pages` Pull Request Rule

The live site is served directly from the `gh-pages` branch, so treat `gh-pages` as production. Do not commit or push directly to it. Create a branch from the latest `origin/gh-pages`, keep the change focused, run the relevant checks, and open a pull request back into `gh-pages` for owner review and merge.

Use direct `gh-pages` commits only when the owner explicitly asks for an emergency direct deploy.

## Release Notes

Every user-visible change should update `CHANGELOG.md`. Use SemVer-style judgment: major for broad redesigns or data model changes, minor for new features or datasets, and patch for fixes, copy, cache, or low-risk polish.

Patch releases run through `.20` before the next minor. For example: `13.1.0` through `13.1.20`, then `13.2.0`; `13.2.1` through `13.2.20`, then `13.3.0`.
