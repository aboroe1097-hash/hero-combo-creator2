// Artifact and combo/counter exports.
// Sources: js/artifact-db.js, js/artifact-sword-data.js, js/combos-db.js,
// js/counter-db.js.

import { loadSiteModule } from '../lib/env.mjs';
import { callout, formatNumber, kpis, section, table } from '../lib/layout.mjs';

const titleCase = (value) =>
  String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase());

function compact(text, limit = 220) {
  const value = String(text || '').trim();
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

export async function artifacts() {
  const db = await loadSiteModule('js/artifact-db.js');
  const nodes = db.getAllArtifactNodes ? db.getAllArtifactNodes() : [];
  const artifacts = Object.values(db.ARTIFACT_DATABASE || {});
  const resources = db.ARTIFACT_RESOURCES || {};
  if (!nodes.length) throw new Error('No artifact nodes found');

  const artifactSections = artifacts.map((artifact) => {
    const artifactNodes = nodes.filter((node) => node.artifact === artifact.id || true);
    return section(
      artifact.name,
      table({
        columns: [
          { label: 'Tier' },
          { label: 'Branch', align: 'left' },
          { label: 'Node', align: 'left' },
          { label: 'Type', align: 'left' },
          { label: 'Max lv' },
          { label: 'Cost per level', align: 'left' },
          { label: 'Resource', align: 'left' },
        ],
        rows: artifactNodes.map((node) => [
          node.tier ?? '—',
          node.branch || '—',
          node.name,
          node.statType || node.category || '—',
          node.maxLevel,
          Array.isArray(node.costs) && node.costs.length
            ? node.costs.map(formatNumber).join(' / ')
            : null,
          resources[node.resource]?.shortName || node.resource || '—',
        ]),
        caption: `${artifact.title || artifact.name}${
          artifact.subtitle ? ` · ${artifact.subtitle}` : ''
        }. ${compact(artifact.description || '', 260)}`,
      })
    );
  });

  return {
    filename: 'roc-artifacts.pdf',
    eyebrow: 'Artifacts',
    title: 'Artifact nodes and upgrade costs',
    subtitle:
      'Every artifact tree node with its per-level emblem or soulstone cost, grouped by artifact.',
    meta: [
      { label: 'Artifacts', value: String(artifacts.length) },
      { label: 'Nodes', value: String(nodes.length) },
      { label: 'Resources', value: String(Object.keys(resources).length) },
    ],
    sections: [
      kpis([
        { label: 'Artifacts', value: artifacts.length },
        { label: 'Nodes', value: nodes.length },
        {
          label: 'Max level in tree',
          value: Math.max(...nodes.map((node) => Number(node.maxLevel) || 0)),
        },
      ]),
      section(
        'Currency sources',
        table({
          columns: [
            { label: 'Resource', align: 'left' },
            { label: 'Code', align: 'left' },
            { label: 'Daily reward' },
            { label: 'Source', align: 'left' },
          ],
          rows: Object.values(resources).map((resource) => [
            resource.name,
            resource.shortName || resource.id,
            resource.dailyReward ?? null,
            resource.source || '—',
          ]),
          caption: 'Daily rewards are the passive income used to plan how long a tree will take.',
        })
      ),
      ...artifactSections,
    ],
  };
}

// Counter entries appear in two shapes: [h1, h2, h3] tuples, or objects with
// { heroes, reason, confidence }.
function counterHeroes(entry) {
  if (Array.isArray(entry)) return entry.join(', ');
  if (entry && Array.isArray(entry.heroes)) return entry.heroes.join(', ');
  if (entry && entry.heroes) return String(entry.heroes);
  return '—';
}

function counterReason(entry) {
  if (Array.isArray(entry)) return '';
  return entry?.reason || '';
}

export async function combosAndCounters() {
  const combos = await loadSiteModule('js/combos-db.js');
  const counters = await loadSiteModule('js/counter-db.js');
  const ranked = combos.rankedCombos || [];
  const counterRows = counters.COMBO_COUNTERS || [];
  if (!ranked.length) throw new Error('No ranked combos found');

  const skinMode = ranked.filter((combo) => combo.skin).length;

  const counterSections = counterRows.map((target) => {
    const targetName =
      target.targetHeroes?.join(', ') || target.target || target.name || target.combo || 'Target';
    const list = target.counters || target.entries || target.list || [];
    return section(
      `Counters for ${compact(targetName, 70)}`,
      table({
        columns: [
          { label: '#' },
          { label: 'Heroes', align: 'left' },
          { label: 'Note', align: 'left' },
        ],
        rows: (Array.isArray(list) ? list : [list]).map((entry, index) => [
          index + 1,
          counterHeroes(entry),
          compact(counterReason(entry), 200) || '—',
        ]),
        caption: target.note ? compact(target.note, 240) : undefined,
      })
    );
  });

  return {
    filename: 'roc-combos-and-counters.pdf',
    eyebrow: 'Heroes',
    title: 'Ranked combos and their counters',
    subtitle:
      'The ranked three-hero combo list in rank order, plus the known counters for each targeted combo.',
    meta: [
      { label: 'Combos', value: String(ranked.length) },
      { label: 'Skin-mode combos', value: String(skinMode) },
      { label: 'Countered targets', value: String(counterRows.length) },
    ],
    sections: [
      kpis([
        { label: 'Combos', value: ranked.length },
        { label: 'Requiring skins', value: skinMode },
        { label: 'Countered targets', value: counterRows.length },
      ]),
      callout({
        title: 'How to read the skin column',
        body: 'A combo labelled with a skin code needs that skin in the numbered slot to reach the listed rank. Combos without a code work with the base heroes.',
        tone: 'info',
      }),
      section(
        'Ranked combos',
        table({
          columns: [
            { label: 'Rank' },
            { label: 'Front', align: 'left' },
            { label: 'Mid', align: 'left' },
            { label: 'Back', align: 'left' },
            { label: 'Skin slots', align: 'left' },
          ],
          rows: ranked.map((combo, index) => [
            index + 1,
            combo.heroes?.[0] || '—',
            combo.heroes?.[1] || '—',
            combo.heroes?.[2] || '—',
            combo.skin || 'None',
          ]),
          caption:
            'Skin slot codes are positional within the combo: each digit is the star requirement for that slot. A leading zero or a dash means that slot needs no skin.',
        })
      ),
      section(
        'Combos that require skins',
        table({
          columns: [
            { label: 'Heroes', align: 'left' },
            { label: 'Skin code', align: 'left' },
            { label: 'Note', align: 'left' },
          ],
          rows: ranked
            .filter((combo) => combo.skin)
            .map((combo) => [
              (combo.heroes || []).join(', '),
              combo.skin,
              compact(combo.note, 200) || '—',
            ]),
          caption: 'These combos assume the skin requirement is met.',
        })
      ),
      ...counterSections,
    ],
  };
}
