// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "16.6.2";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
  {
    "version": "16.6.2",
    "date": "2026-09-26",
    "highlights": [
      "The dead-troops calculator is available during Competition #12 registration for screenshot and manual power entry. It uses the compact Footmen, Cavalry, and Archers editor, defaults to exact counts, and previews the power added to Troop Power and Total Combat Power.",
      "The unlocked Growth Board is visible near the top of VtsScore during registration as well as later phases.",
      "Smart Generate is a single prominent option before Generate Best Combos and uses the best four of five lineups. The homepage Eden voting callout and Arcade game banner open their intended destinations.",
      "Continue with Google from Create account can sign in to an existing Google account even when Firebase does not return a reusable credential from the linking popup."
    ]
  },
  {
    "version": "16.6.1",
    "date": "2026-09-26",
    "highlights": [
      "The VtsScore power form has a dead-troops helper. Members whose troops died tick \"I have dead troops to count\", choose Footmen, Cavalry, or Archers using the sword, horseshoe, and target icons in the game's left-to-right order, then enter counts for the five tiers shown on the g…",
      "The homepage callout now sends members to the Eden page to vote for the best members instead of promoting Velo's Rampart; the Arcade lobby keeps its own Rampart banner.",
      "Hero info panels start hidden: the \"Show Hero Info Panels\" toggle is off by default now, and each visitor's choice is still remembered.",
      "Smart Generate joins the Combo Generator. Unlike Generate Best Combos, which takes the greedily highest lineups, Smart #1 shows five lineups whose best four total as high as possible (the fifth only has to fit) and Smart #2 maximises the total of all five, which can leave the ro…",
      "The VtsScore Growth Board stays hidden until VtsScore is unlocked instead of loading for every visitor.",
      "The VTS Admin growth preview reads earlier seasons correctly again: the season parents are not documents, so a plain listing saw no prior seasons and every baseline fell back to sign-up values. It now reads the uploads as a collection group and falls back to the 2026 baseline se…"
    ]
  },
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
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
