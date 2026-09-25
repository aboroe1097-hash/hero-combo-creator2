// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "16.5.12";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
  {
    "version": "16.5.12",
    "date": "2026-09-25",
    "highlights": [
      "**The War Council.** After the third, sixth and ninth wave — every third wave in Endless War — pick one of three boons for the rest of the run: Ember Heart (fire burns 40% harder), Frost Grip (ice slows bite deeper and hold longer), Swift Wings (faster movement, shorter dash coo…",
      "**Elemental reactions.** Ice onto a burning foe **shatters** it (bonus damage, armour ignored, the burn is consumed); fire onto a slowed foe **melts** it (double burn, slow cleared); three slows in a row **deep-freeze** a foe in place for a moment; and a burning foe that dies **…",
      "Wing swaps now sit on a 2.5-second cooldown and the wing buttons dim while it runs, so committing to an element is a decision rather than a toggle."
    ]
  },
  {
    "version": "16.5.11",
    "date": "2026-09-25",
    "highlights": [
      "**Velo aims where you aim.** Keyboard and mouse players now fire in the direction they aim — the mouse aims at the point under the cursor — instead of the old auto-lock on the nearest enemy. Touch players keep the assist on purpose: shots still bend to a foe inside a narrow cone…",
      "**Six enemy roles make waves read as armies.** The shieldwall blocks bolts that hit its front but not splash, fire or a flank; the skirmisher kites and shoots; the saboteur hunts your towers and ignores the stronghold while any tower stands; the herald buffs nearby foes; the hau…",
      "**Wave omens.** From the third wave on (every wave in Endless War), choose the omen the next wave carries, or take none: Iron Tide (every foe armoured, +60% gold), Fog of War (+40% score), Blood Moon (faster foes, slower chains, +50% score) or Mirror Ice (ice barely bites, +80% …",
      "**Feats.** Six named one-off challenges — Wingborne, Ashfall, Cold Calculus, Untouched, Warlord's Bane and Architect — are tracked in the browser, listed on the title and results cards, and announced the moment one is earned.",
      "Fixed: on phones under 560 px wide the tower build picker was pushed below the arena and clipped; it now sits above the thumb controls where it belongs."
    ]
  },
  {
    "version": "16.5.10",
    "date": "2026-09-25",
    "highlights": [
      "The arcade's real-time game is now **Velo's Rampart** — renamed from Eden Siege everywhere it appears, in all 13 languages, so it no longer reads like one of the Eden tools beside Eden Hub and Eden Map. The address stays `eden-siege.html`, so old links keep working. The mode chi…",
      "The game's ready screen is a living title scene: a slow camera drift over the rampart while Velo waits, with the game title over it. Reduced-motion players get the same scene without the drift.",
      "**Share run** now makes a share card image — score, stars, wave, seed and a drawn Velo emblem — offered to the phone's share sheet where available and downloaded as a PNG otherwise. The share line still goes to the clipboard.",
      "The arcade's next releases are planned in `docs/plans/arcade-revival.md`: aim rework with touch assist, enemy roles and wave modifiers, the pick-1-of-3 draft with elemental reactions, hero lineups from the real combo data, ghost replays and share links, the Alliance Daily league…"
    ]
  },
  {
    "version": "16.5.9",
    "date": "2026-09-25",
    "highlights": [
      "Exports no longer carry a \"Sources\" credit line. CSV, JSON, PNG and the downloadable PDFs name the tool, version and time only. The author byline on the Eden Operations Lab source cards, the author credit on duel-record provenance lines and the other credit lines on the Building…",
      "The VTS Admin all-data CSV is fixed. Every footer line is one quoted cell, so a comma no longer spills into a second column, and the footer no longer runs into the last data row. Dates stored as Firestore timestamps are written as ISO 8601 instead of raw timestamp code, and a ne…",
      "The all-data CSV now also includes the player registry and account links (owner and account type), taught aliases, \"always main\" accounts, contribution matches, conduct suggestions (status, suggested by, reviewer), duty point weights and scoring multipliers, reward settings, vot…",
      "The duty debug CSV has a \"Scored As\" column holding the exact name the weighted score credits for each row. When an account link carries the credit to its owner, Match Status reads \"linked\" and Scored As names the link type (alt/banner or secondary). \"Likely\" now means only a fu…",
      "The duty spelling \"q.Immortal\" (without the space) now counts for the same account as \"q. Immortal\", following the owner's earlier answer. Before, duty rows confirmed with that spelling scored to a separate account that no leaderboard row showed.",
      "Account links: every row in the Linked accounts list has an Edit button. It changes the account name, who runs it and the type in place, refuses duplicates and self-links, and saves and rescores the same way as adding a link."
    ]
  },
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
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
