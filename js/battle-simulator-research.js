import {
  BATTLE_RESEARCH_CATALOG,
  BATTLE_RESEARCH_CATALOG_VERSION,
  BATTLE_RESEARCH_MISSING_EFFECTS,
  BATTLE_RESEARCH_PROGRESS_STORAGE_KEY,
  isKnownResearchProgressKey,
} from './battle-simulator-research-catalog.js';

const RESEARCH_SNAPSHOT_SCHEMA_VERSION = 1;
const MAX_SAVED_JSON_CHARACTERS = 64 * 1024;
const MAX_RESEARCH_ENTRIES = 2000;
const PROGRESS_KEY_RE = /^[a-z0-9_-]{1,64}:[a-z0-9_-]{1,64}$/i;
const CATALOG_BY_PROGRESS_KEY = new Map();

for (const entry of BATTLE_RESEARCH_CATALOG) {
  const entries = CATALOG_BY_PROGRESS_KEY.get(entry.progressKey) || [];
  entries.push(entry);
  CATALOG_BY_PROGRESS_KEY.set(entry.progressKey, entries);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function diagnostic(code, severity, message, sourceId = 'research') {
  return Object.freeze({ code, severity, message, sourceId });
}

function safeReadStorage(storage) {
  try {
    const target = storage || globalThis.localStorage;
    const value = target?.getItem?.(BATTLE_RESEARCH_PROGRESS_STORAGE_KEY);
    return { ok: true, value: typeof value === 'string' ? value : null };
  } catch {
    return { ok: false, value: null };
  }
}

function roundAmount(value) {
  return Math.round((Number(value) || 0) * 1e9) / 1e9;
}

function sourceIdFor(progressKey, effectIndex = 0) {
  return `research:${progressKey}:${effectIndex}`;
}

function excludedSource(progressKey, label, reason, savedLevel, details = {}) {
  return deepFreeze({
    sourceType: 'research',
    sourceId: `research:${progressKey}`,
    label: label || progressKey,
    reason,
    verification: { status: 'excluded', reason },
    provenance: {
      progressKey,
      savedLevel,
      catalogVersion: BATTLE_RESEARCH_CATALOG_VERSION,
      ...details,
    },
  });
}

function resolveAmount(entry, level) {
  const raw = entry.levelValues
    ? entry.levelValues[Math.min(level, entry.levelValues.length) - 1] || 0
    : entry.perLevel * level;
  return roundAmount(raw * entry.amountMultiplier);
}

function buildSource(entry, savedLevel, appliedLevel) {
  const sourceId = sourceIdFor(entry.progressKey, entry.effectIndex);
  return deepFreeze({
    sourceType: 'research',
    sourceId,
    label: entry.label,
    statKey: entry.statKey,
    amount: resolveAmount(entry, appliedLevel),
    operation: 'add',
    unit: entry.unit,
    appliesTo: entry.appliesTo,
    verification: {
      status: entry.verification === 'exact-level-table' ? 'verified' : 'repository-supported',
      method: entry.verification,
      catalogVersion: BATTLE_RESEARCH_CATALOG_VERSION,
    },
    provenance: {
      ...entry.provenance,
      progressKey: entry.progressKey,
      effectLabel: entry.effectLabel,
      savedLevel,
      appliedLevel,
      catalogVersion: BATTLE_RESEARCH_CATALOG_VERSION,
    },
  });
}

export {
  BATTLE_RESEARCH_CATALOG,
  BATTLE_RESEARCH_CATALOG_VERSION,
  BATTLE_RESEARCH_PROGRESS_STORAGE_KEY,
};

export function createEmptyResearchSnapshot({
  battleMode = 'pvp-field',
  diagnostics = [],
  savedProgress = null,
} = {}) {
  return deepFreeze({
    schemaVersion: RESEARCH_SNAPSHOT_SCHEMA_VERSION,
    catalogVersion: BATTLE_RESEARCH_CATALOG_VERSION,
    battleMode,
    sources: [],
    excludedSources: [],
    diagnostics: [...diagnostics],
    savedProgress: savedProgress || {
      exists: false,
      malformed: false,
      entryCount: 0,
    },
  });
}

export function readSavedResearchProgress({ storage } = {}) {
  const diagnostics = [];
  const stored = safeReadStorage(storage);
  if (!stored.ok) {
    diagnostics.push(
      diagnostic(
        'research-storage-unavailable',
        'warning',
        'Saved Research could not be read from this browser.'
      )
    );
    return deepFreeze({ exists: false, malformed: true, progress: {}, diagnostics });
  }
  if (stored.value === null) {
    return deepFreeze({ exists: false, malformed: false, progress: {}, diagnostics });
  }
  if (!stored.value || stored.value.length > MAX_SAVED_JSON_CHARACTERS) {
    diagnostics.push(
      diagnostic(
        'research-progress-too-large',
        'error',
        'Saved Research exceeds the 64 KB safety limit and was not applied.'
      )
    );
    return deepFreeze({ exists: true, malformed: true, progress: {}, diagnostics });
  }

  let parsed;
  try {
    parsed = JSON.parse(stored.value);
  } catch {
    diagnostics.push(
      diagnostic(
        'research-progress-malformed',
        'error',
        'Saved Research is not valid JSON and was not applied.'
      )
    );
    return deepFreeze({ exists: true, malformed: true, progress: {}, diagnostics });
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    diagnostics.push(
      diagnostic(
        'research-progress-invalid-shape',
        'error',
        'Saved Research must be a tree-and-node level map.'
      )
    );
    return deepFreeze({ exists: true, malformed: true, progress: {}, diagnostics });
  }

  const entries = Object.entries(parsed);
  if (entries.length > MAX_RESEARCH_ENTRIES) {
    diagnostics.push(
      diagnostic(
        'research-progress-truncated',
        'warning',
        `Only the first ${MAX_RESEARCH_ENTRIES} saved Research entries were inspected.`
      )
    );
  }

  const progress = {};
  for (const [key, value] of entries.slice(0, MAX_RESEARCH_ENTRIES)) {
    const sourceId = `research:${String(key).slice(0, 129)}`;
    if (!PROGRESS_KEY_RE.test(key)) {
      diagnostics.push(
        diagnostic(
          'research-progress-key-invalid',
          'warning',
          `Ignored an invalid saved Research key: ${String(key).slice(0, 80)}.`,
          sourceId
        )
      );
      continue;
    }
    const level = value;
    if (typeof level !== 'number' || !Number.isFinite(level) || level < 0) {
      diagnostics.push(
        diagnostic(
          'research-progress-level-invalid',
          'warning',
          `Ignored an invalid saved level for ${key}.`,
          sourceId
        )
      );
      continue;
    }
    const integerLevel = Math.floor(level);
    if (integerLevel > 0) progress[key] = integerLevel;
  }

  return deepFreeze({ exists: true, malformed: false, progress, diagnostics });
}

export function resolveResearchSources({ progress = {}, battleMode = 'pvp-field' } = {}) {
  if (battleMode !== 'pvp-field') {
    return createEmptyResearchSnapshot({
      battleMode,
      diagnostics: [
        diagnostic(
          'research-battle-mode-unsupported',
          'warning',
          `Research catalog ${BATTLE_RESEARCH_CATALOG_VERSION} does not model ${battleMode}.`
        ),
      ],
      savedProgress: {
        exists: Object.keys(progress || {}).length > 0,
        malformed: false,
        entryCount: Object.keys(progress || {}).length,
      },
    });
  }

  const source =
    progress && typeof progress === 'object' && !Array.isArray(progress) ? progress : {};
  const diagnostics = [];
  const sources = [];
  const excludedSources = [];
  const progressEntries = Object.entries(source).sort(([left], [right]) =>
    left.localeCompare(right)
  );

  for (const [progressKey, rawLevel] of progressEntries) {
    const savedLevel = Math.floor(Number(rawLevel));
    if (!Number.isFinite(savedLevel) || savedLevel <= 0) continue;
    const catalogEntries = CATALOG_BY_PROGRESS_KEY.get(progressKey);

    if (!catalogEntries?.length) {
      const missing = BATTLE_RESEARCH_MISSING_EFFECTS[progressKey];
      if (missing) {
        excludedSources.push(
          excludedSource(progressKey, missing.label, 'missing-value', savedLevel, {
            statKey: missing.statKey,
          })
        );
        diagnostics.push(
          diagnostic(
            'research-effect-value-missing',
            'warning',
            `${missing.label} was not applied: ${missing.reason}`,
            `research:${progressKey}`
          )
        );
      } else if (isKnownResearchProgressKey(progressKey)) {
        excludedSources.push(
          excludedSource(progressKey, progressKey, 'not-a-modeled-field-combat-effect', savedLevel)
        );
        diagnostics.push(
          diagnostic(
            'research-effect-unmodeled',
            'info',
            `${progressKey} is saved Research but is not a modeled PvP field-combat effect.`,
            `research:${progressKey}`
          )
        );
      } else {
        excludedSources.push(
          excludedSource(progressKey, progressKey, 'unknown-saved-key', savedLevel)
        );
        diagnostics.push(
          diagnostic(
            'research-saved-key-unknown',
            'warning',
            `${progressKey} is not present in this Research catalog.`,
            `research:${progressKey}`
          )
        );
      }
      continue;
    }

    const maxLevel = Math.min(...catalogEntries.map((entry) => entry.maxLevel));
    const appliedLevel = Math.min(savedLevel, maxLevel);
    if (appliedLevel !== savedLevel) {
      diagnostics.push(
        diagnostic(
          'research-level-clamped',
          'warning',
          `${progressKey} level ${savedLevel} was clamped to ${appliedLevel}.`,
          `research:${progressKey}`
        )
      );
    }
    for (const entry of catalogEntries) sources.push(buildSource(entry, savedLevel, appliedLevel));
  }

  sources.sort((left, right) => left.sourceId.localeCompare(right.sourceId));
  excludedSources.sort((left, right) => left.sourceId.localeCompare(right.sourceId));
  return deepFreeze({
    schemaVersion: RESEARCH_SNAPSHOT_SCHEMA_VERSION,
    catalogVersion: BATTLE_RESEARCH_CATALOG_VERSION,
    battleMode,
    sources,
    excludedSources,
    diagnostics,
    savedProgress: {
      exists: progressEntries.length > 0,
      malformed: false,
      entryCount: progressEntries.length,
    },
  });
}

export function buildBattleResearchSnapshot({ storage, battleMode = 'pvp-field' } = {}) {
  const saved = readSavedResearchProgress({ storage });
  const resolved = resolveResearchSources({ progress: saved.progress, battleMode });
  return deepFreeze({
    ...resolved,
    diagnostics: [...saved.diagnostics, ...resolved.diagnostics],
    savedProgress: {
      exists: saved.exists,
      malformed: saved.malformed,
      entryCount: Object.keys(saved.progress).length,
    },
  });
}
