# Version control and release workflow

[Documentation index](README.md) · [Contributing](../CONTRIBUTING.md) · [Authoritative policy](../AGENTS.md)

## Production model

gh-pages is the production **source** branch. The deploy workflow verifies and uploads dist/. Never commit or push directly to gh-pages; the PR and required status checks remain the route to production.

## From change to pull request

1. Fetch origin; inspect status and ongoing work. Create a separate branch from latest origin/gh-pages, using codex/ for Codex work.
2. Install with npm ci. Define scope, affected consumers, and a testable outcome.
3. Make the focused change. For concurrent work, use a worktree with explicit ownership.
4. For user-visible changes, update package/lockfile versions, app constants, public version surfaces, README release heading, and CHANGELOG.md. Run npm run version:check. Documentation/internal cleanup does not automatically require a version bump.
5. Select the local gate using [Contributing](../CONTRIBUTING.md#choose-the-right-checks). Small reversible changes can use focused evidence; high-risk changes require npm run check. Run build/size checks when affected.
6. Use [Firebase preview](firebase-preview-workflow.md) only when its high-risk or explicit Hosting-validation scope applies. It uses the real backend and is not a private sandbox.
7. Review the diff and generated output. Stage intended files, commit, push the branch, and open a PR targeting gh-pages.
8. Let the owner merge normally after required checks/review. If explicitly asked to fast-merge, attempt the protected merge and use auto-merge if supported and checks are pending.

Do not bypass branch protection, rewrite a collaborator's work, or turn a small failure into an unrelated broad change. Resolve conflicts against the latest production branch and rerun checks affected by the resolution.

## Version cadence

Patch releases run through .20 before the next minor: for example, 16.0.19 → 16.0.20 → 16.1.0. A deliberate major release follows the major-release policy and full gate. The version checker is the executable authority for every public version location; this document does not duplicate its list line by line.

Build scripts regenerate cache/version stamps and data payloads. Inspect that diff and include intentional changes; never fabricate timestamps by hand.

## GitHub checks and protection

CI and production both call npm run verify:deploy. CI supplies deterministic non-secret test configuration; production supplies repository environment values. The required check is deploy-verification.

An owner must configure and periodically verify branch protection on gh-pages: require pull requests, enable Require review from Code Owners, and require deploy-verification to pass. A checked-in workflow or CODEOWNERS file does not prove branch protection is enabled; inspect repository settings when auditing enforcement.

## Separate deployments

| Changed contract | Deployment boundary |
|---|---|
| Frontend/static assets | gh-pages PR → verified Pages artifact |
| Worker code or wrangler configuration | Separate Cloudflare deployment |
| Functions code | Separate Firebase Functions deployment |
| Firestore rules/indexes | Separate Firebase deployment |
| Auth/App Check/provider settings | Explicit service configuration and verification |

Coordinate additive server changes before exposing dependent client behavior. Do not deploy backend services for documentation-only changes. Record what shipped, what remains separate, and how it was verified.

## Useful references

- [CI](../.github/workflows/ci.yml) and [Pages deployment](../.github/workflows/deploy.yml)
- [Version checker](../scripts/check-version-consistency.mjs)
- [Size checker](../scripts/check-size.mjs)
- [Deploy verification](../scripts/verify-deploy.mjs)
- [PR template](../.github/PULL_REQUEST_TEMPLATE.md)
