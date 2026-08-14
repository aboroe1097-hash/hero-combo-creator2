import { peekAccountState, loadAccountProfile } from './account-profile-service.js';
import { isAdminAuthUser } from './firebase.js';
import { getAccountSyncState, onAccountSyncUpdate } from './account-sync.js';
import { bootAccountSync } from './account-sync-bootstrap.js';

// The chip is mounted on every page, and the name it shows comes from the
// player's own profile (gameName / displayName). Built with DOM calls rather
// than an innerHTML template so that name can never be parsed as markup —
// textContent is inert by construction, which is stronger than remembering to
// escape at each interpolation point.
function renderChip(account, profile, sync, admin) {
  const mount =
    document.querySelector('[data-account-chip]') ||
    document.body.appendChild(document.createElement('div'));
  mount.dataset.accountChip = '';
  mount.className = 'vts-account-chip-mount';

  const name = profile?.gameName || profile?.displayName || account.displayName || 'Player';
  const syncLabel =
    sync.status === 'offline' ? 'Offline' : sync.pending.length ? 'Sync pending' : 'Synced';

  const link = document.createElement('a');
  link.className = 'vts-account-chip';
  link.href = 'profile.html';
  link.setAttribute('aria-label', 'Open account and sync settings');

  const avatar = document.createElement('span');
  avatar.className = 'vts-account-chip__avatar';
  avatar.textContent = account.isGuest ? '?' : name.slice(0, 1).toUpperCase();

  const copy = document.createElement('span');
  copy.className = 'vts-account-chip__copy';
  const title = document.createElement('strong');
  title.textContent = account.isGuest ? 'Guest' : name;
  const subtitle = document.createElement('small');
  subtitle.textContent = account.isGuest ? 'Sign in' : syncLabel;
  copy.append(title, subtitle);

  link.append(avatar, copy);

  if (admin) {
    const badge = document.createElement('span');
    badge.className = 'vts-account-chip__admin';
    badge.textContent = 'Admin';
    link.append(badge);
  }

  mount.replaceChildren(link);
}

async function refresh() {
  try {
    // Read-only: the chip must not mint an anonymous session just to say 'Guest'.
    const account = await peekAccountState();
    const profile = account.isGuest ? null : await loadAccountProfile();
    const admin = !account.isGuest && (await isAdminAuthUser(account.user));
    // Sync only exists for a real account, and booting it pulls in the adapter
    // module — which statically imports every synced tool's store, including the
    // Battle Simulator ones. Booting it for guests dragged a battle-simulator
    // chunk onto public routes like specialization-towers.html, which is exactly
    // the route isolation the production smoke suite guards.
    if (!account.isGuest) bootAccountSync();
    renderChip(account, profile, getAccountSyncState(), admin);
  } catch {
    renderChip({ isGuest: true, displayName: '' }, null, getAccountSyncState(), false);
  }
}

if (!document.body.classList.contains('account-page')) {
  void refresh();
  onAccountSyncUpdate(() => void refresh());
}
