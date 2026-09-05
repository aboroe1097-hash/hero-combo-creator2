# Archer Specialization evidence assets

This folder contains direct, unmodified evidence screenshots supplied on 2026-07-18 and
lossless PNG crops taken from those screenshots. The crops are not redrawn, upscaled,
background-removed, or generated.

- `evidence/` preserves the full supplied screenshots with descriptive filenames.
- `icons/research/` contains the seven distinct research emblems visible in columns I-III.
- `icons/legion/` contains the three column Legion Skill emblems.
- `icons/nodes/` contains representative node emblems visible in the verified graphs.

Crop coordinates and evidence relationships live in
`js/specialization-towers-v2-archer-data.js`. A visible connection in a completed graph
is arrangement evidence only; it is not treated as proof of prerequisite direction.

## Verification workflow

1. Match a crop to its original screenshot and recorded coordinates.
2. Keep research identity, troop type, and season context attached.
3. Distinguish a visible connection from a proven unlock rule.
4. Run the existing archer-data and topology tests before changing model interpretation.

[Archer evidence tests](../../../../tests/unit/specialization-towers-v2-archer-data.test.mjs) · [Documentation index](../../../README.md)
