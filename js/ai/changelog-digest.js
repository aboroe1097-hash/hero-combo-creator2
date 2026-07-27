// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "14.2.17";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
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
  },
  {
    "version": "14.2.11",
    "date": "2026-07-25",
    "highlights": [
      "Restored All-Star BoH member PIN access after registration closes and made the Stage-1 battle mapper the default post-login page, with separate Team Formation and Event Schedule pages.",
      "Updated All-Star publication to use the six currently approved teams and their occupied seats instead of blocking on unused 72-seat placeholders; captain metadata is optional but validated when present.",
      "Split the All-Star season switch so closed registration blocks member signup and Epic preference writes without hiding published teams, personal plans, or schedules."
    ]
  },
  {
    "version": "14.2.10",
    "date": "2026-07-25",
    "highlights": [
      "Added an interactive real Stage-1 map to the All-Star BoH plan view, replacing the schematic placeholder.",
      "Added personal plan behavior for each player, including standby and gather-crystals instruction options.",
      "Added a member-facing event schedule with a live countdown to the next milestone or team game time.",
      "Added an admin event-schedule editor for publishing event milestones and per-team game times.",
      "Added a default Stage-1 plan template so new seasons start from a complete, editable plan.",
      "Improved mobile layout and accessibility across the All-Star BoH member and admin views."
    ]
  },
  {
    "version": "14.2.9",
    "date": "2026-07-22",
    "highlights": [
      "Closed the public All-Star BoH registration view with a clear “Teams are full” status and notice that team matching is underway and assignments will be announced soon.",
      "Made the All-Star admin balance configuration collapsible and added a non-persisting “Select highest X” shortcut sized to the currently configured team field.",
      "Reflowed the six-team admin board into a spacious 3-by-2 desktop grid, two columns on narrower screens, and one column on mobile."
    ]
  },
  {
    "version": "14.2.8",
    "date": "2026-07-22",
    "highlights": [
      "Rebuilt mobile site headers and control grouping so centered branding/version, time/search/theme/language controls, fixed bottom navigation, and Generator action areas no longer overlap or float over content.",
      "Reduced and repositioned hero-card information controls in Combo Generator and Manual Builder, keeping card content readable and touch targets intentional.",
      "Harmonized Specialization Towers with the shared site palette and added compact icon-only Cavalry/Archers/Footmen controls on mobile.",
      "Converted the completed Eden X1 public page into an archive centered on the Final Top 20, player lookup, guild contribution, and analysis while keeping active-season voting/reward machinery reusable behind the season-state switch.",
      "Fixed Structure Detail modal rows so long multilingual names, rank tags, large scores, and hit badges remain compact and fully visible on mobile."
    ]
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
