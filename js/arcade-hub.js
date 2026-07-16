import './i18n/standalone-copy.js';

const GAME_PATH_PATTERN = /^\/games\/boot\/[a-z0-9-]+\.html$/;
const I18N = window.VTSStandaloneI18n;

function currentLanguage() {
  try {
    return I18N.normalizeLocale(
      localStorage.getItem('vts_hero_lang') || document.documentElement.lang || 'en'
    );
  } catch {
    return I18N.normalizeLocale(document.documentElement.lang || 'en');
  }
}

function arcadeCopy() {
  return I18N.getCopy(currentLanguage()).arcade;
}

function shellAccessibilityCopy() {
  return I18N.getCopy(currentLanguage()).shell.accessibility;
}

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function gamePath(card) {
  try {
    const url = new URL(card.href, window.location.href);
    return url.origin === window.location.origin && GAME_PATH_PATTERN.test(url.pathname)
      ? url.pathname
      : '';
  } catch {
    return '';
  }
}

export function initArcadeHub(root = document.getElementById('arcadeSection')) {
  if (!root || root.dataset.arcadeHubReady === '1') return;
  const lobby = root.querySelector('#arcadeLobby');
  const cards = [...root.querySelectorAll('.arcade-card')].filter((card) => gamePath(card));
  if (!lobby || !cards.length) return;

  root.dataset.arcadeHubReady = '1';
  const initialCopy = arcadeCopy();
  const player = document.createElement('section');
  player.className = 'arcade-player hidden';
  player.setAttribute('aria-label', initialCopy.hub.playerAria);
  player.innerHTML = `
    <header class="arcade-player-toolbar">
      <button class="arcade-game-list-button" type="button">${initialCopy.shell.back}</button>
      <nav class="arcade-game-tabs" aria-label="${initialCopy.hub.switchGameAria}"></nav>
    </header>
    <div class="arcade-frame-wrap">
      <iframe class="arcade-game-frame" title="${initialCopy.hub.frameTitle}" allow="fullscreen" loading="eager"></iframe>
    </div>`;
  root.appendChild(player);

  const frame = player.querySelector('.arcade-game-frame');
  const tabs = player.querySelector('.arcade-game-tabs');
  const listButton = player.querySelector('.arcade-game-list-button');
  let activeIndex = -1;

  const frameConfig = () => {
    const card = cards[activeIndex];
    if (!card) return null;
    return {
      type: 'vts:arcade-config',
      language: currentLanguage(),
      theme: currentTheme(),
      mode: card.querySelector('.arcade-card-tag')?.textContent?.trim() || '',
      title: card.querySelector('.arcade-card-title')?.textContent?.trim() || '',
      description: card.querySelector('.arcade-card-desc')?.textContent?.trim() || '',
    };
  };

  const syncFrameConfig = () => {
    const config = frameConfig();
    if (config && frame.contentWindow)
      frame.contentWindow.postMessage(config, window.location.origin);
  };

  const syncHubCopy = () => {
    const copy = arcadeCopy();
    const accessibility = shellAccessibilityCopy();
    listButton.textContent = copy.shell.back;
    player.setAttribute('aria-label', copy.hub.playerAria);
    tabs.setAttribute('aria-label', copy.hub.switchGameAria);
    const activeGameTitle = cards[activeIndex]
      ?.querySelector('.arcade-card-title')
      ?.textContent?.trim();
    frame.title = activeGameTitle || copy.hub.frameTitle;
    document
      .querySelector('.command-header')
      ?.setAttribute('aria-label', accessibility.arcadeGames);
    const themeToggle = document.getElementById('themeToggle');
    themeToggle?.setAttribute('aria-label', accessibility.themeToggle);
    themeToggle?.setAttribute('title', accessibility.themeToggle);
    const pageTitle = document.querySelector('[data-i18n="arcadeTitle"]')?.textContent?.trim();
    const pageKicker = document.querySelector('[data-i18n="arcadeKicker"]')?.textContent?.trim();
    const appTitle = document
      .querySelector('[data-i18n-aria="appTitle"]')
      ?.getAttribute('aria-label')
      ?.trim();
    if (pageTitle && pageKicker && appTitle) {
      document.title = `${pageTitle} — ${pageKicker} | ${appTitle}`;
    }
  };
  syncHubCopy();

  const tabButtons = cards.map((card, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'arcade-game-tab';
    button.dataset.gameIndex = String(index);
    const fallbackMode = I18N.format(arcadeCopy().hub.modeFallback, { number: index + 1 });
    button.innerHTML = `<span>${card.querySelector('.arcade-card-tag')?.textContent || fallbackMode}</span><strong>${card.querySelector('.arcade-card-title')?.textContent || ''}</strong>`;
    tabs.appendChild(button);
    return button;
  });

  const openGame = (index) => {
    const card = cards[index];
    const path = gamePath(card);
    if (!path) return;
    const title =
      card.querySelector('.arcade-card-title')?.textContent?.trim() || arcadeCopy().hub.frameTitle;
    activeIndex = index;
    lobby.classList.add('hidden');
    player.classList.remove('hidden');
    frame.title = title;
    const params = new URLSearchParams({
      embed: '1',
      lang: currentLanguage(),
      theme: currentTheme(),
    });
    const nextSrc = `${path}?${params}`;
    const current = frame.src ? new URL(frame.src, window.location.href) : null;
    if (!current || current.pathname !== path) frame.src = nextSrc;
    else syncFrameConfig();
    tabButtons.forEach((button, buttonIndex) => {
      const active = buttonIndex === index;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    player.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  cards.forEach((card, index) => {
    card.removeAttribute('target');
    card.removeAttribute('rel');
    card.addEventListener('click', (event) => {
      event.preventDefault();
      openGame(index);
    });
  });
  tabButtons.forEach((button, index) => button.addEventListener('click', () => openGame(index)));
  frame.addEventListener('load', syncFrameConfig);
  listButton.addEventListener('click', () => {
    activeIndex = -1;
    frame.src = 'about:blank';
    player.classList.add('hidden');
    lobby.classList.remove('hidden');
    lobby.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });

  window.addEventListener('edenLanguageUpdate', () => {
    syncHubCopy();
    tabButtons.forEach((button, index) => {
      button.querySelector('span').textContent =
        cards[index].querySelector('.arcade-card-tag')?.textContent ||
        I18N.format(arcadeCopy().hub.modeFallback, { number: index + 1 });
      button.querySelector('strong').textContent =
        cards[index].querySelector('.arcade-card-title')?.textContent || '';
    });
    syncFrameConfig();
  });

  new MutationObserver(syncFrameConfig).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
}
