// js/comments.js
// Realtime comments saved to Firestore (global collection "comments")

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
  const initial =
    data.name?.trim()?.[0]?.toUpperCase() ??
    data.authorId?.[0]?.toUpperCase() ??
    'U';
  avatar.textContent = initial;

  // Body
  const body = document.createElement('div');
  body.className = 'comment-body';

  // Meta
  const meta = document.createElement('div');
  meta.className = 'comment-meta';

  const author = document.createElement('div');
  author.textContent = data.name?.trim() || 'Anonymous';

  const time = document.createElement('div');
  const dt = data.createdAt?.seconds
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
    commentsListenerUnsub();
    commentsListenerUnsub = null;
  }

  try {
    const db = getDb();
    const { collection, query, orderBy, onSnapshot } = await import(
      'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'
    );
    const { getAuth } = await import(
      'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js'
    );

    // Just order by time; filter "approved/public" on the client
    const q = query(
      collection(db, 'comments'),
      orderBy('createdAt', 'desc')
    );

    console.log('[comments] onSnapshot registered (approved comments)');

    commentsListenerUnsub = onSnapshot(
      q,
      (snap) => {
        commentsList.innerHTML = '';

        const auth = getAuth();
        const currentUid = auth.currentUser?.uid || null;

        snap.forEach((docSnap) => {
          const data = docSnap.data();

          // Show only approved/public comments or your own
          const visible =
            data.approved === true ||
            data.public === true ||
            data.authorId === currentUid;

          if (!visible) return;

          const card = createCommentCard(docSnap.id, data, currentUid);
          commentsList.appendChild(card);
        });
      },
      (err) => {
        console.error('[comments] onSnapshot error:', err);
      }
    );
  } catch (e) {
    console.error('[comments] listener error:', e);
  }
}

/* -------------------------------------------------- */
/* Form handling                                       */
/* -------------------------------------------------- */

function wireCommentsUI() {
  if (!commentForm) return;

  commentForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();

    const text = commentText.value.trim();
    if (!text) return alert('Please enter a comment.');
    if (text.length > 1000)
      return alert('Comment too long (max 1000 characters).');

    postCommentBtn.disabled = true;

    try {
      const db = getDb();
      const { getAuth } = await import(
        'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js'
      );
      const { addDoc, collection, serverTimestamp } = await import(
        'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'
      );

      const auth = getAuth();
      // if somehow auth failed, fall back to "anonymous"
      const uid = auth.currentUser?.uid || 'anonymous';

      await addDoc(collection(db, 'comments'), {
        text,
        name: commentName.value.trim() || null,
        email: commentEmail.value.trim() || null,
        authorId: uid,
        createdAt: serverTimestamp(),
        approved: true, // set false if you want moderation
        public: true
      });

      // Reset form
      commentText.value = '';
      commentName.value = '';
      commentEmail.value = '';
    } catch (e) {
      console.error('Post comment error:', e);
      alert('Could not post comment.');
    } finally {
      postCommentBtn.disabled = false;
    }
  });
}
