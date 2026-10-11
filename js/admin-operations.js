import {
  OPERATIONS_CONFIG_PATH,
  OPERATIONS_FEATURES,
  normalizeOperationsConfig,
} from './operations-config.js';

const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]
  );

export function renderAdminOperations(mount, { db, firestore, isSuperAdmin = false, uid = '' }) {
  let destroyed = false;
  let config = normalizeOperationsConfig();
  const featureLabels = {
    uploads: 'Uploads & OCR',
    votes: 'Voting',
    comments: 'Comments',
    ai: 'AI assistant',
    competition: 'VTS competition',
    combos: 'Combo publishing',
  };
  mount.innerHTML = `<section class="dash-card"><div class="dash-card-hdr"><div><h2 class="dash-card-title">Website health & operations</h2>
    <p>Display a notice or temporarily pause activity. Super Admins retain recovery access.</p></div></div>
    <p data-operations-status role="status" aria-live="polite">Connecting…</p>
    <p data-operations-summary></p>
    ${
      isSuperAdmin
        ? `<form data-operations-form class="dash-operations-form">
      <label class="dash-form-field dash-form-wide">Public notice <textarea class="dash-input" name="notice" maxlength="2000" rows="3" autocomplete="off" aria-describedby="operationsNoticeHint"></textarea><small id="operationsNoticeHint">Shown to everyone. Keep private diagnostics in the error list below.</small></label>
      <label class="dash-form-check dash-form-wide"><input type="checkbox" name="readOnly"> <span>Pause team and public changes<br><small>Use for an incident affecting several tools.</small></span></label>
      <fieldset class="dash-form-wide"><legend>Pause individual features</legend>${OPERATIONS_FEATURES.map((feature) => `<label class="dash-form-check"><input type="checkbox" name="feature" value="${feature}"> <span>${featureLabels[feature]}</span></label>`).join('')}</fieldset>
      <label class="dash-form-field dash-form-wide">Automatically restore normal operation <input class="dash-input" type="datetime-local" name="expiry" aria-describedby="operationsExpiryHint"><small id="operationsExpiryHint">Leave blank to keep settings active until a Super Admin changes them.</small></label>
      <button class="dash-btn dash-btn-primary dash-form-wide" type="submit">Save operations settings</button>
    </form>`
        : '<p>Only a Super Admin can change operation settings.</p>'
    }
    </section><section class="dash-card"><h2 class="dash-card-title">Recent site errors</h2><p>Newest 30 reports. Resolve removes a report after investigation.</p>
    <button class="dash-btn" type="button" data-refresh-errors>Refresh errors</button><div class="dash-operations-errors" data-operation-errors aria-live="polite"></div></section>`;
  const status = mount.querySelector('[data-operations-status]');
  const form = mount.querySelector('form');
  const configRef = firestore.doc(db, OPERATIONS_CONFIG_PATH);
  function renderSummary(value) {
    mount.querySelector('[data-operations-summary]').textContent = [
      value.notice ? `Public notice: ${value.notice}` : 'No public notice.',
      value.disabledFeatures.length
        ? `Paused features: ${value.disabledFeatures.map((feature) => featureLabels[feature]).join(', ')}.`
        : 'No individual features paused.',
    ].join(' ');
  }
  let dirty = false;
  let conflict = false;
  const unsubscribe = firestore.onSnapshot(
    configRef,
    (snapshot) => {
      if (destroyed) return;
      const next = normalizeOperationsConfig(snapshot.data());
      renderSummary(next);
      if (dirty && next.revision !== config.revision) {
        conflict = true;
        status.textContent =
          'Another operator changed these settings. Reload this tab before saving.';
        return;
      }
      config = next;
      status.textContent = config.readOnly
        ? 'Team changes are paused.'
        : 'Site operation settings are connected.';
      if (form && !dirty) {
        form.elements.notice.value = config.notice;
        form.elements.readOnly.checked = config.readOnly;
        form.querySelectorAll('[name="feature"]').forEach((input) => {
          input.checked = config.disabledFeatures.includes(input.value);
        });
        if (config.expiresAtMs) {
          const date = new Date(config.expiresAtMs);
          form.elements.expiry.value = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        } else form.elements.expiry.value = '';
      }
    },
    (error) => {
      if (!destroyed) status.textContent = `Settings unavailable: ${error.message}`;
    }
  );
  form?.addEventListener('input', () => {
    dirty = true;
  });
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (conflict) return;
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      const expiry = form.elements.expiry.value
        ? new Date(form.elements.expiry.value).getTime()
        : 0;
      if (!Number.isSafeInteger(expiry) || (expiry && expiry <= Date.now()))
        throw new Error('Choose a future expiry.');
      const data = {
        notice: form.elements.notice.value.trim(),
        readOnly: form.elements.readOnly.checked,
        disabledFeatures: [...form.querySelectorAll('[name="feature"]:checked')].map(
          (input) => input.value
        ),
        expiresAtMs: expiry,
        updatedAtMs: Date.now(),
        updatedBy: uid,
        revision: config.revision + 1,
      };
      await firestore.runTransaction(db, async (transaction) => {
        const current = await transaction.get(configRef);
        if ((current.data()?.revision || 0) !== config.revision)
          throw new Error('Settings changed. Reload before saving.');
        transaction.set(configRef, data);
      });
      dirty = false;
      conflict = false;
      config = normalizeOperationsConfig(data);
      renderSummary(config);
      status.textContent = 'Operation settings saved.';
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
  async function refreshErrors() {
    const host = mount.querySelector('[data-operation-errors]');
    try {
      const result = await firestore.getDocs(
        firestore.query(
          firestore.collection(db, 'errors'),
          firestore.orderBy('receivedAt', 'desc'),
          firestore.limit(30)
        )
      );
      if (destroyed) return;
      host.innerHTML = result.empty
        ? '<p>No recent errors.</p>'
        : result.docs
            .map((entry) => {
              const item = entry.data();
              return `<article><strong>${escapeHtml(item.source)}</strong><p>${escapeHtml(item.error?.message)}</p><small>${escapeHtml(item.path)}</small> <button class="dash-btn" type="button" data-resolve-error="${escapeHtml(entry.id)}">Resolve report</button></article>`;
            })
            .join('');
    } catch (error) {
      if (!destroyed) host.textContent = `Errors unavailable: ${error.message}`;
    }
  }
  mount.querySelector('[data-refresh-errors]').addEventListener('click', refreshErrors);
  mount.querySelector('[data-operation-errors]').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-resolve-error]');
    if (!button) return;
    if (!window.confirm('Remove this error report after investigation?')) return;
    button.disabled = true;
    try {
      await firestore.deleteDoc(firestore.doc(db, 'errors', button.dataset.resolveError));
      await refreshErrors();
    } catch (error) {
      status.textContent = error.message;
      button.disabled = false;
    }
  });
  void refreshErrors();
  return {
    destroy() {
      destroyed = true;
      unsubscribe();
      mount.replaceChildren();
    },
  };
}
