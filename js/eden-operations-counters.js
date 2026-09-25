// The Eden Operations Lab staffing counters' markup.
//
// Kept pure and dependency-free: the caller passes the copy helper, the number
// formatter and the escaper, so the read-only and the admin renderings can be
// compared in a unit test without a DOM. The counters themselves are shared
// alliance state (see eden-operations-cloud.js); this module only draws them.

/** One counter: label, the numbers, and the buttons only an admin gets. */
export function counterRowHtml({
  side,
  label,
  value,
  required,
  canWrite,
  formatNumber,
  escapeHtml,
}) {
  const progress = required ? Math.min(100, (value / required) * 100) : 100;
  const output = `<output aria-live="polite"><strong>${formatNumber(value)}</strong> / ${formatNumber(required)}</output>`;
  // A viewer without the admin claim still reads the alliance's numbers, but
  // there is nothing to press: no button is rendered at all.
  const controls = canWrite
    ? `<button type="button" data-ops-count="${side}:-1" aria-label="${escapeHtml(`− ${label}`)}"${value <= 0 ? ' disabled' : ''}>−</button>${output}<button type="button" data-ops-count="${side}:1" aria-label="${escapeHtml(`+ ${label}`)}">+</button>`
    : output;
  const className = `eden-ops-counter${value >= required ? ' is-met' : ''}${canWrite ? '' : ' is-readonly'}`;
  const controlClass = `eden-ops-counter-controls${canWrite ? '' : ' eden-ops-counter-controls--readonly'}`;
  return `<div class="${className}"><span>${escapeHtml(label)}</span><div class="${controlClass}">${controls}</div><i class="eden-ops-counter-track" style="--progress:${progress}%"><b></b></i></div>`;
}

/** The staffing block: both counters, the shortfall line, and the read-only note. */
export function staffingSectionHtml({
  staffing,
  siege,
  canWrite = false,
  text,
  formatNumber,
  escapeHtml,
}) {
  const row = (side, value, required) =>
    counterRowHtml({
      side,
      label: text(side),
      value,
      required,
      canWrite,
      formatNumber,
      escapeHtml,
    });
  const shortfall = staffing.ready
    ? ''
    : `<p class="eden-ops-staff-status">${text('staffMissing', { count: formatNumber(staffing.missing) })}</p>`;
  const note = canWrite ? '' : `<p class="eden-ops-staff-note">${text('countsReadOnly')}</p>`;
  return `<section class="eden-ops-staffing" aria-label="${escapeHtml(text('assigned'))}"><h5>${text('assigned')}${staffing.ready ? ' <span class="eden-ops-staff-ok">✓</span>' : ''}</h5>${row('attackers', staffing.attackers, siege.attackers)}${row('support', staffing.support, siege.support)}${shortfall}${note}</section>`;
}
