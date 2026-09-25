import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { baseRankedCombos } from '../js/combos-db.js';
import { allHeroesData } from '../js/heroes-data.js';
import { DEFAULT_HERO_ALIASES, normalizeHeroKey } from '../js/hero-name-match.js';

// The name keys and aliases live with the browser-side matcher the Combos planner's
// paste import uses, so both read names the same way; re-exported for callers.
export { DEFAULT_HERO_ALIASES, normalizeHeroKey };

export const ROC_COMBO_SOURCE_URLS = {
  noskin: 'https://tools.riseofcastles.net/combos-data/combo_noskin.json',
  skin: 'https://tools.riseofcastles.net/combos-data/combo_skin.json',
};

export const ROC_COMBO_ATTRIBUTION =
  'Public combo candidate data is sourced from tools.riseofcastles.net/combos-data. Credit to the Rise of Castles Tools team/community for publishing and maintaining those datasets.';

export const SUPPORTED_IMPORT_SEASONS = new Set(['S0', 'S1', 'S2', 'S3', 'S4', 'X1', 'X2', 'X8']);

const SOURCE_LABELS = {
  noskin: 'roc-combos-noskin',
  skin: 'roc-combos-skin',
};

function sortObjectByValue(object, limit = 25) {
  return Object.entries(object)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function incrementCounter(counter, key) {
  counter[key] = (counter[key] || 0) + 1;
}

export function createHeroResolver(heroes = allHeroesData, aliases = DEFAULT_HERO_ALIASES) {
  const heroByKey = new Map();

  for (const hero of heroes) {
    heroByKey.set(normalizeHeroKey(hero.name), hero.name);
  }

  for (const [externalName, localName] of Object.entries(aliases)) {
    if (heroByKey.has(normalizeHeroKey(localName))) {
      heroByKey.set(normalizeHeroKey(externalName), localName);
    }
  }

  return (externalName) => heroByKey.get(normalizeHeroKey(externalName)) || null;
}

export function normalizeImportSeason(value) {
  const raw = String(value || '')
    .trim()
    .toUpperCase();
  const seasonMatch = raw.match(/^S0?(\d+)$/);
  if (seasonMatch) {
    const season = `S${Number(seasonMatch[1])}`;
    return SUPPORTED_IMPORT_SEASONS.has(season) ? season : null;
  }

  const xMatch = raw.match(/^X0?(\d+)$/);
  if (!xMatch) return null;

  const xNumber = Number(xMatch[1]);
  if (xNumber === 1) return 'X1';
  if (xNumber === 2) return 'X2';
  if (xNumber >= 3 && xNumber <= 8) return 'X8';
  return null;
}

export function convertSkinFlagsToCode(flags) {
  if (!Array.isArray(flags)) return '';
  const code = flags
    .slice(0, 3)
    .map((flag) => (flag ? '2' : '1'))
    .join('');
  return code.includes('2') ? code : '';
}

export function createComboKey(heroes, ordered = true) {
  const names = heroes.map((hero) => normalizeHeroKey(hero));
  return (ordered ? names : names.sort()).join('|');
}

export function createDuplicateIndex(combos = baseRankedCombos) {
  const exact = new Map();
  const unordered = new Map();

  combos.forEach((combo, index) => {
    if (!Array.isArray(combo.heroes) || combo.heroes.length !== 3) return;
    const rank = index + 1;
    const exactKey = createComboKey(combo.heroes);
    if (!exact.has(exactKey)) exact.set(exactKey, rank);
    const unorderedKey = createComboKey(combo.heroes, false);
    if (!unordered.has(unorderedKey)) unordered.set(unorderedKey, rank);
  });

  return { exact, unordered };
}

export function normalizeExternalCombo(record, options = {}) {
  const source = options.source || 'noskin';
  const resolveHero = options.resolveHero || createHeroResolver();
  const duplicateIndex = options.duplicateIndex || createDuplicateIndex();
  const season = normalizeImportSeason(record?.season);
  const externalHeroes = Array.isArray(record?.h) ? record.h.slice(0, 3) : [];

  if (!season) {
    return {
      ok: false,
      reason: 'unsupportedSeason',
      externalSeason: record?.season || null,
      externalHeroes,
    };
  }

  if (externalHeroes.length !== 3) {
    return {
      ok: false,
      reason: 'invalidHeroCount',
      externalSeason: record?.season || null,
      externalHeroes,
    };
  }

  const heroes = externalHeroes.map(resolveHero);
  const missingHeroes = externalHeroes.filter((hero, index) => !heroes[index]);

  if (missingHeroes.length) {
    return {
      ok: false,
      reason: 'unknownHeroes',
      externalSeason: record?.season || null,
      externalHeroes,
      missingHeroes,
    };
  }

  const exactRank = duplicateIndex.exact.get(createComboKey(heroes)) || null;
  const unorderedRank = duplicateIndex.unordered.get(createComboKey(heroes, false)) || null;
  const skinCode = source === 'skin' ? convertSkinFlagsToCode(record?.has_skin) : '';

  return {
    ok: true,
    combo: {
      heroes,
      ...(skinCode ? { skin: skinCode } : {}),
      season,
      externalSeason: record.season || null,
      troop: record.troop || null,
      tier: record.tier || null,
      score: typeof record.score === 'number' ? record.score : null,
      source: SOURCE_LABELS[source] || source,
      sourceRank: record.orig_rank ? Number(record.orig_rank) : null,
      purpose: record.purpose || null,
      duplicate: {
        exactRank,
        unorderedRank,
      },
    },
  };
}

export function auditComboDataset(records, options = {}) {
  const source = options.source || 'noskin';
  const resolveHero = options.resolveHero || createHeroResolver(options.heroes);
  const duplicateIndex = options.duplicateIndex || createDuplicateIndex(options.currentCombos);
  const candidates = [];
  const skipped = {
    unsupportedSeason: 0,
    unknownHeroes: 0,
    invalidHeroCount: 0,
  };
  const missingAliases = {};
  const externalSeasonCounts = {};

  for (const record of records || []) {
    incrementCounter(externalSeasonCounts, String(record?.season || 'unknown'));

    const result = normalizeExternalCombo(record, {
      source,
      resolveHero,
      duplicateIndex,
    });

    if (result.ok) {
      candidates.push(result.combo);
      continue;
    }

    incrementCounter(skipped, result.reason);
    for (const hero of result.missingHeroes || []) {
      incrementCounter(missingAliases, String(hero));
    }
  }

  const duplicateExact = candidates.filter((combo) => combo.duplicate.exactRank).length;
  const duplicateUnordered = candidates.filter(
    (combo) => !combo.duplicate.exactRank && combo.duplicate.unorderedRank
  ).length;

  return {
    candidates,
    report: {
      source: SOURCE_LABELS[source] || source,
      scanned: records?.length || 0,
      imported: candidates.length,
      skipped,
      duplicates: {
        exact: duplicateExact,
        sameHeroesDifferentOrder: duplicateUnordered,
      },
      missingAliases: sortObjectByValue(missingAliases),
      externalSeasonCounts: sortObjectByValue(externalSeasonCounts, 50),
    },
  };
}

export function auditRocComboDatasets(datasets, options = {}) {
  const resolveHero = createHeroResolver(options.heroes || allHeroesData, options.aliases);
  const duplicateIndex = createDuplicateIndex(options.currentCombos || baseRankedCombos);
  const bySource = {};
  const candidates = {};

  for (const source of ['noskin', 'skin']) {
    const audit = auditComboDataset(datasets[source] || [], {
      source,
      resolveHero,
      duplicateIndex,
    });
    candidates[source] = audit.candidates;
    bySource[source] = audit.report;
  }

  return {
    fetchedAt: new Date().toISOString(),
    sourceUrls: ROC_COMBO_SOURCE_URLS,
    attribution: ROC_COMBO_ATTRIBUTION,
    candidates,
    report: {
      attribution: ROC_COMBO_ATTRIBUTION,
      bySource,
      totals: {
        scanned: Object.values(bySource).reduce((sum, item) => sum + item.scanned, 0),
        imported: Object.values(bySource).reduce((sum, item) => sum + item.imported, 0),
        skipped: Object.values(bySource).reduce(
          (sum, item) =>
            sum +
            item.skipped.unsupportedSeason +
            item.skipped.unknownHeroes +
            item.skipped.invalidHeroCount,
          0
        ),
      },
    },
  };
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function createCandidateModule(audit) {
  return `// Generated by scripts/roc-combo-importer.mjs
// Review-only candidates from public Rise of Castles combo datasets.
// Data source credit: ${ROC_COMBO_ATTRIBUTION}
// Do not import into the live generator until the entries are manually curated.

export const importedRocComboCandidates = ${JSON.stringify(audit.candidates, null, 2)};

export const importedRocComboAuditReport = ${JSON.stringify(audit.report, null, 2)};
`;
}

export async function runRocComboImport(options = {}) {
  const outputDir = resolve(options.outputDir || 'work/roc-combo-import');
  const datasets = {
    noskin: await fetchJson(ROC_COMBO_SOURCE_URLS.noskin),
    skin: await fetchJson(ROC_COMBO_SOURCE_URLS.skin),
  };
  const audit = auditRocComboDatasets(datasets, options);
  const reportPath = resolve(outputDir, 'audit-report.json');
  const candidatesPath = resolve(outputDir, 'candidates.json');
  const modulePath = resolve(outputDir, 'imported-roc-combos.mjs');

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(audit.report, null, 2)}\n`, 'utf8');
  await writeFile(candidatesPath, `${JSON.stringify(audit.candidates, null, 2)}\n`, 'utf8');
  await writeFile(modulePath, createCandidateModule(audit), 'utf8');

  return {
    ...audit,
    files: {
      reportPath,
      candidatesPath,
      modulePath,
    },
  };
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isCli) {
  runRocComboImport()
    .then((result) => {
      console.log(
        `ROC combo audit complete: ${result.report.totals.imported} candidates imported.`
      );
      console.log(`Report: ${result.files.reportPath}`);
      console.log(`Candidates: ${result.files.candidatesPath}`);
      console.log(`Module: ${result.files.modulePath}`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
