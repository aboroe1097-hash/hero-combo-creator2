// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "14.3.0";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
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
  },
  {
    "version": "14.2.14",
    "date": "2026-07-26",
    "highlights": [
      "Fixed the mobile header so the Account control has its own touch-safe slot without displacing the clock, search, theme, or language controls."
    ]
  },
  {
    "version": "14.2.13",
    "date": "2026-07-26",
    "highlights": [
      "Made Battle Simulator hero skills and assignments explicitly canonical and added the verified Cavalry Movement in Unison specialization passive.",
      "Renamed the team-planning surface to All-Star BoH Hub and added Admin exact-view mapper reconciliation into editable drafts with explicit publication.",
      "Simplified accounts to one in-game name, restored private state/referral/comments onboarding, localized the full flow across all 13 locales, and recovered Google signup when a guest selects an existing Google account.",
      "Made Dragon Master completion advance to the next unfinished targeted piece."
    ]
  },
  {
    "version": "14.2.12",
    "date": "2026-07-26",
    "highlights": [
      "Added Velo Beta 0.3 saved-data consent and optional Firebase-backed user profiles.",
      "Expanded All-Star BoH with a six-team, 12-player roster and schedule, supporting rules, and X8 name-matched formations.",
      "Completed Italian and Korean localization across the shipped experience.",
      "Made Battle Simulator scenarios apply Research and Specialization through a deterministic runtime, with upgraded setup/export schemas and diagnostics.",
      "Expanded Battle Simulator coverage to 78 heroes and 208 skills using conservative modeled effects, plus provisional observed equipment effects; partial or unverified battle clauses fail closed, and Dragon Master catalog stats are never invented."
    ]
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
