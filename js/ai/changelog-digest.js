// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "14.2.14";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
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
  },
  {
    "version": "14.2.7",
    "date": "2026-07-22",
    "highlights": [
      "Fixed the All-Star BoH Team Builder eligible-player pool so checkbox changes immediately update the selected-player count and save-button count before saving, with a compact searchable/filterable manager that starts collapsed when the saved count is already valid.",
      "Improved All-Star Team Builder outputs with exact team-count columns, leader plus co-leader metadata, ranked role assignment, batch commitment-score helpers, and shareable CSV/PNG team exports for roles or scores/power."
    ]
  },
  {
    "version": "14.2.6",
    "date": "2026-07-21",
    "highlights": [
      "Added persisted Epic Showdown planning controls for excluding secondary accounts, forcing lane assignments, and keeping named or language-based groups together.",
      "Evaluated every keep-together group as one shared lane, surfaced unresolved or conflicting groups, and showed active-versus-excluded totals in the admin workspace.",
      "Added a formula-safe active Epic planning CSV with player locale, preferences, lane overrides, effective lanes, and group IDs."
    ]
  },
  {
    "version": "14.2.5",
    "date": "2026-07-21",
    "highlights": [
      "Collapsed Epic Showdown preference summary by default (H1).",
      "Collapsed player preference details and usable-heroes disclosure by default (H1).",
      "Persisted Epic Showdown collapse state in sessionStorage (H1).",
      "Moved review status/actions leftward in the signup table (H2).",
      "Added sticky leading identity columns with LTR/RTL support (H2).",
      "Added `data-label` attributes to all `<td>` for card-mode responsive layout (H2)."
    ]
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
