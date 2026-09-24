// Unit Specialisation exports: the per-node medal evidence and the tower/research
// structure. Source: js/specialization-towers-v2-data.js.
//
// IMPORTANT: the medal ladder in this file is the community workbook transcription
// (SPECIALIZATION_TROOP_MEDAL_EVIDENCE). It is the authority for per-node costs.
// SPECIALIZATION_COLUMNS[].totalCost is the public planner's figure and was derived
// by scaling column I on earlier revisions, so it is labelled as a planner figure
// and never presented as workbook-verified.

import { loadSiteModule } from '../lib/env.mjs';
import { bars, callout, formatNumber, kpis, section, table } from '../lib/layout.mjs';

const TROOP_LABELS = Object.freeze({
  footman: 'Footman',
  archer: 'Archer',
  cavalry: 'Cavalry',
});

const titleCase = (value) =>
  String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase());

export async function specializationMedals() {
  const spec = await loadSiteModule('js/specialization-towers-v2-data.js');
  const sections = spec.SPECIALIZATION_TROOP_MEDAL_EVIDENCE || [];
  if (!sections.length) {
    throw new Error('No medal evidence sections found; refusing to render an empty medals table');
  }
  const source = spec.SPECIALIZATION_MEDAL_EVIDENCE_SOURCE || {};

  const incomplete = sections.filter((entry) => entry.complete !== true);
  const troops = [...new Set(sections.map((entry) => entry.troop))];
  const towers = [...new Set(sections.map((entry) => entry.tower))].sort((a, b) => a - b);
  const totalMedals = sections.reduce((sum, entry) => sum + (entry.knownCostTotal || 0), 0);
  const totalRows = sections.reduce((sum, entry) => sum + entry.rows.length, 0);

  // towers I-X exist in the game; anything absent from the evidence is a gap.
  const expectedTowers = Array.from({ length: 10 }, (_, index) => index + 1);
  const missingTowers = expectedTowers.filter((tower) => !towers.includes(tower));

  const coverageRows = [];
  troops.forEach((troop) => {
    const troopSections = sections.filter((entry) => entry.troop === troop);
    coverageRows.push({ __subgroup: TROOP_LABELS[troop] || titleCase(troop) });
    expectedTowers.forEach((tower) => {
      const match = troopSections.find((entry) => entry.tower === tower);
      coverageRows.push([
        `Tower ${tower}`,
        match ? match.title : null,
        match ? match.rows.length : null,
        match ? match.knownCostTotal : null,
        match ? (match.complete === true ? 'Complete' : 'Partial') : 'No data',
      ]);
    });
  });

  const detailSections = sections.map((entry) =>
    section(
      `${entry.title}${entry.complete === true ? '' : ' — partial'}`,
      table({
        columns: [
          { label: 'Node', align: 'left' },
          { label: 'Medals per level', align: 'left' },
          { label: 'Node total' },
        ],
        rows: entry.rows.map((row) => {
          const costs = Array.isArray(row.costs) ? row.costs : [];
          const sum = costs.reduce((acc, value) => acc + (Number(value) || 0), 0);
          return [
            row.name,
            costs.length ? costs.map(formatNumber).join(' + ') : null,
            costs.length ? sum : null,
          ];
        }),
        footer: ['Section total', '—', entry.knownCostTotal ?? null],
        caption: `${TROOP_LABELS[entry.troop] || entry.troop} · ${entry.rows.length} nodes${
          entry.researchId ? ` · research ${entry.researchId}` : ' · no canonical research mapping'
        }.`,
      })
    )
  );

  return {
    filename: 'roc-unit-specialisation-medals.pdf',
    eyebrow: 'Unit Specialisation',
    revision: spec.SPECIALIZATION_DATA_REVISION,
    title: 'Medal costs per node',
    subtitle:
      'Virtue Badge costs for every Unit Specialisation node, transcribed from the community workbook. Figures are per level of the node.',
    meta: [
      { label: 'Towers covered', value: `${towers.length} of 10` },
      { label: 'Troops', value: String(troops.length) },
      { label: 'Nodes', value: String(totalRows) },
      { label: 'Workbook observed', value: source.observedAt || '—' },
    ],
    sections: [
      kpis([
        { label: 'Sections', value: sections.length },
        { label: 'Nodes', value: totalRows },
        { label: 'Medals recorded', value: totalMedals },
        {
          label: 'Partial sections',
          value: incomplete.length,
          hint: 'source marked incomplete',
        },
      ]),
      incomplete.length || missingTowers.length
        ? callout({
            title: 'This workbook transcription is not yet complete',
            body: `The evidence covers ${towers.length} of the 10 towers (${towers
              .map((tower) => `Tower ${tower}`)
              .join(', ')}${
              missingTowers.length
                ? `), so Towers ${missingTowers.join(', ')} have no per-node medal data yet`
                : ')'
            }. ${incomplete.length} of ${sections.length} sections are also marked partial, meaning their node costs are still being transcribed. Treat this export as an in-progress reference, not a final answer.`,
          })
        : '',
      callout({
        title: 'Planner totals elsewhere on the site may differ',
        body: 'The public planner corpus derives its column totals from a different source. This export deliberately shows only the workbook transcription, because that is the per-node record.',
        tone: 'info',
      }),
      section(
        'Medals recorded per tower',
        bars({
          items: towers.map((tower) => ({
            label: `Tower ${tower}`,
            value: sections
              .filter((entry) => entry.tower === tower)
              .reduce((sum, entry) => sum + (entry.knownCostTotal || 0), 0),
          })),
        })
      ),
      section(
        'Coverage by troop and tower',
        table({
          columns: [
            { label: 'Tower', align: 'left' },
            { label: 'Section', align: 'left' },
            { label: 'Nodes' },
            { label: 'Medals' },
            { label: 'State', align: 'left' },
          ],
          rows: coverageRows,
          footer: ['All recorded', '—', totalRows, totalMedals, '—'],
          caption:
            '"No data" means the workbook row for that tower has not been transcribed yet. It is not a zero.',
        })
      ),
      ...detailSections,
      section(
        'Provenance',
        table({
          columns: [
            { label: 'Field', align: 'left' },
            { label: 'Value', align: 'left' },
          ],
          rows: [
            ['Workbook', source.sourceUrl || '—'],
            ['Observed', source.observedAt || '—'],
            ['Data revision', spec.SPECIALIZATION_DATA_REVISION || '—'],
            [
              'Tabs read',
              source.sheets
                ? Object.values(source.sheets)
                    .map((sheet) => sheet.title || sheet.gid)
                    .join(', ')
                : '—',
            ],
          ],
        })
      ),
    ],
  };
}

export async function specializationTowers() {
  const spec = await loadSiteModule('js/specialization-towers-v2-data.js');
  const research = spec.SPECIALIZATION_RESEARCH;
  const columns = spec.SPECIALIZATION_COLUMNS;
  const legionSkills = spec.SPECIALIZATION_LEGION_SKILLS || {};
  const metadata = spec.SPECIALIZATION_SOURCE_METADATA || {};

  const columnIds = Object.keys(columns).sort((a, b) => Number(a) - Number(b));
  const researchIds = Object.keys(research);
  const totalNodes = researchIds.reduce((sum, id) => sum + (research[id].nodes?.length || 0), 0);
  const passiveCount = researchIds.filter((id) => research[id].passiveSkillNodeId).length;

  const columnRows = [];
  columnIds.forEach((columnId) => {
    const column = columns[columnId];
    columnRows.push([
      column.name,
      column.unlockSeason || '—',
      column.researches.length,
      column.researches.reduce(
        (sum, researchId) => sum + (research[researchId]?.nodes?.length || 0),
        0
      ),
      column.totalCost,
    ]);
  });

  const legionRows = [];
  Object.entries(legionSkills).forEach(([columnKey, skills]) => {
    Object.entries(skills || {}).forEach(([troop, skill]) => {
      legionRows.push([
        `Column ${columnKey}`,
        TROOP_LABELS[troop] || titleCase(troop),
        skill?.name || '—',
        skill?.desc || '',
      ]);
    });
  });

  return {
    filename: 'roc-specialisation-towers.pdf',
    eyebrow: 'Unit Specialisation',
    revision: spec.SPECIALIZATION_DATA_REVISION,
    title: 'Towers, researches and legion skills',
    subtitle:
      'The eight Unit Specialisation columns, their four researches each, the attribute nodes within them, and the legion skill every column grants per troop type.',
    meta: [
      { label: 'Columns', value: String(columnIds.length) },
      { label: 'Researches', value: String(researchIds.length) },
      { label: 'Attribute nodes', value: String(totalNodes) },
      { label: 'Legion skills', value: String(legionRows.length) },
    ],
    sections: [
      kpis([
        { label: 'Columns', value: columnIds.length },
        { label: 'Researches', value: researchIds.length },
        { label: 'Attribute nodes', value: totalNodes },
        { label: 'Legion skills', value: legionRows.length },
        { label: 'Passive skills', value: passiveCount },
      ]),
      callout({
        title: 'Medal totals here come from the public planner',
        body: 'The per-column medal totals below are the planner corpus figures. They are not the community workbook transcription, which is published separately in the medal costs export and is the authority for per-node costs.',
        tone: 'info',
      }),
      section(
        'Researches per column',
        table({
          columns: [
            { label: 'Column', align: 'left' },
            { label: 'Unlocks' },
            { label: 'Researches' },
            { label: 'Nodes' },
            { label: 'Planner medals' },
          ],
          rows: columnRows,
          footer: [
            'All columns',
            '—',
            researchIds.length,
            totalNodes,
            columnRows.reduce((sum, row) => sum + (row[4] || 0), 0),
          ],
          caption: 'Node counts are the attribute nodes inside each column.',
        })
      ),
      section(
        'Attribute nodes per column',
        bars({
          items: columnRows.map((row) => ({ label: row[0], value: row[3] })),
        })
      ),
      section(
        'Every research',
        table({
          columns: [
            { label: 'Column' },
            { label: 'Sequence' },
            { label: 'Research', align: 'left' },
            { label: 'Nodes' },
            { label: 'Passive skill', align: 'left' },
          ],
          rows: columnIds.flatMap((columnId) =>
            columns[columnId].researches.map((researchId) => {
              const entry = research[researchId] || {};
              const passive =
                entry.passiveSkill && entry.passiveSkill.footman
                  ? entry.passiveSkill.footman.name
                  : '—';
              return [
                columnId,
                entry.sequence ?? '—',
                entry.name || researchId,
                entry.nodes?.length || 0,
                passive,
              ];
            })
          ),
          caption:
            'Passive skills are shown by their footman name; each troop has its own variant.',
        })
      ),
      section(
        'Legion skills',
        table({
          columns: [
            { label: 'Column', align: 'left' },
            { label: 'Troop', align: 'left' },
            { label: 'Skill', align: 'left' },
            { label: 'Effect', align: 'left' },
          ],
          rows: legionRows.map((row) => [row[0], row[1], row[2], row[3]]),
          caption:
            'Column legion skills are free — they are granted by unlocking the column, not bought with medals.',
        })
      ),
      section(
        'Source',
        table({
          columns: [
            { label: 'Field', align: 'left' },
            { label: 'Value', align: 'left' },
          ],
          rows: [
            ['Title', metadata.title || '—'],
            ['Publisher', metadata.publisher || '—'],
            ['Source type', metadata.sourceType || '—'],
            ['Source URL', metadata.sourceUrl || '—'],
            ['Data revision', spec.SPECIALIZATION_DATA_REVISION || '—'],
          ],
        })
      ),
    ],
  };
}
