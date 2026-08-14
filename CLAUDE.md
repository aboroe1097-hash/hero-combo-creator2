# CLAUDE.md — rules for AI agents working on this repo

`AGENTS.md` is the single authoritative workflow and versioning policy for every
human and coding agent in this repository. Read and follow it before making a
change. This file contains only Claude-oriented reminders that supplement it;
if the two files ever disagree, `AGENTS.md` wins.

## Delegating work in this repo

DeepSeek is the owner's only worker and has effectively unlimited tokens. Hand it
bulk mechanical work without asking first — i18n key fills, repetitive renames,
test scaffolding, docs. Keep design, architecture and judgement calls yourself.

```bash
bash ~/.claude/scripts/delegate.sh mid -R "why" -C "<abs repo dir>" "<prompt>"
```

Three rules, learned the hard way here: **one file per call** (a work order spanning
many files returns with nothing done), **inline the exact list** the worker must act
on rather than making it search, and **quick-check the diff yourself** before
reporting — `delegate.sh summary` showing ok with no diff means it never edited.

Repo-specific gotchas for delegated work:

- Always pass `-C` with the absolute worktree path. Without it a worker will edit
  the main checkout at `D:\Project\hero-combo-creator2` instead.
- `js/i18n/*.js` must keep every `{placeholder}` token identical to `en.js`;
  `js/i18n/specialization-towers-v2/*.js` is under a strict 12-locale key-parity
  test. Tell workers explicitly which of the two they may touch.
- `js/i18n/hr.js` is an intentionally partial stub — never "fix" its missing keys.

Full protocol: `~/.claude/ORCHESTRATION.md` §0.

## Workflow reminder

Use a separate branch from the latest `origin/gh-pages`, run the full gate,
open a pull request into `gh-pages`, and leave the merge to the owner. Run
`npm run version:check` instead of maintaining a second list of version files here.

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

- Passwords, private API keys, or private alliance data — in code, commits,
  or PR descriptions.
- AI attribution footers or session links in PR titles/descriptions
  ("Generated with…", session URLs). The owner prefers clean PR bodies.

See `AGENTS.md` for the complete branch, release, review, and external-deploy policy.
