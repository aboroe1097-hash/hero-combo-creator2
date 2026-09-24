// Print-only Heroes themes. Data, ranking and filtering stay in heroes.js.
export const HERO_DESIGNS = Object.freeze(['dashboard', 'midnight', 'reference']);

export function heroSectionClass(section) {
  const tables = [...(section.blocks || []), ...(section.subsections || []).flatMap((sub) => sub.blocks || [])]
    .filter((block) => block.type === 'table');
  const rows = tables.reduce((count, table) => count + table.rows.length, 0);
  // Wide/long tables need the whole page. Small sections can share two columns.
  if (section.role === 'roster') return ' span-wide roster-summary';
  if (section.role === 'combos') return ' span-wide combo-section';
  if (tables.some((table) => table.columns.length >= 7) || rows > 16) return ' span-wide';
  return ' compact-section';
}

export function heroDesignStyles(design, settings) {
  const palette = {
    dashboard: ['#101923', '#192837', '#63dddc', '#aec3d3'],
    midnight: ['#10172b', '#1b2641', '#f4cf83', '#bec8df'],
    reference: ['#171c23', '#242d38', '#c4d6e8', '#b8c5d4'],
  }[design];
  if (!palette) return '';
  const [background, surface, accent, muted] = palette;
  const landscape = settings.orientation === 'landscape';
  return `
@page { margin: 8mm 9mm 12mm; background: ${background};
  @bottom-left { color: ${muted}; }
  @bottom-right { color: ${muted}; }
}
html, body { background: ${background}; color: #f2f5fa; }
body { font: 9pt/1.3 var(--sans); }
main { max-width: none; }
header.title-block { position: relative; border: .7pt solid #455263; border-inline-start: 4pt solid ${accent};
  padding: 7pt 10pt; margin-bottom: 6pt; background: linear-gradient(115deg, ${surface}, ${background} 70%); }
.brand-lockup { display: flex; align-items: center; gap: 6pt; margin-bottom: 3pt; }
.brand-crest { width: 26pt; height: 26pt; object-fit: contain; }
.brand-wordmark { font: 800 17pt/1 var(--sans); letter-spacing: .08em; color: #f3d393; }
.brand-wordmark b { font-size: 10pt; font-weight: 500; }
.brand-edition { margin-inline-start: auto; color: ${accent}; border: .5pt solid ${accent}; padding: 3pt 5pt; font: 8pt/1.2 var(--sans); }
.site { color: ${accent}; font-size: 7.5pt; letter-spacing: .1em; margin-bottom: 2pt; }
h1 { font-size: ${design === 'midnight' ? 21 : 18}pt; margin: 1pt 0 2pt; letter-spacing: -.025em; }
.subtitle { color: ${muted}; font: 8.5pt/1.25 var(--sans); margin: 2pt 0 3pt; }
dl.choices { display: flex; flex-wrap: wrap; gap: 2pt 10pt; font: 8pt/1.25 var(--sans); }
dl.choices div { display: flex; gap: 4pt; }
dl.choices dt, dl.defs dt { color: ${muted}; }
dl.choices dd { color: #f2f5fa; }
/* One flow, not CSS columns: Chromium fragments a tall multicol block badly in
   print, which costs a page of white space. Wide sections span anyway. */
.hero-sections { column-count: 1; column-gap: 6mm; }
.hero-sections > .doc-section { margin: 0 0 7pt; }
.hero-sections > .span-wide { column-span: all; }
.compact-section { break-inside: avoid; }
.roster-summary { break-inside: avoid; }
.roster-summary > p { display: inline; }
.roster-summary table.data th, .roster-summary table.data td { padding: 2pt 5pt; }
.hero-subsection { break-inside: avoid; }
.combo-section .hero-subsection { break-inside: auto; }
.hero-subsection:has(.no-rows) { display: flex; align-items: baseline; gap: 8pt; }
.hero-subsection:has(.no-rows) h3 { flex: 1; }
table.no-rows { width: auto; margin: 0; }
table.no-rows thead { display: none; }
table.no-rows td { border: 0; padding: 0; text-align: start; }
h2.section-title { font-size: ${design === 'midnight' ? 13 : 11}pt; color: ${accent};
  background: ${surface}; border: 0; border-inline-start: 3pt solid ${accent}; margin: 7pt 0 4pt; padding: 5pt 7pt; }
h3.sub-title { font-size: 10pt; color: ${accent}; margin: 6pt 0 3pt; }
p { margin-bottom: 4pt; }
table.data, table.data.wide { font: 9pt/1.3 var(--sans); margin: 3pt 0; }
table.data th, table.data td { border-color: #455263; padding: ${design === 'reference' ? '2pt 4pt' : '3pt 5pt'}; }
table.data thead th { background: ${surface}; color: ${accent}; border-top: 0; border-bottom: .7pt solid ${accent}; }
table.data tbody tr:nth-child(even) { background: ${surface}; }
table.data tr.group th { background: ${surface}; color: ${accent}; }
table.data tfoot td { color: ${accent}; border-color: ${accent}; }
table.data .num { white-space: normal; }
table.data td.unknown, table.data td.empty, p.note, p.table-note { color: ${muted}; font-size: 9pt; }
section.sources { column-count: 1; column-gap: 6mm; margin-top: 6pt; }
section.sources h2 { column-span: all; }
section.sources li { color: ${muted}; font-size: 9pt; break-inside: avoid; }
footer.colophon { color: ${muted}; border-color: #455263; margin-top: 7pt; break-inside: avoid; break-before: avoid; page-break-before: avoid; }
.combo-grid { --troop: ${accent}; display: grid; grid-template-columns: repeat(${landscape ? (design === 'reference' ? 5 : 3) : 2}, minmax(0, 1fr)); gap: ${design === 'reference' ? 4 : 6}pt; margin: 4pt 0 7pt; }
.troop-archer { --troop: #82dba5; }
.troop-footman { --troop: #ef9c89; }
.troop-cavalry { --troop: #86c5f4; }
.troop-universal, .troop-mixed { --troop: #f3cf80; }
.combo-card { min-width: 0; border: .6pt solid #455263; border-top: 2pt solid var(--troop); background: ${surface}; break-inside: avoid; page-break-inside: avoid; }
.combo-rank { display: flex; align-items: center; gap: 4pt; padding: 3pt 5pt 2pt; color: ${muted}; font-size: 9pt; }
.rank-badge { display: inline-flex; align-items: baseline; gap: 4pt; }
.rank-badge i { font-style: normal; font-size: 8pt; text-transform: uppercase; letter-spacing: .09em; }
.rank-badge b { color: var(--troop); font: 800 17pt/1 var(--sans); }
.combo-lineup { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2pt; padding: 0 4pt; direction: ltr; }
.combo-hero { margin: 0; min-width: 0; text-align: center; }
.position-label { display: block; font-size: 8pt; color: ${muted}; margin-bottom: 2pt; overflow-wrap: anywhere; }
.portrait { position: relative; height: ${design === 'midnight' ? 64 : design === 'reference' ? 38 : 58}pt; background: linear-gradient(145deg, #334054, #101521); border: .5pt solid var(--troop); }
.portrait-fallback { position: absolute; inset: 0; display: grid; place-items: center; color: var(--troop); font: 700 22pt/1 var(--serif); }
.portrait img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 18%; }
.combo-hero figcaption { font: 600 9pt/1.2 var(--sans); padding: 3pt 0; overflow-wrap: anywhere; }
.combo-meta { margin: 0; padding: 3pt 5pt; border-top: .5pt solid #455263; font: 9pt/1.25 var(--sans); }
.combo-meta .meta-score dd { color: var(--troop); font: 800 12pt/1.1 var(--sans); }
table.data th.thumb-head { width: 1pt; padding: 0; border: 0; background: transparent; }
table.data td.thumb { width: 1pt; padding: 1pt 4pt 1pt 3pt; border-bottom-color: #455263; }
table.data tbody tr:nth-child(even) td.thumb { background: transparent; }
.thumb-frame { display: block; width: 22pt; height: 22pt; overflow: hidden; background: linear-gradient(145deg, #334054, #101521); border: .5pt solid #455263; }
.thumb-frame img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: center 16%; }
.thumb-fallback { display: grid; place-items: center; height: 100%; color: ${muted}; font: 700 10pt/1 var(--serif); }
.combo-meta div { display: flex; flex-wrap: wrap; gap: 3pt; }
.combo-meta dt { color: ${muted}; }
.combo-meta dd { margin: 0; overflow-wrap: anywhere; }
.combo-section .hero-subsection:has(.troop-archer) h3 { color: #82dba5; }
.combo-section .hero-subsection:has(.troop-footman) h3 { color: #ef9c89; }
.combo-section .hero-subsection:has(.troop-cavalry) h3 { color: #86c5f4; }
${design === 'midnight' ? `h1 { font-family: var(--serif); font-weight: 700; } header.title-block { border-top: 2pt solid #f4cf83; } .brand-wordmark { letter-spacing: .15em; } .portrait { border-radius: 10pt 10pt 0 0; overflow: hidden; }` : ''}
${design === 'reference' ? `.brand-lockup { float: inline-end; margin-inline-start: 10pt; } .brand-edition { display: none; } .brand-crest { width: 25pt; height: 25pt; } h1 { font-size: 19pt; } header.title-block { padding: 7pt 9pt; } .combo-card { background: transparent; } .combo-rank { background: ${surface}; }` : ''}
@media screen {
  body { background: #090e16; }
  main { width: ${landscape ? (settings.paper === 'letter' ? '279.4' : '297') : settings.paper === 'letter' ? '215.9' : '210'}mm;
    max-width: 100%; padding: 8mm 9mm 12mm; background: ${background}; margin: 16px auto; }
  .screen-only { background: ${surface}; color: #f2f5fa; }
  .screen-only button { background: ${accent}; color: ${background}; }
}
@media screen and (max-width: 700px) { .hero-sections, section.sources { column-count: 1; } }
@media print { main { padding: 0; margin: 0; } }
`;
}
