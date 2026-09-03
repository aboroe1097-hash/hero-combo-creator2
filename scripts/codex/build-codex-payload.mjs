// scripts/codex/build-codex-payload.mjs
// Stage 2: database/codex/*.txt -> js/codex-payload.json (gzip + base64 envelope).
// Mirrors scripts/eden/build-eden-datasets.py payload shape.
//
// Contracts enforced here (docs/plans/lanes/overhaul-16.0.0-lane3-codex-data.md):
// - every record carries the 5-field provenance object (file default + row p override)
// - every hero reference resolves to exactly one name in js/heroes-data.js at build
//   time, or the row is quarantined; live datasets fail the build on quarantine
// - no http(s):// value survives into the payload (text and numbers only)
// - decoded inner JSON must stay within the manifest size budget

import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { allHeroesData } from '../../js/heroes-data.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dbDir = resolve(repoRoot, 'database', 'codex');
const manifestPath = resolve(dbDir, 'codex-datasets.manifest.json');
const outputPath = resolve(repoRoot, 'js', 'codex-payload.json');

const VERIFICATION_STATUSES = new Set(['current', 'historical', 'unverified']);
const ACCESS_VALUES = new Set(['', 'standard', 'paid', 'royal']);

const HERO_COLUMNS = {
  'heroes-codex': ['heroName'],
  'hero-versions': ['heroName'],
  'name-aliases': ['canonicalName'],
  'duel-matrix': ['attacker', 'defender'],
  'combo-snapshots': ['heroes'],
};

function esc(value) {
  return String(value ?? '').replace(/\|/g, '\\|').trim();
}

function parsePOverride(rawP, fallbackVerification, fallbackCredit) {
  const override = { verification: fallbackVerification, credit: fallbackCredit, note: '' };
  if (!rawP) return override;
  for (const part of rawP.split('|')) {
    if (!part) continue;
    const eq = part.indexOf('=');
    const key = eq >= 0 ? part.slice(0, eq).trim() : part.trim();
    const value = eq >= 0 ? part.slice(eq + 1).trim() : '';
    if (key === 'credit' && value) override.credit = value;
    if (key === 'verification' && VERIFICATION_STATUSES.has(value)) override.verification = value;
    if (key === 'note' && value) override.note = value;
    if (key === 'unresolvedPrereq' && Number(value) > 0) override.verification = 'unverified';
  }
  return override;
}

function parseProvenanceDirective(line) {
  const provenance = {};
  if (!line.startsWith('# source:')) return null;
  for (const part of line.slice(2).split('|')) {
    const eq = part.indexOf(':');
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === 'source') provenance.source = value;
    if (key === 'credit') provenance.credit = value;
    if (key === 'captureDate') provenance.captureDate = value;
    if (key === 'gameVersionScope') provenance.gameVersionScope = value;
    if (key === 'verificationStatus') provenance.verificationStatus = value;
  }
  const complete =
    provenance.source && provenance.credit && provenance.captureDate &&
    provenance.gameVersionScope && provenance.verificationStatus;
  return complete ? provenance : null;
}

function parseDatasetFile(path) {
  const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/);
  let headerProvenance = null;
  let header = null;
  const rows = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (line.startsWith('#')) {
      const parsed = parseProvenanceDirective(line);
      if (parsed) headerProvenance = parsed;
      continue;
    }
    if (header === null) {
      header = line.split('|').map((name) => name.trim());
      continue;
    }
    const fields = line.split('|');
    const row = {};
    header.forEach((name, index) => {
      row[name] = index < fields.length ? fields[index].trim() : '';
    });
    rows.push({ row, lineNo: i + 1 });
  }
  return { headerProvenance, header, rows };
}

function mergeProvenance(record, directive, override) {
  return {
    source: directive.source,
    credit: override.credit || directive.credit,
    captureDate: directive.captureDate,
    gameVersionScope: directive.gameVersionScope,
    verificationStatus: override.verification || directive.verificationStatus,
  };
}

function assertNoUrls(record, datasetId, lineNo) {
  const serialized = JSON.stringify(record);
  if (/https?:\/\//i.test(serialized)) {
    console.error(
      `[build-codex-payload] ${datasetId} row ${lineNo}: http(s):// URL found - text and numbers only`
    );
    process.exit(1);
  }
}

function toArray(value, separator, numeric = false) {
  if (!value) return [];
  return value
    .split(separator)
    .filter((part) => part !== '' && part !== '-')
    .map((part) => (numeric ? Number(part) : part));
}

function buildResearchRecord(row, lineNo, provenance) {
  const costs = {};
  const resources = row.values ? row.values.split(',').map((v) => (v === '-' ? null : Number(v))) : [];
  const gems = row.gems ? row.gems.split(',').map((v) => (v === '-' ? null : Number(v))) : [];
  const timeSec = row.timeSec ? row.timeSec.split(',').map((v) => (v === '-' ? null : Number(v))) : [];
  const cmCosts = row.cmCosts ? row.cmCosts.split(',').map((v) => (v === '-' ? null : Number(v))) : [];
  const wbCosts = row.wbCosts ? row.wbCosts.split(',').map((v) => (v === '-' ? null : Number(v))) : [];
  if (resources.some((v) => v != null)) costs.resources = resources;
  if (gems.some((v) => v != null)) costs.gems = gems;
  if (timeSec.some((v) => v != null)) costs.timeSeconds = timeSec;
  if (cmCosts.some((v) => v != null)) costs.courageMedals = cmCosts;
  if (wbCosts.some((v) => v != null)) costs.warBadges = wbCosts;

  const record = {
    treeName: row.treeName,
    season: row.season,
    medalType: row.medalType || null,
    nodeId: row.nodeId,
    name: row.nodeName,
    troop: row.troop ? row.troop.split('+') : [],
    maxLevel: Number(row.maxLevel),
    totalMedals: row.totalMedals === '' ? null : Number(row.totalMedals),
    costs,
    verificationStatus: provenance.verificationStatus,
    sourceCredit: provenance.credit,
  };
  if (row.requirements) record.requirements = toArray(row.requirements, ';');
  if (row.requirementGroups) {
    record.requirementGroups = row.requirementGroups
      .split('|')
      .filter((group) => group)
      .map((group) => group.split(';').filter((id) => id));
  }
  record.provenance = provenance;
  assertNoUrls(record, 'research-costs', lineNo);
  return record;
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const budget = manifest.budget || { rawBytes: 524288, gzipBytes: 81920 };

const canonicalNames = new Set(allHeroesData.map((hero) => hero.name));
const catalog = [];
const datasets = {};
const canonicalAliases = {};
const aliasToCanonical = new Map();
const currentVersions = {};
const quarantine = [];

let newestMtime = 0;

function trackMtime(filePath) {
  if (!existsSync(filePath)) return;
  const mtime = statSync(filePath).mtimeMs;
  if (mtime > newestMtime) newestMtime = mtime;
}

trackMtime(manifestPath);

function resolveCanonical(value) {
  if (canonicalNames.has(value)) return value;
  const candidates = aliasToCanonical.get(value);
  if (candidates && candidates.size === 1) return [...candidates][0];
  return null;
}

for (const dataset of manifest.datasets) {
  const filePath = resolve(dbDir, dataset.file);
  trackMtime(filePath);
  const { headerProvenance, rows } = parseDatasetFile(filePath);
  const records = [];

  for (const { row, lineNo } of rows) {
    const override = parsePOverride(
      row.p,
      headerProvenance.verificationStatus,
      headerProvenance.credit
    );
    const provenance = mergeProvenance({}, headerProvenance, override);

    for (const column of HERO_COLUMNS[dataset.id] || []) {
      const value = row[column];
      if (!value) continue;
      const canonical = resolveCanonical(value);
      if (!canonical) {
        quarantine.push({ datasetId: dataset.id, row: lineNo, ref: value, reason: 'no-canonical-match' });
        continue;
      }
      if (canonical !== value) row[column] = canonical;
    }
    if (quarantine.some((entry) => entry.datasetId === dataset.id && entry.row === lineNo)) continue;

    if (dataset.id === 'research-costs') {
      records.push(buildResearchRecord(row, lineNo, provenance));
    } else if (dataset.id === 'hero-versions') {
      const record = {
        heroVersionId: row.heroVersionId,
        heroName: row.heroName,
        effectiveFrom: row.effectiveFrom,
        effectiveTo: row.effectiveTo || null,
        previousVersionId: row.previousVersionId || null,
        changeSummary: row.changeSummary ? row.changeSummary.split(';').filter((part) => part) : [],
        sourceNote: row.sourceNote || '',
      };
      record.provenance = provenance;
      assertNoUrls(record, dataset.id, lineNo);
      if (!record.effectiveTo) currentVersions[record.heroName] = record.heroVersionId;
      records.push(record);
    } else if (dataset.id === 'name-aliases') {
      const canonical = resolveCanonical(row.canonicalName);
      if (!canonical) {
        quarantine.push({ datasetId: dataset.id, row: lineNo, ref: row.canonicalName, reason: 'no-canonical-match' });
        continue;
      }
      if (!aliasToCanonical.has(row.alias)) aliasToCanonical.set(row.alias, new Set());
      aliasToCanonical.get(row.alias).add(canonical);
      const aliasEntry = {
        alias: row.alias,
        externalGame: row.externalGame || '',
        sourceRef: row.sourceRef || '',
      };
      (canonicalAliases[canonical] = canonicalAliases[canonical] || []).push(aliasEntry);
      const record = { canonicalName: canonical, ...aliasEntry };
      record.provenance = provenance;
      assertNoUrls(record, dataset.id, lineNo);
      records.push(record);
    } else if (dataset.id === 'heroes-codex') {
      const record = {
        heroName: row.heroName,
        firstSeenSeason: row.firstSeenSeason,
        lastSeenSeason: row.lastSeenSeason || null,
        role: row.role,
        access: row.access || '',
        notes: row.notes || '',
      };
      if (!ACCESS_VALUES.has(record.access)) {
        console.error(
          `[build-codex-payload] heroes-codex row ${lineNo}: access '${record.access}' outside the frozen enum standard|paid|royal`
        );
        process.exit(1);
      }
      record.provenance = provenance;
      assertNoUrls(record, dataset.id, lineNo);
      records.push(record);
    } else {
      const record = {};
      for (const [key, value] of Object.entries(row)) {
        if (key !== 'p') record[key] = value === '' ? '' : value;
      }
      record.provenance = provenance;
      assertNoUrls(record, dataset.id, lineNo);
      records.push(record);
    }
  }

  const liveQuarantine = quarantine.filter((entry) => entry.datasetId === dataset.id);
  if (dataset.status === 'live' && liveQuarantine.length) {
    console.error(
      `[build-codex-payload] ${dataset.id}: live dataset produced quarantine rows - ` +
        `${JSON.stringify(liveQuarantine.slice(0, 5))}`
    );
    process.exit(1);
  }

  datasets[dataset.id] = records;
  catalog.push({
    id: dataset.id,
    recordCount: records.length,
    status: dataset.status,
    provenance: headerProvenance,
  });
}

for (const [aliasName, candidates] of aliasToCanonical) {
  if (candidates.size > 1) {
    quarantine.push({
      datasetId: 'name-aliases',
      row: 0,
      ref: aliasName,
      reason: 'ambiguous-alias',
    });
  }
}
if (quarantine.some((entry) => entry.reason === 'ambiguous-alias')) {
  console.error(
    `[build-codex-payload] ambiguous aliases: ${JSON.stringify(quarantine.filter((e) => e.reason === 'ambiguous-alias'))}`
  );
  process.exit(1);
}

const builtAt = new Date(newestMtime || Date.now()).toISOString();
const payloadObj = { builtAt, catalog, datasets, aliases: canonicalAliases, currentVersions, quarantine };
const payloadJson = JSON.stringify(payloadObj);
const payloadBytes = Buffer.byteLength(payloadJson, 'utf8');
const compressed = gzipSync(Buffer.from(payloadJson, 'utf8'), { level: 9, mtime: 0 });

if (payloadBytes > budget.rawBytes) {
  console.error(
    `[build-codex-payload] inner JSON ${payloadBytes} bytes exceeds raw budget ${budget.rawBytes}`
  );
  process.exit(1);
}
if (compressed.length > budget.gzipBytes) {
  console.error(
    `[build-codex-payload] gzip ${compressed.length} bytes exceeds gzip budget ${budget.gzipBytes}`
  );
  process.exit(1);
}

writeFileSync(
  outputPath,
  JSON.stringify({
    builtAt,
    encoding: 'gzip-base64',
    payload: Buffer.from(compressed).toString('base64'),
  }) + '\n',
  'utf8'
);

const counts = catalog.map((entry) => `${entry.id}=${entry.recordCount}`).join(', ');
console.log(
  `[build-codex-payload] wrote ${outputPath} (${payloadBytes} raw / ${compressed.length} gzip bytes) - ${counts} - quarantine ${quarantine.length}`
);
