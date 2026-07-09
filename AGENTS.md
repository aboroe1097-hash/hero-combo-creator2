# Agent Instructions

This repo deploys the live site from the `gh-pages` branch. Treat `gh-pages` as production.

## Required Workflow

- Do not commit directly to `gh-pages`.
- Do not push directly to `gh-pages`.
- Start every change from the latest `origin/gh-pages` on a separate branch.
- Use the `codex/` branch prefix for Codex-authored branches unless the user asks for another name.
- Open a pull request back into `gh-pages` after checks pass.
- Let the owner review and merge the PR. Only bypass this flow when the user explicitly asks for an emergency direct deploy.

Recommended sequence:

```bash
git fetch origin
git switch -c codex/short-description origin/gh-pages
# make focused changes
npm run check:fast
git add <intended files>
git commit -m "Short description"
git push -u origin codex/short-description
gh pr create --base gh-pages --head codex/short-description
```

Run broader checks such as `npm run check`, `npm run build`, `npm run size:check`, and `npm run smoke` when the change touches runtime behavior, build/deploy, CSS/layout, service workers, Firebase, Cloudflare Worker code, or user-visible pages.

## Version Cadence

The active release train uses 20 patch releases per minor version.

- Current pattern: `13.1.0`, `13.1.1`, ... `13.1.20`, then `13.2.0`.
- Next train continues the same way: `13.2.1`, ... `13.2.20`, then `13.3.0`.
- For release PRs, update every version location in the checklist below.
- Documentation-only policy PRs do not need to bump the app version unless the owner explicitly asks for a release bump.

## App Version Bump Checklist

When a PR changes the public app version, update these source files together:

| File | What to update | Why |
|---|---|---|
| `package.json` | Top-level `"version"` | Package/release metadata |
| `CHANGELOG.md` | New top entry `## X.Y.Z - YYYY-MM-DD` | What's New reads the changelog for the current app version |
| `README.md` | Title version and Release Checks current-version sentence | Public repo documentation |
| `js/state.js` | `APP_VERSION` export | Main app version, beta note, and What's New banner |
| `js/admin-page.js` | `APP_VERSION` constant | Standalone admin page version text |
| `js/eden-x1.js` | `APP_VERSION` constant | Eden X1 page version ribbon/text |
| `index.html` | Footer literal `vX.Y.Z` | Main page footer |
| `admin.html` | Footer literal `vX.Y.Z` | Admin page footer |
| `eden-x1.html` | Footer literal `vX.Y.Z` | Eden X1 page footer |

Then run the normal build metadata flow. `npm run build` runs `scripts/update-build-metadata.mjs`, which refreshes timestamp cache-busters such as `?v=...` in HTML/JS and `CACHE_VERSION` plus `APP_SHELL` entries in `public/sw.js`. Those build metadata values are deploy timestamps, not semantic app versions; do not hand-edit them as `X.Y.Z`.

Do not change these for a version-only release unless their text or contract actually changes:

- `js/i18n/*.js` `betaNote` and `edenX1BetaNote` strings use `{version}` placeholders.
- `js/app-whats-new.js` receives `APP_VERSION`; it should not contain the literal release number.
- `package-lock.json` currently does not carry the root app version; do not force a lockfile change for version-only bumps.
- Internal schema/storage versions, Firebase SDK versions, CI Node versions, Dependabot config versions, asset query strings, and historical changelog entries are not app release labels.

Before opening a release PR, search for the old version and confirm only historical changelog entries remain:

```bash
rg -n "<old-version>|APP_VERSION|&middot; v|Hero Combo Creator - VTS 1097" package.json README.md CHANGELOG.md index.html admin.html eden-x1.html js
```

## External Deploys

GitHub Pages deploys the static app only. Deploy Cloudflare Workers or Firebase separately only when their files or contracts change:

- Cloudflare Worker: `workers/qwen-cors-proxy.js` or `wrangler.jsonc`.
- Firebase rules/config: `firestore.rules`, Firebase indexes, Firebase Functions, or Firebase/App Check configuration.
