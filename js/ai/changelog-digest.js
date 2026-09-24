// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "16.5.5";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
  {
    "version": "16.5.5",
    "date": "2026-09-24",
    "highlights": [
      "Clicking a reward category on the Eden season view now takes you to its table. The scroll only happened on phones before, so on a laptop the card swapped the table in below the fold and looked like nothing had happened; it now scrolls whenever the table is not already on screen.…",
      "Reward names on the Eden season view are clickable: the final Top list names the same players as every other table on the page and now opens their detail the same way. On a phone each name is a full-height tap target, and the downloaded announcement image stays without link unde…"
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
  },
  {
    "version": "16.0.18",
    "date": "2026-09-22",
    "highlights": [
      "Voting has short links: roc-vts.com/vote opens the Eden X2 ballot directly, and roc-vts.com/eden opens the season. Inside the site, #vote and #season do the same through the Eden Hub.",
      "The Eden X2 season summary has a Vote now button while voting is open. On phones the ballot now sits right after the summary instead of below the reward tables, the section chips are one swipeable row, and the reward cards are compact.",
      "The Eden Hub opens the current season as a full-screen pane, lists Current Season first, keeps the open tab in view on phones, and shows one Velo button instead of two. A shared season link now opens the season instead of Royal Bounty.",
      "Superadmins can count one candidate's team votes for another player, such as a banner account's votes for the player who runs it. Totals, the CSV export, and public results all follow the redirect.",
      "The vote admin panel and the Eden X2 page title name the active season instead of always saying Eden X1.",
      "The duty scoring weights panel is a compact table with a points example, and the demolition setting is a clear on/off switch."
    ]
  },
  {
    "version": "16.0.17",
    "date": "2026-09-22",
    "highlights": [
      "Pather and banner cells now count one duty per player family, so Lady Zubbs and her Zubbs account no longer turn seven duties into ten. The admin list summary follows the same rule.",
      "Eden X2 management rankings now read the current Google Sheet's `VoteResults` tab. Kiji, Loonly, Redbull, stylized ANGEL, and Victoria/Kika names resolve to their player families.",
      "Superadmins can choose whether demolition points contribute to dashboard totals while keeping demolition activity visible.",
      "Superadmins can delete an individual Eden X2 voting ballot from the admin results table. The ballot is removed from totals and a deletion is recorded in the immutable edit history."
    ]
  },
  {
    "version": "16.0.16",
    "date": "2026-09-18",
    "highlights": [
      "Shield Wall lists can now be uploaded as screenshots, the same way Banner and Pather lists are: an Upload Image button, a drop zone and a scanning indicator, in all twelve admin languages. Before this, Shield Wall only took typed or pasted names.",
      "Shift headings in a Shield Wall list (\"Morning\", \"Evening:\", \"Night\", \"Shift 2\") now become the row's group instead of being read as a player called \"Morning\". A player on both shifts keeps a row, and a Shield Wall credit, for each one. The image reader was also told to keep tho…"
    ]
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
