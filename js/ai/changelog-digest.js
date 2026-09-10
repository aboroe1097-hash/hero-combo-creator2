// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "16.0.13";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
  {
    "version": "16.0.13",
    "date": "2026-09-09",
    "highlights": [
      "Eden X2 no longer shows Eden X1's management winners as its own. The R4/Management names come from a single Google Sheet that covers all of Eden rather than from a season's own documents, and that loader was the one results path not gated on the season's Show public results sett…"
    ]
  },
  {
    "version": "16.0.12",
    "date": "2026-09-08",
    "highlights": [
      "Fixed every duty weight save failing with \"Missing or insufficient permissions\". The weights document shipped without a Firestore rule, so it could be neither written nor read. Admins may now read it and superadmins alone may change it, and its shape is validated rather than tru…",
      "Fixed pathing points missing from Alliance View totals. That table recomputed duty points from the raw counts at a flat value, discarding the weighting it had already been handed, so pathing on a main scored 10,000 instead of 30,000. It now uses the computed points, keeps the fl…"
    ]
  },
  {
    "version": "16.0.11",
    "date": "2026-09-08",
    "highlights": [
      "Duty points are now weighted by activity and by which account performed the duty, replacing a flat value that made a banner from a throwaway alt worth exactly what a main was worth. Defaults are banners 1 for a main and 0.5 for an alt, pathing 3 and 1; shield walls stay at 1 for…",
      "Added a superadmin editor for those weights, stored per Eden workspace so retuning the season being played cannot restate a finished season. Saving recalculates the season immediately, past entries included, because duty points are derived at render time rather than stored."
    ]
  },
  {
    "version": "16.0.10",
    "date": "2026-09-07",
    "highlights": [
      "Added the X2 Lobby structure to structure uploads, expected at 700,000. Lobbies are named for a hero, so \"Lobby of Beowulf\" and any other hero all resolve to Lobby, and like Stronghold they carry no level.",
      "Corrected the expected durability of a level 4 gate from 2.5M to 1.5M. The wrong figure flagged correct uploads as mismatched on every Lv4 gate."
    ]
  },
  {
    "version": "16.0.9",
    "date": "2026-09-07",
    "highlights": [
      "Admin suggestions now open on the pending queue, ten at a time, with filters for pending, approved, rejected or all, and a control to show the full filtered list. A season of decided suggestions no longer buries the few still waiting on a decision.",
      "Added Approve all, which approves exactly the suggestions on screen. It asks once, naming the count, reloads once instead of per row, and reports how many succeeded if any fail part-way rather than claiming a clean run."
    ]
  },
  {
    "version": "16.0.8",
    "date": "2026-09-07",
    "highlights": [
      "The VTS Eden Hub season tabs now name their season — \"Current Season · Eden X2\" and \"Previous Seasons · Eden X1\" — in all twelve Eden locales. The names come from the workspace registry, so opening a new season is one flag in that registry rather than an edit in every locale pac…",
      "The season being played is now the hub's landing tab, with the Royal Bounty guide as the fallback when no season is published. The guide opens first and the hub upgrades to the season once the publication check clears, abandoning that upgrade if you have already picked a tab you…"
    ]
  },
  {
    "version": "16.0.7",
    "date": "2026-09-07",
    "highlights": [
      "Allowed VTS Admin to reach the setUserRole Cloud Function. With the SDK-instance fix in place the callable finally resolved, and the browser then refused the connection: admin.html's Content-Security-Policy never listed cloudfunctions.net, though index.html has always listed the…"
    ]
  },
  {
    "version": "16.0.6",
    "date": "2026-09-07",
    "highlights": [
      "Removed the dead Firebase importmap from the Home, VTS Admin and VtsScore pages. It pinned firebase/* to gstatic 11.6.1 and resolved nothing — every page here is a Vite input, so bare specifiers are rewritten at build time — but it stood ready to load a second copy of the SDK be…"
    ]
  },
  {
    "version": "16.0.5",
    "date": "2026-09-07",
    "highlights": [
      "Fixed every role grant in Users & Roles failing with \"Service functions is not available\". The setUserRole bridge loaded firebase-functions from the gstatic CDN while the app itself is built from the bundled SDK, and a CDN module is a separate instance of @firebase/app: it regis…"
    ]
  },
  {
    "version": "16.0.4",
    "date": "2026-09-07",
    "highlights": [
      "Fixed sign-in reporting a failure after it had already succeeded. The profile re-render shared one try/catch with the sign-in call, so a Firestore hiccup while loading the freshly signed-in account announced \"Something went wrong. Try again.\" on the sign-in form. Members read th…",
      "Unrecognised sign-in errors now name themselves. Every distinct failure used to render as the same bare sentence, so a screenshot could not distinguish a network drop from a permission error. The translated sentence now carries the error code; the raw Firebase message is still n…"
    ]
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
