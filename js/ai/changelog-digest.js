// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "16.6.19";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
  {
    "version": "16.6.19",
    "date": "2026-10-11",
    "highlights": [
      "Let Admins submit reviewed screenshots or typed powers for existing members in VtsScore and 2027 signup review, preserving signup answers and consent, recording the operator/reason, and requiring explicit late-final approval.",
      "Make VTS Admin more compact on phones, add a grouped tool picker, retain selected tools in shareable URLs, and clarify season versus alliance-wide records.",
      "Improve season creation, publication recovery and website-health form spacing in both themes; label working previews accurately and move signups into alliance operations.",
      "Restore keyboard access to every admin tool group and skip unavailable leadership tabs; require confirmation before removing diagnostic reports.",
      "Rehearse season creation, management-results import, publication, operation conflicts and ordinary-Admin throne assignments in isolated browser fixtures."
    ]
  },
  {
    "version": "16.6.18",
    "date": "2026-10-11",
    "highlights": [
      "Restore existing X2 management vote results during publication by importing the legacy Sheet once when cloud results are missing; preserve reviewed imports and independent vote-count privacy.",
      "Stop publication with an actionable error if the import fails, and protect concurrent CSV edits and voting-season changes."
    ]
  },
  {
    "version": "16.6.17",
    "date": "2026-10-11",
    "highlights": [
      "Add a prominent Start X8 season flow that creates isolated draft dashboards, uploads, voting controls and public Eden hubs without a deployment; future seasons use the same routes.",
      "Reorganize VTS Admin around season work, alliance operations and Super Admin controls, with private previews and explicit publication status.",
      "Publish complete cloud snapshots atomically, retain immutable publication revisions for rollback, and enforce archived-season protection in Firestore.",
      "Fix authoritative role listing, Super Admin self-demotion, stale role authorization and session revocation on demotion.",
      "Add versioned workspace backup/restore coverage, dry-run recovery, concurrent-edit protection, per-season scoring and management-vote CSV imports.",
      "Add expiring operational notices and pause controls, error triage, durable error-report retries, scheduled availability checks and an administrator handover guide."
    ]
  },
  {
    "version": "16.6.16",
    "date": "2026-10-09",
    "highlights": [
      "**Artifact planner redesigned.** On wide screens the Sword of Judgment lies on its side next to a pinned inspector, so the whole tree fits in one view instead of a tall column of art beside a narrow sidebar; phones keep the upright sword. Nodes are larger and show at a glance wh…",
      "**DM Materials planner reorganized.** The plan settings, overall progress and save/export/share now sit on one bar at the top, followed by the route choice. Below them, the six-piece set and the recipe have the main column, and one sidebar holds the next step, resources and owne…"
    ]
  },
  {
    "version": "16.6.15",
    "date": "2026-10-09",
    "highlights": [
      "Admins can hide the Competition growth board. The Signups tab has a **Show the growth board to members** switch (any admin); while it is off the vtsScore function serves no board at all, not even the roster, and the VtsScore page keeps the whole section hidden instead of flashin…",
      "The growth re-upload no longer turns away members who signed up on another phone or browser. A sign-up belongs to the browser that filed it, so a member on a new device used to see \"You did not register\" with no way forward (registration was already closed). The re-upload form n…",
      "The homepage \"Vote for the best members\" corner card is gone, along with its code, styles and copy. The Arcade's Velo's Rampart banner is unchanged."
    ]
  },
  {
    "version": "16.6.14",
    "date": "2026-10-06",
    "highlights": [
      "The Eden season page's Final Top 20 has a **Download poster** button that draws a designed share image: every winner with their reward group, reward tier (Guild Master or Core), headline score and a short breakdown (support work counts and bonus for Support Work, contribution ra…",
      "A Hall of Fame closes the Final Top 20 card and the poster: the players who gave up their premium reward this season (published forfeit adjustments), so the slot passed to the next player. A rank is shown only for someone who stepped aside inside the contribution reward window."
    ]
  },
  {
    "version": "16.6.13",
    "date": "2026-09-30",
    "highlights": [
      "Fixed the admin dashboard crash when historical OCR leaderboard rows have blank or symbol-only player names. Unresolved rows retain their OCR totals without receiving conduct bonuses; valid player adjustments and strict adjustment-entry validation remain intact."
    ]
  },
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
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
