import { createAllStarBohAccessClient, AllStarBohAccessError } from './all-star-boh-access.js';
import {
  buildBohStatsOcrRequest,
  buildBohStatsReviewModel,
  getSingleBohStatsScreenshot,
  prepareBohStatsScreenshot,
} from './all-star-boh-ocr.js';
import { ensureAnonymousAuth, getFirebaseAppCheckToken, initFirebase } from './firebase.js';
import { buildVtsScoreSubmission, resolveVtsScorePlayer } from './vts-score-model.js';

function element(id) {
  return document.getElementById(id);
}

function setHidden(target, hidden) {
  if (!target) return;
  target.hidden = Boolean(hidden);
}

function setStatus(message, tone = 'neutral') {
  const status = element('vtsScoreStatus');
  if (!status) return;
  status.textContent = message || '';
  status.dataset.tone = tone;
  status.hidden = !message;
}

function friendlyError(error) {
  const messages = {
    access_denied: 'That member PIN was not accepted.',
    access_expired: 'Your member access expired. Enter the PIN again.',
    already_submitted:
      'A final score is already saved for this player. Contact leadership if it needs correction.',
    app_check_required: 'Secure app verification is not ready. Refresh and try again.',
    invalid_app_check: 'Secure app verification failed. Refresh and try again.',
    invalid_auth: 'Secure sign-in expired. Refresh and try again.',
    signup_changed: 'That signup name changed. Refresh the player list and select it again.',
    signup_not_found: 'That signup is no longer eligible.',
  };
  return (
    messages[error?.code] ||
    error?.message ||
    'VtsScore could not complete that request. Please try again.'
  );
}

function fillPlayerOptions(players) {
  const list = element('vtsScorePlayers');
  if (!list) return;
  list.replaceChildren();
  for (const player of players) {
    const option = document.createElement('option');
    option.value = player.gameName;
    list.append(option);
  }
}

function setBusy(button, busy, busyText) {
  if (!button) return;
  if (!button.dataset.defaultText) button.dataset.defaultText = button.textContent;
  button.disabled = Boolean(busy);
  button.textContent = busy ? busyText : button.dataset.defaultText;
}

export async function bootVtsScore(options = {}) {
  const state = {
    client: null,
    file: null,
    grant: null,
    players: [],
    review: null,
  };
  const pinPanel = element('vtsScoreGate');
  const scorePanel = element('vtsScoreWorkspace');
  const pinForm = element('vtsScorePinForm');
  const scoreForm = element('vtsScoreForm');
  const readButton = element('vtsScoreReadButton');
  const submitButton = element('vtsScoreSubmitButton');
  const fileInput = element('vtsScoreImage');
  const powerInput = element('vtsScoreDragonPower');
  const playerInput = element('vtsScorePlayer');
  const ocrDetails = element('vtsScoreOcrDetails');

  async function openWorkspace(grant) {
    state.grant = grant;
    setStatus('Loading eligible Competition #11 signups…');
    const result = await state.client.getVtsScorePlayers();
    state.players = [...result.players];
    fillPlayerOptions(state.players);
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
  let user = await (options.ensureAnonymousAuth || ensureAnonymousAuth)();
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
      powerInput.value = '';
      setHidden(ocrDetails, true);
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
    setStatus('Reading Dragon Power from your screenshot…');
    try {
      const prepared = await prepareBohStatsScreenshot(state.file);
      const request = buildBohStatsOcrRequest({
        seasonId: state.grant.seasonId,
        imageData: prepared.imageData,
      });
      const response = await state.client.processOcr(request);
      state.review = buildBohStatsReviewModel(response?.result || response);
      const dragonPower = state.review.confirmedValues.dragonPower;
      powerInput.value = String(dragonPower);
      const confidence = state.review.confidence.dragonPower;
      element('vtsScoreOcrValue').textContent = new Intl.NumberFormat().format(dragonPower);
      element('vtsScoreOcrConfidence').textContent =
        typeof confidence === 'number'
          ? `${Math.round(confidence * 100)}% confidence`
          : 'Review required';
      setHidden(ocrDetails, false);
      setStatus('Dragon Power is ready. Check the number, then submit.', 'success');
      powerInput.focus();
    } catch (error) {
      state.review = null;
      powerInput.value = '';
      setHidden(ocrDetails, true);
      setStatus(friendlyError(error), 'error');
    } finally {
      setBusy(readButton, false);
    }
  });

  scoreForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const player = resolveVtsScorePlayer(state.players, playerInput.value);
    let payload;
    try {
      payload = buildVtsScoreSubmission({
        seasonId: state.grant?.seasonId,
        player,
        dragonPower: Number(powerInput.value),
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
      element('vtsScoreSuccessPower').textContent = new Intl.NumberFormat().format(
        saved.dragonPower
      );
      setHidden(scoreForm, true);
      setHidden(element('vtsScoreSuccess'), false);
      setStatus('Final Dragon Power submitted successfully.', 'success');
      element('vtsScoreSuccess')?.focus();
    } catch (error) {
      if (error instanceof AllStarBohAccessError && error.code === 'access_expired') {
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
