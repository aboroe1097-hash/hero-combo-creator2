// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "14.1.8";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
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
  },
  {
    "version": "14.1.3",
    "date": "2026-07-18",
    "highlights": [
      "Improved Specialization node selection with a clear node guide, stronger selected/focus states, explicit learned/not-learned choices, localized research and column names, and accessible mobile controls.",
      "Added reversible MAX/UNMAX controls to every Specialization research and an interactive Legion Skill preview that unlocks after all four column researches are complete.",
      "Rebuilt the All-Star BoH signup around screenshot-first multilingual OCR for the six common power rows plus three optional extended rows, an in-form screenshot example, compact timezone and mobile controls, T10 readiness, portrait-backed hero selection with cumulative seasons th…",
      "Simplified All-Star planning to full/most attendance, two game-required time preferences with a cross-team majority explanation, translated primary and secondary role selection with an inline role guide, and no backup, unavailable-time, level-50, or generic commitment questions;…",
      "Removed the All-Star access-gate dismissal path so the private signup form can only be revealed after the seasonal member PIN is successfully verified.",
      "Added a localized, mobile-ready All-Star signup-window banner that counts down to opening and then closing, shows the exact local dates, and falls back to a clear schedule-pending state until leadership enters the confirmed ISO timestamps."
    ]
  },
  {
    "version": "14.1.2",
    "date": "2026-07-18",
    "highlights": [
      "Added four read-only Velo tools so the assistant knows the whole toolkit: `get_toolkit_map` (every tab/page with what it answers and its deep link), `get_whats_new` (recent release notes from a generated changelog digest), `get_specialization_context` (canonical Specialization T…",
      "Added a `velo:changelog` script that generates `js/ai/changelog-digest.js` from CHANGELOG.md; the build runs it automatically and a unit test keeps the digest in sync with the released version.",
      "Rebranded the assistant build as Velo b0.2 and refreshed Velo's system prompt: the role now covers Specialization Towers, skin tiers, All-Star BoH public mechanics, Battle Simulator context, and app navigation; the helmet gag became occasional and varied; out-of-scope answers no…",
      "Added grounded VTS guide knowledge entries for the All-Star BoH member flow, Specialization Towers structure, skin-tier economy, and the Fordogreen X1 Strife approach, plus community-shorthand aliases (dm, ac, boh, spec, cop, f2p, p2w) in guide retrieval.",
      "Added an optional `activeTab` breadcrumb to the chat request contract: the Worker schema accepts it and injects an ACTIVE APP TAB section into the model instruction; the client keeps it disabled until the Worker deploy that accepts the field is live.",
      "Added the verified Cavalry columns I–III evidence overlay with 17 source screenshots, 23 exact icon crops, provenance metadata, and stable research/node records; unknown medal costs, learning order, prerequisites, and ambiguous icon mappings remain explicitly unknown."
    ]
  },
  {
    "version": "14.1.1",
    "date": "2026-07-18",
    "highlights": [
      "Removed public navigation to the legacy standalone Specialization Towers page so the integrated `#specialization` tab is the only advertised destination.",
      "Cleared the integrated Specialization loading placeholder after the tool mounts successfully.",
      "Fixed integrated Specialization node selection, Complete Learning, Reset Learning, and recorded-medal changes persisting the model's returned state.",
      "Added a localized quick-MAX action to every Specialization overview badge so a learning can be completed without opening its node graph.",
      "Localized the Community Data contributor, medal-cost, reviewer, and completion-count fields across all eleven supported languages.",
      "Reworked Community Data into compact game-node records with separate contributor and reviewer medal values, preserving earlier saved submissions while supporting partial research updates."
    ]
  },
  {
    "version": "14.1.0",
    "date": "2026-07-18",
    "highlights": [
      "Fixed manually pasted Total Contribution names retaining a separator comma, including previously saved records when they are normalized for display and export.",
      "Restored contribution snapshot matching when the optional guild field is omitted by applying the VTS X1 default only within the normal contribution comparison, avoiding unnecessary one-off aliases."
    ]
  },
  {
    "version": "14.0.20",
    "date": "2026-07-17",
    "highlights": [
      "Added a Specialization Towers tab inside the main app (index.html) that follows the in-game flow: column banners of circular badges with a Legion Skill crest at the foot, and tapping a badge opens a node graph — an oval ring for most families and a dependency tree for Enhanced T…",
      "Added a community contribution form to the Specialization tab with an inline fillable UI: contributor name, per-node medal cost entry, and optional reviewer name — all persisted in localStorage, replacing the previous CSV-download and external-sheet approach.",
      "Merged Battle Simulator v2 engine with research and equipment source breakdowns, per-stat node UI with source-level breakdown, whole-legion equipment loadouts with set/grade/enhancement selection, full i18n support, and v2 synthetic test fixtures."
    ]
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
