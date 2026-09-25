import '../css/class-development.css';
import { currentLanguage } from './state.js';
import { formatLocaleNumber } from './locale-format.js';
import {
  CLASS_DEVELOPMENT_PROFILES,
  getClassDevelopmentProfile,
  getNextClassCheckpoint,
} from './class-development-data.js';
import { createHubTabButton, createHubTabPanel, mountHubPdfPanel } from './hub-pdf-tab.js';

const STORAGE_PROFILE = 'vts_class_development_profile';
const STORAGE_LEVELS = 'vts_class_development_levels';

const COPY = {
  en: {
    kicker: 'Community roadmaps',
    title: 'Class Development Hub',
    intro:
      'Plan profession resets, compare class trade-offs, and keep the next checkpoint in view.',
    choose: 'Choose a class',
    currentLevel: 'Current class level',
    nextReset: 'Next reset target',
    pointsAway: '{n} levels away',
    oneLevelAway: '1 level away',
    complete: 'Final sheet target reached',
    checkpoints: 'Reset checkpoints',
    redPath: 'Red priority path',
    yellowPath: 'Yellow follow-up path',
    redHelp: 'Secure these highlighted nodes first when resetting.',
    yellowHelp: 'Max these after the red priority where the sheet calls them out.',
    strengths: 'What this class gives you',
    tradeoffs: 'Watch-outs',
    targets: 'Final roadmap targets',
    cards: 'Card positions',
    compare: 'Compare all four classes',
    classLabel: 'Class',
    focus: 'Focus',
    final: 'Final reset',
    source: 'Source & interpretation',
    sourceText: 'Skill names stay in source English.',
    openSource: 'Open full source sheet',
    caution:
      'Community acceleration path—not an absolute best build. Adapt troop, resource, season, and alliance branches to your account.',
    exactLevel: 'Lv {n}',
    levelUnknown: 'In source order',
    income: 'Income',
    classCards: 'Class',
    alliance: 'Alliance',
    general: 'General',
  },
  ar: {
    kicker: 'مسارات المجتمع',
    title: 'مركز تطوير الفئات',
    intro: 'خطط لإعادة توزيع نقاط المهنة، وقارن مزايا الفئات، وتابع المستوى التالي.',
    choose: 'اختر فئة',
    currentLevel: 'مستوى الفئة الحالي',
    nextReset: 'هدف إعادة التوزيع التالي',
    pointsAway: 'متبقٍ {n} مستوى',
    oneLevelAway: 'متبقٍ مستوى واحد',
    complete: 'تم الوصول إلى الهدف النهائي في الدليل',
    checkpoints: 'مستويات إعادة التوزيع',
    redPath: 'مسار الأولوية الأحمر',
    yellowPath: 'مسار المتابعة الأصفر',
    redHelp: 'احصل على هذه المهارات المميزة أولاً عند إعادة التوزيع.',
    yellowHelp: 'أكمل هذه المهارات بعد الأولوية الحمراء كما يوضح الدليل.',
    strengths: 'مزايا هذه الفئة',
    tradeoffs: 'تنبيهات',
    targets: 'أهداف المسار النهائية',
    cards: 'أماكن البطاقات',
    compare: 'مقارنة الفئات الأربع',
    classLabel: 'الفئة',
    focus: 'التركيز',
    final: 'إعادة التوزيع النهائية',
    source: 'المصدر والتفسير',
    sourceText: 'بقيت أسماء المهارات بالإنجليزية كما في المصدر.',
    openSource: 'فتح الدليل الكامل',
    caution:
      'مسار مجتمعي لتسريع التطور، وليس أفضل بناء مطلقاً. عدّل فروع القوات والموارد والموسم والتحالف حسب حسابك.',
    exactLevel: 'المستوى {n}',
    levelUnknown: 'حسب ترتيب المصدر',
    income: 'الدخل',
    classCards: 'الفئة',
    alliance: 'التحالف',
    general: 'عام',
  },
};

let initialized = false;
let selectedId = 'raider';
let levels = {};

function copy() {
  return COPY[currentLanguage] || COPY.en;
}

function number(value) {
  return formatLocaleNumber(value, currentLanguage, { maximumFractionDigits: 0 });
}

function interpolate(template, values) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function readState() {
  try {
    const storedId = localStorage.getItem(STORAGE_PROFILE);
    if (getClassDevelopmentProfile(storedId)) selectedId = storedId;
    const storedLevels = JSON.parse(localStorage.getItem(STORAGE_LEVELS) || '{}');
    if (storedLevels && typeof storedLevels === 'object') levels = storedLevels;
  } catch {
    levels = {};
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_PROFILE, selectedId);
    localStorage.setItem(STORAGE_LEVELS, JSON.stringify(levels));
  } catch {
    /* Storage is optional. */
  }
}

function classPicker(profile) {
  const isActive = profile.id === selectedId;
  return `<button class="cd-class-card${isActive ? ' is-active' : ''}" type="button" data-class-id="${profile.id}" aria-pressed="${isActive}">
    <span class="cd-class-icon" aria-hidden="true">${profile.icon}</span>
    <span><strong>${escapeHtml(profile.name)}</strong>${profile.alias ? `<small>${escapeHtml(profile.alias)}</small>` : ''}<em>${escapeHtml(profile.role)}</em></span>
  </button>`;
}

function checkpointTrack(profile, currentLevel) {
  const next = getNextClassCheckpoint(profile, currentLevel);
  return profile.checkpoints
    .map((level) => {
      const state = level <= currentLevel ? ' is-done' : level === next ? ' is-next' : '';
      return `<li class="cd-checkpoint${state}"><span>${number(level)}</span></li>`;
    })
    .join('');
}

function priorityItems(profile) {
  const t = copy();
  return profile.priorities
    .map(
      (item) =>
        `<li><span class="cd-path-level">${item.level ? interpolate(t.exactLevel, { n: number(item.level) }) : t.levelUnknown}</span><strong>${escapeHtml(item.skill)}</strong></li>`
    )
    .join('');
}

function list(items) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

function cardMix(profile) {
  const t = copy();
  const labels = {
    income: t.income,
    class: t.classCards,
    alliance: t.alliance,
    general: t.general,
  };
  return Object.entries(profile.cardMix)
    .map(([key, value]) => `<span><b>${number(value)}</b>${escapeHtml(labels[key])}</span>`)
    .join('');
}

function comparisonRows() {
  const t = copy();
  return CLASS_DEVELOPMENT_PROFILES.map(
    (profile) => `<tr${profile.id === selectedId ? ' class="is-selected"' : ''}>
    <th scope="row"><button type="button" data-class-id="${profile.id}">${profile.icon} ${escapeHtml(profile.name)}</button></th>
    <td>${escapeHtml(profile.role)}</td>
    <td>${interpolate(t.exactLevel, { n: number(profile.finalLevel) })}</td>
  </tr>`
  ).join('');
}

const CD_SUBTABS = Object.freeze([
  {
    name: 'roadmap',
    i18nKey: 'hubClassRoadmapTab',
    fallback: 'Roadmaps',
    id: 'classDevelopmentTabRoadmap',
    panelId: 'classDevelopmentRoadmap',
  },
  {
    name: 'pdfs',
    i18nKey: 'hubPdfsTab',
    fallback: 'PDFs',
    id: 'classDevelopmentTabPdfs',
    panelId: 'classDevelopmentPdfsSection',
  },
]);

// The hub's two sub-tabs: the roadmap planner and the PDFs document builder.
// Built here because index.html has no byte headroom for more markup.
function ensureSubtabs(root) {
  if (root.querySelector('#classDevelopmentRoadmap')) return;
  const bar = document.createElement('div');
  bar.className = 'vts-hub-subtabs';
  bar.setAttribute('role', 'tablist');
  bar.setAttribute('aria-label', copy().title);
  root.replaceChildren(bar);
  for (const tab of CD_SUBTABS) {
    bar.append(
      createHubTabButton({
        ...tab,
        attribute: 'cdSubtab',
        className: 'vts-hub-subtab',
        controls: tab.panelId,
      })
    );
    root.append(
      createHubTabPanel({
        id: tab.panelId,
        attribute: 'cdSubtabPanel',
        name: tab.name,
        className: 'vts-hub-subtab-panel',
        labelledBy: tab.id,
      })
    );
  }
  bar.addEventListener('click', (event) => {
    const button = event.target.closest('[data-cd-subtab]');
    if (button) openClassDevelopmentSubtab(button.dataset.cdSubtab);
  });
}

export function openClassDevelopmentSubtab(name) {
  const root = document.getElementById('classDevelopmentRoot');
  if (!root) return;
  const subtab = CD_SUBTABS.some((tab) => tab.name === name) ? name : 'roadmap';
  root.querySelectorAll('[data-cd-subtab]').forEach((button) => {
    const active = button.dataset.cdSubtab === subtab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });
  root.querySelectorAll('[data-cd-subtab-panel]').forEach((panel) => {
    const active = panel.dataset.cdSubtabPanel === subtab;
    panel.classList.toggle('active', active);
    panel.hidden = !active;
  });
  if (subtab === 'pdfs')
    mountHubPdfPanel('class', document.getElementById('classDevelopmentPdfsSection'));
}

function render() {
  const root = document.getElementById('classDevelopmentRoadmap');
  if (!root) return;
  const t = copy();
  const profile = getClassDevelopmentProfile(selectedId) || CLASS_DEVELOPMENT_PROFILES[0];
  selectedId = profile.id;
  const currentLevel = Math.max(1, Math.min(999, Math.floor(Number(levels[profile.id]) || 1)));
  const next = getNextClassCheckpoint(profile, currentLevel);
  const remaining = next ? Math.max(0, next - currentLevel) : 0;

  root.innerHTML = `<div class="cd-shell">
    <header class="cd-hero">
      <p class="cd-kicker">${escapeHtml(t.kicker)}</p>
      <h2>${escapeHtml(t.title)}</h2>
      <p>${escapeHtml(t.intro)}</p>
    </header>

    <section class="cd-picker" aria-labelledby="cdChooseTitle">
      <h2 id="cdChooseTitle">${escapeHtml(t.choose)}</h2>
      <div class="cd-picker-grid">${CLASS_DEVELOPMENT_PROFILES.map(classPicker).join('')}</div>
    </section>

    <section class="cd-planner" aria-label="${escapeHtml(profile.name)}">
      <div class="cd-level-panel">
        <label for="cdCurrentLevel">${escapeHtml(t.currentLevel)}</label>
        <input id="cdCurrentLevel" type="number" inputmode="numeric" min="1" max="999" value="${currentLevel}">
        <div class="cd-next" aria-live="polite">
          <span>${escapeHtml(t.nextReset)}</span>
          <strong>${next ? interpolate(t.exactLevel, { n: number(next) }) : escapeHtml(t.complete)}</strong>
          ${next ? `<small>${remaining === 1 ? escapeHtml(t.oneLevelAway) : interpolate(t.pointsAway, { n: number(remaining) })}</small>` : ''}
        </div>
        <h3>${escapeHtml(t.checkpoints)}</h3>
        <ol class="cd-checkpoints">${checkpointTrack(profile, currentLevel)}</ol>
      </div>

      <article class="cd-profile">
        <div class="cd-profile-heading"><span class="cd-profile-icon" aria-hidden="true">${profile.icon}</span><div><h2>${escapeHtml(profile.name)}</h2>${profile.alias ? `<p>${escapeHtml(profile.alias)}</p>` : ''}<strong>${escapeHtml(profile.role)}</strong></div></div>
        <div class="cd-two-col">
          <section><h3>${escapeHtml(t.strengths)}</h3><ul class="cd-good">${list(profile.strengths)}</ul></section>
          <section><h3>${escapeHtml(t.tradeoffs)}</h3><ul class="cd-warn">${list(profile.tradeoffs)}</ul></section>
        </div>
      </article>
    </section>

    <section class="cd-paths">
      <article class="cd-path cd-path-red"><h2>${escapeHtml(t.redPath)}</h2><p>${escapeHtml(t.redHelp)}</p><ol>${priorityItems(profile)}</ol></article>
      <article class="cd-path cd-path-yellow"><h2>${escapeHtml(t.yellowPath)}</h2><p>${escapeHtml(t.yellowHelp)}</p><ol>${list(profile.followUps)}</ol></article>
    </section>

    <section class="cd-outcomes">
      <article><h2>${escapeHtml(t.targets)}</h2><ul>${list(profile.targets)}</ul></article>
      <aside><h2>${escapeHtml(t.cards)}</h2><div class="cd-card-mix">${cardMix(profile)}</div></aside>
    </section>

    <section class="cd-compare">
      <h2>${escapeHtml(t.compare)}</h2>
      <div class="cd-table-wrap"><table><thead><tr><th>${escapeHtml(t.classLabel)}</th><th>${escapeHtml(t.focus)}</th><th>${escapeHtml(t.final)}</th></tr></thead><tbody>${comparisonRows()}</tbody></table></div>
    </section>

    <aside class="cd-source">
      <div><h2>${escapeHtml(t.source)}</h2><p>${escapeHtml(t.sourceText)}</p><p class="cd-caution">${escapeHtml(t.caution)}</p></div>
      <a href="${profile.sourceUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(t.openSource)} ↗</a>
    </aside>
  </div>`;
}

function onClick(event) {
  const button = event.target.closest('[data-class-id]');
  if (!button) return;
  const profile = getClassDevelopmentProfile(button.dataset.classId);
  if (!profile) return;
  selectedId = profile.id;
  saveState();
  render();
}

function onInput(event) {
  if (event.target.id !== 'cdCurrentLevel') return;
  levels[selectedId] = Math.max(1, Math.min(999, Math.floor(Number(event.target.value) || 1)));
  saveState();
  render();
  document.getElementById('cdCurrentLevel')?.focus({ preventScroll: true });
}

export function initClassDevelopment() {
  const root = document.getElementById('classDevelopmentRoot');
  if (!root) return false;
  if (!initialized) {
    ensureSubtabs(root);
    readState();
    root.addEventListener('click', onClick);
    root.addEventListener('change', onInput);
    window.addEventListener('vts:language-change', render);
    initialized = true;
    let linked = '';
    try {
      linked = new URLSearchParams(window.location.hash.split('?')[1] || '').get('subtab') || '';
    } catch {
      /* URL state is optional */
    }
    openClassDevelopmentSubtab(linked);
  }
  render();
  return true;
}

export { render as refreshClassDevelopment };
