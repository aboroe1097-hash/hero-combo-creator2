// js/comments.js - Threaded Comments with Name Input
import { ensureAnonymousAuth, getDb } from './firebase.js';

let commentsListenerUnsub = null;

// DOM elements
const commentForm = document.getElementById('commentForm');
const commentName = document.getElementById('commentName');
const commentEmail = document.getElementById('commentEmail');
const commentText = document.getElementById('commentText');
const postCommentBtn = document.getElementById('postCommentBtn');
const commentsList = document.getElementById('commentsList');

// Global map to store comments
let allCommentsMap = new Map();
let currentUserId = null;

export async function initComments() {
  try {
    wireCommentsUI();
    await startCommentsListener();
    console.log('[comments] initialized (threaded + names)');
  } catch (err) {
    console.error('[comments] init error:', err);
  }
}

/* -------------------------------------------------- */
/* UI: Card Creation                                   */
/* -------------------------------------------------- */

function createCommentCard(id, data, isReply = false) {
  const wrapper = document.createElement('div');
  wrapper.className = isReply ? 'comment-card reply-card' : 'comment-card';
  wrapper.id = `comment-${id}`;

  // Avatar
  const avatar = document.createElement('div');
  avatar.className = 'comment-avatar';
  const initial = data.name?.trim()?.[0]?.toUpperCase() ?? 'A';
  avatar.textContent = initial;

  // Body Container
  const body = document.createElement('div');
  body.className = 'comment-body';

  // Meta (Name + Date)
  const meta = document.createElement('div');
  meta.className = 'comment-meta';
  
  const authorSpan = document.createElement('span');
  authorSpan.className = 'font-bold text-sky-400 mr-2';
  authorSpan.textContent = data.name?.trim() || 'Anonymous';
  
  const timeSpan = document.createElement('span');
  timeSpan.className = 'text-xs text-slate-500';
  const dt = data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : new Date();
  timeSpan.textContent = dt.toLocaleString();

  meta.appendChild(authorSpan);
  meta.appendChild(timeSpan);

  // Comment Text
  const textEl = document.createElement('div');
  textEl.className = 'comment-text mt-1 text-slate-300';
  textEl.textContent = data.text || '';

  // Action Bar (Reply / Delete)
  const actionBar = document.createElement('div');
  actionBar.className = 'flex gap-3 mt-2 text-xs font-semibold';

  // REPLY BUTTON
  const replyBtn = document.createElement('button');
  replyBtn.textContent = 'Reply';
  replyBtn.className = 'text-slate-500 hover:text-white transition';
  replyBtn.onclick = () => toggleReplyForm(id);
  actionBar.appendChild(replyBtn);

  // DELETE BUTTON (Owner only)
  if (data.authorId && data.authorId === currentUserId) {
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.className = 'text-red-900 hover:text-red-500 transition ml-auto';
    delBtn.onclick = () => deleteComment(id);
    actionBar.appendChild(delBtn);
  }

  body.appendChild(meta);
  body.appendChild(textEl);
  body.appendChild(actionBar);

  // --- CHANGED: Reply Form now has a Name Input ---
  const replyFormContainer = document.createElement('div');
  replyFormContainer.id = `reply-form-${id}`;
  replyFormContainer.className = 'hidden mt-3 pl-2 border-l-2 border-slate-700 space-y-2';
  
  replyFormContainer.innerHTML = `
    <input type="text" id="reply-name-${id}" class="w-full bg-slate-800 text-sm p-2 rounded text-white border border-slate-600 focus:border-blue-500 outline-none" placeholder="Your Name (Optional)">
    <textarea id="reply-input-${id}" class="w-full bg-slate-800 text-sm p-2 rounded text-white border border-slate-600 focus:border-blue-500 outline-none" rows="2" placeholder="Write a reply..."></textarea>
    <div class="flex gap-2">
      <button onclick="window.submitReply('${id}')" class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 font-bold">Post Reply</button>
      <button onclick="document.getElementById('reply-form-${id}').classList.add('hidden')" class="px-3 py-1 bg-slate-700 text-white text-xs rounded hover:bg-slate-600">Cancel</button>
    </div>
  `;
  body.appendChild(replyFormContainer);

  // Container for nested replies
  const childrenContainer = document.createElement('div');
  childrenContainer.className = 'replies-container mt-2 space-y-2';
  childrenContainer.id = `replies-${id}`;
  
  body.appendChild(childrenContainer);

  wrapper.appendChild(avatar);
  wrapper.appendChild(body);
  return wrapper;
}

/* -------------------------------------------------- */
/* Logic: Render Tree                                  */
/* -------------------------------------------------- */

function renderCommentsTree(docs) {
  commentsList.innerHTML = '';
  allCommentsMap.clear();

  const roots = [];
  const replies = [];

  // 1. Separate Roots and Replies
  docs.forEach(docSnap => {
    const data = docSnap.data();
    const item = { id: docSnap.id, ...data };
    
    if (data.approved === false && data.authorId !== currentUserId) return;

    allCommentsMap.set(item.id, item);

    if (item.parentId) {
      replies.push(item);
    } else {
      roots.push(item);
    }
  });

  // 2. Render Roots (Newest First)
  roots.forEach(root => {
    const card = createCommentCard(root.id, root, false);
    commentsList.appendChild(card);
  });

  // 3. Append Replies (Oldest First for threads)
  replies.reverse().forEach(reply => {
    const parentContainer = document.getElementById(`replies-${reply.parentId}`);
    if (parentContainer) {
      const card = createCommentCard(reply.id, reply, true);
      parentContainer.appendChild(card);
    }
  });
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
  // Auto-focus the name field if opening
  if (!form.classList.contains('hidden')) {
    const nameField = document.getElementById(`reply-name-${id}`);
    if (nameField) nameField.focus();
  }
}

async function deleteComment(docId) {
  if (!confirm('Delete this comment?')) return;
  try {
    const { deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
    await deleteDoc(doc(getDb(), 'comments', docId));
  } catch (e) {
    console.error(e);
  }
}

async function addCommentToDb(text, name, parentId = null) {
  const { addDoc, collection, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
  
  await addDoc(collection(getDb(), 'comments'), {
    text,
    name: name || null,
    parentId: parentId, 
    authorId: currentUserId,
    createdAt: serverTimestamp(),
    approved: true,
    public: true
  });
}

/* -------------------------------------------------- */
/* Firestore Listener                                  */
/* -------------------------------------------------- */

async function startCommentsListener() {
  if (commentsListenerUnsub) commentsListenerUnsub();
  const db = getDb();
  const { collection, query, orderBy, onSnapshot } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
  const { getAuth } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js');

  const q = query(collection(db, 'comments'), orderBy('createdAt', 'desc'));

  commentsListenerUnsub = onSnapshot(q, (snap) => {
    const auth = getAuth();
    currentUserId = auth.currentUser?.uid || null;
    renderCommentsTree(snap);
  });
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
      console.error(e);
    } finally {
      postCommentBtn.disabled = false;
    }
  });
}
