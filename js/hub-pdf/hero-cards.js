// Presentation only: all names, positions and scores come from the document rows.
export function assetUrl(value, base) {
  try {
    const url = new URL(value, base);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

// A roster thumbnail: the hero portrait when the data has one, an initial when it does not.
export function thumbnailCell(value, label, base, escape) {
  const src = assetUrl(value, base);
  const initial = escape(String(label ?? '').trim().slice(0, 1).toUpperCase());
  return `<td class="thumb" data-thumb><span class="thumb-frame">${
    src
      ? `<img src="${escape(src)}" alt="" loading="eager" referrerpolicy="no-referrer">`
      : `<span class="thumb-fallback" aria-hidden="true">${initial}</span>`
  }</span></td>`;
}

// Values are emitted in the table's column order so a designed sheet carries the
// same cells, in the same order, as the plain document.
export function renderComboCards(block, { escape, cell, assetBase }) {
  if (!block.rows.length) return '';
  const tone = ['archer', 'footman', 'cavalry', 'universal', 'mixed'].includes(block.troop)
    ? block.troop
    : 'mixed';
  return `<div class="combo-grid troop-${tone}">${block.rows
    .map((row, index) => {
      const portraits = block.portraits?.[index] || [];
      const figure = (position) => {
        const src = assetUrl(portraits[position - 1], assetBase);
        const label = String(row[position] ?? '').trim();
        return `<figure class="combo-hero"><span class="position-label">${escape(block.columns[position].label)}</span><div class="portrait"><span class="portrait-fallback" aria-hidden="true">${escape(label.slice(0, 1).toUpperCase())}</span>${src ? `<img src="${escape(src)}" alt="" loading="eager" referrerpolicy="no-referrer">` : ''}</div><figcaption data-cell>${cell(row[position])}</figcaption></figure>`;
      };
      const meta = (index2, className = '') => {
        const column = block.columns[index2];
        if (!column) return '';
        return `<div class="${className}"><dt>${escape(column.label)}</dt><dd data-cell>${cell(row[index2])}</dd></div>`;
      };
      return `<article class="combo-card"><header class="combo-rank"><span class="rank-badge"><i>${escape(block.columns[0].label)}</i><b data-cell>${cell(row[0])}</b></span></header><div class="combo-lineup">${[1, 2, 3].map(figure).join('')}</div><dl class="combo-meta">${meta(4, 'meta-score')}${meta(5)}${meta(6)}</dl></article>`;
    })
    .join('')}</div>`;
}
