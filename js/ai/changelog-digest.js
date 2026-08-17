// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "15.0.3";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
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
  },
  {
    "version": "14.3.6",
    "date": "2026-08-12",
    "highlights": [
      "The Specialization tab on the main site is now a thin summary card that links to the full standalone planner; the duplicate in-tab graph renderer is gone, and the community node-data submission section stays on the main site.",
      "Added a local Towers dev/test loop: `npm run towers:dev`, `towers:test`, and `towers:check` run only the Specialization Towers unit slice and every Specialization browser spec, so a Towers change can be checked in about half a minute instead of a full smoke run.",
      "Repaired the hero combos list after recent direct edits: three hero names that do not exist in the roster (Rozen, Jeane, Beast Queen) are corrected, and four combos that had been added twice are back to a single entry each."
    ]
  },
  {
    "version": "14.3.5",
    "date": "2026-08-11",
    "highlights": [
      "Added Spenders and F2P suggested routes to Specialization Towers. Picking one numbers every research in order and marks the next one to take, and the choice is remembered.",
      "Added an easy medal fill toggle to Specialization Towers, with 25/50/75/100% quick fills so medals can be recorded without stepping through nodes first.",
      "Node data contributions now require a signed-in account and are credited to it, which also removes the per-node contributor field so a whole column is just one number per row.",
      "Added the exact in-game node topologies for Encounter Battle IV, Cavalry Training VII and Neat Formation III, including the three battle-row loops that make up Neat Formation III.",
      "Corrected Army Breaker to season X1 and Defender to the Archers troop type.",
      "Raised the minimum copies for free X1 and X2 heroes to 22; paid heroes stay at 14 and the maximum is unchanged at 34."
    ]
  },
  {
    "version": "14.3.4",
    "date": "2026-08-10",
    "highlights": [
      "Added a spent total to the research calculator, so each tech tree now reports how many War Badges and Courage Medals you have already invested next to how many are still remaining.",
      "Kept the tree footer naming its real currencies once a tree is fully maxed, instead of collapsing to a generic resource row when nothing is left to buy.",
      "Made partially levelled nodes look the same in every tech tree. Trees using the card layout only ever showed \"maxed or not\", so a half-finished node was indistinguishable from an untouched one; they now use the same idle, in-progress, and complete states as the rest of the trees."
    ]
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
