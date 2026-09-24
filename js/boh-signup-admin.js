// js/boh-signup-admin.js
//
// The 2027 Signups admin tab: the season/scoring-version picker leadership
// publishes, the manual add/edit form, and the season's signup list.
//
// Reads go straight to Firestore (`boh_allstar_config/current` and
// `boh_allstar/{season}/submissions`, both admin-readable). Writes split in two:
//
//   * the season document is an ordinary admin write, pinned by
//     `validAllStarBohConfig()` in firestore.rules. The picker is revealed for
//     superadmins only, which is the policy this phase was asked for;
//   * a signup is written by the `bohSignupAdmin` Cloud Function, because the
//     submissions collection is owner-written and must stay that way. This
//     module only builds the request; the dashboard POSTs it with the admin
//     session's ID token and App Check token.

import { BOH_SCORING_PROFILES, getBohScoringProfile } from './all-star-boh-model.js';
import { readBohSignupFormValues, writeBohSignupFormValues } from './boh-signup-document.js';
import {
  COMPETITION_BOH_SLOTS,
  COMPETITION_EPIC_SLOTS,
  slotToGameClock,
} from './competition-schedule.js';

export const BOH_SIGNUP_ADMIN_ENDPOINT =
  'https://us-central1-abocombo.cloudfunctions.net/bohSignupAdmin';
export const BOH_SIGNUP_CONFIG_PATH = 'boh_allstar_config/current';
export const BOH_SIGNUP_SEASON_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
export const BOH_SIGNUP_PROFILE_IDS = Object.freeze(
  BOH_SCORING_PROFILES.map((profile) => profile.id)
);

/** The default a fresh manual entry sends for a field the form does not show. */
export const BOH_SIGNUP_ADMIN_DEFAULTS = Object.freeze({
  stats: Object.freeze({
    artifactPower: null,
    royalTechPower: null,
  }),
  commitment: Object.freeze({
    availability: 'all',
    secondaryRole: '',
    contactNumber: '',
    currentState: '',
    joinReason: '',
  }),
});

export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * The Function request for the signed-in admin's form values. Every key the
 * Function pins is present: a missing key is rejected there by design, so this
 * is the one place that fills the gaps with an explicit default.
 */
export function buildBohSignupAdminRequest(input = {}) {
  const values = input.values && typeof input.values === 'object' ? input.values : {};
  const stats = { ...BOH_SIGNUP_ADMIN_DEFAULTS.stats, ...(values.stats || {}) };
  const commitment = { ...BOH_SIGNUP_ADMIN_DEFAULTS.commitment, ...(values.commitment || {}) };
  for (const field of Object.keys(stats)) {
    if (stats[field] === '' || stats[field] === undefined) stats[field] = null;
  }
  const request = {
    action: input.submissionUid ? 'update' : 'create',
    seasonId: String(input.seasonId || ''),
    scoringProfileId: String(input.scoringProfileId || ''),
    gameName: String(values.gameName || '').trim(),
    stats: {
      artifactPower: stats.artifactPower,
      buildingPower: numberOrZero(stats.buildingPower),
      dragonPower: numberOrZero(stats.dragonPower),
      heroCombatPower: numberOrZero(stats.heroCombatPower),
      level50HeroCount: numberOrZero(stats.level50HeroCount),
      readySpeedHeroes: stringList(stats.readySpeedHeroes),
      rocLevel: numberOrZero(stats.rocLevel),
      royalTechPower: stats.royalTechPower,
      t9TroopTypes: stringList(stats.t9TroopTypes),
      technologyPower: numberOrZero(stats.technologyPower),
      totalCastlePower: numberOrZero(stats.totalCastlePower),
      troopPower: numberOrZero(stats.troopPower),
      unitSpecialtyPower: numberOrZero(stats.unitSpecialtyPower),
    },
    commitment: {
      availability: String(commitment.availability || 'all'),
      contactNumber: String(commitment.contactNumber || ''),
      currentState: String(commitment.currentState || ''),
      fightingTimeIds: stringList(commitment.fightingTimeIds),
      joinReason: String(commitment.joinReason || ''),
      notes: String(commitment.notes || ''),
      preferredRole: String(commitment.preferredRole || ''),
      secondaryRole: String(commitment.secondaryRole || ''),
      vts1097Member: commitment.vts1097Member === true,
    },
  };
  // Competition #12 entries carry the BoH and Epic Showdown slots (in the
  // member's order) and the growth-board consent; the Function then accepts
  // an empty fightingTimeIds list.
  if (commitment.bohTimeSlots !== undefined || commitment.epicTimeSlots !== undefined) {
    request.commitment.bohTimeSlots = stringList(commitment.bohTimeSlots);
    request.commitment.epicTimeSlots = stringList(commitment.epicTimeSlots);
    request.commitment.publicComparisonConsent = commitment.publicComparisonConsent === true;
  }
  if (input.submissionUid) request.submissionUid = String(input.submissionUid);
  return request;
}

function numberOrZero(value) {
  if (value === null || value === undefined || value === '') return 0;
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : 0;
}

function stringList(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  return String(value ?? '')
    .split(/[,;|\n]+/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Server error codes mapped to catalogue keys the panel can show verbatim. */
export const BOH_SIGNUP_ADMIN_ERROR_KEYS = Object.freeze({
  admin_required: 'adminBohSignupErrorSession',
  app_check_required: 'adminBohSignupErrorSession',
  invalid_app_check: 'adminBohSignupErrorSession',
  invalid_auth: 'adminBohSignupErrorSession',
  invalid_request: 'adminBohSignupErrorInvalid',
  request_too_large: 'adminBohSignupErrorInvalid',
  already_exists: 'adminBohSignupErrorExists',
  not_found: 'adminBohSignupErrorMissing',
  // The list only offers Edit on hand-filed rows, so this is a stale list.
  member_owned: 'adminBohSignupErrorInvalid',
  season_not_active: 'adminBohSignupErrorSeason',
  season_not_configured: 'adminBohSignupErrorSeason',
  version_mismatch: 'adminBohSignupErrorSeason',
  unknown_version: 'adminBohSignupErrorSeason',
  origin_denied: 'adminBohSignupErrorGeneric',
  service_unavailable: 'adminBohSignupErrorGeneric',
});

export function readBohSignupAdminError(error, options = {}) {
  const t = typeof options.t === 'function' ? options.t : (key, _vars, fallback) => fallback || key;
  const code = String(error?.code || error?.error || '').trim();
  const key = BOH_SIGNUP_ADMIN_ERROR_KEYS[code];
  return key ? t(key, {}, code) : t('adminBohSignupErrorGeneric', {}, code || 'failed');
}

/* ------------------------------------------------------------------ *
 * Competition #12 slot pickers
 *
 * The manual form keeps each ordered choice in one hidden input
 * (`data-boh-list="true"`, e.g. "+20,+8") that readBohSignupFormValues()
 * already splits into an array. The toggle buttons only edit that list.
 * ------------------------------------------------------------------ */

export const BOH_SIGNUP_SLOT_CATALOGS = Object.freeze({
  'commitment.bohTimeSlots': COMPETITION_BOH_SLOTS,
  'commitment.epicTimeSlots': COMPETITION_EPIC_SLOTS,
});

/** Adds `slot` at the end of the ordered list, or removes it if present. */
export function toggleOrderedSlot(list, slot, catalog = null) {
  const current = stringList(list);
  const value = String(slot || '').trim();
  if (!value || (catalog && !catalog.includes(value))) return current;
  return current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value];
}

/** Reflects a picker's hidden list on its buttons (pressed state and rank). */
export function syncBohSlotPicker(picker) {
  const input = picker?.querySelector?.('input[data-boh-list="true"]');
  if (!input) return [];
  const order = stringList(input.value);
  picker.querySelectorAll('[data-boh-slot]').forEach((button) => {
    const rank = order.indexOf(button.dataset.bohSlot) + 1;
    button.setAttribute('aria-pressed', rank ? 'true' : 'false');
    const badge = button.querySelector('[data-boh-slot-rank]');
    if (badge) badge.textContent = rank ? String(rank) : '';
  });
  return order;
}

/**
 * Why a request cannot be sent yet, as a catalogue key, or '' when it can.
 * Competition #12 entries need at least one BoH and one Epic Showdown slot; a
 * 2026 record edited here keeps its two classic fighting times instead.
 */
export function bohSignupAdminSlotProblem(request) {
  const commitment = request?.commitment || {};
  if (commitment.bohTimeSlots === undefined && commitment.epicTimeSlots === undefined) {
    return stringList(commitment.fightingTimeIds).length === 2 ? '' : 'adminBohSignupErrorSlots';
  }
  return stringList(commitment.bohTimeSlots).length && stringList(commitment.epicTimeSlots).length
    ? ''
    : 'adminBohSignupErrorSlots';
}

function slotSummary(signup, t) {
  const commitment = signup?.commitment || {};
  const clocks = (slots) => stringList(slots).map(slotToGameClock).join(' › ');
  const boh = clocks(commitment.bohTimeSlots);
  const epic = clocks(commitment.epicTimeSlots);
  const parts = [];
  if (boh) parts.push(t('adminBohSignupSlotsBoh', { slots: boh }, `BoH ${boh}`));
  if (epic) parts.push(t('adminBohSignupSlotsEpic', { slots: epic }, `Epic ${epic}`));
  if (!parts.length) {
    const legacy = stringList(commitment.fightingTimeIds).join(' › ');
    if (legacy) parts.push(t('adminBohSignupSlotsLegacy', { slots: legacy }, `Classic ${legacy}`));
  }
  return parts.join(' · ');
}

function consentBadge(signup, t) {
  const consent = signup?.commitment?.publicComparisonConsent;
  if (typeof consent !== 'boolean') return '—';
  return consent
    ? `<span class="dash-boh-consent is-public">${esc(
        t('adminBohSignupConsentYes', {}, 'Public board')
      )}</span>`
    : `<span class="dash-boh-consent">${esc(t('adminBohSignupConsentNo', {}, 'Private'))}</span>`;
}

/* ------------------------------------------------------------------ *
 * Pure renderers
 * ------------------------------------------------------------------ */

export function renderBohSignupProfileOptions(selectedId) {
  const selected = getBohScoringProfile(selectedId).id;
  return BOH_SCORING_PROFILES.map((profile) => {
    const label = `${profile.label} (v${profile.version})`;
    return `<option value="${esc(profile.id)}"${profile.id === selected ? ' selected' : ''}>${esc(
      label
    )}</option>`;
  }).join('');
}

export function renderBohSignupRows(signups, t) {
  if (!Array.isArray(signups) || !signups.length) {
    return `<div class="dash-empty">${esc(
      t('adminBohSignupListEmpty', {}, 'No signups yet in this season.')
    )}</div>`;
  }
  const rows = signups
    .map((signup) => {
      const name = esc(signup.gameName || signup.submissionUid);
      const manual = signup.entryMethod === 'manual';
      const slots = slotSummary(signup, t);
      return `<tr>
        <th scope="row">${name}</th>
        <td>${esc(String(signup.revision ?? ''))}</td>
        <td class="dash-boh-slots-cell"><bdi>${slots ? esc(slots) : '—'}</bdi></td>
        <td>${consentBadge(signup, t)}</td>
        <td>${
          manual
            ? esc(t('adminBohSignupManualChip', {}, 'Added by leadership'))
            : esc(t('adminBohSignupMemberChip', {}, 'Member form'))
        }</td>
        <td>${
          // A member's own signup carries fields the admin form cannot show, so
          // only rows leadership added by hand can be edited from here.
          manual
            ? `<button class="dash-btn" type="button" data-boh-signup-edit="${esc(
                signup.submissionUid
              )}">${esc(t('adminBohSignupEdit', {}, 'Edit'))}</button>`
            : '—'
        }</td>
      </tr>`;
    })
    .join('');
  return `<div class="dash-table-wrap"><table class="dash-table">
    <thead><tr>
      <th scope="col">${esc(t('adminBohSignupGameName', {}, 'Game name'))}</th>
      <th scope="col">${esc(t('adminBohSignupRevision', {}, 'Revision'))}</th>
      <th scope="col">${esc(t('adminBohSignupSlotsColumn', {}, 'Times (game time)'))}</th>
      <th scope="col">${esc(t('adminBohSignupConsentColumn', {}, 'Growth board'))}</th>
      <th scope="col">${esc(t('adminBohSignupManualChip', {}, 'Added by leadership'))}</th>
      <th scope="col">${esc(t('adminBohSignupActions', {}, 'Actions'))}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

/**
 * One admin form, two modes. `submissionUid` switches it to an edit of that
 * stored document; without one the save creates a new signup.
 */
export function createBohSignupAdminView(options = {}) {
  const t = typeof options.t === 'function' ? options.t : (key, _vars, fallback) => fallback || key;
  const state = { signups: [], season: '', config: null, target: '' };

  function fillForm(root, signup) {
    const form = root.querySelector('#dashBohSignupForm');
    if (!form) return;
    // Start from a clean form so an edit never inherits the previous row's
    // choices: writeBohSignupFormValues() only touches fields the signup has.
    form.reset?.();
    form.querySelectorAll('input[data-boh-list="true"]').forEach((input) => {
      input.value = '';
    });
    writeBohSignupFormValues(form, signup || {});
    form.querySelectorAll('[data-boh-slot-picker]').forEach((picker) => syncBohSlotPicker(picker));
    const target = root.querySelector('#dashBohSignupTarget');
    if (target) target.value = signup?.submissionUid || '';
    const cancel = root.querySelector('#dashBohSignupCancelEdit');
    if (cancel) cancel.hidden = !signup;
    const submit = root.querySelector('#dashBohSignupSubmitLabel');
    if (submit) {
      submit.textContent = signup
        ? t('adminBohSignupSaveUpdate', {}, 'Save changes')
        : t('adminBohSignupSave', {}, 'Save signup');
    }
    state.target = signup?.submissionUid || '';
  }

  function renderConfig(root, snapshot) {
    const config = snapshot.config || {};
    state.config = config;
    state.season = snapshot.season || config.activeSeason || '';
    const seasonInput = root.querySelector('#dashBohSignupSeasonInput');
    if (seasonInput && document.activeElement !== seasonInput) {
      seasonInput.value = state.season;
    }
    const profileSelect = root.querySelector('#dashBohSignupProfileSelect');
    if (profileSelect) {
      profileSelect.innerHTML = renderBohSignupProfileOptions(
        config.scoringProfileId || state.season
      );
    }
    const openInput = root.querySelector('#dashBohSignupOpenInput');
    if (openInput) openInput.checked = config.open === true;
    const grantInput = root.querySelector('#dashBohSignupGrantInput');
    if (grantInput && document.activeElement !== grantInput) {
      grantInput.value = String(config.grantDurationMinutes || 720);
    }
    const summary = root.querySelector('#dashBohSignupsSeason');
    if (summary) {
      summary.textContent = state.season
        ? t(
            'adminBohSignupSeasonSummary',
            {
              season: state.season,
              version: getBohScoringProfile(config.scoringProfileId).label,
            },
            `Season ${state.season} · ${getBohScoringProfile(config.scoringProfileId).label}`
          )
        : t('adminBohSignupNoSeason', {}, 'No active season is configured yet.');
    }
  }

  function render(root, snapshot = {}) {
    state.signups = Array.isArray(snapshot.signups) ? snapshot.signups : [];
    renderConfig(root, snapshot);
    const list = root.querySelector('#dashBohSignupsList');
    if (list) list.innerHTML = renderBohSignupRows(state.signups, t);
  }

  /** Reads the form and returns the Function request for the current mode. */
  function collectRequest(root) {
    const form = root.querySelector('#dashBohSignupForm');
    const values = readBohSignupFormValues(form || root);
    const commitment = values.commitment || {};
    // A 2026 record edited here has no slots: send its classic fighting times
    // alone so the Function keeps the stored shape.
    if (
      !stringList(commitment.bohTimeSlots).length &&
      !stringList(commitment.epicTimeSlots).length &&
      stringList(commitment.fightingTimeIds).length === 2
    ) {
      delete commitment.bohTimeSlots;
      delete commitment.epicTimeSlots;
      delete commitment.publicComparisonConsent;
    }
    const target = root.querySelector('#dashBohSignupTarget')?.value || '';
    const profileSelect = root.querySelector('#dashBohSignupProfileSelect');
    const profileId = profileSelect?.value || state.config?.scoringProfileId || '';
    return buildBohSignupAdminRequest({
      values,
      seasonId: state.season,
      scoringProfileId: profileId,
      submissionUid: target || '',
    });
  }

  function readSeasonConfig(root) {
    return {
      activeSeason: String(root.querySelector('#dashBohSignupSeasonInput')?.value || '').trim(),
      scoringProfileId: String(
        root.querySelector('#dashBohSignupProfileSelect')?.value || ''
      ).trim(),
      open: root.querySelector('#dashBohSignupOpenInput')?.checked === true,
      grantDurationMinutes: Number(root.querySelector('#dashBohSignupGrantInput')?.value || 720),
    };
  }

  return Object.freeze({ render, fillForm, collectRequest, readSeasonConfig, state });
}

export class BohSignupSeasonError extends Error {
  constructor(field) {
    super(`Invalid season setting: ${field}`);
    this.name = 'BohSignupSeasonError';
    this.code = 'invalid_season_setting';
    this.field = field;
  }
}

/**
 * Client write of the season document. `validAllStarBohConfig()` pins four
 * keys plus the optional `acceptNewSignups` flag, so this writes exactly those
 * four keys — and validates them here first, because a rules denial only tells
 * the operator "permission denied". `acceptNewSignups` is set by the
 * syncCompetitionPhase Function from the Competition #12 schedule; this write
 * carries the stored value forward (read fresh when the context can read) so
 * saving the season form never reopens sign-ups the schedule has closed.
 */
export async function saveBohSignupSeasonConfig(config, context) {
  const season = String(config.activeSeason || '').trim();
  if (!BOH_SIGNUP_SEASON_PATTERN.test(season)) throw new BohSignupSeasonError('activeSeason');
  const scoringProfileId = String(config.scoringProfileId || '').trim();
  if (!BOH_SIGNUP_PROFILE_IDS.includes(scoringProfileId)) {
    throw new BohSignupSeasonError('scoringProfileId');
  }
  const grantDurationMinutes = Math.trunc(Number(config.grantDurationMinutes));
  if (
    !Number.isInteger(grantDurationMinutes) ||
    grantDurationMinutes < 5 ||
    grantDurationMinutes > 10080
  ) {
    throw new BohSignupSeasonError('grantDurationMinutes');
  }
  const { firestore, db } = context;
  const { doc, getDoc, setDoc } = firestore;
  const payload = {
    activeSeason: season,
    scoringProfileId,
    open: config.open === true,
    grantDurationMinutes,
  };
  let acceptNewSignups = config.acceptNewSignups;
  if (typeof getDoc === 'function') {
    const stored = await getDoc(doc(db, BOH_SIGNUP_CONFIG_PATH));
    const data = stored?.exists?.() ? stored.data() : null;
    acceptNewSignups = data?.acceptNewSignups;
  }
  if (typeof acceptNewSignups === 'boolean') payload.acceptNewSignups = acceptNewSignups;
  await setDoc(doc(db, BOH_SIGNUP_CONFIG_PATH), payload);
  return payload;
}
