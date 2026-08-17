import { peekAccountState, loadAccountProfile } from './account-profile-service.js';
import { isAdminAuthUser, isSuperAdminAuthUser } from './firebase.js';
import { getAccountSyncState, onAccountSyncUpdate } from './account-sync.js';
import { bootAccountSync } from './account-sync-bootstrap.js';

// The chip is mounted on every page, and the name it shows comes from the
// player's own profile (gameName / displayName). Built with DOM calls rather
// than an innerHTML template so that name can never be parsed as markup —
// textContent is inert by construction, which is stronger than remembering to
// escape at each interpolation point.
function renderChip(account, profile, sync, admin, superadmin) {
  const mount =
    document.querySelector('[data-account-chip]') ||
    document.body.appendChild(document.createElement('div'));
  mount.dataset.accountChip = '';
  // Keep page-owned layout classes (for example the inline admin header slot).
  // Replacing className moved the shared chip out of responsive grid rules and
  // made it behave like the global floating chip again.
  mount.classList.add('vts-account-chip-mount');

  const name = profile?.gameName || profile?.displayName || account.displayName || 'Player';
  const syncLabel =
    sync.status === 'offline' ? 'Offline' : sync.pending.length ? 'Sync pending' : 'Synced';

  const link = document.createElement('a');
  link.className = 'vts-account-chip';
  // Pages that opt in via data-account-return-to send the visitor back to
  // themselves after signing in through the profile flow.
  const returnTo = document.body?.dataset?.accountReturnTo;
  link.href = returnTo ? `profile.html?return=${encodeURIComponent(returnTo)}` : 'profile.html';
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
    // Superadmin is the higher level, so say so rather than showing the same
    // Admin badge to both and leaving the operator guessing which they hold.
    badge.className = superadmin
      ? 'vts-account-chip__admin vts-account-chip__admin--super'
      : 'vts-account-chip__admin';
    badge.textContent = superadmin ? 'Superadmin' : 'Admin';
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
    const superadmin = admin && (await isSuperAdminAuthUser(account.user));
    // Sync only exists for a real account, and booting it pulls in the adapter
    // module — which statically imports every synced tool's store, including the
    // Battle Simulator ones. Booting it for guests dragged a battle-simulator
    // chunk onto public routes like specialization-towers.html, which is exactly
    // the route isolation the production smoke suite guards.
    if (!account.isGuest) bootAccountSync();
    renderChip(account, profile, getAccountSyncState(), admin, superadmin);
  } catch {
    renderChip({ isGuest: true, displayName: '' }, null, getAccountSyncState(), false, false);
  }
}

if (!document.body.classList.contains('account-page')) {
  void refresh();
  onAccountSyncUpdate(() => void refresh());
}
