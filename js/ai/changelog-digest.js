// GENERATED FILE — do not edit by hand.
// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)
// after every CHANGELOG.md release entry so Velo can answer "what changed?".
export const VELO_CHANGELOG_DIGEST_VERSION = "16.0.7";

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  [
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
  },
  {
    "version": "16.0.3",
    "date": "2026-09-04",
    "highlights": [
      "Documented the X10 and X12 season brackets in the Manual Builder and Combo Generator filters. X10 is an optional intermediate season some Rise of Castles states run and Eden never has, carrying two free heroes, no paid heroes and no new research; X12 gathers the X9 through X12 h…",
      "Added a Select all control to both season filter strips. It fills every season in one press and returns the strip to its own defaults on the next, so the filter is never left empty."
    ]
  },
  {
    "version": "16.0.2",
    "date": "2026-09-04",
    "highlights": [
      "Rebuilt the Towers Specialization summary as full-width bands. The panel laid its title, button, hero plan and stat tiles out as one wrapping row, so the 478px-tall plan left roughly 460px of empty background beside the 46px title; title, stat bar and plan now each span the pane…"
    ]
  },
  {
    "version": "16.0.1",
    "date": "2026-09-04",
    "highlights": [
      "Restored the X12 research season selector. All 30 Charge nodes are editable in a list without invented topology or unlock rules; Defense retains all 29 nodes and now discloses the source's conflicting cost totals.",
      "Fixed the research planner re-normalizing already normalized families and silently replacing their costs with zero. X12 estimates retain their unverified status while source gaps remain.",
      "Renamed Codex to Hero Tables across supported languages. Restored hero-detail opening and keyboard return focus, kept deselected season filters reachable, explained combo-derived ratings, and hid empty duel sections.",
      "Added a shared local portrait-unavailable image for the X10/X12 heroes whose artwork has not yet been supplied, preventing broken images across roster consumers without misidentifying their portraits."
    ]
  },
  {
    "version": "16.0.0",
    "date": "2026-09-03",
    "highlights": [
      "**VTS Player Alias Reconciliation**: Folded decoration, whitespace and case variants of the same account into one identity across leaderboards, contribution matching and weighted scoring, adopting Moldo1313 and D O F F Y as display names. Sixteen owner-confirmed merges join spel…",
      "**CSS Token Authority & Theme Refactor**: Established centralized theme token authority across dashboard and Eden surfaces, retiring ~357 redundant override rules while maintaining strict net-negative route CSS budgets. Normalized colliding 768px responsive boundaries and enlarg…",
      "**Seasons & Roster Expansion**: Landed X10 and X12 season scaffolding and integrated the nine free plus two paid heroes into the canonical roster (expanding the roster from 78 to 89 heroes), with tower profiles for the paid pair and synchronized Firestore security rule allowlist…",
      "**Codex Data Platform**: Introduced a scalable dataset pipeline with pipe-delimited source tables, gzipped on-demand payload streaming, strict provenance verification, and hero alias quarantine protection.",
      "**Hero Atlas Codex & Field Data**: Added unified multi-table Codex browsing (Free, Paid, Skins+Paid), full 1–8 skill drawer inspection, and the Battle Simulator Field Data evidence panel with match resemblance metrics.",
      "**Progression Planners & Preset Engine**: Shipped the unified Research Cost & Progression Planner, Castle Development Planner, Stamina Projection Calculator with shareable alliance operation cards, and a shared Specialty Preset Engine with cross-tool adapters."
    ]
  },
  {
    "version": "15.0.15",
    "date": "2026-09-01",
    "highlights": [
      "Restored the missing More action to the fixed mobile navigation so Arcade, Battle Simulator, DM Materials, Strife, YouTube, and VTS Admin remain reachable from phones.",
      "Compacted the mobile header, kept the inline account control in the utility row, and preserved full-size controls down to 320px without the stray third row.",
      "Updated the public VTS leadership badge roster: Loony is now R4, while Zubbs no longer receives the R4 badge; Zubbs aliases remain grouped for historical records.",
      "Added each player's structure demolition to Weighted Total Contribution at a temporary 1:20 rate, so 1,000,000 demolition contributes 50,000 weighted points for every admin role.",
      "Moved substantive Velo requests to DeepSeek Reasoner with a verification round and a larger shared reasoning/output budget; short standalone questions still use the fast chat model.",
      "Updated the compatible frontend CSS toolchain to Autoprefixer 10.5.4 while retaining the Node 20-compatible cssnano 8 and Vite 6 build path."
    ]
  },
  {
    "version": "15.0.14",
    "date": "2026-08-28",
    "highlights": [
      "Signing in now returns you to the tool you came from instead of leaving you on the account page, and new accounts finish onboarding before being redirected.",
      "Fixed the mobile account chip covering the theme and language buttons; on phones a tap on the theme toggle opened the account page instead of switching theme.",
      "Rating every player is now required when filing a BoH match result, and the scale is shown as \"/ 10\".",
      "A refused save now says the server rejected the write and the security rules may be out of date, instead of claiming you are not signed in.",
      "Fixed the language coverage report claiming 26 missing translations per locale that were in fact already translated.",
      "Corrected stale version labels on the account, VtsScore and maintenance pages, and gave the 404 page a mobile layout."
    ]
  }
].map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
