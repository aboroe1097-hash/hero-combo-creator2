// --- Comments: realtime comments saved to Firestore ---
// Put this near other initialization code in js/app.js or import as a module.

import { ensureAnonymousAuth, getDb } from './firebase.js'; // adjust import path if different

// Firestore functions will be imported dynamically to keep initial bundle small
let commentsListenerUnsub = null;

const commentForm = document.getElementById('commentForm');
const commentName = document.getElementById('commentName');
const commentEmail = document.getElementById('commentEmail');
const commentText = document.getElementById('commentText');
const postCommentBtn = document.getElementById('postCommentBtn');
const commentsList = document.getElementById('commentsList');

async function initComments() {
  try {
    // ensure we have auth (anonymous sign-in if needed)
    await ensureAnonymousAuth();
    startCommentsListener();
    wireCommentsUI();
  } catch (err) {
    console.error('Comments init error', err);
  }
}

function createCommentCard(docId, data, currentUid) {
  const wrapper = document.createElement('div');
  wrapper.className = 'comment-card';
  // avatar letter
  const avatar = document.createElement('div');
  avatar.className = 'comment-avatar';
  const initial = (data.name && data.name.trim().length) ? data.name.trim()[0].toUpperCase() : (data.authorId || 'U')[0].toUpperCase();
  avatar.textContent = initial;

  const body = document.createElement('div');
  body.className = 'comment-body';
  const meta = document.createElement('div');
  meta.className = 'comment-meta';

  const leftMeta = document.createElement('div');
  leftMeta.textContent = (data.name && data.name.trim().length) ? data.name : 'Anonymous';

  const time = document.createElement('div');
  const dt = data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date();
  time.textContent = dt.toLocaleString();

  meta.appendChild(leftMeta);
  meta.appendChild(time);

  const textEl = document.createElement('div');
  textEl.className = 'comment-text';
  textEl.textContent = data.text || '';

  body.appendChild(meta);
  body.appendChild(textEl);

  // actions (delete if author or admin)
  const actions = document.createElement('div');
  actions.className = 'comment-actions';
  if (data.authorId && data.authorId === currentUid) {
    const del = document.createElement('button');
    del.textContent = 'Delete';
    del.onclick = async () => {
      if (!confirm('Delete this comment?')) return;
      try {
        const { deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
        const db = getDb();
        await deleteDoc(doc(db, `comments`, docId));
      } catch (e) {
        console.error('Delete comment error', e);
        alert('Could not delete comment.');
      }
    };
    actions.appendChild(del);
  }
  body.appendChild(actions);

  wrapper.appendChild(avatar);
  wrapper.appendChild(body);
  return wrapper;
}

async function startCommentsListener() {
  // stop old listener first
  if (commentsListenerUnsub) { commentsListenerUnsub(); commentsListenerUnsub = null; }

  try {
    const db = getDb();
    const { collection, query, orderBy, onSnapshot } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
    const q = query(collection(db, 'comments'), orderBy('createdAt', 'desc'));
    commentsListenerUnsub = onSnapshot(q, async (snap) => {
      commentsList.innerHTML = '';
      const currentUser = (await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js"))
                            .getAuth() // using auth instance exposes currentUser
      const currentUid = currentUser.currentUser ? currentUser.currentUser.uid : null;

      snap.forEach(docSnap => {
        const data = docSnap.data();
        // Only show approved comments unless it's the author or admin — optional
        const show = data.approved === true || (data.authorId && data.authorId === currentUid) || !!data.public;
        if (!show) return;
        const card = createCommentCard(docSnap.id, data, currentUid);
        commentsList.appendChild(card);
      });
    }, (err) => {
      console.error('Comments snapshot error', err);
    });
  } catch (e) {
    console.error('Start comments listener error', e);
  }
}

function wireCommentsUI() {
  commentForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const text = commentText.value && commentText.value.trim();
    if (!text) return alert('Please enter a comment.');

    // basic client-side validation
    if (text.length > 1000) return alert('Comment too long (max 1000 characters)');

    postCommentBtn.disabled = true;
    try {
      const db = getDb();
      const authModule = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
      const currentUser = authModule.getAuth().currentUser;
      const authorId = currentUser ? currentUser.uid : 'anonymous';
      const name = commentName.value && commentName.value.trim();
      const email = commentEmail.value && commentEmail.value.trim();

      const { addDoc, collection, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");

      // save comment document
      await addDoc(collection(db, 'comments'), {
        text,
        name: name || null,
        email: email || null,         // optional, you might choose NOT to store emails publicly
        authorId,
        createdAt: serverTimestamp(),
        approved: true,               // or false if you want manual moderation
        public: true                  // optional flag if you want to hide until approved
      });

      commentText.value = '';
      commentName.value = '';
      commentEmail.value = '';
    } catch (e) {
      console.error('Error posting comment', e);
      alert('Could not post comment: ' + (e.message || e));
    } finally {
      postCommentBtn.disabled = false;
    }
  });
}

// call initComments() after your main app init (or at the bottom of main init)
initComments().catch(console.error);
