# DM Planner & Enhancement — i18n Key Spec

The authoritative translations live in `js/i18n/dm-materials/packs.js`, defined through
`defineDmMaterialsPack()` from `js/i18n/dm-materials/index.js`. The English canonical pack and
stable display IDs live beside that loader. Do not add new DM runtime copy directly to the flat
locale catalogs.

## Key Pattern Convention

- `planner.<field>` — used through `dmMaterialsText()` / `getDmPlannerCopy()`
- `enhance.<field>` — used through `dmMaterialsText()` for the enhancement subsection

The flat `dmPlanner*` / `dmEnhance*` English bridge exists only for compatibility with shared
catalog checks. Runtime rendering resolves the dedicated pack. Interpolation vars use
`{varName}` syntax.

---

## dmPlanner* — Core Crafting Planner (44 keys)

| Key | English fallback | Interpolation vars | Used in |
|---|---|---|---|
| `dmPlannerTitle` | Dragon Master Set Planner | — | header |
| `dmPlannerSubtitle` | Build normal troop gear first, then merge through your chosen tier path into gold Dragon Master pieces. | — | header |
| `dmPlannerPlan` | Your plan | — | plan panel heading |
| `dmPlannerPlanName` | Plan name | — | plan name edit field |
| `dmPlannerPreset` | Target preset | — | preset selector |
| `dmPlannerFull` | Full 6-piece set | — | preset option |
| `dmPlannerAttack` | Attack set (4 pieces) | — | preset option |
| `dmPlannerDefense` | Defense set (4 pieces) | — | preset option |
| `dmPlannerRoutes` | Crafting routes | — | route section heading |
| `dmPlannerDirectGold` | Direct Gold | — | route card label |
| `dmPlannerPurpleRoute` | Purple Route | — | route card label |
| `dmPlannerBlueRoute` | Blue Route | — | route card label |
| `dmPlannerFastest` | Fastest | — | route badge |
| `dmPlannerRecommended` | Recommended | — | route badge |
| `dmPlannerLowestSd` | Lowest Super Dragonite | — | route badge |
| `dmPlannerDirectHint` | Minimal merging. Highest Super Dragonite cost. | — | route hint |
| `dmPlannerPurpleHint` | Best balance of Super Dragonite, gems, and work. | — | route hint |
| `dmPlannerBlueHint` | Saves the most Super Dragonite. Most merging work. | — | route hint |
| `dmPlannerCompareRoutes` | Compare all routes | — | comparison toggle |
| `dmPlannerSetTitle` | Dragon Master six-piece set | — | set panel heading |
| `dmPlannerViewSet` | Set view | — | view toggle option |
| `dmPlannerViewSlot` | Slot view | — | view toggle option |
| `dmPlannerSelected` | Selected | — | selected indicator |
| `dmPlannerPieces` | Pieces | — | (unused in current render) |
| `dmPlannerSelectedPiece` | Selected piece | — | recipe heading eyebrow |
| `dmPlannerRecipeFor` | {piece} via the {route} route | piece, route | recipe heading sub |
| `dmPlannerNormalGear` | Normal troop gear | — | recipe stage label |
| `dmPlannerNormalGearHint` | Craft these normal troop pieces first at {tier} tier. | tier | recipe stage hint |
| `dmPlannerRawMaterials` | Raw materials | — | stockpile heading |
| `dmPlannerStockpileTitle` | Full-set material stockpile | — | stockpile subheading |
| `dmPlannerStockpileHint` | Materials required to craft the normal troop gear for one complete Dragon Master set. | — | stockpile description |
| `dmPlannerExactRecipe` | Exact material recipe | — | recipe aria-label |
| `dmPlannerNormalItem` | Normal equipment | — | image-fallback aria-label |
| `dmPlannerArchers` | Archers | — | troop label |
| `dmPlannerFootmen` | Footmen | — | troop label |
| `dmPlannerCavalry` | Cavalry | — | troop label |
| `dmPlannerDmPiece` | Dragon Master piece | — | (unused in current render) |
| `dmPlannerMergeFour` | Merge four into the next tier | — | merge footnote |
| `dmPlannerBeforeMerge` | Before gem merging | — | warning heading |
| `dmPlannerMandatoryGems` | Spend remaining Super Dragonite first so the game does not consume it during merging. | — | warning body |
| `dmPlannerCompletePiece` | Mark gold piece complete | — | complete button |
| `dmPlannerReopenPiece` | Reopen gold piece | — | reopen button |
| `dmPlannerSummary` | Plan summary | — | summary panel heading |
| `dmPlannerRoute` | Route | — | summary detail label |
| `dmPlannerCompleted` | Completed | — | completed count, summary |
| `dmPlannerOverallProgress` | Overall progress | — | progress label |
| `dmPlannerNextAction` | Next best action | — | next action heading |
| `dmPlannerCraftNext` | Craft next | — | (not used in current render) |
| `dmPlannerAllDone` | All targeted pieces are complete. | — | all-done state |
| `dmPlannerResources` | Resources | — | resource panel heading |
| `dmPlannerResourceOwned` | Owned | — | resource column header |
| `dmPlannerResourceNeeded` | Needed | — | resource column header |
| `dmPlannerResourceShortfall` | Shortfall | — | resource column header |
| `dmPlannerSuperDragonite` | Super Dragonite | — | resource label |
| `dmPlannerDragonite` | Dragonite | — | resource label |
| `dmPlannerGems` | Gems | — | resource label |
| `dmPlannerEditResources` | Edit resources | — | toggle label |
| `dmPlannerSavePlan` | Save plan | — | save button |
| `dmPlannerExportPlan` | Export plan (.json) | — | export button |
| `dmPlannerSharePlan` | Copy share link | — | share button |
| `dmPlannerClearProgress` | Clear progress | — | clear button |
| `dmPlannerDetails` | View full resource breakdown | — | breakdown toggle |
| `dmPlannerTier` | Tier | — | (unused in current render) |
| `dmPlannerPerPiece` | Per piece | — | material tooltip |
| `dmPlannerRemainingSet` | Remaining campaign | — | breakdown table |
| `dmPlannerSaved` | Plan saved. | — | toast |
| `dmPlannerExported` | Plan exported. | — | toast |
| `dmPlannerCopied` | Share link copied. | — | toast |
| `dmPlannerCopyFailed` | Could not copy the share link. | — | toast |
| `dmPlannerArmor` | Armor | — | slot label |
| `dmPlannerDagger` | Dagger | — | slot label |
| `dmPlannerRing` | Ring | — | slot label |
| `dmPlannerSword` | Sword | — | slot label |
| `dmPlannerHelmet` | Helmet | — | slot label |
| `dmPlannerBoots` | Boots | — | slot label |
| `dmPlannerWhite` | White | — | tier label |
| `dmPlannerGreen` | Green | — | tier label |
| `dmPlannerBlue` | Blue | — | tier label |
| `dmPlannerPurple` | Purple | — | tier label |
| `dmPlannerOrange` | Orange | — | tier label |
| `dmPlannerGold` | Gold | — | tier label |
| `dmPlannerCampaign` | Five-set campaign | — | campaign heading |
| `dmPlannerCampaignHint` | Build five complete Dragon Master sets: 30 gold pieces in total. | — | campaign hint |
| `dmPlannerCampaignSet` | Set {number} | number | campaign set label |
| `dmPlannerCampaignSetsComplete` | {completed} / {total} sets complete | completed, total | campaign progress |
| `dmPlannerCampaignPiecesComplete` | {completed} / {total} gold pieces | completed, total | campaign progress |
| `dmPlannerCampaignFocused` | Focused set | — | campaign focus label |
| `dmPlannerCampaignComplete` | Five Dragon Master sets complete | — | campaign complete state |
| `dmPlannerCampaignCompleteHint` | Crafting is complete. Continue with equipment enhancement, or reopen a set to review it. | — | campaign complete hint |
| `dmPlannerCampaignReview` | Review crafting sets | — | campaign review button |

> **Note:** `dmPlannerPieces`, `dmPlannerDmPiece`, `dmPlannerCraftNext`, and `dmPlannerTier` are defined in `DM_COPY_FALLBACKS` but not referenced in the current render tree. They exist as safety nets for future view additions — include them for completeness.

---

## dmEnhance* — Enhancement Subsection (14 keys)

| Key | English fallback | Interpolation vars | Used in |
|---|---|---|---|
| `dmEnhanceTitle` | Enhance Equipment | — | panel heading, scope-group aria-label |
| `dmEnhanceIntro` | Plan advancing completed Dragon Master pieces toward +5, +10, +15, +20, or +25. | — | header description |
| `dmEnhanceResSuperDragonCore` | Super Dragon Core | — | resource row label |
| `dmEnhanceResExoticCrystal` | Exotic Crystal | — | resource row label |
| `dmEnhanceResDragonCrystal` | Dragon Crystal | — | resource row label |
| `dmEnhanceCurrentLevel` | Current level | — | select label |
| `dmEnhanceTargetLevel` | Target level | — | select label |
| `dmEnhanceScopePiece` | One piece | — | scope toggle |
| `dmEnhanceScopeSet` | Full set (6 pieces) | — | scope toggle |
| `dmEnhanceOwned` | Owned | — | input column label |
| `dmEnhanceNeeded` | Needed | — | output column label |
| `dmEnhanceShortfall` | Shortfall | — | output column label |
| `dmEnhanceReached` | Target already reached | — | status notice |
| `dmEnhanceCredit` | Enhancement cost data by Redbull 1097 | — | credit line |

---

## Interpolation behaviour

`appT` uses `{varName}` interpolation. Example from `js/utils.js`:

```js
export function appT(key, vars = {}) {
  // looks up key in current locale, returns key itself if not found
  // then replaces {varName} with vars['varName']
}
```

---

## Locale registry and authoring scope

The table below is the original flat compatibility list, not the current runtime pack registry.
The core app exposes 13 locales, including the intentionally partial hr pack. Use the dedicated
DM pack registry and its checker for required coverage; Italian is no longer absent from the app.

| # | File | Path |
|---|---|---|
| 1 | `en.js` | `js/i18n/en.js` |
| 2 | `zh.js` | `js/i18n/zh.js` |
| 3 | `ar.js` | `js/i18n/ar.js` |
| 4 | `de.js` | `js/i18n/de.js` |
| 5 | `es.js` | `js/i18n/es.js` |
| 6 | `fr.js` | `js/i18n/fr.js` |
| 7 | `id.js` | `js/i18n/id.js` |
| 8 | `kr.js` | `js/i18n/kr.js` |
| 9 | `pt.js` | `js/i18n/pt.js` |
| 10 | `ru.js` | `js/i18n/ru.js` |
| 11 | `tr.js` | `js/i18n/tr.js` |

For non-English locales, translate the dedicated pack values only; stable field and display-ID
names are invariant. The flat-key tables above document the compatibility bridge, not the runtime
authoring location.

---

## Verification

Run the domain and full translation checks:

```bash
node --test tests/unit/domain-i18n-contract.test.mjs tests/unit/material-planner-model.test.mjs
npm run i18n:check
```

`auditDmMaterialsPack()` requires every planner/enhancement message, matching interpolation
placeholders, all 12 authored material-name IDs, and all 27 authored set/equipment/Dragon Master
item display IDs. Canonical English remains available for search and safe runtime fallback, but a
non-English pack cannot pass by inheriting those visible names.

## Change checklist

Add runtime messages to the dedicated DM domain, preserve placeholders and stable display IDs, and check visible copy in light/dark and RTL layouts. Do not mass-format unrelated flat locale catalogs.

[Data interpretation](dm-enhancement-source-data.md) · [Documentation index](README.md)
