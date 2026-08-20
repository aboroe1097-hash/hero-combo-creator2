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

### Parallel locale fan-out (the fast, cheap path)

Filling the same set of keys across many locales is the highest-value delegation
shape in this repo: 10 locales x 21 keys cost **$0.08 and ~4 minutes** wall clock,
with zero Claude tokens spent on the translations themselves.

1. **Get the real missing-key list from the checker, not a naive diff.** A plain
   `en` vs locale comparison over-counts badly — it flagged 103 keys for `de` when
   only 21 were genuinely missing, because German legitimately reuses "Status",
   "Admin", "Team". Use the coverage data the checker itself exports:

   ```js
   import { availableLanguages, loadTranslationsForLanguage, translationCoverage }
     from './js/translations.js';
   await Promise.all(availableLanguages.map(loadTranslationsForLanguage));
   translationCoverage.de.missingBeforeFallback; // the true list
   ```

   Usually the same keys are missing in every locale, so one prompt template covers
   all of them.

2. **Record a git baseline before delegating.** `git status --short js/i18n/` first —
   if a target file is already dirty you cannot attribute the resulting diff, and the
   worker will report "keys already exist" without editing anything.

3. **One locale per call, all launched in parallel.** Disjoint files, so there is no
   conflict and no need for worktree isolation:

   ```bash
   for code in ar id pt ru tr zh; do
     bash ~/.claude/scripts/delegate.sh mid -q -C "$REPO" -t 420 \
       -R "i18n fill $code" "$(cat prompt-$code.txt)" > out-$code.log 2>&1 &
   done
   wait
   ```

4. **Spell out the mechanical contract in the prompt**: which single file may be
   touched, insert before the final `};`, keep `{placeholder}` tokens byte-identical
   and in Latin script, keep dotted keys (`'ai.action.openLoyalty'`) quoted, two-space
   indent, single quotes, trailing commas, escape `\'`.

Acceptance check to run yourself afterwards — never trust the worker's summary:

```bash
node -e "import('./js/i18n/es.js').then(m=>console.log(Object.keys(m.default).length))"
npm run i18n:check   # target locales should vanish from the fallback report
```

Then verify placeholder parity against `en.js` for the keys you added. Expect
long values to wrap onto a continuation line — that is valid and matches file style,
so a +23 diffstat for 21 keys is fine.

**Do not run `prettier --write` on `js/i18n/*.js`.** The top-level locale files are
outside the `format:check` allowlist (which covers only `js/i18n/admin-all-star-boh/*.js`
and `js/i18n/all-star-boh/*.js`) and already fail a bare `prettier --check` at HEAD.
Formatting them rewrites hundreds of untouched lines.

Model note: `mid` is now `deepseek-v4-flash` -> `deepseek-v4-pro` only. Flash handles
roughly 4 of 5 calls first try; pro silently catches the rest at no cost when flash
succeeds. The three `opencode-go` fallbacks were removed after 133 calls with 0
successes.

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
