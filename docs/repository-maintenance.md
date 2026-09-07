# Repository maintenance and cleanup

[Documentation index](README.md) · [Contribution checks](../CONTRIBUTING.md#choose-the-right-checks)

## Measure the right thing

Tracked checkout bytes, deployed artifact bytes, Git history, and local worktree/cache bytes are different budgets. .gitignore prevents future accidental additions; it neither untracks existing files nor shrinks history. Moving a large original into another directory in the same repository saves no storage.

The v16.0.3 footprint audit identified a focused removal set: 15 retired BoH images, nine obsolete visual baselines, and js/loader-game.js. Together these remove 25 tracked files / 3.80 MiB of raw content; the media account for 2.26 MiB previously copied into dist. No active runtime behavior is intentionally changed.

## Before deleting

1. Enumerate exact paths and sizes on the current production baseline.
2. Search runtime, build, test, documentation, and data references.
3. Check dynamic URL construction, template loading, directory-copy rules, and generated snapshot names.
4. Classify candidates as removable, needing verification, or required evidence/source.
5. Remove one category at a time, build and test affected consumers, then record actual deltas.

Do not blanket-ignore images, JSON, documentation, or snapshots. Map tiles, materials, title icons, and other assets are loaded through computed paths. The X12 screenshot directory named backup is still consumed by rebuild scripts.

## Source-only originals

scripts/post-build.mjs explicitly excludes selected originals from deployment. Some still feed preparation scripts. Before untracking them, create a versioned archive with checksums, document retrieval, update generators, and reproduce the derived output. Keep provenance and ownership credits. Moving sources off-repo is a separate decision from removing retired UI media.

## Worktrees and local output

Use git worktree list to inventory checkouts and inspect each one's status. A clean checkout may still contain unique commits; a squash-merged branch may not be an ancestor of production. Preserve dirty work, untracked evidence, and branch history. Use Git's worktree management rather than deleting checkout directories blindly.

Ignored work/, previews/, PDF extracts, and local tool folders can contain valuable unfinished research. Review them separately from reproducible node_modules, build artifacts, and caches. Validate resolved paths before any recursive filesystem operation.

## Documentation hygiene

Keep current instructions in the README, contributor/operations guides, and AGENTS.md. Preserve dated plans and source transcriptions with explicit status notes rather than rewriting history as if it were current implementation. The [documentation index](README.md) classifies every Markdown file. Update links, scripts, feature names, and claims when their implementation changes.

## Completion evidence

A cleanup PR should name what was removed, why consumers do not need it, tracked/deployed byte deltas, and relevant tests. No history rewrite or cache deletion should be implied by a normal source cleanup. Git history reduction requires separate coordination and verification.
