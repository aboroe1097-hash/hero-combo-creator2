// Community downloads hub. Reads the manifest that scripts/pdf/build.mjs writes
// next to the PDFs, so the page can never advertise a file that did not ship.

const GROUPS = [
  {
    label: 'Research',
    ids: ['research-costs'],
  },
  {
    label: 'Unit Specialisation',
    ids: ['unit-specialisation-medals', 'specialisation-towers'],
  },
  {
    label: 'Eden',
    ids: [
      'eden-honor-buildings',
      'eden-specialty-honor',
      'eden-siege-structures',
      'eden-tile-levels',
      'eden-map-structures',
    ],
  },
  {
    label: 'Dragon Master',
    ids: ['dragon-master-enhancement', 'dragon-master-crafting'],
  },
  {
    label: 'Heroes and skins',
    ids: ['heroes-by-season', 'skin-catalogue'],
  },
  {
    label: 'Reference',
    ids: ['artifacts', 'combos-and-counters'],
  },
];

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

function renderGroup(group, byId, container) {
  const entries = group.ids.map((id) => byId.get(id)).filter(Boolean);
  if (!entries.length) return;

  const section = document.createElement('section');
  section.className = 'downloads-group';
  const heading = document.createElement('h2');
  heading.textContent = group.label;
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
  const root = document.getElementById('downloadsGroups');
  const status = document.getElementById('downloadsStatus');
  const stats = document.getElementById('downloadsStats');
  if (!root) return;

  try {
    const response = await fetch(MANIFEST_URL, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = await response.json();
    const exports = Array.isArray(manifest.exports) ? manifest.exports : [];
    if (!exports.length) throw new Error('empty manifest');

    const byId = new Map(exports.map((entry) => [entry.id, entry]));
    GROUPS.forEach((group) => renderGroup(group, byId, root));

    // Anything the manifest ships but the groups do not list still gets shown,
    // so a new export cannot silently go missing from the hub.
    const grouped = new Set(GROUPS.flatMap((group) => group.ids));
    const ungrouped = exports.filter((entry) => !grouped.has(entry.id));
    if (ungrouped.length) {
      renderGroup({ label: 'More', ids: ungrouped.map((entry) => entry.id) }, byId, root);
    }

    if (stats) {
      const total = exports.reduce((sum, entry) => sum + (Number(entry.bytes) || 0), 0);
      stats.hidden = false;
      stats.innerHTML = '';
      [
        ['Documents', String(exports.length)],
        ['Total size', formatBytes(total)],
        ['Built', formatDate(manifest.generatedAt)],
      ].forEach(([label, value]) => {
        const span = document.createElement('span');
        span.innerHTML = `${label} <b></b>`;
        span.querySelector('b').textContent = value;
        stats.appendChild(span);
      });
    }
    if (status) status.remove();
  } catch (error) {
    if (status) {
      status.textContent =
        'The download list could not be loaded. Reload the page, or open a document directly from the downloads folder.';
      status.setAttribute('role', 'alert');
    }
  }
}

init();
