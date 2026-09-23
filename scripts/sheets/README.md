# Reference sheets

Embedded, printable reference sheets for every player-facing tool, generated from the
toolkit's own canonical data and served from Downloads. Design and requirements live in
the owner's plan; this file is the operational guide.

## Commands

```bash
npm run sheets:build                      # whole catalogue into dist/downloads
npm run sheets:build -- --only <sheet-id> [<sheet-id> …]
npm run sheets:watch                      # debounced preview into tmp/sheets-watch
node scripts/sheets/build.mjs --out tmp/sheets-pilot    # write somewhere else
node scripts/sheets/build.mjs --force                   # ignore the artifact cache
node scripts/sheets/build.mjs --no-png                  # PDFs only (fast iteration)
node scripts/sheets/build.mjs --json tmp/sheets.json    # machine-readable report
```

A selected build also rebuilds the bundles that contain the selected sheets, keeps every
catalogue entry it did not touch, and can never publish a file it did not finish: sheets
render into `dist/downloads/.staging`, validate, and only then move into place and update
`downloads.json`.

Requires Chromium (`npx playwright install --with-deps chromium`, already part of the
repository's checks). A missing browser fails with that instruction instead of a stack
trace. Node 20 is what CI and the deploy use.

## Flow

```
canonical data -> adapter -> template -> PDF/PNG -> validation -> catalogue -> tool menu + Downloads
```

- **Adapter** (`scripts/sheets/adapters/*.mjs`) selects and groups canonical data and calls
  the toolkit's own calculation functions. It decides what is on which page.
- **Template** (`scripts/sheets/lib/templates/`) decides how a page looks. Four shared
  templates: `progression`, `comparison`, `catalogue`, `map`. All four render one block
  vocabulary (`lib/templates/blocks.mjs`), so a new sheet never invents a new visual.
- **Page frame** (`lib/document.mjs`) makes one A4 page block per printed page. That is
  what keeps the PDF and the 300 DPI PNG identical: the PDF pages the blocks, and the PNG
  is a screenshot of one block scaled to exactly 2480x3508 (landscape reversed).
- **Registry** (`registry.mjs`) is the only place a sheet id, ordering, template,
  orientation, source revision or adapter is declared. Everything downstream reads it.

## Adding a sheet

1. Add the tool to `TOOLS` if it is new, and the sheet to `SHEETS` with a stable `id`,
   `toolId`, `title`, `category`, `template`, `orientation`, `order`, `adapter`,
   `sourceLabel`, `sourceRevision`, and `sources` (the canonical files the sheet reads —
   these are what the cache hashes).
2. Write the adapter export named by `adapter` (`module#exportName` under
   `scripts/sheets/adapters/`). Return `{ pages: [{ title?, eyebrow?, blocks: [...] }] }`.
   Mark unknown values `{ unknown: true }` — never `0`. Prefer a labelled continuation
   page over dropping rows or shrinking text.
3. `npm run sheets:build -- --only <sheet-id>` and fix whatever the validator reports.
   Overflow, page count, PNG size, art budget and the 10pt content minimum are all
   enforced; the build fails rather than publishing a page that clips its own content.

Useful budgets for planning a page (A4 portrait, measured on the current frame): body
height about 195mm; a `table` row about 7mm; a `stats` row about 18mm; a `callout` about
18mm; a `summary` card about 55mm; a card in a 2-column grid about 45mm when the page sets
`dense: true`. The validator is the source of truth — it measures the real layout.

## Cache

`.cache/sheets/<sheet-id>/<hash>/`, outside `dist/` because Vite clears `dist` every
build. The hash covers the whole sheet toolchain (so a template, theme or frame change
invalidates every sheet), the sheet's declared `sources`, the export branding and the app
version, and a renderer version constant. Restored outputs are copied into staging, so a
cached rebuild and a fresh one produce the same catalogue. Reproducibility means
equivalent content and layout, excluding timestamps and PDF metadata.

## Catalogue

`dist/downloads/downloads.json` keeps its existing `exports` array untouched and gains:

- `sheets[]` — one entry per sheet: id, title, category, tool id/label/url, template,
  orientation, order, language, page count, source label and revision, `pdfUrl`,
  `pngs[]` and `thumbnails[]` with sizes, and `files[]` for existence checks.
- `bundles[]` — same-orientation combinations of sheets, with a contents page that lists
  their constituents. The 14 community exports that predate this system are listed in
  `legacyExportIds` and keep their ids, filenames and URLs.

The embedded "Reference sheets" menu and the Downloads page read this one catalogue.

## What is deliberate

- **English sheets.** The sheet language is printed in every footer and carried in the
  catalogue; the embedded controls use the site's own locale system.
- **Local assets only.** Fonts are system faces and every icon or illustration is inline
  SVG, so generation makes no network request and PDFs stay selectable text.
- **Public data only.** Adapters read canonical site data through `loadSiteModule`; no
  adapter may touch a session, local player storage or a private backend record.
