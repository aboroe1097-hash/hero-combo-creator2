# Versioning And Push Flow

Current app version source: `js/state.js` (`APP_VERSION`). The footer in `index.html`, cache query strings in `index.html`, and `CACHE_VERSION` in `sw.js` should move with any user-visible release.

Use this SemVer-style rhythm:

- `MAJOR` (`11.0.0`): large redesigns, broad flow changes, or data model changes that affect many tabs.
- `MINOR` (`10.1.0`): new features, new datasets, new views, or meaningful UI upgrades.
- `PATCH` (`10.1.1`): fixes, small data corrections, copy changes, cache updates, and low-risk polish.

Before each push:

1. Decide the next version based on the scope.
2. Update `APP_VERSION`, footer version, cache query strings, and service worker cache version when the live site should refresh.
3. Add a short `CHANGELOG.md` entry with the user-facing changes.
4. Run `npm run check`.
5. Commit with the version first, for example `v10.1.0: improve counter panels`.
6. Push `gh-pages` after the check passes.

For small follow-up commits in the same feature wave, use patch versions such as `10.1.1`, `10.1.2`, and keep the changelog notes short.
