# CLAUDE.md — rules for AI agents working on this repo

These rules apply to every Claude session (and any other coding agent) in this
repository. They exist because `gh-pages` is the **live production branch**:
GitHub Actions builds and deploys roc-vts.com on every push to it.

## Workflow: PR-first, never commit to gh-pages directly

1. Start every task from the latest remote state: branch off `origin/gh-pages`
   (e.g. `claude/fix-eden-timer`). Never work directly on `gh-pages`.
2. Make changes on that branch and run checks (`npm run check:fast` for
   docs/small changes, `npm run check` before releases).
3. Push the branch and open a **pull request into `gh-pages`**.
4. The owner reviews and merges. Do not merge your own PR and do not push to
   `gh-pages` directly, even for "small" fixes — the only exception is the
   owner explicitly asking for an emergency direct deploy.

## Versioning

- Every release PR bumps the patch version: `13.1.1` → `13.1.2` → … up to
  `13.1.20`, then roll to `13.2.0` (minor bumps are the owner's call).
- Version strings live in: `package.json`, `js/state.js`, `js/eden-x1.js`,
  `js/admin-page.js` (`APP_VERSION`), the footer of `index.html`,
  `admin.html`, `eden-x1.html`, and `README.md`. Keep them all in sync and
  add a `CHANGELOG.md` entry.
- Documentation-only PRs do not bump the version.

## Build stamps and generated files

- `node scripts/update-build-metadata.mjs` regenerates the `?v=` cache-bust
  stamps in the HTML/JS and rewrites `public/sw.js` (which is a generated
  file — never edit it by hand; change the template in
  `scripts/update-build-metadata.mjs` instead). Run it when JS/CSS changed
  and commit the result.
- `scripts/post-build.mjs` rebuilds the service worker precache manifest from
  `dist/` during `npm run build`; the deploy workflow runs the full build, so
  stamps committed here just need to be internally consistent.

## Testing expectations

- `npm run check` = lint + prettier + unit tests + i18n + build + size +
  Playwright smoke. CI runs this; a PR should pass it locally first.
- User-visible strings need keys in all 11 `js/i18n/*.js` files
  (`npm run i18n:check` enforces this).
- For loading/network changes, verify the mobile failure modes: the Firebase
  CDN (gstatic) being unreachable must never leave a page on an endless
  spinner — every loading state needs a timeout and a visible error/retry.

## Never include

Passwords, private API keys, or private alliance data — in code, commits, or
PR descriptions.

See also `AGENTS.md` (shared agent policy) if present at the repo root.
