// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "14.2.7";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
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
  },
  {
    "version": "14.2.4",
    "date": "2026-07-21",
    "highlights": [
      "Added audited All-Star admin corrections across player-entered profile, stats, roster, hero, research, availability, role, and commitment data while preserving the original submission.",
      "Added reasoned 1-10,000 leadership commitment scores as an additive score component, stored-score diagnostics, and a balanced team-building mode that evaluates scoring points and Total Castle Power independently.",
      "Expanded All-Star score and review tooling with richer score provenance, sortable audit data, roster-aware CSV export, clearer selection controls, and sequential batch confirmation and deletion.",
      "Let existing All-Star signups save manual corrections when replacement screenshot OCR fails, with actionable Russian retry and fallback guidance; first-time OCR verification remains required.",
      "Improved Specialization Towers on mobile and RTL layouts with scroll position cues, focus and modal-scroll preservation, touch accessibility, and explicit provenance that public totals are whole-research totals while per-node medal costs remain unknown."
    ]
  },
  {
    "version": "14.2.3",
    "date": "2026-07-20",
    "highlights": [
      "Added five configurable All-Star scoring components for Unit Specialty Power, RoC level, paid usable heroes, Lofty troops per million, and Enhanced T10 troops per million, all defaulting to zero.",
      "Derived paid usable hero counts from the canonical hero catalog and preserved all five component weights through scoring-version and admin-draft store round trips.",
      "Kept legacy scoring totals unchanged until an admin explicitly creates and enables a new scoring version with nonzero weights.",
      "Made Team Builder support configurable 2–6 12-player teams, an explicit eligible pool, and exact-team forces, with preview/apply balancing by active score or Total Castle Power and both totals visible.",
      "Made reviewed player names and stats editable and applied those corrections throughout scoring, team building, publication, and export.",
      "Added compound review filters, stable sorting, and formula-safe CSV export limited to the current visible row order."
    ]
  },
  {
    "version": "14.2.2",
    "date": "2026-07-20",
    "highlights": [
      "Added actionable VPN, different-network, and Retry guidance when regional or network restrictions prevent access to required Google signup security services, without presenting the failure as an incorrect PIN; semantic validation, authentication, and admin-session errors remain …",
      "Kept the first paint fail-closed with a visible loader and access gate before CSS and security boot, added an accessible localized PIN visibility control, and accepted hash casing variants.",
      "Made screenshot OCR a generation-safe single-flight flow with deterministic processing, ready, and error states plus retry support.",
      "Prevented clipping of the header, logo, and version badge at 375 px and 390 px mobile widths while keeping the safe-area bottom navigation separate."
    ]
  },
  {
    "version": "14.2.1",
    "date": "2026-07-20",
    "highlights": [
      "Fixed All-Star BoH signup validation so RoC specialization levels from 0 through the in-game maximum of 160 can be submitted instead of forcing affected members to leave the field blank.",
      "Kept the browser, data normalization, and Firestore rules on the same RoC level range so accepted values appear correctly in the admin review panel.",
      "Prevented non-1097 applicants from exhausting Firestore's rules-expression budget when their required contact number, current state, and join reason are submitted; the client and store continue to require all three values.",
      "Added a visible screenshot-OCR progress bar, strengthened Unit Specialty Power extraction guidance, and kept duplicate OCR requests disabled while one read is running.",
      "Sorted research groups chronologically and pinned the verified S1 and X1 trees in regression coverage so those season sections remain visible in the cumulative X1 view."
    ]
  },
  {
    "version": "14.2.0",
    "date": "2026-07-20",
    "highlights": [
      "Completed the shared-admin signup protection by wiring the private-window instruction into the real access gate instead of leaving the error copy undefined.",
      "Localized the leadership-session warning across all twelve supported site languages and added rendered browser coverage for the exact message."
    ]
  },
  {
    "version": "14.1.20",
    "date": "2026-07-20",
    "highlights": [
      "Blocked the member All-Star signup from inheriting an existing leadership/admin Firebase login, preventing shared admin browsers from opening or overwriting one member submission.",
      "Added a fail-closed message directing leadership users to open the signup in a private window, where the site creates a separate anonymous member identity."
    ]
  },
  {
    "version": "14.1.19",
    "date": "2026-07-20",
    "highlights": [
      "Restored backward-compatible All-Star signup reads for historical `+8` and `+20` fighting-time selections so one older record cannot prevent the admin dashboard or a player's saved form from loading.",
      "Kept all new and updated submissions restricted to exactly two current fighting times from `+12`, `+14`, and `+16`.",
      "Prioritized Research, YouTube, All-Star BoH, and Eden X1 Rankings in the mobile bottom navigation, restored a compact mobile version badge, and fully hid the off-screen skip-link outline until keyboard focus.",
      "Made shared tab links case-insensitive so common variants such as `#allstarboh` and `#AllStarBoh` open and normalize to the canonical `#allStarBoh` route."
    ]
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
