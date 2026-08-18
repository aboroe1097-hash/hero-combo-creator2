import '../css/eden-playbook.css';
import { translations } from './translations.js';
import { currentLanguage } from './state.js';

const WEEKS = Object.freeze([
  {
    id: 'day-0',
    labelKey: 'edenPlaybookDay0Label',
    titleKey: 'edenPlaybookDay0Title',
    tone: 'green',
    whyKey: 'edenPlaybookDay0Why',
    watchKey: 'edenPlaybookDay0Watch',
    visuals: ['day-0-green', 'day-0-blue'],
    taskKeys: [
      'edenPlaybookDay0Task1',
      'edenPlaybookDay0Task2',
      'edenPlaybookDay0Task3',
      'edenPlaybookDay0Task4',
    ],
  },
  {
    id: 'day-1',
    labelKey: 'edenPlaybookDay1Label',
    titleKey: 'edenPlaybookDay1Title',
    tone: 'blue',
    whyKey: 'edenPlaybookDay1Why',
    watchKey: 'edenPlaybookDay1Watch',
    visuals: [3, 4, 5],
    taskKeys: [
      'edenPlaybookDay1Task1',
      'edenPlaybookDay1Task2',
      'edenPlaybookDay1Task3',
      'edenPlaybookDay1Task4',
    ],
  },
  {
    id: 'day-2',
    labelKey: 'edenPlaybookDay2Label',
    titleKey: 'edenPlaybookDay2Title',
    tone: 'gold',
    whyKey: 'edenPlaybookDay2Why',
    watchKey: 'edenPlaybookDay2Watch',
    visuals: [6, 7],
    taskKeys: ['edenPlaybookDay2Task1', 'edenPlaybookDay2Task2', 'edenPlaybookDay2Task3'],
  },
  {
    id: 'week-1',
    labelKey: 'edenPlaybookWeek1Label',
    titleKey: 'edenPlaybookWeek1Title',
    tone: 'purple',
    whyKey: 'edenPlaybookWeek1Why',
    watchKey: 'edenPlaybookWeek1Watch',
    toolLink: {
      href: '#edenHub?subtab=loyalty',
      labelKey: 'edenPlaybookWeek1ToolLabel',
      descriptionKey: 'edenPlaybookWeek1ToolDesc',
    },
    visuals: [8, 9],
    taskKeys: ['edenPlaybookWeek1Task1', 'edenPlaybookWeek1Task2', 'edenPlaybookWeek1Task3'],
  },
  {
    id: 'role',
    labelKey: 'edenPlaybookRoleLabel',
    titleKey: 'edenPlaybookRoleTitle',
    tone: 'red',
    whyKey: 'edenPlaybookRoleWhy',
    watchKey: 'edenPlaybookRoleWatch',
    visuals: [10, 11, 12],
    taskKeys: [
      'edenPlaybookRoleTask1',
      'edenPlaybookRoleTask2',
      'edenPlaybookRoleTask3',
      'edenPlaybookRoleTask4',
    ],
  },
]);

const VISUAL_SIZES = [
  [558, 884],
  [566, 885],
  [555, 884],
  [560, 889],
  [559, 883],
  [945, 2048],
  [555, 296],
  [558, 882],
  [557, 882],
  [558, 890],
  [945, 2048],
];
const VISUALS = Object.freeze(
  VISUAL_SIZES.map(([width, height], index) => ({
    src: `assets/eden/thunder-playbook/visual-${String(index + 2).padStart(2, '0')}.webp`,
    width,
    height,
    altKey: 'edenPlaybookVisualAlt',
    altIndex: index + 2,
  }))
);
const EXTRA_VISUALS = Object.freeze({
  'day-0-green': {
    src: 'assets/eden/thunder-playbook/day-0-green-route.webp',
    width: 725,
    height: 1438,
    altKey: 'edenPlaybookDay0GreenAlt',
    captionKey: 'edenPlaybookDay0GreenCaption',
  },
  'day-0-blue': {
    src: 'assets/eden/thunder-playbook/day-0-blue-fortresses.webp',
    width: 636,
    height: 1562,
    altKey: 'edenPlaybookDay0BlueAlt',
    captionKey: 'edenPlaybookDay0BlueCaption',
  },
});

function copyFor(language) {
  const catalog = translations[language] || translations.en || {};
  const en = translations.en || {};
  return (key, values = {}) => {
    const template = String(catalog[key] ?? en[key] ?? key);
    return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name) =>
      Object.hasOwn(values, name) ? String(values[name]) : match
    );
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function initEdenPlaybook(panel) {
  const root = panel.querySelector('[data-thunder-playbook]');
  if (!root) return;
  let active = new URLSearchParams(location.hash.split('?')[1] || '').get('section') || WEEKS[0].id;
  let view =
    new URLSearchParams(location.hash.split('?')[1] || '').get('view') === 'tips'
      ? 'tips'
      : 'timeline';
  const renderView = () => {
    root.querySelectorAll('[data-playbook-view]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.playbookView === view));
    });
    root.querySelectorAll('[data-playbook-flow]').forEach((flow) => {
      flow.hidden = flow.dataset.playbookFlow !== view;
    });
  };
  const render = () => {
    const t = copyFor(currentLanguage);
    const week = WEEKS.find((entry) => entry.id === active) || WEEKS[0];
    root.querySelector('.thunder-week-nav').innerHTML = WEEKS.map(
      (entry) =>
        `<button type="button" data-week="${entry.id}" aria-pressed="${entry.id === week.id}">${escapeHtml(t(entry.labelKey))}</button>`
    ).join('');
    const images = week.visuals
      .map((visual) =>
        typeof visual === 'number'
          ? { ...VISUALS[visual - 2], alt: t('edenPlaybookVisualAlt', { index: visual }) }
          : {
              ...EXTRA_VISUALS[visual],
              alt: t(EXTRA_VISUALS[visual].altKey),
              caption: t(EXTRA_VISUALS[visual].captionKey),
            }
      )
      .filter(Boolean);
    const toolLink = week.toolLink
      ? `<a class="thunder-tool-link" href="${week.toolLink.href}"><b>${escapeHtml(t(week.toolLink.labelKey))}</b><span>${escapeHtml(t(week.toolLink.descriptionKey))}</span><i aria-hidden="true">→</i></a>`
      : '';
    const captionFallback = t('edenPlaybookVisualCaption', {
      week: t(week.labelKey),
      index: '{index}',
    });
    root.querySelector('.thunder-focus').innerHTML =
      `<article data-tone="${week.tone}" id="playbook-${week.id}"><p>${escapeHtml(t('edenPlaybookFocusKicker'))}</p><h3>${escapeHtml(t(week.titleKey))}</h3><div class="thunder-explain"><div><b>${escapeHtml(t('edenPlaybookWhyTitle'))}</b><span>${escapeHtml(t(week.whyKey))}</span></div><div><b>${escapeHtml(t('edenPlaybookWatchTitle'))}</b><span>${escapeHtml(t(week.watchKey))}</span></div></div><ol>${week.taskKeys.map((taskKey) => `<li><button type="button" aria-pressed="false"><span>✓</span>${escapeHtml(t(taskKey))}</button></li>`).join('')}</ol>${toolLink}<div class="thunder-phase-visuals">${images.map((visual, index) => `<figure><img src="${visual.src}" width="${visual.width}" height="${visual.height}" loading="lazy" decoding="async" alt="${escapeHtml(visual.alt)}" /><figcaption>${escapeHtml(visual.caption || captionFallback.replace('{index}', String(index + 1)))}</figcaption></figure>`).join('')}</div></article>`;
  };
  root.addEventListener('click', (event) => {
    const week = event.target.closest('[data-week]');
    if (week) {
      active = week.dataset.week;
      history.replaceState(history.state, '', `#edenHub?subtab=playbook&section=${active}`);
      render();
    }
    const viewButton = event.target.closest('[data-playbook-view]');
    if (viewButton) {
      view = viewButton.dataset.playbookView;
      history.replaceState(
        history.state,
        '',
        `#edenHub?subtab=playbook&view=${view}&section=${active}`
      );
      renderView();
    }
    const task = event.target.closest('.thunder-focus li button');
    if (task)
      task.setAttribute('aria-pressed', String(task.getAttribute('aria-pressed') !== 'true'));
  });
  window.addEventListener('vts:language-change', render);
  render();
  renderView();
}
