// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "14.3.6";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
  {
    "version": "14.3.6",
    "date": "2026-08-12",
    "highlights": [
      "The Specialization tab on the main site is now a thin summary card that links to the full standalone planner; the duplicate in-tab graph renderer is gone, and the community node-data submission section stays on the main site.",
      "Added a local Towers dev/test loop: `npm run towers:dev`, `towers:test`, and `towers:check` run only the Specialization Towers unit slice and every Specialization browser spec, so a Towers change can be checked in about half a minute instead of a full smoke run.",
      "Repaired the hero combos list after recent direct edits: three hero names that do not exist in the roster (Rozen, Jeane, Beast Queen) are corrected, and four combos that had been added twice are back to a single entry each."
    ]
  },
  {
    "version": "14.3.5",
    "date": "2026-08-11",
    "highlights": [
      "Added Spenders and F2P suggested routes to Specialization Towers. Picking one numbers every research in order and marks the next one to take, and the choice is remembered.",
      "Added an easy medal fill toggle to Specialization Towers, with 25/50/75/100% quick fills so medals can be recorded without stepping through nodes first.",
      "Node data contributions now require a signed-in account and are credited to it, which also removes the per-node contributor field so a whole column is just one number per row.",
      "Added the exact in-game node topologies for Encounter Battle IV, Cavalry Training VII and Neat Formation III, including the three battle-row loops that make up Neat Formation III.",
      "Corrected Army Breaker to season X1 and Defender to the Archers troop type.",
      "Raised the minimum copies for free X1 and X2 heroes to 22; paid heroes stay at 14 and the maximum is unchanged at 34."
    ]
  },
  {
    "version": "14.3.4",
    "date": "2026-08-10",
    "highlights": [
      "Added a spent total to the research calculator, so each tech tree now reports how many War Badges and Courage Medals you have already invested next to how many are still remaining.",
      "Kept the tree footer naming its real currencies once a tree is fully maxed, instead of collapsing to a generic resource row when nothing is left to buy.",
      "Made partially levelled nodes look the same in every tech tree. Trees using the card layout only ever showed \"maxed or not\", so a half-finished node was indistinguishable from an untouched one; they now use the same idle, in-progress, and complete states as the rest of the trees."
    ]
  },
  {
    "version": "14.3.3",
    "date": "2026-08-10",
    "highlights": [
      "Rebuilt the hero combos database as one plain ranked list. Every entry is now just the three heroes plus an optional skin code and an optional note, replacing the imported tier-and-score format that came from the external combo datasets.",
      "Limited the combos database to heroes from seasons up to X2 and removed the 82 imported formations that depended on X8 heroes, leaving 203 ranked combos.",
      "Fixed the two promoted top-rank combos being listed twice, which rendered duplicate \"Use this counter\" buttons in the counter panels.",
      "Added database guards so a combo can only use known hero names, can never reintroduce an X8 hero, can only carry the heroes/skin/note fields, and can never be listed twice with the same heroes and skin code."
    ]
  },
  {
    "version": "14.3.2",
    "date": "2026-08-03",
    "highlights": [
      "Upgraded Velo to the smarter gemini-3.5-flash model while keeping the lighter model for short chat turns, so simple questions stay fast and big questions get better answers.",
      "Added Velo retry support that automatically falls back to the alternate model when the first request is rate-limited or the service is unavailable.",
      "Gave Velo three new capabilities: live Arcade leaderboards for all five games, All-Star BoH public mechanics and scoring, and the public VtsScore power-field contract.",
      "Expanded Velo's output limit and tool budget so answers can include compact markdown tables that stay readable on phones.",
      "Added a copy-answer button to completed Velo replies, plus table-aware rendering for tool-generated data.",
      "Enabled Velo's active-tab context so follow-up questions know which tool page you are looking at."
    ]
  },
  {
    "version": "14.3.1",
    "date": "2026-07-29",
    "highlights": [
      "Replaced the generic VtsScore failure banner with specific messages for every secure-service outcome: rate limits (with the wait time), oversized screenshots, service outages, unsupported image types, locked accounts, closed signups, and rejected requests.",
      "Appended the machine-readable error code to VtsScore failure banners so member screenshots identify the exact failure for support.",
      "Restored the stable captured sign-in reference for the All-Star secure client on the VtsScore and BoH pages."
    ]
  },
  {
    "version": "14.3.0",
    "date": "2026-07-28",
    "highlights": [
      "Corrected VtsScore to OCR, review, submit, and compare the complete nine-field power breakdown instead of a single Total or Dragon Power value.",
      "Added editable per-field OCR review with confidence context for Total, Troop, Building, Technology, Hero, Dragon, Unit Specialty, Artifact, and Royal Tech power.",
      "Added migration-safe VtsScore storage: new uploads use the full versioned contract while earlier one-field uploads remain visible as incomplete and require re-upload.",
      "Expanded the All-Star admin comparison to show sign-up, final, and growth values for every power category."
    ]
  },
  {
    "version": "14.2.20",
    "date": "2026-07-27",
    "highlights": [
      "Corrected VtsScore OCR and review to submit Total Power rather than Dragon Power while preserving the deployed secured endpoint contract.",
      "Replaced the browser datalist with ranked closest-name search across every eligible All-Star signup, including keyboard selection.",
      "Added six complete VtsScore languages, Arabic RTL, and accessible light/dark theme controls with improved form and button contrast.",
      "Updated the All-Star admin growth table to compare sign-up and final Total Power while retaining the original Dragon-based reward tiers.",
      "Raised aggregate JavaScript and Pages artifact budgets by 20 kB for the complete VtsScore locale packs."
    ]
  },
  {
    "version": "14.2.19",
    "date": "2026-07-27",
    "highlights": [
      "Added the focused VtsScore page for Competition #11 final Dragon Power re-uploads, with a searchable All-Star signup selector and one-image OCR review.",
      "Added a secured Auth, App Check, and member-grant verified score endpoint that stores confirmed numbers and bounded OCR audit metadata without retaining screenshots.",
      "Added an All-Star admin VtsScore stage comparing sign-up and final Dragon Power, growth, percentage, original reward tier, and missing uploads."
    ]
  },
  {
    "version": "14.2.18",
    "date": "2026-07-27",
    "highlights": [
      "Added a guided All-Star admin team builder with semantic action colors.",
      "Added safe player display-name and total-power corrections, plus reasoned base-score overrides derived from occupied team seats.",
      "Added atomic import for one to six role-plan files or a complete six-team bundle, plus admin export of every team plan.",
      "Polished member event progress with a connected timeline, selected-milestone state, accessibility improvements, and reduced-motion behavior.",
      "Rebuilt account creation as provider-first authentication followed by a focused private-profile confirmation step, with direct Google sign-in, a referral dropdown, and dismissible timed notices.",
      "Improved Specialization Towers light-theme MAX, UNMAX, zero-progress, and disabled-state contrast with consistent semantic colors."
    ]
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
