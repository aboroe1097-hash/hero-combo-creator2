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
        <img data-hud="goldIcon" src="/assets/dm/materials/gold/ingot.png" alt="" width="20" height="20" /><strong data-hud="gold">0</strong>
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

    <div class="siege-bossbar" data-hud="bossBar" hidden>
      <span>${copy.hud.boss}</span>
      <div class="siege-bossbar-track"><i data-hud="bossFill"></i></div>
    </div>

    <div class="siege-banner" data-hud="banner" hidden></div>
    <div class="siege-announce" data-hud="announce" aria-live="polite" hidden></div>
    <div class="siege-combo" data-hud="combo" hidden></div>
    <div class="siege-floaters" data-hud="floaters" aria-hidden="true"></div>

    <div class="siege-tutorial" data-hud="tutorial" hidden>
      <strong>${copy.tutorial.title}</strong>
      <ol data-hud="tutorialSteps"></ol>
      <button type="button" class="siege-btn" data-hud="tutorialSkip">${copy.tutorial.skip}</button>
    </div>

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
        <button type="button" class="siege-nova siege-ult" data-hud="ult">
          <i data-hud="ultFill"></i><span>${copy.hud.ult}</span>
        </button>
      </div>
      <div class="siege-build" data-hud="build" hidden>
        <button type="button" data-build="frost" class="is-selected">
          <strong>${copy.towers.towerFrost}</strong><span data-cost="60">60</span>
        </button>
        <button type="button" data-build="ember">
          <strong>${copy.towers.towerEmber}</strong><span data-cost="75">75</span>
        </button>
        <button type="button" class="siege-build-call" data-hud="callWave">${copy.phases.buildCall}</button>
      </div>
    </div>

    <div class="siege-omen" data-hud="omen" role="group" hidden>
      <div class="siege-omen-head">
        <strong data-hud="omenTitle"></strong>
        <span data-hud="omenBody"></span>
      </div>
      <div class="siege-omen-options" data-hud="omenOptions"></div>
    </div>

    <p class="siege-hint" data-hud="hint">${copy.hud.controls}</p>
    <div class="siege-toast" data-hud="toast" hidden></div>

    <div class="siege-touch" data-hud="touch" aria-hidden="true">
      <div class="siege-stick" data-hud="stick"><i></i></div>
      <button type="button" class="siege-attack" data-hud="attack">
        <span>${copy.hud.attack}</span>
      </button>
      <button type="button" class="siege-dash" data-hud="dash">
        <i data-hud="dashFill"></i><span>${copy.hud.dash}</span>
      </button>
    </div>

    <div class="siege-overlay" data-hud="overlay" hidden>
      <div class="siege-overlay-card" role="dialog" aria-modal="true">
        <p class="siege-overlay-badge" data-hud="overlayBadge" hidden></p>
        <h2 data-hud="overlayTitle"></h2>
        <div class="siege-stars" data-hud="overlayStars" hidden></div>
        <p data-hud="overlayBody"></p>
        <div class="siege-chips" data-hud="overlayChips" hidden></div>
        <div class="siege-overlay-stats" data-hud="overlayStats"></div>
        <div class="siege-feats" data-hud="overlayFeats" hidden>
          <div class="siege-feats-head">
            <span class="siege-feats-label" data-hud="featsLabel"></span>
            <span class="siege-feats-progress" data-hud="featsProgress" hidden></span>
          </div>
          <ul class="siege-feat-list" data-hud="featsList"></ul>
        </div>
        <ol class="siege-history" data-hud="overlayHistory" hidden></ol>
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
    overlayBadge: ref('overlayBadge'),
    overlayStars: ref('overlayStars'),
    overlayChips: ref('overlayChips'),
    overlayHistory: ref('overlayHistory'),
    overlayFeats: ref('overlayFeats'),
    featsLabel: ref('featsLabel'),
    featsProgress: ref('featsProgress'),
    featsList: ref('featsList'),
    omen: ref('omen'),
    omenTitle: ref('omenTitle'),
    omenBody: ref('omenBody'),
    omenOptions: ref('omenOptions'),
    bossBar: ref('bossBar'),
    bossFill: ref('bossFill'),
    announce: ref('announce'),
    floaters: ref('floaters'),
    tutorial: ref('tutorial'),
    tutorialSteps: ref('tutorialSteps'),
    tutorialSkip: ref('tutorialSkip'),
    callWave: ref('callWave'),
    ult: ref('ult'),
    ultFill: ref('ultFill'),
    dash: ref('dash'),
    dashFill: ref('dashFill'),
  };

  // Floating damage numbers: a fixed pool of spans recycled round-robin, so a
  // busy wave never allocates DOM nodes mid-fight.
  const FLOATER_POOL = 28;
  const floaters = [];
  for (let index = 0; index < FLOATER_POOL; index += 1) {
    const span = document.createElement('span');
    span.className = 'siege-floater';
    span.hidden = true;
    span.addEventListener('animationend', () => {
      span.hidden = true;
    });
    nodes.floaters.appendChild(span);
    floaters.push(span);
  }
  let floaterCursor = 0;
  let announceTimer = 0;

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
    ult: () => {},
    dash: () => {},
    skipTutorial: () => {},
    callWave: () => {},
    omen: () => {},
  };

  nodes.ice.addEventListener('click', () => handlers.swap('ice'));
  nodes.fire.addEventListener('click', () => handlers.swap('fire'));
  nodes.nova.addEventListener('click', () => handlers.nova());
  nodes.ult.addEventListener('click', () => handlers.ult());
  nodes.dash.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    handlers.dash();
  });
  nodes.tutorialSkip.addEventListener('click', () => handlers.skipTutorial());
  // Touch players have no Enter key; this is how they cut the build timer short.
  nodes.callWave.addEventListener('click', () => handlers.callWave());
  nodes.pause.addEventListener('click', () => handlers.pause());
  nodes.mute.addEventListener('click', () => {
    muted = !muted;
    nodes.mute.innerHTML = muted ? SVG.mute : SVG.sound;
    nodes.mute.setAttribute('aria-label', muted ? copy.hud.unmute : copy.hud.mute);
    handlers.mute(muted);
  });

  for (const button of nodes.build.querySelectorAll('button[data-build]')) {
    button.addEventListener('click', () => {
      selectedBuild = button.dataset.build;
      for (const other of nodes.build.querySelectorAll('button[data-build]')) {
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
  let lastTutorialSignature = '';

  /**
   * The feat board: { label, progressLabel, items: [{ id?, name, desc, done }] }.
   * Every row is rendered — the stylesheet caps the visible rows so a longer
   * list scrolls inside the card, which already scrolls, instead of hiding
   * feats the player has earned. An item may carry only an id; its name and
   * description then come from copy.feats.<id>.
   */
  function renderFeats(feats) {
    nodes.featsList.innerHTML = '';
    nodes.overlayFeats.hidden = !feats;
    if (!feats) {
      nodes.featsLabel.textContent = '';
      nodes.featsProgress.textContent = '';
      nodes.featsProgress.hidden = true;
      return;
    }
    const label = feats.label || copy.feats?.title || '';
    nodes.featsLabel.textContent = label;
    if (label) nodes.overlayFeats.setAttribute('aria-label', label);
    const progress = feats.progressLabel || '';
    nodes.featsProgress.textContent = progress;
    nodes.featsProgress.hidden = !progress;
    for (const item of Array.isArray(feats.items) ? feats.items : []) {
      const known = (item.id && copy.feats?.[item.id]) || {};
      const row = document.createElement('li');
      row.className = item.done ? 'siege-feat is-done' : 'siege-feat';
      const glyph = document.createElement('i');
      glyph.className = 'siege-feat-glyph';
      glyph.setAttribute('aria-hidden', 'true');
      if (item.done) glyph.textContent = '✦';
      const name = document.createElement('strong');
      name.className = 'siege-feat-name';
      name.textContent = item.name || known.name || item.id || '';
      const desc = document.createElement('span');
      desc.className = 'siege-feat-desc';
      desc.textContent = item.desc || known.desc || '';
      row.append(glyph, name, desc);
      // The lock state is a colour and a glyph; spell it out for readers.
      if (item.done) {
        const state = document.createElement('span');
        state.className = 'siege-feat-state';
        state.textContent = copy.feats?.unlocked || '';
        row.appendChild(state);
      }
      nodes.featsList.appendChild(row);
    }
  }

  function hideOmen() {
    nodes.omen.hidden = true;
    nodes.omenOptions.innerHTML = '';
  }

  /**
   * The wave omen chooser: { title?, body?, options: [{ id, label, desc, active }] }.
   * The HUD is a pure view here — a pick only reaches the game through the
   * `omen` handler registered with on(), never by touching game state.
   */
  function showOmen(config = {}) {
    const options = Array.isArray(config.options) ? config.options : [];
    // Nothing to choose from: render nothing rather than an empty panel.
    if (!options.length) {
      hideOmen();
      return;
    }
    const title = config.title || copy.omens?.title || '';
    const body = config.body || copy.omens?.body || '';
    nodes.omenTitle.textContent = title;
    nodes.omenTitle.hidden = !title;
    nodes.omenBody.textContent = body;
    nodes.omenBody.hidden = !body;
    if (title) nodes.omen.setAttribute('aria-label', title);
    nodes.omenOptions.innerHTML = '';
    for (const option of options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = option.active ? 'siege-omen-btn is-active' : 'siege-omen-btn';
      const label = document.createElement('strong');
      label.textContent = option.label || option.id || '';
      const desc = document.createElement('span');
      desc.textContent = option.desc || '';
      desc.hidden = !option.desc;
      button.append(label, desc);
      if (option.active) button.setAttribute('aria-pressed', 'true');
      button.addEventListener('click', () => handlers.omen(option.id));
      nodes.omenOptions.appendChild(button);
    }
    nodes.omen.hidden = false;
  }

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
      if (state.tutorial?.active) nodes.wave.textContent = copy.hud.training;
      else if (state.endless) nodes.wave.textContent = String(Math.max(1, state.wave));
      else
        nodes.wave.textContent = `${Math.min(state.wave || 1, state.wavesTotal)} / ${state.wavesTotal}`;
      if (state.gold !== lastGold) {
        lastGold = state.gold;
        nodes.gold.textContent = Math.round(state.gold);
      }
      if (meta.best !== undefined)
        nodes.best.textContent = Math.round(meta.best).toLocaleString('en-US');

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

      const ult = state.ult || { charge: 0, ready: false, activeMs: 0 };
      const ultRatio = ult.activeMs > 0 ? ult.activeMs / 6500 : ult.charge / 100;
      nodes.ultFill.style.width = `${Math.min(100, ultRatio * 100).toFixed(0)}%`;
      nodes.ult.classList.toggle('is-ready', ult.ready);
      nodes.ult.classList.toggle('is-active', ult.activeMs > 0);

      const dashCd = Math.max(0, state.player.dashCdMs || 0);
      nodes.dashFill.style.height = `${Math.min(100, (dashCd / 1500) * 100).toFixed(0)}%`;
      nodes.dash.classList.toggle('is-cooling', dashCd > 0);

      const boss = state.units.find((unit) => unit.boss);
      nodes.bossBar.hidden = !boss;
      if (boss) {
        nodes.bossFill.style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100).toFixed(1)}%`;
        nodes.bossBar.classList.toggle('is-telegraphing', Boolean(boss.telegraph));
      }

      const tutorial = state.tutorial;
      nodes.tutorial.hidden = !tutorial?.active;
      if (tutorial?.active) {
        const signature = Object.values(tutorial.steps).join(',');
        if (signature !== lastTutorialSignature) {
          lastTutorialSignature = signature;
          nodes.tutorialSteps.innerHTML = '';
          for (const [step, done] of Object.entries(tutorial.steps)) {
            const item = document.createElement('li');
            item.textContent = copy.tutorial[step] || step;
            item.classList.toggle('is-done', Boolean(done));
            nodes.tutorialSteps.appendChild(item);
          }
        }
      }

      const building = state.phase === 'build';
      nodes.build.hidden = !building;
      for (const button of nodes.build.querySelectorAll('button[data-build]')) {
        const cost = Number(button.querySelector('[data-cost]').dataset.cost);
        button.classList.toggle('is-expensive', state.gold < cost);
      }
      nodes.hint.hidden = !building;
    },
    setBuildKind(kind) {
      selectedBuild = kind;
      for (const button of nodes.build.querySelectorAll('button[data-build]')) {
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
    /** Dim the wing buttons while the swap sits on its cooldown. */
    setSwapReady(ready) {
      for (const node of [nodes.wingIce, nodes.wingFire, nodes.ice, nodes.fire]) {
        node?.classList.toggle('is-cooling', !ready);
      }
    },
    showOmen,
    hideOmen,
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
        renderFeats(null);
        return;
      }
      nodes.overlay.hidden = false;
      nodes.overlayTitle.textContent = config.title;
      nodes.overlayTitle.classList.toggle('is-title', Boolean(config.big));
      nodes.overlayBody.textContent = config.body;
      nodes.overlayBadge.hidden = !config.badge;
      nodes.overlayBadge.textContent = config.badge || '';
      nodes.overlayStars.hidden = config.stars === undefined;
      nodes.overlayStars.innerHTML = '';
      if (config.stars !== undefined) {
        nodes.overlayStars.setAttribute('aria-label', `${copy.results.stars}: ${config.stars} / 3`);
        for (let index = 0; index < 3; index += 1) {
          const star = document.createElement('i');
          star.className = index < config.stars ? 'is-lit' : '';
          nodes.overlayStars.appendChild(star);
        }
      }
      nodes.overlayChips.hidden = !config.chips?.length;
      nodes.overlayChips.innerHTML = '';
      for (const group of config.chips || []) {
        const row = document.createElement('div');
        row.className = 'siege-chip-row';
        const label = document.createElement('span');
        label.textContent = group.label;
        row.appendChild(label);
        for (const chip of group.items) {
          const link = document.createElement('a');
          link.className = chip.active ? 'siege-chip is-active' : 'siege-chip';
          link.href = chip.href;
          link.textContent = chip.label;
          if (chip.title) link.title = chip.title;
          if (chip.active) link.setAttribute('aria-current', 'true');
          row.appendChild(link);
        }
        nodes.overlayChips.appendChild(row);
      }
      nodes.overlayHistory.hidden = !config.history?.length;
      nodes.overlayHistory.innerHTML = '';
      if (config.historyLabel) nodes.overlayHistory.setAttribute('aria-label', config.historyLabel);
      for (const line of config.history || []) {
        const item = document.createElement('li');
        item.textContent = line;
        nodes.overlayHistory.appendChild(item);
      }
      nodes.overlayStats.innerHTML = '';
      for (const stat of config.stats || []) {
        const cell = document.createElement('div');
        cell.className = 'siege-overlay-stat';
        const label = document.createElement('span');
        label.textContent = stat.label;
        const value = document.createElement('strong');
        value.textContent = stat.value;
        cell.append(label, value);
        nodes.overlayStats.appendChild(cell);
      }
      renderFeats(config.feats);
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
    /** A number or word that rises off a point on screen and fades. */
    floatText(x, y, text, tone = '') {
      const span = floaters[floaterCursor];
      floaterCursor = (floaterCursor + 1) % floaters.length;
      span.hidden = true;
      span.className = tone ? `siege-floater is-${tone}` : 'siege-floater';
      span.textContent = text;
      span.style.left = `${x.toFixed(0)}px`;
      span.style.top = `${y.toFixed(0)}px`;
      // Force a reflow so re-using a node restarts its animation.
      void span.offsetWidth;
      span.hidden = false;
    },
    announce(text, tone = '') {
      nodes.announce.textContent = text;
      nodes.announce.dataset.tone = tone;
      nodes.announce.hidden = true;
      void nodes.announce.offsetWidth;
      nodes.announce.hidden = false;
      window.clearTimeout(announceTimer);
      announceTimer = window.setTimeout(() => {
        nodes.announce.hidden = true;
      }, 1500);
    },
    translate(nextCopy) {
      Object.assign(copy, nextCopy);
      nodes.hint.textContent = copy.hud.controls;
    },
    format: formatCopy,
  };
}
