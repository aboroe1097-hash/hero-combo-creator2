// js/admin-roles-controller.js
//
// The superadmin-only Users & Roles surface inside VTS Admin.
//
// This module renders and nothing else. It takes its data and its one
// side-effecting call as injected functions, so it can be unit-tested without
// Firebase and so it cannot accidentally reach the network itself. Authority
// lives in the setUserRole callable and in firestore.rules; hiding a toggle
// here is a courtesy to the operator, never a security boundary.

const ROLE_ADMIN = 'admin';
const ROLE_SUPERADMIN = 'superadmin';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * A uid is 128 characters of opaque noise. Show enough to tell two accounts
 * apart and keep the whole thing in the title for copying.
 */
export function shortenUid(uid) {
  const value = String(uid || '');
  return value.length <= 14 ? value : `${value.slice(0, 8)}…${value.slice(-4)}`;
}

/**
 * Filters the member list on name or uid. Matching uid matters because the
 * roster is the only place an operator can read one, and a display name is not
 * guaranteed unique.
 */
export function filterMembers(members, query) {
  const needle = String(query || '')
    .trim()
    .toLowerCase();
  const rows = Array.isArray(members) ? members : [];
  if (!needle) return rows;
  return rows.filter((member) => {
    const name = String(member?.displayName || '').toLowerCase();
    const uid = String(member?.uid || '').toLowerCase();
    return name.includes(needle) || uid.includes(needle);
  });
}

/**
 * Mirrors nextClaimsFor() in functions/src/user-roles.js so the table shows the
 * state the server will actually produce, rather than briefly implying that an
 * account can be superadmin without being admin.
 */
export function projectRoles(member, role, granted) {
  const next = {
    admin: member?.admin === true,
    superadmin: member?.superadmin === true,
  };
  if (role === ROLE_SUPERADMIN) {
    next.superadmin = granted;
    if (granted) next.admin = true;
  } else {
    next.admin = granted;
    if (!granted) next.superadmin = false;
  }
  return next;
}

function memberRowHtml(member, currentUid, t) {
  const uid = String(member?.uid || '');
  const isSelf = uid === currentUid;
  const admin = member?.admin === true;
  const superadmin = member?.superadmin === true;
  const name = member?.displayName || t('adminRolesUnnamed');
  // Self-demotion is refused by the callable, so render it as unavailable
  // rather than letting the operator discover the refusal by hitting it.
  const selfNote = isSelf ? ` title="${escapeHtml(t('adminRolesNoSelfDemote'))}"` : '';
  return `
    <tr data-role-row="${escapeHtml(uid)}">
      <td class="dash-roles-member">
        <span class="dash-roles-name">${escapeHtml(name)}</span>
        <span class="dash-roles-uid" title="${escapeHtml(uid)}">${escapeHtml(shortenUid(uid))}</span>
      </td>
      <td>
        <label class="dash-roles-toggle">
          <input type="checkbox" data-role-toggle="${ROLE_ADMIN}" data-role-uid="${escapeHtml(uid)}"${admin ? ' checked' : ''} />
          <span>${escapeHtml(t('adminRolesAdmin'))}</span>
        </label>
      </td>
      <td>
        <label class="dash-roles-toggle"${selfNote}>
          <input type="checkbox" data-role-toggle="${ROLE_SUPERADMIN}" data-role-uid="${escapeHtml(uid)}"${superadmin ? ' checked' : ''}${isSelf ? ' disabled' : ''} />
          <span>${escapeHtml(t('adminRolesSuperadmin'))}</span>
        </label>
      </td>
    </tr>`;
}

/**
 * @param {HTMLElement} mount
 * @param {object} options
 * @param {string} options.currentUid       the signed-in superadmin
 * @param {() => Promise<Array>} options.listMembers   reads users/{uid} profiles
 * @param {(change: object) => Promise<object>} options.setUserRole  the callable
 * @param {(key: string) => string} options.t          localized copy
 */
export function renderRolesController(mount, options = {}) {
  const { currentUid = '', listMembers, setUserRole, t = (key) => key } = options;
  if (!mount) return null;

  let members = [];
  let query = '';

  const shell = document.createElement('div');
  shell.className = 'dash-roles';
  mount.replaceChildren(shell);

  function setStatus(message, tone = 'info') {
    const status = shell.querySelector('[data-role-status]');
    if (!status) return;
    status.textContent = message || '';
    status.dataset.tone = tone;
    status.hidden = !message;
  }

  // The chrome is built exactly once. Re-rendering it on every keystroke
  // destroyed and recreated the search input, which reset the caret to position
  // zero — so each typed character landed at the front and the query came out
  // reversed. Only the results region is ever repainted.
  shell.innerHTML = `
    <p class="dash-roles-lag">${escapeHtml(t('adminRolesTokenLag'))}</p>
    <div class="dash-roles-toolbar">
      <label class="dash-roles-search">
        <span>${escapeHtml(t('adminRolesSearchLabel'))}</span>
        <input type="search" data-role-search
               placeholder="${escapeHtml(t('adminRolesSearchPlaceholder'))}" />
      </label>
      <span class="dash-roles-count" data-role-count></span>
    </div>
    <p class="dash-roles-status" data-role-status hidden></p>
    <div data-role-results></div>`;

  function paint() {
    const results = shell.querySelector('[data-role-results]');
    const count = shell.querySelector('[data-role-count]');
    if (!results) return;
    const rows = filterMembers(members, query);
    if (count) {
      count.textContent = members.length
        ? t('adminRolesCount').replace('{shown}', rows.length).replace('{total}', members.length)
        : '';
    }
    results.innerHTML = rows.length
      ? `<table class="dash-table dash-roles-table">
           <thead><tr>
             <th>${escapeHtml(t('adminRolesMember'))}</th>
             <th>${escapeHtml(t('adminRolesAdmin'))}</th>
             <th>${escapeHtml(t('adminRolesSuperadmin'))}</th>
           </tr></thead>
           <tbody>${rows.map((member) => memberRowHtml(member, currentUid, t)).join('')}</tbody>
         </table>`
      : // Only members who have signed in at least once have a profile, so an
        // empty roster is expected rather than broken. Say which it is.
        `<p class="dash-roles-empty">${escapeHtml(
          members.length ? t('adminRolesNoMatches') : t('adminRolesEmpty')
        )}</p>`;
  }

  async function applyChange(uid, role, granted, input) {
    const row = shell.querySelector(`[data-role-row="${CSS.escape(uid)}"]`);
    row?.querySelectorAll('input').forEach((element) => {
      element.disabled = true;
    });
    setStatus(t('adminRolesSaving'));
    try {
      await setUserRole({ targetUid: uid, role, granted });
      const member = members.find((entry) => entry.uid === uid);
      if (member) Object.assign(member, projectRoles(member, role, granted));
      setStatus(t('adminRolesSaved'), 'success');
      paint();
    } catch (error) {
      // Never render a raw error object: it can carry internals. The callable
      // already returns operator-safe messages.
      setStatus(error?.message || t('adminRolesFailed'), 'error');
      // Put the toggle back where it was — the change did not happen.
      if (input) input.checked = !granted;
      row?.querySelectorAll('input').forEach((element) => {
        element.disabled = false;
      });
    }
  }

  shell.addEventListener('input', (event) => {
    const search = event.target.closest('[data-role-search]');
    if (!search) return;
    query = search.value;
    // No refocus needed: the input element itself is never replaced.
    paint();
  });

  shell.addEventListener('change', (event) => {
    const input = event.target.closest('[data-role-toggle]');
    if (!input) return;
    void applyChange(input.dataset.roleUid, input.dataset.roleToggle, input.checked, input);
  });

  paint();

  (async () => {
    try {
      members = (await listMembers?.()) || [];
    } catch (error) {
      setStatus(error?.message || t('adminRolesLoadFailed'), 'error');
      members = [];
    }
    paint();
  })();

  return {
    refresh: async () => {
      members = (await listMembers?.()) || [];
      paint();
    },
  };
}
