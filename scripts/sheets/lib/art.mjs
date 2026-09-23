// Focal illustrations (plan §2): one per sheet, drawn as inline SVG.
//
// Inline SVG keeps the sheet offline (no image request), vector in the PDF, and a
// few kilobytes instead of a megabyte. Each illustration is deliberately abstract —
// a motif for the sheet's subject, not a copy of game art — and shares the gold /
// teal / purple accents so a page reads as one family.

const GOLD = '#f2b23c';
const TEAL = '#35d6c4';
const PURPLE = '#a98bfa';
const CYAN = '#7dd3fc';

function wrap(inner, { viewBox = '0 0 120 34' } = {}) {
  return `<svg viewBox="${viewBox}" preserveAspectRatio="xMidYMid slice" role="presentation" focusable="false">${inner}</svg>`;
}

function defs() {
  return `<defs>
    <linearGradient id="shg-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${GOLD}" stop-opacity=".55"/>
      <stop offset="1" stop-color="${GOLD}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="shg-teal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${TEAL}" stop-opacity=".45"/>
      <stop offset="1" stop-color="${TEAL}" stop-opacity="0"/>
    </linearGradient>
  </defs>`;
}

/** Specialization: a tower column with its four research branches. */
export function specializationArt() {
  const columns = [18, 42, 66, 90]
    .map((x, index) => {
      const heights = [15, 19, 23, 27];
      const height = heights[index];
      return `<g opacity="${0.5 + index * 0.16}">
      <rect x="${x}" y="${34 - height}" width="9" height="${height}" rx="1.6"
        fill="url(#shg-gold)" stroke="${GOLD}" stroke-opacity=".7" stroke-width=".4"/>
      <circle cx="${x + 4.5}" cy="${34 - height - 2.6}" r="1.5" fill="${GOLD}"/>
    </g>`;
    })
    .join('');
  return wrap(`${defs()}
    <circle cx="60" cy="16" r="26" fill="${TEAL}" fill-opacity=".05"/>
    <circle cx="60" cy="16" r="17" fill="${TEAL}" fill-opacity=".05"/>
    ${columns}
    <path d="M2 33.4h116" stroke="${TEAL}" stroke-opacity=".35" stroke-width=".5"/>
    <g fill="${TEAL}" opacity=".85">
      <circle cx="22.5" cy="8" r="1.1"/><circle cx="46.5" cy="6" r="1.1"/>
      <circle cx="70.5" cy="4" r="1.1"/><circle cx="94.5" cy="2.4" r="1.1"/>
    </g>
    <path d="M22.5 8 46.5 6 70.5 4 94.5 2.4" stroke="${TEAL}" stroke-opacity=".5" stroke-width=".6" fill="none"/>`);
}

/** Combos: three linked hero crests over crossed blades. */
export function combosArt() {
  const crest = (cx, accent) => `<g>
    <path d="M${cx} 6 l8 3.4v7.2c0 4.6-3.4 7.8-8 9.4-4.6-1.6-8-4.8-8-9.4V9.4L${cx} 6Z"
      fill="${accent}" fill-opacity=".14" stroke="${accent}" stroke-width=".8"/>
    <circle cx="${cx}" cy="14.4" r="2.4" fill="${accent}" fill-opacity=".8"/>
    <path d="M${cx - 3.6} 21.6c.7-2.4 1.9-3.6 3.6-3.6s2.9 1.2 3.6 3.6" stroke="${accent}"
      stroke-width=".8" fill="none"/>
  </g>`;
  return wrap(`${defs()}
    <path d="M8 30 46 4M112 30 74 4" stroke="${GOLD}" stroke-opacity=".28" stroke-width="1"/>
    ${crest(30, TEAL)}
    ${crest(60, GOLD)}
    ${crest(90, PURPLE)}
    <path d="M38 16h14M68 16h14" stroke="${CYAN}" stroke-opacity=".45" stroke-width=".7"/>
    <path d="M2 33.4h116" stroke="${GOLD}" stroke-opacity=".3" stroke-width=".5"/>`);
}

/** Reference catalogue: stacked sheet cards. */
export function catalogueArt() {
  const sheet = (x, y, rotate) => `<g transform="rotate(${rotate} ${x + 13} ${y + 9})">
    <rect x="${x}" y="${y}" width="26" height="18" rx="2" fill="#0d1a30" stroke="${GOLD}"
      stroke-opacity=".55" stroke-width=".6"/>
    <rect x="${x + 3}" y="${y + 3}" width="12" height="1.6" rx=".8" fill="${GOLD}" fill-opacity=".8"/>
    <rect x="${x + 3}" y="${y + 6.4}" width="18" height="1.2" rx=".6" fill="${CYAN}" fill-opacity=".5"/>
    <rect x="${x + 3}" y="${y + 9}" width="15" height="1.2" rx=".6" fill="${CYAN}" fill-opacity=".35"/>
    <rect x="${x + 3}" y="${y + 11.6}" width="17" height="1.2" rx=".6" fill="${CYAN}" fill-opacity=".25"/>
  </g>`;
  return wrap(`${defs()}
    ${sheet(12, 10, -6)}
    ${sheet(46, 6, 0)}
    ${sheet(80, 10, 6)}
    <path d="M2 33.4h116" stroke="${PURPLE}" stroke-opacity=".3" stroke-width=".5"/>`);
}

/** Maps: a simplified tile field with marked sites. */
export function mapArt() {
  const tiles = [];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 12; column += 1) {
      const x = 6 + column * 9.4 + (row % 2 ? 4.7 : 0);
      const y = 8 + row * 9;
      tiles.push(
        `<path d="M${x} ${y}l4.6-2.7 4.6 2.7v5.4L${x} ${y + 5.4}Z" fill="${TEAL}" fill-opacity="${
          0.06 + ((row + column) % 3) * 0.05
        }" stroke="${TEAL}" stroke-opacity=".28" stroke-width=".4"/>`
      );
    }
  }
  return wrap(`${defs()}
    ${tiles.join('')}
    <g fill="${GOLD}">
      <circle cx="40" cy="17" r="2.2"/><circle cx="82" cy="12" r="1.8"/>
    </g>
    <path d="M40 17 82 12" stroke="${GOLD}" stroke-opacity=".6" stroke-dasharray="2 1.4" stroke-width=".7"/>
    <path d="M2 33.4h116" stroke="${GOLD}" stroke-opacity=".3" stroke-width=".5"/>`);
}

export const SHEET_ART = Object.freeze({
  specialization: specializationArt,
  combos: combosArt,
  catalogue: catalogueArt,
  map: mapArt,
});

export function artFor(name) {
  const factory = SHEET_ART[name];
  return factory ? factory() : '';
}
