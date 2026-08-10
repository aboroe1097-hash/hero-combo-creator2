// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "14.3.3";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
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
  },
  {
    "version": "14.2.17",
    "date": "2026-07-27",
    "highlights": [
      "Improved the All-Star BoH Mapper workspace action hierarchy with distinct colors for importing, validating, opening team plans, saving team edits, and publishing.",
      "Added strict per-team Stage-1 role-plan JSON preview and draft import, with exact player matching and 120 canonical personal instructions.",
      "Added one explicit publication-scope control for team lists, plan updates, or an atomic combined release.",
      "Added a draft-only announcement composer and clearer schedule controls for adding, duplicating, reordering, clearing, hiding, and validating public milestones and team times.",
      "Redesigned the member announcement and event schedule with editable release copy, team accents, a connected animated timeline, accurate next-event countdowns, and reduced-motion support."
    ]
  },
  {
    "version": "14.2.16",
    "date": "2026-07-26",
    "highlights": [
      "Fixed the All-Star published-player Firestore contract so UID and playerId identity fields remain consistent.",
      "Replaced the Admin All-Star five-stage Team Builder/Plans wizard with a mapper-first workflow.",
      "Added explicit manual reconciliation from unmatched mapper names to fresh verified signups.",
      "Added five-phase personal plans with connected 5x5 tower routes, player-specific crystal and Battle Merit assignments, and paired minute-3-or-later substitutions that preserve the ten-player field limit.",
      "Added private per-team resource, skill, building-buff, and substitution editing without exposing draft-only identities or tactics in player publications.",
      "Added independent editable Battle Simulator profile drafts for Side A and Side B, including a visual Specialization Towers board, selective source application, and aligned header controls."
    ]
  },
  {
    "version": "14.2.15",
    "date": "2026-07-26",
    "highlights": [
      "Made the approved All-Star BoH mapper exact view the source of truth for ranked team order, role distribution, command roles, and explicit main or backup deployment.",
      "Added member My Orders, Team Plan, and Map Briefing views with shared four-phase teleport, crystal, roster, duty, and real-map context.",
      "Reframed the admin team workspace around mapper preview, draft save, review, validation, and announcement while retaining legacy balancing tools as advanced compatibility controls.",
      "Added a Battle Simulator saved-profile checklist that validates Research, Equipment, and Specialization Towers before explicitly importing those automatic sources into either side.",
      "Redesigned Account & Profile into responsive Profile, Privacy, and Account settings sections with a clearer create/sign-in flow.",
      "Added safer dirty/save handling, required-field reveal, localized save and error states, counters, and RTL/mobile safe-area behavior."
    ]
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
