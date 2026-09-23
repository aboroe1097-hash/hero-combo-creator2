// js/admin-complaints.js
//
// The superadmin-only Complaints surface inside VTS Admin.
//
// Like js/admin-roles-controller.js, this module renders and nothing else: the
// list read, the review write and the Storage URL resolution all arrive as
// injected functions. That keeps it unit-testable without Firebase, and it
// cannot reach the network on its own. The boundary itself is firestore.rules
// (complaints/records is superadmin read/update, create-only for members) and
// storage.rules (superadmin read); hiding the tab from a non-superadmin is a
// courtesy, never the control.
//
// It is loaded lazily from js/ocr-dashboard.js on first open, so none of this
// reaches an admin who never looks at complaints.

export const COMPLAINT_CATEGORIES = Object.freeze([
  'bug',
  'conduct',
  'fair-play',
  'alliance',
  'other',
]);

// Mirrors the option values in eden-x2.html, one short label per category.
export const COMPLAINT_CATEGORY_LABELS = Object.freeze({
  bug: 'edenX1ComplaintCategoryBug',
  conduct: 'edenX1ComplaintCategoryConduct',
  'fair-play': 'edenX1ComplaintCategoryFairPlay',
  alliance: 'edenX1ComplaintCategoryAlliance',
  other: 'edenX1ComplaintCategoryOther',
});

export function complaintCategoryLabel(category, t) {
  const key = COMPLAINT_CATEGORY_LABELS[String(category || '')] || COMPLAINT_CATEGORY_LABELS.other;
  return t(key);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// The document is a member's own words, so it is rendered as text only. Newlines
// are kept because a description with paragraphs is common and worth preserving.
function escapeMultiline(value) {
  return escapeHtml(value).replaceAll('\n', '<br />');
}

function timestampMs(item) {
  const value = Number(item?.createdAtMs);
  return Number.isFinite(value) ? value : 0;
}

export function sortComplaintsNewestFirst(items) {
  return [...(Array.isArray(items) ? items : [])].sort((a, b) => timestampMs(b) - timestampMs(a));
}

export function filterComplaints(items, showReviewed) {
  const rows = sortComplaintsNewestFirst(items);
  return showReviewed === true ? rows : rows.filter((item) => item?.reviewed !== true);
}

export function openComplaintCount(items) {
  return (Array.isArray(items) ? items : []).filter((item) => item?.reviewed !== true).length;
}

function formatTimestamp(item, formatDate) {
  const ms = timestampMs(item);
  if (!ms) return '';
  try {
    return formatDate(ms) || '';
  } catch {
    return '';
  }
}

function imageHtml(item, index, t) {
  const path = String(item?.images?.[index] || '');
  if (!path) return '';
  return `<img class="dash-complaint-thumb" data-complaint-image="${escapeHtml(path)}" alt="${escapeHtml(
    t('adminComplaintsImageAlt', { n: String(index + 1) })
  )}" loading="lazy" />`;
}

function complaintRowHtml(item, { t, formatDate }) {
  const reviewed = item?.reviewed === true;
  const author =
    item?.anonymous === true
      ? `<span class="dash-complaint-anon">${escapeHtml(t('adminComplaintsAnonymous'))}</span>`
      : `<span class="dash-complaint-author">${escapeHtml(
          t('adminComplaintsFiledBy', { name: String(item?.submittedByName || '') || '—' })
        )}</span>`;
  const images = Array.isArray(item?.images) ? item.images.slice(0, 3) : [];
  const thumbs = images.length
    ? `<div class="dash-complaint-thumbs">${images
        .map((_, index) => imageHtml(item, index, t))
        .join('')}</div>`
    : '';
  return `<article class="dash-complaint-row" data-complaint-id="${escapeHtml(item?.id || '')}" data-reviewed="${
    reviewed ? 'true' : 'false'
  }">
    <header class="dash-complaint-row-hdr">
      <span class="dash-complaint-category" data-category="${escapeHtml(item?.category || 'other')}">${escapeHtml(
        complaintCategoryLabel(item?.category, t)
      )}</span>
      <time class="dash-complaint-time" datetime="${escapeHtml(timestampMs(item) ? new Date(timestampMs(item)).toISOString() : '')}">${escapeHtml(
        formatTimestamp(item, formatDate)
      )}</time>
      ${author}
    </header>
    <p class="dash-complaint-body">${escapeMultiline(item?.description || '')}</p>
    ${thumbs}
    <footer class="dash-complaint-actions">
      <button class="dash-btn dash-btn-xs" type="button" data-complaint-review="${escapeHtml(item?.id || '')}" data-next="${
        reviewed ? 'false' : 'true'
      }" aria-pressed="${reviewed ? 'true' : 'false'}">${escapeHtml(
        reviewed ? t('adminComplaintsReviewed') : t('adminComplaintsMarkReviewed')
      )}</button>
    </footer>
  </article>`;
}

export function renderComplaintsController(mount, deps = {}) {
  if (!mount) return null;
  const t = typeof deps.t === 'function' ? deps.t : (key) => key;
  const formatDate = typeof deps.formatDate === 'function' ? deps.formatDate : () => '';
  const listComplaints =
    typeof deps.listComplaints === 'function' ? deps.listComplaints : async () => [];
  const reviewComplaint =
    typeof deps.reviewComplaint === 'function' ? deps.reviewComplaint : async () => {};
  const resolveImageUrl = typeof deps.resolveImageUrl === 'function' ? deps.resolveImageUrl : null;

  const state = { items: [], loading: false, error: '', showReviewed: false };

  mount.innerHTML = `<div class="dash-card dash-complaints-card">
    <div class="dash-card-hdr dash-card-hdr-wrap">
      <div>
        <h2 class="dash-card-title"><span>${escapeHtml(t('adminComplaintsTitle'))}</span></h2>
        <p class="dash-card-subtitle">${escapeHtml(t('adminComplaintsSubtitle'))}</p>
      </div>
      <div class="dash-card-actions">
        <button id="dashComplaintsShowReviewed" class="dash-btn" type="button" aria-pressed="false">
          <span>${escapeHtml(t('adminComplaintsShowReviewed'))}</span>
        </button>
        <button id="dashComplaintsRefreshBtn" class="dash-btn" type="button">
          <span>${escapeHtml(t('adminComplaintsRefresh'))}</span>
        </button>
      </div>
    </div>
    <div id="dashComplaintsStatus" class="dash-upload-status hidden" role="status" aria-live="polite"></div>
    <section id="dashComplaintsList" class="dash-complaints-list">
      <div class="dash-empty">${escapeHtml(t('adminComplaintsLoading'))}</div>
    </section>
  </div>`;

  const listEl = mount.querySelector('#dashComplaintsList');
  const statusEl = mount.querySelector('#dashComplaintsStatus');
  const refreshBtn = mount.querySelector('#dashComplaintsRefreshBtn');
  const reviewedToggle = mount.querySelector('#dashComplaintsShowReviewed');

  async function hydrateImages() {
    if (!resolveImageUrl || !listEl) return;
    const pending = [...listEl.querySelectorAll('img[data-complaint-image]')];
    for (const image of pending) {
      const path = image.getAttribute('data-complaint-image');
      try {
        const url = await resolveImageUrl(path);
        if (url) image.src = url;
        else throw new Error('no url');
      } catch {
        const fallback = document.createElement('span');
        fallback.className = 'dash-complaint-thumb-failed';
        fallback.textContent = t('adminComplaintsImageFailed');
        image.replaceWith(fallback);
      }
    }
  }

  function renderList() {
    if (!listEl) return;
    if (state.loading && !state.items.length) {
      listEl.innerHTML = `<div class="dash-empty">${escapeHtml(t('adminComplaintsLoading'))}</div>`;
      return;
    }
    if (state.error) {
      listEl.innerHTML = `<div class="dash-empty" role="alert">${escapeHtml(state.error)}</div>`;
      return;
    }
    const rows = filterComplaints(state.items, state.showReviewed);
    if (!rows.length) {
      listEl.innerHTML = `<div class="dash-empty">${escapeHtml(t('adminComplaintsEmpty'))}</div>`;
      return;
    }
    listEl.innerHTML = rows.map((item) => complaintRowHtml(item, { t, formatDate })).join('');
    void hydrateImages();
  }

  function setStatus(key, type) {
    if (!statusEl) return;
    if (!key) {
      statusEl.classList.add('hidden');
      statusEl.textContent = '';
      return;
    }
    statusEl.classList.remove('hidden');
    statusEl.textContent = t(key);
    statusEl.dataset.state = type || 'info';
  }

  async function load() {
    state.loading = true;
    state.error = '';
    setStatus('');
    renderList();
    try {
      state.items = sortComplaintsNewestFirst(await listComplaints());
    } catch (error) {
      console.error('COMPLAINTS LOAD ERROR:', error);
      state.items = [];
      state.error = t('adminComplaintsLoadFailed');
    } finally {
      state.loading = false;
      renderList();
    }
  }

  async function review(id, next) {
    if (!id || !listEl) return;
    const row = listEl.querySelector(`[data-complaint-id="${CSS.escape(id)}"]`);
    const button = row?.querySelector('[data-complaint-review]');
    if (button) button.disabled = true;
    try {
      await reviewComplaint(id, next);
      const item = state.items.find((entry) => entry?.id === id);
      if (item) item.reviewed = next;
      setStatus('', '');
    } catch (error) {
      console.error('COMPLAINT REVIEW ERROR:', error);
      setStatus('adminComplaintsReviewFailed', 'error');
      if (button) button.disabled = false;
      return;
    }
    renderList();
  }

  refreshBtn?.addEventListener('click', () => {
    refreshBtn.disabled = true;
    void load().finally(() => {
      refreshBtn.disabled = false;
    });
  });

  reviewedToggle?.addEventListener('click', () => {
    state.showReviewed = !state.showReviewed;
    reviewedToggle.setAttribute('aria-pressed', state.showReviewed ? 'true' : 'false');
    reviewedToggle.classList.toggle('dash-btn-active', state.showReviewed);
    renderList();
  });

  listEl?.addEventListener('click', (event) => {
    const button = event.target?.closest?.('[data-complaint-review]');
    if (!button) return;
    const id = button.getAttribute('data-complaint-review');
    const next = button.getAttribute('data-next') === 'true';
    void review(id, next);
  });

  void load();

  return {
    reload: load,
    setShowReviewed(value) {
      state.showReviewed = value === true;
      reviewedToggle?.setAttribute('aria-pressed', state.showReviewed ? 'true' : 'false');
      renderList();
    },
    openCount: () => openComplaintCount(state.items),
  };
}
