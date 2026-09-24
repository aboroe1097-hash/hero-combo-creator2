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
      return `<tr>
        <th scope="row">${name}</th>
        <td>${esc(String(signup.revision ?? ''))}</td>
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
    writeBohSignupFormValues(form, signup || {});
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
 * Client write of the season document. `validAllStarBohConfig()` pins exactly
 * four keys, so this writes exactly four keys — and validates them here first,
 * because a rules denial only tells the operator "permission denied".
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
  const { doc, setDoc } = firestore;
  const payload = {
    activeSeason: season,
    scoringProfileId,
    open: config.open === true,
    grantDurationMinutes,
  };
  await setDoc(doc(db, BOH_SIGNUP_CONFIG_PATH), payload);
  return payload;
}
