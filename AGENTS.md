# Agent Instructions

This repo deploys the live site from the `gh-pages` branch. Treat `gh-pages` as production.

## Required Workflow

- Do not commit directly to `gh-pages`.
- Do not push directly to `gh-pages`.
- Start every change from the latest `origin/gh-pages` on a separate branch.
- Use the `codex/` branch prefix for Codex-authored branches unless the user asks for another name.
- Update the release version and `CHANGELOG.md` for user-visible changes before the final checks.
- Use the fast incremental-fix lane below for small fixes, edits, and add-ons. Do not delay a PR for
  the full 10-15 minute local matrix once focused evidence gives at least moderate confidence
  (roughly 50%) that the change is sound.
- Require `npm run check` before a PR only for major version upgrades, broad overhauls, security or
  authentication contract changes, Firebase rules/schema changes, major dependency upgrades, or
  other changes whose risk cannot be covered by focused tests.
- Run `npm run firebase:preview` only for a major version upgrade, broad overhaul, or change that
  explicitly needs Firebase Hosting validation.
- For normal work, let the owner merge after the required checks. When the owner explicitly asks
  Codex to fast-merge, commit, push, open the PR, and attempt the merge immediately; use auto-merge
  when branch protection still requires CI. Never push directly to `gh-pages`.
- If a fast PR or its local/CI checks fail, fix the issue in a new follow-up PR and ship that focused
  correction promptly instead of holding unrelated completed fixes indefinitely.

Recommended sequence:

```bash
git fetch origin
git switch -c codex/short-description origin/gh-pages
npm ci
# make focused changes and update release metadata when required
npm run version:check
# Small incremental fix: run focused tests and npm run check:fast when practical.
# High-risk/broad change: run npm run check.
git add <intended files>
git commit -m "Short description"
git push -u origin codex/short-description
gh pr create --base gh-pages --head codex/short-description
```

### Fast Incremental-Fix Lane

For a small, reversible fix or add-on, run the narrowest relevant unit/browser tests plus
`npm run check:fast` when practical. If bundled CSS, assets, or release metadata changed, also run
the directly relevant build, version, or size command. Once those focused checks support at least
moderate confidence, commit, push, and open the PR without waiting for the full smoke matrix. CI and
the production deploy remain broader verification layers. A failed check or merge becomes a small
follow-up PR; it is not a reason to bypass branch protection or push to production directly.

`npm run check` remains the full high-risk gate: version consistency, lint/format, unit and data
checks, production build, size budgets, and Playwright smoke tests. CI and the production deploy
both call `npm run verify:deploy`; CI supplies deterministic non-secret build values while
production supplies repository environment values.

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

- Current pattern: `16.0.0`, `16.0.1`, ... `16.0.20`, then `16.1.0`.
- Next train continues the same way: `16.1.1`, ... `16.1.20`, then `16.2.0`.
- For release PRs, update `package.json`, the lockfile root/package versions, app constants, public HTML footers, the README release heading, and `CHANGELOG.md`.
- Run `npm run version:check` to verify every public version surface and the 20-patch cadence.
- Let `npm run build` refresh service-worker and cache metadata; include intentional generated changes instead of hand-editing build stamps.
- Documentation-only policy PRs do not need to bump the app version unless the owner explicitly asks for a release bump.

## External Deploys

GitHub Pages deploys the static app only. Deploy Cloudflare Workers or Firebase separately only when their files or contracts change:

- Cloudflare Worker: `workers/qwen-cors-proxy.js` or `wrangler.jsonc`.
- Firebase rules/config: `firestore.rules`, Firebase indexes, Firebase Functions, or Firebase/App Check configuration.

## Documentation and cleanup context

Use [docs/README.md](docs/README.md) to distinguish current guides from historical plans. Dated work orders do not override this policy or authorize replaying old data edits. Preserve source provenance, approval ledgers, and unresolved evidence.

For cleanup, enumerate exact paths and verify runtime/build/test consumers, including dynamic filenames and snapshot names. Report tracked-tree and deployment savings separately from local caches and Git history. Do not force-remove dirty worktrees.

Keep setup, security, and release guidance aligned with executable scripts. The frontend baseline is Node 20; Functions use their own Node 22 package. Documentation/internal-only changes do not require an app-version bump unless requested.
