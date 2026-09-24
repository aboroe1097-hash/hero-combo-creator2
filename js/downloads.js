// Community downloads hub. Reads the manifest that scripts/pdf/build.mjs writes
// next to the PDFs, so the page can never advertise a file that did not ship.

import { mountToolShell } from './tool-shell.js';
import {
  loadDownloadsCopy,
  normalizeDownloadsLocale,
  preferredDownloadsLocale,
} from './i18n/downloads-copy.js';
import downloadsCopyLocalesUrl from './i18n/downloads-copy-locales.json?url';
import '../css/standalone-footer-v14.css';
import '../css/tool-shell.css';

const GROUPS = [
  {
    key: 'research',
    ids: ['research-costs'],
  },
  {
    key: 'unitSpecialisation',
    ids: ['unit-specialisation-medals', 'specialisation-towers'],
  },
  {
    key: 'eden',
    ids: [
      'eden-honor-buildings',
      'eden-specialty-honor',
      'eden-siege-structures',
      'eden-tile-levels',
      'eden-map-structures',
    ],
  },
  {
    key: 'dragonMaster',
    ids: ['dragon-master-enhancement', 'dragon-master-crafting'],
  },
  {
    key: 'heroesSkins',
    ids: ['heroes-by-season', 'skin-catalogue'],
  },
  {
    key: 'reference',
    ids: ['artifacts', 'combos-and-counters'],
  },
];

// The page has no language switcher, so the locale comes from the stored site
// preference or the browser. Arabic drives the RTL layout; the Korean locale ID
// stays `kr` internally and is written to the document as `ko`.
function applyPageLanguage(locale) {
  document.documentElement.setAttribute('lang', locale === 'kr' ? 'ko' : locale);
  document.documentElement.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
}

// Static page chrome the entry owns. The PDFs and their manifest titles stay
// English, so only the surrounding hub copy is translated.
function applyStaticCopy(copy) {
  document.title = `${copy.title} | VTS 1097`;
  const skip = document.querySelector('.downloads-skip-link');
  if (skip) skip.textContent = copy.skip;
  const heading = document.querySelector('.downloads-header h1');
  if (heading) heading.textContent = copy.title;
  const intro = document.querySelector('.downloads-header > p:not(.downloads-brandline)');
  if (intro) intro.textContent = copy.intro;
  const note = document.querySelector('.downloads-note');
  if (note) {
    const strong = document.createElement('strong');
    strong.textContent = copy.noteStrong;
    note.replaceChildren(strong, ` ${copy.noteBody}`);
  }
}

const MANIFEST_URL = 'downloads/downloads.json';

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function card(entry) {
  const anchor = document.createElement('a');
  anchor.className = 'download-card';
  anchor.href = `downloads/${entry.filename}`;
  anchor.setAttribute('download', '');
  anchor.dataset.exportId = entry.id;

  const title = document.createElement('span');
  title.className = 'download-card__title';
  title.textContent = entry.title;
  anchor.appendChild(title);

  if (entry.subtitle) {
    const desc = document.createElement('p');
    desc.className = 'download-card__desc';
    desc.textContent = entry.subtitle;
    anchor.appendChild(desc);
  }

  const meta = document.createElement('span');
  meta.className = 'download-card__meta';
  const bits = [formatBytes(entry.bytes), 'PDF'];
  if (entry.meta?.length) {
    bits.unshift(entry.meta.map((item) => `${item.label}: ${item.value}`).join(' · '));
  }
  meta.textContent = bits.join(' · ');
  anchor.appendChild(meta);

  return anchor;
}

function renderGroup(group, byId, container, copy) {
  const entries = group.ids.map((id) => byId.get(id)).filter(Boolean);
  if (!entries.length) return;

  const section = document.createElement('section');
  section.className = 'downloads-group';
  const heading = document.createElement('h2');
  heading.textContent = copy.groups[group.key] || copy.groups.more;
  section.appendChild(heading);

  const list = document.createElement('ul');
  list.className = 'downloads-grid';
  entries.forEach((entry) => {
    const item = document.createElement('li');
    item.appendChild(card(entry));
    list.appendChild(item);
  });
  section.appendChild(list);
  container.appendChild(section);
}

async function init() {
  const locale = normalizeDownloadsLocale(
    new URLSearchParams(location.search).get('lang') || preferredDownloadsLocale()
  );
  const copy = await loadDownloadsCopy(locale, downloadsCopyLocalesUrl);
  applyPageLanguage(locale);
  applyStaticCopy(copy);

  const root = document.getElementById('downloadsGroups');
  const status = document.getElementById('downloadsStatus');
  const stats = document.getElementById('downloadsStats');
  if (!root) return;
  if (status) status.textContent = copy.loading;

  try {
    const response = await fetch(MANIFEST_URL, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = await response.json();
    const exports = Array.isArray(manifest.exports) ? manifest.exports : [];
    if (!exports.length) throw new Error('empty manifest');

    const byId = new Map(exports.map((entry) => [entry.id, entry]));
    GROUPS.forEach((group) => renderGroup(group, byId, root, copy));

    // Anything the manifest ships but the groups do not list still gets shown,
    // so a new export cannot silently go missing from the hub.
    const grouped = new Set(GROUPS.flatMap((group) => group.ids));
    const ungrouped = exports.filter((entry) => !grouped.has(entry.id));
    if (ungrouped.length) {
      renderGroup({ key: 'more', ids: ungrouped.map((entry) => entry.id) }, byId, root, copy);
    }

    if (stats) {
      const total = exports.reduce((sum, entry) => sum + (Number(entry.bytes) || 0), 0);
      stats.hidden = false;
      stats.innerHTML = '';
      [
        [copy.stats.documents, String(exports.length)],
        [copy.stats.totalSize, formatBytes(total)],
        [copy.stats.built, formatDate(manifest.generatedAt)],
      ].forEach(([label, value]) => {
        const span = document.createElement('span');
        span.append(`${label} `);
        const bold = document.createElement('b');
        bold.textContent = value;
        span.appendChild(bold);
        stats.appendChild(span);
      });
    }
    if (status) status.remove();
  } catch (error) {
    if (status) {
      status.textContent = copy.error;
      status.setAttribute('role', 'alert');
    }
  }
}

init();

// Shared site chrome: the same footer (and, where the page has no header of
// its own, the branded bar with Back to tools) on every standalone tool page.
mountToolShell({ bar: true });
