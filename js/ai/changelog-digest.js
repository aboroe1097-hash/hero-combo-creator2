// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "16.6.0";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
  {
    "version": "16.6.0",
    "date": "2026-09-26",
    "highlights": [
      "The Combos Planner's queued X8 catch-up lanes are all placed in the main combo ranking now: `js/combos-db.js` ships the finished placements as the base list, and the Combos Generator, the hero season filters and Research open with X8 selected by default alongside the other seaso…",
      "The VtsScore Growth Board is no longer tied to results. It builds from live uploads in every phase and refreshes as members upload, and every opted-in name lists every upload it ever had — date and values, newest first — including names without a valid re-upload.",
      "Previous scores are matched by in-game name first. Uploads from before accounts existed carry no uid and used to be skipped; now the name is the join and the account uid is only a last resort for names that changed. When nothing matches a saved, opting-in member's name, the form…",
      "VTS Admin → VtsScore is the window into previous members' values: the Competition #12 table loads every earlier VtsScore season, and each sign-up row shows the full upload history it maps to, values included. **Deploy the vtsScore function after this release.** The OCR Worker is…"
    ]
  },
  {
    "version": "16.5.20",
    "date": "2026-09-26",
    "highlights": [
      "Competition #12 now builds the public growth board directly from saved registrations and current and earlier VtsScore uploads whenever results are available. No admin publish or scheduled board write is needed. Only submitted registrations whose members opted into public sharing…",
      "Previous scores match the same account first. Otherwise, an exact game name is accepted only when it belongs to one earlier account and one current member; ambiguous names use registration stats. A saved, consenting member with a safe prior match sees a friendly comparison-ready…"
    ]
  },
  {
    "version": "16.5.19",
    "date": "2026-09-26",
    "highlights": [
      "The Competition #12 growth board can be built on the server. In VTS Admin → VtsScore, \"Build and publish on server\" (superadmin) has the vtsScore function build the board from the season's sign-ups and re-uploads plus every earlier VtsScore season, and publish it straight away. …",
      "Each player's baseline is their latest upload from any earlier VtsScore season. It is matched automatically when their exact name (ignoring case, spacing and the \"(VTS)\" prefix) belongs to one account; a name shared by two accounts, or claimed by two players, uses sign-up stats …"
    ]
  },
  {
    "version": "16.5.18",
    "date": "2026-09-26",
    "highlights": [
      "Registration screenshot OCR now tries DeepSeek (`deepseek-flash`, the V4.1 Flash model that reads images, with thinking turned off) first when the OCR Worker has a `DEEPSEEK_API_KEY`. Qwen stays as the fallback: `qwen-vl-plus`, then `qwen-vl-max`. It moves to the next model when…"
    ]
  },
  {
    "version": "16.5.17",
    "date": "2026-09-26",
    "highlights": [
      "Registration screenshot OCR still failed for some screenshots because the model kept writing until it hit its length limit, so its reply was cut off mid-way. The OCR Worker now keeps every value the model finished before the cut (the rest stay blank, with a note to check every v…"
    ]
  },
  {
    "version": "16.5.16",
    "date": "2026-09-25",
    "highlights": [
      "The Eden top lists (Most Banners Placed, march paths, shield walls and Most R5 Bonus Team Effort Points) show a linked banner or alt account under the player who runs it. Its banners, paths, shield walls and bonus points add to the owner's total, so ANGEL appears instead of Ange…",
      "Registration screenshot OCR no longer fails with \"OCR provider response is malformed\" when the model wraps its JSON in a sentence or code fence, splits it into parts, returns the power fields without the `extracted` wrapper, or leaves out the confidence block. A reply with no JS…"
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
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
