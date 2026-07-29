import { getCurrentUser, getDb, initFirebase } from './firebase.js';
import { isAdminAuthUser } from './firebase.js';
import { importFirestore } from './firebase-sdk.js';

async function init() {
  const fb = await initFirebase();
  if (!fb) return;

  fb.onAuthStateChanged(async (user) => {
    if (!user) {
      showAuthPanel('Sign in required', 'You need to sign in to access the BoH mapper admin editor.');
      return;
    }
    const admin = await isAdminAuthUser(user);
    if (!admin) {
      showAuthPanel('Admin access required', 'You need admin privileges to access the BoH mapper editor.', 'admin.html');
      return;
    }
    // Admin confirmed — load the mapper core
    loadMapperCore();
  });
}

function showAuthPanel(title, message, linkHref) {
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:var(--bg);z-index:9999;';
  panel.innerHTML = `
    <div style="text-align:center;max-width:400px;padding:2rem;">
      <h2 style="margin-bottom:0.5rem;">${escapeHtml(title)}</h2>
      <p style="color:var(--muted);margin-bottom:1rem;">${escapeHtml(message)}</p>
      ${linkHref ? `<a href="${escapeHtml(linkHref)}" style="color:var(--blue);">Go to sign in →</a>` : ''}
    </div>
  `;
  document.body.appendChild(panel);
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function loadMapperCore() {
  const script = document.createElement('script');
  script.src = 'js/boh-mapper/mapper-core.js';
  script.onload = () => {
    // Core loaded — it self-initializes from localStorage
    console.log('BoH mapper core loaded');
    addPublishButton();
  };
  document.body.appendChild(script);
}

function addPublishButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Publish to members';
  button.style.cssText =
    'background:var(--teal);color:#06231f;padding:10px 16px;border-radius:8px;font-weight:800;border:0;cursor:pointer;';

  const topActions = document.querySelector('.top-actions');
  if (topActions) {
    topActions.appendChild(button);
  } else {
    button.style.position = 'fixed';
    button.style.right = '16px';
    button.style.bottom = '16px';
    button.style.zIndex = '9999';
    document.body.appendChild(button);
  }

  button.addEventListener('click', () => publishMapperState(button));
}

async function publishMapperState(button) {
  if (!window.BohMapper || typeof window.BohMapper.snapshotState !== 'function') {
    alert('Mapper core is not loaded yet.');
    return;
  }

  const state = window.BohMapper.snapshotState();
  const payload = JSON.stringify(state);
  const bytes = new TextEncoder().encode(payload).length;
  if (bytes > 900000) {
    alert('Plan too large to publish: ' + Math.round(bytes / 1024) + 'KB (limit 900KB).');
    return;
  }

  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Publishing…';

  try {
    const db = getDb();
    if (!db) throw new Error('Firestore is not configured.');
    const user = getCurrentUser();
    if (!user) throw new Error('You must be signed in to publish.');

    const { doc, getDoc, setDoc, serverTimestamp } = await importFirestore();

    const configRef = doc(db, 'boh_allstar_config', 'current');
    const configSnap = await getDoc(configRef);
    const season = configSnap.exists() ? configSnap.data()?.activeSeason : null;
    if (!season) {
      alert('No active season is configured. Set an active season before publishing.');
      return;
    }

    const mapperRef = doc(db, 'boh_allstar', season, 'mapper', 'current');
    const existingSnap = await getDoc(mapperRef);
    if (existingSnap.exists()) {
      const existing = existingSnap.data();
      const publishedAtText = existing?.publishedAt?.toDate
        ? existing.publishedAt.toDate().toLocaleString()
        : String(existing?.publishedAt || 'an earlier time');
      const confirmed = confirm(
        `Overwrite the plan published at ${publishedAtText} by ${existing?.publishedBy || 'unknown'}?`
      );
      if (!confirmed) return;
    }

    await setDoc(mapperRef, {
      schemaVersion: 1,
      publishedAt: serverTimestamp(),
      publishedBy: user.uid,
      seasonId: season,
      state: payload,
    });

    button.textContent = 'Published ✓';
    setTimeout(() => {
      button.textContent = originalLabel;
    }, 2000);
  } catch (err) {
    console.error('Failed to publish BoH mapper state', err);
    alert('Publish failed: ' + (err?.message || err));
    button.textContent = originalLabel;
  } finally {
    button.disabled = false;
  }
}

init();
