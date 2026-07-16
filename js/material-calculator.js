import '../css/materials.css';

import { currentLanguage, setCurrentLanguage } from './state.js';
import { escapeHtml, formatLocaleNumber } from './utils.js';
import {
  DM_COPY_FALLBACKS,
  DM_ENHANCE_FALLBACKS,
  dmMaterialsText,
  getDmPlannerCopy,
  loadDmMaterialsLocale,
} from './i18n/dm-materials/index.js';
import {
  DM_DEFAULT_PLAN_NAME,
  DM_MATERIAL_STOCKPILES,
  DM_NORMAL_GEAR_DRAGONITE_PER_ITEM,
  DM_ROUTES,
  DM_SLOT_IDS,
  applyMaterialPreset,
  calculateMaterialPlan,
  createDefaultMaterialPlan,
  decodeMaterialPlan,
  encodeMaterialPlan,
  focusMaterialSet,
  getDmTierIdentity,
  getNormalGearRequirement,
  normalizeMaterialPlan,
  computeEnhancementNeed,
} from './material-planner-model.js';

export { DM_COPY_FALLBACKS, DM_ENHANCE_FALLBACKS } from './i18n/dm-materials/index.js';

const STORAGE_KEY = 'vts_dm_material_planner_v2';
const SHARE_PARAM = 'dmPlan';
const DM_ROUTE_ORDER = Object.freeze(['blue', 'purple', 'gold']);

const GAME_SLOT_IDS = Object.freeze({
  armor: 'armor',
  dagger: 'accessory',
  ring: 'amulet',
  sword: 'weapon',
  helmet: 'helmet',
  boots: 'boots',
});

const EQUIPMENT_SETS = Object.freeze({
  archers: Object.freeze({
    id: 'ranger',
    textId: 'sets.archers',
    nameIds: Object.freeze({
      armor: 'equipment.archers.armor',
      boots: 'equipment.archers.boots',
      ring: 'equipment.archers.ring',
      dagger: 'equipment.archers.dagger',
      sword: 'equipment.archers.sword',
      helmet: 'equipment.archers.helmet',
    }),
  }),
  footmen: Object.freeze({
    id: 'dreadnaught',
    textId: 'sets.footmen',
    nameIds: Object.freeze({
      armor: 'equipment.footmen.armor',
      boots: 'equipment.footmen.boots',
      ring: 'equipment.footmen.ring',
      dagger: 'equipment.footmen.dagger',
      sword: 'equipment.footmen.sword',
      helmet: 'equipment.footmen.helmet',
    }),
  }),
  cavalry: Object.freeze({
    id: 'steel-cavalry',
    textId: 'sets.cavalry',
    nameIds: Object.freeze({
      armor: 'equipment.cavalry.armor',
      boots: 'equipment.cavalry.boots',
      ring: 'equipment.cavalry.ring',
      dagger: 'equipment.cavalry.dagger',
      sword: 'equipment.cavalry.sword',
      helmet: 'equipment.cavalry.helmet',
    }),
  }),
});

const DM_ITEM_TEXT_IDS = Object.freeze({
  armor: 'items.armor',
  boots: 'items.boots',
  ring: 'items.ring',
  dagger: 'items.dagger',
  sword: 'items.sword',
  helmet: 'items.helmet',
});

const DM_RESOURCE_ICONS = Object.freeze({
  superDragonite: 'assets/dm/resources/super-dragonite.png',
  dragonite: 'assets/dm/resources/dragonite.png',
  gems: 'assets/dm/resources/gems.png',
});

// Item identities and per-piece recipes are transcribed from the supplied
// in-game Craft screens. Keep the source art/names literal; do not recolor or
// invent tier variants that have not been captured.
const NORMAL_MATERIALS = Object.freeze({
  archers: Object.freeze({
    setId: 'ranger',
    materials: Object.freeze({
      leather: Object.freeze({ textId: 'materials.archers.leather', stockpileIndex: 1 }),
      cloth: Object.freeze({ textId: 'materials.archers.cloth', stockpileIndex: 2 }),
      rope: Object.freeze({ textId: 'materials.archers.rope', stockpileIndex: 3 }),
      wood: Object.freeze({ textId: 'materials.archers.wood', stockpileIndex: 4 }),
    }),
  }),
  cavalry: Object.freeze({
    setId: 'cavalry',
    materials: Object.freeze({
      coil: Object.freeze({
        textId: 'materials.cavalry.coil',
        stockpileIndex: 1,
        asset: 'coil',
      }),
      claw: Object.freeze({
        textId: 'materials.cavalry.claw',
        stockpileIndex: 2,
        asset: 'claw',
      }),
      feather: Object.freeze({
        textId: 'materials.cavalry.feather',
        stockpileIndex: 3,
        asset: 'feather',
      }),
      ingot: Object.freeze({
        textId: 'materials.cavalry.ingot',
        stockpileIndex: 4,
        asset: 'ingot',
      }),
    }),
  }),
  footmen: Object.freeze({
    setId: 'dreadnaught',
    materials: Object.freeze({
      order: Object.freeze({ textId: 'materials.footmen.order', stockpileIndex: 1 }),
      ebony: Object.freeze({ textId: 'materials.footmen.ebony', stockpileIndex: 2 }),
      grindstone: Object.freeze({
        textId: 'materials.footmen.grindstone',
        stockpileIndex: 3,
      }),
      iron: Object.freeze({ textId: 'materials.footmen.iron', stockpileIndex: 4 }),
    }),
  }),
});

const NORMAL_GEAR_RECIPES = Object.freeze({
  archers: Object.freeze({
    armor: Object.freeze({ wood: 2, cloth: 1, rope: 1 }),
    boots: Object.freeze({ wood: 1, cloth: 2, rope: 1 }),
    ring: Object.freeze({ wood: 1, cloth: 1, rope: 1, leather: 1 }),
    dagger: Object.freeze({ cloth: 1, rope: 2, leather: 1 }),
    sword: Object.freeze({ leather: 3, wood: 1 }),
    helmet: Object.freeze({ leather: 3, rope: 1 }),
  }),
  cavalry: Object.freeze({
    armor: Object.freeze({ feather: 1, claw: 1, ingot: 2 }),
    boots: Object.freeze({ feather: 1, claw: 2, ingot: 1 }),
    ring: Object.freeze({ feather: 1, claw: 1, ingot: 1, coil: 1 }),
    dagger: Object.freeze({ feather: 2, claw: 1, coil: 1 }),
    sword: Object.freeze({ ingot: 1, coil: 3 }),
    helmet: Object.freeze({ feather: 1, coil: 3 }),
  }),
  footmen: Object.freeze({
    armor: Object.freeze({ grindstone: 2, iron: 1, ebony: 1 }),
    boots: Object.freeze({ grindstone: 1, iron: 2, ebony: 1 }),
    ring: Object.freeze({ grindstone: 1, iron: 1, ebony: 1, order: 1 }),
    dagger: Object.freeze({ iron: 1, ebony: 2, order: 1 }),
    sword: Object.freeze({ grindstone: 1, order: 3 }),
    helmet: Object.freeze({ ebony: 1, order: 3 }),
  }),
});

const EQUIPMENT_ASSET_TIERS = Object.freeze({
  blue: 'blue',
  purple: 'purple',
  orange: 'orange',
  gold: 'gold',
});

function equipmentAssetPath(setId, gameSlot, tier) {
  const assetTier = EQUIPMENT_ASSET_TIERS[tier] || EQUIPMENT_ASSET_TIERS.gold;
  const extension = assetTier === 'orange' ? 'jpg' : 'png';
  return `assets/dm/equipment/${setId}/${assetTier}/${gameSlot}.${extension}`;
}

const SLOT_ASSETS = Object.freeze(
  Object.fromEntries(
    DM_SLOT_IDS.map((slot) => {
      const gameSlot = GAME_SLOT_IDS[slot];
      return [
        slot,
        Object.freeze({
          setId: 'dragon-master',
          gameSlot,
          normal: Object.freeze(
            Object.fromEntries(
              Object.entries(EQUIPMENT_SETS).map(([troop, set]) => [
                troop,
                Object.freeze({
                  setId: set.id,
                  nameId: set.nameIds[slot],
                  suitId: set.textId,
                }),
              ])
            )
          ),
        }),
      ];
    })
  )
);

let rootEl = null;
let plan = null;
let activeDmTool = 'build';

function copy() {
  return getDmPlannerCopy();
}

function dmItemName(slot) {
  return dmMaterialsText(DM_ITEM_TEXT_IDS[slot]);
}

function materialName(definition) {
  return definition?.textId ? dmMaterialsText(definition.textId) : '';
}

function displayedPlanName() {
  return plan?.name === DM_DEFAULT_PLAN_NAME
    ? dmMaterialsText('plan.defaultName')
    : plan?.name || '';
}

function formatNumber(value) {
  return formatLocaleNumber(value, currentLanguage, { maximumFractionDigits: 0 });
}

function interpolate(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template
  );
}

function loadPlan() {
  const shared = decodeMaterialPlan(new URL(window.location.href).searchParams.get(SHARE_PARAM));
  if (shared) return shared;
  try {
    return normalizeMaterialPlan(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
  } catch {
    return createDefaultMaterialPlan();
  }
}

function savePlan() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch {
    // The planner remains fully usable when storage is disabled.
  }
}

function toast(message, type = 'info') {
  window.showToast?.(message, type, 3200);
}

function routeLabel(routeId, t = copy()) {
  return t[routeId === 'gold' ? 'directGold' : `${routeId}Route`];
}

function slotLabel(slotId, t = copy()) {
  return t[slotId] || slotId;
}

function tierLabel(tier, t = copy()) {
  const identity = getDmTierIdentity(tier);
  return t[identity.id] || identity.label;
}

function tierPresentation(tierId) {
  const identity = getDmTierIdentity(tierId);
  return {
    ...identity,
    className: `dm-tier--${identity.id}`,
    attributes: `data-tier="${identity.id}" data-dm-tier="${identity.id}" data-dm-tier-rank="${identity.rank}"`,
  };
}

function renderResourceValue(value) {
  return value ? formatNumber(value) : '—';
}

function routeBadgeKey(routeId) {
  return routeId === 'gold' ? 'fastest' : routeId === 'purple' ? 'recommended' : 'lowestSd';
}

function routeHintKey(routeId) {
  return routeId === 'gold' ? 'directHint' : routeId === 'purple' ? 'purpleHint' : 'blueHint';
}

function renderRoutePath(routeId, t) {
  const route = DM_ROUTES[routeId];
  return `
    <span class="dm-route-path" aria-label="${escapeHtml(routeLabel(routeId, t))}">
      ${route.stages
        .map((stage, index) => {
          const tier = tierPresentation(stage.tier);
          return `${index ? '<span class="dm-route-path__arrow" aria-hidden="true">→</span>' : ''}<span class="dm-route-path__step ${tier.className}" ${tier.attributes}><span>${escapeHtml(tierLabel(stage.tier, t))}</span><b>×${formatNumber(stage.count)}</b></span>`;
        })
        .join('')}
    </span>`;
}

function renderRouteCard(routeId, result, t) {
  const route = DM_ROUTES[routeId];
  const tier = tierPresentation(route.normalTier);
  const active = plan.route === routeId;
  return `
    <button type="button" class="dm-route-card dm-route-card--${routeId} ${tier.className}${active ? ' is-active' : ''}" ${tier.attributes} data-dm-route="${routeId}" aria-pressed="${active}">
      <span class="dm-route-card__head">
        <span class="dm-route-dot" aria-hidden="true"></span>
        <strong class="dm-route-card__title" title="${escapeHtml(routeLabel(routeId, t))}">${escapeHtml(routeLabel(routeId, t))}</strong>
        <span class="dm-route-badge">${escapeHtml(t[routeBadgeKey(routeId)])}</span>
      </span>
      ${renderRoutePath(routeId, t)}
      <span class="dm-route-resources">
        <span class="dm-route-stat"><span>${escapeHtml(t.superDragonite)}</span><b>${renderResourceValue(route.perPiece.superDragonite * result.targetSlots.length)}</b></span>
        <span class="dm-route-stat"><span>${escapeHtml(t.dragonite)}</span><b>${renderResourceValue(route.perPiece.dragonite * result.targetSlots.length)}</b></span>
        <span class="dm-route-stat"><span>${escapeHtml(t.gems)}</span><b>${renderResourceValue(route.perPiece.gems * result.targetSlots.length)}</b></span>
      </span>
      <small>${escapeHtml(t[routeHintKey(routeId)])}</small>
    </button>`;
}

function renderRouteChooser(result, t) {
  return `
    <section class="dm-panel dm-route-chooser" aria-labelledby="dmRoutesHeading">
      <div class="dm-route-chooser__heading">
        <span class="dm-eyebrow">${escapeHtml(t.route)}</span>
        <h3 id="dmRoutesHeading">${escapeHtml(t.routes)}</h3>
      </div>
      <div class="dm-route-list">
        ${DM_ROUTE_ORDER.map((routeId) => renderRouteCard(routeId, result, t)).join('')}
      </div>
    </section>`;
}

function renderPlanPanel(result, t) {
  const planName = displayedPlanName();
  return `
    <aside class="dm-panel dm-plan-panel" aria-labelledby="dmPlanHeading">
      <div class="dm-panel-heading">
        <span class="dm-eyebrow">${escapeHtml(t.plan)}</span>
        <h3 id="dmPlanHeading">${escapeHtml(planName)}</h3>
      </div>
      <label class="dm-field">
        <span>${escapeHtml(t.planName)}</span>
        <input type="text" name="dm-plan-name" maxlength="80" value="${escapeHtml(planName)}" data-dm-plan-name>
      </label>
      <label class="dm-field">
        <span>${escapeHtml(t.targetSets)}</span>
        <select name="dm-target-sets" data-dm-target-sets>
          ${[1, 2, 3, 4, 5].map((count) => `<option value="${count}"${plan.targetSets === count ? ' selected' : ''}>${escapeHtml(interpolate(t.targetSetsOption, { count }))}</option>`).join('')}
        </select>
      </label>
      <div class="dm-set-picker" role="group" aria-label="${escapeHtml(t.targetSets)}">
        ${result.setSummaries.map((set) => `<button type="button" data-dm-focus-set="${set.setId}" aria-pressed="${plan.focusedSet === set.setId}" class="${set.complete ? 'is-complete' : ''}">${escapeHtml(interpolate(t.campaignSet, { number: set.setId }))}</button>`).join('')}
      </div>
      <label class="dm-field">
        <span>${escapeHtml(t.preset)}</span>
        <select name="dm-target-preset" data-dm-preset>
          ${['full', 'attack', 'defense'].map((preset) => `<option value="${preset}"${plan.preset === preset ? ' selected' : ''}>${escapeHtml(t[preset])}</option>`).join('')}
        </select>
      </label>
      <section class="dm-piece-inventory" aria-labelledby="dmPieceInventoryHeading">
        <div>
          <h4 id="dmPieceInventoryHeading">${escapeHtml(t.inventoryTitle)}</h4>
          <p>${escapeHtml(t.inventoryHint)}</p>
        </div>
        <div class="dm-piece-inventory__grid">
          ${DM_SLOT_IDS.map(
            (slot) => `<label>
            <span>${escapeHtml(slotLabel(slot, t))}</span>
            <input type="number" min="0" max="99" inputmode="numeric" value="${plan.ownedPieces[slot]}" data-dm-owned-piece="${slot}" aria-label="${escapeHtml(interpolate(t.inventoryOwned, { piece: slotLabel(slot, t) }))}">
          </label>`
          ).join('')}
        </div>
      </section>
    </aside>`;
}

function renderSlotCard(slot, t) {
  const tier = tierPresentation('gold');
  const asset = SLOT_ASSETS[slot];
  const image = equipmentAssetPath(asset.setId, asset.gameSlot, tier.id);
  const active = plan.selectedSlot === slot;
  const completed = plan.completed[slot];
  const targeted = plan.targets[slot];
  const itemName = dmItemName(slot);
  return `
    <button type="button" class="dm-slot-card dm-tier-surface ${tier.className}${active ? ' is-active' : ''}${completed ? ' is-complete' : ''}${targeted ? '' : ' is-disabled'}" ${tier.attributes} data-dm-slot="${slot}" aria-pressed="${active}" aria-label="${escapeHtml(`${slotLabel(slot, t)}: ${itemName}`)}" title="${escapeHtml(itemName)}" ${targeted ? '' : 'disabled'}>
      <span class="dm-slot-card__name" title="${escapeHtml(slotLabel(slot, t))}">${escapeHtml(slotLabel(slot, t))}</span>
      <span class="dm-slot-card__art dm-media-slot" title="${escapeHtml(itemName)}">
        <img src="${image}" alt="${escapeHtml(itemName)}" width="128" height="128" loading="lazy" decoding="async">
      </span>
      <span class="dm-slot-card__tier dm-tier-label">${escapeHtml(tierLabel(tier.id, t))}</span>
      <span class="dm-slot-progress"><strong>${completed ? '1 / 1' : '0 / 1'}</strong></span>
      <span class="dm-slot-state${active ? ' is-selected' : ''}">${active ? escapeHtml(t.selected) : '&nbsp;'}</span>
    </button>`;
}

function renderSetPanel(result, t) {
  return `
    <section class="dm-panel dm-set-panel" aria-labelledby="dmSetHeading">
      <div class="dm-section-heading-row">
        <div>
          <span class="dm-eyebrow">${formatNumber(result.completedSlots.length)} / ${formatNumber(result.targetSlots.length)} ${escapeHtml(t.completed)}</span>
          <h3 id="dmSetHeading">${escapeHtml(t.setTitle)}</h3>
        </div>
        <div class="dm-view-switch" role="group" aria-label="${escapeHtml(t.setTitle)}">
          <button type="button" data-dm-view="set" aria-pressed="${plan.viewMode === 'set'}">${escapeHtml(t.viewSet)}</button>
          <button type="button" data-dm-view="slot" aria-pressed="${plan.viewMode === 'slot'}">${escapeHtml(t.viewSlot)}</button>
        </div>
      </div>
      <div class="dm-slot-grid dm-slot-grid--${plan.viewMode}">
        ${DM_SLOT_IDS.map((slot) => renderSlotCard(slot, t)).join('')}
      </div>
    </section>`;
}

function renderMaterialStockpile(result, t) {
  const stockpile = DM_MATERIAL_STOCKPILES[result.route.id];
  if (!stockpile) return '';
  const tier = tierPresentation(result.route.normalTier);
  const suits = [
    ['ranger', 'archers', 'sets.archers'],
    ['cavalry', 'cavalry', 'sets.cavalry'],
    ['dreadnaught', 'footmen', 'sets.footmen'],
  ];
  return `
    <section class="dm-material-stockpile dm-tier-panel ${tier.className}" ${tier.attributes} aria-labelledby="dmStockpileHeading">
      <div class="dm-recipe-node__head">
        <span class="dm-stage-number">1</span>
        <div><strong id="dmStockpileHeading">${escapeHtml(t.rawMaterials)}</strong><small>${escapeHtml(t.stockpileTitle)} · ${escapeHtml(tierLabel(result.route.normalTier, t))}</small></div>
      </div>
      <p>${escapeHtml(t.stockpileHint)}</p>
      <div class="dm-stockpile-suits">
        ${suits
          .map(
            ([suitId, troopKey, suitNameId]) => `
          <article class="dm-stockpile-suit dm-tier-surface ${tier.className}" ${tier.attributes}>
            <header><strong>${escapeHtml(dmMaterialsText(suitNameId))}</strong><span>${escapeHtml(t[troopKey])}</span></header>
            <div>
              ${stockpile[suitId]
                .map((count, index) => {
                  const materialEntry = Object.entries(NORMAL_MATERIALS[troopKey].materials).find(
                    ([, entry]) => entry.stockpileIndex === index + 1
                  );
                  const [materialKey, material] = materialEntry || ['', null];
                  const image = material
                    ? getNormalMaterialImage(troopKey, materialKey, result.route.normalTier)
                    : '';
                  const displayName = materialName(material);
                  return `
                  <span class="dm-stockpile-material${image ? '' : ' is-text-only'}" ${tier.attributes} data-dm-inventory-item>
                    ${image ? `<img src="${image}" alt="${escapeHtml(displayName)}" width="96" height="76" loading="lazy" decoding="async">` : `<span class="dm-stockpile-material__placeholder">${escapeHtml(displayName)}</span>`}
                    <b>×${formatNumber(count)}</b>
                    <small>${escapeHtml(displayName)}</small>
                  </span>`;
                })
                .join('')}
            </div>
          </article>`
          )
          .join('')}
      </div>
    </section>`;
}

function getNormalMaterialImage(troop, material, tier) {
  const definition = NORMAL_MATERIALS[troop]?.materials?.[material];
  if (!definition) return '';
  if (definition.asset) return `assets/dm/materials/${tier}/${definition.asset}.png`;
  if (tier === 'blue' || tier === 'purple') {
    return `assets/dm/materials/stockpile/${tier}/${NORMAL_MATERIALS[troop].setId}-${definition.stockpileIndex}.png`;
  }
  return '';
}

function renderNormalMaterialRecipe(troop, slot, route, gearCount, t) {
  const recipe = NORMAL_GEAR_RECIPES[troop]?.[slot];
  if (!recipe) return '';
  const tier = tierPresentation(route.normalTier);
  return `
    <div class="dm-normal-materials" aria-label="${escapeHtml(t.exactRecipe)}">
      ${Object.entries(recipe)
        .map(([material, perPiece]) => {
          const definition = NORMAL_MATERIALS[troop].materials[material];
          const image = getNormalMaterialImage(troop, material, route.normalTier);
          const total = perPiece * gearCount;
          const displayName = materialName(definition);
          return `
          <span class="dm-normal-material${image ? '' : ' is-text-only'}" ${tier.attributes} data-dm-recipe-ingredient title="${escapeHtml(`${displayName}: ${perPiece} ${t.perPiece}`)}">
            ${image ? `<img src="${image}" alt="${escapeHtml(displayName)}" width="56" height="56" loading="lazy" decoding="async">` : `<small>${escapeHtml(displayName)}</small>`}
            <b>×${formatNumber(total)}</b>
          </span>`;
        })
        .join('')}
      <span class="dm-normal-material dm-normal-material--resource" ${tier.attributes} data-dm-normal-dragonite title="${escapeHtml(`${t.dragonite}: ${formatNumber(DM_NORMAL_GEAR_DRAGONITE_PER_ITEM[route.normalTier])} ${t.perPiece}`)}">
        <img src="${DM_RESOURCE_ICONS.dragonite}" alt="${escapeHtml(t.dragonite)}" width="56" height="56" loading="lazy" decoding="async">
        <b>×${formatNumber(DM_NORMAL_GEAR_DRAGONITE_PER_ITEM[route.normalTier] * gearCount)}</b>
      </span>
    </div>`;
}

function renderNormalGear(slot, result, t, stageNumber) {
  const route = result.route;
  const tier = tierPresentation(route.normalTier);
  const asset = SLOT_ASSETS[slot];
  const requirements = getNormalGearRequirement(route.id, slot);
  const gear = ['archers', 'footmen', 'cavalry'].map((troop) => ({
    troop,
    count: requirements[troop],
    ...asset.normal[troop],
    name: dmMaterialsText(asset.normal[troop].nameId),
    suit: dmMaterialsText(asset.normal[troop].suitId),
    image: equipmentAssetPath(asset.normal[troop].setId, asset.gameSlot, route.normalTier),
  }));
  return `
    <article class="dm-recipe-node dm-recipe-node--normal dm-tier-panel ${tier.className}" ${tier.attributes}>
      <div class="dm-recipe-node__head">
        <span class="dm-stage-number">${stageNumber}</span>
        <div><strong>${escapeHtml(t.normalGear)}</strong><small>${escapeHtml(interpolate(t.normalGearHint, { tier: tierLabel(route.normalTier, t) }))}</small></div>
      </div>
      <div class="dm-normal-gear-grid">
        ${gear
          .map(
            (item) => `
          <div class="dm-normal-gear-card dm-tier-surface ${tier.className}" ${tier.attributes} data-dm-normal-gear>
            <span class="dm-normal-gear-art">
              <img src="${item.image}" alt="${escapeHtml(item.name)}" width="128" height="128" loading="lazy" decoding="async">
            </span>
            <span>${escapeHtml(item.suit)} · ${escapeHtml(t[item.troop])}</span>
            <small>${escapeHtml(item.name)}</small>
            <strong>×${formatNumber(item.count)}</strong>
            ${renderNormalMaterialRecipe(item.troop, slot, route, item.count, t)}
          </div>`
          )
          .join('')}
      </div>
    </article>`;
}

function renderDmStages(slot, result, t, firstStageNumber) {
  const itemName = dmItemName(slot);
  return result.route.stages
    .map((stage, index) => {
      const tier = tierPresentation(stage.tier);
      const asset = SLOT_ASSETS[slot];
      const image = equipmentAssetPath(asset.setId, asset.gameSlot, stage.tier);
      return `
    <article class="dm-recipe-node dm-recipe-node--${stage.tier} dm-tier-surface ${tier.className}" ${tier.attributes} data-dm-stage>
      <div class="dm-recipe-node__head">
        <span class="dm-stage-number">${index + firstStageNumber}</span>
        <div><strong>${escapeHtml(itemName)}</strong><small>${escapeHtml(tierLabel(stage.tier, t))}</small></div>
      </div>
      <span class="dm-stage-art">
        <img class="dm-stage-image" src="${image}" alt="${escapeHtml(itemName)}" width="128" height="128" loading="lazy" decoding="async">
      </span>
      <span class="dm-stage-count">×${formatNumber(stage.count)}</span>
      ${index === 0 ? renderDmStageResources(result.route, t) : ''}
      ${index > 0 || result.route.stages.length > 1 ? `<small class="dm-stage-merge">${escapeHtml(t.mergeFour)}</small>` : ''}
    </article>`;
    })
    .join('');
}

function renderDmStageResources(route, t) {
  return `
    <span class="dm-stage-resources" aria-label="${escapeHtml(t.resources)}">
      ${Object.entries(route.dmPieceResources)
        .filter(([, count]) => count > 0)
        .map(
          ([key, count]) => `
        <span class="dm-stage-resource" data-dm-stage-resource="${key}" title="${escapeHtml(t[key])}">
          <img src="${DM_RESOURCE_ICONS[key]}" alt="${escapeHtml(t[key])}" width="40" height="40" loading="lazy" decoding="async">
          <b>×${formatNumber(count)}</b>
        </span>`
        )
        .join('')}
    </span>`;
}

function renderRecipePanel(result, t) {
  const slot = plan.selectedSlot;
  const itemName = dmItemName(slot);
  const completed = plan.completed[slot];
  const hasStockpile = Boolean(DM_MATERIAL_STOCKPILES[result.route.id]);
  const totalSteps = (hasStockpile ? 1 : 0) + 1 + result.route.stages.length;
  return `
    <section class="dm-panel dm-recipe-panel" aria-labelledby="dmRecipeHeading" data-dm-flow-route="${result.route.id}" data-dm-total-steps="${totalSteps}">
      <div class="dm-section-heading-row">
        <div>
          <span class="dm-eyebrow">${escapeHtml(t.selectedPiece)}</span>
          <h3 id="dmRecipeHeading">${escapeHtml(itemName)}</h3>
          <p>${escapeHtml(
            interpolate(t.recipeFor, {
              piece: slotLabel(slot, t),
              route: tierLabel(plan.route === 'gold' ? 'gold' : plan.route, t),
            })
          )}</p>
        </div>
        <button type="button" class="dm-complete-button${completed ? ' is-complete' : ''}" data-dm-toggle-complete data-dm-complete-location="recipe">${escapeHtml(completed ? t.reopenPiece : t.completePiece)}</button>
      </div>
      <div class="dm-active-route dm-route-card--${result.route.id}">
        <span class="dm-active-route__copy">
          <span class="dm-route-dot" aria-hidden="true"></span>
          <strong>${escapeHtml(routeLabel(result.route.id, t))}</strong>
          <span class="dm-route-badge">${escapeHtml(t[routeBadgeKey(result.route.id)])}</span>
          <small>${escapeHtml(t[routeHintKey(result.route.id)])}</small>
        </span>
        ${renderRoutePath(result.route.id, t)}
      </div>
      ${renderMaterialStockpile(result, t)}
      <div class="dm-recipe-flow dm-recipe-flow--${result.route.id}">
        ${renderNormalGear(slot, result, t, hasStockpile ? 2 : 1)}
        ${renderDmStages(slot, result, t, hasStockpile ? 3 : 2)}
      </div>
      ${
        plan.route === 'gold'
          ? ''
          : `
        <div class="dm-warning" role="note">
          <strong>${escapeHtml(t.beforeMerge)}</strong>
          <span>${escapeHtml(t.mandatoryGems)}</span>
        </div>`
      }
    </section>`;
}

function renderResourceRows(result, t, editable = false) {
  const resources = [
    ['superDragonite', t.superDragonite],
    ['dragonite', t.dragonite],
    ['gems', t.gems],
  ];
  return resources
    .map(
      ([key, label]) => `
    <div class="dm-resource-row">
      <span class="dm-resource-name"><img class="dm-resource-icon" src="${DM_RESOURCE_ICONS[key]}" alt="" width="24" height="24" loading="lazy" decoding="async" aria-hidden="true">${escapeHtml(label)}</span>
      ${editable ? `<label><span class="sr-only">${escapeHtml(t.resourceOwned)} ${escapeHtml(label)}</span><input type="number" name="dm-owned-${key}" min="0" inputmode="numeric" value="${plan.ownedResources[key]}" data-dm-resource="${key}"></label>` : `<strong>${formatNumber(plan.ownedResources[key])}</strong>`}
      <span>${formatNumber(result.needed[key])}</span>
      <b class="${result.shortfall[key] ? 'is-short' : 'is-ready'}">${formatNumber(result.shortfall[key])}</b>
    </div>`
    )
    .join('');
}

function renderSummaryPanel(result, t) {
  const progress = Math.round(result.overallProgress * 100);
  const progressValueText = `${formatNumber(progress)}%. ${interpolate(t.campaignPiecesComplete, {
    completed: formatNumber(result.totalCompletedPieces),
    total: formatNumber(result.totalTargetPieces),
  })}`;
  const nextText = result.nextSlot
    ? interpolate(t.normalGearHint, { tier: tierLabel(result.route.normalTier, t) })
    : t.allDone;
  return `
    <aside class="dm-summary-stack">
      <section class="dm-panel dm-summary-panel" aria-labelledby="dmSummaryHeading">
        <h3 id="dmSummaryHeading">${escapeHtml(t.summary)}</h3>
        <dl>
          <div><dt>${escapeHtml(t.preset)}</dt><dd>${escapeHtml(t[plan.preset])}</dd></div>
          <div><dt>${escapeHtml(t.route)}</dt><dd>${escapeHtml(routeLabel(plan.route, t))}</dd></div>
          <div><dt>${escapeHtml(t.targetSets)}</dt><dd>${formatNumber(result.targetSetCount)}</dd></div>
          <div><dt>${escapeHtml(t.completed)}</dt><dd>${formatNumber(result.totalCompletedPieces)} / ${formatNumber(result.totalTargetPieces)}</dd></div>
        </dl>
        <div class="dm-progress-copy"><span id="dmProgressLabel">${escapeHtml(t.overallProgress)}</span><strong>${formatNumber(progress)}%</strong></div>
        <div class="dm-progress-track" role="progressbar" aria-labelledby="dmProgressLabel" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}" aria-valuetext="${escapeHtml(progressValueText)}"><span style="width:${progress}%"></span></div>
      </section>
      <section class="dm-panel dm-next-panel">
        <span class="dm-eyebrow">${escapeHtml(t.nextAction)}</span>
        <strong>${escapeHtml(nextText)}</strong>
        ${result.nextSlot ? `<button type="button" data-dm-slot="${result.nextSlot}">${escapeHtml(dmItemName(result.nextSlot))}</button>` : ''}
      </section>
      <section class="dm-panel dm-resource-panel" aria-labelledby="dmResourceHeading">
        <div class="dm-section-heading-row">
          <h3 id="dmResourceHeading">${escapeHtml(t.resources)}</h3>
          <button type="button" class="dm-text-button" data-dm-toggle-breakdown aria-expanded="${plan.breakdownOpen}">${escapeHtml(t.editResources)}</button>
        </div>
        <div class="dm-resource-table-head"><span></span><span>${escapeHtml(t.resourceOwned)}</span><span>${escapeHtml(t.resourceNeeded)}</span><span>${escapeHtml(t.resourceShortfall)}</span></div>
        ${renderResourceRows(result, t, plan.breakdownOpen)}
        <button type="button" class="dm-secondary-button" data-dm-toggle-breakdown aria-expanded="${plan.breakdownOpen}">${escapeHtml(t.details)}</button>
      </section>
      <section class="dm-plan-actions">
        <button type="button" class="dm-primary-button" data-dm-save>${escapeHtml(t.savePlan)}</button>
        <button type="button" class="dm-secondary-button" data-dm-export>${escapeHtml(t.exportPlan)}</button>
        <button type="button" class="dm-secondary-button" data-dm-share>${escapeHtml(t.sharePlan)}</button>
        <button type="button" class="dm-danger-button" data-dm-clear>${escapeHtml(t.clearProgress)}</button>
      </section>
    </aside>`;
}

function renderBreakdown(result, t) {
  if (!plan.breakdownOpen) return '';
  return `
    <section class="dm-panel dm-breakdown-panel">
      <h3>${escapeHtml(t.details)}</h3>
      <div class="dm-breakdown-table" role="table">
        <div role="row" class="dm-breakdown-head"><span role="columnheader">${escapeHtml(t.route)}</span><span role="columnheader">${escapeHtml(t.perPiece)}</span><span role="columnheader">${escapeHtml(t.remainingSet)}</span></div>
        ${['superDragonite', 'dragonite', 'gems'].map((key) => `<div role="row"><strong role="cell">${escapeHtml(t[key])}</strong><span role="cell">${formatNumber(result.route.perPiece[key])}</span><span role="cell">${formatNumber(result.needed[key])}</span></div>`).join('')}
      </div>
    </section>`;
}

function alignMobileScrollers() {
  if (!window.matchMedia?.('(max-width: 720px)').matches) return;
  window.requestAnimationFrame(() => {
    const pairs = [['.dm-slot-grid', '[data-dm-slot][aria-pressed="true"]']];
    for (const [scrollerSelector, itemSelector] of pairs) {
      const scroller = rootEl?.querySelector(scrollerSelector);
      const item = scroller?.querySelector(itemSelector);
      if (!scroller || !item) continue;
      const scrollerRect = scroller.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      const delta =
        itemRect.left + itemRect.width / 2 - (scrollerRect.left + scrollerRect.width / 2);
      scroller.scrollLeft += delta;
    }
  });
}

function handleImageError(event) {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || !rootEl?.contains(image)) return;
  if (image.dataset.dmFallbackApplied === 'true') return;
  image.dataset.dmFallbackApplied = 'true';

  const label = image.alt || copy().normalItem;
  const fallback = document.createElement('span');
  fallback.className = 'dm-image-fallback';
  fallback.setAttribute('role', 'img');
  fallback.setAttribute('aria-label', label);
  fallback.title = label;
  fallback.textContent = '◇';
  image.parentElement?.classList.add('is-image-missing');
  image.replaceWith(fallback);
}

const ENHANCE_TEXT_IDS = Object.freeze({
  dmEnhanceTitle: 'enhance.title',
  dmEnhanceIntro: 'enhance.intro',
  dmEnhanceResSuperDragonCore: 'enhance.resourceSuperDragonCore',
  dmEnhanceResExoticCrystal: 'enhance.resourceExoticCrystal',
  dmEnhanceResDragonCrystal: 'enhance.resourceDragonCrystal',
  dmEnhanceCurrentLevel: 'enhance.currentLevel',
  dmEnhanceTargetLevel: 'enhance.targetLevel',
  dmEnhanceScopePiece: 'enhance.scopePiece',
  dmEnhanceScopeSet: 'enhance.scopeSet',
  dmEnhanceOwned: 'enhance.owned',
  dmEnhanceNeeded: 'enhance.needed',
  dmEnhanceShortfall: 'enhance.shortfall',
  dmEnhanceReached: 'enhance.reached',
  dmEnhanceCredit: 'enhance.credit',
});

function enhanceText(key, fallback) {
  const id = ENHANCE_TEXT_IDS[key];
  return id ? dmMaterialsText(id) : fallback;
}

// Honest resource identity: name + rarity-frame colour (no fabricated icons —
// clean Super Dragon Core / Exotic / Dragon Crystal art is not yet supplied).
const ENHANCE_RESOURCES = [
  {
    key: 'superDragonCore',
    frame: 'violet',
    icon: 'core',
    i18n: 'dmEnhanceResSuperDragonCore',
    fallback: 'Super Dragon Core',
  },
  {
    key: 'exoticCrystal',
    frame: 'violet',
    icon: 'exotic',
    i18n: 'dmEnhanceResExoticCrystal',
    fallback: 'Exotic Crystal',
  },
  {
    key: 'dragonCrystal',
    frame: 'gold',
    icon: 'dragon',
    i18n: 'dmEnhanceResDragonCrystal',
    fallback: 'Dragon Crystal',
  },
];

const ENHANCE_QUICK_LEVELS = Object.freeze([0, 5, 10, 15, 20, 25]);

function renderEnhanceLevelControl(field, value, label) {
  const shortcuts = ENHANCE_QUICK_LEVELS.map(
    (level) =>
      `<button type="button" class="dm-enhance-quick${level === value ? ' is-active' : ''}" data-dm-enhance-quick-field="${field}" data-dm-enhance-quick-level="${level}" aria-pressed="${level === value}">+${level}</button>`
  ).join('');
  return `<div class="dm-enhance-level">
    <label for="dmEnhance${field}">${escapeHtml(label)}</label>
    <input id="dmEnhance${field}" type="number" inputmode="numeric" min="0" max="25" step="1" value="${value}" data-dm-enhance-field="${field}" />
    <div class="dm-enhance-quick-list" role="group" aria-label="${escapeHtml(label)}">${shortcuts}</div>
  </div>`;
}

function renderEnhancePanel() {
  const enh = plan.enhancement;
  const pieceCount = enh.scope === 'set' ? 6 : 1;
  const calc = computeEnhancementNeed({
    currentLevel: enh.currentLevel,
    currentLevels:
      enh.scope === 'set' ? DM_SLOT_IDS.map((slot) => enh.currentLevels[slot]) : undefined,
    targetLevel: enh.targetLevel,
    pieceCount,
    owned: enh.owned,
  });

  const titleText = enhanceText('dmEnhanceTitle', 'Enhance Equipment');
  const introText = enhanceText(
    'dmEnhanceIntro',
    'Plan advancing completed Dragon Master pieces through verified enhancement levels.'
  );
  const currentText = enhanceText('dmEnhanceCurrentLevel', 'Current level');
  const targetText = enhanceText('dmEnhanceTargetLevel', 'Target level');
  const ownedText = enhanceText('dmEnhanceOwned', 'Owned');
  const neededText = enhanceText('dmEnhanceNeeded', 'Needed');
  const shortfallText = enhanceText('dmEnhanceShortfall', 'Shortfall');
  const pieceText = enhanceText('dmEnhanceScopePiece', 'One piece');
  const setText = enhanceText('dmEnhanceScopeSet', 'Full set (6 pieces)');
  const reachedText = enhanceText('dmEnhanceReached', 'Target already reached');
  const creditText = enhanceText(
    'dmEnhanceCredit',
    'Thanks to Roha and Redbull for contributing the data used by the DM tool.'
  );
  const setPieces =
    enh.scope === 'set'
      ? `<div class="dm-enhance-pieces" role="group" aria-label="${escapeHtml(currentText)}">${DM_SLOT_IDS.map(
          (slot) => {
            const level = enh.currentLevels[slot];
            const label = slotLabel(slot);
            return `<div class="dm-enhance-piece" role="group" aria-label="${escapeHtml(`${label}, ${currentText} +${level}`)}" title="${escapeHtml(dmItemName(slot))}">
              <img src="${equipmentAssetPath(SLOT_ASSETS[slot].setId, SLOT_ASSETS[slot].gameSlot, 'gold')}" alt="" width="96" height="96" loading="lazy" decoding="async">
              <span>${escapeHtml(label)}</span>
              <div class="dm-enhance-piece-controls">
                <button type="button" data-dm-enhance-piece="${slot}" data-dm-enhance-piece-delta="-1" aria-label="${escapeHtml(`− ${label}, ${currentText} +${level}`)}"${level === 0 ? ' disabled' : ''}>−</button>
                <b aria-live="polite">+${level}</b>
                <button type="button" data-dm-enhance-piece="${slot}" data-dm-enhance-piece-delta="1" aria-label="${escapeHtml(`+ ${label}, ${currentText} +${level}`)}"${level === 25 ? ' disabled' : ''}>+</button>
              </div>
            </div>`;
          }
        ).join('')}</div>`
      : '';

  const rows = ENHANCE_RESOURCES.map((res) => {
    const label = enhanceText(res.i18n, res.fallback);
    const shortfall = calc.shortfall[res.key];
    return `
      <div class="dm-enhance-row">
        <div class="dm-enhance-res dm-enhance-res--${res.frame}">
          <span class="dm-enhance-res-frame dm-enhance-res-frame--${res.icon}" aria-hidden="true"></span>
          <span class="dm-enhance-res-name">${escapeHtml(label)}</span>
        </div>
        <label class="dm-enhance-owned">
          <span class="dm-enhance-cell-label">${escapeHtml(ownedText)}</span>
          <input type="number" inputmode="numeric" min="0" step="1" value="${enh.owned[res.key]}"
            data-dm-enhance-resource="${res.key}" aria-label="${escapeHtml(`${label} — ${ownedText}`)}" />
        </label>
        <div class="dm-enhance-cell">
          <span class="dm-enhance-cell-label">${escapeHtml(neededText)}</span>
          <b>${renderResourceValue(calc.needed[res.key])}</b>
        </div>
        <div class="dm-enhance-cell${shortfall > 0 ? ' is-short' : ''}">
          <span class="dm-enhance-cell-label">${escapeHtml(shortfallText)}</span>
          <b>${renderResourceValue(shortfall)}</b>
        </div>
      </div>`;
  }).join('');

  return `
    <section class="dm-enhance-panel" data-dm-stage="enhance" aria-labelledby="dmEnhanceTitle">
      <header class="dm-enhance-header">
        <span class="dm-eyebrow">VTS 1097 · DM</span>
        <h3 id="dmEnhanceTitle">${escapeHtml(titleText)}</h3>
        <p>${escapeHtml(introText)}</p>
      </header>
      <div class="dm-enhance-controls">
        <div class="dm-enhance-scope" role="group" aria-label="${escapeHtml(titleText)}">
          <button type="button" class="dm-enhance-scope-btn${enh.scope === 'piece' ? ' is-active' : ''}" data-dm-enhance-scope="piece" aria-pressed="${enh.scope === 'piece'}">${escapeHtml(pieceText)}</button>
          <button type="button" class="dm-enhance-scope-btn${enh.scope === 'set' ? ' is-active' : ''}" data-dm-enhance-scope="set" aria-pressed="${enh.scope === 'set'}">${escapeHtml(setText)}</button>
        </div>
        <div class="dm-enhance-levels">
          ${enh.scope === 'piece' ? renderEnhanceLevelControl('currentLevel', enh.currentLevel, currentText) : ''}
          <span class="dm-enhance-arrow" aria-hidden="true">→</span>
          ${renderEnhanceLevelControl('targetLevel', enh.targetLevel, targetText)}
        </div>
      </div>
      ${setPieces}
      ${calc.reachable ? '' : `<p class="dm-enhance-reached" role="status">${escapeHtml(reachedText)}</p>`}
      <div class="dm-enhance-rows">${rows}</div>
      <p class="dm-enhance-credit">${escapeHtml(creditText)}</p>
    </section>`;
}

function render() {
  if (!rootEl || !plan) return;
  const t = copy();
  const result = calculateMaterialPlan(plan);
  plan = result.plan;
  rootEl.innerHTML = `
    <div class="dm-command-center">
      <header class="dm-command-header">
        <div><span class="dm-eyebrow">VTS 1097 · DM</span><h2>${escapeHtml(t.title)}</h2><p>${escapeHtml(t.subtitle)}</p></div>
      </header>
      <nav class="dm-tool-tabs" aria-label="${escapeHtml(t.title)}">
        <button type="button" class="dm-tool-tab${activeDmTool === 'build' ? ' is-active' : ''}" data-dm-tool="build" aria-pressed="${activeDmTool === 'build'}">${escapeHtml(t.title)}</button>
        <button type="button" class="dm-tool-tab${activeDmTool === 'enhance' ? ' is-active' : ''}" data-dm-tool="enhance" aria-pressed="${activeDmTool === 'enhance'}">${escapeHtml(enhanceText('dmEnhanceTitle', 'Enhance Equipment'))}</button>
      </nav>
      ${
        activeDmTool === 'build'
          ? `${renderRouteChooser(result, t)}
      <div class="dm-command-layout">
        ${renderPlanPanel(result, t)}
        <main class="dm-workbench">
          ${renderSetPanel(result, t)}
          ${renderRecipePanel(result, t)}
          ${renderBreakdown(result, t)}
        </main>
        ${renderSummaryPanel(result, t)}
      </div>`
          : `<main class="dm-enhance-workspace">${renderEnhancePanel()}</main>`
      }
      <div class="dm-mobile-status${activeDmTool === 'enhance' ? ' hidden' : ''}">
        <span>${escapeHtml(t.overallProgress)}</span>
        <strong>${formatNumber(result.completedSlots.length)} / ${formatNumber(result.targetSlots.length)}</strong>
        <button type="button" data-dm-toggle-complete data-dm-complete-location="mobile">${escapeHtml(plan.completed[plan.selectedSlot] ? t.reopenPiece : t.completePiece)}</button>
      </div>
    </div>`;
  alignMobileScrollers();
}

function rerender({ focusSelector = null } = {}) {
  savePlan();
  render();
  if (focusSelector) rootEl.querySelector(focusSelector)?.focus({ preventScroll: true });
}

function normalizeMaterialLanguage(language) {
  const primary = String(language || 'en')
    .toLowerCase()
    .split('-')[0];
  return primary === 'ko' ? 'kr' : primary;
}

async function renderForLanguage({ detail } = {}) {
  const language = normalizeMaterialLanguage(
    detail?.lang || document.documentElement.lang || currentLanguage
  );
  if (language !== currentLanguage) setCurrentLanguage(language);
  await loadDmMaterialsLocale(language);
  render();
}

function handleClick(event) {
  const toolButton = event.target.closest('[data-dm-tool]');
  if (toolButton) {
    activeDmTool = toolButton.dataset.dmTool === 'enhance' ? 'enhance' : 'build';
    render();
    rootEl.querySelector(`[data-dm-tool="${activeDmTool}"]`)?.focus({ preventScroll: true });
    return;
  }

  const setButton = event.target.closest('[data-dm-focus-set]');
  if (setButton) {
    plan = focusMaterialSet(plan, Number(setButton.dataset.dmFocusSet));
    rerender({ focusSelector: `[data-dm-focus-set="${plan.focusedSet}"]` });
    return;
  }

  const routeButton = event.target.closest('[data-dm-route]');
  if (routeButton) {
    plan.route = routeButton.dataset.dmRoute;
    rerender({ focusSelector: `[data-dm-route="${plan.route}"]` });
    return;
  }

  const slotButton = event.target.closest('[data-dm-slot]');
  if (slotButton && plan.targets[slotButton.dataset.dmSlot]) {
    plan.selectedSlot = slotButton.dataset.dmSlot;
    rerender({ focusSelector: `[data-dm-slot="${plan.selectedSlot}"]` });
    return;
  }

  const viewButton = event.target.closest('[data-dm-view]');
  if (viewButton) {
    plan.viewMode = viewButton.dataset.dmView;
    rerender({ focusSelector: `[data-dm-view="${plan.viewMode}"]` });
    return;
  }

  const enhanceScopeButton = event.target.closest('[data-dm-enhance-scope]');
  if (enhanceScopeButton) {
    plan.enhancement.scope =
      enhanceScopeButton.dataset.dmEnhanceScope === 'piece' ? 'piece' : 'set';
    rerender({ focusSelector: `[data-dm-enhance-scope="${plan.enhancement.scope}"]` });
    return;
  }

  const enhanceQuickButton = event.target.closest('[data-dm-enhance-quick-field]');
  if (enhanceQuickButton) {
    const field = enhanceQuickButton.dataset.dmEnhanceQuickField;
    if (field === 'currentLevel' || field === 'targetLevel') {
      plan.enhancement[field] = Number(enhanceQuickButton.dataset.dmEnhanceQuickLevel);
      rerender({
        focusSelector: `[data-dm-enhance-quick-field="${field}"][data-dm-enhance-quick-level="${plan.enhancement[field]}"]`,
      });
    }
    return;
  }

  const enhancePieceButton = event.target.closest('[data-dm-enhance-piece]');
  if (enhancePieceButton) {
    const slot = enhancePieceButton.dataset.dmEnhancePiece;
    if (DM_SLOT_IDS.includes(slot)) {
      const delta = Number(enhancePieceButton.dataset.dmEnhancePieceDelta) || 1;
      plan.enhancement.currentLevels[slot] = Math.max(
        0,
        Math.min(25, plan.enhancement.currentLevels[slot] + delta)
      );
      const focusDelta =
        plan.enhancement.currentLevels[slot] === 0
          ? 1
          : plan.enhancement.currentLevels[slot] === 25
            ? -1
            : delta;
      rerender({
        focusSelector: `[data-dm-enhance-piece="${slot}"][data-dm-enhance-piece-delta="${focusDelta}"]`,
      });
    }
    return;
  }

  const completeButton = event.target.closest('[data-dm-toggle-complete]');
  if (completeButton) {
    plan.completed[plan.selectedSlot] = !plan.completed[plan.selectedSlot];
    const location = completeButton.dataset.dmCompleteLocation;
    rerender({
      focusSelector: location
        ? `[data-dm-toggle-complete][data-dm-complete-location="${location}"]`
        : '[data-dm-toggle-complete]',
    });
    return;
  }

  if (event.target.closest('[data-dm-toggle-breakdown]')) {
    plan.breakdownOpen = !plan.breakdownOpen;
    rerender({ focusSelector: '[data-dm-toggle-breakdown]' });
    return;
  }

  if (event.target.closest('[data-dm-save]')) {
    savePlan();
    toast(copy().saved, 'success');
    return;
  }

  if (event.target.closest('[data-dm-export]')) {
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vts-dm-plan.json';
    link.click();
    URL.revokeObjectURL(url);
    toast(copy().exported, 'success');
    return;
  }

  if (event.target.closest('[data-dm-share]')) {
    const url = new URL(window.location.href);
    url.searchParams.set(SHARE_PARAM, encodeMaterialPlan(plan));
    url.hash = 'materials';
    history.replaceState(null, '', url);
    const clipboardWrite = navigator.clipboard?.writeText(url.href);
    if (clipboardWrite) {
      clipboardWrite
        .then(() => toast(copy().copied, 'success'))
        .catch(() => toast(copy().copyFailed, 'info'));
    } else {
      toast(copy().copyFailed, 'info');
    }
    return;
  }

  if (event.target.closest('[data-dm-clear]')) {
    for (const slot of DM_SLOT_IDS) plan.completed[slot] = false;
    for (const slot of DM_SLOT_IDS) plan.ownedPieces[slot] = 0;
    plan.ownedResources = { superDragonite: 0, dragonite: 0, gems: 0 };
    rerender({ focusSelector: '[data-dm-clear]' });
  }
}

function handleInput(event) {
  if (event.target.matches('[data-dm-plan-name]')) {
    plan.name = event.target.value.slice(0, 80);
    savePlan();
    return;
  }
  const key = event.target.dataset.dmResource;
  if (key && key in plan.ownedResources) {
    plan.ownedResources[key] = Math.max(0, Math.floor(Number(event.target.value) || 0));
    rerender({ focusSelector: `[data-dm-resource="${key}"]` });
    return;
  }

  const piece = event.target.dataset.dmOwnedPiece;
  if (piece && piece in plan.ownedPieces) {
    plan.ownedPieces[piece] = Math.min(
      99,
      Math.max(0, Math.floor(Number(event.target.value) || 0))
    );
    savePlan();
    return;
  }

  const enhanceKey = event.target.dataset.dmEnhanceResource;
  if (enhanceKey && enhanceKey in plan.enhancement.owned) {
    plan.enhancement.owned[enhanceKey] = Math.max(0, Math.floor(Number(event.target.value) || 0));
    rerender({ focusSelector: `[data-dm-enhance-resource="${enhanceKey}"]` });
  }
}

function handleChange(event) {
  if (event.target.matches('[data-dm-target-sets]')) {
    plan.targetSets = Math.min(5, Math.max(1, Number(event.target.value) || 1));
    if (plan.focusedSet > plan.targetSets) plan = focusMaterialSet(plan, plan.targetSets);
    rerender({ focusSelector: '[data-dm-target-sets]' });
    return;
  }

  if (event.target.matches('[data-dm-preset]')) {
    plan = applyMaterialPreset(plan, event.target.value);
    rerender({ focusSelector: '[data-dm-preset]' });
    return;
  }

  if (event.target.matches('[data-dm-enhance-field]')) {
    const field = event.target.dataset.dmEnhanceField;
    if (field === 'currentLevel' || field === 'targetLevel') {
      plan.enhancement[field] = Number(event.target.value);
      rerender({ focusSelector: `[data-dm-enhance-field="${field}"]` });
    }
  }
}

export async function initMaterialCalculator() {
  rootEl = document.getElementById('materialCalculatorRoot');
  if (!rootEl) return;
  if (rootEl.dataset.dmMaterialWired === '1') {
    await renderForLanguage();
    return;
  }
  rootEl.dataset.dmMaterialWired = '1';
  plan = loadPlan();
  rootEl.addEventListener('click', handleClick);
  rootEl.addEventListener('input', handleInput);
  rootEl.addEventListener('change', handleChange);
  rootEl.addEventListener('error', handleImageError, true);
  window.addEventListener('vts:language-change', renderForLanguage);
  await renderForLanguage();
}
