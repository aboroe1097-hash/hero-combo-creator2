/** Shared helpers for boot mini-game HTML prototypes (local only). */
(function (global) {
  const TYPES = ['claw', 'coil', 'feather', 'ingot'];
  const COLORS = ['blue', 'gold', 'purple'];

  const ASSET_ROOT = '/assets/dm/materials';
  const WING_LEFT = '/images/boot/dreamy-wing-left.webp';
  const WING_RIGHT = '/images/boot/blazing-wing-right.webp';
  const LOGO = '/images/logo-120.webp';
  const VELO_BODY = '/assets/velo/velo-body.webp';
  const VELO_HELMET = '/assets/velo/velo-helmet.webp';

  const CONTROL_CUES = Object.freeze({
    merge: '<kbd>1</kbd><span>=</span><kbd>1</kbd><span>↑</span>',
    sort: '<kbd>A / ←</kbd><span>•</span><kbd>D / →</kbd>',
    relay: '<kbd>{space}</kbd><span>•</span><kbd>◉</kbd>',
    set: '<kbd>✓</kbd><span>•</span><kbd>✕</kbd>',
    rumble: '<kbd>A / ←</kbd><span>•</span><kbd>D / →</kbd>',
  });

  const I18N = global.VTSStandaloneI18n;
  if (!I18N) {
    throw new Error('VTS standalone translations must load before the Arcade game shell.');
  }
  let activeShellConfig = null;
  let activeArcadeCopy = I18N.getCopy('en').arcade;
  let activeCopy = activeArcadeCopy.shell;
  let gameOverOverlayState = null;

  function normalizeLanguage(language) {
    return I18N.normalizeLocale(language);
  }

  function preferredLanguage() {
    const params = new URLSearchParams(window.location.search);
    let language = params.get('lang') || 'en';
    try {
      language = params.get('lang') || localStorage.getItem('vts_hero_lang') || language;
    } catch {
      /* use English */
    }
    return normalizeLanguage(language);
  }

  function shellCopy(language = preferredLanguage()) {
    const normalized = normalizeLanguage(language);
    activeArcadeCopy = I18N.getCopy(normalized).arcade;
    activeCopy = activeArcadeCopy.shell;
    document.documentElement.lang = normalized === 'kr' ? 'ko' : normalized;
    document.documentElement.dir = normalized === 'ar' ? 'rtl' : 'ltr';
    return activeCopy;
  }

  function getCopy() {
    return activeCopy;
  }

  function text(key, values = {}) {
    const template =
      activeArcadeCopy.feedback?.[key] || I18N.getCopy('en').arcade.feedback?.[key] || key;
    return I18N.format(template, values);
  }

  function preferredTheme() {
    const requested = new URLSearchParams(window.location.search).get('theme');
    if (requested === 'light' || requested === 'dark') return requested;
    try {
      const saved = localStorage.getItem('vts_theme') || localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      /* use dark */
    }
    return 'dark';
  }

  function applyGameTheme(theme) {
    const next = theme === 'light' ? 'light' : 'dark';
    if (next === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = next;
  }

  function updateShellLabels(copy) {
    const values = {
      gameBackLabel: `← ${copy.back}`,
      scoreLabel: copy.score,
      bestLabel: copy.best,
      shieldLabel: copy.shield,
      iceLabel: copy.ice,
      fireLabel: copy.fire,
      overlayRestart: copy.again,
      btnRestart: copy.restart,
    };
    for (const [id, value] of Object.entries(values)) {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    }
    const pause = document.getElementById('btnPause');
    if (pause) {
      pause.dataset.pauseLabel = copy.pause;
      pause.dataset.playLabel = copy.play;
      togglePauseBtn(pause, pause.dataset.paused === 'true');
    }
    const controlCues = document.getElementById('gameControlCues');
    if (controlCues) controlCues.innerHTML = controlCue(activeShellConfig?.controlScheme);
  }

  function controlCue(controlScheme = 'relay') {
    const template = CONTROL_CUES[controlScheme] || CONTROL_CUES.relay;
    return template.replace('{space}', activeCopy.spaceKey);
  }

  function localizedGameConfig(config = activeShellConfig) {
    const localized = activeArcadeCopy.games?.[config?.modeKey];
    return {
      mode: localized?.mode || config?.modeKey || '',
      title: localized?.title || '',
      hint: localized?.hint || '',
    };
  }

  function localizeGame(language = preferredLanguage()) {
    if (!activeShellConfig) return;
    const normalized = normalizeLanguage(language);
    const copy = shellCopy(normalized);
    const game = localizedGameConfig();
    updateShellLabels(copy);
    document.getElementById('gameTitle')?.replaceChildren(document.createTextNode(game.title));
    document.getElementById('gameHint')?.replaceChildren(document.createTextNode(game.hint));
    document.getElementById('gameMode')?.replaceChildren(document.createTextNode(game.mode));
    document.title = `${game.mode} - ${game.title}`;
    refreshDynamicGameCopy();
  }

  function applyParentConfig(config) {
    if (!config || config.type !== 'vts:arcade-config') return;
    applyGameTheme(config.theme);
    localizeGame(config.language);
    if (typeof config.title === 'string' && config.title.trim()) {
      document.getElementById('gameTitle')?.replaceChildren(document.createTextNode(config.title));
    }
    if (typeof config.description === 'string' && config.description.trim()) {
      document
        .getElementById('gameHint')
        ?.replaceChildren(document.createTextNode(config.description));
    }
    if (typeof config.mode === 'string' && config.mode.trim()) {
      document.getElementById('gameMode')?.replaceChildren(document.createTextNode(config.mode));
    }
    if (typeof config.title === 'string' && config.title.trim()) {
      const mode = typeof config.mode === 'string' ? config.mode : localizedGameConfig().mode;
      document.title = `${mode.replace(/^.*?([A-E])$/, '$1')} - ${config.title}`;
    }
  }

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    applyParentConfig(event.data);
  });

  applyGameTheme(preferredTheme());

  function materialSrc(color, type) {
    return `${ASSET_ROOT}/${color}/${type}.png`;
  }

  function materialAlt(color, type) {
    const labels = activeArcadeCopy.materials || {};
    return `${labels[color] || color} ${labels[type] || type}`;
  }

  function randomOf(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function now() {
    return performance.now();
  }

  function loadHighScore(key) {
    try {
      return Number(localStorage.getItem(key) || 0) || 0;
    } catch {
      return 0;
    }
  }

  function saveHighScore(key, score) {
    const prev = loadHighScore(key);
    if (score > prev) {
      try {
        localStorage.setItem(key, String(score));
      } catch {
        /* ignore */
      }
      return score;
    }
    return prev;
  }

  function hearts(n) {
    return '♥'.repeat(Math.max(0, n)) + '♡'.repeat(Math.max(0, 3 - n));
  }

  /** Wing growth: start small, feed on successful plays. Scale 0.42 -> ~1.18 */
  const WING_SCALE_MIN = 0.42;
  const WING_SCALE_MAX = 1.18;
  const wingFeed = { ice: 0, fire: 0 };

  function wingEl(side) {
    const s = side === 'ice' || side === 'blue' || side === 'left' ? 'ice' : 'fire';
    return {
      side: s,
      el: document.querySelector(s === 'ice' ? '.wing-left' : '.wing-right'),
    };
  }

  function wingScaleFromFeed(feeds) {
    // Exponential: early feeds grow wings fast, later feeds have diminishing returns
    const progress = 1 - Math.exp(-feeds / 5);
    return clamp(
      WING_SCALE_MIN + (WING_SCALE_MAX - WING_SCALE_MIN) * progress,
      WING_SCALE_MIN,
      WING_SCALE_MAX
    );
  }

  function applyWingScale(side) {
    const { side: s, el } = wingEl(side);
    if (!el) return;
    const feeds = wingFeed[s];
    const scale = wingScaleFromFeed(feeds);
    el.style.setProperty('--wing-scale', String(scale));
    const growth = Math.round(((scale - WING_SCALE_MIN) / (WING_SCALE_MAX - WING_SCALE_MIN)) * 10);
    el.dataset.growth = String(growth);
    const levelEl = document.getElementById(s === 'ice' ? 'wingIce' : 'wingFire');
    if (levelEl) levelEl.textContent = String(feeds);
  }

  function resetWings() {
    wingFeed.ice = 0;
    wingFeed.fire = 0;
    applyWingScale('ice');
    applyWingScale('fire');
  }

  /** Feed a wing (ice/blue/left or fire/gold/right). amount = feed counts (default 1). */
  function feedWing(side, amount = 1) {
    const { side: s } = wingEl(side);
    wingFeed[s] = Math.min(wingFeed[s] + amount, 20);
    applyWingScale(s);
    pulseWing(s);
    return wingFeed[s];
  }

  function getWingFeed() {
    return { ice: wingFeed.ice, fire: wingFeed.fire };
  }

  function pulseWing(side) {
    const { side: s, el } = wingEl(side);
    if (!el) return;
    el.classList.remove('pulse-ice', 'pulse-fire');
    void el.offsetWidth;
    el.classList.add(s === 'ice' ? 'pulse-ice' : 'pulse-fire');
  }

  function gateFx(kind) {
    const gate = document.querySelector('.gate');
    if (!gate) return;
    gate.classList.remove('hit', 'hurt');
    void gate.offsetWidth;
    gate.classList.add(kind === 'hurt' ? 'hurt' : 'hit');
  }

  function refreshDynamicGameCopy() {
    document.querySelectorAll('.piece[data-color][data-type] img').forEach((image) => {
      const piece = image.closest('.piece');
      image.alt = materialAlt(piece?.dataset.color, piece?.dataset.type);
    });

    const overlay = document.getElementById('overlay');
    if (!gameOverOverlayState || !overlay?.classList.contains('show')) return;
    const { isNewBest, score, best } = gameOverOverlayState;
    overlay.querySelector('h2').textContent = isNewBest
      ? `\u2605 ${activeCopy.newBest}`
      : activeCopy.gameOver;
    overlay.querySelector('p').textContent =
      `${activeCopy.score} ${score}  \u00b7  ${activeCopy.best} ${best}`;
  }

  function showOverlay(title, body, state = null) {
    const el = document.getElementById('overlay');
    if (!el) return;
    gameOverOverlayState = state;
    el.querySelector('h2').textContent = title;
    el.querySelector('p').textContent = body;
    const rb = el.querySelector('#overlayRestart');
    if (rb) rb.style.display = 'inline-block';
    el.classList.add('show');
  }

  function hideOverlay() {
    const el = document.getElementById('overlay');
    if (!el) return;
    gameOverOverlayState = null;
    const rb = el.querySelector('#overlayRestart');
    if (rb) rb.style.display = 'none';
    el.classList.remove('show');
  }

  function vibrate(ms = 10) {
    try {
      navigator.vibrate?.(ms);
    } catch {
      /* ignore */
    }
  }

  function mountShell({ modeKey, scoreKey, controlScheme = 'relay', showShield = true }) {
    const copy = shellCopy();
    activeShellConfig = { modeKey, controlScheme };
    const game = localizedGameConfig(activeShellConfig);
    if (new URLSearchParams(window.location.search).get('embed') === '1') {
      document.body.classList.add('is-arcade-embed');
    }
    document.body.innerHTML = `
      <div class="stage" id="stage">
        <a class="btn ghost nav-back" id="gameBackLabel" href="/arcade.html">&larr; ${copy.back}</a>
        <img class="wing wing-left" src="${WING_LEFT}" alt="" width="400" height="416" data-growth="0" />
        <img class="wing wing-right" src="${WING_RIGHT}" alt="" width="341" height="480" data-growth="0" />
        <div class="gate" id="gate"><img src="${LOGO}" alt="" width="44" height="44" /></div>
        <div class="hud">
          <div class="game-brand-row">
            <span class="game-brand">VTS ARCADE</span>
            <span class="mode-tag" id="gameMode">${game.mode}</span>
          </div>
          <h1 id="gameTitle">${game.title}</h1>
          <div class="game-brief">
            <span class="game-velo" aria-hidden="true">
              <img class="game-velo-body" src="${VELO_BODY}" alt="" />
              <img class="game-velo-helmet" src="${VELO_HELMET}" alt="" />
            </span>
            <p class="hint" id="gameHint">${game.hint}</p>
            <span class="control-cues" id="gameControlCues" aria-hidden="true">${controlCue(controlScheme)}</span>
          </div>
          <div class="stats">
            <div class="stat gold"><b id="score">0</b><span id="scoreLabel">${copy.score}</span></div>
            <div class="stat"><b id="best">0</b><span id="bestLabel">${copy.best}</span></div>
            <div class="stat${showShield ? '' : ' hidden'}"><b id="hearts" class="hearts">♥♥♥</b><span id="shieldLabel">${copy.shield}</span></div>
            <div class="stat ice"><b id="wingIce">0</b><span id="iceLabel">${copy.ice}</span></div>
            <div class="stat fire"><b id="wingFire">0</b><span id="fireLabel">${copy.fire}</span></div>
          </div>
        </div>
        <div class="playfield" id="playfield"></div>
        <div class="overlay-msg" id="overlay"><h2></h2><p></p><button type="button" class="btn primary" id="overlayRestart" style="display:none">${copy.again}</button></div>
        <div class="footer-bar">
          <button type="button" class="btn primary" id="btnRestart">${copy.restart}</button>
          <button type="button" class="btn" id="btnPause" data-paused="false" data-pause-label="${copy.pause}" data-play-label="${copy.play}" aria-pressed="false">${copy.pause}</button>
        </div>
      </div>
    `;

    const best = loadHighScore(scoreKey);
    document.getElementById('best').textContent = String(best);
    resetWings();
    localizeGame();

    document.addEventListener('visibilitychange', () => {
      const pause = document.getElementById('btnPause');
      if (document.hidden && pause?.dataset.paused !== 'true') pause.click();
    });

    return {
      stage: document.getElementById('stage'),
      playfield: document.getElementById('playfield'),
      scoreEl: document.getElementById('score'),
      bestEl: document.getElementById('best'),
      heartsEl: document.getElementById('hearts'),
      btnRestart: document.getElementById('btnRestart'),
      btnPause: document.getElementById('btnPause'),
      overlayRestart: document.getElementById('overlayRestart'),
      scoreKey,
    };
  }

  function createPieceEl({ color, type, x, y, interactive }) {
    const el = document.createElement('div');
    el.className = `piece ${color}`;
    el.dataset.color = color;
    el.dataset.type = type;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    if (interactive) {
      el.style.pointerEvents = 'auto';
      el.style.cursor = 'pointer';
    }
    const img = document.createElement('img');
    img.src = materialSrc(color, type);
    img.alt = materialAlt(color, type);
    img.draggable = false;
    el.appendChild(img);
    return el;
  }

  function dist(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return Math.hypot(dx, dy);
  }

  function centerOf(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /* ── Combo tracking ── */
  let comboCount = 0;
  let comboDecayTimer = null;
  const COMBO_DECAY_MS = 3000;

  function comboFactor() {
    if (comboCount < 2) return 1;
    if (comboCount < 4) return 1.5;
    if (comboCount < 8) return 2;
    if (comboCount < 15) return 2.5;
    return 3;
  }

  function feedCombo() {
    comboCount += 1;
    if (comboDecayTimer) clearTimeout(comboDecayTimer);
    comboDecayTimer = setTimeout(() => {
      comboCount = 0;
    }, COMBO_DECAY_MS);
    return { count: comboCount, mult: comboFactor() };
  }

  function getComboCount() {
    return comboCount;
  }

  function resetCombo() {
    comboCount = 0;
    if (comboDecayTimer) clearTimeout(comboDecayTimer);
    comboDecayTimer = null;
  }

  /** Feed correct wing(s) by piece color, factoring combo multiplier. Returns { count, mult }. */
  function feedByColor(color) {
    const { count, mult } = feedCombo();
    const base = color === 'purple' ? 2 : 1;
    const amount = Math.min(Math.round(base * mult), 5);
    if (color === 'purple') {
      feedWing('ice', amount);
      feedWing('fire', amount);
    } else if (color === 'blue') feedWing('ice', amount);
    else feedWing('fire', amount);
    return { count, mult };
  }

  /* ── Combo badge element ── */
  function createComboBadge() {
    const el = document.createElement('div');
    el.className = 'combo-badge';
    el.innerHTML = '<span class="cb-count">0</span>';
    el.style.display = 'none';
    return el;
  }

  function showComboBadge(el, count, mult) {
    if (!el) return;
    if (count < 2) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'flex';
    el.querySelector('.cb-count').textContent = `x${String(mult).replace(/\.0$/, '')}`;
    const tier = Math.min(Math.max(0, Math.floor((count - 2) / 3)), 3);
    el.className = `combo-badge tier-${tier}`;
  }

  /* ── Floating text (e.g. "BONK!", "+12") ── */
  function floatText(x, y, text, color) {
    const el = document.createElement('div');
    el.className = 'float-text';
    el.textContent = text;
    if (color) el.style.color = color;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.querySelector('.stage')?.appendChild(el);
    setTimeout(() => el.remove(), 700);
  }

  /* ── Unified keyboard (A/D, arrows, Space/Esc, R) ── */
  const KB_KEYS = {
    left: ['a', 'A', 'ArrowLeft'],
    right: ['d', 'D', 'ArrowRight'],
    pause: [' ', 'Escape'],
    restart: ['r', 'R'],
  };

  function setupKeyboard(handlers) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      for (const [action, keys] of Object.entries(KB_KEYS)) {
        if (keys.includes(e.key) && handlers[action]) {
          e.preventDefault();
          handlers[action]();
          return;
        }
      }
    });
  }

  /**
   * Best-effort cloud sync of a new personal best. Same-origin dynamic import of the shared
   * arcade module (works embedded in the arcade iframe and standalone); any failure — no
   * network, App Check unavailable, module blocked — is swallowed and the local best stands.
   */
  function reportArcadeScore(scoreKey, score) {
    try {
      import('/js/arcade-scores.js')
        .then((m) => m.pushBestToCloud(scoreKey, score))
        .catch(() => {
          /* offline / blocked — local best already saved, lobby will retry pending */
        });
    } catch {
      /* dynamic import unsupported in this context */
    }
  }

  /* ── Game-over animation: count-up score + "New Best" ── */
  function animateGameOver(scoreEl, bestEl, scoreKey, score) {
    const prevBest = loadHighScore(scoreKey);
    const best = saveHighScore(scoreKey, score);
    bestEl.textContent = String(best);
    const isNewBest = score > prevBest && score > 0;
    if (isNewBest) {
      const velo = document.querySelector('.game-velo');
      velo?.classList.add('is-cheering');
      window.setTimeout(() => velo?.classList.remove('is-cheering'), 1500);
    }
    // Only sync a genuine improvement over the previous personal best.
    if (score > prevBest && score > 0) reportArcadeScore(scoreKey, score);
    let cur = 0;
    const step = Math.max(1, Math.floor(score / 50));
    const interval = setInterval(() => {
      cur = Math.min(cur + step, score);
      scoreEl.textContent = String(cur);
      if (cur >= score) {
        clearInterval(interval);
        const title = isNewBest ? `★ ${activeCopy.newBest}` : activeCopy.gameOver;
        const body = `${activeCopy.score} ${score}  ·  ${activeCopy.best} ${best}`;
        showOverlay(title, body, { isNewBest, score, best });
      }
    }, 20);
  }

  /* ── Pause button helper ── */
  function togglePauseBtn(btn, paused) {
    btn.dataset.paused = paused ? 'true' : 'false';
    btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    btn.textContent = paused
      ? `> ${btn.dataset.playLabel || activeCopy.play}`
      : `|| ${btn.dataset.pauseLabel || activeCopy.pause}`;
  }

  /* ── Hero/skin icon paths for funny modes ── */
  const SKINS_ROOT = '/assets/skins';
  const HEROES_ROOT = '/images/heroes/catchup';
  const HERO_ICONS = [
    { file: 'al-fatih-skin-icon.webp', name: 'Al-Fatih' },
    { file: 'alfred-idling-icon.webp', name: 'Alfred' },
    { file: 'beastqueen-skin-icon.webp', name: 'Beast Queen' },
    { file: 'beowulf-tass-legion-icon.webp', name: 'Beowulf' },
    { file: 'black-prince-skin-icon.webp', name: 'Black Prince' },
    { file: 'caesar-legion-iii-icon.webp', name: 'Caesar' },
    { file: 'charles-the-great-skin-icon.webp', name: 'Charles' },
    { file: 'cleopatra-vii-legion-i-icon.webp', name: 'Cleopatra' },
    { file: 'edward-the-confessor-skin-icon.webp', name: 'Edward' },
    { file: 'immortal-skin-icon.webp', name: 'Immortal' },
    { file: 'jade-eagle-dragon-icon.webp', name: 'Jade Eagle' },
    { file: 'jade-rakshasa-skin-icon.webp', name: 'Jade Rakshasa' },
    { file: 'jeanne-darc-idling-icon.webp', name: 'Jeanne' },
    { file: 'king-arthur-arthur-pendragon-icon.webp', name: 'Arthur' },
    { file: 'lionheart-skin-icon.webp', name: 'Lionheart' },
    { file: 'mary-tudor-skin-icon.webp', name: 'Mary Tudor' },
    { file: 'ramses-ii-tass-legion-icon.webp', name: 'Ramses' },
    { file: 'rozen-blade-legion-ii-icon.webp', name: 'Rozen Blade' },
    { file: 'sky-breaker-skin-icon.webp', name: 'Sky Breaker' },
    { file: 'theodora-royal-icon.webp', name: 'Theodora' },
  ];

  function randomHero() {
    const h = HERO_ICONS[Math.floor(Math.random() * HERO_ICONS.length)];
    return { src: `${SKINS_ROOT}/${h.file}`, name: h.name };
  }

  function heroImg(src, alt, className) {
    const el = document.createElement('img');
    el.src = src;
    el.alt = alt || '';
    el.draggable = false;
    if (className) el.className = className;
    return el;
  }

  /* ── Funny onomatopoeia for hero fight modes ── */
  function fightWord(kind) {
    const pool =
      kind === 'super'
        ? activeArcadeCopy.fight.super
        : kind === 'dodge'
          ? activeArcadeCopy.fight.dodge
          : activeArcadeCopy.fight.hit;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  global.BootGame = {
    TYPES,
    COLORS,
    materialSrc,
    materialAlt,
    WING_LEFT,
    WING_RIGHT,
    LOGO,
    SKINS_ROOT,
    HEROES_ROOT,
    randomOf,
    clamp,
    now,
    loadHighScore,
    saveHighScore,
    hearts,
    pulseWing,
    feedWing,
    resetWings,
    getWingFeed,
    gateFx,
    showOverlay,
    hideOverlay,
    vibrate,
    mountShell,
    createPieceEl,
    dist,
    centerOf,
    feedByColor,
    getComboCount,
    resetCombo,
    createComboBadge,
    showComboBadge,
    floatText,
    setupKeyboard,
    animateGameOver,
    togglePauseBtn,
    getCopy,
    text,
    randomHero,
    heroImg,
    fightWord,
  };
})(window);
