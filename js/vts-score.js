import { createAllStarBohAccessClient, AllStarBohAccessError } from './all-star-boh-access.js';
import {
  buildBohStatsOcrRequest,
  buildBohStatsReviewModel,
  BOH_STATS_REQUIRED_POWER_FIELDS,
  getSingleBohStatsScreenshot,
  prepareBohStatsScreenshot,
} from './all-star-boh-ocr.js';
import { ensureAnonymousAuth, getFirebaseAppCheckToken, initFirebase } from './firebase.js';
import { createVtsScoreI18n } from './vts-score-i18n.js';
import {
  buildVtsScoreSubmission,
  rankVtsScorePlayers,
  resolveVtsScorePlayer,
  VTS_SCORE_POWER_FIELDS,
} from './vts-score-model.js';

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
    method_not_allowed: 'The secure service rejected the request method. Refresh and try again.',
    origin_denied:
      'This address is not allowed to use the secure service. Open the official site and try again.',
    rate_limited: 'Too many attempts. Wait a few minutes and try again.',
    request_too_large:
      'The screenshot is too large for the secure service. Try a smaller or cropped image.',
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
}

export async function bootVtsScore(options = {}) {
  const i18n = createVtsScoreI18n();
  initializePreferences(i18n);
  const state = {
    client: null,
    file: null,
    grant: null,
    players: [],
    selectedPlayer: null,
    visiblePlayers: [],
    highlightedPlayerIndex: -1,
    review: null,
  };
  const pinPanel = element('vtsScoreGate');
  const scorePanel = element('vtsScoreWorkspace');
  const pinForm = element('vtsScorePinForm');
  const scoreForm = element('vtsScoreForm');
  const readButton = element('vtsScoreReadButton');
  const submitButton = element('vtsScoreSubmitButton');
  const fileInput = element('vtsScoreImage');
  const powerFields = element('vtsScorePowerFields');
  const playerInput = element('vtsScorePlayer');
  const playerResults = element('vtsScorePlayerResults');

  function powerInput(field) {
    return powerFields?.querySelector(`[data-vts-power-field="${field}"]`);
  }

  function clearPowerFields() {
    powerFields?.replaceChildren();
    setHidden(powerFields, true);
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
  }

  function collectPowerValues() {
    return Object.fromEntries(
      VTS_SCORE_POWER_FIELDS.map((field) => {
        const value = powerInput(field)?.value.trim() ?? '';
        return [field, value === '' ? null : Number(value)];
      })
    );
  }

  element('vtsScoreLanguage')?.addEventListener('change', () => {
    if (state.review) renderPowerFields();
  });

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
    setStatus(`${player.gameName} selected.`, 'success');
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
    setStatus('Loading eligible Competition #11 signups…');
    const result = await state.client.getVtsScorePlayers();
    state.players = [...result.players];
    setHidden(pinPanel, true);
    setHidden(scorePanel, false);
    playerInput.disabled = false;
    fileInput.disabled = false;
    setStatus(
      state.players.length
        ? `${state.players.length} signed-up players are ready for final score upload.`
        : 'No eligible signups were found.',
      state.players.length ? 'success' : 'warning'
    );
  }

  const initialized = await (options.initFirebase || initFirebase)();
  if (!initialized?.configured) throw new Error('Firebase is not configured.');
  const user = await (options.ensureAnonymousAuth || ensureAnonymousAuth)();
  if (!user?.uid) throw new Error('Secure member sign-in is unavailable.');
  state.client = (options.createAccessClient || createAllStarBohAccessClient)({
    getUser: () => user,
    getAppCheckToken: options.getAppCheckToken || getFirebaseAppCheckToken,
    fetch: options.fetch,
  });

  pinForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = pinForm.querySelector('button[type="submit"]');
    setBusy(button, true, 'Unlocking…');
    setStatus('Checking member access…');
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
      setStatus(`${state.file.name} is ready to read.`, 'success');
    } catch (error) {
      state.file = null;
      fileInput.value = '';
      setStatus(friendlyError(error), 'error');
    }
  });

  readButton?.addEventListener('click', async () => {
    if (!state.file) {
      setStatus('Choose one power screenshot first.', 'error');
      fileInput?.focus();
      return;
    }
    if (!element('vtsScoreConsent')?.checked) {
      setStatus('Confirm the OCR processing notice first.', 'error');
      element('vtsScoreConsent')?.focus();
      return;
    }
    setBusy(readButton, true, 'Reading screenshot…');
    setProgress(true);
    try {
      const prepared = await prepareBohStatsScreenshot(state.file);
      const request = buildBohStatsOcrRequest({
        seasonId: state.grant.seasonId,
        imageData: prepared.imageData,
      });
      const response = await state.client.processOcr(request);
      state.review = buildBohStatsReviewModel(response?.result || response);
      renderPowerFields();
      setStatus('Power breakdown is ready. Check every value, then submit.', 'success');
      powerInput(VTS_SCORE_POWER_FIELDS[0])?.focus();
    } catch (error) {
      state.review = null;
      clearPowerFields();
      if (
        error instanceof AllStarBohAccessError &&
        (error.code === 'access_expired' || error.code === 'access_denied')
      ) {
        setHidden(scorePanel, true);
        setHidden(pinPanel, false);
        setStatus('Enter the VTS member PIN to continue.', 'error');
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
    setBusy(submitButton, true, 'Submitting…');
    setStatus('Saving your final Competition #11 score…');
    try {
      const saved = await state.client.submitVtsScore(payload);
      element('vtsScoreSuccessName').textContent = saved.gameName;
      element('vtsScoreSuccessPower').textContent = i18n.formatNumber(
        saved.powerValues.totalCastlePower
      );
      setHidden(scoreForm, true);
      setHidden(element('vtsScoreSuccess'), false);
      setStatus('Full power breakdown submitted successfully.', 'success');
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
      setStatus('Enter the VTS member PIN to continue.');
    }
  } catch {
    setHidden(pinPanel, false);
    setStatus('Enter the VTS member PIN to continue.');
  }

  return Object.freeze({
    destroy() {
      state.client?.destroy?.();
      state.file = null;
      state.review = null;
    },
  });
}

if (typeof document !== 'undefined' && document.getElementById('vtsScoreApp')) {
  bootVtsScore().catch((error) => {
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
