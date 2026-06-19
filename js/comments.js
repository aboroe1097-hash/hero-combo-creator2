// js/comments.js - Threaded Comments with Name Input
import { getDb } from './firebase.js';
import { escapeHtml } from './utils.js';

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
    'from-blue-500 to-indigo-600','from-violet-500 to-purple-600',
    'from-emerald-500 to-teal-600','from-orange-500 to-red-600',
    'from-sky-500 to-blue-600','from-pink-500 to-rose-600',
  ];
  const grad = gradients[(displayName.charCodeAt(0) || 65) % gradients.length];

  if (isReply) {
    wrapper.className = 'flex gap-3 p-3 sm:p-4 bg-slate-800/40 hover:bg-slate-800/60 transition-colors';
  } else {
    wrapper.className = 'flex gap-3 p-4 sm:p-5 hover:bg-slate-800/20 transition-colors';
  }

  wrapper.innerHTML = `
    <div class="flex-shrink-0">
      <div class="w-9 h-9 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center font-black text-white text-sm shadow-md select-none">
        ${initial}
      </div>
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-baseline gap-2 flex-wrap mb-1">
        <span class="font-bold text-sm text-sky-400">${safeName}</span>
        <span class="text-[10px] text-slate-500">${escapeHtml(timeStr)}</span>
        ${isOwn ? `<button class="del-btn ml-auto text-[10px] font-bold text-slate-600 hover:text-red-400 transition-colors px-2 py-0.5 rounded bg-red-900/0 hover:bg-red-900/20 border border-transparent hover:border-red-800/40">Delete</button>` : ''}
      </div>
      <p class="text-sm text-slate-300 leading-relaxed break-words">${safeText}</p>
      <div class="flex items-center gap-3 mt-2">
        <button class="reply-btn flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-blue-400 transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m15 15-6 6m0 0-6-6m6 6V9a6 6 0 0 1 12 0v3"/></svg>
          Reply
        </button>
      </div>
      <div id="reply-form-${id}" class="hidden mt-3 space-y-2 p-3 bg-slate-900/60 rounded-xl border border-slate-700/60">
        <input type="text" id="reply-name-${id}" class="w-full bg-slate-800 text-sm px-3 py-2 rounded-lg text-white border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none placeholder-slate-500 transition-all" placeholder="Your name (optional)">
        <textarea id="reply-input-${id}" class="w-full bg-slate-800 text-sm px-3 py-2 rounded-lg text-white border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none placeholder-slate-500 transition-all" rows="2" placeholder="Write a reply..."></textarea>
        <div class="flex gap-2">
          <button class="submit-reply-btn px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors shadow-md">Post Reply</button>
          <button class="cancel-reply-btn px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-colors">Cancel</button>
        </div>
      </div>
      <div id="replies-${id}" class="mt-3 space-y-0 rounded-xl overflow-hidden border border-slate-700/40 divide-y divide-slate-700/40 ${isReply ? 'hidden' : ''}"></div>
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

  // Update count label
  const countLabel = document.getElementById('commentsCountLabel');
  if (countLabel) {
    countLabel.textContent = roots.length === 0
      ? 'No comments yet — be the first!'
      : `${roots.length} comment${roots.length !== 1 ? 's' : ''}`;
  }

  if (roots.length === 0) {
    commentsList.innerHTML = `
      <div class="flex flex-col items-center justify-center py-12 text-center">
        <div class="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-3">
          <svg class="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"/></svg>
        </div>
        <p class="text-sm text-slate-500 font-medium">No comments yet</p>
        <p class="text-xs text-slate-600 mt-1">Be the first to share a suggestion!</p>
      </div>`;
    return;
  }

  roots.forEach(root => {
    const card = createCommentCard(root.id, root, false);
    commentsList.appendChild(card);
  });

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
    await addCommentToDb(text, displayName, null, parentId);
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

async function addCommentToDb(text, name, email = null, parentId = null) {
  const { addDoc, collection, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');

  await addDoc(collection(getDb(), 'comments'), {
    text,
    name: name || null,
    email: email || null,
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
  const auth = getAuth();

  const q = query(collection(db, 'comments'), orderBy('createdAt', 'desc'));

  commentsListenerUnsub = onSnapshot(q, (snap) => {
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
      await addCommentToDb(text, commentName.value.trim(), commentEmail?.value.trim() || null, null);
      commentText.value = '';
    } catch (e) {
      console.error(e);
    } finally {
      postCommentBtn.disabled = false;
    }
  });
}
