import '../css/youtube-v14.css';

const PLAYLIST_ID_PATTERN = /^PL[A-Za-z0-9_-]{20,}$/;
const PLAYER_LOAD_TIMEOUT_MS = 15000;
const PLAYLIST_AMBIENCE_BY_TITLE_KEY = Object.freeze({
  youtubeJourneyTitle: 'journey',
  youtubeRecruitmentTitle: 'recruitment',
  youtubeGuidesTitle: 'guides',
});

function getPlaylistAmbience(card) {
  return PLAYLIST_AMBIENCE_BY_TITLE_KEY[card?.dataset.titleKey] || 'journey';
}

function isSafeYouTubeUrl(value) {
  try {
    const url = new URL(value, window.location.href);
    return url.protocol === 'https:' && url.hostname === 'www.youtube.com' && url.pathname === '/playlist';
  } catch {
    return false;
  }
}

export function initYouTubeLibrary() {
  const root = document.getElementById('youtubeSection');
  if (!root || root.dataset.youtubeLibraryReady === '1') return;

  const playerShell = root.querySelector('#youtubePlayerShell');
  const playerHost = root.querySelector('#youtubePlayerHost');
  const loadButton = root.querySelector('#youtubeLoadButton');
  const retryButton = root.querySelector('#youtubeRetryButton');
  const featuredTitle = root.querySelector('#youtubeFeaturedTitle');
  const externalLink = root.querySelector('#youtubeFeaturedExternal');
  const cards = [...root.querySelectorAll('.youtube-playlist-card[data-playlist-id]')];

  if (!playerShell || !playerHost || !loadButton || !retryButton || !featuredTitle || !externalLink || !cards.length) {
    return;
  }

  root.dataset.youtubeLibraryReady = '1';
  let selectedCard = cards.find((card) => card.getAttribute('aria-pressed') === 'true') || cards[0];
  let loadedPlaylistId = '';
  let loadTimer = 0;
  let ambienceAnimationFrame = 0;

  const clearLoadTimer = () => {
    if (!loadTimer) return;
    window.clearTimeout(loadTimer);
    loadTimer = 0;
  };

  const syncPlayerTitle = () => {
    const iframe = playerHost.querySelector('iframe');
    if (!iframe) return;
    iframe.title = `${featuredTitle.textContent.trim()} — YouTube`;
  };

  const setPlayerState = (state) => {
    playerShell.dataset.playerState = state;
    playerShell.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
  };

  const syncPlaylistAmbience = (card, animate = false) => {
    root.dataset.youtubeAmbience = getPlaylistAmbience(card);
    if (!animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    if (ambienceAnimationFrame) window.cancelAnimationFrame(ambienceAnimationFrame);
    root.classList.remove('is-ambience-entering');
    ambienceAnimationFrame = window.requestAnimationFrame(() => {
      ambienceAnimationFrame = window.requestAnimationFrame(() => {
        root.classList.add('is-ambience-entering');
        ambienceAnimationFrame = 0;
      });
    });
  };

  const resetPlayer = () => {
    clearLoadTimer();
    loadedPlaylistId = '';
    playerHost.replaceChildren();
    setPlayerState('idle');
  };

  const failPlayer = () => {
    clearLoadTimer();
    loadedPlaylistId = '';
    playerHost.replaceChildren();
    setPlayerState('error');
  };

  const selectPlaylist = (card) => {
    if (!card || card === selectedCard) return;

    selectedCard = card;
    cards.forEach((item) => {
      const selected = item === card;
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });

    const titleKey = card.dataset.titleKey || '';
    const titleNode = card.querySelector('[data-playlist-title]');
    if (titleKey) featuredTitle.dataset.i18n = titleKey;
    if (titleNode?.textContent) featuredTitle.textContent = titleNode.textContent.trim();

    const watchUrl = card.dataset.watchUrl || '';
    if (isSafeYouTubeUrl(watchUrl)) externalLink.href = watchUrl;
    syncPlaylistAmbience(card, true);
    resetPlayer();
    loadSelectedPlaylist();
  };

  const loadSelectedPlaylist = () => {
    const playlistId = selectedCard?.dataset.playlistId || '';
    if (!PLAYLIST_ID_PATTERN.test(playlistId)) {
      failPlayer();
      return;
    }

    if (loadedPlaylistId === playlistId && playerHost.firstElementChild) {
      setPlayerState('ready');
      return;
    }

    clearLoadTimer();
    playerHost.replaceChildren();
    loadedPlaylistId = '';
    setPlayerState('loading');

    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(playlistId)}`;
    iframe.title = `${featuredTitle.textContent.trim()} — YouTube`;
    iframe.width = '560';
    iframe.height = '315';
    iframe.loading = 'eager';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;

    iframe.addEventListener('load', () => {
      if (selectedCard?.dataset.playlistId !== playlistId || !playerHost.contains(iframe)) return;
      clearLoadTimer();
      loadedPlaylistId = playlistId;
      setPlayerState('ready');
    }, { once: true });

    iframe.addEventListener('error', () => {
      if (selectedCard?.dataset.playlistId === playlistId && playerHost.contains(iframe)) {
        failPlayer();
      }
    }, { once: true });
    playerHost.appendChild(iframe);
    loadTimer = window.setTimeout(() => {
      if (loadedPlaylistId !== playlistId) failPlayer();
    }, PLAYER_LOAD_TIMEOUT_MS);
  };

  cards.forEach((card) => card.addEventListener('click', () => selectPlaylist(card)));
  loadButton.addEventListener('click', loadSelectedPlaylist);
  retryButton.addEventListener('click', loadSelectedPlaylist);
  window.addEventListener('edenLanguageUpdate', syncPlayerTitle);
  syncPlaylistAmbience(selectedCard);
  loadSelectedPlaylist();
}
