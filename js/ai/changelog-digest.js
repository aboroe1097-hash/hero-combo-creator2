// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "16.0.3";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
  {
    "version": "16.0.3",
    "date": "2026-09-04",
    "highlights": [
      "Documented the X10 and X12 season brackets in the Manual Builder and Combo Generator filters. X10 is an optional intermediate season some Rise of Castles states run and Eden never has, carrying two free heroes, no paid heroes and no new research; X12 gathers the X9 through X12 h…",
      "Added a Select all control to both season filter strips. It fills every season in one press and returns the strip to its own defaults on the next, so the filter is never left empty."
    ]
  },
  {
    "version": "16.0.2",
    "date": "2026-09-04",
    "highlights": [
      "Rebuilt the Towers Specialization summary as full-width bands. The panel laid its title, button, hero plan and stat tiles out as one wrapping row, so the 478px-tall plan left roughly 460px of empty background beside the 46px title; title, stat bar and plan now each span the pane…"
    ]
  },
  {
    "version": "16.0.1",
    "date": "2026-09-04",
    "highlights": [
      "Restored the X12 research season selector. All 30 Charge nodes are editable in a list without invented topology or unlock rules; Defense retains all 29 nodes and now discloses the source's conflicting cost totals.",
      "Fixed the research planner re-normalizing already normalized families and silently replacing their costs with zero. X12 estimates retain their unverified status while source gaps remain.",
      "Renamed Codex to Hero Tables across supported languages. Restored hero-detail opening and keyboard return focus, kept deselected season filters reachable, explained combo-derived ratings, and hid empty duel sections.",
      "Added a shared local portrait-unavailable image for the X10/X12 heroes whose artwork has not yet been supplied, preventing broken images across roster consumers without misidentifying their portraits."
    ]
  },
  {
    "version": "16.0.0",
    "date": "2026-09-03",
    "highlights": [
      "**VTS Player Alias Reconciliation**: Folded decoration, whitespace and case variants of the same account into one identity across leaderboards, contribution matching and weighted scoring, adopting Moldo1313 and D O F F Y as display names. Sixteen owner-confirmed merges join spel…",
      "**CSS Token Authority & Theme Refactor**: Established centralized theme token authority across dashboard and Eden surfaces, retiring ~357 redundant override rules while maintaining strict net-negative route CSS budgets. Normalized colliding 768px responsive boundaries and enlarg…",
      "**Seasons & Roster Expansion**: Landed X10 and X12 season scaffolding and integrated the nine free plus two paid heroes into the canonical roster (expanding the roster from 78 to 89 heroes), with tower profiles for the paid pair and synchronized Firestore security rule allowlist…",
      "**Codex Data Platform**: Introduced a scalable dataset pipeline with pipe-delimited source tables, gzipped on-demand payload streaming, strict provenance verification, and hero alias quarantine protection.",
      "**Hero Atlas Codex & Field Data**: Added unified multi-table Codex browsing (Free, Paid, Skins+Paid), full 1–8 skill drawer inspection, and the Battle Simulator Field Data evidence panel with match resemblance metrics.",
      "**Progression Planners & Preset Engine**: Shipped the unified Research Cost & Progression Planner, Castle Development Planner, Stamina Projection Calculator with shareable alliance operation cards, and a shared Specialty Preset Engine with cross-tool adapters."
    ]
  },
  {
    "version": "15.0.15",
    "date": "2026-09-01",
    "highlights": [
      "Restored the missing More action to the fixed mobile navigation so Arcade, Battle Simulator, DM Materials, Strife, YouTube, and VTS Admin remain reachable from phones.",
      "Compacted the mobile header, kept the inline account control in the utility row, and preserved full-size controls down to 320px without the stray third row.",
      "Updated the public VTS leadership badge roster: Loony is now R4, while Zubbs no longer receives the R4 badge; Zubbs aliases remain grouped for historical records.",
      "Added each player's structure demolition to Weighted Total Contribution at a temporary 1:20 rate, so 1,000,000 demolition contributes 50,000 weighted points for every admin role.",
      "Moved substantive Velo requests to DeepSeek Reasoner with a verification round and a larger shared reasoning/output budget; short standalone questions still use the fast chat model.",
      "Updated the compatible frontend CSS toolchain to Autoprefixer 10.5.4 while retaining the Node 20-compatible cssnano 8 and Vite 6 build path."
    ]
  },
  {
    "version": "15.0.14",
    "date": "2026-08-28",
    "highlights": [
      "Signing in now returns you to the tool you came from instead of leaving you on the account page, and new accounts finish onboarding before being redirected.",
      "Fixed the mobile account chip covering the theme and language buttons; on phones a tap on the theme toggle opened the account page instead of switching theme.",
      "Rating every player is now required when filing a BoH match result, and the scale is shown as \"/ 10\".",
      "A refused save now says the server rejected the write and the security rules may be out of date, instead of claiming you are not signed in.",
      "Fixed the language coverage report claiming 26 missing translations per locale that were in fact already translated.",
      "Corrected stale version labels on the account, VtsScore and maintenance pages, and gave the 404 page a mobile layout."
    ]
  },
  {
    "version": "15.0.13",
    "date": "2026-08-26",
    "highlights": [
      "Added bulk row pasting to Bonus Team Effort so conduct adjustments can be entered as `player | points | reason` lines in one action.",
      "Added admin-submitted team conduct suggestions with visible attribution and a super-admin approval or rejection workflow.",
      "Restored VtsScore as a dedicated super-admin leaderboard tab and replaced the legacy All-Star command center with the focused BoH match-results workflow."
    ]
  },
  {
    "version": "15.0.12",
    "date": "2026-08-18",
    "highlights": [
      "Reworked the playbook Day 1 route around the loyalty build: unlock and build the Assault and Guardian Fortresses before resetting, run the all-Green Frontline Workshop honor setup, then reset into the Blue tree (left & right) for loyalty and processing; tile Farm, Marble, and Al…",
      "Replaced the Eden Tips & Guides screenshots with the actual in-game specialization captures: Demolition, Speed Tiling (main plus the optional 14–20 Blue reference), Structure Honor (40 Green), Tiling Honor, and Fortress Unlock."
    ]
  },
  {
    "version": "15.0.11",
    "date": "2026-08-18",
    "highlights": [
      "Fixed a crash in the Artifact calculator that showed “Artifact Calculator failed to load” whenever heroes were selected in the generator (or synced from an account roster); the Sword path planning now reads the analyzed hero mechanics correctly.",
      "Fixed the Artifact tree board image on the live site, which loaded from a doubled asset path."
    ]
  },
  {
    "version": "15.0.10",
    "date": "2026-08-18",
    "highlights": [
      "Fixed the Eden Playbook Week 1 “Balancing Income & Production” tool link so it reliably opens the Eden Loyalty subtab instead of staying on the playbook when a stale subtab intent was present.",
      "Reassigned the DrThunder in-game route screenshots across the playbook timeline: Day 1, Day 2, and Week 1 now share the two route references, and the Role entry no longer repeats them (full routes remain in Eden Tips & Guides).",
      "Improved the Loyalty Targets layout with centered copy, tighter centered income-jump cards, a gradient card accent, and balanced spacing."
    ]
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
