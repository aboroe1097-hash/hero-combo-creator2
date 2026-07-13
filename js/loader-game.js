const GAME_CDN = 'https://cdn.jsdelivr.net/npm/gameloader-js@1.2.1/dist/gameloader.umd.min.js';

let GameLoader = null;
let scriptLoadPromise = null;

function loadGameLoader() {
  if (GameLoader) return Promise.resolve(GameLoader);
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GAME_CDN;
    script.async = true;
    script.onload = () => {
      GameLoader = window.GameLoader;
      delete window.GameLoader;
      resolve(GameLoader);
    };
    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error('Failed to load gameloader-js from CDN'));
    };
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

function vtsTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  return {
    bg: isDark ? '#070b16' : '#f0ebe3',
    canvasBg: isDark ? '#0a0d10' : '#f5f0e8',
    text: isDark ? '#e2e8f0' : '#1e1b16',
    accent: '#7dd3fc',
    danger: '#f87171',
  };
}

const VTS_GAMES = ['dino', 'snake', 'tetris', 'pacman', 'archery'];

export function supportedGames() {
  return [...VTS_GAMES];
}

export async function createGameLoader(options = {}) {
  const lib = await loadGameLoader();
  const game = VTS_GAMES.includes(options.game) ? options.game : 'dino';
  return lib.init({
    game,
    container: options.container || document.body,
    message: options.message || 'Loading...',
    showProgress: options.showProgress !== false,
    highScores: options.highScores !== false,
    minDisplayTime: options.minDisplayTime || 1200,
    theme: { ...vtsTheme(), ...options.theme },
  });
}

export class GameBootOverlay {
  constructor(options = {}) {
    this.game = options.game || 'dino';
    this.loader = null;
    this._container = null;
  }

  async show() {
    const overlay = document.createElement('div');
    overlay.id = 'vtsGameBootOverlay';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:19000;display:flex;align-items:center;justify-content:center;';
    const box = document.createElement('div');
    box.id = 'vtsGameBootBox';
    box.style.cssText =
      'position:relative;width:min(480px,90vw);height:min(640px,90vh);background:var(--vts-bg,#070b16);border-radius:12px;overflow:hidden;';
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    this._container = box;

    this.loader = await createGameLoader({
      game: this.game,
      container: box,
      message: 'Loading season data...',
      showProgress: true,
      minDisplayTime: 800,
    });
    this.loader.show();
  }

  setProgress(pct) {
    this.loader?.setProgress(pct);
  }

  setMessage(text) {
    this.loader?.setMessage(text);
  }

  async hide() {
    if (!this.loader) return;
    await this.loader.hide();
    const el = document.getElementById('vtsGameBootOverlay');
    if (el) el.remove();
    this.loader = null;
  }

  get active() {
    return this.loader !== null;
  }
}
