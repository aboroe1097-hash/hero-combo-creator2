// Shared batch selection for the VTS Admin lists.
//
// A list renders its cards or rows as usual, then mounts this on its host with
// the items it just drew. Each item gets a checkbox in its slot, and a sticky
// bar above the list shows how many are selected, Select all / Clear and the
// list's own actions. Listeners are delegated on the host and bound once, so a
// re-render only re-mounts the markup. The selection survives a re-render (for
// example a pager click) and forgets ids that are no longer on screen.

const selections = new Map();
const hostConfigs = new WeakMap();

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]
  );
}

function selectionFor(scope) {
  let set = selections.get(scope);
  if (!set) {
    set = new Set();
    selections.set(scope, set);
  }
  return set;
}

export function getBulkSelection(scope) {
  return Array.from(selections.get(scope) || []);
}

export function clearBulkSelection(scope) {
  selections.get(scope)?.clear();
}

function refreshBar(host) {
  const config = hostConfigs.get(host);
  if (!config) return;
  const set = selectionFor(config.scope);
  const count = set.size;
  const bar = host.querySelector(':scope > [data-bulk-bar]');
  if (!bar) return;
  const countEl = bar.querySelector('[data-bulk-count]');
  if (countEl) countEl.textContent = config.t('adminBulkSelectedCount', { count });
  bar.dataset.active = count ? '1' : '0';
  bar.querySelectorAll('[data-bulk-action]').forEach((button) => {
    const action = config.actions.find((item) => item.id === button.dataset.bulkAction);
    button.disabled = count < (action?.min || 1);
  });
  const clear = bar.querySelector('[data-bulk-cmd="clear"]');
  if (clear) clear.disabled = count === 0;
  host.querySelectorAll('[data-bulk-item]').forEach((input) => {
    input.checked = set.has(input.dataset.bulkItem);
  });
}

function bindHost(host) {
  if (host.dataset.bulkSelectBound === '1') return;
  host.dataset.bulkSelectBound = '1';
  host.addEventListener('change', (event) => {
    const input = event.target.closest?.('[data-bulk-item]');
    const config = hostConfigs.get(host);
    if (!input || !config) return;
    const set = selectionFor(config.scope);
    if (input.checked) set.add(input.dataset.bulkItem);
    else set.delete(input.dataset.bulkItem);
    refreshBar(host);
  });
  host.addEventListener('click', async (event) => {
    const button = event.target.closest?.('[data-bulk-cmd], [data-bulk-action]');
    const config = hostConfigs.get(host);
    if (!button || !config || button.disabled || !host.contains(button)) return;
    const set = selectionFor(config.scope);
    if (button.dataset.bulkCmd === 'all') {
      config.items.forEach((item) => set.add(item.id));
      refreshBar(host);
      return;
    }
    if (button.dataset.bulkCmd === 'clear') {
      set.clear();
      refreshBar(host);
      return;
    }
    const action = config.actions.find((item) => item.id === button.dataset.bulkAction);
    if (!action) return;
    const ids = Array.from(set);
    if (ids.length < (action.min || 1)) return;
    button.disabled = true;
    try {
      const done = await action.run(ids);
      // An action that finished (did not cancel) clears the selection; the list
      // normally re-renders itself, which re-mounts a fresh bar.
      if (done !== false) set.clear();
    } finally {
      button.disabled = false;
      refreshBar(host);
    }
  });
}

/**
 * Mount checkboxes and the bulk bar on a freshly rendered list.
 * @param {HTMLElement} host   The list container (its content was just rendered).
 * @param {object} options
 * @param {string} options.scope  Selection key, stable across re-renders.
 * @param {{id: string, slot: Element, label?: string}[]} options.items
 * @param {{id: string, label: string, danger?: boolean, min?: number,
 *   run: (ids: string[]) => unknown}[]} options.actions  `run` may return false
 *   (or a promise of false) when the operator cancelled.
 * @param {(key: string, vars?: object) => string} options.t  Translator.
 */
export function mountBulkSelect(host, { scope, items = [], actions = [], t }) {
  if (!host || !scope) return;
  const present = items.filter((item) => item && item.id && item.slot);
  const set = selectionFor(scope);
  const ids = new Set(present.map((item) => item.id));
  Array.from(set).forEach((id) => {
    if (!ids.has(id)) set.delete(id);
  });
  host.querySelector(':scope > [data-bulk-bar]')?.remove();
  if (!present.length) {
    hostConfigs.delete(host);
    return;
  }
  const translate = typeof t === 'function' ? t : (key) => key;
  hostConfigs.set(host, { scope, items: present, actions, t: translate });
  present.forEach((item) => {
    if (item.slot.querySelector(':scope > .admin-bulk-check')) return;
    const label = document.createElement('label');
    label.className = 'admin-bulk-check';
    label.innerHTML = `<input type="checkbox" data-bulk-item="${escapeHtml(item.id)}" aria-label="${escapeHtml(translate('adminBulkSelectItem', { item: item.label || item.id }))}">`;
    item.slot.prepend(label);
  });
  const bar = document.createElement('div');
  bar.className = 'admin-bulk-bar';
  bar.dataset.bulkBar = '';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', translate('adminBulkToolbar'));
  bar.innerHTML = `<span class="admin-bulk-count" data-bulk-count aria-live="polite"></span>
    <button type="button" class="dash-btn dash-btn-xs" data-bulk-cmd="all">${escapeHtml(translate('adminBulkSelectAll'))}</button>
    <button type="button" class="dash-btn dash-btn-xs" data-bulk-cmd="clear">${escapeHtml(translate('adminBulkClear'))}</button>
    ${actions
      .map(
        (action) =>
          `<button type="button" class="dash-btn dash-btn-xs${action.danger ? ' dash-btn-danger' : ''}" data-bulk-action="${escapeHtml(action.id)}">${escapeHtml(action.label)}</button>`
      )
      .join('')}`;
  host.prepend(bar);
  bindHost(host);
  refreshBar(host);
}
