// Heroes & Combos sheets.
//
// Data owners: js/combos-db.js (the ranked lane corpus and its own score function)
// and js/counter-db.js (the counter matchups). The sheet calls the same
// `scoreComboByRank` and counter helpers the Combo Generator and the Hero Atlas
// call, so a printed figure cannot disagree with the tool.

import { loadSiteModule } from '../../pdf/lib/env.mjs';

const SKIN_LABELS = Object.freeze({ 1: 'optional', 2: 'recommended', 3: 'must own' });

function skinSummary(combo) {
  const code = String(combo?.skin || '111')
    .padEnd(3, '1')
    .slice(0, 3);
  const musts = [...code].filter((digit) => digit === '3').length;
  if (!musts) return code.includes('2') ? 'Recommended only' : 'None required';
  return `${musts} must-own skin${musts === 1 ? '' : 's'}`;
}

function heroLine(heroes) {
  return (heroes || []).join(' · ');
}

/**
 * Ranked lanes and the lanes that beat them: the two halves of the generator's
 * answer, side by side.
 */
export async function topCombosSheet() {
  const [combos, counters] = await Promise.all([
    loadSiteModule('js/combos-db.js'),
    loadSiteModule('js/counter-db.js'),
  ]);

  const ranked = combos.rankedCombos || [];
  if (!ranked.length) throw new Error('The ranked combo corpus is empty');
  const normalMode = combos.baseRankedCombos || ranked;
  const matchups = counters.getAllCounterMatchups ? counters.getAllCounterMatchups() : [];

  const top = normalMode.slice(0, 12).map((combo, index) => ({
    rank: index + 1,
    heroes: combo.heroes,
    score: combos.scoreComboByRank(index, normalMode.length),
    skin: skinSummary(combo),
    note: combo.note || '',
  }));

  const counterRows = matchups
    .slice(0, 14)
    .map((matchup) => {
      const first = matchup.counters?.[0];
      return [
        heroLine(matchup.target),
        first ? heroLine(first.heroes) : null,
        first?.reason ? String(first.reason) : 'No published reason',
        matchup.counters?.length ?? 0,
      ];
    })
    .filter(Boolean);

  const lanesWithMustSkins = ranked.filter((combo) =>
    String(combo.skin || '').includes('3')
  ).length;

  const COUNTER_ROWS_PER_PAGE = 7;
  const counterChunks = [];
  for (let index = 0; index < counterRows.length; index += COUNTER_ROWS_PER_PAGE) {
    counterChunks.push(counterRows.slice(index, index + COUNTER_ROWS_PER_PAGE));
  }

  return {
    pages: [
      {
        eyebrow: 'Combo Generator · ranked reference',
        title: 'Top Combos and Counters',
        subtitle:
          'The lanes the generator ranks first in normal mode, and the published answers to the lanes the community ' +
          'tracks counters for.',
        blocks: [
          {
            kind: 'table',
            tone: 'gold',
            columns: [
              { label: '#', tone: 'gold' },
              { label: 'Lane', align: 'left' },
              { label: 'Score', tone: 'teal' },
              { label: 'Skins', align: 'left' },
            ],
            rows: top.map((entry) => [
              entry.rank,
              `${heroLine(entry.heroes)}${entry.note ? ` — ${entry.note}` : ''}`,
              entry.score,
              entry.skin,
            ]),
            note:
              'The score column is scoreComboByRank, the same function the generator prints, so rank 1 scores 100.0 ' +
              'and the last lane scores 1.0.',
          },
        ],
      },
      // Every tracked target is published; the list continues across pages rather
      // than losing rows to a page that cannot hold them.
      ...counterChunks.map((chunk, index) => ({
        eyebrow: 'Combo Generator · counters',
        title:
          index === 0
            ? 'Counters to the Tracker Lanes'
            : `Counters to the Tracker Lanes — continued (${index + 1}/${counterChunks.length})`,
        subtitle:
          index === 0
            ? 'One answer per tracked target: the first published counter, why it works, and how many exist.'
            : undefined,
        blocks: [
          {
            kind: 'table',
            tone: 'purple',
            columns: [
              { label: 'Target lane', align: 'left' },
              { label: 'First published counter', align: 'left' },
              { label: 'Why it works', align: 'left' },
              { label: 'Answers' },
            ],
            rows: chunk,
            note:
              index === 0
                ? 'Targets without a published counter are absent from this list rather than shown with an empty answer. ' +
                  'The Atlas shows the full set per target.'
                : `Continues on the next page. ${counterRows.length} tracked targets in total.`,
          },
        ],
      })),
      {
        eyebrow: 'Combo Generator · corpus',
        title: 'The Ranked Corpus',
        subtitle: 'How many lanes exist, which ones normal mode shows, and what a counter claims.',
        blocks: [
          {
            kind: 'callout',
            tone: 'info',
            title: 'How a lane reaches this list',
            body:
              'Lanes are ranked by the community corpus, not by this sheet. The generator filters to the heroes you own, ' +
              'then picks non-overlapping lanes so no hero appears twice. A lane whose skin slot is must-own is hidden ' +
              'until you turn skin mode on; a recommended skin never hides a lane.',
          },
          {
            kind: 'stats',
            columns: 4,
            items: [
              { label: 'Ranked lanes', value: ranked.length, hint: 'whole corpus' },
              {
                label: 'Visible in normal mode',
                value: normalMode.length,
                hint: `${ranked.length - normalMode.length} need a must-own skin`,
              },
              {
                label: 'Must-own skin lanes',
                value: lanesWithMustSkins,
                hint: 'hidden unless skin mode is on',
              },
              {
                label: 'Counter matchups',
                value: matchups.length,
                hint: 'targets with published answers',
              },
            ],
          },
          {
            kind: 'cards',
            columns: 2,
            items: [
              {
                pillText: 'Answer',
                pillTone: 'purple',
                title: 'What counts as a counter',
                body:
                  '<p class="sh-subtitle">A counter is a lane the community records as beating a target, with the ' +
                  'observation behind it. Confidence is published only where a source stated one; unknown stays unknown.</p>',
              },
              {
                pillText: 'Not a rule',
                pillTone: 'neutral',
                title: 'Read it as evidence, not a guarantee',
                body:
                  '<p class="sh-subtitle">Lane strength depends on research, equipment and troops. A counter on this ' +
                  'sheet is a starting point the Atlas can expand, not a promise about your own lineup.</p>',
              },
            ],
          },
        ],
      },
    ],
  };
}
