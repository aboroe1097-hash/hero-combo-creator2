// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "15.0.15";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
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
  },
  {
    "version": "15.0.9",
    "date": "2026-08-18",
    "highlights": [
      "Reworked Artifact node leveling with direct numeric entry, −5/−1/+1/+5 controls, and a one-click prerequisite-aware MAX action that funds only the required path before maxing the selected node.",
      "Improved the Artifact inspector layout for faster desktop and mobile use while preserving keyboard access, RTL, and dark/light themes.",
      "Added a hero-targeted Sword path driven by the heroes selected in Heroes & Combos, their analyzed skill mechanics, a prerequisite-valid node order, board step markers, and exact-node share links.",
      "Added the interactive DrThunder Eden Loyalty Playbook with separate day/week and topic-guide flows, six specialization-role references, a responsive HTML income table, detailed poison strategy, 13 contextual in-game visuals, responsive themes, deep links, and prominent original-…",
      "Added a global “Share this exact view” control and canonical subtab/section URL state so tool, Artifact-node, and Eden Playbook links can be passed directly to other players.",
      "Clarified navigation status with Hub badges on primary destinations plus Beta/New badges on Towers, Artifacts, Eden Playbook, and Royal Bounty Eden X2 subtools."
    ]
  },
  {
    "version": "15.0.8",
    "date": "2026-08-18",
    "highlights": [
      "Added the official Royal Bounty Alliance 2.0 Aiding Skills overview to the Eden X2 bounty guide, with responsive sizing, accessible context, and source credit to riseofcastles.net.",
      "Optimized the reference image for fast mobile loading while preserving the original in-game text and visual detail."
    ]
  },
  {
    "version": "15.0.7",
    "date": "2026-08-18",
    "highlights": [
      "Corrected the X2 Artifact tool to make **Sword of Judgment** the current default instead of the not-yet-available Redemption Grail.",
      "Added the complete 33-node Sword tree with exact level costs, prerequisites, stage layout, Sword Emblem and Artifact Soulstone totals, node icons, and in-game Sword artwork.",
      "Kept Redemption Grail data available for a future release without presenting it as current X2 content."
    ]
  },
  {
    "version": "15.0.6",
    "date": "2026-08-18",
    "highlights": [
      "Replaced the Artifact board's synthetic gradient with the exact in-game Redemption Grail capture embedded in the source sheet, including its Grail silhouette, ruins, node rings, and branching frame.",
      "Refined the mobile tracker into a centered, pannable game board with the board before the inspector, compact two-column resource totals, cleaner actions, and level badges shown only for the selected or upgraded nodes.",
      "Preserved readable dark and light surfaces, 44px mobile node targets, keyboard focus, and the existing 40-node calculation and account-sync behavior."
    ]
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
