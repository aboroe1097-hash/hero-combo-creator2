// js/arcade-lobby-ui.js
// Arcade lobby chrome: player profile (Name + State) and the score leaderboard.
// Renders into #arcadeSection's lobby on both the standalone arcade page and the SPA tab.
// Pure DOM construction (no innerHTML for dynamic/user data), CSP-safe (no inline handlers),
// theme-aware and RTL-aware via CSS. All data comes from ./arcade-scores.js.

import {
  GAME_IDS,
  GAME_META,
  NAME_MAX,
  STATE_MAX,
  initArcadeScores,
  loadProfile,
  saveProfile,
  loadLocalBest,
  getSyncState,
  fetchLeaderboards,
  flushPendingSync,
} from './arcade-scores.js';
import { formatLocaleNumber } from './locale-format.js';

/* ───────────────────────────── i18n helpers ───────────────────────────── */

function currentLang() {
  let stored = 'en';
  try {
    stored = localStorage.getItem('vts_hero_lang') || document.documentElement.lang || 'en';
  } catch {
    /* default en */
  }
  const key = String(stored).toLowerCase().split('-')[0];
  return key === 'ko' ? 'kr' : key;
}

function t(key, fallback) {
  const table = (typeof window !== 'undefined' && window.VTS_TRANSLATIONS) || {};
  const lang = currentLang();
  return table[lang]?.[key] || table.en?.[key] || fallback || key;
}

function formatArcadeNumber(value) {
  return formatLocaleNumber(value, currentLang());
}

function gameName(gameId) {
  const meta = GAME_META[gameId];
  return meta ? t(meta.i18n, meta.label) : gameId;
}

/* ───────────────────────────── DOM helpers ────────────────────────────── */

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('aria') || k === 'role' || k === 'type' || k === 'for' || k === 'id')
      node.setAttribute(k === 'for' ? 'for' : k, v);
    else node[k] = v;
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

/* ───────────────────────────── module state ───────────────────────────── */

let activeBoard = 'overall'; // 'overall' | one of GAME_IDS
let boardCache = null; // last fetched { perGame, overall, empty }
let refreshTimer = null;

/* ───────────────────────────── profile strip ──────────────────────────── */

function buildProfileStrip() {
  const wrap = el('section', {
    class: 'arcade-profile',
    'aria-label': t('arcadeProfileHeading', 'Arcade Profile'),
  });

  const summary = el('div', { class: 'arcade-profile-summary' });
  const editForm = el('form', { class: 'arcade-profile-form hidden', novalidate: true });

  // ── summary view ──
  const identity = el('div', { class: 'arcade-profile-identity' });
  const avatar = el('span', { class: 'arcade-profile-avatar', 'aria-hidden': 'true', text: '★' });
  const nameLine = el('div', { class: 'arcade-profile-lines' });
  identity.append(avatar, nameLine);

  const syncPill = el('span', { class: 'arcade-sync-pill', role: 'status', 'aria-live': 'polite' });
  const editBtn = el('button', {
    class: 'arcade-btn arcade-profile-edit',
    type: 'button',
    text: t('arcadeProfileEdit', 'Edit'),
  });
  summary.append(identity, el('div', { class: 'arcade-profile-actions' }, [syncPill, editBtn]));

  // ── edit form ──
  const nameField = el('label', { class: 'arcade-field' }, [
    el('span', { class: 'arcade-field-label', text: t('arcadeProfileNameLabel', 'Name') }),
    el('input', {
      class: 'arcade-input arcade-input-name',
      type: 'text',
      maxLength: NAME_MAX,
      autocomplete: 'nickname',
      placeholder: t('arcadeProfileNamePh', 'Your name'),
    }),
  ]);
  const stateField = el('label', { class: 'arcade-field arcade-field-state' }, [
    el('span', { class: 'arcade-field-label', text: t('arcadeProfileStateLabel', 'State') }),
    el('input', {
      class: 'arcade-input arcade-input-state',
      type: 'text',
      maxLength: STATE_MAX,
      inputMode: 'numeric',
      placeholder: t('arcadeProfileStatePh', 'e.g. 1097'),
    }),
  ]);
  const err = el('p', { class: 'arcade-field-error hidden', role: 'alert' });
  const formActions = el('div', { class: 'arcade-profile-form-actions' }, [
    el('button', {
      class: 'arcade-btn arcade-btn-primary',
      type: 'submit',
      text: t('arcadeProfileSave', 'Save'),
    }),
    el('button', {
      class: 'arcade-btn arcade-profile-cancel',
      type: 'button',
      text: t('arcadeProfileCancel', 'Cancel'),
    }),
  ]);
  editForm.append(nameField, stateField, err, formActions);

  wrap.append(summary, editForm);

  const nameInput = editForm.querySelector('.arcade-input-name');
  const stateInput = editForm.querySelector('.arcade-input-state');
  const nameLabel = nameField.querySelector('.arcade-field-label');
  const stateLabel = stateField.querySelector('.arcade-field-label');
  const saveBtn = editForm.querySelector('.arcade-btn-primary');
  const cancelBtn = editForm.querySelector('.arcade-profile-cancel');

  const renderSummary = () => {
    const profile = loadProfile();
    nameLine.replaceChildren();
    if (profile.name) {
      nameLine.append(
        el('strong', { class: 'arcade-profile-name', text: profile.name }),
        el('span', {
          class: 'arcade-profile-sub',
          text: profile.state
            ? `${t('arcadeProfileStateLabel', 'State')} ${profile.state}`
            : t('arcadeProfilePlaying', 'On the board'),
        })
      );
      editBtn.textContent = t('arcadeProfileEdit', 'Edit');
    } else {
      nameLine.append(
        el('strong', {
          class: 'arcade-profile-name',
          text: t('arcadeProfileSetCta', 'Set your name to join the leaderboard'),
        })
      );
      editBtn.textContent = t('arcadeProfileSetName', 'Set name');
    }
    renderSyncPill();
  };

  const renderSyncPill = () => {
    const state = getSyncState();
    const map = {
      synced: { key: 'arcadeSyncSaved', fallback: 'Saved', cls: 'is-synced' },
      syncing: { key: 'arcadeSyncSyncing', fallback: 'Syncing…', cls: 'is-syncing' },
      pending: {
        key: 'arcadeSyncPending',
        fallback: 'Saved on device · will sync',
        cls: 'is-pending',
      },
      'local-only': {
        key: 'arcadeSyncPending',
        fallback: 'Saved on device · will sync',
        cls: 'is-pending',
      },
      offline: {
        key: 'arcadeSyncOffline',
        fallback: 'Offline · saved on device',
        cls: 'is-pending',
      },
      error: {
        key: 'arcadeSyncPending',
        fallback: 'Saved on device · will sync',
        cls: 'is-pending',
      },
      idle: null,
    };
    const info = map[state];
    syncPill.className = 'arcade-sync-pill';
    if (!info || !loadProfile().name) {
      syncPill.textContent = '';
      syncPill.classList.add('hidden');
      return;
    }
    syncPill.classList.remove('hidden');
    syncPill.classList.add(info.cls);
    syncPill.textContent = t(info.key, info.fallback);
  };

  const relabel = () => {
    wrap.setAttribute('aria-label', t('arcadeProfileHeading', 'Arcade Profile'));
    nameLabel.textContent = t('arcadeProfileNameLabel', 'Name');
    nameInput.placeholder = t('arcadeProfileNamePh', 'Your name');
    stateLabel.textContent = t('arcadeProfileStateLabel', 'State');
    stateInput.placeholder = t('arcadeProfileStatePh', 'e.g. 1097');
    saveBtn.textContent = t('arcadeProfileSave', 'Save');
    cancelBtn.textContent = t('arcadeProfileCancel', 'Cancel');
    if (!err.classList.contains('hidden')) {
      err.textContent = t('arcadeProfileNameRequired', 'Enter a name to save.');
    }
    renderSummary();
  };

  const openEditor = () => {
    const profile = loadProfile();
    nameInput.value = profile.name;
    stateInput.value = profile.state;
    err.classList.add('hidden');
    summary.classList.add('hidden');
    editForm.classList.remove('hidden');
    nameInput.focus();
  };

  const closeEditor = () => {
    editForm.classList.add('hidden');
    summary.classList.remove('hidden');
  };

  editBtn.addEventListener('click', openEditor);
  cancelBtn.addEventListener('click', closeEditor);
  editForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const saved = saveProfile({ name: nameInput.value, state: stateInput.value });
    if (!saved.name) {
      err.textContent = t('arcadeProfileNameRequired', 'Enter a name to save.');
      err.classList.remove('hidden');
      nameInput.focus();
      return;
    }
    closeEditor();
    renderSummary();
    // A freshly-named player may have queued bests from before — push them now.
    void flushPendingSync();
    scheduleRefresh(400);
  });

  return { node: wrap, relabel, renderSummary, renderSyncPill };
}

/* ───────────────────────────── leaderboard panel ──────────────────────── */

function buildLeaderboardPanel() {
  const wrap = el('section', {
    class: 'arcade-leaderboard',
    'aria-label': t('arcadeLeaderboardHeading', 'Leaderboard'),
  });

  const head = el('div', { class: 'arcade-leaderboard-head' }, [
    el('h3', {
      class: 'arcade-leaderboard-title',
      text: t('arcadeLeaderboardHeading', 'Leaderboard'),
    }),
    el('button', {
      class: 'arcade-btn arcade-leaderboard-refresh',
      type: 'button',
      text: t('arcadeLeaderboardRefresh', 'Refresh'),
    }),
  ]);

  const tabs = el('div', { class: 'arcade-leaderboard-tabs', role: 'tablist' });
  const tabDefs = [{ id: 'overall', label: () => t('arcadeLeaderboardOverall', 'Overall') }].concat(
    GAME_IDS.map((id) => ({ id, label: () => gameName(id) }))
  );
  const tabButtons = tabDefs.map((def) =>
    el('button', {
      class: 'arcade-leaderboard-tab',
      type: 'button',
      role: 'tab',
      dataset: { board: def.id },
      text: def.label(),
    })
  );
  tabs.append(...tabButtons);

  const hint = el('p', { class: 'arcade-leaderboard-hint hidden' });
  const body = el('div', { class: 'arcade-leaderboard-body', 'aria-live': 'polite' });

  wrap.append(head, tabs, hint, body);

  const setActiveTab = () => {
    tabButtons.forEach((btn) => {
      const on = btn.dataset.board === activeBoard;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  };

  const renderBody = () => {
    body.replaceChildren();
    hint.classList.add('hidden');

    if (!boardCache) {
      body.append(
        el('p', {
          class: 'arcade-leaderboard-empty',
          text: t('arcadeLeaderboardLoading', 'Loading leaderboard…'),
        })
      );
      return;
    }
    if (boardCache.unavailable) {
      body.append(
        el('p', {
          class: 'arcade-leaderboard-empty',
          text: t(
            'arcadeLeaderboardOffline',
            'Leaderboard needs a connection. Your bests are saved on this device.'
          ),
        })
      );
      return;
    }

    if (activeBoard === 'overall') {
      hint.textContent = t(
        'arcadeRatingHint',
        'Overall rating is the sum of your personal-best scores from all five games. Unplayed games add 0.'
      );
      hint.classList.remove('hidden');
      const rows = boardCache.overall;
      if (!rows.length) {
        body.append(emptyRow());
        return;
      }
      body.append(overallTable(rows));
      return;
    }

    const rows = boardCache.perGame[activeBoard] || [];
    if (!rows.length) {
      body.append(emptyRow());
      return;
    }
    body.append(gameTable(rows));
  };

  const emptyRow = () =>
    el('p', {
      class: 'arcade-leaderboard-empty',
      text: t('arcadeLeaderboardEmpty', 'No scores yet — play a game to get on the board!'),
    });

  const playerCell = (row) =>
    el('div', { class: 'arcade-lb-player' }, [
      el('span', { class: 'arcade-lb-name', text: row.name || '—' }),
      row.state ? el('span', { class: 'arcade-lb-state', text: row.state }) : null,
    ]);

  const gameTable = (rows) => {
    const table = el('table', { class: 'arcade-lb-table' });
    const thead = el('thead', {}, [
      el('tr', {}, [
        el('th', {
          class: 'arcade-lb-rank',
          scope: 'col',
          text: t('arcadeLeaderboardColRank', '#'),
        }),
        el('th', { scope: 'col', text: t('arcadeLeaderboardColPlayer', 'Player') }),
        el('th', {
          class: 'arcade-lb-num',
          scope: 'col',
          text: t('arcadeLeaderboardColScore', 'Score'),
        }),
      ]),
    ]);
    const tbody = el('tbody');
    rows.forEach((row) => {
      tbody.append(
        el('tr', { class: 'arcade-lb-row' }, [
          el('td', { class: 'arcade-lb-rank', text: formatArcadeNumber(row.rank) }),
          el('td', {}, [playerCell(row)]),
          el('td', { class: 'arcade-lb-num', text: formatArcadeNumber(row.score) }),
        ])
      );
    });
    table.append(thead, tbody);
    return table;
  };

  const overallTable = (rows) => {
    const table = el('table', { class: 'arcade-lb-table' });
    const thead = el('thead', {}, [
      el('tr', {}, [
        el('th', {
          class: 'arcade-lb-rank',
          scope: 'col',
          text: t('arcadeLeaderboardColRank', '#'),
        }),
        el('th', { scope: 'col', text: t('arcadeLeaderboardColPlayer', 'Player') }),
        el('th', {
          class: 'arcade-lb-game-scores-col',
          scope: 'col',
          text: t('arcadeLeaderboardColGames', 'Game scores'),
        }),
        el('th', {
          class: 'arcade-lb-num',
          scope: 'col',
          text: t('arcadeLeaderboardColRating', 'Overall rating'),
        }),
      ]),
    ]);
    const tbody = el('tbody');
    rows.forEach((row) => {
      const gameBests = el('div', { class: 'arcade-lb-game-bests' });
      for (const gameId of GAME_IDS) {
        const best = row.perGame?.[gameId]?.score;
        if (!(best > 0)) continue;
        gameBests.append(
          el('span', { class: 'arcade-lb-game-best' }, [
            el('span', { class: 'arcade-lb-game-name', text: gameName(gameId) }),
            el('strong', { class: 'arcade-lb-game-score', text: formatArcadeNumber(best) }),
          ])
        );
      }
      tbody.append(
        el('tr', { class: 'arcade-lb-row' }, [
          el('td', { class: 'arcade-lb-rank', text: formatArcadeNumber(row.rank) }),
          el('td', {}, [playerCell(row)]),
          el('td', { class: 'arcade-lb-game-scores' }, [gameBests]),
          el('td', { class: 'arcade-lb-num arcade-lb-rating' }, [
            el('strong', {
              class: 'arcade-lb-rating-value',
              text: formatArcadeNumber(row.rating),
            }),
          ]),
        ])
      );
    });
    table.append(thead, tbody);
    return table;
  };

  tabButtons.forEach((btn) =>
    btn.addEventListener('click', () => {
      activeBoard = btn.dataset.board;
      setActiveTab();
      renderBody();
    })
  );
  head.querySelector('.arcade-leaderboard-refresh').addEventListener('click', () => {
    void refresh(true);
  });

  const relabelTabs = () => {
    wrap.setAttribute('aria-label', t('arcadeLeaderboardHeading', 'Leaderboard'));
    tabButtons.forEach((btn, i) => {
      btn.textContent = tabDefs[i].label();
    });
    head.querySelector('.arcade-leaderboard-title').textContent = t(
      'arcadeLeaderboardHeading',
      'Leaderboard'
    );
    head.querySelector('.arcade-leaderboard-refresh').textContent = t(
      'arcadeLeaderboardRefresh',
      'Refresh'
    );
  };

  setActiveTab();
  renderBody();

  return { node: wrap, renderBody, setActiveTab, relabelTabs };
}

/* ───────────────────────────── per-card personal bests ────────────────── */

function renderCardBests(root) {
  const cards = root.querySelectorAll('.arcade-card');
  cards.forEach((card) => {
    const href = card.getAttribute('href') || '';
    const match = href.match(/\/games\/boot\/[a-z]-([a-z-]+)\.html$/);
    if (!match) return;
    const gameId = match[1].replace(/-/g, '_');
    if (!GAME_IDS.includes(gameId)) return;
    const best = loadLocalBest(gameId);
    let badge = card.querySelector('.arcade-card-best');
    if (!badge) {
      badge = el('span', { class: 'arcade-card-best' });
      card.append(badge);
    }
    badge.replaceChildren(
      el('span', { class: 'arcade-card-best-label', text: t('arcadeCardBestLabel', 'Your best') }),
      el('span', {
        class: 'arcade-card-best-value',
        text: best > 0 ? formatArcadeNumber(best) : t('arcadeLeaderboardNoBest', 'No best yet'),
      })
    );
    badge.classList.toggle('is-empty', best <= 0);
  });
}

/* ───────────────────────────── orchestration ──────────────────────────── */

let profileApi = null;
let boardApi = null;
let uiRoot = null;

function scheduleRefresh(delay = 0) {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    void refresh(false);
  }, delay);
}

async function refresh(force) {
  if (!boardApi) return;
  if (force) {
    boardCache = null;
    boardApi.renderBody();
  }
  try {
    const result = await fetchLeaderboards({ topN: 25 });
    // Empty rows can mean "no scores yet" OR "couldn't reach Firebase". Use sync state to
    // tell them apart so we show the right message.
    const state = getSyncState();
    const unavailable =
      result.empty && (state === 'offline' || state === 'local-only' || state === 'error');
    boardCache = { ...result, unavailable };
  } catch {
    boardCache = { perGame: {}, overall: [], empty: true, unavailable: true };
  }
  boardApi.renderBody();
  profileApi?.renderSyncPill();
}

export function initArcadeLobbyUI(root = document.getElementById('arcadeSection')) {
  if (!root) return;
  const lobby = root.querySelector('#arcadeLobby');
  if (!lobby || lobby.dataset.arcadeLobbyUiReady === '1') return;
  lobby.dataset.arcadeLobbyUiReady = '1';
  uiRoot = root;

  initArcadeScores();

  const profile = buildProfileStrip();
  const board = buildLeaderboardPanel();
  profileApi = profile;
  boardApi = board;

  // Profile strip goes right under the intro; leaderboard goes at the end of the lobby.
  const intro = lobby.querySelector('.arcade-intro');
  if (intro && intro.parentNode === lobby) intro.after(profile.node);
  else lobby.prepend(profile.node);
  lobby.append(board.node);

  profile.renderSummary();
  renderCardBests(root);

  // React to score/profile changes coming from games or other tabs.
  window.addEventListener('arcadeScoresUpdate', () => {
    profile.renderSyncPill();
    renderCardBests(root);
    scheduleRefresh(600);
  });
  window.addEventListener('edenLanguageUpdate', () => {
    profile.relabel();
    board.relabelTabs();
    board.renderBody();
    renderCardBests(root);
  });
  window.addEventListener('online', () => scheduleRefresh(800));

  // Defer the first leaderboard fetch until the lobby is actually visible, so the SPA
  // (where the Arcade tab may never be opened) doesn't pull Firebase on every page load.
  let firstLoadDone = false;
  const triggerFirstLoad = () => {
    if (firstLoadDone) return;
    firstLoadDone = true;
    void refresh(false);
  };
  if (typeof IntersectionObserver === 'function') {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          triggerFirstLoad();
        }
      },
      { rootMargin: '120px' }
    );
    observer.observe(board.node);
    // Fallback: if the lobby is already on-screen, the observer fires immediately; if the
    // API is unavailable, load eagerly.
  } else {
    triggerFirstLoad();
  }
}

export default initArcadeLobbyUI;
