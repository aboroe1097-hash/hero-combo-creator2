import { mountToolShell } from './tool-shell.js';
import '../css/standalone-footer-v14.css';
import '../css/tool-shell.css';
import { createAllStarBohAccessClient, AllStarBohAccessError } from './all-star-boh-access.js';
import {
  buildBohStatsOcrRequest,
  buildBohStatsReviewModel,
  BOH_STATS_REQUIRED_POWER_FIELDS,
  getSingleBohStatsScreenshot,
  prepareBohStatsScreenshot,
} from './all-star-boh-ocr.js';
import {
  ensureAnonymousAuth,
  getCurrentUser,
  getFirebaseAppCheckToken,
  initFirebase,
} from './firebase.js';
import { createVtsScoreI18n } from './vts-score-i18n.js';
import { competitionExactNameKey } from './competition-growth.js';
import {
  DEAD_TROOP_CLASSES,
  DEAD_TROOP_UNITS,
  DEAD_TROOP_VARIANTS,
  deadTroopRowPower,
  deadTroopsTotalPower,
} from './dead-troops.js';
import { buildSignupOcrAudit, mapOcrReviewToSignupFields } from './vts-score-signup-ocr.js';
import {
  buildVtsScoreSubmission,
  rankVtsScorePlayers,
  resolveVtsScorePlayer,
  VTS_SCORE_POWER_FIELDS,
} from './vts-score-model.js';
import {
  BOH_SIGNUP_SAVE_ERROR,
  createBohSignupSession,
  loadBohSignupFirestore,
} from './boh-signup-form.js';
import {
  COMPETITION_SCHEDULE_DOC_PATH,
  getCompetitionPhase,
  getCompetitionPhaseEndsAt,
  normalizeCompetitionSchedule,
} from './competition-schedule.js';
import {
  formatGameTime,
  formatLocalTime,
  getCompetitionPageState,
  mountSlotPicker,
  phaseCopyKeys,
  splitCountdown,
  VTS_SCORE_SLOT_CATALOGS,
} from './vts-score-competition.js';

const SCHEDULE_READ_TIMEOUT_MS = 8000;

/**
 * The Competition #12 schedule document. Any signed-in account (the page's
 * anonymous one included) may read it; a missing document means "no schedule"
 * and the page keeps its unscheduled behaviour.
 */
async function readCompetitionSchedule(loadFirestore = loadBohSignupFirestore) {
  const { firestore, db } = await loadFirestore();
  const snapshot = await firestore.getDoc(firestore.doc(db, COMPETITION_SCHEDULE_DOC_PATH));
  return snapshot?.exists?.() ? snapshot.data() : null;
}

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

const POWER_FIELD_I18N = Object.freeze({
  totalCastlePower: 'fieldTotalCastlePower',
  troopPower: 'fieldTroopPower',
  buildingPower: 'fieldBuildingPower',
  technologyPower: 'fieldTechnologyPower',
  heroCombatPower: 'fieldHeroCombatPower',
  dragonPower: 'fieldDragonPower',
  unitSpecialtyPower: 'fieldUnitSpecialtyPower',
  artifactPower: 'fieldArtifactPower',
  royalTechPower: 'fieldRoyalTechPower',
});

function element(id) {
  return document.getElementById(id);
}

function setHidden(target, hidden) {
  if (!target) return;
  target.hidden = Boolean(hidden);
}

/**
 * The status banner sits above the workspace, so on a phone it is hundreds of
 * pixels off-screen while the member is looking at the Read or Submit button.
 * Without this, a failed upload looks like nothing happened at all.
 */
function revealElement(target) {
  if (!target || target.hidden || typeof target.getBoundingClientRect !== 'function') return;
  const rect = target.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  if (rect.top >= 0 && rect.bottom <= viewportHeight) return;
  // Instant, not smooth: a smooth scroll can be dropped or interrupted, and an
  // error the member is waiting on must never depend on an animation landing.
  target.scrollIntoView({ block: 'center' });
}

function setStatus(message, tone = 'neutral') {
  const status = element('vtsScoreStatus');
  if (!status) return;
  status.textContent = message || '';
  status.dataset.tone = tone;
  status.hidden = !message;
  if (message && (tone === 'error' || tone === 'warning')) revealElement(status);
}

function friendlyError(error) {
  const messages = {
    access_denied: 'That member PIN was not accepted.',
    access_expired: 'Your member access expired. Enter the PIN again.',
    already_submitted:
      'A final score is already saved for this player. Contact leadership if it needs correction.',
    app_check_required: 'Secure app verification is not ready. Refresh and try again.',
    auth_required: 'Secure sign-in is required. Refresh the page and try again.',
    boh_ocr_not_configured: 'The OCR service is not configured. Contact leadership.',
    invalid_app_check: 'Secure app verification failed. Refresh and try again.',
    invalid_auth: 'Secure sign-in expired. Refresh and try again.',
    invalid_json: 'The secure service rejected the request format. Refresh and try again.',
    invalid_request: 'The secure service rejected the request. Refresh and try again.',
    invalid_provider_response:
      'Could not read that screenshot. Enter the numbers manually or try a clearer Power screenshot.',
    method_not_allowed: 'The secure service rejected the request method. Refresh and try again.',
    origin_denied:
      'This address is not allowed to use the secure service. Open the official site and try again.',
    rate_limited: 'Too many attempts. Wait a few minutes and try again.',
    request_too_large:
      'The screenshot is too large for the secure service. Try a smaller or cropped image.',
    request_timeout: 'Reading the screenshot took too long. Try a smaller or clearer image.',
    service_unavailable:
      'The secure service is temporarily unavailable. Try again in a few minutes.',
    signup_changed: 'That signup name changed. Refresh the player list and select it again.',
    signup_not_found: 'That signup is no longer eligible.',
    signups_closed: 'Signups are closed for this competition.',
    temporarily_locked: 'This account is temporarily locked. Wait a few minutes and try again.',
    unsupported_media_type: 'That image type is not supported. Use PNG, JPEG, or WebP.',
  };
  const code = typeof error?.code === 'string' ? error.code : '';
  let message =
    (code && messages[code]) ||
    error?.message ||
    'VtsScore could not complete that request. Please try again.';
  if (
    code === 'rate_limited' &&
    Number.isInteger(error?.retryAfterSeconds) &&
    error.retryAfterSeconds > 0
  ) {
    const minutes = Math.max(1, Math.ceil(error.retryAfterSeconds / 60));
    message = `Too many attempts. Wait about ${minutes} ${
      minutes === 1 ? 'minute' : 'minutes'
    } and try again.`;
  }
  // Members report screenshots of this banner; the machine code identifies the exact failure.
  return code ? `${message} (${code})` : message;
}

function applyTheme(themeInput) {
  const theme = themeInput === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem('vts_theme', theme);
    localStorage.setItem('theme', theme);
  } catch {
    // The active document still receives the selected theme when storage is restricted.
  }
  const meta = element('themeColorMeta');
  if (meta) meta.content = theme === 'light' ? '#eef6fa' : '#08111f';
  const toggle = element('vtsScoreThemeToggle');
  if (!toggle) return;
  toggle.dataset.theme = theme;
  toggle.setAttribute(
    'aria-label',
    theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'
  );
  const icon = toggle.querySelector('[aria-hidden="true"]');
  if (icon) icon.textContent = theme === 'light' ? '☀' : '☾';
}

function initializePreferences(i18n) {
  i18n.apply();
  element('vtsScoreLanguage')?.addEventListener('change', (event) => {
    i18n.apply(event.target.value);
  });
  applyTheme(document.documentElement.dataset.theme);
  element('vtsScoreThemeToggle')?.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
  });
}

function setProgress(busy) {
  const progress = element('vtsScoreProgress');
  const status = element('vtsScoreStatus');
  if (!progress) return;
  progress.hidden = !busy;
  if (status) status.hidden = busy || !status.textContent;
  if (busy) revealElement(progress);
}

function setBusy(button, busy, busyText) {
  if (!button) return;
  if (!button.dataset.defaultText) button.dataset.defaultText = button.textContent;
  button.disabled = Boolean(busy);
  button.textContent = busy ? busyText : button.dataset.defaultText;
  // Re-captured on the next busy spell, so a language or phase relabel in
  // between is kept.
  if (!busy) delete button.dataset.defaultText;
}

export async function bootVtsScore(options = {}) {
  const i18n = createVtsScoreI18n();
  initializePreferences(i18n);
  const state = {
    client: null,
    authUser: null,
    file: null,
    grant: null,
    players: [],
    selectedPlayer: null,
    visiblePlayers: [],
    highlightedPlayerIndex: -1,
    review: null,
    signupFile: null,
    signupOcrReview: null,
    signup: null,
    signupSession: null,
    scoreWorkspaceOpen: false,
    schedule: null,
    phase: 'unconfigured',
    pickers: {},
    countdownTimer: 0,
    previousComparisonReady: false,
    previousComparisonCheckedKey: '',
    previousComparisonLoading: false,
    previousComparisonTimer: 0,
    growthBoardRefreshTimer: 0,
  };
  const now = () => (typeof options.now === 'function' ? options.now() : Date.now());
  const pinPanel = element('vtsScoreGate');
  const signupPanel = element('vtsScoreSignup');
  const signupSuccess = element('vtsScoreSignupSuccess');
  const signupForm = element('vtsScoreSignupForm');
  const signupNameInput = signupForm?.querySelector('[data-boh-field="gameName"]');
  const signupPublicConsent = element('vtsScoreSignupPublicConsent');
  const signupButton = element('vtsScoreSignupSubmit');
  const scorePanel = element('vtsScoreWorkspace');
  const pinForm = element('vtsScorePinForm');
  const scoreForm = element('vtsScoreForm');
  const readButton = element('vtsScoreReadButton');
  const submitButton = element('vtsScoreSubmitButton');
  const fileInput = element('vtsScoreImage');
  const powerFields = element('vtsScorePowerFields');
  const playerInput = element('vtsScorePlayer');
  const playerResults = element('vtsScorePlayerResults');
  let signupNameTouched = false;
  function savedComparisonKey() {
    const name = competitionExactNameKey(signupNameInput?.value);
    const savedName = competitionExactNameKey(state.signup?.gameName);
    if (
      state.signup?.status !== 'submitted' ||
      state.signup?.commitment?.publicComparisonConsent !== true ||
      signupPublicConsent?.checked !== true ||
      !name ||
      name !== savedName
    ) {
      return '';
    }
    return `${state.signup.revision || 0}:${name}`;
  }
  function renderPreviousComparisonHint() {
    const hint = element('vtsScoreComparisonHint');
    if (!hint) return;
    const key = savedComparisonKey();
    if (!key || state.previousComparisonCheckedKey !== key) {
      setHidden(hint, true);
      return;
    }
    if (state.previousComparisonReady) {
      hint.textContent = i18n.text('previousComparisonReadyPublic');
      setHidden(hint, false);
      return;
    }
    // No safe prior match: the name may predate a rename or a new account, so
    // ask for the name they uploaded under before.
    hint.textContent = i18n.text('previousComparisonNoMatch');
    setHidden(hint, false);
  }

  async function checkPreviousComparison() {
    const key = savedComparisonKey();
    if (
      !key ||
      state.previousComparisonCheckedKey === key ||
      state.previousComparisonLoading ||
      !state.client ||
      !state.grant
    ) {
      renderPreviousComparisonHint();
      return;
    }
    state.previousComparisonLoading = true;
    try {
      const result = await state.client.getPreviousComparisonStatus(signupNameInput.value);
      if (savedComparisonKey() !== key) return;
      state.previousComparisonReady = result.ready;
      state.previousComparisonCheckedKey = key;
      renderPreviousComparisonHint();
    } catch {
      // The comparison hint is optional and must never block registration.
    } finally {
      state.previousComparisonLoading = false;
    }
  }

  signupNameInput?.addEventListener('input', () => {
    signupNameTouched = true;
    renderPreviousComparisonHint();
    if (!savedComparisonKey()) return;
    clearTimeout(state.previousComparisonTimer);
    state.previousComparisonTimer = setTimeout(() => void checkPreviousComparison(), 350);
  });
  signupPublicConsent?.addEventListener('change', () => {
    renderPreviousComparisonHint();
    if (savedComparisonKey()) void checkPreviousComparison();
  });

  function powerInput(field) {
    return powerFields?.querySelector(`[data-vts-power-field="${field}"]`);
  }

  function clearPowerFields() {
    powerFields?.replaceChildren();
    setHidden(powerFields, true);
    if (deadTroopsMount) setHidden(deadTroopsMount, true);
  }

  function renderPowerFields() {
    if (!powerFields || !state.review) return;
    powerFields.replaceChildren();
    for (const field of VTS_SCORE_POWER_FIELDS) {
      const value = state.review.confirmedValues?.[field] ?? null;
      const original = state.review.ocrValues?.[field] ?? null;
      const confidence = state.review.confidence?.[field];
      const required = BOH_STATS_REQUIRED_POWER_FIELDS.includes(field);
      const card = document.createElement('label');
      card.className = 'vts-score-power-field';
      card.htmlFor = `vtsScorePower-${field}`;

      const heading = document.createElement('span');
      heading.className = 'vts-score-power-field__heading';
      const name = document.createElement('strong');
      name.dataset.vtsI18n = POWER_FIELD_I18N[field];
      name.textContent = i18n.text(POWER_FIELD_I18N[field]);
      heading.append(name);
      if (!required) {
        const optional = document.createElement('small');
        optional.className = 'vts-score-power-field__optional';
        optional.dataset.vtsI18n = 'optional';
        optional.textContent = i18n.text('optional');
        heading.append(optional);
      }

      const input = document.createElement('input');
      input.id = `vtsScorePower-${field}`;
      input.type = 'number';
      input.min = '0';
      input.max = '100000000000';
      input.step = '1';
      input.inputMode = 'numeric';
      input.autocomplete = 'off';
      input.required = required;
      input.dataset.vtsPowerField = field;
      input.value = value === null ? '' : String(value);

      const meta = document.createElement('span');
      meta.className = 'vts-score-power-field__meta';
      const ocrValue = original === null ? i18n.text('notDetected') : i18n.formatNumber(original);
      const confidenceText =
        typeof confidence === 'number'
          ? `${Math.round(confidence * 100)}% ${i18n.text('confidence')}`
          : i18n.text('reviewRequired');
      meta.textContent = `${i18n.text('ocrRead')}: ${ocrValue} · ${confidenceText}`;
      card.append(heading, input, meta);
      powerFields.append(card);
    }
    setHidden(powerFields, false);
    // The dead-troops preview reads the Troop Power and Total fields.
    powerFields.oninput = () => updateDeadTroopReadouts();
    renderDeadTroops();
  }

  // Dead-troops helper: counts what dead troops return once they heal and adds
  // that power on top of the entered Troop Power and Total. The counts survive
  // re-renders, so re-reading a screenshot or switching language keeps them.
  const deadTroopState = { enabled: false, unit: 'thousands', counts: new Map() };
  const deadTroopsMount = element('vtsScoreDeadTroops');

  function deadTroopEl(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function deadTroopRows() {
    const rows = [];
    for (const className of DEAD_TROOP_CLASSES) {
      for (const variant of DEAD_TROOP_VARIANTS) {
        rows.push({
          className,
          variant,
          count: deadTroopState.counts.get(`${className}:${variant}`) ?? '',
        });
      }
    }
    return rows;
  }

  function deadTroopsPower() {
    return deadTroopState.enabled ? deadTroopsTotalPower(deadTroopRows(), deadTroopState.unit) : 0;
  }

  function updateDeadTroopReadouts() {
    if (!deadTroopsMount) return;
    for (const label of deadTroopsMount.querySelectorAll('[data-dead-troop-cell]')) {
      const { deadTroopClass: className, deadTroopVariant: variant } = label.dataset;
      const power = deadTroopRowPower(deadTroopState.counts.get(`${className}:${variant}`) ?? '', {
        className,
        variant,
        unit: deadTroopState.unit,
      });
      const readout = label.querySelector('[data-dead-troop-power]');
      if (readout) readout.textContent = power ? `+${i18n.formatNumber(power)}` : '—';
    }
    const total = deadTroopsPower();
    const totalEl = deadTroopsMount.querySelector('[data-dead-troop-total]');
    if (totalEl) {
      totalEl.textContent = `${i18n.text('deadTroopsTotal')}: ${i18n.formatNumber(total)}`;
    }
    const previewEl = deadTroopsMount.querySelector('[data-dead-troop-preview]');
    if (previewEl) {
      const base = (field) => {
        const value = Number(powerInput(field)?.value);
        return Number.isFinite(value) ? value : 0;
      };
      previewEl.textContent = i18n.text('deadTroopsPreview', {
        troop: i18n.formatNumber(base('troopPower') + total),
        total: i18n.formatNumber(base('totalCastlePower') + total),
      });
    }
  }

  function renderDeadTroops() {
    if (!deadTroopsMount || !state.review) return;
    // Styles load with the helper instead of the initial page budget.
    void import('../css/dead-troops.css');
    const classLabels = {
      lofty: 'deadTroopsClassLofty',
      footmen: 'deadTroopsClassFootmen',
      cavalry: 'deadTroopsClassCavalry',
      archers: 'deadTroopsClassArchers',
    };
    const variantLabels = {
      t10e: 'deadTroopsVariantT10E',
      t10: 'deadTroopsVariantT10',
      t9e: 'deadTroopsVariantT9E',
      t9: 'deadTroopsVariantT9',
    };
    deadTroopsMount.replaceChildren();

    const box = deadTroopEl('fieldset', 'vts-score-dead-troops__box');
    box.append(deadTroopEl('legend', '', i18n.text('deadTroopsTitle')));

    const toggle = deadTroopEl('label', 'vts-score-dead-troops__toggle');
    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = deadTroopState.enabled;
    toggleInput.dataset.deadTroopToggle = '';
    toggle.append(toggleInput, deadTroopEl('span', '', i18n.text('deadTroopsToggle')));
    toggleInput.addEventListener('change', () => {
      deadTroopState.enabled = toggleInput.checked;
      grid.hidden = !deadTroopState.enabled;
      updateDeadTroopReadouts();
    });
    box.append(toggle);

    const unitRow = deadTroopEl('div', 'vts-score-dead-troops__unit');
    unitRow.append(deadTroopEl('span', '', i18n.text('deadTroopsUnitLabel')));
    for (const unit of DEAD_TROOP_UNITS) {
      const option = deadTroopEl('label', 'vts-score-dead-troops__unit-option');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'vtsScoreDeadTroopUnit';
      radio.value = unit;
      radio.checked = deadTroopState.unit === unit;
      radio.addEventListener('change', () => {
        deadTroopState.unit = unit;
        updateDeadTroopReadouts();
      });
      option.append(radio, deadTroopEl('span', '', i18n.text(unit === 'millions' ? 'deadTroopsMillions' : 'deadTroopsThousands')));
      unitRow.append(option);
    }
    box.append(unitRow);

    const grid = deadTroopEl('div', 'vts-score-dead-troops__grid');
    grid.hidden = !deadTroopState.enabled;
    for (const className of DEAD_TROOP_CLASSES) {
      const group = deadTroopEl('div', 'vts-score-dead-troops__class');
      group.append(deadTroopEl('strong', 'vts-score-dead-troops__class-name', i18n.text(classLabels[className])));
      for (const variant of DEAD_TROOP_VARIANTS) {
        const cell = deadTroopEl('label', 'vts-score-dead-troops__cell');
        cell.dataset.deadTroopClass = className;
        cell.dataset.deadTroopVariant = variant;
        const badge = deadTroopEl(
          'span',
          `vts-score-dead-troops__badge${variant.includes('e') ? ' is-enhanced' : ''}`,
          variant.startsWith('t10') ? 'T10' : 'T9'
        );
        const name = deadTroopEl('span', 'vts-score-dead-troops__variant', i18n.text(variantLabels[variant]));
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.step = 'any';
        input.inputMode = 'decimal';
        input.autocomplete = 'off';
        input.dataset.deadTroopCount = `${className}:${variant}`;
        input.value = deadTroopState.counts.get(`${className}:${variant}`) ?? '';
        input.addEventListener('input', () => {
          deadTroopState.counts.set(`${className}:${variant}`, input.value);
          updateDeadTroopReadouts();
        });
        const power = deadTroopEl('small', 'vts-score-dead-troops__row-power');
        power.dataset.deadTroopPower = '';
        cell.append(badge, name, input, power);
        grid.append(cell);
      }
    }
    box.append(grid);

    const total = deadTroopEl('p', 'vts-score-dead-troops__total');
    total.dataset.deadTroopTotal = '';
    const preview = deadTroopEl('p', 'vts-score-dead-troops__preview');
    preview.dataset.deadTroopPreview = '';
    box.append(total, preview);
    deadTroopsMount.append(box);

    setHidden(deadTroopsMount, false);
    updateDeadTroopReadouts();
  }

  function collectPowerValues() {
    const dead = deadTroopsPower();
    return Object.fromEntries(
      VTS_SCORE_POWER_FIELDS.map((field) => {
        const value = powerInput(field)?.value.trim() ?? '';
        const parsed = value === '' ? null : Number(value);
        // Dead-troops power lands on top of Troop Power and Total Combat Power.
        if (dead && (field === 'troopPower' || field === 'totalCastlePower')) {
          return [field, (parsed ?? 0) + dead];
        }
        return [field, parsed];
      })
    );
  }

  element('vtsScoreLanguage')?.addEventListener('change', () => {
    if (state.review) renderPowerFields();
  });

  /**
   * One screenshot through the secured OCR worker (buildBohStatsOcrRequest →
   * the member access client), as the review model both the score upload and
   * the registration read. The image is sent once and never stored.
   */
  async function readPowerScreenshot(file) {
    const prepared = await prepareBohStatsScreenshot(file);
    const request = buildBohStatsOcrRequest({
      seasonId: state.grant.seasonId,
      imageData: prepared.imageData,
    });
    const response = await state.client.processOcr(request);
    return buildBohStatsReviewModel(response?.result || response);
  }

  function isAccessLost(error) {
    return (
      error instanceof AllStarBohAccessError &&
      (error.code === 'access_expired' || error.code === 'access_denied')
    );
  }

  function closePlayerResults() {
    state.visiblePlayers = [];
    state.highlightedPlayerIndex = -1;
    setHidden(playerResults, true);
    playerInput?.setAttribute('aria-expanded', 'false');
    playerInput?.removeAttribute('aria-activedescendant');
    setSearchHint(false);
  }

  function choosePlayer(player) {
    state.selectedPlayer = player;
    playerInput.value = player.gameName;
    closePlayerResults();
    setStatus(i18n.text('statusPlayerSelected', { name: player.gameName }), 'success');
  }

  function highlightPlayer(index) {
    if (!state.visiblePlayers.length) return;
    state.highlightedPlayerIndex =
      (index + state.visiblePlayers.length) % state.visiblePlayers.length;
    const options = [...playerResults.querySelectorAll('.vts-score-player-option')];
    options.forEach((option, optionIndex) => {
      const selected = optionIndex === state.highlightedPlayerIndex;
      option.setAttribute('aria-selected', String(selected));
      if (selected) {
        playerInput.setAttribute('aria-activedescendant', option.id);
        option.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function setSearchHint(noMatch) {
    const hint = element('vtsScorePlayerHint');
    if (!hint) return;
    const key = noMatch ? 'noMatch' : 'searchHint';
    hint.dataset.vtsI18n = key;
    hint.textContent = i18n.text(key);
    hint.dataset.tone = noMatch ? 'warning' : 'neutral';
  }

  function renderPlayerResults() {
    state.visiblePlayers = rankVtsScorePlayers(state.players, playerInput.value, 8);
    state.highlightedPlayerIndex = -1;
    playerResults.replaceChildren();
    for (const [index, player] of state.visiblePlayers.entries()) {
      const option = document.createElement('button');
      option.type = 'button';
      option.id = `vtsScorePlayerOption${index}`;
      option.className = 'vts-score-player-option';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.textContent = player.gameName;
      option.addEventListener('pointerdown', (event) => event.preventDefault());
      option.addEventListener('click', () => choosePlayer(player));
      playerResults.append(option);
    }
    const open = state.visiblePlayers.length > 0;
    setHidden(playerResults, !open);
    playerInput.setAttribute('aria-expanded', String(open));
    setSearchHint(!open && Boolean(playerInput.value.trim()));
  }

  playerInput?.addEventListener('input', () => {
    state.selectedPlayer = null;
    renderPlayerResults();
  });
  playerInput?.addEventListener('focus', () => {
    if (playerInput.value.trim()) renderPlayerResults();
  });
  playerInput?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (playerResults.hidden) renderPlayerResults();
      highlightPlayer(state.highlightedPlayerIndex + (event.key === 'ArrowDown' ? 1 : -1));
    } else if (event.key === 'Enter' && state.highlightedPlayerIndex >= 0) {
      event.preventDefault();
      choosePlayer(state.visiblePlayers[state.highlightedPlayerIndex]);
    } else if (event.key === 'Escape') {
      closePlayerResults();
    }
  });
  document.addEventListener('pointerdown', (event) => {
    if (event.target !== playerInput && !playerResults?.contains(event.target)) {
      closePlayerResults();
    }
  });

  async function openWorkspace(grant) {
    state.grant = grant;
    setHidden(pinPanel, true);
    setHidden(scorePanel, true);
    await openSignupStep(grant);
    await applyPhaseGating();
  }

  async function openScoreWorkspace() {
    setStatus(i18n.text('statusLoadingPlayers'));
    const result = await state.client.getVtsScorePlayers();
    state.players = [...result.players];
    state.scoreWorkspaceOpen = true;
    setHidden(scorePanel, false);
    playerInput.disabled = false;
    fileInput.disabled = false;
    setStatus(
      state.players.length
        ? i18n.text('statusPlayersReady', { count: i18n.formatNumber(state.players.length) })
        : i18n.text('statusNoPlayers'),
      state.players.length ? 'success' : 'warning'
    );
  }

  /* ---------------------------------------------------------------- *
   * Competition #12: schedule, phase gating and slot pickers
   * ---------------------------------------------------------------- */

  for (const [key, catalog] of Object.entries(VTS_SCORE_SLOT_CATALOGS)) {
    const fieldset = element(key === 'boh' ? 'vtsScoreBohSlots' : 'vtsScoreEpicSlots');
    const input = element(key === 'boh' ? 'vtsScoreSignupBohSlots' : 'vtsScoreSignupEpicSlots');
    const list = fieldset?.querySelector('[data-slot-list]');
    if (input && list) {
      state.pickers[key] = mountSlotPicker({ list, input, catalog, text: i18n.text });
    }
  }

  function phaseEndsAt() {
    return getCompetitionPhaseEndsAt(state.schedule, state.phase);
  }

  function describeInstant(ms) {
    const locale = i18n.language;
    return `${i18n.text('gameTimeAt', { time: formatGameTime(ms, locale) })} · ${i18n.text(
      'localTimeAt',
      { time: formatLocalTime(ms, locale) }
    )}`;
  }

  function currentPageState() {
    return getCompetitionPageState(state.phase, { hasSignup: Boolean(state.signup) });
  }

  function renderCountdown() {
    const endsAt = phaseEndsAt();
    const countdown = element('vtsScoreCountdown');
    if (!Number.isFinite(endsAt)) {
      setHidden(countdown, true);
      return;
    }
    if (now() >= endsAt) {
      refreshPhase();
      return;
    }
    const { days, clock } = splitCountdown(endsAt - now());
    element('vtsScoreCountdownLabel').textContent = i18n.text(
      state.phase === 'upcoming' ? 'countdownOpensIn' : 'countdownEndsIn'
    );
    element('vtsScoreCountdownValue').textContent = days
      ? i18n.text('countdownDays', { days, clock })
      : clock;
    setHidden(countdown, false);
  }

  /** The hero's schedule box: phase, what members can do now, countdown. */
  function renderSchedule() {
    const box = element('vtsScoreSchedule');
    if (!box) return;
    const keys = phaseCopyKeys(state.phase);
    box.dataset.phase = state.phase;
    element('vtsScorePhaseName').textContent = i18n.text(keys.name);
    element('vtsScorePhaseNow').textContent = i18n.text(keys.now);
    const endsAt = phaseEndsAt();
    element('vtsScorePhaseEnds').textContent = Number.isFinite(endsAt)
      ? describeInstant(endsAt)
      : '';
    clearInterval(state.countdownTimer);
    state.countdownTimer = 0;
    renderCountdown();
    setHidden(box, false);
    if (Number.isFinite(endsAt) && !state.countdownTimer) {
      state.countdownTimer = setInterval(renderCountdown, 1000);
    }
    // The board stays hidden until VtsScore is unlocked: its roster and upload
    // history are for members who completed the unlock step, not drive-by
    // visitors reading the schedule.
    const boardVisible =
      Boolean(state.grant) && getCompetitionPageState(state.phase).growthBoard;
    setHidden(element('vtsScoreGrowthBoard'), !boardVisible);
    if (boardVisible) void mountGrowthBoard();
  }

  // The public board is calculated from live opt-in data and refreshed while
  // results are visible; no admin publish action or cached Firestore document.
  let growthBoard = null;
  async function mountGrowthBoard({ rerender = false } = {}) {
    const section = element('vtsScoreGrowthBoard');
    if (!section || section.hidden) return;
    if (growthBoard?.loading) return;
    const currentTime = now();
    if (growthBoard && currentTime < growthBoard.nextRefreshAt) {
      if (rerender && growthBoard.projection) {
        const mount = section.querySelector('[data-growth-board-mount]');
        if (mount) {
          growthBoard.board.renderCompetitionBoard(mount, growthBoard.projection, {
            locale: i18n.language,
          });
        }
      }
      return;
    }
    growthBoard = { ...(growthBoard || {}), loading: true };
    try {
      const board = await import('./competition-board.js');
      const response = await withTimeout(
        state.client.getCompetitionGrowthBoard(),
        SCHEDULE_READ_TIMEOUT_MS
      );
      const projection = board.normalizeCompetitionBoard(response.board);
      growthBoard = {
        board,
        projection,
        loading: false,
        nextRefreshAt: now() + 60_000,
      };
      let mount = section.querySelector('[data-growth-board-mount]');
      if (!mount) {
        mount = document.createElement('div');
        mount.dataset.growthBoardMount = '';
        section.append(mount);
      }
      const pending = section.querySelector('[data-vts-i18n="growthBoardPending"]');
      if (projection) {
        setHidden(pending, true);
        board.renderCompetitionBoard(mount, projection, { locale: i18n.language });
      } else {
        setHidden(pending, false);
        mount.replaceChildren();
      }
    } catch (error) {
      console.warn('VtsScore growth board unavailable', error);
      growthBoard = { loading: false, projection: null, nextRefreshAt: now() + 30_000 };
    } finally {
      clearTimeout(state.growthBoardRefreshTimer);
      state.growthBoardRefreshTimer = setTimeout(() => {
        if (document.visibilityState !== 'hidden' && !section.hidden) {
          void mountGrowthBoard();
        }
      }, 60_000);
    }
  }

  function renderPhaseNotice() {
    const notice = element('vtsScorePhaseNotice');
    const key = state.grant ? currentPageState().notice : '';
    const endsAt = phaseEndsAt();
    element('vtsScorePhaseNoticeText').textContent = key
      ? i18n.text(key, { date: Number.isFinite(endsAt) ? describeInstant(endsAt) : '' })
      : '';
    setHidden(notice, !key);
  }

  function setSignupReadOnly(readOnly) {
    signupPanel.dataset.readonly = String(readOnly);
    for (const control of signupForm?.elements || []) {
      if (control.type !== 'hidden') control.disabled = readOnly;
    }
    for (const picker of Object.values(state.pickers)) picker.setDisabled(readOnly);
    setHidden(signupButton, readOnly);
  }

  function setUploadMode(mode) {
    const reupload = mode === 'reupload';
    const relabel = (id, key) => {
      const node = element(id);
      if (!node) return;
      node.dataset.vtsI18n = key;
      node.textContent = i18n.text(key);
    };
    relabel('vtsScoreUploadKicker', reupload ? 'uploadKickerReupload' : 'uploadKickerFinal');
    relabel('vtsScoreUploadTitle', reupload ? 'uploadTitleReupload' : 'uploadTitleFinal');
    relabel('vtsScoreSubmitButton', reupload ? 'submitReupload' : 'submit');
    relabel('vtsScoreSavedKicker', reupload ? 'savedReupload' : 'saved');
  }

  /**
   * Shows what the current phase allows. UX only: the rules and the vtsScore
   * Function refuse the same writes outside their windows.
   */
  async function applyPhaseGating() {
    if (!state.grant) return;
    const view = currentPageState();
    setHidden(signupPanel, view.signup === 'hidden');
    setSignupReadOnly(view.signup === 'readonly');
    renderPhaseNotice();
    if (view.upload === 'none') {
      setHidden(scorePanel, true);
      return;
    }
    setUploadMode(view.upload);
    if (!state.scoreWorkspaceOpen) {
      try {
        await openScoreWorkspace();
      } catch (error) {
        setStatus(friendlyError(error), 'error');
      }
    } else {
      setHidden(scorePanel, false);
    }
  }

  function refreshPhase() {
    const phase = getCompetitionPhase(state.schedule, now());
    const changed = phase !== state.phase;
    state.phase = phase;
    renderSchedule();
    if (changed) applyPhaseGating();
  }

  async function loadSchedule() {
    let raw = null;
    try {
      raw = await withTimeout(
        (options.loadCompetitionSchedule || readCompetitionSchedule)(options.loadSignupFirestore),
        SCHEDULE_READ_TIMEOUT_MS
      );
    } catch (error) {
      // Unreadable schedule: keep the unscheduled flow; the server still
      // enforces the real windows.
      console.warn('VtsScore schedule unavailable', error);
    }
    state.schedule = normalizeCompetitionSchedule(raw);
    state.phase = getCompetitionPhase(state.schedule, now());
    renderSchedule();
  }

  element('vtsScoreLanguage')?.addEventListener('change', () => {
    renderPreviousComparisonHint();
    if (growthBoard?.projection) void mountGrowthBoard({ rerender: true });
    for (const picker of Object.values(state.pickers)) picker.render();
    renderSchedule();
    renderPhaseNotice();
  });

  /**
   * The registration step, in front of the score upload: same season, same
   * member grant, and the same owner-only document the retired All-Star hub
   * wrote. A member who has not registered yet sees only this step — the upload
   * form needs a submitted signup to compare against, so offering it first
   * would only produce a name search that cannot match.
   */
  async function openSignupStep(grant) {
    setHidden(signupPanel, false);
    setHidden(signupSuccess, true);
    let existing = null;
    try {
      if (!state.signupSession) {
        state.signupSession = createBohSignupSession({
          uid: (options.getCurrentUser || getCurrentUser)()?.uid || '',
          season: grant.seasonId,
          loadFirestore: options.loadSignupFirestore,
        });
      }
      existing = await state.signupSession.load();
    } catch (error) {
      setStatus(signupErrorMessage(error), 'error');
    }
    state.signup = existing;
    state.previousComparisonReady = false;
    state.previousComparisonCheckedKey = '';
    renderSignupState();
    if (existing) {
      state.signupSession.fillForm(signupPanel, existing);
    } else if (!signupNameInput?.value.trim() && !signupNameTouched) {
      try {
        const currentUser = (options.getCurrentUser || getCurrentUser)() || state.authUser;
        if (currentUser?.isAnonymous === false) {
          const loadProfile =
            options.loadAccountProfile ||
            (await import('./account-profile-service.js')).loadAccountProfile;
          const profile = await loadProfile();
          const gameName = [profile?.gameName, currentUser.displayName]
            .find((value) => typeof value === 'string' && value.trim())
            ?.trim();
          if (!state.signup && !signupNameTouched && !signupNameInput?.value.trim() && gameName) {
            signupNameInput.value = gameName;
          }
        }
      } catch {
        // Profile autofill is best-effort; it must never block a registration.
      }
    }
    renderPreviousComparisonHint();
    void checkPreviousComparison();
  }

  /** The season badge and the state line, both re-rendered on a language change. */
  function renderSignupState() {
    const season = element('vtsScoreSignupSeason');
    if (season)
      season.textContent = i18n.text('signupForSeason', { season: state.grant?.seasonId || '' });
    const stateLine = element('vtsScoreSignupState');
    if (!stateLine) return;
    const key = state.signup ? 'signupStateSaved' : 'signupStateNone';
    const values = state.signup ? { revision: String(state.signup.revision || 1) } : {};
    stateLine.dataset.tone = state.signup ? 'success' : 'neutral';
    stateLine.textContent = i18n.text(key, values);
  }

  function signupErrorMessage(error) {
    const keys = {
      [BOH_SIGNUP_SAVE_ERROR.accessDenied]: 'signupErrorAccess',
      [BOH_SIGNUP_SAVE_ERROR.closed]: 'signupErrorClosed',
      [BOH_SIGNUP_SAVE_ERROR.invalidInput]: 'signupErrorInvalid',
      [BOH_SIGNUP_SAVE_ERROR.network]: 'signupErrorNetwork',
      [BOH_SIGNUP_SAVE_ERROR.session]: 'signupErrorSession',
    };
    return i18n.text(keys[error?.code] || 'signupErrorGeneric');
  }

  const initialized = await (options.initFirebase || initFirebase)();
  if (!initialized?.configured) throw new Error('Firebase is not configured.');
  const initialUser = await (options.ensureAnonymousAuth || ensureAnonymousAuth)();
  if (!initialUser?.uid) throw new Error('Secure member sign-in is unavailable.');
  state.authUser = initialUser;
  state.client = (options.createAccessClient || createAllStarBohAccessClient)({
    getUser: async () => {
      const currentUser =
        getCurrentUser() || (await (options.ensureAnonymousAuth || ensureAnonymousAuth)());
      return currentUser;
    },
    getAppCheckToken: options.getAppCheckToken || getFirebaseAppCheckToken,
    fetch: options.fetch,
  });
  await loadSchedule();

  pinForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = pinForm.querySelector('button[type="submit"]');
    setBusy(button, true, i18n.text('statusUnlocking'));
    setStatus(i18n.text('statusChecking'));
    try {
      const grant = await state.client.unlock(element('vtsScorePin').value);
      element('vtsScorePin').value = '';
      await openWorkspace(grant);
    } catch (error) {
      setStatus(friendlyError(error), 'error');
    } finally {
      setBusy(button, false);
    }
  });

  fileInput?.addEventListener('change', () => {
    try {
      state.file = getSingleBohStatsScreenshot(fileInput.files);
      state.review = null;
      clearPowerFields();
      setStatus(i18n.text('statusFileReady', { name: state.file.name }), 'success');
    } catch (error) {
      state.file = null;
      fileInput.value = '';
      setStatus(friendlyError(error), 'error');
    }
  });

  element('vtsScoreLanguage')?.addEventListener('change', () => {
    if (state.grant) renderSignupState();
  });

  // Registration: prefill the power fields from a Lord Info → Power
  // screenshot. The fields stay editable; the confirm tick is required before
  // an OCR-filled registration saves (the rules require it too).
  const signupImage = element('vtsScoreSignupImage');
  const signupReadButton = element('vtsScoreSignupReadButton');
  const signupOcrReview = element('vtsScoreSignupOcrReview');
  const signupOcrConfirm = element('vtsScoreSignupOcrConfirm');

  function resetSignupOcr() {
    state.signupOcrReview = null;
    if (signupOcrConfirm) signupOcrConfirm.checked = false;
    setHidden(signupOcrReview, true);
  }

  signupImage?.addEventListener('change', () => {
    try {
      state.signupFile = getSingleBohStatsScreenshot(signupImage.files);
      setStatus(i18n.text('statusFileReady', { name: state.signupFile.name }), 'success');
    } catch (error) {
      state.signupFile = null;
      signupImage.value = '';
      setStatus(friendlyError(error), 'error');
    }
  });

  signupReadButton?.addEventListener('click', async () => {
    if (!['open', 'edit'].includes(currentPageState().signup)) return;
    if (!state.signupFile) {
      setStatus(i18n.text('statusChooseScreenshot'), 'error');
      signupImage?.focus();
      return;
    }
    setBusy(signupReadButton, true, i18n.text('statusReading'));
    setProgress(true);
    try {
      const review = await readPowerScreenshot(state.signupFile);
      const fields = mapOcrReviewToSignupFields(review);
      for (const [path, value] of Object.entries(fields)) {
        const input = signupForm?.querySelector(`[data-boh-field="${path}"]`);
        if (input) input.value = value === '' ? '' : String(value);
      }
      state.signupOcrReview = review;
      if (signupOcrConfirm) signupOcrConfirm.checked = false;
      setHidden(signupOcrReview, false);
      setStatus(i18n.text('signupOcrFilled'), 'success');
      signupForm?.querySelector('[data-boh-field="stats.totalCastlePower"]')?.focus();
    } catch (error) {
      resetSignupOcr();
      if (isAccessLost(error)) {
        setHidden(signupPanel, true);
        setHidden(scorePanel, true);
        setHidden(pinPanel, false);
        setStatus(i18n.text('statusEnterPin'), 'error');
      } else {
        setStatus(friendlyError(error), 'error');
      }
    } finally {
      setProgress(false);
      setBusy(signupReadButton, false);
    }
  });

  signupForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!['open', 'edit'].includes(currentPageState().signup)) return;
    const values = state.signupSession?.readForm(signupPanel) || {};
    // At least one slot per event is required by the stored document; say
    // which picker is empty before the write instead of a generic failure.
    for (const [key, path, message] of [
      ['boh', 'bohTimeSlots', 'signupErrorBohSlots'],
      ['epic', 'epicTimeSlots', 'signupErrorEpicSlots'],
    ]) {
      const slots = values?.commitment?.[path];
      if (!Array.isArray(slots) || !slots.length) {
        setStatus(i18n.text(message), 'error');
        state.pickers[key]?.focus();
        return;
      }
    }
    let ocr;
    if (state.signupOcrReview) {
      if (!signupOcrConfirm?.checked) {
        setStatus(i18n.text('signupOcrConfirmRequired'), 'error');
        signupOcrConfirm?.focus();
        return;
      }
      values.entryMethod = 'ocr';
      ocr = buildSignupOcrAudit(state.signupOcrReview, { confirmed: true });
    }
    setBusy(signupButton, true, i18n.text('signupSaving'));
    try {
      const saved = await state.signupSession.save(values, ocr ? { ocr } : {});
      resetSignupOcr();
      if (signupImage) signupImage.value = '';
      state.signupFile = null;
      state.signup = saved;
      state.previousComparisonCheckedKey = '';
      state.previousComparisonReady = false;
      renderSignupState();
      renderPreviousComparisonHint();
      void checkPreviousComparison();
      element('vtsScoreSignupSuccessName').textContent = saved.gameName || '';
      element('vtsScoreSignupSuccessRevision').textContent = String(saved.revision || 1);
      setHidden(signupSuccess, false);
      setStatus(i18n.text('signupSaved'), 'success');
      await applyPhaseGating();
      signupSuccess.focus();
    } catch (error) {
      setStatus(signupErrorMessage(error), 'error');
    } finally {
      setBusy(signupButton, false);
    }
  });

  readButton?.addEventListener('click', async () => {
    if (!state.file) {
      setStatus(i18n.text('statusChooseScreenshot'), 'error');
      fileInput?.focus();
      return;
    }
    if (!element('vtsScoreConsent')?.checked) {
      setStatus(i18n.text('statusConfirmConsent'), 'error');
      element('vtsScoreConsent')?.focus();
      return;
    }
    setBusy(readButton, true, i18n.text('statusReading'));
    setProgress(true);
    try {
      state.review = await readPowerScreenshot(state.file);
      renderPowerFields();
      setStatus(i18n.text('statusReviewReady'), 'success');
      powerInput(VTS_SCORE_POWER_FIELDS[0])?.focus();
    } catch (error) {
      state.review = null;
      clearPowerFields();
      if (isAccessLost(error)) {
        setHidden(scorePanel, true);
        setHidden(pinPanel, false);
        setStatus(i18n.text('statusEnterPin'), 'error');
      } else {
        setStatus(friendlyError(error), 'error');
      }
    } finally {
      setProgress(false);
      setBusy(readButton, false);
    }
  });

  scoreForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const player = state.selectedPlayer || resolveVtsScorePlayer(state.players, playerInput.value);
    let payload;
    try {
      payload = buildVtsScoreSubmission({
        seasonId: state.grant?.seasonId,
        player,
        powerValues: collectPowerValues(),
        review: state.review,
      });
    } catch (error) {
      setStatus(friendlyError(error), 'error');
      return;
    }
    setBusy(submitButton, true, i18n.text('statusSubmitting'));
    setStatus(i18n.text('statusSavingScore'));
    try {
      const saved = await state.client.submitVtsScore(payload);
      element('vtsScoreSuccessName').textContent = saved.gameName;
      element('vtsScoreSuccessPower').textContent = i18n.formatNumber(
        saved.powerValues.totalCastlePower
      );
      setHidden(scoreForm, true);
      setHidden(element('vtsScoreSuccess'), false);
      setStatus(i18n.text('statusSubmitted'), 'success');
      element('vtsScoreSuccess')?.focus();
    } catch (error) {
      if (
        error instanceof AllStarBohAccessError &&
        (error.code === 'access_expired' || error.code === 'access_denied')
      ) {
        setHidden(scorePanel, true);
        setHidden(pinPanel, false);
      }
      setStatus(friendlyError(error), 'error');
    } finally {
      setBusy(submitButton, false);
    }
  });

  try {
    const grant = await state.client.getAccessGrant({ minimumRemainingSeconds: 5 });
    if (grant) await openWorkspace(grant);
    else {
      setHidden(pinPanel, false);
      setStatus(i18n.text('statusEnterPin'));
    }
  } catch {
    setHidden(pinPanel, false);
    setStatus(i18n.text('statusEnterPin'));
  }

  return Object.freeze({
    destroy() {
      clearInterval(state.countdownTimer);
      clearTimeout(state.previousComparisonTimer);
      clearTimeout(state.growthBoardRefreshTimer);
      state.client?.destroy?.();
      state.file = null;
      state.review = null;
    },
  });
}

/**
 * Local QA only: on localhost a test harness may inject the same dependencies
 * the unit tests use (Firebase init, auth, access client, schedule loader,
 * clock) through `window.__VTS_SCORE_TEST__`. Never read on any other host.
 */
function localTestOptions() {
  const host = typeof window !== 'undefined' ? window.location?.hostname : '';
  if (host !== 'localhost' && host !== '127.0.0.1') return {};
  const hook = window.__VTS_SCORE_TEST__;
  return hook && typeof hook === 'object' ? hook : {};
}

if (typeof document !== 'undefined' && document.getElementById('vtsScoreApp')) {
  bootVtsScore(localTestOptions()).catch((error) => {
    console.error('VtsScore failed to start', error);
    setHidden(element('vtsScoreGate'), false);
    element('vtsScorePinForm')
      ?.querySelectorAll('input, button')
      .forEach((control) => {
        control.disabled = true;
      });
    setStatus(`${friendlyError(error)} Refresh the page to try again.`, 'error');
  });
}

// Shared site chrome: the same footer (and, where the page has no header of
// its own, the branded bar with Back to tools) on every standalone tool page.
mountToolShell({ bar: true });
