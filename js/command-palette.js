/**
 * Command palette — deterministic, offline navigator over the toolkit's tools
 * and pages. No network, no AI: instant fuzzy search that jumps to the right
 * tab (via window.vtsSwitchTab) or standalone page. Opens with Ctrl/Cmd+K or
 * the header trigger button.
 */
import { translations } from './translations.js';
import { resolveRuntimeLocale } from './locale-format.js';
import './i18n/standalone-copy.js';

const STANDALONE_I18N = window.VTSStandaloneI18n;

const DESTS = [
  {
    key: 'tabManual',
    name: 'manual',
    kind: 'tab',
    fallback: 'Manual Builder',
    kw: 'build combo drag create team three heroes',
  },
  {
    key: 'tabGenerator',
    name: 'generator',
    kind: 'tab',
    fallback: 'Combo Generator',
    kw: 'combo generate best ranked owned surprise team',
  },
  {
    key: 'tabHeroes',
    name: 'heroes',
    kind: 'tab',
    fallback: 'Hero Atlas',
    kw: 'hero atlas database skills synergy counter info skins',
  },
  {
    key: 'tabResearch',
    name: 'research',
    kind: 'tab',
    fallback: 'Tech Research',
    kw: 'tech research academy tree buffs nodes',
  },
  {
    key: 'tabSpecializationTowers',
    aliasesKey: 'tabSpecializationTowersAliases',
    name: 'specializationTowers',
    href: 'specialization-towers.html',
    kind: 'link',
    fallback: 'Specialization Towers',
    kw: 'specialization tower towers badge medals nodes branches tech tree progress cavalry archers footmen',
  },
  {
    key: 'tabMaterials',
    name: 'materials',
    kind: 'tab',
    fallback: 'DM Materials',
    kw: 'dm dragon master gear materials craft equipment gold purple blue',
  },
  {
    key: 'tabEdenMap',
    name: 'edenMap',
    kind: 'tab',
    fallback: 'Eden Map',
    kw: 'eden map tiles scout route terrain teams',
  },
  {
    key: 'tabStrife',
    name: 'strife',
    kind: 'tab',
    fallback: 'Strife over Dragon',
    kw: 'strife dragon monster matchup',
  },
  {
    key: 'tabLoyalty',
    name: 'loyalty',
    kind: 'tab',
    fallback: 'Eden Loyalty',
    kw: 'loyalty poison camp deficit mitigation eden',
  },
  {
    key: 'tabYouTube',
    name: 'youtube',
    kind: 'tab',
    fallback: 'YouTube',
    kw: 'youtube video playlist watch',
  },
  {
    key: 'tabOcrDashboard',
    name: 'admin',
    href: 'admin.html',
    kind: 'link',
    fallback: 'VTS Admin',
    kw: 'admin ocr roster gifts leaderboard contribution vote conduct dashboard',
  },
  {
    key: 'tabArcade',
    name: 'arcade',
    kind: 'tab',
    fallback: 'Arcade',
    kw: 'arcade games mini games play forge merge rumble',
  },
  {
    key: 'tabBattleSimulator',
    href: 'battle-simulator.html',
    kind: 'link',
    fallback: 'Battle Simulator',
    kw: 'battle simulator beta troops combat formation rounds tactical might resistance speed',
  },
];

function currentLang() {
  return resolveRuntimeLocale();
}

function t(key, fallback) {
  const lang = currentLang();
  return translations?.[lang]?.[key] ?? translations?.en?.[key] ?? fallback;
}

function commandCopy() {
  return STANDALONE_I18N.getCopy(currentLang()).command;
}

function normalize(s) {
  return (s || '').toLowerCase().trim();
}

/** Rank: label-prefix (0) < label-substring (1) < keyword-substring (2); non-match => -1. */
function scoreDest(dest, q) {
  const label = normalize(t(dest.key, dest.fallback));
  if (!q) return 3;
  if (label.startsWith(q)) return 0;
  if (label.includes(q)) return 1;
  const catalogAliases = dest.aliasesKey ? t(dest.aliasesKey, '') : '';
  const aliases = `${commandCopy().aliases?.[dest.name] || ''} ${catalogAliases}`;
  const hay = `${label} ${dest.kw} ${aliases}`;
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.every((tok) => hay.includes(tok))) return 2;
  return -1;
}

let els = null; // lazily-built DOM
let active = 0;
let results = [];
let lastFocused = null;

function build() {
  if (els) return els;
  const overlay = document.createElement('div');
  overlay.className = 'cmdk-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', t('cmdkTitle', 'Jump to a tool'));
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="cmdk-panel" role="document">
      <div class="cmdk-input-row">
        <svg class="cmdk-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3" stroke-linecap="round"/></svg>
        <input class="cmdk-input" type="text" role="combobox" aria-expanded="false" aria-controls="cmdkList" aria-autocomplete="list" autocomplete="off" spellcheck="false" />
      </div>
      <ul class="cmdk-list" id="cmdkList" role="listbox"></ul>
      <div class="cmdk-empty" hidden></div>
      <div class="cmdk-hint"></div>
    </div>`;
  document.body.appendChild(overlay);
  els = {
    overlay,
    panel: overlay.querySelector('.cmdk-panel'),
    input: overlay.querySelector('.cmdk-input'),
    list: overlay.querySelector('.cmdk-list'),
    empty: overlay.querySelector('.cmdk-empty'),
    hint: overlay.querySelector('.cmdk-hint'),
  };

  els.input.addEventListener('input', () => render(els.input.value));
  els.input.addEventListener('keydown', onInputKeydown);
  overlay.addEventListener('pointerdown', (e) => {
    if (e.target === overlay) close();
  });
  return els;
}

function refreshLocalizedCopy() {
  const title = t('cmdkTitle', 'Jump to a tool');
  const placeholder = t('cmdkPlaceholder', 'Search tools and pages…');
  els.overlay.setAttribute('aria-label', title);
  els.input.placeholder = placeholder;
  els.input.setAttribute('aria-label', placeholder);
  els.hint.textContent = t('cmdkHint', 'Enter to open · Esc to close');
}

function render(query) {
  const q = normalize(query);
  results = DESTS.map((d) => ({ d, s: scoreDest(d, q) }))
    .filter((r) => r.s >= 0)
    .sort((a, b) => a.s - b.s)
    .map((r) => r.d);
  active = 0;

  els.list.innerHTML = '';
  results.forEach((d, i) => {
    const li = document.createElement('li');
    li.className = 'cmdk-item';
    li.id = `cmdk-item-${i}`;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', i === active ? 'true' : 'false');
    const badgeKey = d.kind === 'link' ? 'page' : 'tool';
    const badge = commandCopy().badges[badgeKey];
    li.innerHTML = `<span class="cmdk-item-label"></span><span class="cmdk-item-badge">${badge}</span>`;
    li.querySelector('.cmdk-item-label').textContent = t(d.key, d.fallback);
    li.addEventListener('pointerenter', () => setActive(i));
    li.addEventListener('click', () => go(results[i]));
    els.list.appendChild(li);
  });

  const none = results.length === 0;
  els.empty.hidden = !none;
  els.empty.textContent = t('cmdkEmpty', 'No matches');
  els.list.hidden = none;
  updateActiveAttrs();
}

function setActive(i) {
  if (!results.length) return;
  active = (i + results.length) % results.length;
  updateActiveAttrs();
}

function updateActiveAttrs() {
  if (!results.length) {
    els.input.removeAttribute('aria-activedescendant');
    return;
  }
  [...els.list.children].forEach((li, i) => {
    const on = i === active;
    li.setAttribute('aria-selected', on ? 'true' : 'false');
    li.classList.toggle('is-active', on);
    if (on) {
      els.input.setAttribute('aria-activedescendant', li.id);
      li.scrollIntoView({ block: 'nearest' });
    }
  });
}

function onInputKeydown(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setActive(active + 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    setActive(active - 1);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (results[active]) go(results[active]);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    close();
  } else if (e.key === 'Tab') {
    e.preventDefault();
    els.input.focus();
  }
}

function go(dest) {
  close();
  if (dest.kind === 'tab') {
    if (typeof window.vtsSwitchTab === 'function') {
      window.vtsSwitchTab(dest.name, false, { scrollToSection: true });
    } else {
      window.location.hash = `#${dest.name}`;
    }
  } else {
    window.location.href = dest.href;
  }
}

function isOpen() {
  return els && !els.overlay.hidden;
}

function open() {
  build();
  if (isOpen()) return;
  lastFocused = document.activeElement;
  els.overlay.hidden = false;
  els.input.setAttribute('aria-expanded', 'true');
  refreshLocalizedCopy();
  document.body.classList.add('cmdk-open');
  els.input.value = '';
  render('');
  requestAnimationFrame(() => els.input.focus());
}

function close() {
  if (!isOpen()) return;
  els.overlay.hidden = true;
  document.body.classList.remove('cmdk-open');
  els.input.setAttribute('aria-expanded', 'false');
  els.input.removeAttribute('aria-activedescendant');
  if (lastFocused && typeof lastFocused.focus === 'function') {
    lastFocused.focus({ preventScroll: true });
  }
}

function toggle() {
  isOpen() ? close() : open();
}

function init() {
  if (window.__vtsCmdkInit) return;
  window.__vtsCmdkInit = true;

  document.addEventListener(
    'keydown',
    (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        toggle();
      }
    },
    true
  );

  const trigger =
    document.getElementById('commandPaletteTrigger') || document.querySelector('[data-cmdk-open]');
  trigger?.addEventListener('click', open);

  const refreshLanguage = () => {
    if (!els) return;
    refreshLocalizedCopy();
    if (isOpen()) render(els.input.value);
  };
  window.addEventListener('vts:language-change', refreshLanguage);

  window.vtsOpenCommandPalette = open;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
