// The HUD. Plain DOM over the canvas, which keeps text crisp, lets the page's
// own CSS tokens style it, and means the touch controls are real buttons with
// real hit areas instead of drawn shapes.
//
// The HUD never reads the simulation directly: the game loop pushes a state
// snapshot into update() at a fixed rate, and one-shot messages arrive through
// toast()/banner()/setOverlay().

import { formatCopy } from '../data/copy.js';

const SVG = {
  pause:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="5" width="4" height="14" rx="1"/><rect x="13" y="5" width="4" height="14" rx="1"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l12 7-12 7z"/></svg>',
  sound:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h3l4-4v14l-4-4H4z"/><path d="M15 7a6 6 0 010 10" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h3l4-4v14l-4-4H4z"/><path d="M15 9l6 6M21 9l-6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
};

export function createHud({ root, copy, heroName }) {
  root.innerHTML = `
    <div class="siege-topbar">
      <div class="siege-stat siege-stat--score">
        <span>${copy.hud.score}</span><strong data-hud="score">0</strong>
      </div>
      <div class="siege-stat"><span>${copy.hud.wave}</span><strong data-hud="wave">1</strong></div>
      <div class="siege-stat siege-stat--gold">
        <img data-hud="goldIcon" alt="" width="20" height="20" /><strong data-hud="gold">0</strong>
      </div>
      <div class="siege-stat siege-stat--best">
        <span>${copy.hud.best}</span><strong data-hud="best">0</strong>
      </div>
      <div class="siege-topbar-actions">
        <button type="button" class="siege-icon-btn" data-hud="mute" aria-label="${copy.hud.mute}"></button>
        <button type="button" class="siege-icon-btn" data-hud="pause" aria-label="${copy.hud.pause}"></button>
      </div>
    </div>

    <div class="siege-core">
      <span class="siege-core-label">${copy.hud.core}</span>
      <div class="siege-core-bar"><i data-hud="coreFill"></i></div>
    </div>

    <div class="siege-banner" data-hud="banner" hidden></div>
    <div class="siege-combo" data-hud="combo" hidden></div>

    <div class="siege-wings">
      <div class="siege-wing siege-wing--ice">
        <img src="/images/boot/dreamy-wing-left.webp" alt="" width="72" height="75" />
        <i data-hud="wingIce"></i>
      </div>
      <div class="siege-wing siege-wing--fire">
        <img src="/images/boot/blazing-wing-right.webp" alt="" width="64" height="90" />
        <i data-hud="wingFire"></i>
      </div>
    </div>

    <div class="siege-dock">
      <div class="siege-hero" title="${heroName}">
        <span class="siege-hero-name">${heroName}</span>
      </div>
      <div class="siege-elements">
        <button type="button" class="siege-element is-ice" data-hud="ice">
          <img src="/assets/dm/materials/blue/feather.png" alt="" width="26" height="26" />
          <span>${copy.elements.elementIce}</span>
        </button>
        <button type="button" class="siege-element is-fire" data-hud="fire">
          <img src="/assets/dm/materials/gold/feather.png" alt="" width="26" height="26" />
          <span>${copy.elements.elementFire}</span>
        </button>
        <button type="button" class="siege-nova" data-hud="nova">
          <i data-hud="novaFill"></i><span>${copy.hud.nova}</span>
        </button>
      </div>
      <div class="siege-build" data-hud="build" hidden>
        <button type="button" data-build="frost" class="is-selected">
          <strong>${copy.towers.towerFrost}</strong><span data-cost="60">60</span>
        </button>
        <button type="button" data-build="ember">
          <strong>${copy.towers.towerEmber}</strong><span data-cost="75">75</span>
        </button>
      </div>
    </div>

    <p class="siege-hint" data-hud="hint">${copy.hud.controls}</p>
    <div class="siege-toast" data-hud="toast" hidden></div>

    <div class="siege-touch" data-hud="touch" aria-hidden="true">
      <div class="siege-stick" data-hud="stick"><i></i></div>
      <button type="button" class="siege-attack" data-hud="attack">
        <span>${copy.hud.attack}</span>
      </button>
    </div>

    <div class="siege-overlay" data-hud="overlay" hidden>
      <div class="siege-overlay-card" role="dialog" aria-modal="true">
        <h2 data-hud="overlayTitle"></h2>
        <p data-hud="overlayBody"></p>
        <div class="siege-overlay-stats" data-hud="overlayStats"></div>
        <div class="siege-overlay-actions" data-hud="overlayActions"></div>
      </div>
    </div>
  `;

  const ref = (name) => root.querySelector(`[data-hud="${name}"]`);
  const nodes = {
    score: ref('score'),
    wave: ref('wave'),
    gold: ref('gold'),
    goldIcon: ref('goldIcon'),
    best: ref('best'),
    coreFill: ref('coreFill'),
    combo: ref('combo'),
    banner: ref('banner'),
    wingIce: ref('wingIce'),
    wingFire: ref('wingFire'),
    ice: ref('ice'),
    fire: ref('fire'),
    nova: ref('nova'),
    novaFill: ref('novaFill'),
    build: ref('build'),
    hint: ref('hint'),
    toast: ref('toast'),
    touch: ref('touch'),
    stick: ref('stick'),
    attack: ref('attack'),
    mute: ref('mute'),
    pause: ref('pause'),
    overlay: ref('overlay'),
    overlayTitle: ref('overlayTitle'),
    overlayBody: ref('overlayBody'),
    overlayStats: ref('overlayStats'),
    overlayActions: ref('overlayActions'),
  };

  let toastTimer = 0;
  let bannerTimer = 0;
  let selectedBuild = 'frost';
  let lastGold = -1;
  let muted = false;
  let paused = false;

  nodes.mute.innerHTML = SVG.sound;
  nodes.pause.innerHTML = SVG.pause;

  const handlers = {
    swap: () => {},
    nova: () => {},
    pause: () => {},
    mute: () => {},
    start: () => {},
    restart: () => {},
    share: () => {},
    buildKind: () => {},
    attack: () => {},
    stick: () => {},
  };

  nodes.ice.addEventListener('click', () => handlers.swap('ice'));
  nodes.fire.addEventListener('click', () => handlers.swap('fire'));
  nodes.nova.addEventListener('click', () => handlers.nova());
  nodes.pause.addEventListener('click', () => handlers.pause());
  nodes.mute.addEventListener('click', () => {
    muted = !muted;
    nodes.mute.innerHTML = muted ? SVG.mute : SVG.sound;
    nodes.mute.setAttribute('aria-label', muted ? copy.hud.unmute : copy.hud.mute);
    handlers.mute(muted);
  });

  for (const button of nodes.build.querySelectorAll('button')) {
    button.addEventListener('click', () => {
      selectedBuild = button.dataset.build;
      for (const other of nodes.build.querySelectorAll('button')) {
        other.classList.toggle('is-selected', other === button);
      }
      handlers.buildKind(selectedBuild);
    });
  }

  // Touch stick: a drag anywhere in the pad becomes a normalised vector.
  let stickPointer = null;
  function updateStick(event) {
    const rect = nodes.stick.getBoundingClientRect();
    const x = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const y = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    const length = Math.hypot(x, y);
    const scale = length > 1 ? 1 / length : 1;
    const nx = x * scale;
    const nz = y * scale;
    nodes.stick.firstElementChild.style.transform = `translate(${nx * 26}px, ${nz * 26}px)`;
    handlers.stick(nx, nz);
  }
  nodes.stick.addEventListener('pointerdown', (event) => {
    stickPointer = event.pointerId;
    nodes.stick.setPointerCapture(event.pointerId);
    updateStick(event);
  });
  nodes.stick.addEventListener('pointermove', (event) => {
    if (stickPointer !== event.pointerId) return;
    updateStick(event);
  });
  const releaseStick = (event) => {
    if (stickPointer !== event.pointerId) return;
    stickPointer = null;
    nodes.stick.firstElementChild.style.transform = '';
    handlers.stick(0, 0);
  };
  nodes.stick.addEventListener('pointerup', releaseStick);
  nodes.stick.addEventListener('pointercancel', releaseStick);

  nodes.attack.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    nodes.attack.classList.add('is-down');
    handlers.attack(true);
  });
  const releaseAttack = () => {
    nodes.attack.classList.remove('is-down');
    handlers.attack(false);
  };
  nodes.attack.addEventListener('pointerup', releaseAttack);
  nodes.attack.addEventListener('pointercancel', releaseAttack);
  nodes.attack.addEventListener('pointerleave', releaseAttack);

  let lastScore = 0;

  return {
    on(next) {
      Object.assign(handlers, next);
    },
    update(state, meta = {}) {
      const score = Math.round(state.score);
      if (score !== lastScore) {
        nodes.score.textContent = score.toLocaleString('en-US');
        lastScore = score;
      }
      nodes.wave.textContent = `${Math.min(state.wave || 1, state.wavesTotal)} / ${state.wavesTotal}`;
      if (state.gold !== lastGold) {
        lastGold = state.gold;
        nodes.gold.textContent = Math.round(state.gold);
      }
      if (meta.best !== undefined) nodes.best.textContent = Math.round(meta.best).toLocaleString('en-US');

      const coreRatio = Math.max(0, state.core.hp / state.core.maxHp);
      nodes.coreFill.style.width = `${(coreRatio * 100).toFixed(1)}%`;
      nodes.coreFill.dataset.state = coreRatio > 0.5 ? 'ok' : coreRatio > 0.25 ? 'warn' : 'bad';

      const combo = state.combo.mult > 1 ? state.combo.mult : 0;
      nodes.combo.hidden = combo === 0;
      if (combo) {
        nodes.combo.textContent = `×${combo.toFixed(2)}`;
        nodes.combo.dataset.state = combo > 3 ? 'hot' : combo > 1.9 ? 'warm' : 'cool';
      }

      const charge = state.combo.count / 12;
      nodes.wingIce.style.height = `${Math.min(100, charge * 100).toFixed(0)}%`;
      nodes.wingFire.style.height = `${Math.min(100, charge * 100).toFixed(0)}%`;

      nodes.ice.classList.toggle('is-active', state.player.element === 'ice');
      nodes.fire.classList.toggle('is-active', state.player.element === 'fire');

      const novaRatio = state.nova.ready ? 1 : state.nova.charge / 100;
      nodes.novaFill.style.width = `${(novaRatio * 100).toFixed(0)}%`;
      nodes.nova.classList.toggle('is-ready', state.nova.ready);

      const building = state.phase === 'build';
      nodes.build.hidden = !building;
      for (const button of nodes.build.querySelectorAll('button')) {
        const cost = Number(button.querySelector('[data-cost]').dataset.cost);
        button.classList.toggle('is-expensive', state.gold < cost);
      }
      nodes.hint.hidden = !building;
    },
    setBuildKind(kind) {
      selectedBuild = kind;
      for (const button of nodes.build.querySelectorAll('button')) {
        button.classList.toggle('is-selected', button.dataset.build === kind);
      }
    },
    buildKind: () => selectedBuild,
    setMuted(value) {
      muted = Boolean(value);
      nodes.mute.innerHTML = muted ? SVG.mute : SVG.sound;
    },
    setPaused(value) {
      paused = Boolean(value);
      nodes.pause.innerHTML = paused ? SVG.play : SVG.pause;
      nodes.pause.setAttribute('aria-label', paused ? copy.hud.resume : copy.hud.pause);
    },
    setTouchVisible(visible) {
      nodes.touch.hidden = !visible;
    },
    toast(text) {
      nodes.toast.textContent = text;
      nodes.toast.hidden = false;
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        nodes.toast.hidden = true;
      }, 1900);
    },
    banner(text, tone = 'wave') {
      nodes.banner.textContent = text;
      nodes.banner.dataset.tone = tone;
      nodes.banner.hidden = false;
      window.clearTimeout(bannerTimer);
      bannerTimer = window.setTimeout(() => {
        nodes.banner.hidden = true;
      }, 2200);
    },
    setOverlay(config) {
      if (!config) {
        nodes.overlay.hidden = true;
        nodes.overlayActions.innerHTML = '';
        nodes.overlayStats.innerHTML = '';
        return;
      }
      nodes.overlay.hidden = false;
      nodes.overlayTitle.textContent = config.title;
      nodes.overlayBody.textContent = config.body;
      nodes.overlayStats.innerHTML = (config.stats || [])
        .map(
          (stat) =>
            `<div class="siege-overlay-stat"><span>${stat.label}</span><strong>${stat.value}</strong></div>`
        )
        .join('');
      nodes.overlayActions.innerHTML = '';
      for (const action of config.actions || []) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = action.primary ? 'siege-btn siege-btn--primary' : 'siege-btn';
        button.textContent = action.label;
        button.addEventListener('click', action.onClick);
        nodes.overlayActions.appendChild(button);
      }
    },
    translate(nextCopy) {
      Object.assign(copy, nextCopy);
      nodes.hint.textContent = copy.hud.controls;
    },
    format: formatCopy,
  };
}
