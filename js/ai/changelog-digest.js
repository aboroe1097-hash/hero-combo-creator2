// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "15.0.12";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
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
  },
  {
    "version": "15.0.5",
    "date": "2026-08-18",
    "highlights": [
      "Added the new **Artifact Calculator** subtool under the Research & Towers Hub with full support for **Artifact One: Redemption Grail**.",
      "Transcribed all 40 nodes across 4 tiers directly from the community research database: Skill 1 (Sacred Light, 10 levels RGE), Skill 2 (Sacred Flame, 20 levels RGE), Branch 2a/2b Apex (Holy Grail & Enhanced Grail, 25 levels RGE each), and Skill 4 (Divine Radiance, 50 levels RGE),…",
      "Recreated the Redemption Grail's in-game branching board as 40 interactive gold-framed nodes, with exact Emblem and Artifact Soulstone icons, per-node level controls, resource totals, search highlighting, tier shortcuts, permanent-attribute tracking, account sync, and responsive…",
      "Added separately sourced Unit Specialisation VII–IX medal evidence without introducing the unrelated Royal Tech Books feature or inventing values for blank spreadsheet cells.",
      "Localized the complete Artifact interface across all 13 supported languages and added keyboard, focus, touch, reduced-motion, RTL, and screen-reader support."
    ]
  },
  {
    "version": "15.0.4",
    "date": "2026-08-17",
    "highlights": [
      "Fixed the VTS Admin mobile dock covering half the screen. The grouped season rail kept its in-page grid layout inside the fixed bottom dock, stacking every group's buttons and pinning a 400px panel over the content; the dock is now a single scrollable row that keeps the group la…"
    ]
  },
  {
    "version": "15.0.3",
    "date": "2026-08-17",
    "highlights": [
      "Renamed Royal Bounty Alliance to Royal Bounty Eden X2 across the Eden Hub: the guide's hero title and credits, the hub sub-tab, the command-palette entry and every locale now carry the season name.",
      "Removed the admin username and password form. VTS Admin now runs entirely off your VTS account: the gate links into the normal sign-in flow, and access is decided by the admin claim on whichever account you are already signed in with. A shared admin login meant a single identity…",
      "A signed-in account without admin access is now told so plainly and pointed at an R5 to request it, instead of being shown a sign-in it has already completed.",
      "The admin claim is re-read with a forced token refresh at boot, so an account promoted moments ago gets in immediately instead of waiting for its old ID token to expire."
    ]
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
