// js/comments.js - Threaded Comments with Name Input
import { escapeHtml } from './utils.js';
import { importFirebaseAuth, importFirestore } from './firebase-sdk.js';

async function getFirestoreDb() {
  const { initFirebase, ensureAnonymousAuth, getDb } = await import('./firebase.js');
  const firebase = initFirebase();
  if (!firebase?.configured) return null;
  await ensureAnonymousAuth();
  return getDb();
}

let commentsListenerUnsub = null;
let approvedCommentDocs = new Map();
let ownPendingCommentDocs = new Map();
let commentsRenderFrame = 0;
let lastCommentsRenderSignature = '';
const MAX_RENDERED_ROOT_COMMENTS = 120;

// DOM elements
const commentForm = document.getElementById('commentForm');
const commentName = document.getElementById('commentName');
const commentText = document.getElementById('commentText');
const postCommentBtn = document.getElementById('postCommentBtn');
const commentsList = document.getElementById('commentsList');

// Global map to store comments
let allCommentsMap = new Map();
let currentUserId = null;

function scheduleCommentsRender() {
  if (commentsRenderFrame) return;
  const run = () => {
    commentsRenderFrame = 0;
    renderMergedComments();
  };
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    commentsRenderFrame = window.requestAnimationFrame(run);
  } else {
    commentsRenderFrame = setTimeout(run, 0);
  }
}

function commentDocSignature(docSnap) {
  const data = docSnap.data();
  return [
    docSnap.id,
    data.createdAt?.seconds || 0,
    data.parentId || '',
    data.authorId || '',
    data.approved === false ? '0' : '1',
    data.public === false ? '0' : '1',
    String(data.name || ''),
    String(data.text || '').length,
  ].join(':');
}

export async function initComments() {
  try {
    wireCommentsUI();
    const listening = await startCommentsListener();
    if (!listening) {
      renderCommentsUnavailable();
      return;
    }
  } catch (err) {
    console.warn('[comments] disabled:', err?.message || err);
    renderCommentsUnavailable(err?.message || 'Could not connect to Firebase comments.');
  }
}

/* -------------------------------------------------- */
/* UI: Card Creation                                   */
/* -------------------------------------------------- */

function createCommentCard(id, data, isReply = false) {
  const wrapper = document.createElement('div');
  wrapper.id = `comment-${id}`;
  const dt = data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : new Date();
  const timeStr = dt.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const displayName = data.name?.trim() || 'Anonymous';
  const safeName = escapeHtml(displayName);
  const safeText = escapeHtml(data.text || '');
  const initial = escapeHtml(displayName[0].toUpperCase());
  const isOwn = data.authorId && data.authorId === currentUserId;

  // Pick a gradient for avatar based on name char code
  const gradients = [
    'comment-avatar--blue', 'comment-avatar--violet',
    'comment-avatar--emerald', 'comment-avatar--orange',
    'comment-avatar--sky', 'comment-avatar--pink',
  ];
  const grad = gradients[(displayName.charCodeAt(0) || 65) % gradients.length];

  if (isReply) {
    wrapper.className = 'comment-card comment-card--reply';
  } else {
    wrapper.className = 'comment-card';
  }

  wrapper.innerHTML = `
    <div class="comment-avatar-wrap">
      <div class="comment-avatar ${grad}">
        ${initial}
      </div>
    </div>
    <div class="comment-body">
      <div class="comment-meta-row">
        <span class="comment-author">${safeName}</span>
        <span class="comment-time">${escapeHtml(timeStr)}</span>
        ${isOwn ? `<button class="del-btn comment-delete-btn">Delete</button>` : ''}
      </div>
      <p class="comment-text">${safeText}</p>
      <div class="comment-action-row">
        <button class="reply-btn comment-reply-btn">
          <svg class="comment-reply-icon" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m15 15-6 6m0 0-6-6m6 6V9a6 6 0 0 1 12 0v3"/></svg>
          Reply
        </button>
      </div>
      <div id="reply-form-${id}" class="comment-reply-form hidden">
        <input type="text" id="reply-name-${id}" class="comment-reply-field" placeholder="Your name (optional)">
        <textarea id="reply-input-${id}" class="comment-reply-field" rows="2" placeholder="Write a reply..."></textarea>
        <div class="comment-reply-actions">
          <button class="submit-reply-btn comment-reply-submit">Post Reply</button>
          <button class="cancel-reply-btn comment-reply-cancel">Cancel</button>
        </div>
      </div>
      <div id="replies-${id}" class="comment-replies ${isReply ? 'hidden' : ''}"></div>
    </div>
  `;

  // Wire buttons
  const replyBtn = wrapper.querySelector('.reply-btn');
  if (replyBtn) replyBtn.onclick = () => toggleReplyForm(id);

  const delBtn = wrapper.querySelector('.del-btn');
  if (delBtn) delBtn.onclick = () => deleteComment(id);

  const submitReplyBtn = wrapper.querySelector('.submit-reply-btn');
  if (submitReplyBtn) submitReplyBtn.onclick = () => window.submitReply(id);

  const cancelReplyBtn = wrapper.querySelector('.cancel-reply-btn');
  if (cancelReplyBtn) cancelReplyBtn.onclick = () => document.getElementById(`reply-form-${id}`).classList.add('hidden');

  return wrapper;
}

/* -------------------------------------------------- */
/* Logic: Render Tree                                  */
/* -------------------------------------------------- */

function renderCommentsTree(docs) {
  if (!commentsList) return;
  commentsList.innerHTML = '';
  allCommentsMap.clear();

  const roots = [];
  const replies = [];

  docs.forEach(docSnap => {
    const data = docSnap.data();
    const item = { id: docSnap.id, ...data };
    if (data.approved === false && data.authorId !== currentUserId) return;
    allCommentsMap.set(item.id, item);
    if (item.parentId) { replies.push(item); } else { roots.push(item); }
  });
  const visibleRoots = roots.slice(0, MAX_RENDERED_ROOT_COMMENTS);
  const visibleRootIds = new Set(visibleRoots.map((root) => root.id));
  const visibleReplies = replies.filter((reply) => visibleRootIds.has(reply.parentId));

  // Update count label
  const countLabel = document.getElementById('commentsCountLabel');
  if (countLabel) {
    countLabel.textContent = roots.length === 0
      ? 'No comments yet — be the first!'
      : `${roots.length} comment${roots.length !== 1 ? 's' : ''}`;
  }

  if (countLabel && roots.length > MAX_RENDERED_ROOT_COMMENTS) {
    countLabel.textContent = `Showing latest ${MAX_RENDERED_ROOT_COMMENTS} of ${roots.length} comments`;
  }

  if (roots.length === 0) {
    commentsList.innerHTML = `
      <div class="comment-empty-state comment-empty-state--large">
        <div class="comment-empty-icon">
          <svg class="comment-empty-svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"/></svg>
        </div>
        <p class="comment-empty-title">No comments yet</p>
        <p class="comment-empty-copy">Be the first to share a suggestion!</p>
      </div>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  visibleRoots.forEach(root => {
    const card = createCommentCard(root.id, root, false);
    fragment.appendChild(card);
  });
  commentsList.appendChild(fragment);

  visibleReplies.reverse().forEach(reply => {
    const parentContainer = document.getElementById(`replies-${reply.parentId}`);
    if (parentContainer) {
      const card = createCommentCard(reply.id, reply, true);
      parentContainer.appendChild(card);
    }
  });
}

function createdAtMillis(docSnap) {
  const data = docSnap.data();
  return data.createdAt?.seconds ? data.createdAt.seconds * 1000 : 0;
}

function renderMergedComments() {
  const docsById = new Map([
    ...approvedCommentDocs.entries(),
    ...ownPendingCommentDocs.entries()
  ]);
  const docs = [...docsById.values()].sort((a, b) => createdAtMillis(b) - createdAtMillis(a));
  const signature = docs.map(commentDocSignature).join('|');
  if (signature === lastCommentsRenderSignature) return;
  lastCommentsRenderSignature = signature;
  renderCommentsTree(docs);
}

function replaceSnapshotDocs(target, snap) {
  target.clear();
  snap.docs.forEach((docSnap) => target.set(docSnap.id, docSnap));
  scheduleCommentsRender();
}

function renderCommentsUnavailable(message = 'Firebase comments are disabled for this session.') {
  const countLabel = document.getElementById('commentsCountLabel');
  if (countLabel) countLabel.textContent = 'Comments unavailable';
  if (!commentsList) return;
  commentsList.innerHTML = `
    <div class="comment-empty-state">
      <div class="comment-empty-icon">
        <svg class="comment-empty-svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008Zm0-12.75a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z"/></svg>
      </div>
      <p class="comment-empty-title">Comments are unavailable</p>
      <p class="comment-empty-copy">${escapeHtml(message)}</p>
    </div>`;
}

/* -------------------------------------------------- */
/* Logic: Actions                                      */
/* -------------------------------------------------- */

// Expose to window so inline HTML onclicks work
window.submitReply = async (parentId) => {
  const input = document.getElementById(`reply-input-${parentId}`);
  const nameInput = document.getElementById(`reply-name-${parentId}`); // CHANGED: Grab specific name input
  
  const text = input.value.trim();
  if (!text) return;

  // Use the local name input, default to 'Guest' if empty
  const displayName = nameInput.value.trim() || 'Guest';

  try {
    await addCommentToDb(text, displayName, parentId);
    input.value = '';
    // Optional: Clear name or keep it? Keeping it is usually friendlier if they reply twice.
    document.getElementById(`reply-form-${parentId}`).classList.add('hidden');
  } catch (e) {
    alert('Error posting reply: ' + e.message);
  }
};

function toggleReplyForm(id) {
  const form = document.getElementById(`reply-form-${id}`);
  form.classList.toggle('hidden');
  // Auto-focus the name field if opening and scroll it into view
  if (!form.classList.contains('hidden')) {
    const nameField = document.getElementById(`reply-name-${id}`);
    if (nameField) {
      nameField.focus({ preventScroll: true });
      setTimeout(() => form.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    }
  }
}

async function deleteComment(docId) {
  if (!confirm('Delete this comment?')) return;
  try {
    const db = await getFirestoreDb();
    if (!db) throw new Error('Firebase comments are not configured');
    const { deleteDoc, doc } = await importFirestore();
    await deleteDoc(doc(db, 'comments', docId));
  } catch (e) {
    console.warn('[comments] delete skipped:', e?.message || e);
    alert('Could not delete comment: ' + (e?.message || 'Firebase error'));
  }
}

async function addCommentToDb(text, name, parentId = null) {
  const db = await getFirestoreDb();
  if (!db) throw new Error('Firebase comments are not configured');
  const { addDoc, collection, serverTimestamp } = await importFirestore();

  await addDoc(collection(db, 'comments'), {
    text,
    name: name || null,
    parentId: parentId,
    authorId: currentUserId,
    createdAt: serverTimestamp(),
    approved: false,
    public: true
  });
}

/* -------------------------------------------------- */
/* Firestore Listener                                  */
/* -------------------------------------------------- */

async function startCommentsListener() {
  if (commentsListenerUnsub) commentsListenerUnsub();
  approvedCommentDocs = new Map();
  ownPendingCommentDocs = new Map();
  const db = await getFirestoreDb();
  if (!db) return false;
  const { collection, query, where, onSnapshot } = await importFirestore();
  const { getAuth } = await importFirebaseAuth();
  const auth = getAuth();
  currentUserId = auth.currentUser?.uid || null;
  if (!currentUserId) return false;

  const commentsRef = collection(db, 'comments');
  const approvedQuery = query(
    commentsRef,
    where('approved', '==', true),
    where('public', '==', true)
  );
  const ownPendingQuery = query(
    commentsRef,
    where('authorId', '==', currentUserId),
    where('approved', '==', false)
  );

  const unsubscribeApproved = onSnapshot(
    approvedQuery,
    (snap) => {
      currentUserId = auth.currentUser?.uid || null;
      replaceSnapshotDocs(approvedCommentDocs, snap);
    },
    (err) => {
      console.warn('[comments] listener failed:', err?.message || err);
      renderCommentsUnavailable(err?.message || 'Could not load comments from Firebase.');
    }
  );

  const unsubscribeOwnPending = onSnapshot(
    ownPendingQuery,
    (snap) => {
      currentUserId = auth.currentUser?.uid || null;
      replaceSnapshotDocs(ownPendingCommentDocs, snap);
    },
    (err) => {
      console.warn('[comments] pending listener failed:', err?.message || err);
    }
  );

  commentsListenerUnsub = () => {
    unsubscribeApproved();
    unsubscribeOwnPending();
    approvedCommentDocs.clear();
    ownPendingCommentDocs.clear();
  };
  return true;
}

function wireCommentsUI() {
  if (!commentForm) return;
  commentForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const text = commentText.value.trim();
    if (!text) return;
    
    postCommentBtn.disabled = true;
    try {
      await addCommentToDb(text, commentName.value.trim(), null);
      commentText.value = '';
    } catch (e) {
      console.warn('[comments] post skipped:', e?.message || e);
      alert('Could not post comment: ' + (e?.message || 'Firebase error'));
    } finally {
      postCommentBtn.disabled = false;
    }
  });
}
