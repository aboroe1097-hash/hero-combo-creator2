// scripts/codex/import-l96-heroes.mjs
// Stage 1 ingest: l96.app page extracts -> database/codex hero datasets.
//
// Reads the orchestrator-staged input work/l96-codex-sources/ (never committed) and
// emits heroes-codex.txt, hero-versions.txt, name-aliases.txt and
// excluded-noncanonical.txt. R2 sequencing rule: only names canonical in
// js/heroes-data.js today become rows; everything else goes to the exclusion queue.
// Prose is never copied - roles/seasons are facts, notes stay empty.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allHeroesData } from '../../js/heroes-data.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pagesDir = resolve(repoRoot, 'work', 'l96-codex-sources', 'pages');
const heroesListPath = resolve(pagesDir, 'txt_heroes_list.txt');
const alfredProfilePath = resolve(pagesDir, 'txt_hero_alfred.txt');

const outDir = resolve(repoRoot, 'database', 'codex');
const outHeroes = resolve(outDir, 'heroes-codex.txt');
const outVersions = resolve(outDir, 'hero-versions.txt');
const outAliases = resolve(outDir, 'name-aliases.txt');
const outExcluded = resolve(outDir, 'excluded-noncanonical.txt');

for (const file of [heroesListPath, alfredProfilePath]) {
  if (!existsSync(file)) {
    console.error(`[import-l96-heroes] missing staged input: ${file}`);
    process.exit(1);
  }
}

// Authored mapping: l96.app display name -> canonical name in js/heroes-data.js.
// Names without an entry are non-canonical and land in the exclusion queue.
// Two source names use a curly apostrophe (U+2019) where the roster uses a
// straight one; map them explicitly rather than normalizing blindly.
const ALIAS_MAP = {
  'Heroine of Courage': 'The Heroine',
  DemonSpear: 'Demon Spear',
  'Constantine the great': 'Constantine the Great',
  'The Black Prince': 'Black Prince',
  'Edward the confessor': 'Edward the Confessor',
  'Jade Rakshasa': 'Jade',
  'The Immortal': 'Immortal',
  'Beast Queen': 'BeastQueen',
  'Roku Boshuten': 'Rokuboshuten',
  Elk: 'ELK',
  'Sakura Blossom': 'Sakura',
  'Wind Walker': 'Wind-Walker',
  'The Tarantula': 'Tarantula',
  'The Defender': 'Defender',
  'The Lawmanv': 'Lawman',
  'The Valkyrie': 'Valkyrie',
  'The Liberator': 'Liberator',
  'The Ashen Verdict': 'Ashen Verdict',
  'The Warhammer': 'Warhammer',
  'The Warden': 'Warden',
  'The Eidolon': 'Eidolon',
  'The Scarlet Reaver': 'Scarlet Reaver',
  'Heaven\u2019s Justice': "Heaven's Justice",
  'North\u2019s Rage': "North's Rage",
  Arslam: 'Arslan',
  Farrah: 'Farah',
};

// Future roster (Lane 2 pending): canonical hint for the exclusion queue.
const FUTURE_ROSTER = {
  Hellfire: 'Hellfire (X10)',
  Healer: 'Healer (X10)',
  'Poison Master': 'Poison Master (X12)',
  Arslam: 'Arslan (X12)',
  Farrah: 'Farah (X12)',
  'El Cid': 'El Cid (X12)',
  Pepin: 'Pepin (X12)',
  Belisarius: 'Belisarius (X12)',
};

// Names we deliberately refuse to guess; the hint explains what the owner must confirm.
const AMBIGUOUS = {
  'Son of Ragnar': 'possibly Bjorn (X4) or Ragnar (X8)',
};

const canonicalNames = new Set(allHeroesData.map((hero) => hero.name));
for (const [l96Name, canonical] of Object.entries(ALIAS_MAP)) {
  if (!canonicalNames.has(canonical)) {
    console.error(`[import-l96-heroes] alias target not canonical: ${l96Name} -> ${canonical}`);
    process.exit(1);
  }
}

function normalizeSeason(season) {
  const match = /^Sx(\d+)$/.exec(season);
  if (match) return `X${parseInt(match[1], 10)}`;
  return season;
}

const descriptionPattern = /^Its a (.+?) hero, available at season (.+?), and it is on a .+ tier of power\.$/;
const lines = readFileSync(heroesListPath, 'utf8').split(/\r?\n/);

const entries = [];
for (let i = 0; i < lines.length - 1; i += 1) {
  const match = descriptionPattern.exec((lines[i + 1] || '').trim());
  if (match) {
    entries.push({
      l96Name: lines[i].trim(),
      role: match[1].trim(),
      season: normalizeSeason(match[2].trim()),
    });
  }
}

const ACCESS_BY_HERO = { Alfred: 'paid' };

const heroRows = [];
const aliasRows = [];
const excludedRows = [];

for (const entry of entries) {
  const canonical =
    ALIAS_MAP[entry.l96Name] ||
    (canonicalNames.has(entry.l96Name) ? entry.l96Name : null);
  if (!canonical) {
    const future = FUTURE_ROSTER[entry.l96Name];
    const ambiguous = AMBIGUOUS[entry.l96Name];
    const reason = future ? 'future-roster' : ambiguous ? 'ambiguous-no-guess' : 'no-canonical-match';
    excludedRows.push(`${entry.l96Name}|${reason}|${future || ambiguous || ''}`);
    continue;
  }
  heroRows.push(
    `${canonical}|${entry.season}||${entry.role}|${ACCESS_BY_HERO[canonical] || ''}||`
  );
  if (entry.l96Name !== canonical) {
    aliasRows.push(`${canonical}|${entry.l96Name}||l96.app /heroes|`);
  }
}

const heroHeader =
  `# source: l96.app /heroes summary (2026-09-02 capture) | credit: DonPablone | ` +
  `captureDate: 2026-09-02 | gameVersionScope: S0-X17 | verificationStatus: historical`;
const heroColumns = 'heroName|firstSeenSeason|lastSeenSeason|role|access|notes|p';
writeFileSync(outHeroes, [heroHeader, heroColumns, ...heroRows, ''].join('\n'), 'utf8');

const versionHeader =
  `# source: l96.app /heroes/alfred profile (last update 2023-09-17) | credit: DonPablone | ` +
  `captureDate: 2026-09-02 | gameVersionScope: S2 | verificationStatus: historical`;
const versionColumns = 'heroVersionId|heroName|effectiveFrom|effectiveTo|previousVersionId|changeSummary|sourceNote|p';
const versionRows = [
  'hv-alfred-1|Alfred|S2||||L96 profile snapshot (last update 2023-09-17): access paid; development exclusive; placement front; skill priority 6-8-7|l96.app /heroes/alfred|',
];
writeFileSync(outVersions, [versionHeader, versionColumns, ...versionRows, ''].join('\n'), 'utf8');

const aliasHeader =
  `# source: l96.app /heroes summary | credit: DonPablone | ` +
  `captureDate: 2026-09-02 | gameVersionScope: S0-X17 | verificationStatus: historical`;
const aliasColumns = 'canonicalName|alias|externalGame|sourceRef|p';
writeFileSync(outAliases, [aliasHeader, aliasColumns, ...aliasRows, ''].join('\n'), 'utf8');

const excludedHeader =
  '# Queue of L96 hero names not canonical today. R2: rows for future-roster names land ' +
  'in the same commit sequence as Lane 2\'s roster commit. ambiguous-no-guess names stay ' +
  'out until the owner confirms them.';
const excludedColumns = 'l96Name|reason|canonicalHint';
writeFileSync(outExcluded, [excludedHeader, excludedColumns, ...excludedRows, ''].join('\n'), 'utf8');

console.log(
  `[import-l96-heroes] ${entries.length} entries: ${heroRows.length} heroes-codex rows, ` +
    `${aliasRows.length} aliases, ${excludedRows.length} excluded (${outExcluded})`
);
