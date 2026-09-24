// "Issue or Complaint" filing for the public Eden page.
//
// The form is the member-facing front door for a collection only superadmins
// can read (firestore.rules: complaints/{id}). Two properties shape the
// rest of this module:
//
// 1. Anonymity is structural. When the anonymous box is checked the document
//    that goes out carries no identity field at all — not a hidden one, not an
//    obfuscated one. buildComplaintDocument() simply never adds them, and the
//    rules reject the write if they appear, so the promise cannot be broken by
//    a later UI change.
// 2. Images go to Cloud Storage first, under the filing's own random id
//    (complaints/{complaintId}/…), and only their paths are stored on the
//    complaint. The path never carries the uploader's uid, so an anonymous
//    filing with screenshots stays anonymous; the rules pin every stored path
//    to the document's own id, so a filing cannot point at another's images.
// 3. A per-session throttle document is written in the same batch; the rules
//    refuse a second filing from one session within ten minutes.
//
// eden-x2.html loads this as its own module. The page is already signed in
// anonymously through js/firebase-eden.js, so no new auth work is needed, and
// the write reuses Firestore Lite — the same lightweight SDK the dashboard uses.

export const EDEN_COMPLAINT_COLLECTION = 'complaints';
export const EDEN_COMPLAINT_THROTTLE_COLLECTION = 'complaint_throttle';
export const EDEN_COMPLAINT_STORAGE_ROOT = 'complaints';
export const EDEN_COMPLAINT_CATEGORIES = Object.freeze([
  'bug',
  'missing',
  'conduct',
  'fair-play',
  'alliance',
  'other',
]);
export const EDEN_COMPLAINT_MAX_IMAGES = 3;
export const EDEN_COMPLAINT_MIN_DESCRIPTION = 10;
export const EDEN_COMPLAINT_MAX_DESCRIPTION = 4000;
export const EDEN_COMPLAINT_MAX_NAME = 80;
// Phone screenshots are 3-6 MB and far wider than a reviewer needs to read, so
// re-encode to a long edge of 1280px before upload.
export const EDEN_COMPLAINT_MAX_IMAGE_EDGE = 1280;
export const EDEN_COMPLAINT_JPEG_QUALITY = 0.82;
// Kept in step with storage.rules, which refuses anything larger.
export const EDEN_COMPLAINT_MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/avif',
]);

const IMAGE_NAME_PATTERN = /^[A-Za-z0-9_-]{1,150}\.(?:jpg|jpeg|png|webp)$/;

function text(value) {
  return typeof value === 'string' ? value : '';
}

// Client-side counterpart of firestore.rules' validComplaintImage(): every
// segment is bounded and stripped, so a name derived from the device's original
// filename can never reach the server in a shape the rules would reject.
export function complaintImageFileName(complaintId, index, now = Date.now(), entropy = '') {
  const owner = String(complaintId || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 40);
  const stamp = Math.max(0, Math.floor(Number(now) || 0)).toString(36);
  const noise = String(entropy || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 12);
  const suffix = noise || Math.random().toString(36).slice(2, 10);
  const base = `${stamp}-${Math.max(0, Math.floor(Number(index) || 0))}-${suffix}`.slice(0, 150);
  return { owner, name: `${base}.jpg` };
}

export function buildComplaintImagePath(complaintId, fileName) {
  return `${EDEN_COMPLAINT_STORAGE_ROOT}/${String(complaintId || '')}/${String(fileName || '')}`;
}

export function isComplaintImageName(fileName) {
  return IMAGE_NAME_PATTERN.test(String(fileName || ''));
}

// The document written to complaints/{id}. Identity fields are added ONLY on
// the named path; no call of this function can produce an anonymous document
// that still carries `submittedBy`.
export function buildComplaintDocument({
  category,
  description,
  images,
  anonymous,
  name,
  uid,
} = {}) {
  const document = {
    category: EDEN_COMPLAINT_CATEGORIES.includes(category) ? category : 'other',
    description: text(description).trim().slice(0, EDEN_COMPLAINT_MAX_DESCRIPTION),
    images: (Array.isArray(images) ? images : []).slice(0, EDEN_COMPLAINT_MAX_IMAGES),
    anonymous: anonymous === true,
    reviewed: false,
  };
  if (!document.anonymous) {
    document.submittedBy = String(uid || '');
    document.submittedByName = text(name).trim().slice(0, EDEN_COMPLAINT_MAX_NAME);
  }
  return document;
}

// Returns the i18n key of the first problem, or '' when the draft is sendable.
// The same limits live in firestore.rules; this copy exists so the form can
// explain itself in the member's language before a write is attempted.
export function validateComplaintDraft({ description, anonymous, name, images } = {}) {
  const trimmed = text(description).trim();
  if (trimmed.length < EDEN_COMPLAINT_MIN_DESCRIPTION) return 'edenX1ComplaintErrDescription';
  if (trimmed.length > EDEN_COMPLAINT_MAX_DESCRIPTION) return 'edenX1ComplaintErrDescription';
  if ((Array.isArray(images) ? images.length : 0) > EDEN_COMPLAINT_MAX_IMAGES) {
    return 'edenX1ComplaintErrImages';
  }
  if (anonymous !== true && !text(name).trim()) return 'edenX1ComplaintErrName';
  return '';
}

export function isAcceptedComplaintImage(file) {
  if (!file) return false;
  const type = text(file.type).toLowerCase();
  if (type) return ACCEPTED_IMAGE_TYPES.includes(type);
  return /\.(?:jpe?g|png|webp|gif|bmp|avif)$/i.test(text(file.name));
}

function defaultDecodeImage(file) {
  if (typeof globalThis.createImageBitmap === 'function') {
    return globalThis.createImageBitmap(file);
  }
  // Older mobile Safari has no createImageBitmap; decode through an <img> and
  // revoke the object URL as soon as the bitmap is painted.
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined' || typeof URL?.createObjectURL !== 'function') {
      reject(new Error('image decoding unavailable'));
      return;
    }
    const url = URL.createObjectURL(file);
    const image = document.createElement('img');
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image could not be decoded'));
    };
    image.src = url;
  });
}

function defaultCreateCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob !== 'function') {
      reject(new Error('canvas encoding unavailable'));
      return;
    }
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))),
      type,
      quality
    );
  });
}

// Downscale and re-encode, following the canvas path js/all-star-boh-ocr.js
// uses for OCR screenshots. The decode/canvas/encode hooks are injectable so
// the scale maths can be exercised without a DOM.
export async function resizeComplaintImage(file, options = {}) {
  const maxEdge = Number(options.maxEdge) || EDEN_COMPLAINT_MAX_IMAGE_EDGE;
  const quality = Number(options.quality) || EDEN_COMPLAINT_JPEG_QUALITY;
  const decodeImage = options.decodeImage || defaultDecodeImage;
  const createCanvas = options.createCanvas || defaultCreateCanvas;
  const encode = options.encode || canvasToBlob;

  const source = await decodeImage(file);
  const sourceWidth = Number(source?.width ?? source?.naturalWidth);
  const sourceHeight = Number(source?.height ?? source?.naturalHeight);
  if (
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0
  ) {
    throw new Error('invalid image dimensions');
  }
  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = createCanvas(width, height);
  const context = canvas.getContext?.('2d');
  if (!context || typeof context.drawImage !== 'function') throw new Error('canvas unavailable');
  context.drawImage(source, 0, 0, width, height);
  source.close?.();
  const blob = await encode(canvas, 'image/jpeg', quality);
  return { blob, width, height };
}

let i18nModules = null;

function loadI18n() {
  if (!i18nModules) {
    i18nModules = Promise.all([import('./translations.js'), import('./state.js')]).catch(
      (error) => {
        i18nModules = null;
        throw error;
      }
    );
  }
  return i18nModules;
}

async function translate(key, vars = {}) {
  const [{ translations }, { currentLanguage }] = await loadI18n();
  const dict = translations[currentLanguage] || translations.en || {};
  let value = dict[key] || translations.en?.[key] || key;
  Object.entries(vars).forEach(([name, replacement]) => {
    value = value.replaceAll(`{${name}}`, String(replacement));
  });
  return value;
}

// Attached images live outside the DOM so a language change can re-render the
// previews without discarding what the member already picked.
const pickedImages = [];

function releasePickedImage(entry) {
  if (entry?.previewUrl && typeof URL?.revokeObjectURL === 'function') {
    URL.revokeObjectURL(entry.previewUrl);
  }
}

function clearPickedImages() {
  while (pickedImages.length) releasePickedImage(pickedImages.pop());
}

function renderImageList(host, removeLabel) {
  if (!host) return;
  host.replaceChildren();
  if (!pickedImages.length) {
    host.hidden = true;
    return;
  }
  pickedImages.forEach((entry, index) => {
    const item = document.createElement('figure');
    item.className = 'eden-x1-complaint-thumb';
    const image = document.createElement('img');
    image.src = entry.previewUrl;
    image.alt = removeLabel;
    image.loading = 'lazy';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'eden-x1-complaint-thumb-remove';
    remove.setAttribute('data-complaint-remove', String(index));
    remove.setAttribute('aria-label', removeLabel);
    remove.textContent = '\u00d7';
    item.append(image, remove);
    host.append(item);
  });
  host.hidden = false;
}

async function addPickedFiles(files, refreshStatus) {
  const accepted = files
    .filter((file) => isAcceptedComplaintImage(file))
    .slice(0, Math.max(0, EDEN_COMPLAINT_MAX_IMAGES - pickedImages.length));
  if (!accepted.length) {
    await refreshStatus('edenX1ComplaintErrImages', 'error');
    return false;
  }
  for (const file of accepted) {
    try {
      const { blob } = await resizeComplaintImage(file);
      if (!blob || blob.size > EDEN_COMPLAINT_MAX_IMAGE_BYTES) throw new Error('image too large');
      if (typeof URL?.createObjectURL !== 'function') throw new Error('preview unavailable');
      pickedImages.push({ blob, previewUrl: URL.createObjectURL(blob) });
    } catch {
      await refreshStatus('edenX1ComplaintErrImages', 'error');
    }
  }
  return true;
}

async function uploadComplaintImages(app, complaintId) {
  const { importFirebaseStorage } = await import('./firebase-sdk.js');
  const { getStorage, ref, uploadBytes } = await importFirebaseStorage();
  const storage = getStorage(app);
  const paths = [];
  for (const [index, entry] of pickedImages.entries()) {
    const { owner, name } = complaintImageFileName(complaintId, index);
    const path = buildComplaintImagePath(owner, name);
    if (!isComplaintImageName(name)) throw new Error('invalid image name');
    await uploadBytes(ref(storage, path), entry.blob, { contentType: 'image/jpeg' });
    paths.push(path);
  }
  return paths;
}

async function submitComplaint({ category, description, anonymous, name }) {
  const [{ importFirestoreLite }, { initFirebase, ensureAnonymousAuth }] = await Promise.all([
    import('./firebase-sdk.js'),
    import('./firebase-eden.js'),
  ]);
  const { configured, app } = initFirebase();
  if (!configured || !app) throw new Error('firebase-unconfigured');
  const user = await ensureAnonymousAuth();
  const { getFirestore, collection, doc, writeBatch, serverTimestamp } =
    await importFirestoreLite();
  const db = getFirestore(app);
  // The document id is minted first so the screenshots can live under it
  // rather than under the uploader's uid.
  const complaintRef = doc(collection(db, EDEN_COMPLAINT_COLLECTION));
  const images = pickedImages.length ? await uploadComplaintImages(app, complaintRef.id) : [];
  const document = buildComplaintDocument({
    category,
    description,
    images,
    anonymous,
    name,
    uid: user.uid,
  });
  const batch = writeBatch(db);
  batch.set(complaintRef, { ...document, createdAt: serverTimestamp() });
  // Rate limit: the rules accept a filing only alongside this stamp, and only
  // when the session's previous stamp is at least ten minutes old.
  batch.set(doc(db, EDEN_COMPLAINT_THROTTLE_COLLECTION, user.uid), {
    lastAt: serverTimestamp(),
  });
  await batch.commit();
  return document;
}

function isFirebaseUnavailableError(error) {
  const code = text(error?.code);
  return (
    code === 'permission-denied' ||
    code === 'storage/unauthorized' ||
    code === 'storage/unknown' ||
    code === 'failed-precondition' ||
    code === 'unavailable'
  );
}

function bindComplaintForm(root) {
  const openButton = root.querySelector('#edenX1ComplaintOpen');
  const cancelButton = root.querySelector('#edenX1ComplaintCancel');
  const form = root.querySelector('#edenX1ComplaintForm');
  const statusEl = root.querySelector('#edenX1ComplaintStatus');
  const imageInput = root.querySelector('#edenX1ComplaintImages');
  const imageList = root.querySelector('#edenX1ComplaintImageList');
  const anonymousInput = root.querySelector('#edenX1ComplaintAnonymous');
  const identityBlock = root.querySelector('#edenX1ComplaintIdentity');
  const nameInput = root.querySelector('#edenX1ComplaintName');
  const descriptionInput = root.querySelector('#edenX1ComplaintDescription');
  const submitButton = root.querySelector('#edenX1ComplaintSubmit');
  if (!openButton || !form) return false;

  // Status text is remembered by key, not by rendered sentence, so a language
  // change can re-translate whatever is on screen instead of blanking it.
  let statusState = { key: '', vars: {}, state: '' };

  async function refreshStatus(key, state = '', vars = {}) {
    statusState = { key, vars, state };
    if (!statusEl) return;
    statusEl.textContent = key ? await translate(key, vars) : '';
    if (state) statusEl.setAttribute('data-state', state);
    else statusEl.removeAttribute('data-state');
  }

  async function refreshImageList() {
    renderImageList(imageList, await translate('edenX1ComplaintRemoveImage'));
  }

  const syncIdentityVisibility = () => {
    if (!identityBlock) return;
    identityBlock.hidden = anonymousInput?.checked !== false;
  };
  syncIdentityVisibility();
  anonymousInput?.addEventListener('change', syncIdentityVisibility);

  openButton.addEventListener('click', () => {
    const opening = form.hidden;
    form.hidden = !opening;
    openButton.setAttribute('aria-expanded', opening ? 'true' : 'false');
    if (opening) descriptionInput?.focus?.({ preventScroll: true });
  });

  cancelButton?.addEventListener('click', () => {
    form.hidden = true;
    openButton.setAttribute('aria-expanded', 'false');
    void refreshStatus('');
    openButton.focus?.({ preventScroll: true });
  });

  imageList?.addEventListener('click', (event) => {
    const button = event.target?.closest?.('[data-complaint-remove]');
    if (!button) return;
    const index = Number(button.getAttribute('data-complaint-remove'));
    if (!Number.isInteger(index) || index < 0 || index >= pickedImages.length) return;
    releasePickedImage(pickedImages[index]);
    pickedImages.splice(index, 1);
    void refreshImageList();
  });

  imageInput?.addEventListener('change', async () => {
    const files = Array.from(imageInput.files || []);
    imageInput.value = '';
    if (!files.length) return;
    void refreshStatus('');
    await addPickedFiles(files, refreshStatus);
    await refreshImageList();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const anonymous = anonymousInput?.checked !== false;
    const draft = {
      category: root.querySelector('#edenX1ComplaintCategory')?.value || 'other',
      description: descriptionInput?.value || '',
      anonymous,
      name: anonymous ? '' : nameInput?.value || '',
      images: pickedImages,
    };
    const problem = validateComplaintDraft(draft);
    if (problem) {
      await refreshStatus(problem, 'error');
      return;
    }
    if (submitButton) submitButton.disabled = true;
    await refreshStatus('edenX1ComplaintSending', 'sending');
    try {
      await submitComplaint(draft);
      clearPickedImages();
      await refreshImageList();
      form.reset();
      syncIdentityVisibility();
      await refreshStatus('edenX1ComplaintSent', 'sent');
    } catch (error) {
      if (text(error?.message) === 'firebase-unconfigured' || isFirebaseUnavailableError(error)) {
        await refreshStatus('edenX1ComplaintErrUnavailable', 'error');
      } else {
        console.warn('[eden-complaints] submit failed:', error);
        await refreshStatus('edenX1ComplaintErrFailed', 'error');
      }
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  // Static copy is refreshed by eden-x1.js through data-i18n attributes; the
  // previews and the live status region are ours to redo.
  window.addEventListener?.('vts:language-change', () => {
    void (async () => {
      await refreshImageList();
      if (statusState.key)
        await refreshStatus(statusState.key, statusState.state, statusState.vars);
    })();
  });

  return true;
}

export function initEdenComplaints(options = {}) {
  if (typeof document === 'undefined') return false;
  const root = options.root || document.getElementById('edenX1Complaints');
  if (!root) return false;
  if (root.dataset.complaintsWired === '1') return true;
  if (!bindComplaintForm(root)) return false;
  root.dataset.complaintsWired = '1';
  // Revealed only once the wiring is in place, so a module that fails to load
  // leaves no dead button on the page.
  root.hidden = false;
  return true;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initEdenComplaints(), { once: true });
  } else {
    initEdenComplaints();
  }
}
