// scripts/codex/import-research-costs.mjs
// Stage 1 ingest: tools.riseofcastles.net research_data.js -> database/codex/research-costs.txt
//
// Reads the orchestrator-staged input work/roc-research-sources/roc_research_data.js
// (never committed) and emits the pipe-delimited codex source. Individual numbers
// are transcribed into our own schema; the source file is not mirrored.
// Prerequisite transform per docs/plans/lanes/overhaul-16.0.0-lane3-codex-data.md
// 3.6: raw positional "row;col" relation strings are resolved to node ids here.
// Text and numbers only - image URLs are never copied.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const inputPath = resolve(repoRoot, 'work', 'roc-research-sources', 'roc_research_data.js');
const outputPath = resolve(repoRoot, 'database', 'codex', 'research-costs.txt');

if (!existsSync(inputPath)) {
  console.error(`[import-research-costs] missing staged input: ${inputPath}`);
  console.error('The orchestrator must stage work/roc-research-sources before commit 7.');
  process.exit(1);
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'tree';
}

const raw = readFileSync(inputPath, 'utf8');
const jsonStart = raw.indexOf('[');
const jsonEnd = raw.lastIndexOf(']');
if (jsonStart < 0 || jsonEnd < 0) {
  console.error('[import-research-costs] could not locate RESEARCH_DATA array');
  process.exit(1);
}
const trees = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

const columns = [
  'treeName',
  'season',
  'medalType',
  'nodeId',
  'nodeName',
  'troop',
  'maxLevel',
  'values',
  'gems',
  'timeSec',
  'cmCosts',
  'wbCosts',
  'totalMedals',
  'requirements',
  'requirementGroups',
  'p',
];

function esc(value) {
  const text = value == null ? '' : String(value);
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ').replace(/\r/g, '');
}

function timeToSeconds(value) {
  if (!value) return null;
  const parts = String(value).split(':').map((p) => parseInt(p, 10));
  if (parts.some((p) => Number.isNaN(p))) return null;
  const [h, m, s] = parts.length === 3 ? parts : [0, parts[0], parts[1]];
  return h * 3600 + m * 60 + s;
}

function perLevelArray(levels, field, normalize) {
  const values = [];
  let present = false;
  for (let i = 0; i < levels.length; i += 1) {
    const entry = levels[i] || {};
    const key = field in entry ? entry[field] : null;
    if (key == null) {
      values.push(null);
    } else {
      present = true;
      values.push(normalize ? normalize(key) : key);
    }
  }
  return present ? values : [];
}

function arrayField(values) {
  if (!values.length) return '';
  return values.map((v) => (v == null ? '-' : v)).join(',');
}

const unresolved = [];
const rows = [];
const treeIndex = new Map();

for (const tree of trees) {
  const treeSlug = slugify(tree.name);
  const treeCredit = (tree.sourceNote || tree.note || '')
    .replace(/[|]/g, ';')
    .replace(/\s+/g, ' ')
    .trim();
  const verification = tree.total === 0 ? 'unverified' : 'current';
  const p = `credit=${treeCredit}|verification=${verification}`;

  const positionToId = new Map();
  for (const sub of tree.subs || []) {
    const nodeId = sub.gameNodeId || `${treeSlug}-r${sub.o}`;
    positionToId.set(String(sub.position), nodeId);
  }
  treeIndex.set(tree.name, positionToId);

  for (const sub of tree.subs || []) {
    const nodeId = sub.gameNodeId || `${treeSlug}-r${sub.o}`;
    const levels = Array.isArray(sub.buildData) ? sub.buildData : [];
    const gold = perLevelArray(levels, 'gold');
    const gems = perLevelArray(levels, 'gems');
    const timeSec = perLevelArray(levels, 'time', timeToSeconds);
    const cmCosts = perLevelArray(levels, 'cm');
    const wbCosts = perLevelArray(levels, 'wb');
    const primary = gold.length ? gold : sub.costs || [];

    let requirements = '';
    let requirementGroups = '';
    let rowP = p;
    if (sub.relation) {
      const groups = String(sub.relation)
        .split('|')
        .map((position) => positionToId.get(position.trim()) || null);
      const resolved = groups.filter((id) => id != null);
      const missing = groups.length - resolved.length;
      if (resolved.length === 1 && groups.length === 1) {
        requirements = resolved[0];
      } else if (resolved.length) {
        requirementGroups = groups.map((id) => id || '-').join('|');
      }
      if (missing > 0) {
        unresolved.push({ tree: tree.name, node: sub.n, relation: String(sub.relation) });
        rowP = `${p}|unresolvedPrereq=${missing}`;
      }
    }

    rows.push(
      [
        esc(tree.name),
        esc(tree.season),
        esc(tree.medalType),
        esc(nodeId),
        esc(sub.n),
        esc((sub.t || []).join('+')),
        sub.lv,
        arrayField(primary),
        arrayField(gems),
        arrayField(timeSec),
        arrayField(cmCosts),
        arrayField(wbCosts),
        sub.total,
        requirements,
        requirementGroups,
        rowP,
      ].join('|')
    );
  }
}

const header =
  `# source: tools.riseofcastles.net/tech-research research_data.js | credit: Raven G; Ash Roe (709); ` +
  `riseofcastles.net community | captureDate: 2026-09-02 | gameVersionScope: S0-X24 | ` +
  `verificationStatus: current`;
const output = [header, columns.join('|'), ...rows, ''].join('\n');
writeFileSync(outputPath, output, 'utf8');

const treeCount = trees.length;
const nodeCount = rows.length;
console.log(
  `[import-research-costs] wrote ${outputPath}: ${treeCount} trees / ${nodeCount} rows, ` +
    `${unresolved.length} unresolved prerequisite position(s)`
);
if (unresolved.length) {
  for (const issue of unresolved.slice(0, 20)) {
    console.warn(`  unresolved: ${issue.tree} -> ${issue.node} <- relation ${issue.relation}`);
  }
}
