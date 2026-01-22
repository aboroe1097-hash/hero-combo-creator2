// js/comments.js
// Realtime comments saved to Firestore

import { ensureAnonymousAuth, getDb } from './firebase.js';

// Firestore unsubscribe handle
let commentsListenerUnsub = null;

// DOM elements (must exist in index.html)
const commentForm = document.getElementById('commentForm');
const commentName = document.getElementById('commentName');
const commentEmail = document.getElementById('commentEmail');
const commentText = document.getElementById('commentText');
const postCommentBtn = document.getElementById('postCommentBtn');
const commentsList = document.getElementById('commentsList');

/**
 * Throttle helper to avoid double-submits.
 */
function throttle(fn, wait = 2000) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last < wait) return;
    last = now;
    return fn(...args);
  };
}

/**
 * PUBLIC ENTRY POINT
 * Call this from app.js AFTER Firebase is initialized
 */
export async function initComments() {
  try {
    // Ensure anonymous auth (or existing auth)
    await ensureAnonymousAuth();

    // Wire UI + start realtime listener
    wireCommentsUI();
    await startCommentsListener();

    console.log('[comments] initialized');
  } catch (err) {
    console.error('[comments] init error:', err);
  }
}

/* -------------------------------------------------- */
/* UI helpers                                          */
/* -------------------------------------------------- */

function createCommentCard(docId, data, currentUid) {
  const wrapper = document.createElement('div');
  wrapper.className = 'comment-card';

  // Avatar (first letter)
  const avatar = document.createElement('div');
  avatar.className = 'comment-avatar';
  let initial = 'U';
  if (data.name && data.name.trim().length > 0) {
    initial = data.name.trim().charAt(0).toUpperCase();
  } else if (data.authorId && data.authorId.length > 0) {
    initial = data.authorId.charAt(0).toUpperCase();
  }
  avatar.textContent = initial;

  // Body
  const body = document.createElement('div');
  body.className = 'comment-body';

  // Meta
  const meta = document.createElement('div');
  meta.className = 'comment-meta';

  const author = document.createElement('div');
  author.textContent =
    data.name && data.name.trim().length > 0 ? data.name.trim() : 'Anonymous';

  const time = document.createElement('div');
  const dt =
    data.createdAt && data.createdAt.seconds
      ? new Date(data.createdAt.seconds * 1000)
      : new Date();
  time.textContent = dt.toLocaleString();

  meta.appendChild(author);
  meta.appendChild(time);

  // Text
  const textEl = document.createElement('div');
  textEl.className = 'comment-text';
  textEl.textContent = data.text || '';

  body.appendChild(meta);
  body.appendChild(textEl);

  // Actions (delete if author)
  if (data.authorId && data.authorId === currentUid) {
    const actions = document.createElement('div');
    actions.className = 'comment-actions';

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.onclick = async () => {
      if (!confirm('Delete this comment?')) return;
      try {
        const { deleteDoc, doc } = await import(
          'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'
        );
        await deleteDoc(doc(getDb(), 'comments', docId));
      } catch (e) {
        console.error('Delete comment error:', e);
        alert('Could not delete comment.');
      }
    };

    actions.appendChild(delBtn);
    body.appendChild(actions);
  }

  wrapper.appendChild(avatar);
  wrapper.appendChild(body);
  return wrapper;
}

/* -------------------------------------------------- */
/* Firestore realtime listener                         */
/* -------------------------------------------------- */

async function startCommentsListener() {
  // Clean up existing listener
  if (commentsListenerUnsub) {
    try {
      commentsListenerUnsub();
    } catch (e) {
      // ignore
    }
    commentsListenerUnsub = null;
  }

  try {
    const db = getDb();
    if (!db) {
      console.warn('[comments] no db available for listener');
      return;
    }

    const {
      collection,
      query,
      where,
      orderBy,
      onSnapshot
    } = await import(
      'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'
    );
    const { getAuth } = await import(
      'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js'
    );

    // Only approved comments – matches strict Firestore rules
    const q = query(
      collection(db, 'comments'),
      where('approved', '==', true),
      orderBy('createdAt', 'desc')
    );

    commentsListenerUnsub = onSnapshot(
      q,
      (snap) => {
        commentsList.innerHTML = '';

        const auth = getAuth();
        const currentUid = auth.currentUser ? auth.currentUser.uid : null;

        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data) return;

          // Extra safety check, though query already filters approved
          const visible =
            data.approved === true ||
            data.public === true ||
            (data.authorId && data.authorId === currentUid);

          if (!visible) return;

          const card = createCommentCard(docSnap.id, data, currentUid);
          commentsList.appendChild(card);
        });
      },
      (err) => {
        console.error('[comments] onSnapshot error:', err);
      }
    );

    console.log('[comments] onSnapshot registered (approved comments)');
  } catch (e) {
    console.error('[comments] listener error:', e);
  }
}

/* -------------------------------------------------- */
/* Form handling                                       */
/* -------------------------------------------------- */

function wireCommentsUI() {
  if (!commentForm) {
    console.warn('[comments] commentForm not found in DOM');
    return;
  }

  const handleSubmit = throttle(async (ev) => {
    ev.preventDefault();

    const textVal =
      commentText && commentText.value ? commentText.value.trim() : '';
    if (!textVal) {
      alert('Please enter a comment.');
      return;
    }
    if (textVal.length > 1000) {
      alert('Comment too long (max 1000 characters).');
      return;
    }

    if (postCommentBtn) postCommentBtn.disabled = true;

    try {
      const db = getDb();
      const { getAuth } = await import(
        'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js'
      );
      const {
        addDoc,
        collection,
        serverTimestamp
      } = await import(
        'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'
      );

      const auth = getAuth();
      const uid = auth.currentUser ? auth.currentUser.uid : null;

      await addDoc(collection(db, 'comments'), {
        text: textVal,
        name:
          commentName && commentName.value && commentName.value.trim().length > 0
            ? commentName.value.trim()
            : null,
        email:
          commentEmail &&
          commentEmail.value &&
          commentEmail.value.trim().length > 0
            ? commentEmail.value.trim()
            : null,
        authorId: uid,
        createdAt: serverTimestamp(),
        approved: true, // change to false if you want manual moderation
        public: true
      });

      // Reset form
      if (commentText) commentText.value = '';
      if (commentName) commentName.value = '';
      if (commentEmail) commentEmail.value = '';
    } catch (e) {
      console.error('Post comment error:', e);
      alert('Could not post comment: ' + (e && e.message ? e.message : e));
    } finally {
      if (postCommentBtn) postCommentBtn.disabled = false;
    }
  }, 2000);

  commentForm.addEventListener('submit', handleSubmit);
}
