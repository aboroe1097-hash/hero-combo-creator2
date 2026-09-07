# X10/X12 source package (no-vision execution)

- HERO-DATA.md — owner screenshots transcribed 2026-09-02 (by the Opus session,
  pasted by the owner); roster + skills blocks parse-validated in this checkout.
- x12-research.json / x12-research-nodes.md — REGENERATED locally from
  work/roc-research-sources/roc_research_data.js (identical numbers to the Opus
  originals: Defense 29 nodes / 4,998,500 WB / gameId 20005005; Charge 30 nodes /
  4,763,500 WB / gameId 20005019). Strip the wixstatic `image` URLs on ingest.
- Execution caveats live in HERO-DATA.md §6 (firestore.rules chain, paid-hero
  tower profiles) — adding heroes is NOT a data-only edit.

## Read before importing

This is the tracked evidence package. Local work/ paths mentioned by the original transcription are historical staging locations, not prerequisites for browsing this directory. X10/X12 support has already shipped; compare against current source before applying any paste block.

- [Hero transcription](HERO-DATA.md): preserve supplied facts, ambiguity notes, and original credits.
- [Research JSON](x12-research.json) and [tables](x12-research-nodes.md): source values, with unresolved totals/topology qualified separately in the app.
- [Provenance note](IN-REPO-NOTE.md): origin and historical staging relationship.
- [Release history](../../../CHANGELOG.md): subsequent corrections and shipped scope.

A proposed update should identify exactly which fact changed, its new evidence, and every consumer affected, including server roster contracts. [Documentation index](../../README.md).
