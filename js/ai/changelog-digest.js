// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "15.0.6";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
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
  },
  {
    "version": "15.0.2",
    "date": "2026-08-17",
    "highlights": [
      "Fixed the reversed typing in Users & Roles: the member search no longer rebuilds its own input on every keystroke, so the caret stays put and characters land where you typed them, and it now shows a live \"showing X of Y\" count.",
      "Superadmins can now list every member profile in Users & Roles. The Firestore rules previously limited `users/{uid}` reads to the account owner, which silently emptied the roster; superadmin read access is now granted alongside self-read.",
      "The account chip now says \"Superadmin\" with its own violet badge when you hold the higher claim, instead of showing both roles the same gold \"Admin\".",
      "Locked the whole Alliance management side of VTS Admin — Alliance View, All-Star BoH, Throne Buffs and Users & Roles — behind the superadmin claim. A plain admin no longer sees a nav row whose tabs would all refuse them.",
      "Gave the Throne Buffs tab its stylesheet: one compact header row for the week picker, slot badges and actions, a bordered assignment table with the title icons and effects, pill badges for slot counts and duplicate warnings, styled history search results, and a rotation fairness…",
      "Rebuilt the desktop admin navigation layout: each tab group is now a single compact row of mono label plus content-sized pills instead of three narrow columns of stretched buttons, which had wrapped every group into a tall stack and pushed the page content far below the header."
    ]
  },
  {
    "version": "15.0.1",
    "date": "2026-08-16",
    "highlights": [
      "Split VTS Admin into two sides. Alliance management now holds Alliance View, All-Star BoH and the new Throne Buffs tab, and sits deliberately outside the Eden season scope, so a season rollover never moves or clears it.",
      "Added the Throne Buffs assignment tab: pick any week, assign the nine throne titles to members with optional reasons, watch the rotation fairness table flag who is overdue, search past weeks, and export the week as a PNG card.",
      "Added the Banners Planner groundwork: a 19-banner alliance catalog transcribed from the retired planning sheet, plus the pure planning model that normalizes weekly event blocks and tracks banner usage, pilot workload and banners that silently dropped out of a week.",
      "Added Vialfiend to the Strife monster lab with its four skills verbatim from the game: Death's Aura, Intimidate, Demon Wraith and Power of the Legion.",
      "Removed the Velo runner sprite that travelled along the loading bar; the loader keeps its identity art and the progress bar still animates.",
      "Embedded the Eden X2 season page and Previous Seasons into the Eden Hub without their standalone chrome, and fixed the white-on-white workspace select and the cramped admin command strip on mid-width screens."
    ]
  },
  {
    "version": "15.0.0",
    "date": "2026-08-15",
    "highlights": [
      "Added the Eden X2 season workspace. Eden X1 becomes a read-only archive that stays exactly as it was, while X2 starts empty in its own isolated space, so a new season never overwrites the last one.",
      "Added a public Eden X2 page that only ever shows what an admin has explicitly published. Before publication it says the season is not published yet instead of showing an empty scoreboard, and it appears in the Eden Hub only once it is live.",
      "Reorganised VTS Admin around what actually changes each season. The Eden workspace switch now governs only the season surfaces; All-Star BoH sits in a separate Standing programs area that a season rollover never touches.",
      "Added an Eden workspace command strip with the season selector, its draft or published state, and safe publish, unpublish and snapshot actions. The archived X1 season stays viewable and exportable but refuses every change.",
      "Added the Throne Buffs weekly assignment groundwork: the nine throne titles with their real effects, weekly assignments with optional reasoning, and rotation fairness that tracks who has held which buff and how long ago.",
      "Shipped the nine Throne title icons in `images/throne/`, cropped from the in-game Province panel. A slot whose icon file is absent still falls back to its two-letter initials, and the Emperor's effect list stays empty until its in-game tab is captured."
    ]
  },
  {
    "version": "14.3.9",
    "date": "2026-08-14",
    "highlights": [
      "Combined Manual Builder, Combo Generator, Hero Atlas, and skins into the new Heroes & Combos Hub. The generator is its default view; Heroes and Skins are separate hub sub-tabs, while existing deep links keep working.",
      "Combined Tech Research and Towers Specialization into the new Research & Towers Hub, opening on the Towers planner by default and preserving both legacy routes.",
      "Reworked the Towers planner around exactly two paths ? Siege / Rally and Field (Non-Siege) ? with paid-hero presets, owned-hero controls, clear 1/32 path numbering, and full troop coverage.",
      "Made Royal Bounty the VTS Eden Hub landing page, with its visual 9-hero guide, mission/commission loop, Aiding Skill rules, and a one-click return to the Eden map.",
      "Completed the public app locale contract across every shipped language and updated Velo?s tower, hero-path, and Royal Bounty guidance."
    ]
  },
  {
    "version": "14.3.8",
    "date": "2026-08-13",
    "highlights": [
      "The Combo Generator now opens in skin mode. Skin icons, skin toggles and skin-aware combos are on by default; the toggle still turns them off.",
      "Hero cards in the generator now stay in seasonal order (S0 first, X2 last) instead of floating heroes that own a skin to the top, so a hero stays where you expect when you switch skin mode on or off.",
      "Replaced Beowulf's skin icon with a clean portrait crop, without the level and name overlay from the old capture."
    ]
  },
  {
    "version": "14.3.7",
    "date": "2026-08-13",
    "highlights": [
      "Brought back the full Specialization tool inside the main site. The tab is the interactive planner again, not a summary card that sends you to another page.",
      "Moved the suggested routes and the easy medal fill onto that tab, so both surfaces now offer the same tools and share the route you pick.",
      "Fixed the Combo Generator hiding its best combos. A hero with a \"recommended\" skin no longer removes a combo from the normal list; only a combo that truly requires a skin is held back for skin mode. The top of the list now matches the ranking, starting with Alexander / Bleeding …"
    ]
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
