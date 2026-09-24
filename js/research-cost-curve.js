/**
 * Research node cost curve (16.5.x P2, plan §4.7 "existing-data charts").
 *
 * Draws the canonical per-level medal costs that tech-db already ships for a
 * node as a small inline SVG bar chart, with the same numbers in a table.
 * Bought levels, the next level, and the remaining levels are marked; a level
 * without a recorded cost is shown as unknown, never as zero. No animation,
 * no new data, and no persistence: it re-renders with the node inspector.
 */

const WIDTH = 240;
const HEIGHT = 56;
const GAP = 2;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toCost(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Geometry and totals for one currency series. `values[i]` is the cost of
 * buying level i + 1; `currentLevel` levels are already bought.
 */
export function buildCostCurve(values, currentLevel, { width = WIDTH, height = HEIGHT } = {}) {
  const costs = Array.isArray(values) ? values.map(toCost) : [];
  const count = costs.length;
  const level = Math.max(0, Math.min(count, Math.floor(Number(currentLevel) || 0)));
  const known = costs.filter((cost) => cost !== null);
  const max = known.length ? Math.max(...known) : 0;
  const barWidth = count ? Math.max(1, (width - GAP * (count - 1)) / count) : 0;
  let spent = 0;
  let remaining = 0;
  let unknown = 0;
  const bars = costs.map((value, index) => {
    const done = index < level;
    if (value === null) unknown += 1;
    else if (done) spent += value;
    else remaining += value;
    const barHeight = value === null || max === 0 ? 0 : Math.max(2, (value / max) * height);
    return {
      level: index + 1,
      value,
      state: done ? 'done' : index === level ? 'next' : 'remaining',
      x: Number((index * (barWidth + GAP)).toFixed(2)),
      y: Number((height - barHeight).toFixed(2)),
      width: Number(barWidth.toFixed(2)),
      height: Number(barHeight.toFixed(2)),
    };
  });
  return { bars, max, spent, remaining, unknown, width, height, currentLevel: level };
}

/** True when a series is worth charting: two or more levels and some known cost. */
export function hasCostCurve(values) {
  return Array.isArray(values) && values.length >= 2 && values.some((v) => toCost(v) !== null);
}

/**
 * Inline SVG plus an equivalent table. `series` is [{ key, label, shortLabel, values }].
 * All visible strings come from the caller's localized copy.
 */
export function renderCostCurves(series, currentLevel, copy = {}) {
  const format = typeof copy.formatNumber === 'function' ? copy.formatNumber : (n) => String(n);
  const charted = (Array.isArray(series) ? series : []).filter((item) =>
    hasCostCurve(item?.values)
  );
  if (!charted.length) return '';
  const curves = charted.map((item) => ({
    item,
    curve: buildCostCurve(item.values, currentLevel),
  }));
  const figures = curves
    .map(({ item, curve }) => {
      const caption = copy.caption ? copy.caption(item.label) : item.label;
      const summary = `${caption}: ${copy.completed || ''} ${format(curve.spent)} · ${copy.remaining || ''} ${format(curve.remaining)}`;
      const bars = curve.bars
        .map(
          (bar) =>
            `<rect class="research-cost-curve__bar" data-state="${bar.state}"${bar.value === null ? ' data-unknown="true"' : ''} x="${bar.x}" y="${bar.y}" width="${bar.width}" height="${bar.height}"><title>${escapeHtml(`${copy.levelShort || ''} ${bar.level}: ${bar.value === null ? '—' : format(bar.value)} ${item.shortLabel || ''}`)}</title></rect>`
        )
        .join('');
      return `<figure class="research-cost-curve" data-series="${escapeHtml(item.key)}">
        <figcaption>${escapeHtml(caption)}</figcaption>
        <svg viewBox="0 0 ${curve.width} ${curve.height}" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(summary)}" focusable="false"><line class="research-cost-curve__base" x1="0" y1="${curve.height}" x2="${curve.width}" y2="${curve.height}"></line>${bars}</svg>
        <p class="research-cost-curve__legend"><span data-state="done">${escapeHtml(copy.completed || '')} ${escapeHtml(format(curve.spent))}</span><span data-state="remaining">${escapeHtml(copy.remaining || '')} ${escapeHtml(format(curve.remaining))}</span></p>
      </figure>`;
    })
    .join('');
  const level = curves[0].curve.currentLevel;
  const rows = curves[0].curve.bars
    .map((bar, index) => {
      const cells = curves
        .map(({ curve }) => {
          const value = curve.bars[index]?.value;
          return `<td>${value == null ? '—' : escapeHtml(format(value))}</td>`;
        })
        .join('');
      const done = index < level;
      return `<tr data-state="${bar.state}"><th scope="row">${bar.level}${done ? ` <span aria-hidden="true">✓</span><span class="sr-only">${escapeHtml(copy.completed || '')}</span>` : ''}</th>${cells}</tr>`;
    })
    .join('');
  const head = curves
    .map(
      ({ item }) =>
        `<th scope="col"><abbr title="${escapeHtml(item.label)}">${escapeHtml(item.shortLabel || item.label)}</abbr></th>`
    )
    .join('');
  return `<div class="research-cost-curves">${figures}<details class="research-cost-curve__details"><summary>${escapeHtml(copy.tableSummary || '')}</summary><table><thead><tr><th scope="col">${escapeHtml(copy.levelShort || '')}</th>${head}</tr></thead><tbody>${rows}</tbody></table></details></div>`;
}
