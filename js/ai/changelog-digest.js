// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "14.2.2";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
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
  },
  {
    "version": "14.1.18",
    "date": "2026-07-20",
    "highlights": [
      "Replaced unreliable multi-image troop OCR with four optional million-based estimates for Lofty (S), enhanced T10, regular T10, and T9 troops; entering `7` records an estimated `7,000,000` troops while preserving legacy reviewed troop rows.",
      "Limited All-Star fighting-time choices to `+12`, `+14`, and `+16`, with exactly two choices still required; Epic Showdown time choices are unchanged.",
      "Completed localized All-Star participation, VTS membership, contact, state, reason, and troop-estimate copy across all twelve supported languages instead of falling back to English.",
      "Verified protected admin signup deletion removes only the selected signup, review, and feedback while preserving independent Epic Showdown preferences."
    ]
  },
  {
    "version": "14.1.17",
    "date": "2026-07-19",
    "highlights": [
      "Audited all 200 Eden contribution entries, 180 duty records, 40 conduct records, management votes, and teammate votes against canonical player families while preserving the published Top 20 order.",
      "Deduplicated reward families across Support, Contribution, Management, Team Players, and the 90 Power House positions so secondary accounts cannot receive a second season reward.",
      "Mapped verified public aliases and duty-only workers without letting zero-contribution support accounts enter Contribution or Power House rankings, and retained all 142 banners, 30 pathers, 8 shield walls, and 44 net conduct points."
    ]
  },
  {
    "version": "14.1.16",
    "date": "2026-07-19",
    "highlights": [
      "Added explicit Guild Master and Core reward tiers to the Final Top 20 while preserving each winner's support, contribution, management-vote, or team-vote selection reason.",
      "Added a deduplicated 90-player Power House ranking for positions 21–110 and one-click PNG downloads for both reward tables."
    ]
  },
  {
    "version": "14.1.15",
    "date": "2026-07-19",
    "highlights": [
      "Added a Final Top 20 announcement view to the Eden X1 reward flow that combines the four support, contribution, management, and team reward lanes into one shareable recipient table with category chips and placeholder rows until each lane is decided.",
      "Aligned the eden-x1 smoke expectation for the language selector with the Croatian option position shipped in 14.1.13."
    ]
  },
  {
    "version": "14.1.14",
    "date": "2026-07-19",
    "highlights": [
      "Fixed the Croatian language smoke-test contract that blocked #84 deploy verification after the twelfth locale was added.",
      "Expanded All-Star admin corrections to Unit Specialty, Artifact, and Royal Tech power and reject suspicious OCR `1` placeholders in unreadable extended-power rows.",
      "Displayed reviewed troop OCR rows in the admin signup panel and widened the combined T10 portraits so they remain distinct on desktop and mobile.",
      "Added a confirmed admin-only signup deletion action for removing test entries while preserving separate Epic Showdown preferences."
    ]
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
