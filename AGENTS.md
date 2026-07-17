# Agent Instructions

This repo deploys the live site from the `gh-pages` branch. Treat `gh-pages` as production.

## Required Workflow

- Do not commit directly to `gh-pages`.
- Do not push directly to `gh-pages`.
- Start every change from the latest `origin/gh-pages` on a separate branch.
- Use the `codex/` branch prefix for Codex-authored branches unless the user asks for another name.
- Update the release version and `CHANGELOG.md` for user-visible changes before the final checks.
- Run `npm run check` before opening a pull request back into `gh-pages`.
- For normal additive release PRs, proceed from a green `npm run check` directly to commit, push,
  and PR.
- Run `npm run firebase:preview` only for a major version upgrade, broad overhaul, or change that
  explicitly needs Firebase Hosting validation.
- Wait for the required `deploy-verification` check and owner review before merge.
- Let the owner merge the PR. Only bypass this flow when the user explicitly asks for an emergency direct deploy.

Recommended sequence:

```bash
git fetch origin
git switch -c codex/short-description origin/gh-pages
npm ci
# make focused changes and update release metadata when required
npm run version:check
npm run check
git add <intended files>
git commit -m "Short description"
git push -u origin codex/short-description
gh pr create --base gh-pages --head codex/short-description
```

`npm run check` is the full local gate: version consistency, lint/format, unit and data checks, production build, size budgets, and Playwright smoke tests. `npm run check:fast` is useful during development but is not sufficient for a PR. CI and the production deploy both call `npm run verify:deploy`; CI supplies deterministic non-secret build values while production supplies repository environment values.

`npm run firebase:preview` is an optional high-risk release gate for major version upgrades, broad
overhauls, or changes that explicitly need Firebase Hosting validation. When used, it includes
`npm run check`, deploys only `dist/` through `firebase.preview.json`, and performs remote smoke
testing. The temporary preview is public and uses the real `abocombo` backend. Automated smoke
initializes anonymous Auth and Analytics but performs no intentional Firestore writes; keep
additional QA read-only unless production writes are in scope. Firebase preview success is
prerelease evidence only. Production still ships through the reviewed `gh-pages` pull request.

Repository protection for `gh-pages` should require a pull request, owner approval, and the `deploy-verification` status check. Workflows are a safety net, not a substitute for branch protection.

## Version Cadence

The active release train uses 20 patch releases per minor version.

- Current pattern: `14.0.0`, `14.0.1`, ... `14.0.20`, then `14.1.0`.
- Next train continues the same way: `14.1.1`, ... `14.1.20`, then `14.2.0`.
- For release PRs, update `package.json`, the lockfile root/package versions, app constants, public HTML footers, the README release heading, and `CHANGELOG.md`.
- Run `npm run version:check` to verify every public version surface and the 20-patch cadence.
- Let `npm run build` refresh service-worker and cache metadata; include intentional generated changes instead of hand-editing build stamps.
- Documentation-only policy PRs do not need to bump the app version unless the owner explicitly asks for a release bump.

## External Deploys

GitHub Pages deploys the static app only. Deploy Cloudflare Workers or Firebase separately only when their files or contracts change:

- Cloudflare Worker: `workers/qwen-cors-proxy.js` or `wrangler.jsonc`.
- Firebase rules/config: `firestore.rules`, Firebase indexes, Firebase Functions, or Firebase/App Check configuration.
