const LAST_SEEN_KEY = 'vts_last_seen_version';

function parseLatestChanges(text) {
  const lines = text.split(/\r?\n/);
  const changes = [];
  let inSection = false;
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      if (inSection) break;
      inSection = true;
      continue;
    }
    if (!inSection) continue;
    const m = line.match(/^-\s+(.+)/);
    if (m) changes.push(m[1].replace(/`/g, ''));
    if (changes.length >= 3) break;
  }
  return changes;
}

function renderWhatsNew(version, changes) {
  const banner = document.createElement('section');
  banner.className = 'whats-new-banner';
  banner.setAttribute('role', 'status');
  banner.innerHTML = `
    <div>
      <div class="whats-new-kicker">What's New in v${version}</div>
      <ul>${changes.map((change) => `<li>${change}</li>`).join('')}</ul>
    </div>
    <button type="button" aria-label="Dismiss what's new">X</button>`;
  banner.querySelector('button')?.addEventListener('click', () => banner.remove());
  document.body.appendChild(banner);
  window.setTimeout(() => banner.classList.add('visible'), 60);
  window.setTimeout(() => {
    banner.classList.remove('visible');
    window.setTimeout(() => banner.remove(), 260);
  }, 12000);
}

export async function initWhatsNewBanner(version) {
  if (!version) return;
  let lastSeen = '';
  try { lastSeen = localStorage.getItem(LAST_SEEN_KEY) || ''; } catch {}
  if (lastSeen === version) return;

  let changes = [];
  try {
    const res = await fetch(`CHANGELOG.md?v=${encodeURIComponent(version)}`, { cache: 'no-store' });
    if (res.ok) changes = parseLatestChanges(await res.text());
  } catch {}
  if (!changes.length) changes = ['Fresh build deployed.', 'Hero, Eden, OCR, and sharing tools improved.', 'Small fixes and polish landed.'];
  renderWhatsNew(version, changes);
  try { localStorage.setItem(LAST_SEEN_KEY, version); } catch {}
}
