# Velo knowledge ingestion

Velo's static guide knowledge is a curated public dataset, not a searchable copy of alliance or
admin chat. Each accepted entry must be useful without the original conversation, carry its source
date and season, and state whether current leadership confirmation is required.

## Intake rules

- Accept reusable game mechanics, local terminology, strategy rationale, and published policy.
- Rewrite chat into concise factual guidance; do not retain author names or message formatting.
- Preserve progression flow: use explicit S2/S3/S4/X1 labels and nearby chronological context to
  record both the phase being played and any later season the advice is preparing for.
- Treat dates as ordering evidence, not season evidence by themselves. If neither the message nor
  its nearby flow establishes a season, leave the phase unknown instead of guessing.
- Mark dated plans as historical and prevent Velo from presenting them as current orders.
- Exclude expired forms and links, private rosters, raw votes, voter identities, personal results,
  prize coordination, tactical deception, and target-specific war intelligence.
- Exclude claims that depend on a missing image, file, or unexplained conversation context.
- Keep live rankings, voting state, deadlines, and finalized Eden rewards in the existing Eden data
  tool instead of duplicating them in static knowledge.

The public dataset lives in `js/ai/vts-guide-knowledge.js`. Velo searches it through the bounded,
read-only `get_vts_guide_context` tool. Adding future batches should normally require dataset and
test changes, not prompt growth.

Operational Viber, in-game mail, and alliance announcement drafts belong in the separate
[`r5-message-log.md`](r5-message-log.md) ledger and follow
[`r5-communications-guide.md`](r5-communications-guide.md). They must not enter Velo's static
strategy dataset unless a later review extracts a timeless, public, non-sensitive policy or game
mechanic under the intake rules above.

## Chronology and season context

The message flow is part of the evidence. Preserve the original chronological order while curating,
even when batches are supplied newest-to-oldest.

- `sourceDate` records when the message was posted; `season` records the game era the advice targets.
  They are not interchangeable.
- Explicit headings and tags such as `#S2`, `S3`, `Pre-S4`, or `RoC S4` are the strongest season
  signal. `Pre-S4` guidance is stored under S4 because it prepares the player for that era.
- A photo immediately before or after a labeled guide message inherits that guide block's season and
  topic context. The association may be recorded, but missing visual content must never be guessed.
- An untagged continuation may inherit the most recent unambiguous season only while it is clearly
  part of the same guide block. A new heading, conflicting season mention, unrelated announcement,
  or substantial break resets that context.
- When a guide is written during one season but explicitly discusses a later meta, classify it by the
  target season and retain the publication date so Velo can explain that it was advance planning.
- If the flow supports several seasons, choose the primary target and state the spillover in the
  summary. If the target remains ambiguous, mark it unknown or exclude the claim instead of forcing
  a season.
- Newer guidance wins only within the same topic and target era. A newer S4 guide does not silently
  replace an older S2-specific mechanic.

## Batch ledger

### 2026-07-14 / VTS Guides, messages dated 2025-11-02 to 2026-01-25

Accepted as dated Pre-S4 guidance:

- Green Gem milestone saving and Hi-Tech Era push planning;
- C28 consolidation versus a time-bounded C30 and Institute 30 path;
- selective Fundamental and Advanced Research targets, with dated cost examples;
- Dragon Master readiness, mixed-troop preparation, one-set focus, Purple crafting, and listed
  enhancement totals;
- the Blue Hero skill-and-split method for historical Heroes Day chest progress.

Excluded:

- photo placeholders and any formation, tower path, or node path visible only in a missing image;
- Viber support requests, channel invitations, and other expired operational links;
- National Quest coordination and launch announcements that were not reusable strategy guidance;
- the class-level spreadsheet because its contents were not included in the supplied text.

### 2026-07-14 / VTS Guides and admin chat, messages dated 2026-01-30 to 2026-07-09

Accepted as dated X1 guidance:

- reward priority, one-reward-per-player flow, and recognized support-work categories;
- Blue, Green, and optional Red roles in a structure-fight specialization plan;
- the local `SS: N` / Stop Stamina marker convention;
- daily Wonder reward discipline and coordinated bulk-use rationale;
- coordinated crystal use around the Statue of General HP benefit;
- general backup-pad, shield-wall, and live-call readiness.

Excluded:

- registration and voting forms, deadlines, and expired scheduling notices;
- player names, growth statistics, winners, prizes, and reward coordination;
- private/admin operational assignments and unpublished voting detail;
- East/West targets, fake-out plans, and other target-specific war intelligence;
- the missing level-16 guide file, screenshots, and context-free Immortal mission note.

### 2026-07-14 / VTS Guides, messages dated 2025-07-01 to 2025-07-16

Accepted as dated S1/S2 guidance:

- combat-first Dragon Labyrinth talent allocation, with the missing talent paths left unnamed;
- the Decor active-structure cap mechanic;
- diversified long-term Labyrinth roster planning without reconstructing photo-only formations;
- the historical Day-1 Blue-tree reset sequence and RoC S2 building/demolition targets;
- equal Workshop progression, Coalition Basecamp Loyalty, and productive resource-tile selection.

Excluded:

- farm results and all photo-only claims without enough text context;
- All-Star BoH forms, registration teams, schedules, leadership assignments, and expired event rules;
- the photo-only All-Star formation list and AC1 layout;
- personal RoC results, current-war timing, and the external comprehensive guide whose contents were
  not supplied.

### 2026-07-14 / VTS Guides and admin chat, messages dated 2025-06-17 to 2025-07-01

Accepted as dated S1/S2 guidance:

- a monster-XP formation pattern using two leveling heroes, an unidentified Blue XP support hero,
  level 15 monsters, and Gathering Equipment;
- the general principle and historical daily-income example for saving Red Super Tickets before a
  deliberately selected seasonal recruitment pool.

Excluded:

- personal Research percentages and the author's personal T9 Archer decision;
- the identity of the Blue XP support hero because it appeared only in a missing photo;
- the expired power competition, its extension, prizes, dates, and ranking rules;
- Dragon tier and Star Talent costs because every estimate was contained in missing photos;
- farm-event instructions because the event, purchasable items, and essential steps were shown only
  in missing photos;
- author names and personal farm results.

### 2026-07-14 / Product request dated 2026-07-14

Not added to static guide knowledge because the message asks for a feature and supplies no material
or loyalty values to verify.

Existing coverage:

- the Loyalty Calculator already contains Alliance Center 1-4 upgrade costs and T1-T16 loyalty
  thresholds;
- Velo's `calculate_eden_loyalty` tool already returns current loyalty, extraction-site access,
  poison thresholds, and an upgrade sequence when the required production inputs are supplied.

Tracked product gap:

- a direct material-only Alliance Center cost lookup without production and processing inputs would
  require a deliberate calculator/tool-contract enhancement; it must use the canonical calculator
  table rather than chat-derived values.

## Validation for future batches

Keep the dated intake history above intact. For each new batch, list accepted public facts, exclusions, ambiguous source gaps, and season context. Check the resulting entries in js/ai/vts-guide-knowledge.js against the bounded retrieval tools and run the AI unit contracts. A newly available image does not retroactively validate an earlier guess; append the evidence correction.

[Local evaluation lab](velo-lab.md) · [Documentation index](README.md)
