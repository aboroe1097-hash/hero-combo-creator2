# Arcade revival — rebrand and redesign Eden Siege (brainstorm)

**Status:** brainstorm and design directions only. No runtime code in this PR. Cut from `origin/gh-pages`
(16.5.6). Implementation follows on this branch after the owner picks the pillars in §8.

**The brief (2026-09-25):** revisit the arcade games — "the engineers are there, but there is no game logic
idea or creativity at all", the 3D imaging can be better, the layouts and responsiveness can be better.
Mainly Eden Siege. It also needs rebranding: better naming and presence.

This document answers that in five moves: an honest diagnosis of why a well-engineered game reads as
lifeless (§1), a naming and presence proposal (§2), three creative pillars for the game logic with a
recommended package (§3), a concrete 3D upgrade list (§4) and a responsive-layout rework (§5). §6 is the
boot five, §7 is what must not break, §8 is the decision list.

---

## 1. Diagnosis — why good engineering reads as no game

The engineering under Eden Siege is genuinely good: a pure, seeded, fixed-60 Hz simulation
(`js/eden-siege/sim/world.js`) whose runs replay byte-identically, hit-stop and shake held outside the sim
so replays stay honest, quality tiers with an auto-downgrade, context-loss recovery, a tutorial wave, and
a 13-locale copy layer. None of that is the problem. The problem is what the *player is asked to decide*.

**1.1 Combat aims itself.** `firePlayerBolt` picks the nearest enemy in range and homes a bolt at it
(`sim/world.js`, the `target` loop in `firePlayerBolt`). There is no aiming, no missed shots, no positioning
pressure — enemies walk at the core or the nearest tower, and the player's only real verbs are move, dash,
and hold-attack. The game plays itself at the micro level.

**1.2 Zero decisions between waves.** Gold buys exactly two towers on exactly the sockets the map pre-placed,
then linear upgrades to level 5. No draft, no build variety, no consumables, no hero picks. Every run is
strategically identical; the seed changes spawn order, not the plan. This is the single biggest gap against
the arcade games people replay (Vampire Survivors, Brotato, Clash Royale): the *choice* is the loop.

**1.3 A game called "Siege" with no siege in it.** No siege engines, no rams, no ladders, no gates that
matter, no flanking, no capture points. Enemies walk straight in with one attack. The name promises a
set-piece; the loop delivers a wave shooter. (Ironically the site's *Eden Operations Lab* — a tool — is
where siege objectives actually live, which is also the naming collision in §2.)

**1.4 The roster is three units and two towers.** `ENEMY_KINDS` is ranger / cavalry / dreadnought plus the
warlord boss; `TOWERS` is frost / ember. The domain corpus the site already owns — hero roster and skills,
footman/archer/cavalry counter tables from the battle simulator, the Specialisation tower tree — never
enters the game. `docs/plans/arcade-live-arena.md` §3 promised exactly that data reuse; almost none shipped.

**1.5 The elements are half a mechanic.** Fire burns (beats armour), ice slows (beats shields) — that
rock-paper-scissors is the best idea in the game, but the player can swap elements freely at any moment
(`updatePlayer`, `input.swap`) with no cost or cooldown, so the "counter" play is a reflex toggle, not a
decision. There are no reactions (ice on fire, fire on ice), and no reason to ever commit to one element.

**1.6 The combo feeds a number, not power.** The wing/combo chain multiplies score and dies on a 3 s timer.
Nothing about the fight changes at chain 20. Score-only feedback is why the chain feels decorative.

**1.7 The wave grammar is a fixed table.** `WAVES` is ten hand-authored groups of the same three kinds at
tiers 1–4, boss every fifth, endless = the same with scaled numbers and random modifiers. No formations,
no roles, no risk/reward choices, no surprise the player can plan around.

**1.8 The one liveness feature that would make it feel alive is still local.** Daily Siege shares a seed —
but runs and scores live in `localStorage` (`progress.js`); there is no shared daily board. A "Daily
everyone plays" without a visible everyone is a practice mode with a calendar. The L1 live board from
`arcade-live-arena.md` §5 is still owed.

**1.9 Presence is a banner.** The hub shows a featured banner; the title screen is a modal over the scene;
the share action copies a text line. Compare how a player *meets* the game versus how they meet a game they
download: no capsule art, no living title scene, no identity beyond a name that reads like a tool (§2).

**1.10 The boot five are lobby filler — and that is fine.** Merge Rush, Sort the Hoard, Crystal Relay, Set
Assembly and Hero Rumble are 60-second DOM toys sharing the wing/combo vocabulary. They need brand
consistency and one shared identity with the Siege (§2), not new mechanics. Their ceiling is by design.

---

## 2. Rebrand — naming and presence

### 2.1 The naming problem is a namespace collision

Every operational tool on this site is named "Eden <thing>": Eden Hub, Eden Map, Eden Pathing, Eden
Operations Lab. "Eden Siege" therefore *reads as another tool* — one might expect siege-objective counters
and season data, and indeed the Operations Lab already tracks "the chosen siege objective". A player
scanning the nav cannot tell game from tool. The rebrand's job is to make the game unmistakably a game.

The game's own identity is already distinctive and under-used: **Velo**, the mascot the owner directed to be
modelled in 3D (never 2D portraits); the **ice/fire** duality; the **rampart** (map 1 is literally Keep
Rampart); the **wing** combo vocabulary.

### 2.2 Name shortlist

| Candidate | Reads as | Why it works / risk |
|---|---|---|
| **Velo's Rampart** (recommended) | a character game, instantly | Mascot-branded (unmistakably a game, à la Mario/Rayman/Celeste), decoupled from the Eden tool namespace, ties the 3D avatar the owner cares about to the title, and "Rampart" already names the home map. Risk: warm rather than epic. |
| Frostfire Rampart | a premium duel game | Names the one real mechanic (the elements); strong capsule art potential; risk: two nouns, slightly generic fantasy. |
| Emberwing | a brand | Single invented word, capsule-friendly, Velo's flame-tipped wing; risk: opaque, needs a subtitle to say what it is. |
| Velo Siege | minimal change | Cheapest migration; keeps "Siege" honest *after* pillar A lands; risk: still generic behind the mascot. |
| Hold the Line | a tagline raised up | The current tagline; punchy; risk: generic and already used by other tower-defence titles. |

**Recommendation: "Velo's Rampart — Ice & Fire Arena".** Keep the subtitle (it carries the element fantasy
and the current `<title>` already pairs them). The route stays `eden-siege.html` — display name changes
only, so no links, budgets or service-worker entries move.

If the owner prefers the mechanics-forward identity, take **Frostfire Rampart**; the rest of this plan is
name-agnostic.

### 2.3 Rename checklist (verified against `origin/gh-pages`)

`js/eden-siege/data/copy.js` (game.title), `eden-siege.html` `<title>` + meta description, `js/i18n/en.js`
(3 literal occurrences) and parity through the other 12 locales, `js/command-palette.js` (`tabEdenSiege`
label + keywords), the Arcade hub featured banner (`js/siege-promo.js`) and homepage invitation, share text in `game.js`, and the
five test files that pin the string (`tests/eden-siege.spec.js`, `tests/production-smoke.spec.js`,
`tests/unit/eden-siege-sim.test.mjs`, `tests/unit/eden-siege-i18n.test.mjs`, `tests/unit/eden-siege-depth.test.mjs`,
plus `scripts/check-size.mjs`). `npm run i18n:check` enforces the 13-locale parity.

### 2.4 Presence package

1. **A living title scene.** The 'ready' screen becomes a cinematic: slow camera orbit on the rampart, Velo
   idling with scarf and wings moving, snow drifting, banners waving — then the title treatment over it
   (ice/fire split gradient type). The renderer already has every ingredient; this is camera and timing.
2. **A capsule on the hub.** The featured banner becomes a proper 16:9 capsule card, visually distinct from
   the five boot cards. Cheapest authentic art: render a still from the game itself (the capture script
   already exists) and treat it as capsule art.
3. **World names with flavour.** Towers become "Frost Spire" / "Ember Pyre"; enemies align with the site's
   troop vocabulary (Archer, Cavalry, Dreadnought, and the boss gets a name — e.g. *Warlord Kharr*); modes
   become **The Siege** (campaign), **Endless Siege**, **Daily War**.
4. **A share card, not a share line.** Canvas-composited result card (Velo, stars, score, seed) via Web
   Share with file, clipboard fallback. One-tap bragging is the oldest arcade loop there is.
5. **Feats ("Feats of the Rampart").** Ten named one-off challenges — *Wingborne* (50-chain), *Ashfall*
   (burn 100 enemies), *Cold Calculus* (win using ice only), *Untouched* (core at 100%) — tracked locally
   like the boot games' bests. Named achievements are presence *and* retention for near-zero bytes.
6. **Command palette / nav copy** reads "Velo's Rampart (Arcade game)" with keywords `velo rampart siege
   game arena tower`, so a user typing "game" finds it and a user typing "eden" finds tools, not the game.

---

## 3. Creative pillars — the game logic ideas

Three coherent packages, not a feature pile. They compose; the recommendation is **B + C now, A as the
third map and headline mode later**.

### Pillar A — "The Real Siege": flip the camera (assault fantasy)

Make the name true. The player *takes* a keep instead of holding one:

- **Siege engines as the objective spine.** A battering ram you escort (enemies sortie to destroy it), a
  siege tower that drops troops over the wall, a catapult whose arc you aim (a skill-shot minigame layered
  on the sim). The engine is the moving objective; the waves are its opposition.
- **Verticality — Velo flies.** The mascot has wings; the camera already trails in 3/4. A flight mode
  (hover over walls, dive attacks, perch-and-scout) is unique to our avatar and instantly unlike any other
  browser siege game. Nothing else on the site can do this.
- **A gate that must fall**, walls with archers and boiling oil, a final duel with the enemy lord on the
  wall — a boss as a duel, not a bigger HP bar.
- **Cost:** the biggest of the three (pathing, multi-objective AI, new camera states). But it reuses the
  deterministic sim contract unchanged — it is a map plus objective systems, not a new engine.

### Pillar B — "The War Council": a draft between waves (the one-more-run engine)

- **Pick 1 of 3 before each build phase.** Hero allies from the real hero roster (each = passive + active,
  the plan doc's hero-skills idea), tower techs, blessings, consumables. The daily seed then fixes the
  *draft order* too — everyone faces the same offers, which makes the Daily a shared puzzle.
- **Elemental reactions** (makes §1.5 a real system): ice on a burning target = **Shatter** (bonus vs
  armour); fire on a slowed target = **Melt** (burn doubled); three slows = **Deep Freeze**; burn spread on
  death = **Immolate**. Reaction names as float text — readable, satisfying, and they make the swap a
  decision. Add a 2–3 s swap cooldown so commitment has weight.
- **Tower fusion turns fixed sockets into a puzzle.** Adjacent frost+ember = **Steam Vent** (slow+burn
  aura); two frost = **Blizzard Spire**; two ember = **Eruption Spire**. Level 5 = a keystone choice.
- **Velo grows visibly** — wings, horns, aura tint evolve with the build. The avatar becomes a progress bar
  you can see (and the owner's rule stands: modelled, never a 2D portrait).
- **Cost:** mostly data and one new UI step in the build phase; the sim keeps its purity (draft is an input
  like any other, so replays still replay).

### Pillar C — "Mastery & Spectacle": make the moment-to-moment require a pulse

- **De-auto-aim.** Fire toward the aim direction (mouse/stick) with a visible cone; keep a soft magnetism
  for touch. Missed shots, led shots, and skill expression return. This is the single highest-impact
  change in the whole document.
- **Enemy roles instead of stat tiers** (§3.1 below): shieldwall, skirmisher, saboteur, herald, hauler —
  each answers a question the player must solve *now*.
- **Wave mutators with risk/reward**, chosen before the wave: *Iron Tide* (all armoured, +60% gold), *Fog
  of War* (visibility down, +40% score), *Blood Moon* (faster enemies, slower chain decay), *Mirror Ice*
  (enemies reflect ice, +80% score). Two offers, pick one or skip — the decision layer B adds between
  waves, C adds before them.
- **"Last Stand" comeback:** at core < 25% Velo's wings ignite — +25% damage, score ×1.5, distinct VFX.
  Deliberate risk/reward and a dramatic beat.
- **Boss phases:** destructible armour plates (target priority), a roar that buffs nearby units, a charge
  attack with a longer telegraph, a nameplate and an intro camera sweep. The telegraphed slam is already
  the right shape; give it a family.
- **Cost:** aiming is an input change plus a balance pass; the rest is content in the existing systems.

### 3.1 Mechanic catalogue (concrete, mix-and-match)

**Enemy roles:** shieldwall (blocks projectiles; must be flanked or nova'd — punishes camping), skirmisher
(kites the player, throws and retreats), saboteur (beelines towers, ignores the core), herald (buff aura:
speed/damage — kill first), hauler (slow, huge HP, double gold — a walking reward), gate ram (mini-boss that
only slows/stuns stop; the literal siege noun), plus formation waves (phalanx rows advancing together).

**Reactions:** Shatter / Melt / Deep Freeze / Immolate as above; nova on a shielded enemy = **Crack**.

**Consumable gold sinks** (decisions in the fight, not just between waves): *Velo's Roar* (fear), *Wing
Gust* (knockback), barricade repair, tower re-roll, a carried-over "war chest" between runs.

**Score as power:** chain 20+ feeds the ult gauge; a perfect wave (no core damage) grants a keystone draft
pick. The wing vocabulary the boot games trained finally changes the fight.

---

## 4. 3D imaging — how the scene stops reading as a hobby build

All of this is shader, vertex and camera work on the existing procedural pipeline — **zero new media bytes**,
which keeps `totalMediaBytes` untouched.

1. **Light tells the wave's story.** Wave element drives key-light colour, fog tint and sky gradient (ice
   waves: cold blue rim; fire waves: warm ember). Uniform changes, enormous mood shift.
2. **Non-photoreal shading with outlines.** Two-to-three-step toon ramp + an inverted-hull outline pass
   makes low-poly read as *intentional* rather than untextured. The most cost-effective "premium" signal
   there is.
3. **A sky and a horizon.** Gradient sky dome, moon/stars, and two parallax silhouette layers (keep
   skyline / mountains; ocean plane with sine-wave vertices and spray on the ship map). Today the frame
   ends at the arena floor.
4. **Camera drama.** FOV kick on nova/ult; a boss-intro orbit with nameplate; a slow push-in with hit-stop
   on boss-down; the idle diorama of §2.4. The camera already trails the player — give it a director.
5. **One effect language.** Ice = crystal shards and frost decals; fire = embers and scorch decals that
   fade on the ground; additive procedural sprites only. Death animations (units topple and tumble, bosses
   dissolve into embers) instead of despawning.
6. **Velo's acting.** Attack cast pose, wing flare on dash, scarf flutter (vertex sine), flame-tail
   flicker, the "Last Stand" ignition. The owner's rule stands: model the avatar in 3D, never paste art.
7. **World-space readability.** Faction-coloured health bars with shield pips above units, a hologram
   preview + range ring on the hovered socket, boss nameplate. Readability *is* graphics.
8. **Cheap depth cues.** Contact shadows under units, height-based fog, emissive rims on tower crystals at
   night. (Shadows already exist per quality tier — extend, don't add cost.)

---

## 5. Layout and responsiveness

1. **Two HUD skins.** Desktop: top bar (score, chain, core HP), a right-hand build rail with hotkeys
   (1/2 tower, U upgrade, Q/E element, Space nova), and keybind chips bottom-left. Mobile: keep the thumb
   layout (stick left, actions right) with `env(safe-area-inset-*)` padding and 44 px targets (already a
   repo contract).
2. **Build mode for phones.** Tapping tiny rings on a 3D canvas is the weakest input in the game today. A
   Build button that raises the camera, dims the fight and shows every socket as a large tap target with
   name and cost, then one tap to place. Keyboard does the same on desktop.
3. **Portrait is a first-class layout, not a squeeze.** Camera height/FOV per aspect (the arena cramps in
   portrait), HUD stacked with the core-HP meter full-width, and an optional gentle "rotate for the full
   view" hint — never a hard block.
4. **Overlays that fit.** Ready/results screens as scrollable sheets on small screens; the results stat
   grid (8 stats + history rows) gets a two-column mobile layout; the chips row wraps; nothing clips in
   RTL (`ar` is a shipped locale).
5. **Aspect and chrome.** Ultrawide letterbox with a themed frame rather than stretching the arena; the
   canvas never causes horizontal overflow (a production-smoke assertion already exists for pages — keep it
   true here).
6. **Accessibility floor.** Focus order in overlays, ARIA-live score announcements, reduced-motion keeps
   the game playable (shake/hit-stop already gated), and elements identified by **shape as well as colour**
   (crystal / flame glyphs) for colour-blind players.

---

## 6. The boot five (brief)

Keep them as lobby toys. Give them the shared brand pass only: the new arcade identity in `shared.css`,
consistent naming in the hub, and — one idea worth taking — point **Hero Rumble** at the real hero roster so
the lobby teaches the domain the Siege then uses. No new mechanics; their ceiling is by design.

---

## 7. What must not break

- **The deterministic contract.** `sim/` stays pure and seeded; draft, mutators and reactions become
  deterministic inputs and table lookups. Same seed + same inputs ⇒ same run, byte-identical — the daily,
  the eventual live board and any replay feature rest on it (`snapshotHash` exists for exactly this).
- **Budgets.** Everything above is code and procedural art; if content grows the chunk past
  `routeJsBytes['eden-siege.html']`, lift it explicitly with the check-size comment trail (repo practice).
  New media is a separate decision; the default stays no.
- **The frozen five-game boot contract**, the 13-locale parity gate, the motion-CSS baseline (canvas
  animation is invisible to the checker — keep game motion in canvas), 44 px targets, RTL, light theme,
  `noindex` on the game page.
- **The avatar rule:** model Velo in 3D; never paste a 2D hero portrait into the scene.

---

## 8. Open decisions (owner)

1. **Name:** Velo's Rampart (recommended) / Frostfire Rampart / Emberwing / Velo Siege / keep "Eden Siege".
2. **Pillars:** adopt B + C now and A later (recommended), or go straight at A ("the real siege") as the
   headline?
3. **First slice:** which lands first — the name + presence package (§2), the de-auto-aim + reactions +
   swap-cooldown mastery pass (C), or the draft layer (B)? Recommended order: presence → C → B, each its
   own PR-sized commit series on this branch.
4. **Daily board:** is the shared daily leaderboard (Firestore, the owed L1 layer) in scope for this
   revival? Without it the Daily stays a practice mode.
5. **Feats + share card in the first slice**, or presence-only first?
6. **Pillar A timing:** is "Velo flies / escort the ram" the goal for this quarter, or a later season?

---

## 9. Sources and evidence

Code evidence is from `origin/gh-pages` (16.5.6): `js/eden-siege/sim/world.js`, `js/eden-siege/game.js`,
`js/eden-siege/data/balance.js`, `js/eden-siege/data/maps.js`, `js/eden-siege/engine/renderer.js`,
`js/eden-siege/data/copy.js`, `js/command-palette.js`, `games/boot/`, `docs/plans/arcade-live-arena.md`.
External design references gathered for this brainstorm are listed in the PR discussion.
