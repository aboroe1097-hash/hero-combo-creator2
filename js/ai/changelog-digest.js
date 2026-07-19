// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "14.1.13";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
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
  },
  {
    "version": "14.1.7",
    "date": "2026-07-19",
    "highlights": [
      "Replaced the expression-heavy All-Star signup write path with bounded, owner-scoped validation that keeps the exact previously denied member payload below Firestore's 1,000-expression limit while requiring Unit Specialty Power at the database boundary."
    ]
  },
  {
    "version": "14.1.6",
    "date": "2026-07-19",
    "highlights": [
      "Reduced All-Star Firestore rule evaluation for short signup lists while preserving validation through the full 60-item troop roster, preventing valid submissions from exceeding the rules expression budget."
    ]
  },
  {
    "version": "14.1.5",
    "date": "2026-07-18",
    "highlights": [
      "Completed the Specialization Towers public planner corpus with all 32 researches, 718 attribute nodes, 384 milestone buffs, 17 passive skills, and 24 troop-specific Legion Skills while keeping unverified prerequisite edges and node medal costs explicitly unknown.",
      "Added all 33 public research and Legion Skill emblems as locally embedded, size-budgeted WebP assets with source URLs, original hashes, optimized hashes, dimensions, and planner JavaScript provenance.",
      "Exposed the full 24-node Enhanced Tactics IV catalog in both Specialization renderers, added the public artwork to overview/detail/Legion Skill surfaces, and expanded automated coverage for the complete catalog and asset integrity.",
      "Rebuilt the README's Specialization documentation and replaced outdated gallery captures with current desktop and mobile planner screenshots.",
      "Kept the All-Star signup form and member hub intact when Firestore rejects a save, showing the write error inline instead of incorrectly treating every permission denial as an expired PIN grant."
    ]
  },
  {
    "version": "14.1.4",
    "date": "2026-07-18",
    "highlights": [
      "Reworked the All-Star signup OCR panel into a desktop split layout with a much larger full-list example opposite the upload controls while preserving the stacked mobile flow.",
      "Limited the cumulative hero season filter to S0, S1, S2, S3, S4, X1, X2, and X8; added exact supplied troop portraits to the T10 readiness choices; replaced missing or incorrect research artwork with all 29 exact supplied in-game icon crops; and added an explicit, admin-visible …",
      "Folded Epic Showdown preferences into the end of Signup, expanded its selectable game times to every two hours from +6 through +20, added a planning-only choice between flexible roles, flexible fight times, or one fixed assignment, and simplified the member journey navigation to…",
      "Made Unit Specialty Power mandatory, added visible focus-guided submission errors and an explicit Edit my signup action, a safe Lock hub action, and automatic one-time recovery from stale All-Star asset chunks so access happens before private form entry, saved answers remain edi…",
      "Added six optional animal team-name concepts with original matching emblems; players can favorite any number for leadership planning without affecting scores or automatic team balance."
    ]
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
