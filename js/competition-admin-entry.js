import { VTS_SCORE_POWER_FIELDS, buildVtsScoreSubmission } from './vts-score-model.js';
import {
  prepareBohStatsScreenshot,
  buildBohStatsOcrRequest,
  buildBohStatsReviewModel,
} from './all-star-boh-ocr.js';
import { ALL_STAR_BOH_OCR_ENDPOINT } from './all-star-boh-access.js';
import {
  DEAD_TROOP_COUNT_KEYS,
  normalizeDeadTroopCounts,
  removeDeadTroopPowerFromStats,
  addDeadTroopPowerToStats,
} from './dead-troops.js';

const label = (key) =>
  key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (s) => s.toUpperCase());
const revision = (record) => (Number.isSafeInteger(record?.revision) ? record.revision : 0);
const entryError = (error) =>
  ({
    revision_conflict: 'Another operator changed this record. Reload the list before saving.',
    signup_changed: 'The member signup changed. Reload the list before saving.',
    late_confirmation_required:
      'The deadline passed. Explicitly accept this late final result to save it.',
    upload_not_started: 'Final uploads have not opened yet.',
    season_not_active: 'The active season changed. Reload the list.',
    admin_required: 'Admin access is required. Sign in again.',
    service_unavailable: 'The service is unavailable. Try again after checking website health.',
  })[error?.code] ||
  error?.message ||
  'Save failed. Reload the list and try again.';

/** Power-only corrections preserve the member's identity, consent and signup answers. */
export function openCompetitionAdminEntry({
  root,
  snapshot,
  submissionUid,
  mode = 'power-final',
  post,
  endpoint,
  onSaved,
}) {
  root.querySelector('[data-admin-power-editor]')?.remove();
  const player = snapshot.submissions.find((item) => item.submissionUid === submissionUid);
  if (!player) throw new Error('Reload the member list before editing.');
  const final = snapshot.raceScores.find((item) => item.submissionUid === submissionUid);
  const form = document.createElement('form');
  form.className = 'vts-admin-card dash-admin-power-editor';
  form.dataset.adminPowerEditor = '';
  let review = null;
  let method = 'manual';
  let busy = false;
  const heading = document.createElement('h3');
  heading.tabIndex = -1;
  heading.textContent = `Submit powers for ${player.gameName}`;
  form.append(heading);
  form.insertAdjacentHTML(
    'beforeend',
    `<p>Enter the alive powers from the screenshot, then the exact dead troop counts. Signup changes preserve all other member answers.</p>
    <label>Record<select class="dash-input" name="action"><option value="power-final">VtsScore final result</option><option value="power-baseline">2027 signup baseline</option></select></label>
    <label>Power screenshot (optional)<input class="dash-input" name="image" type="file" accept="image/jpeg,image/png,image/webp"></label>
    <button type="button" class="dash-btn" data-read-image>Read screenshot</button>
    <p role="status" aria-live="polite" data-entry-status></p>
    <div class="dash-admin-power-fields" data-powers></div>
    <details><summary>Dead troops — exact counts, not K or M</summary><div class="dash-admin-power-fields" data-dead></div></details>
    <label>Reason for submitting on their behalf<textarea class="dash-input" name="reason" required maxlength="1000"></textarea></label>
    <label><input type="checkbox" name="acceptLate"> Explicitly accept this final result if the upload deadline has passed</label>
    <label><input type="checkbox" name="reviewed" required> I checked all powers and dead troop counts (including zeros).</label>
    <div><button type="submit" class="dash-btn">Save for member</button> <button type="button" class="dash-btn" data-cancel>Cancel</button></div>`
  );
  const fields = new Map();
  for (const [mount, keys] of [
    ['[data-powers]', VTS_SCORE_POWER_FIELDS],
    ['[data-dead]', DEAD_TROOP_COUNT_KEYS],
  ]) {
    for (const key of keys) {
      const wrapper = document.createElement('label');
      wrapper.textContent = label(key);
      const input = document.createElement('input');
      input.className = 'dash-input';
      input.name = key;
      input.type = 'number';
      input.min = '0';
      input.max = mount === '[data-powers]' ? '100000000000' : '1000000000000';
      input.step = '1';
      input.required =
        mount === '[data-dead]' || !['artifactPower', 'royalTechPower'].includes(key);
      wrapper.append(input);
      form.querySelector(mount).append(wrapper);
      fields.set(key, input);
    }
  }
  const status = (message) => {
    form.querySelector('[data-entry-status]').textContent = message;
  };
  const controls = () => [...form.querySelectorAll('input,select,textarea,button')];
  const lock = (value) => {
    busy = value;
    controls().forEach((input) => {
      input.disabled = value;
    });
  };
  const reset = () => {
    review = null;
    method = 'manual';
    form.elements.reviewed.checked = false;
    const record = form.elements.action.value === 'power-final' ? final : player;
    const source = record?.powerValues || record?.confirmedStats || record?.stats || {};
    const counts = normalizeDeadTroopCounts(
      record?.deadTroopCounts || source.deadTroopCounts || {}
    );
    const alive = removeDeadTroopPowerFromStats(source, counts) || source;
    for (const key of VTS_SCORE_POWER_FIELDS) fields.get(key).value = alive[key] ?? '';
    for (const key of DEAD_TROOP_COUNT_KEYS) fields.get(key).value = counts[key];
    status('Values must be reviewed before saving. Screenshot files are read once, not stored.');
  };
  form.elements.action.value = mode;
  form.elements.action.addEventListener('change', reset);
  form.addEventListener('input', (event) => {
    if (fields.has(event.target.name)) form.elements.reviewed.checked = false;
  });
  form.querySelector('[data-cancel]').addEventListener('click', () => {
    if (!busy) form.remove();
  });
  form.querySelector('[data-read-image]').addEventListener('click', async () => {
    const file = form.elements.image.files[0];
    if (!file) return status('Choose a screenshot first.');
    lock(true);
    status('Reading screenshot…');
    try {
      const { imageData } = await prepareBohStatsScreenshot(file);
      const result = await post(
        ALL_STAR_BOH_OCR_ENDPOINT,
        buildBohStatsOcrRequest({ seasonId: snapshot.season, imageData })
      );
      review = buildBohStatsReviewModel(result.result || result);
      method = 'screenshot';
      for (const key of VTS_SCORE_POWER_FIELDS)
        fields.get(key).value = review.confirmedValues[key] ?? '';
      form.elements.reviewed.checked = false;
      status('Screenshot read. Check every value and enter dead troop counts before saving.');
    } catch (error) {
      status(error.message || 'Screenshot could not be read. You can enter values manually.');
    } finally {
      lock(false);
    }
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    try {
      const counts = normalizeDeadTroopCounts(
        Object.fromEntries(DEAD_TROOP_COUNT_KEYS.map((key) => [key, Number(fields.get(key).value)]))
      );
      if (!counts) throw new Error('Check the exact dead troop counts.');
      const values = Object.fromEntries(
        VTS_SCORE_POWER_FIELDS.map((key) => [
          key,
          fields.get(key).value === '' ? null : Number(fields.get(key).value),
        ])
      );
      const nulls = Object.fromEntries(VTS_SCORE_POWER_FIELDS.map((key) => [key, null]));
      const score = buildVtsScoreSubmission({
        seasonId: snapshot.season,
        player,
        powerValues: addDeadTroopPowerToStats(values, counts),
        deadTroopCounts: counts,
        review: review || {
          requestId: `admin-manual-${crypto.randomUUID()}`,
          ocrValues: nulls,
          confidence: nulls,
        },
      });
      const action = form.elements.action.value;
      const payload = {
        ...score,
        action,
        signupRevision: revision(player),
        expectedRevision: revision(action === 'power-final' ? final : player),
        reason: form.elements.reason.value,
        acceptLate: form.elements.acceptLate.checked,
        method,
      };
      lock(true);
      status('Saving…');
      await post(endpoint, payload);
      await onSaved();
      form.remove();
    } catch (error) {
      status(entryError(error));
    } finally {
      lock(false);
    }
  });
  reset();
  root.prepend(form);
  heading.focus();
  form.scrollIntoView({ block: 'start', behavior: 'smooth' });
}
