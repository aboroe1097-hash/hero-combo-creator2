# Velo's Rampart — rebrand and redesign plan (formerly "Eden Siege")

**Status:** design doc with the owner's corrections and decisions recorded (2026-09-25). Cut from
`origin/gh-pages` (16.5.6). Implementation follows the release plan in §6; anything deferred is named
in the Parking lot (§6.3), never silently dropped.

**The brief (2026-09-25):** revisit the arcade games — "the engineers are there, but there is no game
logic idea or creativity at all", the 3D imaging can be better, the layouts and responsiveness can be
better. Mainly Eden Siege. It also needs rebranding: better naming and presence.

**What changed in this revision:** §1 is corrected against what actually ships in 16.5.6 (the 16.5.4
fun pass landed — the diagnosis must not pretend otherwise); §2 records the decisions (name, pillars,
release order); §5 is new — the site-integration add-ons, which are the part generic tower defence
cannot copy; §6 replaces the open-questions list with a numbered release plan and acceptance tests.

The document: §1 diagnosis, §2 decisions, §3 naming and presence, §4 game-logic direction, §5
site-integration add-ons, §6 release plan, §7 constraints, §8 3D imaging, §9 layout, §10 boot five, §11 sources.

---

## 1. Diagnosis — why good engineering reads as no game

The engineering under the game is genuinely good: a pure, seeded, fixed-60 Hz simulation
(`js/eden-siege/sim/world.js`) whose runs replay byte-identically, hit-stop and shake held outside the
sim so replays stay honest, quality tiers with an auto-downgrade, context-loss recovery, a tutorial
wave, and a 13-locale copy layer. None of that is the problem. The problem is what the *player is
asked to decide*.

**1.1 Combat aims itself.** `firePlayerBolt` picks the nearest enemy in range and homes a bolt at it
(`sim/world.js`, the `target` loop in `firePlayerBolt`). There is no aiming, no missed shots, no
positioning pressure — enemies walk at the core or the nearest tower, and the player's only real verbs
are move, dash, and hold-attack. The game plays itself at the micro level. The fix has a hard floor:
most players are on phones, and free aim with a thumb is *worse*, not harder (aim policy in §4.2, §7).

**1.2 Zero decisions between waves.** Gold buys exactly two towers on exactly the sockets the map
pre-placed, then linear upgrades to level 5. No draft, no build variety, no consumables, no hero picks.
Every run is strategically identical; the seed changes spawn order, not the plan. This is the single
biggest gap against the arcade games people replay (Vampire Survivors, Brotato, Clash Royale): the
*choice* is the loop.

**1.3 A game called "Siege" with no siege in it.** No siege engines, no rams, no ladders, no gates
that matter, no flanking, no capture points. Enemies walk straight in with one attack. (Ironically the
site's *Eden Operations Lab* — a tool — is where siege objectives actually live, which is also the
naming collision §2 resolves.) This stays true on purpose: the playable siege (ram escort, catapult,
Velo flight) is deferred to a later season by decision D2; until then the siege lives in the arena
fiction, not the mechanics — and the name no longer has to carry it alone.

**1.4 Variety is shallow, not missing.** What 16.5.6 actually ships: `ENEMY_KINDS` is ranger /
cavalry / dreadnought plus the warlord boss; enemies roll armoured / swift / shielded modifiers from
wave 4 (`MODIFIERS`, `modifierChance`); frost/ember towers run **five tiers** each (`TOWER_MAX_LEVEL`,
with a model change per tier). That is real variety — the 16.5.4 fun pass landed. The gap is that the
variety does not compound into decisions: still no draft between waves, no enemy *roles* (every enemy
walks and swings; none of them poses a question the player must answer), no placement puzzle (two tower
types on pre-placed sockets), and the domain corpus the site already owns — hero roster and skills,
footman/archer/cavalry counter tables from the battle simulator, the Specialisation tower tree — never
enters the game. `docs/plans/arcade-live-arena.md` §3 promised exactly that data reuse; it is still
owed (§5 makes it the plan's spine).

**1.5 The elements are half a mechanic.** Fire burns (beats armour), ice slows (beats shields) — that
rock-paper-scissors is the best idea in the game, but the player can swap elements freely at any moment
(`updatePlayer`, `input.swap`) with no cost or cooldown: the "counter" play is a reflex toggle, not a
decision. There are no reactions (ice on fire, fire on ice), and no reason to commit to one element.

**1.6 The combo feeds a number, not power.** The wing/combo chain multiplies score and dies on a 3 s
timer. Nothing about the fight changes at chain 20. Score-only feedback is why the chain feels
decorative.

**1.7 The wave grammar is a fixed table.** `WAVES` is ten hand-authored groups of the same three kinds
at tiers 1–4, boss every fifth, endless = the same with scaled numbers and random modifiers. No
formations, no roles, no risk/reward choices, no surprise the player can plan around.

**1.8 The Daily is local — and a naive shared board would be fake on day one.** Daily Siege shares a
seed, but runs and scores live in `localStorage` (`progress.js`); there is no shared board. A "Daily
everyone plays" without a visible everyone is a practice mode with a calendar. But a shared leaderboard
with no cheat protection fills with fake scores on day one. Because the sim is deterministic, the fix
is verification by replay: submit the seed **plus a compressed input trace**, and a Firebase Function
replays them and accepts the score only if the replay reproduces it. That is a Function + new Firestore
rules + a rules deploy = **its own release** (R7), and the Firestore writes must stay small — the
free-tier quota is watched (§5.5, §7).

**1.9 Presence is a banner.** The hub shows a featured banner; the title screen is a modal over the
scene; the share action copies a text line. How a player *meets* the game is not how they meet a game
they download: no capsule art, no living title scene, no identity beyond a name that read like a tool.

**1.10 The boot five are lobby filler — and that is fine.** Merge Rush, Sort the Hoard, Crystal Relay,
Set Assembly and Hero Rumble are 60-second DOM toys sharing the wing/combo vocabulary. They need brand
consistency and one shared identity with the Rampart (§3), not new mechanics. Their ceiling is by design.

---

## 2. Decisions (owner, 2026-09-25)

| # | Decision | Detail |
|---|---|---|
| D1 | **Name: Velo's Rampart** | Display name only. The route stays `eden-siege.html` so old links, budgets and service-worker entries move; "Ice & Fire Arena" stays as the kicker/subtitle. |
| D2 | **Pillars B + C now; pillar A later** | The playable siege (ram escort, catapult, Velo flight) waits for a **later season** → Parking lot (§6.3). |
| D3 | **Release order** | R1 rename + presentation (living title scene, share card) → R2 aim rework + enemy roles + wave modifiers + achievements → R3 pick-1-of-3 between waves + elemental reactions → then the site add-ons (§5). The **share card ships in R1**; **achievements in R2**. |
| D4 | **Each release is a numbered version** | 16.5.x patch train (R1 ships as 16.5.9, later numbers coordinated with other open PRs), CHANGELOG, and acceptance tests that prove the release is done (§6). |
| D5 | **Nothing is silently dropped** | Whatever a release does not take goes to the Parking lot (§6.3) with its reason. |

### 2.1 Naming — decided

The naming problem was a namespace collision: every operational tool is "Eden <thing>" (Eden Hub, Eden
Map, Eden Pathing, Eden Operations Lab), so "Eden Siege" read as another tool — the Operations Lab
already tracks "the chosen siege objective". The game's own identity was distinctive and under-used:
**Velo**, the mascot the owner directed to be modelled in 3D (never 2D portraits); the **ice/fire**
duality; the **rampart** (map 1 is literally Keep Rampart); the **wing** combo vocabulary.

| Candidate | Reads as | Verdict |
|---|---|---|
| **Velo's Rampart** | a character game, instantly | **Decided (owner, 2026-09-25).** Mascot-branded (unmistakably a game, à la Mario/Rayman/Celeste), decoupled from the Eden tool namespace, ties the 3D avatar to the title, and "Rampart" already names the home map. Accepted risk: warm rather than epic. |
| Frostfire Rampart | a premium duel game | Rejected — names the mechanic, not the character. |
| Emberwing | a brand | Rejected — opaque without a subtitle. |
| Velo Siege | minimal change | Rejected — "Siege" stays unownable and mechanic-promising (§1.3). |
| Hold the Line | a tagline raised up | Rejected — generic, used by other tower-defence titles. |

This satisfies the storefront naming rule ("Super Chess works; bare Chess doesn't"): a coined proper
noun owns the generic word — "Siege" alone is unownable; "Velo's Rampart" is ours.

---

## 3. Rebrand — rename and presence package

### 3.1 Rename checklist (verified against `origin/gh-pages`)

`js/eden-siege/data/copy.js` (game.title), `eden-siege.html` `<title>` + meta description,
`js/i18n/en.js` (3 literal occurrences) and parity through the other 12 locales,
`js/command-palette.js` (`tabEdenSiege` label + keywords), the Arcade hub featured banner
(`js/siege-promo.js`) and homepage invitation, share text in `game.js`, and the five test files that
pin the string (`tests/eden-siege.spec.js`, `tests/production-smoke.spec.js`,
`tests/unit/eden-siege-sim.test.mjs`, `tests/unit/eden-siege-i18n.test.mjs`,
`tests/unit/eden-siege-depth.test.mjs`, plus `scripts/check-size.mjs`). `npm run i18n:check` enforces
the 13-locale parity.

**Coordination note:** a rename pass is already in flight in this worktree (uncommitted
`js/eden-siege/data/copy.js` + `copy-locales.json` in the #247 lane — title, mode names, "Kharr the
Warlord"); R1 reconciles with it instead of forking the strings.

### 3.2 Presence package

1. **A living title scene (R1).** The 'ready' screen becomes a cinematic: slow camera orbit on the
   rampart, Velo idling with scarf and wings moving, snow drifting, banners waving — then the title
   treatment over it (ice/fire split gradient type). The renderer has every ingredient; this is camera
   and timing. The orbit is canvas motion — gate it on reduced motion (§7).
2. **A capsule on the hub (R1).** The featured banner becomes a proper capsule card, visually distinct
   from the five boot cards. Cover craft rules from storefront research: the mascot is the focal element
   (Velo front and centre), a stylised title font matched to the art — never a raw gameplay screenshot —
   readable at small sizes (title only, no clutter), one consistent look across the crops we use (16:9
   banner, 2:3 card, 1:1 icon); two proven layouts: left-title/right-character or centre/centre.
   Cheapest authentic art: render a still from the game itself (the capture script exists) — ideally the
   title screen's first frame matches the cover, so a preview clip comes free later.
3. **World names with flavour (R1).** Towers become "Frost Spire" / "Ember Pyre"; enemies align with
   the site's troop vocabulary (Archer, Cavalry, Dreadnought, and the boss gets a name — *Kharr the
   Warlord*); modes become **The Siege** (campaign), **Endless Siege**, **Daily War**.
4. **A share card, not a share line (R1).** Canvas-composited result card (Velo, stars, score, seed)
   via Web Share with file, download fallback. One-tap bragging is the oldest arcade loop there is. All
   art on the card is our own or procedural — the Velo emblem included (§7).
5. **Feats — "Feats of the Rampart" (R2, per D3).** Ten named one-off challenges — *Wingborne*
   (50-chain), *Ashfall* (burn 100 enemies), *Cold Calculus* (win using ice only), *Untouched* (core at
   100%) — tracked locally like the boot games' bests. Named achievements are presence *and* retention
   for near-zero bytes.
6. **Command palette / nav copy (R1).** Reads "Velo's Rampart (Arcade game)" with keywords `velo
   rampart siege game arena tower`, so a user typing "game" finds it and a user typing "eden" finds
   tools, not the game.

---

## 4. Combat and game-logic direction (pillars B and C)

Two coherent packages, both adopted (D2). Pillar A is deferred; §6.3 keeps it alive. Each mechanic
names its release.

### 4.1 Pillar B — "The War Council": a draft between waves (R3)

- **Pick 1 of 3 before each build phase.** Hero allies from the real hero roster (each = passive +
  active, the plan doc's hero-skills idea), tower techs, blessings, consumables. The daily seed then
  fixes the *draft order* too — everyone faces the same offers, which makes the Daily a shared puzzle.
- **Elemental reactions** (makes §1.5 a real system): ice on a burning target = **Shatter** (bonus vs
  armour); fire on a slowed target = **Melt** (burn doubled); three slows = **Deep Freeze**; burn spread
  on death = **Immolate**. Reaction names as float text — readable, satisfying, and they make the swap a
  decision. Add a 2–3 s swap cooldown so commitment has weight.
- **Cost:** mostly data and one new UI step in the build phase; the sim keeps its purity (the draft is
  an input like any other, so replays still replay).
- **Not in R3's scope:** tower fusion and visible Velo growth — Parking lot (§6.3).

### 4.2 Pillar C — "Mastery & Spectacle" (R2)

- **Aim rework — with the phone floor built in.** Keyboard and mouse get free aim: fire toward the aim
  direction with a visible cone; missed shots and led shots return. Touch **keeps aim assist**, as a
  narrow cone biased toward the movement direction — the thumb still chooses where to shoot; assist
  narrows the question instead of answering it (today `firePlayerBolt` picks the target outright).
  **Removing auto-aim must not make phones worse:** most players are on phones, and free aim with a
  thumb is worse, not harder. Highest-impact change in the document; §7 pins the split.
- **Enemy roles instead of stat tiers** (§4.3): shieldwall, skirmisher, saboteur, herald, hauler, gate
  ram — each answers a question the player must solve *now*.
- **Wave mutators with risk/reward**, chosen before the wave: *Iron Tide* (all armoured, +60% gold),
  *Fog of War* (visibility down, +40% score), *Blood Moon* (faster enemies, slower chain decay),
  *Mirror Ice* (enemies reflect ice, +80% score). Two offers, pick one or skip — B adds decisions
  between waves, C adds them before waves.
- **Feats** land here per D3 (§3.2 item 5).
- **Cost:** aiming is an input change plus a balance pass (three control schemes, one policy); the rest
  is content in the existing systems.

### 4.3 Mechanic catalogue (concrete, mix-and-match)

**Enemy roles (R2):** shieldwall (blocks projectiles; must be flanked or nova'd — punishes camping),
skirmisher (kites the player, throws and retreats), saboteur (beelines towers, ignores the core),
herald (buff aura: speed/damage — kill first), hauler (slow, huge HP, double gold — a walking reward),
gate ram (mini-boss that only slows/stuns stop; the literal siege noun), plus formation waves (phalanx
rows advancing together — Parking lot).

**Reactions (R3):** Shatter / Melt / Deep Freeze / Immolate as above; nova on a shielded enemy =
**Crack**.

**Designed but not scheduled → Parking lot (§6.3):** consumable gold sinks, score as power (chain 20+
feeds the ult gauge; perfect wave grants a keystone pick), the "Last Stand" comeback (core < 25%: wings
ignite, +25% damage, score ×1.5), and the boss phase family.

### 4.4 Mechanics worth stealing (research-backed, mapped to our game)

From studying the arcade/strategy lane (sources in §11). Research shelf, not a commitment list:

- **A souls meter** (Mushroom Wars 2): the ultimate charges from *deaths on both sides* — casualties
  become a resource, and "farm the wave, then unleash" becomes a real beat. Extends the ult gauge we
  already have into a decision instead of a timer.
- **Evolve/merge on max level** (Vampire Survivors): a maxed tower plus a paired blessing = an evolved
  form ("Ballista 3 + Fire Flask = Burning Trebuchet"). This is Pillar B's fusion with a draft hook —
  the one-more-run engine in one rule.
- **Elixir tempo ramp** (Clash Royale): a capped regenerating command resource that generates ×2 in the
  final minute and ×3 in overtime — mathematically guaranteed climaxes in short rounds. Also:
  destroying an enemy tower *expands your deployable territory* — territory as the reward, not just
  score. Both fit a 3–5 minute run exactly.
- **Protect-the-assets economy** (Bad North): gold comes from what you *save*, not what you kill — and
  its campaign is a seeded archipelago where you choose the next battle. That is the deferred pillar A
  campaign structure, free: map generation is just another seed input to the deterministic sim.
- **Soft death + milestone unlocks** (diep.io): on defeat recover ~30–50% of the run's progress instead
  of zero, and gate evolutions at fixed thresholds (level 15/30) as run-shaped goals. Keeps restarts
  instant.
- **A pressure timer instead of a clock** (surviv.io's shrinking zone): escalating danger forces the
  climax — for the future assault mode, the push closes toward the keep as the zone closes.
- **Breaches spread** (They Are Billions): a destroyed tower becomes an *enemy* turret — the domino risk
  makes protecting the line matter and gives the saboteur role real teeth.
- **Instant re-entry** (.io genre): minimise time between matches; the ready overlay should be one tap
  deep (already true — keep it true through every redesign).

---

## 5. Site-integration add-ons — the real advantage

Generic tower defence can copy a draft loop. It cannot copy our data. These six add-ons make the game
teach the site's domain; they are priorities folded into the release plan (§6). The rule throughout:
**read the data modules at runtime; never copy tables** — copied tables rot the moment the domain data
changes.

1. **Real hero lineups (R4).** Before a run, pick a front/middle/back hero from the real roster
   (`js/heroes-data.js` and kin); their Combo Generator score and troop type drive the buffs — the game
   teaches good combos. Reuse the combo database (`js/combos-db.js`) and portraits; never copy tables.
2. **The real troop triangle (R4).** Footman/archer/cavalry counter each other per the existing counter
   data (`js/counter-db.js`); enemy waves show their troop mix so the player plans the lineup around
   them. The counters stop being a tooltip on a tool and become a combat input.
3. **Arenas from the real Eden map (R6).** Maps built from the Eden structures data
   (`js/eden-map-data.js`): gate, city, temple, stronghold. The gate map is the natural home for the
   future ram-escort mode (Parking lot) — build it now, fill it later.
4. **Ghost replays and share links (R5).** Runs are deterministic: record inputs. Show today's best run
   as a ghost; "share run" becomes a link carrying seed + compressed inputs that plays back in anyone's
   browser — shareable with no backend. This is also the replay tech the league in item 5 needs.
5. **Alliance Daily league (R7 — its own release).** Scores verified by the Firebase Function replay
   check (§1.8): the client submits seed + compressed input trace, the Function replays them and accepts
   the score only if the replay reproduces it. Weekly standings by player and by team, with a small badge
   on the profile and the Eden season page. Function + new rules + rules deploy ship together; keep the
   Firestore writes small (free-tier quota is watched).
6. **Velo reacts after a run (R8).** One line of tips based on what killed you, in all 13 languages,
   from canned copy only — the game never calls the model API. Coordinate the strings with the #247 copy
   lane (§3.1).

---

## 6. Release plan

Each release is its own numbered version on the 16.5.x patch train (R1 ships as 16.5.9, later numbers
coordinated with other open PRs), with a CHANGELOG entry and acceptance tests that prove it is done.
Version bumps follow the repo release checklist (`package.json`, lockfile, app constants, public HTML
footers, README heading, `CHANGELOG.md`; `npm run version:check` must pass; `npm run build` refreshes
cache stamps). Small releases follow the fast incremental-fix lane (`check:fast` + focused tests);
anything touching the sim contract or budgets runs the wider gates (§7).

### 6.1 The releases

| Release | Scope | Source |
|---|---|---|
| R1 | Rebrand + presentation | §3 |
| R2 | Combat depth (aim, roles, modifiers, feats) | §4.2 |
| R3 | War Council (draft, reactions) | §4.1 |
| R4 | Hero lineups + troop triangle + wave mix preview | §5.1–5.2 |
| R5 | Ghost replays + share links | §5.4 |
| R6 | Eden arenas (gate/city/temple/stronghold) | §5.3 |
| R7 | Alliance Daily league | §5.5 |
| R8 | Velo post-run tips | §5.6 |

**R1 — Rebrand + presentation.** Rename to Velo's Rampart everywhere (game copy, 13 locales, page title
+ meta, command palette, hub promo); living title scene (slow camera orbit on the ready screen,
respects reduced motion); canvas share card (Web Share + download fallback). Acceptance: name pinned in
the §3.1 test files, `i18n:check` green; share-card unit tests (compositing, both fallbacks);
`siege:test` + focused unit suites green.

**R2 — Combat depth.** Aim rework (free aim keyboard/mouse; touch keeps a narrow assist cone biased
toward the movement direction), enemy roles (shieldwall, skirmisher, saboteur, herald, hauler, gate
ram), risk/reward wave modifiers, achievements ("Feats of the Rampart"). Acceptance: sim/unit tests per
role and modifier (deterministic behaviour, not just stats); feat detection tests; input tests covering
the aim split.

**R3 — War Council.** Pick-1-of-3 between waves (hero allies / techs / blessings), elemental reactions
(Shatter / Melt / Deep Freeze / Immolate) + swap cooldown. Acceptance: deterministic-draft tests (same
seed ⇒ same offers, replay byte-identical); reaction tests (trigger, effect, cooldown enforced).

**R4 — Hero lineups + troop triangle + wave mix preview** (add-ons 1–2). Acceptance: lineup buffs
derived from the live combo/counter modules at runtime (a test proves the game reads the data — no
copied tables); counter-triangle tests; wave mix preview matches the table the sim spawns.

**R5 — Ghost replays + share links** (add-on 4). Acceptance: record → replay round-trip yields an
identical `snapshotHash`; a share link plays back in the browser spec on a fresh profile, no backend;
compressed trace fits the link budget.

**R6 — Eden arenas** — gate / city / temple / stronghold (add-on 3). Acceptance: every arena plays
through the siege spec; map geometry derives from the structures data; mid-range-Android frame-rate
check with the existing quality tiers before merge (§7).

**R7 — Alliance Daily league** (add-on 5). Acceptance: Function replay verification accepts honest
submissions and rejects tampered traces (replay-harness tests); new Firestore rules covered by rules
tests and shipped in the same release; per-run write count measured and kept small.

**R8 — Velo post-run tips** (add-on 6). Acceptance: tip chosen deterministically from the run outcome;
all 13 locales (incl. `ar`) at parity (`i18n:check`); the game page's network surface unchanged (no
model-API call).

### 6.2 Coordination

- Version numbers come off the shared 16.5.x train — check the open PRs before picking one.
- The #247 lane owns the in-flight copy/rename strings (§3.1) and is the coordination point for R8's
  canned tips copy. One copy layer, one owner per string set.
- R7 touches Firebase (Function, rules, rules deploy) — it is the one release that also needs the
  external-deploy path from the repo workflow, not just the GitHub Pages PR.

### 6.3 Parking lot (explicitly deferred)

- **Pillar A — the playable siege:** ram escort (enemies sortie against a moving engine), catapult
  skill-shot, Velo flight (hover, dive, perch-and-scout), a gate that must fall, a lord duel on the
  wall. **A later season** by decision D2. The R6 gate arena is its home; the deterministic sim contract
  carries over (it is a map plus objective systems, not a new engine).
- **Tower fusion** (Steam Vent / Blizzard Spire / Eruption Spire, level-5 keystone) and **visible Velo
  growth** (modelled in 3D per the avatar rule): not in R3's scope — they may fold in only if the draft
  and reaction acceptance stays intact, otherwise their own release after R3.
- **The rest of §4.3:** consumable gold sinks, score-as-power, "Last Stand" comeback, boss phase
  family, formation waves.
- **§4.4** is a research shelf, not a commitment; pull items from it when a release needs a hook.

---

## 7. Constraints (respected limits)

- **Byte budgets.** three.js loads only on the game page, which already loads ~711 kB of JavaScript
  against the 712 KiB `routeJsBytes['eden-siege.html']` cap (and `totalJsBytes`). Every release
  measures its size impact (`npm run size:check`); caps lift only with the documented check-size
  comment trail. New media is a separate decision; the default stays no — visuals are code and
  procedural art.
- **Frame rate.** Before any graphics-heavy release, check frame rate on a mid-range Android using the
  existing quality settings (low/medium/high + auto-downgrade). Outlines and extra lighting are gated
  per quality tier. Smooth on a 4 GB Chromebook is the floor.
- **Reduced motion.** Respected — the canvas motion gates already exist. The living title scene's orbit
  and camera drama are motion: gate them like every other canvas effect.
- **Test stability.** `siege:test` / the browser spec must stay green on **any** date. Daily seeds are
  date-derived (`dailySeed` = map + UTC date in `js/eden-siege/rng.js`) — never assert a specific seed
  value in tests.
- **Art.** No copied or unlicensed art, ever. Everything procedural or our own — including the Velo
  emblem on the share card.
- **Locales.** All 13 languages at parity, including right-to-left (`ar`); `npm run i18n:check` is the
  gate. Nothing clips in RTL (§9).
- **Determinism.** The seeded sim contract stays: same seed + same inputs ⇒ same run, byte-identical
  (`snapshotHash` exists for exactly this). Draft offers, enemy roles and modifiers are deterministic
  inputs and table lookups — the daily, the league and every replay feature rest on it.
- **Release discipline.** Each release: numbered version + CHANGELOG + acceptance tests (D4); version
  numbers coordinated with other open PRs.
- **The frozen five-game boot contract**, the motion-CSS baseline (canvas animation is invisible to the
  checker — keep game motion in canvas), 44 px targets, RTL, light theme, `noindex` on the game page.
- **The avatar rule:** model Velo in 3D; never paste a 2D hero portrait into the scene.

---

## 8. 3D imaging — how the scene stops reading as a hobby build

All of this is shader, vertex and camera work on the existing procedural pipeline — **zero new media
bytes**, which keeps `totalMediaBytes` untouched.

1. **Light tells the wave's story.** Wave element drives key-light colour, fog tint and sky gradient
   (ice waves: cold blue rim; fire waves: warm ember). Uniform changes, enormous mood shift.
2. **Non-photoreal shading with outlines.** Two-to-three-step toon ramp + an inverted-hull outline pass
   makes low-poly read as *intentional* rather than untextured. The most cost-effective "premium" signal
   there is. Outlines gate per quality tier (§7).
3. **A sky and a horizon.** Gradient sky dome, moon/stars, and two parallax silhouette layers (keep
   skyline / mountains; ocean plane with sine-wave vertices and spray on the ship map). Today the frame
   ends at the arena floor.
4. **Camera drama.** FOV kick on nova/ult; a boss-intro orbit with nameplate; a slow push-in with
   hit-stop on boss-down; the idle diorama of §3.2. The camera already trails the player — give it a
   director. All of it gated on reduced motion.
5. **One effect language.** Ice = crystal shards and frost decals; fire = embers and scorch decals that
   fade on the ground; additive procedural sprites only. Death animations (units topple and tumble,
   bosses dissolve into embers) instead of despawning.
6. **Velo's acting.** Attack cast pose, wing flare on dash, scarf flutter (vertex sine), flame-tail
   flicker. The owner's rule stands: model the avatar in 3D, never paste art.
7. **World-space readability.** Faction-coloured health bars with shield pips above units, a hologram
   preview + range ring on the hovered socket, boss nameplate. Readability *is* graphics.
8. **Cheap depth cues.** Contact shadows under units, height-based fog, emissive rims on tower crystals
   at night. (Shadows already exist per quality tier — extend, don't add cost.)

**The concrete shading recipe** (three.js, verified against current docs and postmortems in §11):
`MeshToonMaterial` with a 3 px `DataTexture` gradientMap (2–3 hard bands) + `flatShading: true` gives
the cel look; `MeshMatcapMaterial` is near-free for Velo close-ups (whole ramp baked into one texture,
zero lights); outlines via `OutlineEffect` or a depth-varying outline pass (uniform wireframe-offset
reads as a tech demo); a single 32³ LUT post pass unifies the palette of a whole procedural scene;
coloured hemisphere light (sky tint vs ground tint) instead of white ambient is the classic
low-poly-island look; fuse fog colour with the sky background to hide draw-distance seams.

**The avoid-list (why hobby three.js scenes look cheap):** white/flat lighting with no coloured
ambient; no fog so the world just stops; gray default materials and style drift; uncapped
`devicePixelRatio` (phones hit 5 and turn to mush — cap at 2, force 1 on iOS/low-memory); allocations
inside the render loop; `matrixAutoUpdate` left on for static geometry; huge shadow frusta;
adding/removing lights at runtime (shader recompiles — toggle intensity instead); Z-fighting on
coplanar meshes (offset ~0.001); no sRGB output encoding (washed colours).

**Game feel, layer 2–3 primitives per event** (the SNKRX juice postmortem): hit = cone particles (±72°
off the surface normal) + a 0.15 s white flash (white beats coloured) + a spring scale-pop + a
pitch-randomised sound (±5% kills repetition fatigue); death = extra particles + shake + flash;
squash-stretch on spawn/death; nothing happens silently. Hit-stop with music pitch following the
slow-mo is the highest impact-per-line feel upgrade there is.

---

## 9. Layout and responsiveness

1. **Two HUD skins.** Desktop: top bar (score, chain, core HP), a right-hand build rail with hotkeys
   (1/2 tower, U upgrade, Q/E element, Space nova), and keybind chips bottom-left. Mobile: keep the thumb
   layout (stick left, actions right) with `env(safe-area-inset-*)` padding and 44 px targets (already a
   repo contract) — and the mobile aim stays assisted (the movement-direction cone of §4.2), so the HUD
   never asks a thumb to do a mouse's job.
2. **Build mode for phones.** Tapping tiny rings on a 3D canvas is the weakest input in the game today.
   A Build button that raises the camera, dims the fight and shows every socket as a large tap target
   with name and cost, then one tap to place. Keyboard does the same on desktop.
3. **Portrait is a first-class layout, not a squeeze.** Camera height/FOV per aspect (the arena cramps
   in portrait), HUD stacked with the core-HP meter full-width, and an optional gentle "rotate for the
   full view" hint — never a hard block.
4. **Overlays that fit.** Ready/results screens as scrollable sheets on small screens; the results stat
   grid (8 stats + history rows) gets a two-column mobile layout; the chips row wraps; nothing clips in
   RTL (`ar` is a shipped locale).
5. **Aspect and chrome.** Ultrawide letterbox with a themed frame rather than stretching the arena; the
   canvas never causes horizontal overflow (a production-smoke assertion already exists for pages —
   keep it true here).
6. **Accessibility floor.** Focus order in overlays, ARIA-live score announcements, reduced-motion keeps
   the game playable (shake/hit-stop already gated), and elements identified by **shape as well as
   colour** (crystal / flame glyphs) for colour-blind players.
7. **Platform hygiene** (research-backed checklist): `env(safe-area-inset-*)` padding with fallbacks on
   HUD and sheets; `user-select: none` on the game shell (kills double-tap zoom/selection); do not bind
   Escape or Ctrl/Cmd+W; adapt key hints for AZERTY etc.; resume the AudioContext in a `touchend`
   gesture (the documented iOS breakage); rotation prompts belong to the platform — never our own
   rotate-lock.
8. **DPR discipline in the renderer.** Cap `devicePixelRatio` at 2; force 1 on iOS and low-memory
   Android (higher values crash there). Smooth on a 4 GB Chromebook is the realistic floor, not a gaming
   laptop.

---

## 10. The boot five (brief)

Keep them as lobby toys. Give them the shared brand pass only: the new arcade identity in `shared.css`,
consistent naming in the hub, and — one idea worth taking — point **Hero Rumble** at the real hero
roster so the lobby teaches the domain the Rampart then uses. No new mechanics; their ceiling is by
design.

---

## 11. Sources and evidence

Code evidence is from `origin/gh-pages` (16.5.6): `js/eden-siege/sim/world.js`, `js/eden-siege/game.js`,
`js/eden-siege/data/balance.js` (`ENEMY_KINDS`, `MODIFIERS`, `TOWER_MAX_LEVEL`, `WAVES`),
`js/eden-siege/data/maps.js`, `js/eden-siege/engine/renderer.js`, `js/eden-siege/data/copy.js`,
`js/eden-siege/rng.js` (date-derived `dailySeed`), `js/command-palette.js`, `js/siege-promo.js`,
`games/boot/`, the domain modules the add-ons read (`js/heroes-data.js`, `js/combos-db.js`,
`js/counter-db.js`, `js/eden-map-data.js`), the Firebase surface (`functions/src/`, `firestore.rules`),
the size budgets (`scripts/check-size.mjs` — 711.0 KiB measured for `eden-siege.html` post-16.5.4 fun
pass, 712 KiB cap), and `docs/plans/arcade-live-arena.md`.

External design references consulted for this brainstorm (fetched 2026-09-25):

- three.js craft: https://discoverthreejs.com/tips-and-tricks/ , https://threejs.org/docs/#api/en/materials/MeshToonMaterial ,
  https://tympanus.net/codrops/2026/04/24/susurrus-crafting-a-cozy-watercolor-world-with-three-js-and-shaders/
- game loops: https://en.wikipedia.org/wiki/Vampire_Survivors , https://en.wikipedia.org/wiki/Brotato ,
  https://en.wikipedia.org/wiki/Clash_Royale , https://en.wikipedia.org/wiki/Mushroom_Wars_2 ,
  https://en.wikipedia.org/wiki/Bad_North , https://en.wikipedia.org/wiki/They_Are_Billions ,
  https://en.wikipedia.org/wiki/Diep.io , https://en.wikipedia.org/wiki/Surviv.io ,
  https://en.wikipedia.org/wiki/.io_game , https://www.crazygames.com/game/age-of-war
- game feel/juice: https://a327ex.com/logs/orblike-snkrx-archeology
- naming/capsule/presence: https://docs.crazygames.com/requirements/game-covers/ ,
  https://howtomarketagame.com/2020/10/28/trends-for-steam-capsule-design/ ,
  https://docs.crazygames.com/requirements/quality/ , https://howtomarketagame.com/2021/05/03/capsule-trends-spring-2021/
- responsive/platform: https://developer.mozilla.org/en-US/docs/Web/CSS/env ,
  https://docs.crazygames.com/requirements/technical/
