// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "14.1.17";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
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
  },
  {
    "version": "14.1.13",
    "date": "2026-07-19",
    "highlights": [
      "Filled editable power fields directly from account-stat OCR and removed the separate extracted-value confirmation checkbox while retaining third-party processing consent.",
      "Removed the visible timezone question while preserving the stored submission schema for existing records.",
      "Replaced the crowded mobile footer with compact centered account links and removed duplicate tool navigation already available in the mobile dock.",
      "Added Croatian (`hr`) as the twelfth project language with translated core navigation, PWA, and player-facing All-Star signup copy plus explicit canonical-English fallback for specialist catalogs still awaiting reviewed Croatian terminology.",
      "Restored the visible required marker for Unit Specialty Power and replaced raw Firestore permission errors with a translated PIN-expiry recovery message for signup and Epic Showdown saves."
    ]
  },
  {
    "version": "14.1.12",
    "date": "2026-07-19",
    "highlights": [
      "Reduced All-Star submission security-rule evaluation by caching the active member grant and validating submission submaps through short aliases, preventing valid large signups from exceeding Firestore's 1,000-expression limit."
    ]
  },
  {
    "version": "14.1.11",
    "date": "2026-07-19",
    "highlights": [
      "Defaulted hero and research catalog filters to X1 and added a one-tap \"Max all\" action for each season's research group.",
      "Saved the primary All-Star signup before optional Epic Showdown preferences so a rejected signup can no longer leave an Epic-only player record, and visibly marked required Unit Specialty Power.",
      "Added an opening All-Star participation choice, an Epic-only path, automatic in-game-name sharing with Epic Showdown, and required contact/state/reason details for applicants outside VTS 1097.",
      "Updated the owner-scoped Firestore signup contract for the new VTS applicant fields and surfaced them in the leadership review panel.",
      "Fixed the mobile All-Star signup so the optional Troop OCR buttons remain inside their own section instead of floating over manual entry fields.",
      "Separated the three troop portraits in the “All T10 troop types” selector so each icon remains individually visible on phones."
    ]
  },
  {
    "version": "14.1.10",
    "date": "2026-07-19",
    "highlights": [
      "Added a true top-layer confirmation after successful All-Star signup submissions and edits, clearing stale permission errors only after the write succeeds and keeping delayed listener failures from replacing the confirmed result.",
      "Moved optional Epic Showdown choices ahead of the single signup action, saving them with the signup only when changed and fixing saved flexibility radio choices so untouched Epic fields never block submission.",
      "Replaced the first-visit PIN wait with a Velo secure-access loader, limited the mobile Add to Home Screen prompt to 20 seconds, and immediately hid the install prompt, tool dock, Velo launcher, and overlapping controls while a mobile user is writing."
    ]
  },
  {
    "version": "14.1.9",
    "date": "2026-07-19",
    "highlights": [
      "Kept owner-authenticated All-Star signup edits below Firestore's rules-expression limit by removing redundant update checks while preserving the shared schema, path-bound identity, immutable creation timestamp, and exact revision increment."
    ]
  },
  {
    "version": "14.1.8",
    "date": "2026-07-19",
    "highlights": [
      "Preserved the successful All-Star signup confirmation when a delayed realtime-listener permission error arrives after the submission has already been committed, while continuing to report the background error through the controller error hook."
    ]
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
