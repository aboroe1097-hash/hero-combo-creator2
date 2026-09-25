// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "16.5.8";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
  {
    "version": "16.5.8",
    "date": "2026-09-25",
    "highlights": [
      "Eden Operations Lab counters now sync across members and devices with shared Firestore-backed totals and access rules. Eden Pathing uses the confirmed rule of 40 tiles per pather, with the estimate presented alongside the occupied-tile count."
    ]
  },
  {
    "version": "16.5.7",
    "date": "2026-09-25",
    "highlights": [
      "Community Hub PDFs are one simple screen: pick what to include, the detail level and a dark or light theme, then press Download PDF or Download image. Files download directly, with no print dialog, paper-size or orientation settings. Hero sheets are dense, with small portraits a…"
    ]
  },
  {
    "version": "16.5.6",
    "date": "2026-09-25",
    "highlights": [
      "Heroes PDFs now offer three designs — Dark Dashboard, Midnight Briefing and Compact Reference — with landscape defaults, the VTS crest and wordmark in the header, real hero portraits in the top-combo lineups and beside every roster row, troop-coloured group headings, rank badges…",
      "The combo database carries the X8 catch-up bracket again: 82 formations that need at least one X8 hero, restored from the name-matched X8 availability set that was dropped when the database was limited to S0-X2. Every lane records the tier and source score it was ranked by, and …",
      "Competition #12 now uses the correct game time. Game time is UTC−2 (06:00 in Dubai is 00:00 game time, the same clock as the site header), but the competition schedule, the VTS Admin schedule panel and the member page's phase countdown were using UTC+2, so every competition time…",
      "The Competition #12 schedule panel can fill a 2-week default. Pick a start date (the next game day by default) and press **Fill 2-week default**: registration runs days 1–2, the final check until the end of day 4, the growth re-upload on days 13–14 and the winners' display on da…",
      "The VTS Admin attack log's Daily and Weekly filters use the same UTC−2 game day. Between 22:00 and midnight game time the Daily filter used to jump to the next day and hide the current day's attacks, and the Weekly filter rolled over on Sunday at 22:00 instead of midnight.",
      "The schedule panel shows game time next to your own time: each row reads \"Game 2026-10-01 00:00 (UTC−2) · Your time: …\", and a live line shows the current game time and your time."
    ]
  },
  {
    "version": "16.5.5",
    "date": "2026-09-24",
    "highlights": [
      "Eden Pathing now counts the tiles a route actually occupies instead of adding up the length of every leg, so a route that crosses itself or doubles back no longer reports the same ground twice. The panel shows the occupied tiles, how many were walked twice, and an estimated path…",
      "Filing a complaint no longer asks a signed-in member to retype their name: the in-game name from their account is already in the field, and stays editable because the complaint may be about someone else. Filing anonymously still hides the whole identity block, so nothing is atta…",
      "The Support Work reward quota now covers the guild-master reward instead of sitting under it: with \"The R5\" chosen and an R5 named, a quota of 6 rewards the R5 plus 5 others, where it used to reward the R5 plus 6 and show 7 rows. The Support Work table, the announced total and t…",
      "Clicking a reward category on the Eden season view now takes you to its table. The scroll only happened on phones before, so on a laptop the card swapped the table in below the fold and looked like nothing had happened; it now scrolls whenever the table is not already on screen.…",
      "Reward names on the Eden season view are clickable: the final Top list names the same players as every other table on the page and now opens their detail the same way. On a phone each name is a full-height tap target, and the downloaded announcement image stays without link unde…",
      "The recent adjustments list in VTS Admin can now be filtered by which bonus or penalty an adjustment is: Banner help, Connected road, Extra effort, Merit - other, Blocked path, Toxicity, Ignored coordination, Penalty - other, and the two premium flags. Before this, a season of m…"
    ]
  },
  {
    "version": "16.5.4",
    "date": "2026-09-24",
    "highlights": [
      "VtsScore is now **Competition #12**, a pre-season growth competition. Members sign up with their BoH time slots (+8, +12, +14, +20) and Epic Showdown time slots (+10, +13, +16, +19) in order of preference, all in game time, and can opt in to the public comparison. Each player is…",
      "VTS Admin: superadmins set the competition's start, phase-one close, deadline, re-upload window and winners start/end in game time. A scheduled job opens and closes sign-ups and re-uploads at those instants.",
      "Eden Hub gained **Eden Pathing**, a route planner on the Eden map with PNG export, and Eden Map routes can be played back step by step.",
      "Heroes & Combos, Research & Towers, Class Development and Eden each have a **PDFs** tab that builds a printable document from your choices (season, troop, focus, paper size, level of detail), with numbered sections, repeated table headers and page numbers. Unknown values print a…",
      "Eden Siege fun pass: five tower tiers, armoured, swift and shielded enemies, warlord boss waves, Velo's dash and ultimate, a training wave, endless mode and a Daily Siege with the same seed for everyone. Runs end on a results screen with stars and recent runs saved in the browse…",
      "Motion: Specialization Towers draw the connectors between nodes, the research planner shows a cost curve, Arcade gives hit feedback, and combo PNGs carry a background generated from the combos."
    ]
  },
  {
    "version": "16.5.3",
    "date": "2026-09-24",
    "highlights": [
      "Downloads and the Buildings planner now follow the selected site language across all supported locales, and Eden Siege has complete localized game copy for all 13 locales.",
      "Eden's light theme uses darker frost accents, and the vote countdown is translated instead of showing English day/hour abbreviations.",
      "Velo stays clear of phone content while scrolling, returns when users scroll up or focus it, and the install prompt controls meet the 44-pixel touch target.",
      "Velo's Eden guide, scoring and season answers now use the published Eden X2 projection, report requested-season mismatches, and never reuse X1 management-vote data."
    ]
  },
  {
    "version": "16.5.2",
    "date": "2026-09-24",
    "highlights": [
      "One look across the standalone tools: VtsScore, Downloads, Arcade, Eden, Eden Siege, Specialization Towers and Battle Simulator share the same footer and link set, and VtsScore and Downloads gained the branded bar with Back to tools. Eden's deck button now reads Back to Tools, a…",
      "More tools lists PDF downloads and Buildings; Buildings opens Planners ▸ Castle directly (#researchTowers?subtab=research&planner=castle).",
      "Research planner: a full visual pass — sub-tab pills, cards, styled fields, stat tiles for remaining costs, scrollable tables with sticky headers, and a progress bar per path node — for dark and light themes, phones and right-to-left languages.",
      "Specialization Towers: every node now shows its medal cost from the community workbook for all three troops (735 nodes each), where it used to say the cost was unknown. Repeated node names at different strengths are matched by the strength the workbook states, and five naming di…",
      "Eden Operations Lab: a task board with six common jobs filtered by season stage and role, a saved three-step checklist per job, one-tap Critical/Essential/Advanced specialty routes, attacker and support counters for the chosen siege objective, links into Eden Map and Loyalty, an…",
      "Duty list PNGs no longer carry a data-sources line: they are the alliance's own records. Exports whose credit list does not fit now point to the site instead of naming only the first contributor."
    ]
  },
  {
    "version": "16.5.1",
    "date": "2026-09-24",
    "highlights": [
      "Fixed: the site could fail to open with \"This site can't be reached\" in a browser whose offline cache storage was damaged. The offline helper now treats every cache read and write as optional, so the page always loads from the network when the cache cannot be used, and the fixed…"
    ]
  },
  {
    "version": "16.5.0",
    "date": "2026-09-23",
    "highlights": [
      "Motion and visual-craft release. Hubs gained a one-shot card entry and a pointer spotlight, tab changes cross-fade the incoming panel where the browser supports View Transitions, and the loader settles once when loading really completes.",
      "Confirmed actions now get a short celebration: a saved combo, a copied or shared link, and a saved Eden vote. Nothing is celebrated until the existing action has already succeeded, and reduced-motion or Save-Data sessions keep the same success text with no particles.",
      "The top combo result's shimmer runs twice instead of looping forever, and the open hero detail card follows the pointer with a small capped tilt.",
      "Heroes: the Atlas gained a season timeline. It lists the canonical hero-release seasons with hero counts that reconcile with the season filter, links each season to its shareable deep link, is a vertical list on phones, and stays readable at 320px, in both themes, and under redu…",
      "Buildings: added Castle 26–30 direct costs across Orichalcum, gold, food, lumber, charcoal, marble and iron, plus a searchable planner for the 43 buildings and their level costs, prerequisites and final-level bonuses. Missing sheet cells remain unknown, and the sheet's mismatche…",
      "Room to breathe: removed unused atmosphere utilities and four dead tokens (about 3 KiB of entry CSS) and lowered the entry CSS ceiling by the measured amount."
    ]
  },
  {
    "version": "16.0.19",
    "date": "2026-09-23",
    "highlights": [
      "Every player in the weighted tables opens a season view, in VTS Admin (Dashboard and Contributions) and on the public Eden page, including players with no structure hits. It shows the final rank, weighted score and reward, a bar of what the score is made of, the itemised score, …",
      "The score breakdown (the weighted score popover and the season view) lists each duty type separately for main and alt / banner accounts, with the count, weight and points behind it (for example \"4 × weight 3 × 10,000 = 120,000\"), shows how the demolition points were counted or t…",
      "Banner, pathing and shield wall cells in the weighted tables show how many of the duties came from alt or banner accounts (for example \"11 · 3 alt\").",
      "The public \"Top names to review\" lists have separate Most Banners Placed and Most Paths & Speed Tiles lists instead of one combined list. On wide screens the six lists sit in two rows of three; on phones they are one swipeable row.",
      "The Eden season page does less work while loading: on a mid-range phone profile, main-thread blocking fell from about 5.8 s to 2.4 s and the weighted table appears about 2 s sooner. Name matching no longer rebuilds its 300-entry alias table or re-checks a whole attack's player l…"
    ]
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
