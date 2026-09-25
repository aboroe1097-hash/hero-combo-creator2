// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "16.5.16";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
  {
    "version": "16.5.16",
    "date": "2026-09-25",
    "highlights": [
      "The Eden top lists (Most Banners Placed, march paths, shield walls and Most R5 Bonus Team Effort Points) show a linked banner or alt account under the player who runs it. Its banners, paths, shield walls and bonus points add to the owner's total, so ANGEL appears instead of Ange…"
    ]
  },
  {
    "version": "16.5.15",
    "date": "2026-09-25",
    "highlights": [
      "Competition #12 registration no longer asks for the two long optional text answers or an OCR acknowledgment checkbox. Existing answers remain preserved when a member edits a saved registration; signed-in members can start with the game name saved on their account.",
      "The Competition #12 growth board mount point remains visible throughout the season and checks again for a published board when results are ready. The member-controlled sharing checkbox remains off by default.",
      "Stats OCR now leaves individually unreadable or out-of-range values blank with a review warning; malformed provider JSON or a missing extracted-data object still fails. Published Combos rankings can be read without signing in; only a superadmin can publish them."
    ]
  },
  {
    "version": "16.5.14",
    "date": "2026-09-25",
    "highlights": [
      "VTS Admin has a Combos tab (Beta) running the Combos Planner: the full ranking with its filters, an overlap check, and every lineup editable (rename heroes or skin, reorder, remove). The same planner runs on a PC with `npm run combos:plan`.",
      "Placing new X8 lineups is fast: each unplaced lineup gets a suggested slot with its reason (for example \"above #58 · shares Lawman + The Avalanche\"), learned from similar lineups and from the placements already made, and paid lineups keep their place above free ones. Keys: J/K t…",
      "The planner shows about 35 compact rows at once, focuses the ranking around the lineup being placed, groups the queue by X8 hero with progress, places several lineups as one block, drafts every suggestion in one undoable step, keeps an automatic draft, accepts a pasted list of l…",
      "A superadmin can publish the ranking live from VTS Admin: players get it on their next page load without a site update, the Combo Generator, Hero Atlas and counter tables follow it, and \"Use shipped list\" switches back. The site checks every published lineup and keeps the shippe…"
    ]
  },
  {
    "version": "16.5.13",
    "date": "2026-09-25",
    "highlights": [
      "Velo graduates to **Velo 1.0**. The chat header's \"Beta 0.4\" badge becomes a plain \"Velo 1.0\" version mark in every language — a version number needs no translation — and the internal b0.4 build number is retired from the assistant's own answers, the toolkit map, and the system …",
      "The command palette (Ctrl/Cmd+K) now finds **Talk with Velo** and opens the assistant drawer from there through the same lazy loader the floating launcher uses, so no page pays for the drawer until someone asks for it. Closing the drawer returns keyboard focus to the palette tri…",
      "The chat's copy button and source chips reach the 44-pixel touch target on phones instead of 32-pixel rows that were hard to hit, and answer tables no longer force sideways scrolling on 320-pixel screens — a narrow table now shrinks with its wrapper while wide answers keep their…",
      "Velo knows the whole site now. Its toolkit map adds VtsScore / Competition #12, the Buildings planner, Eden Pathing, the Eden Operations Lab, the hub PDF tabs, the current Eden X2 season page and the Issue or Complaint form (the page every footer's \"Contact Devs\" link opens), an…",
      "New read-only answers: Competition #12 phase, next deadline and every phase's open and close time, in game time (UTC−2) and your own time, plus the BoH and Epic slot times; Castle 26–30 resource costs and any building's 26–30 Orichalcum and prerequisites, with blank sheet cells …",
      "**My Competition #12.** With a new \"My Competition #12\" permission in Velo's privacy settings, a signed-in member can ask about their own registration: which power fields are filled, ROC level, chosen BoH and Epic times, and their own baseline and growth once the board is publis…"
    ]
  },
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
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
