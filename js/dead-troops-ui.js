import {
  DEAD_TROOP_CLASSES,
  DEAD_TROOP_COUNT_KEYS,
  DEAD_TROOP_UNITS,
  DEAD_TROOP_VARIANTS,
  convertDeadTroopCountUnit,
  deadTroopActualCount,
  deadTroopCountKey,
  deadTroopRowPower,
  deadTroopsTotalPower,
  normalizeDeadTroopCounts,
} from './dead-troops.js';

const CLASS_LABELS = Object.freeze({
  cavalry: 'deadTroopsClassCavalry',
  footmen: 'deadTroopsClassFootmen',
  archers: 'deadTroopsClassArchers',
});
const VARIANT_LABELS = Object.freeze({
  lofty: 'deadTroopsVariantLofty',
  t10e: 'deadTroopsVariantT10E',
  t10: 'deadTroopsVariantT10',
  t9e: 'deadTroopsVariantT9E',
  t9: 'deadTroopsVariantT9',
});
const CLASS_GLYPHS = Object.freeze({
  cavalry:
    '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 5v15a8 8 0 0 0 16 0V5l-4 2v13a4 4 0 0 1-8 0V7z"/><path d="M8 11h4m8 0h4M8 17h4m8 0h4"/></svg>',
  footmen:
    '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3l3 4-1 13-2 3-2-3-1-13zM8 21h16M16 23v6m-3 0h6"/></svg>',
  archers:
    '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="6"/><circle cx="16" cy="16" r="1.5"/><path d="M16 2v5m0 18v5M2 16h5m18 0h5"/></svg>',
});

function element(documentRef, tag, className = '', text) {
  const node = documentRef.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function badgeText(variant) {
  return variant === 'lofty' ? 'T11' : variant.startsWith('t10') ? 'T10' : 'T9';
}

function displayCounts(state) {
  return Object.fromEntries(
    DEAD_TROOP_CLASSES.flatMap((className) =>
      DEAD_TROOP_VARIANTS.map((variant) => [
        deadTroopCountKey(className, variant),
        deadTroopActualCount(state.counts.get(`${className}:${variant}`) ?? '', state.unit),
      ])
    )
  );
}

/** One DOM contract for the registration baseline and the final score review. */
export function createDeadTroopsEditor(
  mount,
  { i18n, state, idPrefix = 'deadTroops', getBaseValues = () => ({}) } = {}
) {
  const documentRef = mount?.ownerDocument || globalThis.document;
  const editorState = state || {
    enabled: false,
    unit: 'troops',
    activeClass: 'footmen',
    counts: new Map(),
  };
  let grid = null;
  let total = null;
  let preview = null;

  const text = (key, values) => i18n.text(key, values);
  const number = (value) => i18n.formatNumber(value);
  const currentPower = () => {
    if (!editorState.enabled) return 0;
    return deadTroopsTotalPower(
      DEAD_TROOP_CLASSES.flatMap((className) =>
        DEAD_TROOP_VARIANTS.map((variant) => ({
          variant,
          count: editorState.counts.get(`${className}:${variant}`) ?? '',
        }))
      ),
      editorState.unit
    );
  };

  function refresh() {
    if (!grid) return currentPower();
    grid.hidden = !editorState.enabled;
    const sum = currentPower();
    for (const readout of grid.querySelectorAll('[data-dead-troop-power]')) {
      const [className, variant] = readout.dataset.deadTroopPower.split(':');
      const value = editorState.counts.get(`${className}:${variant}`) ?? '';
      const power = deadTroopRowPower(value, { variant, unit: editorState.unit });
      const troops = deadTroopActualCount(value, editorState.unit);
      readout.textContent = troops
        ? text('deadTroopsRowReadout', {
            troops: number(troops),
            power: number(power),
          })
        : '';
    }
    for (const className of DEAD_TROOP_CLASSES) {
      const filled = DEAD_TROOP_VARIANTS.filter(
        (variant) =>
          deadTroopActualCount(
            editorState.counts.get(`${className}:${variant}`),
            editorState.unit
          ) > 0
      ).length;
      const count = grid.querySelector(`[data-dead-troop-class-count="${className}"]`);
      if (count) count.textContent = `${filled}/${DEAD_TROOP_VARIANTS.length}`;
    }
    if (total) total.textContent = number(sum);
    if (preview) {
      const base = getBaseValues() || {};
      preview.textContent = text('deadTroopsPreview', {
        troop: number((Number(base.troopPower) || 0) + sum),
        total: number((Number(base.totalCastlePower) || 0) + sum),
      });
    }
    return sum;
  }

  function render() {
    if (!mount || !documentRef || !i18n) return;
    void import('../css/dead-troops.css');
    mount.replaceChildren();

    const box = element(documentRef, 'fieldset', 'vts-score-dead-troops__box');
    box.append(element(documentRef, 'legend', '', text('deadTroopsTitle')));
    const toggle = element(documentRef, 'label', 'vts-score-dead-troops__toggle');
    const toggleInput = documentRef.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = editorState.enabled;
    toggleInput.dataset.deadTroopToggle = '';
    toggle.append(toggleInput, element(documentRef, 'span', '', text('deadTroopsToggle')));
    box.append(toggle);

    grid = element(documentRef, 'div', 'vts-score-dead-troops__grid');
    grid.hidden = !editorState.enabled;
    const unitRow = element(documentRef, 'div', 'vts-score-dead-troops__unit');
    unitRow.append(
      element(
        documentRef,
        'span',
        'vts-score-dead-troops__unit-label',
        text('deadTroopsUnitLabel')
      )
    );
    for (const unit of DEAD_TROOP_UNITS) {
      const option = element(documentRef, 'label', 'vts-score-dead-troops__unit-option');
      const radio = documentRef.createElement('input');
      radio.type = 'radio';
      radio.name = `${idPrefix}Unit`;
      radio.value = unit;
      radio.checked = editorState.unit === unit;
      radio.addEventListener('change', () => {
        for (const [key, count] of editorState.counts) {
          editorState.counts.set(key, convertDeadTroopCountUnit(count, editorState.unit, unit));
        }
        editorState.unit = unit;
        for (const input of grid.querySelectorAll('[data-dead-troop-count]')) {
          input.value = editorState.counts.get(input.dataset.deadTroopCount) ?? '';
        }
        for (const suffix of grid.querySelectorAll('[data-dead-troop-unit]')) {
          suffix.textContent = unit === 'troops' ? '' : unit === 'millions' ? 'M' : 'K';
        }
        refresh();
      });
      const unitKey =
        unit === 'troops'
          ? 'deadTroopsExact'
          : unit === 'millions'
            ? 'deadTroopsMillions'
            : 'deadTroopsThousands';
      option.append(radio, element(documentRef, 'span', '', text(unitKey)));
      unitRow.append(option);
    }
    grid.append(unitRow);

    const tabs = element(documentRef, 'div', 'vts-score-dead-troops__tabs');
    const panels = element(documentRef, 'div', 'vts-score-dead-troops__panels');
    for (const className of DEAD_TROOP_CLASSES) {
      const tab = element(documentRef, 'button', 'vts-score-dead-troops__tab');
      tab.type = 'button';
      tab.dataset.deadTroopTab = className;
      tab.setAttribute('aria-pressed', String(editorState.activeClass === className));
      const glyph = element(documentRef, 'span', 'vts-score-dead-troops__glyph');
      glyph.innerHTML = CLASS_GLYPHS[className];
      tab.append(glyph, element(documentRef, 'span', '', text(CLASS_LABELS[className])));
      const classCount = element(documentRef, 'small', 'vts-score-dead-troops__tab-count');
      classCount.dataset.deadTroopClassCount = className;
      tab.append(classCount);
      tabs.append(tab);

      const panel = element(documentRef, 'div', 'vts-score-dead-troops__panel');
      panel.dataset.deadTroopPanel = className;
      panel.hidden = editorState.activeClass !== className;
      for (const variant of DEAD_TROOP_VARIANTS) {
        const cell = element(documentRef, 'div', 'vts-score-dead-troops__cell');
        cell.dataset.deadTroopCell = '';
        const inputId = `${idPrefix}-${className}-${variant}`;
        const label = element(documentRef, 'label', 'vts-score-dead-troops__cell-label');
        label.htmlFor = inputId;
        label.append(
          element(
            documentRef,
            'span',
            `vts-score-dead-troops__badge${variant.includes('e') ? ' is-enhanced' : ''}`,
            badgeText(variant)
          ),
          element(documentRef, 'span', 'vts-score-dead-troops__variant', text(VARIANT_LABELS[variant]))
        );
        const entry = element(documentRef, 'div', 'vts-score-dead-troops__entry');
        const input = documentRef.createElement('input');
        input.id = inputId;
        input.type = 'number';
        input.min = '0';
        input.max = '1000000000000';
        input.step = 'any';
        input.inputMode = 'decimal';
        input.autocomplete = 'off';
        input.placeholder = '0';
        input.dataset.deadTroopCount = `${className}:${variant}`;
        input.value = editorState.counts.get(`${className}:${variant}`) ?? '';
        input.addEventListener('input', () => {
          editorState.counts.set(`${className}:${variant}`, input.value);
          refresh();
        });
        const suffix = element(
          documentRef,
          'span',
          'vts-score-dead-troops__suffix',
          editorState.unit === 'troops' ? '' : editorState.unit === 'millions' ? 'M' : 'K'
        );
        suffix.dataset.deadTroopUnit = '';
        entry.append(input, suffix);
        const readout = element(documentRef, 'small', 'vts-score-dead-troops__row-power');
        readout.dataset.deadTroopPower = `${className}:${variant}`;
        cell.append(label, entry, readout);
        panel.append(cell);
      }
      tab.addEventListener('click', () => {
        editorState.activeClass = className;
        for (const button of tabs.children) {
          button.setAttribute('aria-pressed', String(button === tab));
        }
        for (const item of panels.children) item.hidden = item !== panel;
      });
      panels.append(panel);
    }
    grid.append(tabs, panels);

    const summary = element(documentRef, 'div', 'vts-score-dead-troops__summary');
    summary.append(element(documentRef, 'span', '', text('deadTroopsPowerBack')));
    total = element(documentRef, 'strong', 'vts-score-dead-troops__total');
    summary.append(total);
    preview = element(documentRef, 'p', 'vts-score-dead-troops__preview');
    grid.append(summary, preview);
    box.append(grid);
    mount.append(box);

    toggleInput.addEventListener('change', () => {
      editorState.enabled = toggleInput.checked;
      refresh();
    });
    mount.hidden = false;
    refresh();
  }

  function getActualCounts() {
    const values = editorState.enabled
      ? displayCounts(editorState)
      : Object.fromEntries(DEAD_TROOP_COUNT_KEYS.map((key) => [key, 0]));
    return normalizeDeadTroopCounts(values);
  }

  function setActualCounts(counts) {
    const normalized = normalizeDeadTroopCounts(counts);
    if (!normalized) return false;
    for (const className of DEAD_TROOP_CLASSES) {
      for (const variant of DEAD_TROOP_VARIANTS) {
        const field = deadTroopCountKey(className, variant);
        editorState.counts.set(
          `${className}:${variant}`,
          normalized[field] === 0 ? '' : String(normalized[field])
        );
      }
    }
    editorState.unit = 'troops';
    editorState.enabled = Object.values(normalized).some((count) => count > 0);
    render();
    return true;
  }

  return Object.freeze({
    render,
    refresh,
    getPower: currentPower,
    getActualCounts,
    setActualCounts,
  });
}
