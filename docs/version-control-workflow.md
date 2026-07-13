# Version Control Workflow

This doc captures the shared branch, commit, review, and deploy procedure used across all
development for this project — whether the author is a human maintainer or an AI agent. It is
written so it can be picked up cold.

> **Why this matters:** The live site is served from `gh-pages` (deployed via GitHub Pages).
> Repository owners must configure branch protection in GitHub; repository files cannot enforce
> those settings on their own. Every change follows the same branch-PR-review-merge cycle to keep
> the production branch stable and auditable.

---

## 1. Required workflow (every change)

Every change must follow these steps in order:

1. **Fetch the latest `origin/gh-pages`** and branch off it.

2. **Use a descriptive branch prefix:** `codex/` for Codex-authored branches, or a descriptive name
   for human work (e.g. `fix/share-link-validation`). Keep branch names focused — one concern per
   branch.

3. **Install dependencies:** `npm ci` (uses the lockfile; never `npm install` without a lockfile
   update).

4. **Make focused changes.** Edit only the files relevant to the change; avoid unrelated cleanup
   unless it is part of the same atomic concern.

5. **Update release metadata** for user-visible changes before final checks:
   - `package.json` version, lockfile root/package versions, app constants, public HTML footers,
     README release heading, `CHANGELOG.md`.
   - Run `npm run version:check` to verify every public version surface and the 20-patch cadence.
   - Let `npm run build` refresh service-worker and cache metadata; include intentional generated
     changes instead of hand-editing build stamps.
   - Documentation-only or policy-only PRs do not need a version bump unless the owner asks for one.

6. **Run the full local gate:** `npm run check` — version consistency, lint, format, unit tests,
   data checks, production build, size budgets, and Playwright smoke tests. Use `npm run check:fast`
   during development, but the full `check` is required before a PR.

7. **Verify user-visible releases online before committing:** run `npm run firebase:preview`. It
   reruns the complete local gate, deploys only `dist/` to an expiring Firebase Hosting channel,
   and runs the production smoke suite against the returned URL. Fix and redeploy until green, then
   record the URL and expiry in the PR. The preview uses the real `abocombo` backend; automated
   smoke initializes anonymous Auth and Analytics without intentional Firestore writes. Keep
   additional QA read-only unless production writes are explicitly in scope.
   Documentation-only/internal changes may use `npm run check` without a Firebase preview.

8. **Stage intended files only** — never secrets, generated artifacts, or unrelated cruft.
   Commit with a concise message matching the repo style (no `-n`/skip-hooks, no force-push).

9. **Push** the branch to origin.

10. **Open a pull request** into `gh-pages` from the branch. Use `.github/PULL_REQUEST_TEMPLATE.md`.
   Wait for the required `deploy-verification` status check and owner review.

11. **Let the owner merge.** Only bypass this flow for an emergency direct deploy when the owner
    explicitly asks for one.

---

## 2. Version cadence

The active release train uses 20 patch releases per minor version:

- Current pattern: `14.0.0`, `14.0.1`, ... `14.0.20`, then `14.1.0`.
- Next train continues the same way: `14.1.1`, ... `14.1.20`, then `14.2.0`.

`npm run version:check` enforces this cadence. Every public version surface must be kept in sync.

---

## 3. Required branch protection (owner-configured repository settings)

An owner must configure and periodically verify these rules for `gh-pages` in GitHub repository
settings:

- **Require a pull request** before merging.
- **Require approving reviews** before merge.
- **Require review from Code Owners** so the owner in `.github/CODEOWNERS` must approve changes.
- **Require status checks** — the `deploy-verification` check must pass before merge.
- **Do not allow bypassing** the above settings.

When enabled, these protection rules are enforced server-side. The CI and deploy workflows
(`.github/workflows/ci.yml`, `.github/workflows/deploy.yml`) act as a safety net, not a substitute
for branch protection.

---

## 4. External deploys

GitHub Pages deploys the static app only. Deploy these separately when their files or contracts
change:

- **Firebase Hosting preview:** `npm run firebase:preview` uses `firebase.preview.json` and a
  version-derived temporary channel. It is a prerelease test and never replaces the `gh-pages` PR.
- **Cloudflare Worker:** `workers/qwen-cors-proxy.js` or `wrangler.jsonc`.
- **Firebase rules/config:** `firestore.rules`, Firebase indexes, Firebase Functions, or
  Firebase/App Check configuration.

---

## 5. File map

| Concern | Location |
|---|---|
| Workflow instructions (this doc) | `docs/version-control-workflow.md` |
| PR template | `.github/PULL_REQUEST_TEMPLATE.md` |
| CI pipeline | `.github/workflows/ci.yml` |
| Deploy pipeline | `.github/workflows/deploy.yml` |
| Version consistency check | `scripts/check-version-consistency.mjs` |
| Size budget enforcement | `scripts/check-size.mjs` |
| Deploy verification contract | `scripts/verify-deploy.mjs` |
| Firebase preview config | `firebase.preview.json` |
| Firebase preview deploy and remote QA | `scripts/deploy-firebase-preview.mjs` |
| Production smoke tests | `tests/production-smoke.spec.js` |
