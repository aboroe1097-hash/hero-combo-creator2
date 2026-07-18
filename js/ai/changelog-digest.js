// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "14.1.3";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
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
  },
  {
    "version": "14.0.19",
    "date": "2026-07-17",
    "highlights": [
      "Added a VTS-only All-Star BoH member hub with a server-verified seasonal PIN, anonymous Firebase Auth, App Check, expiring server-owned member grants, locked-by-default navigation, and Firestore enforcement instead of exposing another reusable client-side PIN.",
      "Added manual and screenshot-assisted signup for the full legacy power breakdown, T9 and speed-hero readiness, fieldable hero availability, self-reported research-tree percentages, exactly two preferred All-Star fighting windows, an optional favorite role, non-binding teammate re…",
      "Added an independent Epic Showdown Planning section where members can multi-select South, Center, and North lanes plus multiple reset-relative play windows (`+8`, `+10`, and `+12`); updates remain separate from All-Star signup revisions, and admins receive live per-player detail…",
      "Added deterministic, versioned strength scoring and an admin-controlled six-team builder that requires exactly 12 unique accounts per team, respects seat and role locks, exposes score breakdowns, and validates all 72 assignments before publication.",
      "Added the Admin VTS All-Star command center for signup review, formula versions and overrides, team balancing and seat moves, configurable 12-seat role groups, four timed phases, two Legion plans, rotations, loadouts, teleport notes, objectives, and separate Team Announcement an…",
      "Adapted the supplied 2025 plan safely: Offensive, Rune, Top, and Bottom roles plus the 0–5, 5–10, 10–15, and 15–30 minute structure and objective codes can be reused, while all 15-seat player names, assignments, and capacities are deliberately excluded from the new 12-seat forma…"
    ]
  },
  {
    "version": "14.0.18",
    "date": "2026-07-17",
    "highlights": [
      "Added a Skin Atlas mode to the Hero Atlas: a Heroes/Skins toggle that opens a catalog of the three hero-skin tiers (Mythic, Legendary, Everlasting), each showing the Star 1 activation bonus, the Star 1→2 Inheriting Skill cost, the Star 2→3 Preserving Skill cost, the full maximiz…",
      "Encoded the verified per-tier star-up material costs (Biography Seal, Advanced Biography Seal, Epic/Legendary/Seasonal Legendary Hero Medals) with theme-aware styling and complete copy across all eleven supported languages."
    ]
  },
  {
    "version": "14.0.17",
    "date": "2026-07-17",
    "highlights": [
      "Added the public Specialization Towers v2 planner with separate Cavalry, Archers, and Footmen towers; eight game-like columns; four research learnings per column; 25/50/75/100 milestones; and medal-free Legion Skills that unlock only after all four learnings reach 100%.",
      "Added the canonical X28+ specialization corpus with 32 researches, shared internal-node structures across troop types, troop-specific names and effects, exact full-research badge costs, S3/SX1 availability, portable progress import/export, undo/redo, and persistent local plannin…",
      "Kept partial medal accounting evidence-based: unknown node costs remain unknown, recorded exact totals are invalidated whenever their selected nodes change, and the community-data panel links to the shared Google Sheet plus a versioned one-row-per-node CSV contribution template.",
      "Added evidence-backed progressive node revelation for Enhanced Tactics IV: its two screenshot-confirmed roots are available together, the observed final node remains visible and locked, unverified downstream nodes stay hidden, and the contribution template now collects initial v…",
      "Added a standalone battle-contribution contract that keeps unit base-point modifiers separate from battle percentages, exports scoped numeric/effect contributions with diagnostics, supports future engine extraction without Battle Simulator imports, and rejects non-finite arithme…",
      "Added the accepted dense dark/light tower-board UI, persistent desktop inspector, scrollable mobile dialogs, keyboard/focus restoration, RTL and eleven-language UI packs, strict local-only CSP-safe rendering, public navigation/command-palette discovery, service-worker coverage, …"
    ]
  },
  {
    "version": "14.0.16",
    "date": "2026-07-17",
    "highlights": [
      "Rebuilt the Strife over Dragon boss Fordogreen as \"Fordogreen the Dark Rider\" with its current four-skill kit — Preemptive Strike, Broken Promise, Hunt You Down, and Power of the Legion — including timings, targets, counters, and localized copy across all eleven supported langua…",
      "Added the top X1 pay-to-win recommendation for Fordogreen (Edward the Confessor / Ramses II / Beowulf) alongside the existing formations.",
      "Added a localized Rank 1 reward callout to the Strife boss intel band that surfaces the exclusive hero icon gifted to the event's top-ranked player, rendering a placeholder badge until the reward artwork is supplied."
    ]
  },
  {
    "version": "14.0.15",
    "date": "2026-07-16",
    "highlights": [
      "Added a simple, case-insensitive search inside the Alliance View Eden account-match editor while preserving the current selection during filtering and live contribution refreshes.",
      "Added a localized, one-click Alliance merge briefing PNG generated from the current live admin data, comparing a power-ranked full Top 100 against 95 keeps plus 5 reserved incoming seats with alliance composition, power cutoffs, C30 strength, Eden coverage, and manual-match reco…",
      "Kept the leadership brief honest about uneven Eden tracking coverage by using total power for both cross-alliance routes and labeling accounts outside the keep route as feeder candidates rather than automatic removals."
    ]
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
