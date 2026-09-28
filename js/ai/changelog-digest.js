// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "16.6.12";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
  {
    "version": "16.6.12",
    "date": "2026-09-28",
    "highlights": [
      "Anonymous complaints no longer leave any stored record that ties them to an account. Filings go through a new `fileComplaint` Cloud Function instead of being written by the browser: the old path had to stamp a per-account throttle record at the exact moment of the complaint, whi…",
      "The public growth board is cached for a minute in the vtsScore function, and requests that arrive together share one rebuild, so repeated page loads no longer re-read every sign-up and past upload.",
      "The Competition #12 phase sync can be paused: a future `phaseSyncPausedUntil` on the season config stops it from overwriting a manual open or close for that long, and saving the season form keeps the pause.",
      "Velo's Rampart accepts `?date=YYYY-MM-DD` to replay a given day (its seed and, for the Daily Siege, its map), and the browser test pins its date, so CI no longer passes or fails depending on the day's seed."
    ]
  },
  {
    "version": "16.6.11",
    "date": "2026-09-27",
    "highlights": [
      "The admin signup table and the VTS Admin growth table flag rows whose dead-troop values were never entered (\"No dead values\"). An untouched member editor saves an all-zero map and a hand-filed row saves none at all; either way the player's comparison is missing a component worth…"
    ]
  },
  {
    "version": "16.6.10",
    "date": "2026-09-27",
    "highlights": [
      "Reverted the account-id baseline join from 16.6.9: matching is by in-game name again (exact, then the confirmed-alias loose key). One browser or account often files uploads for several people — a member uploading for a friend carries their account id — so a shared account id had…"
    ]
  },
  {
    "version": "16.6.9",
    "date": "2026-09-27",
    "highlights": [
      "Competition #12 ranks sign-up → final upload now: winners and standings use that Total Power growth, and the last-season comparison becomes the personal growth tracker. Until the first final upload lands the tracker ranks the board so the standing stays alive, the projection car…",
      "Growth baselines join in order of confidence: the account id (the upload document id is the sign-up uid its numbers belong to), the exact in-game name, then a loose key that resolves owner-confirmed aliases and drops decorations (\"〽️ Anne〽️\", \"~Sarafino~\"). Accounts the owner se…",
      "Sign-up assist: the name field suggests the closest known names (this season's sign-ups and every earlier upload, canonical spellings only) and warns when the typed name is already registered this season. The score picker marks your own row \"(you)\" so twin names cannot be mixed …",
      "Sign-up admin: rows show whether leadership added them or the member filed them (the writer marker, not entryMethod), each chosen time renders as its own badge instead of one \"›\" string, and the edit form refuses member-filed rows instead of overwriting the fields it cannot show.",
      "The rules emulator pins the heaviest OCR sign-up (30 known names, 20 warnings, the full confidence map) as a create and an update, and the total JS budget moves by the measured minimum. **Redeploy the vtsScore and bohSignupAdmin functions after this release.**"
    ]
  },
  {
    "version": "16.6.8",
    "date": "2026-09-27",
    "highlights": [
      "The Eden X2 hub's invitation card is now the VTS Competition section: the old \"Season signup / Sign up for the 2027 season\" kicker and title read \"Competition / VTS Competition\" in every locale, and the copy describes the competition registration — baseline, role, fight times an…"
    ]
  },
  {
    "version": "16.6.7",
    "date": "2026-09-27",
    "highlights": [
      "The VtsScore language picker offers all thirteen languages. Croatian, Indonesian, Italian, Korean, Russian, Turkish and Chinese were translated in 16.6.5 but never added to the page's selector, so members could not choose them. A unit test now keeps the picker and the translatio…"
    ]
  },
  {
    "version": "16.6.6",
    "date": "2026-09-27",
    "highlights": [
      "Dead troops stay in the numbers. The Growth Board stripped the dead-troop component out of the sign-up and final upload whenever the baseline had no dead-troop split, hiding the power members had just entered. Troop Power and Total Power now show and compare the full saved total…",
      "Growth board wording and layout: the baseline column reads \"Last season data\" for earlier uploads, \"Final upload\" replaces \"Re-upload\", the sign-up is named as the baseline once that record is what a player is measured from, and the Growth columns no longer get cut off at the ri…"
    ]
  },
  {
    "version": "16.6.5",
    "date": "2026-09-27",
    "highlights": [
      "The Growth Board compares every waypoint a player has: the earlier season's upload, today's sign-up record and the growth re-upload once its window opens. Each row shows baseline → sign-up, sign-up → re-upload and baseline → re-upload changes for all nine power fields, so a memb…",
      "\"I have dead troops to count\" starts checked on registration and score review, and the helper opens in thousands.",
      "VtsScore and the Growth Board speak all 13 site languages: Croatian, Indonesian, Italian, Korean, Russian, Turkish and Chinese join the existing six."
    ]
  },
  {
    "version": "16.6.4",
    "date": "2026-09-27",
    "highlights": [
      "Season registration saves again for members who record dead troops. The submission rules checked all fifteen counts with separate bound clauses, and that chain crossed Firestore's 1,000-expressions-per-request ceiling, so every create or edit carrying a dead-troop breakdown was …",
      "The dead-troops helper opens in thousands, matching the K counts on the game's dead-troop screen, and each tier row shows its power per troop (×8.2 Lofty, ×7.5 T10, ×7.0 T9). Saved sign-ups reopen in the same unit.",
      "Lady Zubbs and MalakKiji carry the R4 management tag wherever public player labels render, including Eden X2."
    ]
  },
  {
    "version": "16.6.3",
    "date": "2026-09-27",
    "highlights": [
      "The Competition #12 growth board matches baselines by in-game name alone. Season-2026 uploads from before accounts existed now bind as each player's baseline instead of being skipped for a missing uid or dead-troop split, so the board shows real comparisons rather than \"not rank…",
      "A legacy baseline (an upload or sign-up from before the dead-troop split) is the alive reading only, so those rows compare alive-to-alive: the re-upload's dead-troop component is removed from Troop Power and Total Power before growth is computed. A baseline that carries the spli…",
      "Every board row opens a full comparison: summary cards for total change, growth without troops and the biggest driver, then a table of baseline, re-upload, change and change % for all nine power fields. A consenting row without a re-upload still shows the baseline it will be mea…",
      "VTS Admin → VtsScore gains a two-player comparison that keys on the account, not the name: pick any two sign-ups and read every category side by side, with the higher current value marked.",
      "VTS Admin → Signups can delete a sign-up and its final upload in one atomic write, for a bad or duplicate entry. The button asks for confirmation and names the player, and both deletes are **superadmin-only** in the rules. **Redeploy Firestore rules after this release.** A publi…"
    ]
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
