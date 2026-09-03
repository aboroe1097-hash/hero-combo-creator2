import '../css/planners.css';
import { appT, escapeHtml } from './utils.js';
import { currentLanguage } from './state.js';
import { formatLocaleDate, formatLocaleNumber } from './locale-format.js';
import { loadCodexStore } from './codex-loader.js';
import { listPlannerFamilies, getPlannerFamily, normalizeTechTree } from './research-planner-model.js';
import {
  familyFromCodexNodes,
  listCodexResearchTrees,
  computeMinUnlockPath,
  computeFullPath,
  computeRemainingCosts,
  listMilestones,
  suggestNextBest,
  PLANNER_COST_RESOURCES,
} from './research-planner-model.js';
import { loadPlannerState, savePlannerState } from './research-planner-store.js';
import { SPECIALIZATION_RESEARCH } from './specialization-towers-v2-data.js';
import {
  loadSpecializationState,
  saveSpecializationState,
} from './specialization-towers-v2-store.js';
import { getResearchSelection } from './specialization-towers-v2-model.js';
import {
  buildTowersTreeDefinition,
  captureTowersPreset,
  applyTowersPreset,
} from './specialization-towers-v2-preset-adapter.js';
import {
  loadPresetStore,
  savePresetStore,
  upsertPreset,
  removePreset,
} from './preset-engine-store.js';
import { buildPresetShareUrl, decodePresetShare } from './preset-engine-share.js';
import { parsePresetPayload } from './preset-engine-model.js';
import { computeCastlePlan, findCastleBlockers } from './castle-planner-model.js';
import { computeStaminaProjection, buildStaminaOperationCard } from './stamina-calculator.js';
import { getExportBranding, drawCanvasFooter } from './export-branding.js';
import {
  exportCsv,
  exportJson,
  buildShareUrl,
  parseShareUrl,
  copyToClipboard,
  exportPngCanvas,
} from './codex-export.js';

const RESEARCH_PROGRESS_KEY = 'vts_research_v1';
const TOWERS_TROOPS = Object.freeze(['footman', 'archer', 'cavalry']);
const COST_LABELS = Object.freeze({
  resources: 'plannersCostResources',
  wisdom: 'plannersCostWisdom',
  courage: 'plannersCostCourage',
  warBadges: 'plannersCostWarBadges',
  gems: 'plannersCostGems',
  timeSeconds: 'plannersCostTime',
});

function toast(message, type = 'info') {
  if (typeof window.showToast === 'function') window.showToast(message, type);
}

function t(key, vars) {
  return appT(key, vars || {});
}

function h(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = String(text);
  return element;
}

function number(value) {
  return formatLocaleNumber(Number(value) || 0, currentLanguage);
}

function readResearchProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RESEARCH_PROGRESS_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function currentLevelsFor(familyId, nodeIds, progress) {
  const levels = {};
  for (const nodeId of nodeIds) {
    const level = Number(progress[`${familyId}:${nodeId}`]) || 0;
    if (level > 0) levels[nodeId] = level;
  }
  return levels;
}

function parseKeyValueLines(text, separator = '=') {
  const entries = {};
  for (const line of String(text || '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const at = trimmed.indexOf(separator);
    if (at < 0) continue;
    entries[trimmed.slice(0, at).trim()] = trimmed.slice(at + 1).trim();
  }
  return entries;
}

function buildFamilyOptions(codexFamilies) {
  const options = listPlannerFamilies().map((family) => ({
    value: `tech:${family.familyId}`,
    label: `${family.name} (${family.season})`,
  }));
  for (const family of codexFamilies) {
    options.push({
      value: `codex:${family.familyId}`,
      label: `${family.name} (${family.season || 'codex'})`,
    });
  }
  return options;
}

function resolveFamily(selection, codexStore) {
  if (selection.startsWith('tech:')) {
    const tech = getPlannerFamily(selection.slice(5));
    return tech ? normalizeTechTree(tech) : null;
  }
  if (selection.startsWith('codex:') && codexStore) {
    return familyFromCodexNodes(codexStore, selection.slice(6));
  }
  return null;
}

function renderResearchPanel(host) {
  const card = h('div', 'pln-card');
  card.innerHTML = `
    <h3>${escapeHtml(t('plannersTabResearch'))}</h3>
    <div class="pln-grid">
      <label class="pln-field">${escapeHtml(t('plannersFamily'))}<select data-pln="family"></select></label>
      <label class="pln-field">${escapeHtml(t('plannersTargetNode'))}<select data-pln="target"></select></label>
      <label class="pln-field">${escapeHtml(t('plannersTargetLevel'))}<input data-pln="level" type="number" min="1" value="1" /></label>
      <label class="pln-field">${escapeHtml(t('plannersMode'))}<select data-pln="mode">
        <option value="min-unlock">${escapeHtml(t('plannersModeMin'))}</option>
        <option value="full">${escapeHtml(t('plannersModeFull'))}</option>
      </select></label>
    </div>
    <div class="pln-actions pln-no-print">
      <button type="button" class="pln-btn pln-btn-primary" data-pln="compute">${escapeHtml(t('plannersCompute'))}</button>
      <button type="button" class="pln-btn" data-pln="csv">${escapeHtml(t('plannersExportCsv'))}</button>
      <button type="button" class="pln-btn" data-pln="json">${escapeHtml(t('plannersExportJson'))}</button>
      <button type="button" class="pln-btn" data-pln="print">${escapeHtml(t('plannersPrint'))}</button>
    </div>
    <div class="pln-results" data-pln="results"></div>`;
  host.appendChild(card);

  const familySelect = card.querySelector('[data-pln="family"]');
  const targetSelect = card.querySelector('[data-pln="target"]');
  const levelInput = card.querySelector('[data-pln="level"]');
  const modeSelect = card.querySelector('[data-pln="mode"]');
  const results = card.querySelector('[data-pln="results"]');
  let codexStore = null;
  let lastComputed = null;

  const refreshFamilies = () => {
    const codexFamilies = codexStore ? listCodexResearchTrees(codexStore) : [];
    familySelect.innerHTML = '';
    for (const option of buildFamilyOptions(codexFamilies)) {
      const el = document.createElement('option');
      el.value = option.value;
      el.textContent = option.label;
      familySelect.appendChild(el);
    }
    refreshTargets();
  };

  const refreshTargets = () => {
    const family = resolveFamily(familySelect.value, codexStore);
    targetSelect.innerHTML = '';
    if (!family) return;
    for (const node of family.nodes) {
      const el = document.createElement('option');
      el.value = node.id;
      el.textContent = `${node.name} (max ${node.maxLevel})`;
      targetSelect.appendChild(el);
    }
  };

  familySelect.addEventListener('change', refreshTargets);

  const compute = () => {
    results.innerHTML = '';
    const family = resolveFamily(familySelect.value, codexStore);
    if (!family || !targetSelect.value) return;
    const targetLevel = Math.max(Number(levelInput.value) || 1, 1);
    const plan =
      modeSelect.value === 'full'
        ? computeFullPath(family)
        : computeMinUnlockPath(family, targetSelect.value, targetLevel);
    if (!plan) return;
    const progress = readResearchProgress();
    const current = currentLevelsFor(family.familyId, family.nodes.map((node) => node.id), progress);
    const remaining = computeRemainingCosts(family, current, plan);
    const milestones = listMilestones(family, plan);
    const nextBest = suggestNextBest(family, current, 'cheapest-next').slice(0, 6);
    lastComputed = { family, plan, remaining, current };

    const byId = new Map(family.nodes.map((node) => [node.id, node]));
    const plannedRows = Object.entries(plan.nodeLevels)
      .map(([id, level]) => ({ id, level, node: byId.get(id) }))
      .filter((row) => row.node)
      .sort((a, b) => b.level - a.level || a.node.name.localeCompare(b.node.name));

    const totalsRows = PLANNER_COST_RESOURCES.filter(
      (resource) => remaining.totals[resource] > 0
    )
      .map(
        (resource) =>
          `<tr><td>${escapeHtml(t(COST_LABELS[resource]))}</td><td>${number(remaining.totals[resource])}</td></tr>`
      )
      .join('');
    const badge = remaining.verified
      ? `<span class="pln-badge-ok">${escapeHtml(t('plannersVerified'))}</span>`
      : `<span class="pln-badge-warn">${escapeHtml(t('plannersUnverified'))}</span>`;

    results.innerHTML = `
      <div class="pln-subtitle">${escapeHtml(t('plannersPathTitle'))} ${badge}</div>
      <table class="pln-table"><thead><tr><th>${escapeHtml(t('plannersTargetNode'))}</th><th>${escapeHtml(t('plannersTargetLevel'))}</th></tr></thead>
      <tbody>${plannedRows
        .map(
          (row) =>
            `<tr><td>${escapeHtml(row.node.name)}${row.node.verificationStatus !== 'current' ? ' *' : ''}</td><td>${row.level}</td></tr>`
        )
        .join('')}</tbody></table>
      <div class="pln-subtitle">${escapeHtml(t('plannersTotalsTitle'))}</div>
      <table class="pln-table"><tbody>${totalsRows || `<tr><td>0</td></tr>`}</tbody></table>
      <div class="pln-subtitle">${escapeHtml(t('plannersMilestones'))} (${milestones.length})</div>
      <div>${milestones.slice(0, 12).map((milestone) => escapeHtml(milestone.name)).join(' · ')}</div>
      <div class="pln-subtitle">${escapeHtml(t('plannersNextBest'))}</div>
      <div class="pln-chips">${nextBest
        .map((id) => {
          const node = byId.get(id);
          return node ? `<button type="button" class="pln-chip" data-pln-node="${escapeHtml(id)}">${escapeHtml(node.name)}</button>` : '';
        })
        .join('')}</div>`;

    results.querySelectorAll('[data-pln-node]').forEach((chip) => {
      chip.addEventListener('click', () => {
        targetSelect.value = chip.dataset.plnNode;
        compute();
      });
    });

    const plannerStore = loadPlannerState();
    const plans = plannerStore.plans.filter(
      (entry) => entry.familyId !== family.familyId || entry.targetNodeId !== targetSelect.value
    );
    plans.push({
      familyId: family.familyId,
      mode: plan.mode,
      targetNodeId: targetSelect.value,
      targetLevel,
      currentLevels: current,
    });
    savePlannerState({ ...plannerStore, savedAt: Date.now(), plans });
  };

  card.querySelector('[data-pln="compute"]').addEventListener('click', compute);

  card.querySelector('[data-pln="csv"]').addEventListener('click', () => {
    if (!lastComputed) return;
    const { family, plan } = lastComputed;
    const byId = new Map(family.nodes.map((node) => [node.id, node]));
    exportCsv({
      toolName: 'research-plan',
      columns: ['node_id', 'node_name', 'target_level'],
      rows: Object.entries(plan.nodeLevels).map(([id, level]) => ({
        node_id: id,
        node_name: byId.get(id)?.name || id,
        target_level: level,
      })),
      meta: { revision: family.requirementStatus },
    });
  });

  card.querySelector('[data-pln="json"]').addEventListener('click', () => {
    if (!lastComputed) return;
    exportJson({
      toolName: 'research-plan',
      schema: 'roc-vts.research-plan',
      schemaVersion: 1,
      payload: lastComputed,
    });
  });

  card.querySelector('[data-pln="print"]').addEventListener('click', () => window.print());

  refreshFamilies();
  loadCodexStore()
    .then((store) => {
      codexStore = store;
      refreshFamilies();
    })
    .catch(() => {});
}

function renderPresetsPanel(host) {
  const card = h('div', 'pln-card');
  card.innerHTML = `
    <h3>${escapeHtml(t('presetEngineTitle'))}</h3>
    <p class="pln-lead">${escapeHtml(t('presetEngineDesc'))}</p>
    <div class="pln-grid">
      <label class="pln-field">${escapeHtml(t('presetEngineTree'))}<select data-pln="tree"></select></label>
      <label class="pln-field">${escapeHtml(t('presetEngineTroop'))}<select data-pln="troop">
        ${TOWERS_TROOPS.map((troop) => `<option value="${troop}">${escapeHtml(troop)}</option>`).join('')}
      </select></label>
      <label class="pln-field">${escapeHtml(t('presetEngineSaveName'))}<input data-pln="name" type="text" maxlength="80" /></label>
    </div>
    <div class="pln-actions pln-no-print">
      <button type="button" class="pln-btn pln-btn-primary" data-pln="save">${escapeHtml(t('presetEngineSave'))}</button>
    </div>
    <div class="pln-subtitle">${escapeHtml(t('presetEnginePresets'))}</div>
    <div class="pln-results" data-pln="list"></div>
    <div class="pln-subtitle">${escapeHtml(t('presetEngineImportLabel'))}</div>
    <label class="pln-field"><textarea data-pln="import" rows="3"></textarea></label>
    <div class="pln-actions pln-no-print">
      <button type="button" class="pln-btn" data-pln="importGo">${escapeHtml(t('presetEngineImportGo'))}</button>
      <button type="button" class="pln-btn" data-pln="print">${escapeHtml(t('plannersPrint'))}</button>
    </div>`;
  host.appendChild(card);

  const treeSelect = card.querySelector('[data-pln="tree"]');
  const troopSelect = card.querySelector('[data-pln="troop"]');
  const nameInput = card.querySelector('[data-pln="name"]');
  const listHost = card.querySelector('[data-pln="list"]');
  const importBox = card.querySelector('[data-pln="import"]');

  for (const researchId of Object.keys(SPECIALIZATION_RESEARCH)) {
    const research = SPECIALIZATION_RESEARCH[researchId];
    const el = document.createElement('option');
    el.value = researchId;
    el.textContent = research?.name || researchId;
    treeSelect.appendChild(el);
  }

  const refreshList = () => {
    const store = loadPresetStore();
    listHost.innerHTML = '';
    if (!store.presets.length) {
      listHost.innerHTML = `<div class="pln-note">${escapeHtml(t('presetEngineNoPresets'))}</div>`;
      return;
    }
    const table = document.createElement('table');
    table.className = 'pln-table';
    table.innerHTML = `<thead><tr><th>${escapeHtml(t('presetEngineSaveName'))}</th><th></th></tr></thead>`;
    const body = document.createElement('tbody');
    for (const preset of store.presets) {
      const row = document.createElement('tr');
      const nameCell = document.createElement('td');
      nameCell.textContent = preset.name || preset.treeId;
      const actionCell = document.createElement('td');
      const applyBtn = h('button', 'pln-btn', t('presetEngineApply'));
      applyBtn.type = 'button';
      applyBtn.addEventListener('click', () => applyPreset(preset));
      const exportBtn = h('button', 'pln-btn', t('presetEngineExport'));
      exportBtn.type = 'button';
      exportBtn.addEventListener('click', () =>
        exportJson({
          toolName: 'preset',
          schema: 'roc-vts.preset',
          schemaVersion: 1,
          payload: preset,
        })
      );
      const shareBtn = h('button', 'pln-btn', t('presetEngineShare'));
      shareBtn.type = 'button';
      shareBtn.addEventListener('click', () => {
        const url = buildPresetShareUrl(preset.treeId, preset.name, preset.allocation);
        if (copyToClipboard(url)) toast(t('plannersCopied'), 'success');
      });
      const deleteBtn = h('button', 'pln-btn', t('presetEngineDelete'));
      deleteBtn.type = 'button';
      deleteBtn.addEventListener('click', () => {
        savePresetStore(removePreset(loadPresetStore(), preset.id));
        refreshList();
      });
      for (const button of [applyBtn, exportBtn, shareBtn, deleteBtn]) actionCell.appendChild(button);
      row.appendChild(nameCell);
      row.appendChild(actionCell);
      body.appendChild(row);
    }
    table.appendChild(body);
    listHost.appendChild(table);
  };

  const applyPreset = (preset) => {
    if (!String(preset.treeId || '').startsWith('towers:')) {
      toast(t('presetEngineInvalid'), 'error');
      return;
    }
    const researchId = preset.treeId.slice('towers:'.length);
    try {
      const next = applyTowersPreset(
        loadSpecializationState(),
        troopSelect.value,
        researchId,
        preset.allocation
      );
      if (!next) return;
      saveSpecializationState(next);
      toast(t('presetEngineApplied'), 'success');
    } catch {
      toast(t('presetEngineInvalid'), 'error');
    }
  };

  card.querySelector('[data-pln="save"]').addEventListener('click', () => {
    const researchId = treeSelect.value;
    const captured = captureTowersPreset(
      loadSpecializationState(),
      troopSelect.value,
      researchId
    );
    if (!captured) return;
    savePresetStore(
      upsertPreset(loadPresetStore(), {
        id: `preset-${Date.now().toString(36)}`,
        name: nameInput.value.trim() || captured.name,
        treeId: captured.treeId,
        allocation: captured.allocation,
      })
    );
    nameInput.value = '';
    toast(t('presetEngineSaved'), 'success');
    refreshList();
  });

  card.querySelector('[data-pln="importGo"]').addEventListener('click', () => {
    try {
      const payload = JSON.parse(importBox.value);
      const treeId = String(payload.treeId || '');
      if (!treeId.startsWith('towers:')) {
        toast(t('presetEngineInvalid'), 'error');
        return;
      }
      const tree = buildTowersTreeDefinition(treeId.slice('towers:'.length));
      if (!tree) return;
      const parsed = parsePresetPayload(tree, payload);
      savePresetStore(
        upsertPreset(loadPresetStore(), {
          id: `preset-${Date.now().toString(36)}`,
          name: parsed.name || tree.name,
          treeId: tree.treeId,
          allocation: parsed.allocation,
        })
      );
      importBox.value = '';
      toast(t('presetEngineImported'), 'success');
      refreshList();
    } catch {
      toast(t('presetEngineInvalid'), 'error');
    }
  });

  card.querySelector('[data-pln="print"]').addEventListener('click', () => window.print());

  refreshList();
  const shared = decodePresetShare((window.location.hash.match(/^#preset=(.+)$/) || [])[1] || '');
  if (shared) {
    importBox.value = JSON.stringify(shared);
    toast(t('presetEngineImported'), 'info');
  }
  try {
    const selection = getResearchSelection(
      loadSpecializationState(),
      troopSelect.value,
      treeSelect.value
    );
    void selection;
  } catch {
    // Selection display is best-effort at init.
  }
}

function buildingCatalogFromCodex(store) {
  const raw = store?.datasets?.['building-costs'];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (!Array.isArray(raw.castleLevels) && !raw.buildings) return null;
  return raw;
}

function renderCastlePanel(host) {
  const card = h('div', 'pln-card');
  card.innerHTML = `
    <h3>${escapeHtml(t('castlePlannerTitle'))}</h3>
    <p class="pln-lead">${escapeHtml(t('castlePlannerDesc'))}</p>
    <div class="pln-note" data-pln="pending" hidden></div>
    <div class="pln-grid">
      <label class="pln-field">${escapeHtml(t('castlePlannerTarget'))}<input data-pln="target" type="number" min="1" /></label>
      <label class="pln-field">${escapeHtml(t('castlePlannerArchitect'))}<input data-pln="architect" type="number" min="0" max="100" value="0" /></label>
      <label class="pln-field">${escapeHtml(t('castlePlannerBuilder'))}<input data-pln="builder" type="number" min="0" max="100" value="0" /></label>
      <label class="pln-field">${escapeHtml(t('castlePlannerResearchRed'))}<input data-pln="research" type="number" min="0" max="100" value="0" /></label>
    </div>
    <label class="pln-field" style="margin-top:10px">${escapeHtml(t('castlePlannerLevels'))}<textarea data-pln="levels" rows="4" placeholder="keep=25&#10;wall=24"></textarea></label>
    <div class="pln-actions pln-no-print">
      <button type="button" class="pln-btn pln-btn-primary" data-pln="compute">${escapeHtml(t('plannersCompute'))}</button>
      <button type="button" class="pln-btn" data-pln="json">${escapeHtml(t('plannersExportJson'))}</button>
      <button type="button" class="pln-btn" data-pln="print">${escapeHtml(t('plannersPrint'))}</button>
    </div>
    <div class="pln-results" data-pln="results"></div>`;
  host.appendChild(card);

  const pending = card.querySelector('[data-pln="pending"]');
  const results = card.querySelector('[data-pln="results"]');
  const computeBtn = card.querySelector('[data-pln="compute"]');
  const jsonBtn = card.querySelector('[data-pln="json"]');
  let catalog = null;
  let lastPlan = null;

  const enable = (ready) => {
    pending.hidden = ready;
    computeBtn.disabled = !ready;
  };

  pending.textContent = t('castlePlannerDataPending');

  loadCodexStore()
    .then((store) => {
      const raw = buildingCatalogFromCodex(store);
      catalog = raw;
      enable(Boolean(raw));
    })
    .catch(() => enable(false));

  computeBtn.addEventListener('click', () => {
    results.innerHTML = '';
    if (!catalog) return;
    const currentLevels = {};
    for (const [id, level] of Object.entries(
      parseKeyValueLines(card.querySelector('[data-pln="levels"]').value)
    )) {
      currentLevels[id] = Number(level) || 0;
    }
    const plan = computeCastlePlan(catalog, {
      currentLevels,
      targetCastleLevel: Number(card.querySelector('[data-pln="target"]').value) || 0,
      discounts: {
        architect: Number(card.querySelector('[data-pln="architect"]').value) || 0,
        builder: Number(card.querySelector('[data-pln="builder"]').value) || 0,
        research: Number(card.querySelector('[data-pln="research"]').value) || 0,
      },
    });
    if (!plan) {
      results.innerHTML = `<div class="pln-note">${escapeHtml(t('castlePlannerNoPlan'))}</div>`;
      return;
    }
    lastPlan = plan;
    const blockerRows = plan.blockers
      .map(
        (blocker) =>
          `<tr><td>${escapeHtml(blocker.name)}</td><td>${blocker.currentLevel}</td><td>${blocker.requiredLevel}</td></tr>`
      )
      .join('');
    const upgradeRows = plan.upgrades
      .map(
        (upgrade) =>
          `<tr><td>${escapeHtml(upgrade.name)} ${upgrade.from}→${upgrade.to}</td><td>${upgrade.missingData ? '?' : `${upgrade.costs.timeMinutes}m`}</td><td>${upgrade.quarantined ? escapeHtml(t('plannersUnverified')) : ''}</td></tr>`
      )
      .join('');
    const assumptionRows = plan.assumptions
      .map((assumption) => `<li>${escapeHtml(assumption)}</li>`)
      .join('');
    results.innerHTML = `
      <div class="pln-subtitle">${escapeHtml(t('castlePlannerBlockers'))}</div>
      <table class="pln-table"><tbody>${blockerRows}</tbody></table>
      <div class="pln-subtitle">${escapeHtml(t('castlePlannerUpgrades'))}</div>
      <table class="pln-table"><tbody>${upgradeRows}</tbody></table>
      <div class="pln-subtitle">${escapeHtml(t('castlePlannerAssumptions'))}</div>
      <ul>${assumptionRows}</ul>`;
  });

  jsonBtn.addEventListener('click', () => {
    if (!lastPlan) return;
    exportJson({
      toolName: 'castle-plan',
      schema: 'roc-vts.castle-plan',
      schemaVersion: 1,
      payload: lastPlan,
    });
  });

  card.querySelector('[data-pln="print"]').addEventListener('click', () => window.print());
}

function parseOpsLines(text) {
  const ops = [];
  for (const line of String(text || '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(.+?)\s*=\s*(\d+(?:\.\d+)?)\s*(?:[x*]\s*(\d+))?$/);
    if (!match) continue;
    ops.push({
      id: match[1].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: match[1].trim().slice(0, 60),
      cost: Number(match[2]),
      desiredCount: match[3] ? Number(match[3]) : 1,
    });
  }
  return ops.slice(0, 50);
}

function renderStaminaCardCanvas(card) {
  const canvas = document.createElement('canvas');
  const lines = card.lines.slice(0, 18);
  const height = 150 + lines.length * 24 + 48;
  canvas.width = 760;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.fillStyle = '#0d1628';
  ctx.fillRect(0, 0, canvas.width, height);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Inter, system-ui, sans-serif';
  ctx.fillText(card.title, 28, 52);
  ctx.font = '500 13px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#93c5fd';
  lines.forEach((line, index) => {
    ctx.fillText(String(line).slice(0, 72), 28, 88 + index * 24);
  });
  drawCanvasFooter(ctx, getExportBranding(), {
    x: 28,
    y: height - 40,
    width: canvas.width - 56,
  });
  return canvas;
}

function renderStaminaPanel(host) {
  const card = h('div', 'pln-card');
  card.innerHTML = `
    <h3>${escapeHtml(t('staminaTitle'))}</h3>
    <p class="pln-lead">${escapeHtml(t('staminaDesc'))}</p>
    <div class="pln-grid">
      <label class="pln-field">${escapeHtml(t('staminaCapacity'))}<input data-pln="capacity" type="number" min="1" value="100" /></label>
      <label class="pln-field">${escapeHtml(t('staminaCurrent'))}<input data-pln="current" type="number" min="0" value="0" /></label>
      <label class="pln-field">${escapeHtml(t('staminaRegen'))}<input data-pln="regen" type="number" min="0" value="10" /></label>
    </div>
    <label class="pln-field" style="margin-top:10px">${escapeHtml(t('staminaOpsLabel'))}<textarea data-pln="ops" rows="4" placeholder="Rally=25x3&#10;Scout=5"></textarea></label>
    <div class="pln-actions pln-no-print">
      <button type="button" class="pln-btn pln-btn-primary" data-pln="compute">${escapeHtml(t('plannersCompute'))}</button>
      <button type="button" class="pln-btn" data-pln="csv">${escapeHtml(t('plannersExportCsv'))}</button>
      <button type="button" class="pln-btn" data-pln="json">${escapeHtml(t('plannersExportJson'))}</button>
      <button type="button" class="pln-btn" data-pln="share">${escapeHtml(t('plannersShare'))}</button>
      <button type="button" class="pln-btn" data-pln="png">${escapeHtml(t('staminaPng'))}</button>
      <button type="button" class="pln-btn" data-pln="print">${escapeHtml(t('plannersPrint'))}</button>
    </div>
    <div class="pln-results" data-pln="results"></div>
    <div class="pln-subtitle">${escapeHtml(t('staminaOpCard'))}</div>
    <div class="pln-pre" data-pln="card"></div>`;
  host.appendChild(card);

  const results = card.querySelector('[data-pln="results"]');
  const cardPre = card.querySelector('[data-pln="card"]');
  let lastProjection = null;
  let lastCard = null;

  const compute = (prefill) => {
    const input = prefill || {
      capacity: Number(card.querySelector('[data-pln="capacity"]').value) || 0,
      currentStamina: Number(card.querySelector('[data-pln="current"]').value) || 0,
      regenPerHour: Number(card.querySelector('[data-pln="regen"]').value) || 0,
      ops: parseOpsLines(card.querySelector('[data-pln="ops"]').value),
      startTime: Date.now(),
    };
    let projection;
    try {
      projection = computeStaminaProjection(input);
    } catch {
      return;
    }
    lastProjection = projection;
    lastCard = buildStaminaOperationCard(projection, { title: t('staminaTitle') });
    cardPre.textContent = `${lastCard.title}\n${lastCard.lines.join('\n')}`;

    const timelineRows = projection.timeline
      .map(
        (step) =>
          `<tr><td>${escapeHtml(formatLocaleDate(step.atMs, currentLanguage, { hour: '2-digit', minute: '2-digit' }))}</td><td>${step.stamina}</td><td>${step.affordable.length}</td></tr>`
      )
      .join('');
    const opRows = projection.perOp
      .map(
        (op) =>
          `<tr><td>${escapeHtml(op.name)}</td><td>${op.cost}</td><td>${op.firstAvailableAt ? escapeHtml(formatLocaleDate(op.firstAvailableAt, currentLanguage, { hour: '2-digit', minute: '2-digit' })) : '—'}</td><td>${op.capacityGaps.length ? '!' : ''}</td></tr>`
      )
      .join('');
    results.innerHTML = `
      <div class="pln-subtitle">${escapeHtml(t('staminaTimeToFull'))}: ${projection.summary.hoursToFull}h</div>
      <div class="pln-subtitle">${escapeHtml(t('staminaTimeline'))}</div>
      <table class="pln-table"><thead><tr><th>${escapeHtml(t('staminaHour'))}</th><th>${escapeHtml(t('staminaStamina'))}</th><th>${escapeHtml(t('staminaAffordable'))}</th></tr></thead><tbody>${timelineRows}</tbody></table>
      <div class="pln-subtitle">${escapeHtml(t('staminaPerOp'))}</div>
      <table class="pln-table"><tbody>${opRows}</tbody></table>`;
  };

  card.querySelector('[data-pln="compute"]').addEventListener('click', () => compute());
  card.querySelector('[data-pln="csv"]').addEventListener('click', () => {
    if (!lastProjection) return;
    exportCsv({
      toolName: 'stamina-projection',
      columns: ['at', 'stamina', 'affordable'],
      rows: lastProjection.timeline.map((step) => ({
        at: step.iso,
        stamina: step.stamina,
        affordable: step.affordable.join('|'),
      })),
    });
  });
  card.querySelector('[data-pln="json"]').addEventListener('click', () => {
    if (!lastProjection) return;
    exportJson({
      toolName: 'stamina-projection',
      schema: 'roc-vts.stamina-projection',
      schemaVersion: 1,
      payload: lastProjection,
    });
  });
  card.querySelector('[data-pln="share"]').addEventListener('click', () => {
    if (!lastCard) return;
    const url = buildShareUrl('stamina', lastCard);
    if (copyToClipboard(url)) toast(t('plannersCopied'), 'success');
  });
  card.querySelector('[data-pln="png"]').addEventListener('click', () => {
    if (!lastCard) return;
    exportPngCanvas(renderStaminaCardCanvas(lastCard), undefined);
  });
  card.querySelector('[data-pln="print"]').addEventListener('click', () => window.print());

  try {
    const shared = parseShareUrl('stamina');
    if (shared?.lines) {
      cardPre.textContent = `${shared.title || ''}\n${shared.lines.join('\n')}`;
    }
  } catch {
    // Share parsing is best-effort.
  }
}

export async function initLane5Planners(host) {
  if (!host || host.dataset.lane5Ready === '1') return;
  host.dataset.lane5Ready = '1';

  const shell = h('div', 'pln-shell');
  shell.innerHTML = `
    <h2>${escapeHtml(t('plannersHubTitle'))}</h2>
    <p class="pln-lead">${escapeHtml(t('plannersHubDesc'))}</p>
    <div class="pln-tabs pln-no-print" role="tablist">
      <button type="button" class="pln-tab active" data-pln-tab="research" role="tab">${escapeHtml(t('plannersTabResearch'))}</button>
      <button type="button" class="pln-tab" data-pln-tab="presets" role="tab">${escapeHtml(t('plannersTabPresets'))}</button>
      <button type="button" class="pln-tab" data-pln-tab="castle" role="tab">${escapeHtml(t('plannersTabCastle'))}</button>
      <button type="button" class="pln-tab" data-pln-tab="stamina" role="tab">${escapeHtml(t('plannersTabStamina'))}</button>
    </div>`;
  host.appendChild(shell);

  const panels = {};
  for (const name of ['research', 'presets', 'castle', 'stamina']) {
    const panel = h('div', 'pln-panel');
    panel.dataset.plnPanel = name;
    if (name !== 'research') panel.hidden = true;
    shell.appendChild(panel);
    panels[name] = panel;
  }

  shell.querySelectorAll('[data-pln-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      shell.querySelectorAll('[data-pln-tab]').forEach((other) => other.classList.remove('active'));
      tab.classList.add('active');
      for (const [name, panel] of Object.entries(panels)) {
        panel.hidden = name !== tab.dataset.plnTab;
      }
    });
  });

  renderResearchPanel(panels.research);
  renderPresetsPanel(panels.presets);
  renderCastlePanel(panels.castle);
  renderStaminaPanel(panels.stamina);
}
