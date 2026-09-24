// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "16.5.2";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
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
  },
  {
    "version": "16.0.15",
    "date": "2026-09-17",
    "highlights": [
      "The Eden X1 and X2 pages load 142 KiB less CSS (805 to 663 KiB on desktop). Both import the admin dashboard stylesheet for weighted-contribution detail, so they had been downloading every admin panel style as well. The 1,144 rules no Eden page can match now live in css/ocr-dashb…"
    ]
  },
  {
    "version": "16.0.14",
    "date": "2026-09-16",
    "highlights": [
      "Fixed the mobile bottom dock slicing its own labels. \"Heroes & Combos Hub\" wrapped to three lines inside a pill that hides overflow, so the last line rendered as cut-off letter tops; labels now clamp to two lines with an ellipsis and fit.",
      "Fixed hero card badges overflowing their card at 375px, where 111px of chips had 82px to sit in and the season chip, skin chip and PAID pill collided over the portrait. The chips shrink below 480px and the paid pill keeps its gem without the word.",
      "Styled the admin suggestion filter row, which shipped in 16.0.9 with no CSS at all, so the filter pills sat on top of the \"Show\" label. Show all and Approve all also stayed on screen with nothing to act on, because a dashboard rule outranked the browser's own [hidden] handling; …",
      "That guard also restores two hidden states the same specificity bug had been defeating: the superadmin-only dashboard navigation no longer renders for admins who are not superadmins, and Publish and Unpublish no longer appear on an archived workspace that cannot accept either.",
      "Eden X2 scoring: Kika's two decorated main-account spellings now pool into her family, and Take Ur Shin, the account now named Anne, pools into Anne's family together with its conduct penalty. That leaves no answered name scoring for nobody.",
      "Banner, Pather and Shield Wall review rows have an \"Add name\" control for a target that used two banners. It adds a second row for the same target, time and group; when the uploaded cell already holds two names (\"Anne, Roha\") the row splits between them. Comma-separated cells al…"
    ]
  },
  {
    "version": "16.0.13",
    "date": "2026-09-15",
    "highlights": [
      "Added the Class Development Hub: the four L96 class roadmaps (Raider, Farmer, Trader, Craftsman) with a next-reset navigator and each sheet's red reset priorities, all re-read from the source sheets. Farmer's late priorities had been shifted one checkpoint, and Craftsman's carri…",
      "Added the Eden Operations Lab to the Eden Hub: specialty route planning, Honor needed for levels 1–143, Honor Boost against Special Training, building material costs with discounts, Coalition Camp tiling and objective staffing, with CSV, PNG and plan exports, in all twelve Eden …",
      "Added DM equipment guidance: offensive and defensive six-piece priorities and the set-bonus do's and don'ts.",
      "Corrected the Lofty Warrior research data: the final Might tier is 40%, three level-2 costs are 840, and the Archer and Cavalry research names are back on the right troops.",
      "Eden X2 demolition and duty credit no longer score for nobody. OCR spellings that split one player across contribution and demolition rows now join their account, which returned about 3.5M demolition to weighted scores; one row read twice from overlapping screenshots is counted …",
      "Banner and Pather uploads in Eden X2 suggest names again, and an operator note in a duty cell earns credit when it names a player the season already knows. Both asked a roster that X2 never had; they now use the names the season already holds."
    ]
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
