# X10 / X12 hero + research data — transcribed for execution without vision

Everything below was read off the owner's in-game screenshots on 2026-09-02 and
transcribed by hand. **A model without vision can execute the whole plan from this
file alone.** Nothing here needs an image to be re-read.

Companion files in this folder:

- `x12-research.json` — the two X12 research trees, full per-level cost data,
  sliced out of `work/roc-research-sources/roc_research_data.js`.
- `x12-research-nodes.md` — the same trees as readable node tables.

---

## 1. Bracket model (settled)

- **X10** is an intermediate bracket some states received instead of jumping
  X8 → X12. It has **no research** and only **two heroes**, both drawn from the
  X12 list.
- **X12** is the full seasonal recruitment wave: 9 free + 2 paid.
- Season filtering is **cumulative** (`getMaxSelectedSeasonIndex` in
  `js/app-generator.js` compares against the *highest* selected index), so tagging
  the two heroes `season: 'X10'` and the rest `season: 'X12'` is all that is needed
  — an X10 state sees two heroes, an X12 state sees all eleven. No new field.
- Already shipped in `js/state.js`: `HERO_ATLAS_ALL_SEASONS` ends `X8, X10, X12`
  and `TECH_SEASON_ORDER` ends `X8, X12` (no X10 research tree exists).

## 2. Roster — paste-ready

Append to the end of `allHeroesData` in `js/heroes-data.js` (add a comma to the
current last entry, `Cyrus`). `imageUrl` is intentionally omitted — see §5.

```js
  // X10 — intermediate bracket, no research, two heroes drawn from the X12 list.
  { name: "Healer", season: 'X10', Type:'Footmen', State:'Free' },
  { name: "Hellfire", season: 'X10', Type:'All', State:'Free' },
  // X12 — full seasonal recruitment wave.
  { name: "Belisarius", season: 'X12', Type:'Archers', State:'Free' },
  { name: "Pepin", season: 'X12', Type:'Footmen', State:'Free' },
  { name: "El Cid", season: 'X12', Type:'Cavalry', State:'Free' },
  { name: "Arslan", season: 'X12', Type:'Footmen', State:'Free' },
  { name: "Farah", season: 'X12', Type:'Cavalry', State:'Free' },
  { name: "Poison Master", season: 'X12', Type:'Archers', State:'Free' },
  { name: "Lilith", season: 'X12', Type:'Archers', State:'Free' },
  { name: "Al-Hawra", season: 'X12', Type:'Archers', State:'Paid' },
  { name: "Achilles", season: 'X12', Type:'Footmen', State:'Paid' }
```

Owner-confirmed troop types. `Hellfire` is a "general" hero → `Type:'All'`
(the same value `Isabella I` and `Kublai` use).

### Season badges read off the hero cards

These are the hero's *original* release marker, equivalent to the existing
`releaseSeason` field on the X8 catch-up wave. Only some were legible; the rest
were cropped. **Do not guess the cropped ones** — leave `releaseSeason` off unless
listed here as legible.

| Hero | Badge | Legible? |
|---|---|---|
| Lilith | `X09` | yes |
| Pepin | `X12` | yes |
| El Cid | `X12` | yes |
| Achilles | `SP` | yes |
| Al-Hawra | `X01` or `X10` | **ambiguous — cropped, do not use** |
| Healer, Hellfire, Belisarius, Arslan, Farah, Poison Master | — | cropped |

Note `X09` is not a value in `HERO_ATLAS_ALL_SEASONS`; that is normal and matches
the X8 wave, whose `releaseSeason` values (`X4`–`X7`, `SP`) are also outside the
list. `getSeasonIndex` returns `-1` for them, which existing code already handles.

## 3. Skills — paste-ready for `js/heroes-info.js`

Schema is `{ placement, minCopies, maxCopies, skills: [{ id, type, range, target, desc }] }`.

**`placement` and `minCopies` are NOT in the screenshots.** They are left as
`null` below and must be filled from the game before these records ship — do not
invent them. `maxCopies: 34` is safe: it matches every existing hero, and the
recruitment screen showed Pepin at `34/34`.

```js
    "Healer": {
        placement: null, // TODO: not visible in source screenshots
        minCopies: null, // TODO
        maxCopies: 34,
        skills: [
            { id: 2, type: "Status Skill", range: 2, target: "1 Random Ally", desc: "When the front-row squad deals damage, recover some troops as many as 40% of the damage dealt; when the front-row squad takes damage, 50% of the damage will be taken by the Hero's squad." },
            { id: 5, type: "Combat Skill", range: 2, target: "3 Random Ally", desc: "100% chance to recover some troops for all allied squads (recovery rate 50%)." },
            { id: 8, type: "Pre-Battle Skills", range: 5, target: "2 Random Enemy", desc: "The 2 effects are applied independently each round: 50% chance to reduce damage dealt by 2 random enemy squads by 10%; 50% chance to increase damage taken by 2 random enemy squads by 30%." }
        ]
    },
    "Hellfire": {
        placement: null, // TODO
        minCopies: null, // TODO
        maxCopies: 34,
        skills: [
            { id: 2, type: "Pre-Battle Skills", range: 5, target: "2 Random Enemy", desc: "Different effects: Footmen: Damage received by your squad -35%. Cavalry: When two random enemy squads launch combat skills and common attacks, the damage dealt by the squad is reduced by -8% (stackable up to 8 tiers [-64%]). Archers: In the first three rounds, when your squad takes Damage, there is a 65% Evasion Chance." },
            { id: 5, type: "Combat Skill", range: 2, target: "2 Random Ally", desc: "50% chance to Recover the team with the lowest value of our troops (Recovery Rate 270%), and Remove debuff state of two random teams on our side (Cannot remove pre-battle debuffs)." },
            { id: 8, type: "Pre-Battle Skills", range: 2, target: "3 Random Ally", desc: "All Friendly Squads Unit Countering -10%. Starting from the 4th round, the damage dealt by our other two squads is +40%." }
        ]
    },
    "Belisarius": {
        placement: null, // TODO
        minCopies: null, // TODO
        maxCopies: 34,
        skills: [
            { id: 2, type: "Combat Skill", range: 5, target: "1 Random Enemy", desc: "75% chance to deal 207% damage to 1 random enemy squad within the valid range and make the target enter the status of Bleeding and take 238% damage before taking any actions for 1 round. If the combat speed of the squad being attacked is lower than that of Belisarius, the skill will be cast once more (deemed as casting combat skills twice)." },
            { id: 5, type: "Combat Skill", range: 5, target: "1 Random Enemy", desc: "70% chance to deal 279% damage to the enemy squad with the lowest power and steal 40 of its Combat Speed (stackable and lasting till the battle ends). If the squad being attacked happens to be subjected to the status of Poisoned/Bleeding/Panicked, 279% damage will be dealt to all enemy squads." },
            { id: 8, type: "Status Skill", range: 0, target: "1 Random Ally", desc: "The Skill Damage dealt by Belisarius could be increased by 25% every round in the combat; the stats will be determined every round: if Belisarius is the first to take action in round, the Skill Damage he deals will be increased to 50% this round." }
        ]
    },
    "Pepin": {
        placement: null, // TODO
        minCopies: null, // TODO
        maxCopies: 34,
        skills: [
            { id: 2, type: "Combat Skill", range: 4, target: "2 Random Enemy", desc: "60% chance to deal 225% damage to 2 random enemy squads within the valid range and make the Resistance of the squads -150% [-300%] for 2 rounds (effect can be stacked)." },
            { id: 5, type: "Combat Skill", range: 2, target: "2 Random Ally", desc: "For every 6 combat skill cast by all squads of your side, 100% chance to increase the combat skill damage dealt by 3 Footman squads of your side within the valid range by 35% and apply a 'Life Steal' effect, allowing the said squads to use 15% of the damage dealt to restore the power of the squads, lasting 1 round." },
            { id: 8, type: "Combat Skill", range: 4, target: "3 Random Ally", desc: "For the first 3 rounds, 100% chance each round to restore some power of all squads of your side (recovery rate: 40%) and apply a shield, making the damage taken -80% for the subsequent 1 time. Starting from round 4: 100% chance to cast the 'Thunderstruck' skill once on the disarmed enemy squad." }
        ]
    },
    "El Cid": {
        placement: null, // TODO
        minCopies: null, // TODO
        maxCopies: 34,
        skills: [
            { id: 2, type: "Combat Skill", range: 3, target: "1 Random Enemy", desc: "80% chance to deal 500% damage to 1 random enemy squad; 100% of the damage will be used to restore the power of 2 random squads of your side." },
            { id: 5, type: "Combat Skill", range: 3, target: "2 Random Enemy", desc: "1 round of prep. 45% chance to deal 177% damage to 2 random enemy squads within the valid range and increase the skill damage against the targets by 30% for 2 rounds." },
            { id: 8, type: "Pre-Battle Skills", range: 3, target: "2 Random Ally", desc: "70% chance each round for 2 random squads of your side to have 15% more chance to cast skills that need prep and apply a shield to the squads, making the Damage taken by the squads -35% for the subsequent 2 time, lasting 1 round." }
        ]
    },
    "Arslan": {
        placement: null, // TODO
        minCopies: null, // TODO
        maxCopies: 34,
        skills: [
            { id: 2, type: "Status Skill", range: 5, target: "1 Random Enemy", desc: "When taking damage, the Hero's squad deals 250% damage to a random enemy squad." },
            { id: 5, type: "Status Skill", range: 1, target: "1 Random Ally", desc: "Damage to the Hero's squad -25%. When taking damage, the Hero's squad gains 30% Might [300% Might], effective until the end of the battle (can be stacked to up to 10 layers)." },
            { id: 8, type: "Status Skill", range: 5, target: "2 Random Enemy", desc: "Each round, makes 1-2 random enemy squads enter the burning state (damage rate: 150%, lasting one round). When the Hero's squad takes actions, deals an additional 350% damage to enemy squads in burning state." }
        ]
    },
    "Farah": {
        placement: null, // TODO
        minCopies: null, // TODO
        maxCopies: 34,
        skills: [
            { id: 2, type: "Pre-Battle Skills", range: 2, target: "3 Random Ally", desc: "In the first 3 rounds, all ally squads' damage dealt in normal attacks and additional attacks +80%. Meanwhile 100% chance to deal damage to enemies regardless of their dodging state." },
            { id: 5, type: "Pre-Battle Skills", range: 2, target: "3 Random Enemy", desc: "In first 3 rounds, 80% chance for all ally squads to launch a mass attack, dealing an additional 260% damage to 2 other squads apart from the target in normal attacks." },
            { id: 8, type: "Additional Attack", range: 5, target: "1 Random Enemy", desc: "After a normal attack, 100% chance to deal 300% damage to the enemy squad with the lowest amount of soldiers and 80% chance to deal an additional 25% [50%] damage (the effect lasts 2 rounds and can be stacked up to 2 layers)." }
        ]
    },
    "Poison Master": {
        placement: null, // TODO
        minCopies: null, // TODO
        maxCopies: 34,
        skills: [
            { id: 2, type: "Status Skill", range: 5, target: "1 Random Enemy", desc: "When all allied squads cast skills, 50% chance to poison a random enemy squad (poison rate 100% [300%]), lasting 2 rounds and stackable for 3 layers max." },
            { id: 5, type: "Pre-Battle Skills", range: 5, target: "1 Random Enemy", desc: "Each layer of poison on enemy squads will reduce the damage dealt by 10% (30% max) and their healing effect by -35% (100% max)." },
            { id: 8, type: "Combat Skill", range: 5, target: "1 Random Enemy", desc: "50% chance to poison a random enemy squad (poison rate 180%), lasting 2 rounds and stackable with other poisons. Meanwhile, 50% chance to make it enter the suppressed state lasting one round." }
        ]
    },
    "Lilith": {
        placement: null, // TODO
        minCopies: null, // TODO
        maxCopies: 34,
        skills: [
            { id: 2, type: "Combat Skill", range: 5, target: "2 Random Enemy", desc: "35% chance to deal 300% damage on 2 random enemy teams and cause them to enter a poisonous state (Damage rate: 150% for one round)." },
            { id: 5, type: "Combat Skill", range: 5, target: "2 Random Enemy", desc: "1 turn Prep, 50% chance to deal 450% damage to 2 random enemy squads, make them enter Confusion status (Skills and Basic Attack targets become random), for 1 round." },
            { id: 8, type: "Pre-Battle Skills", range: 5, target: "3 Random Ally", desc: "All of our squads are immune to 2 confusion effects. On your turn to act, deal 250% damage to enemy teams with control debuffs (Silence/Disarm/Suppress/Confuse) each round." }
        ]
    },
    "Al-Hawra": {
        placement: null, // TODO
        minCopies: null, // TODO
        maxCopies: 34,
        skills: [
            { id: 2, type: "Pre-Battle Skills", range: 5, target: "1 Random Ally", desc: "Al-Hawra dances gracefully on the battlefield; 90% chance each round to weaken a random enemy squad, making that squad unable to deal damage for 1 round(s); 90% chance to grant a random friendly squad All-Ability (damage increased by 50%, damage taken reduced by 50%, speed increased by 100, and a 15% increase in the chance of Fatal Blow and Destructive Strike), lasting 1 round(s). The skill's effect cannot be dispelled." },
            { id: 5, type: "Combat Skill", range: 5, target: "3 Random Enemy", desc: "Al-Hawra waits for the best timing; starting round 3, 100% chance each round to deal 300% Skill Damage to 3 enemy squads. If the troop power of the enemy squad with the lowest troop power is below 50%, deals an additional 400% Skill Damage." },
            { id: 8, type: "Status Skill", range: 2, target: "3 Random Ally", desc: "All friendly Archer squads gain the Phantom effect. When casting a combat skill, 30% chance to increase the Skill Damage by 23%; 23% chance to cast this skill once more. The effectiveness of the two effects will be determined independently." }
        ]
    },
    "Achilles": {
        placement: null, // TODO
        minCopies: null, // TODO
        maxCopies: 34,
        skills: [
            { id: 2, type: "Status Skill", range: 0, target: "1 Random Ally", desc: "At the start of the battle, Achilles gains the Demigod status: takes -60% damage; immune to control effects; deals +30% damage each round (stackable). Loses his Demigod status temporarily in round 5 and 6 and takes +20% damage." },
            { id: 5, type: "Combat Skill", range: 4, target: "1 Random Enemy", desc: "80% chance to deal 625% Skill Damage to 1 random enemy squad within the valid range; restores some troop power equal to 65% of the damage dealt for 2 random friendly squads. When Achilles is in his Demigod status, the Blade of Judgment has an 80% chance to target 1 more enemy squad, with a 50% chance to Silence the target for 2 round(s)." },
            { id: 8, type: "Pre-Battle Skills", range: 5, target: "3 Random Ally", desc: "Achilles activates the Sacred Realm, making all friendly and enemy squads immune to Fatal Blow and Destructive Strike. When any friendly squad's HP drops below 50% for the first time, immediately restores a large amount of troop power for the squad (recovery rate: 500%), and makes the squad deal +50% damage, take -50% damage, lasting 3 round(s)." }
        ]
    },
```

## 4. Attribute bars and tag lists (reference only — no schema field today)

`heroesExtendedData` has no field for these. Recorded so nobody has to re-read the
screenshots if a schema for them is added later. Attribute bars are the 2×2 block
on the hero card, read left→right, top row then bottom row.

| Hero | Attr bars | Effect | Buff | Debuff |
|---|---|---|---|---|
| Hellfire | 65 / 105 / 15 / 0 | Dodging, Remove debuff | Reduction Damage Taken, Recovery, Increase Damage Dealt | Reduction Damage Dealt |
| Lilith | 105 / 85 / 15 / 0 | Poisoned, Confusion | Immune Confused | — |
| Healer | 66 / 106 / 15 / 0 | — | Recovery, Share Damage, Recovery | Reduction Damage Dealt, Increase Damage Taken |
| Poison Master | 105 / 65 / 15 / 0 | Poisoned, Suppression, Poisoned | — | Reduction Damage Dealt, Reduction Recovery |
| Farah | 105 / 65 / 100 / 0 | — | Increase Additional Attack, Increase Normal Attack, Ignore dodging, Additional Damage | — |
| Arslan | 106 / 66 / 15 / 0 | Counterattack, Burning | Reduction Damage Taken, Additional Damage | — |
| Belisarius | 105 / 65 / 15 / 0 | Bleeding | Casting combat skills twice, Increase Skill Damage Dealt | Steal Combat Speed |
| Pepin | 65 / 105 / 15 / 0 | Life Steal | Increase Skill Damage Dealt, Reduction Damage Taken, Recovery | Resistance reduction |
| El Cid | 105 / 65 / 100 / 0 | — | Recovery, Increase Skill Damage Dealt, Reduction Damage Taken, Increase chance to cast skills | — |
| Al-Hawra | 105 / 85 / 15 / 0 | Weakness, Phantom | Increase Damage, Reduction Damage Taken, Increase Speed, Gains Chance Fatal Blow, Chance Destructive Strike, Additional Damage | — |
| Achilles | 105 / 65 / 15 / 0 | Demigod, Silence | Reduction Damage Taken, Immune control debuff, Increase Damage, Recovery, Immune Fatal Blow, Immune Destructive Strike | Increase Damage Taken, Immune Fatal Blow, Immune Destructive Strike |

The four bar icons are not labelled in-game; do not assume which stat each is.

## 5. Images — how to handle without vision

`js/state.js` already has a fallback, so **records with no `imageUrl` render a
placeholder rather than breaking**:

```js
return h?.imageUrl || `https://placehold.co/128x128?text=${encodeURIComponent(name)}`;
```

Two options, in order of preference:

1. **Owner uploads, model wires.** The owner uploads each portrait to ImgBB (the
   existing flow — `i.ibb.co` URLs in `heroes-data.js` are the owner's own manual
   uploads, confirmed) and supplies a `name → url` list. The model then only
   pastes `imageUrl: '<url>'` into the matching record. No vision needed.
2. **Ship without images first.** Land the records with no `imageUrl`, let the
   placeholder render, and add URLs in a follow-up. Nothing breaks.

Do **not** point new records at `static.wixstatic.com`. Those 40 existing hotlinks
are a third-party CDN the project does not control, and `x12-research.json`
likewise carries 36 Wix image URLs that must be stripped on ingest — text and
numbers only.

## 6. What else must change — this is NOT a data-only edit

Verified empirically: pasting the eleven records into `heroes-data.js` alone
**fails 7 unit tests**. Full chain:

1. **`js/heroes-data.js`** — the records in §2.
2. **`firestore.rules`** — `validAllStarBoHUsableHeroNames()` embeds all 78 hero
   names *and* caps `values.size() <= 78`. Both must grow.
   `tests/unit/all-star-boh-security.test.mjs:1079` asserts the rules list equals
   `allHeroesData` exactly.
   **⚠ Rules deploy separately from the app** (`firebase deploy --only
   firestore:rules`) — merging the PR does not ship them, and the file has already
   hit the Firestore 1000-expressions-per-request limit once. Measure the budget
   before deploying; a regression here returns 403s across BoH signup.
3. **`js/specialization-hero-paths.js`** — every `State:'Paid'` hero needs a tower
   profile (`troop`, `siegeBias`, weighted `demand`), enforced by two tests in
   `tests/unit/specialization-hero-paths.test.mjs`. **This blocks Al-Hawra and
   Achilles only.** Those are gameplay tuning values that drive real
   recommendations — they must be authored deliberately, not guessed.
   The 9 free heroes have no such requirement.
4. **`tests/unit/hero-season-scope.test.mjs`** — remove the landed names from
   `FUTURE_HEROES` (all 11 except `Pepin` are currently listed there).
5. **`tests/unit/season-scaffold.test.mjs`** — two tests assert X10/X12 are still
   empty; invert them once the roster lands.
6. **`js/heroes-info.js`** — the skills in §3, once `placement`/`minCopies` are known.

**Suggested split:** land the **9 free heroes** first (steps 1, 2, 4, 5), and hold
Al-Hawra + Achilles until their tower profiles exist. That unblocks most of the
value without inventing tuning data.

## 7. Research — X12

- Two trees, both War Badges, verified totals:
  - **Melee Legion - Charge** — 30 nodes, **4,763,500 WB**
  - **Melee Legion - Defense** — 29 nodes, **4,998,500 WB** (gameId 20005005,
    totalCp 17,677,576; source note credits Raven G, Ash Roe (709))
- **X10 has no research tree.** The ladder is X8 (*Lofty Legion*) → X12 → X15 →
  X18 → X20 → X22 → X24. `TECH_SEASON_ORDER` already reflects this.
- Full per-level cost data (`buildData`: gold/gems/time/cp/bonus + `cm`/`wb` medal
  costs), `gameNodeId`, `position` and prerequisite `relation` strings are in
  `x12-research.json`. Node tables are in `x12-research-nodes.md`.
- Import target is `js/tech-db.js`, which currently stops at X8 (29 trees). Follow
  the existing `X8_LOFTY_LEGION_COSTS` shape: a shared cost table plus
  `{ id, page, row, col, name, troop, buff, maxLevel, costType, wisdomCosts }`
  per node.
- Beyond scope but free once an importer exists: the same dataset carries X15,
  X18, X20, X22 and X24.
- Cost completeness varies across the wider dataset (some trees carry `total: 0`
  with empty `buildData`) — carry a per-node verification status rather than
  assuming every number is confirmed.

## 8. Exact edit checklist (no vision, no guesswork)

Verified against the repo on 2026-09-02.

1. `js/heroes-data.js` — add a comma after the `Cyrus` entry, paste §2 block before `];`.
2. `tests/unit/hero-season-scope.test.mjs` — delete these 10 strings from
   `FUTURE_HEROES` (currently 38 entries; `Pepin` is **not** in the list, nothing
   to remove for it):
   `'Achilles'`, `'Al-Hawra'`, `'Arslan'`, `'Belisarius'`, `'El Cid'`, `'Farah'`,
   `'Healer'`, `'Hellfire'`, `'Lilith'`, `'Poison Master'`
3. `firestore.rules` — in `validAllStarBoHUsableHeroNames()`: raise
   `values.size() <= 78` to the new count and add the new names to the embedded
   list, in the **same order** as `allHeroesData` (the test does `assert.deepEqual`,
   so order matters). Then deploy rules separately.
4. `tests/unit/season-scaffold.test.mjs` — invert the two emptiness tests
   (`X10 and X12 carry no heroes yet`, `the X10/X12 roster is still gated`).
5. If landing the two paid heroes: add tower profiles to
   `js/specialization-hero-paths.js` first, or the suite fails.

Acceptance: `npm run test:unit` (expect 1303 + your new assertions) and
`npm run i18n:check`. No new i18n keys are required — `seasonX10` / `seasonX12`
already ship in all 12 locale files.
