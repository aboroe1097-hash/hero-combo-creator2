// js/battle-simulator-field-data.js
// 16.0.0 lane 4: Battle Simulator "Field Data" panel — recorded duel evidence
// with methodology and provenance, the "resembles your account?" comparison,
// and sim-vs-recorded deltas. Lazy module (dynamic import only, B7
// load-on-expanded + retry); strict-CSP safe: same-origin payload fetch, no
// external images, all payload text escapes before render.

import { loadCodexStore } from './codex-loader.js';
import { provenanceFor } from './codex-provenance.js';
import { eraForGameVersion, isRenderable } from './codex-ui.js';

let fieldDataStylesPromise = null;

function loadFieldDataStyles() {
  fieldDataStylesPromise ??= import('../css/battle-simulator-field-data.css').catch(
    (error) => {
      console.error('[battle-simulator] field data styles failed to load', error);
      return null;
    }
  );
  return fieldDataStylesPromise;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setEquals(left, right) {
  const a = [...new Set((left || []).map(String))].sort();
  const b = [...new Set((right || []).map(String))].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function heroSkillsMatch(accountHeroSkillIds, recordHeroSkillProfile) {
  const account = accountHeroSkillIds || {};
  const record = recordHeroSkillProfile || {};
  const accountKeys = Object.keys(account).sort();
  const recordKeys = Object.keys(record).sort();
  if (!setEquals(accountKeys, recordKeys)) return false;
  return accountKeys.every((hero) => setEquals(account[hero], record[hero]));
}

// accountProfile fields may be null (not captured); a null account dimension
// never matches a present record dimension. Absent record dimensions are
// skipped entirely so the total reflects comparable fields only.
export function scoreAccountResemblance(accountProfile = {}, record = {}) {
  const dimensions = [];
  const accountResearch = accountProfile.researchNodeIds ?? null;
  if (Array.isArray(record.researchProfile?.nodeId)) {
    dimensions.push({
      key: 'researchProfile',
      matched: accountResearch !== null && setEquals(accountResearch, record.researchProfile.nodeId),
    });
  }
  const equipmentIds = (record.equipmentProfile?.sets || [])
    .map((set) => set.setId)
    .filter(Boolean);
  if (equipmentIds.length) {
    dimensions.push({
      key: 'equipmentProfile',
      matched: accountProfile.equipmentSetIds !== null &&
        accountProfile.equipmentSetIds !== undefined &&
        setEquals(accountProfile.equipmentSetIds, equipmentIds),
    });
  }
  if (record.heroSkillUnlockProfile && Object.keys(record.heroSkillUnlockProfile).length) {
    dimensions.push({
      key: 'heroSkillUnlockProfile',
      matched: accountProfile.heroSkillIds != null &&
        heroSkillsMatch(accountProfile.heroSkillIds, record.heroSkillUnlockProfile),
    });
  }
  const recordSkins = [record.castleSkinProfile, record.legionSkinProfile].filter(Boolean);
  if (recordSkins.length) {
    dimensions.push({
      key: 'skinProfiles',
      matched:
        Array.isArray(accountProfile.skinNames) &&
        recordSkins.every((skin) => accountProfile.skinNames.includes(skin.name)),
    });
  }
  return {
    matched: dimensions.filter((dimension) => dimension.matched).length,
    total: dimensions.length,
    dimensions,
  };
}

// Percentage-point classification of a simulated win rate against a recorded
// win rate and its confidence interval.
export function classifySimVsRecorded(recordedWinRate, simulatedWinRate, ciLo, ciHi) {
  const delta = simulatedWinRate - recordedWinRate;
  const overlaps = simulatedWinRate >= ciLo && simulatedWinRate <= ciHi;
  const label = overlaps ? 'agrees' : delta > 0 ? 'over' : 'under';
  return { label, delta };
}

function eraBadge(record, t) {
  const era = eraForGameVersion(record.sourceGameVersion);
  if (!era) {
    return `<span class="codex-era-badge codex-era-badge--unknown">${escapeHtml(t('era.unknown'))}</span>`;
  }
  const key = `era.${era.eraKey.slice('era'.length)}`;
  return `<span class="codex-era-badge" style="--era-color:var(${era.colorToken})">${escapeHtml(t(key))}</span>`;
}

function verificationChip(status, t) {
  return `<span class="codex-chip codex-chip--${status}" data-codex-status="${status}"><span class="codex-chip-dot" aria-hidden="true"></span>${escapeHtml(t(`verification.${status}`))}</span>`;
}

function metadataRow(label, value) {
  return `<div class="battle-field-meta-row"><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`;
}

function renderRecordCard(record, deps) {
  const envelope = provenanceFor(record);
  const status = envelope ? envelope.verificationStatus : 'unverified';
  const battleCount = Number(record.battleCount) || 0;
  const wins = Number(record.wins) || 0;
  const losses = Number(record.losses) || 0;
  const recordedWinRate = battleCount > 0 ? (wins / battleCount) * 100 : 0;
  const ci = record.confidenceInterval || {};
  const resemblance = scoreAccountResemblance(deps.getAccountProfile(), record);
  const profileLabel = (key) => deps.t(`fieldData.${key}`);
  const dimensionsHtml = resemblance.dimensions
    .map(
      (dimension) => `
    <span class="battle-field-dimension ${dimension.matched ? 'is-match' : 'is-miss'}">${escapeHtml(profileLabel(dimension.key))}</span>`
    )
    .join('');
  const unverified = status === 'unverified';
  return `
    <article class="battle-field-record battle-field-record--${status}" data-field-record="${escapeHtml(record.recordId || '')}">
      <div class="battle-field-record-head">
        ${eraBadge(record, deps.t)}
        <span class="battle-field-record-count">${escapeHtml(deps.t('fieldData.battleCount'))}: ${escapeHtml(deps.formatNumber(battleCount))}</span>
        ${verificationChip(status, deps.t)}
      </div>
      <div class="battle-field-bar" aria-label="${escapeHtml(deps.t('fieldData.confidenceInterval'))}">
        <span class="battle-field-bar-label">${escapeHtml(deps.t('fieldData.wins'))} ${escapeHtml(deps.formatNumber(wins))} / ${escapeHtml(deps.t('fieldData.losses'))} ${escapeHtml(deps.formatNumber(losses))}</span>
        <span class="battle-field-bar-track"><span class="battle-field-bar-fill" style="width:${recordedWinRate.toFixed(1)}%"></span></span>
        <span class="battle-field-bar-value">${escapeHtml(deps.formatPercent(recordedWinRate / 100))}</span>
      </div>
      <details class="battle-field-meta">
        <summary>${escapeHtml(deps.t('fieldData.metadata'))}</summary>
        <div class="battle-field-meta-grid">
          ${metadataRow(deps.t('fieldData.attackerSpeedPriority'), String(record.attackerSpeedPriority || deps.t('fieldData.notCaptured')))}
          ${metadataRow(deps.t('fieldData.sourceGameVersion'), String(record.sourceGameVersion || deps.t('fieldData.notCaptured')))}
          ${metadataRow(deps.t('fieldData.inclusionCriteria'), String(record.inclusionCriteria || deps.t('fieldData.notCaptured')))}
          ${envelope ? metadataRow(deps.t('fieldData.provenance'), `${envelope.source} · ${envelope.credit} · ${envelope.captureDate}`) : ''}
        </div>
      </details>
      <div class="battle-field-resembles">
        <span class="battle-field-resembles-label">${escapeHtml(deps.t('fieldData.resembles'))}</span>
        <span class="battle-field-resembles-score">${escapeHtml(deps.t('fieldData.resemblesMatch', { matched: resemblance.matched, total: resemblance.total }))}</span>
        <span class="battle-field-dimensions">${dimensionsHtml}</span>
      </div>
      ${
        unverified
          ? `<p class="battle-field-unverified">${escapeHtml(deps.t('fieldData.unverifiedNote'))}</p>`
          : `<div class="battle-field-compare">
        <button type="button" class="battle-secondary-button" data-field-compare="${escapeHtml(record.recordId || '')}">${escapeHtml(deps.t('fieldData.runComparison'))}</button>
        <span class="battle-field-compare-result" data-field-result="${escapeHtml(record.recordId || '')}" aria-live="polite"></span>
      </div>`
      }
    </article>`;
}

function renderEmpty(deps) {
  return `<p class="battle-field-empty">${escapeHtml(deps.t('fieldData.empty'))}</p>`;
}

function renderRetry(deps) {
  return `
    <p class="battle-field-empty">${escapeHtml(deps.t('fieldData.loading'))}</p>
    <button type="button" class="battle-secondary-button" data-field-retry>${escapeHtml(deps.t('fieldData.retry'))}</button>`;
}

export function renderFieldDataPanel(records, deps) {
  const verified = records.filter((record) => isRenderable(record));
  if (!verified.length) return renderEmpty(deps);
  return `
    <div class="battle-field-data-inner">
      <p class="battle-field-copy">${escapeHtml(deps.t('fieldData.copy'))}</p>
      <div class="battle-field-record-list">${verified.map((record) => renderRecordCard(record, deps)).join('')}</div>
    </div>`;
}

async function loadFieldRecords() {
  const store = await loadCodexStore();
  const records = store.datasets['duel-matrix'] || [];
  return Array.isArray(records) ? records : [];
}

export async function mountFieldDataPanel(container, deps) {
  void loadFieldDataStyles();
  container.innerHTML = `<div class="battle-field-loading">${escapeHtml(deps.t('fieldData.loading'))}</div>`;
  let records = [];
  let failed = false;
  try {
    records = await loadFieldRecords();
  } catch (error) {
    failed = true;
    console.warn('[battle-simulator] field data load failed', error);
  }
  container.innerHTML = failed ? renderRetry(deps) : renderFieldDataPanel(records, deps);
  container.hidden = false;

  const resultSpan = (recordId) =>
    container.querySelector(`[data-field-result="${recordId}"]`);

  container.querySelectorAll('[data-field-compare]').forEach((button) => {
    button.addEventListener('click', async () => {
      const recordId = button.dataset.fieldCompare;
      const record = records.find((entry) => entry.recordId === recordId);
      if (!record || typeof deps.runComparison !== 'function') return;
      const target = resultSpan(recordId);
      if (!target) return;
      target.textContent = deps.t('fieldData.loading');
      try {
        const result = await deps.runComparison(record);
        const classification = classifySimVsRecorded(
          (Number(record.wins) / Math.max(1, Number(record.battleCount))) * 100,
          result.simulatedWinRate,
          Number(record.confidenceInterval?.lo) * 100,
          Number(record.confidenceInterval?.hi) * 100
        );
        const label =
          classification.label === 'agrees'
            ? 'fieldData.simAgrees'
            : classification.label === 'under'
              ? 'fieldData.simUnder'
              : 'fieldData.simOver';
        target.textContent = deps.t(label, { delta: deps.formatPercent(classification.delta / 100) });
      } catch (error) {
        console.warn('[battle-simulator] comparison run failed', error);
        target.textContent = deps.t('fieldData.retry');
      }
    });
  });

  const retry = container.querySelector('[data-field-retry]');
  if (retry) {
    retry.addEventListener('click', () => {
      container.innerHTML = renderRetry(deps);
      void mountFieldDataPanel(container, deps);
    });
  }
}
