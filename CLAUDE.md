# CLAUDE.md — repository working notes

[AGENTS.md](AGENTS.md) is the authoritative workflow and version policy. These notes supplement it; historical plans or tool-specific instructions do not override the current user request or production safeguards.

## Establish context

Read the [documentation index](docs/README.md), inspect the branch/status, and start from latest origin/gh-pages in an isolated branch/worktree. Preserve work owned by other sessions. Use Node 20 for the frontend, the lockfile via npm ci, and the separate Node 22 package for Functions.

## Delegation

Use the owner's configured workers only when available and appropriate. Give each worker an explicit worktree, bounded file ownership, exact acceptance checks, and instructions to preserve others' edits. Verify the diff and test output yourself; a worker summary is not evidence that files changed. Local delegate scripts, model names, costs, and fallback chains are environment-specific and are not guaranteed by this repository.

## Localization

The core registry has 13 locales; hr is intentionally partial. Feature domains define their own required pack set. Derive missing keys from the actual checker, preserve every interpolation token, and avoid rewriting unrelated flat catalogs with a blanket formatter.

## Verification and generated output

Follow AGENTS.md's fast-fix versus high-risk checks. Use npm run version:check for version locations. npm run build regenerates stamps/payloads and post-build updates the deployment service-worker manifest. Inspect generated diffs and include intentional changes; do not hand-edit cache timestamps. Check size budgets on the locked toolchain.

## Data and documentation

Preserve raw source values, credits, and ambiguity notes. Mark archived plans as historical rather than treating their checkboxes as current tasks. Never rewrite a sent message, grant approval through a documentation edit, or promote private operational material into public Velo knowledge.

## Delivery

Open a PR into gh-pages and leave normal merging to the owner. Explicit fast-merge uses the same protected PR path. Never publish credentials, private member records, debug tokens, or unrelated scratch output.
