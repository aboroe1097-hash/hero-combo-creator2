const POWER_FIELDS = Object.freeze([
  'totalCastlePower',
  'troopPower',
  'buildingPower',
  'technologyPower',
  'heroCombatPower',
  'dragonPower',
]);

const SECTION_ORDER = Object.freeze(['signup', 'announcement', 'plan', 'showdown']);
const AVAILABILITY_VALUES = new Set(['all', 'most', 'backup']);
const ROLE_VALUES = new Set(['flexible', 'offensive', 'rune', 'top', 'bottom', 'backup']);
const FIGHTING_TIME_IDS = Object.freeze(['+8', '+12', '+14', '+20']);
const EPIC_LANE_VALUES = Object.freeze(['south', 'center', 'north']);
const DEFAULT_EPIC_TIME_SLOT_IDS = Object.freeze(['+8', '+10', '+12']);
const PRIVATE_VALUE_KEY = /(?:imageData|base64|screenshot|dataUrl|file|blob)/iu;
const DEFAULT_ROLE_LABELS = Object.freeze({
  offensive: Object.freeze(['Offensive Team']),
  rune: Object.freeze(['Rune Team']),
  top: Object.freeze(['Top Side']),
  bottom: Object.freeze(['Bottom Side']),
  backup: Object.freeze(['Backup', 'Backup / rotating player']),
  flexible: Object.freeze(['Flexible', 'Flexible - place me where needed']),
});
const DEFAULT_PHASE_LABELS = Object.freeze({
  'phase-0-5': Object.freeze(['0-5 Minutes', '0-5 min']),
  'phase-5-10': Object.freeze(['5-10 Minutes', '5-10 min']),
  'phase-10-15': Object.freeze(['10-15 Minutes', '10-15 min']),
  'phase-15-30': Object.freeze(['15-30 Minutes', '15-30 min']),
});
const controllers = new WeakMap();

function textValue(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim();
}

function comparableLabel(value) {
  return textValue(value)
    .toLocaleLowerCase('en')
    .replace(/[\u2012-\u2015]/gu, '-')
    .replace(/\s+/gu, ' ');
}

function isCanonicalLabel(value, candidates = []) {
  const normalized = comparableLabel(value);
  return (
    Boolean(normalized) && candidates.some((candidate) => comparableLabel(candidate) === normalized)
  );
}

function finiteInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : fallback;
}

function booleanValue(value) {
  return value === true || value === 'true' || value === 'on' || value === '1';
}

function formatTemplate(template, values = {}) {
  return String(template).replace(/\{(\w+)\}/gu, (_, key) => String(values[key] ?? ''));
}

function makeTranslator(text, language) {
  return (key, fallback, values) => {
    let translated;
    if (typeof text === 'function') {
      try {
        translated = text(key, values || {}, language);
      } catch {
        translated = undefined;
      }
    } else if (text && typeof text === 'object') translated = text[key];
    const output =
      translated === undefined || translated === null || translated === '' || translated === key
        ? fallback
        : translated;
    return formatTemplate(output ?? key, values);
  };
}

function query(root, selector) {
  return root?.querySelector?.(selector) || null;
}

function queryAll(root, selector) {
  return Array.from(root?.querySelectorAll?.(selector) || []);
}

function setHidden(element, hidden) {
  if (element) element.hidden = Boolean(hidden);
}

function setText(element, value) {
  if (element) element.textContent = String(value ?? '');
}

function setBusy(element, busy) {
  if (!element) return;
  element.disabled = Boolean(busy);
  if (busy) element.setAttribute?.('aria-busy', 'true');
  else element.removeAttribute?.('aria-busy');
}

function ownerWindow(root) {
  return root?.ownerDocument?.defaultView || globalThis.window || null;
}

function ownerDocument(root) {
  return root?.ownerDocument || globalThis.document || null;
}

function createElement(root, tag, className, value) {
  const element = ownerDocument(root)?.createElement?.(tag);
  if (!element) return null;
  if (className) element.className = className;
  if (value !== undefined) element.textContent = String(value);
  return element;
}

function createSvgElement(root, tag, attributes = {}) {
  const element = ownerDocument(root)?.createElementNS?.('http://www.w3.org/2000/svg', tag);
  if (!element) return null;
  Object.entries(attributes).forEach(([name, value]) => {
    if (value !== undefined && value !== null) element.setAttribute(name, String(value));
  });
  return element;
}

function append(parent, ...children) {
  const valid = children.filter(Boolean);
  if (parent?.append) parent.append(...valid);
  return parent;
}

function replaceChildren(parent, ...children) {
  if (parent?.replaceChildren) parent.replaceChildren(...children.filter(Boolean));
}

function formValue(source, name) {
  if (typeof source?.get === 'function') return source.get(name);
  return source?.[name];
}

function formValues(source, name) {
  if (typeof source?.getAll === 'function') return source.getAll(name);
  const value = source?.[name];
  if (Array.isArray(value)) return value;
  return value === undefined || value === null || value === '' ? [] : [value];
}

function normalizeDigits(value) {
  const zeroPoints = [
    0x0660, 0x06f0, 0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66, 0x0e50,
    0x0ed0, 0x0f20, 0x1040, 0x17e0, 0xff10,
  ];
  let output = '';
  for (const character of String(value ?? '').normalize('NFKC')) {
    const codePoint = character.codePointAt(0);
    let digit = null;
    for (const zeroPoint of zeroPoints) {
      const offset = codePoint - zeroPoint;
      if (offset >= 0 && offset <= 9) {
        digit = String(offset);
        break;
      }
    }
    output += digit ?? character;
  }
  return output;
}

/** Strictly accepts a full non-negative integer; abbreviations such as 250M are rejected. */
export function parseBohInteger(value, options = {}) {
  const label = options.label || 'Value';
  const minimum = options.minimum ?? 0;
  const maximum = options.maximum ?? Number.MAX_SAFE_INTEGER;
  const required = options.required !== false;
  if ((value === null || value === undefined || value === '') && !required) return 0;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new TypeError(`${label} must be a whole number.`);
    if (value < minimum || value > maximum)
      throw new RangeError(`${label} is outside the accepted range.`);
    return value;
  }
  const normalized = normalizeDigits(value)
    .replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu, '')
    .trim();
  if (!normalized) {
    if (!required) return 0;
    throw new TypeError(`${label} is required.`);
  }
  const plain = /^[0-9]+$/u.test(normalized);
  const grouped = /^[0-9]{1,3}(?:[,.'’\u066b\u066c\u00a0\u2007\u2009\u202f ][0-9]{3})+$/u.test(
    normalized
  );
  if (!plain && !grouped) throw new TypeError(`${label} must use the full whole-number value.`);
  const digits = normalized.replace(/[^0-9]/gu, '');
  const number = Number(digits);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    throw new RangeError(`${label} is outside the accepted range.`);
  }
  return number;
}

function ensureNoPrivateValues(value, path = 'submission', seen = new Set()) {
  if (!value || typeof value !== 'object') return;
  if (seen.has(value)) throw new TypeError(`${path} contains a circular value.`);
  seen.add(value);
  for (const [key, nested] of Object.entries(value)) {
    if (PRIVATE_VALUE_KEY.test(key)) throw new TypeError(`${path}.${key} is not persistable.`);
    if (typeof nested === 'string' && /^data:image\//iu.test(nested)) {
      throw new TypeError(`${path}.${key} contains private image data.`);
    }
    ensureNoPrivateValues(nested, `${path}.${key}`, seen);
  }
  seen.delete(value);
}

function safeList(values, allowed) {
  const output = [];
  for (const value of values) {
    const normalized = textValue(value).toLowerCase();
    if (!normalized || (allowed && !allowed.has(normalized)) || output.includes(normalized))
      continue;
    output.push(normalized);
  }
  return output;
}

function canonicalCatalogSelection(values, catalog, field) {
  const canonicalValues = Array.isArray(catalog) ? catalog.map(textValue).filter(Boolean) : [];
  const byKey = new Map(canonicalValues.map((value) => [comparableLabel(value), value]));
  const selected = new Set();
  for (const rawValue of values || []) {
    const value = textValue(rawValue);
    if (!value) continue;
    const canonical = byKey.get(comparableLabel(value));
    if (!canonical) {
      const error = new TypeError(`${field} contains an unavailable option.`);
      error.field = field;
      throw error;
    }
    selected.add(canonical);
  }
  return canonicalValues.filter((value) => selected.has(value));
}

function researchProgressFrom(source, researchTreeIds) {
  const progress = {};
  for (const treeId of researchTreeIds || []) {
    const rawValue = formValue(source, `researchProgressPct.${treeId}`);
    if (rawValue === null || rawValue === undefined || String(rawValue).trim() === '') continue;
    try {
      progress[treeId] = parseBohInteger(rawValue, {
        label: 'Research progress',
        minimum: 0,
        maximum: 100,
      });
    } catch (error) {
      error.field = `researchProgressPct.${treeId}`;
      throw error;
    }
  }
  return progress;
}

/** Parses the optional teammate request without silently dropping extra names. */
export function parseBohPreferredTeammates(value, options = {}) {
  const values = Array.isArray(value)
    ? value
    : String(value ?? '')
        .split(/[,;|\n]+/u)
        .filter(Boolean);
  const ownName = comparableLabel(options.gameName);
  const seen = new Set();
  const names = [];
  for (const rawName of values) {
    const name = textValue(rawName).replace(/\s+/gu, ' ');
    const key = comparableLabel(name);
    if (!key || key === ownName || seen.has(key)) continue;
    if (Array.from(name).length > 160) {
      const error = new TypeError('Each preferred teammate name must be 160 characters or fewer.');
      error.field = 'preferredTeammates';
      throw error;
    }
    seen.add(key);
    names.push(name);
  }
  if (names.length > 6) {
    const error = new TypeError('Add no more than six preferred teammate names.');
    error.field = 'preferredTeammates';
    throw error;
  }
  return names;
}

function normalizeEpicTimeSlotIds(value, fallback = DEFAULT_EPIC_TIME_SLOT_IDS) {
  const source = Array.isArray(value) ? value : fallback;
  const seen = new Set();
  const output = [];
  for (const rawValue of source) {
    const timeSlotId = textValue(rawValue);
    const key = comparableLabel(timeSlotId);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(timeSlotId);
    if (output.length === 24) break;
  }
  return output;
}

/** Builds the separate Epic Showdown preference document from multi-select controls. */
export function buildBohEpicPreferencesPayload(source, options = {}) {
  const gameName = textValue(
    formValue(source, 'epicGameName') ?? formValue(source, 'gameName')
  ).replace(/\s+/gu, ' ');
  if (!gameName || Array.from(gameName).length > 160) {
    const error = new TypeError(
      'Current in-game name is required and must be 160 characters or fewer.'
    );
    error.field = 'epicGameName';
    throw error;
  }
  const lanePreferences = safeList(formValues(source, 'epicLanePreferences'));
  if (!lanePreferences.length) {
    const error = new TypeError('Choose at least one position: South, Center, or North.');
    error.field = 'epicLanePreferences';
    error.i18nKey = 'showdown.laneRequired';
    throw error;
  }
  const invalidLane = lanePreferences.find((lane) => !EPIC_LANE_VALUES.includes(lane));
  if (invalidLane) {
    const error = new TypeError('Epic Showdown position is invalid.');
    error.field = 'epicLanePreferences';
    throw error;
  }

  const timeSlotIds = normalizeEpicTimeSlotIds(options.timeSlotIds);
  const configuredTimes = new Map(
    timeSlotIds.map((timeSlotId) => [comparableLabel(timeSlotId), timeSlotId])
  );
  const timePreferences = [];
  for (const rawValue of formValues(source, 'epicTimePreferences')) {
    const timeSlotId = configuredTimes.get(comparableLabel(rawValue));
    if (!timeSlotId) {
      const error = new TypeError('Epic Showdown game time is no longer available.');
      error.field = 'epicTimePreferences';
      throw error;
    }
    if (!timePreferences.includes(timeSlotId)) timePreferences.push(timeSlotId);
  }
  if (!timePreferences.length) {
    const error = new TypeError('Choose at least one available game time.');
    error.field = 'epicTimePreferences';
    error.i18nKey = 'showdown.timeRequired';
    throw error;
  }

  const payload = { gameName, lanePreferences, timePreferences };
  let normalized;
  try {
    normalized = options.model?.normalizeBohEpicShowdownPreferences?.(payload, {
      timeSlotIds,
    });
  } catch (error) {
    if (error?.field === 'gameName') error.field = 'epicGameName';
    throw error;
  }
  if (!normalized) return payload;
  return {
    gameName: normalized.gameName || gameName,
    lanePreferences: [...(normalized.lanePreferences || [])],
    timePreferences: [...(normalized.timePreferences || [])],
  };
}

/** Keeps optimistic concurrency anchored to the revision visible when editing began. */
export function resolveBohEpicExpectedRevision(preferences, editBaseRevision) {
  return Number.isInteger(editBaseRevision)
    ? Math.max(0, editBaseRevision)
    : finiteInteger(preferences?.revision);
}

/** Builds the exact allow-listed document sent to saveSubmission. */
export function buildBohSubmissionPayload(source, options = {}) {
  const gameName = textValue(formValue(source, 'gameName'));
  if (!gameName || Array.from(gameName).length > 64) {
    const error = new TypeError(
      'Current in-game name is required and must be 64 characters or fewer.'
    );
    error.field = 'gameName';
    throw error;
  }

  const stats = {};
  for (const field of POWER_FIELDS) {
    try {
      stats[field] = parseBohInteger(formValue(source, field), {
        label: field,
        minimum: 0,
        maximum: 100_000_000_000,
      });
    } catch (error) {
      error.field = field;
      throw error;
    }
  }
  stats.level50HeroCount = parseBohInteger(formValue(source, 'level50Heroes'), {
    label: 'Level 50 heroes',
    minimum: 0,
    maximum: 99,
    required: false,
  });
  stats.rocLevel = parseBohInteger(formValue(source, 'rocLevel'), {
    label: 'RoC level',
    minimum: 0,
    maximum: 99,
    required: false,
  });

  const t9Types = safeList(
    formValues(source, 't9Types'),
    new Set(['cavalry', 'archers', 'footmen', 'none'])
  );
  if (t9Types.includes('none') && t9Types.length > 1) {
    const error = new TypeError('Choose T9 troop types or None, not both.');
    error.field = 't9Types';
    throw error;
  }
  stats.t9TroopTypes = t9Types.filter((value) => value !== 'none');
  stats.readySpeedHeroes = safeList(
    formValues(source, 'speedHeroes'),
    new Set(['lionheart', 'cao-cao', 'al-fatih'])
  );
  const heroNames = Array.isArray(options.heroNames) ? options.heroNames : [];
  const researchTreeIds = Array.isArray(options.researchTreeIds) ? options.researchTreeIds : [];
  stats.usableHeroNames = canonicalCatalogSelection(
    formValues(source, 'usableHeroNames'),
    heroNames,
    'usableHeroNames'
  );
  stats.researchProgressPct = researchProgressFrom(source, researchTreeIds);

  const availability = textValue(formValue(source, 'availability')).toLowerCase();
  if (!AVAILABILITY_VALUES.has(availability)) {
    const error = new TypeError('Choose your expected availability.');
    error.field = 'availability';
    throw error;
  }
  const preferredRole = textValue(formValue(source, 'preferredRole')).toLowerCase();
  if (preferredRole && !ROLE_VALUES.has(preferredRole)) {
    const error = new TypeError('Preferred role is invalid.');
    error.field = 'preferredRole';
    throw error;
  }
  const fightingTimeIds = canonicalCatalogSelection(
    formValues(source, 'fightingTimeIds'),
    FIGHTING_TIME_IDS,
    'fightingTimeIds'
  );
  if (fightingTimeIds.length !== 2) {
    const error = new TypeError('Choose exactly two All-Star fighting times.');
    error.field = 'fightingTimeIds';
    error.i18nKey = 'signup.fightingTimesRequired';
    throw error;
  }
  if (!booleanValue(formValue(source, 'planCommitment'))) {
    const error = new TypeError('Confirm that you will review and follow the published plan.');
    error.field = 'planCommitment';
    throw error;
  }

  const entryMethod = options.entryMethod === 'ocr' ? 'ocr' : 'manual';
  if (entryMethod === 'ocr' && (!options.ocrReview || options.ocrValuesConfirmed !== true)) {
    const error = new TypeError('Review and explicitly confirm every OCR value before submitting.');
    error.field = 'ocrValuesConfirmed';
    throw error;
  }
  const confidence = options.ocrReview?.confidence || {};
  const fieldConfidence = Object.fromEntries(
    POWER_FIELDS.filter((field) => Number.isFinite(confidence[field])).map((field) => [
      field,
      confidence[field],
    ])
  );

  const payload = {
    gameName,
    knownNames: [
      gameName,
      ...(Array.isArray(options.knownNames) ? options.knownNames.map(textValue) : []),
    ].filter((name, index, names) => name && names.indexOf(name) === index),
    preferredTeammates: parseBohPreferredTeammates(formValue(source, 'preferredTeammates'), {
      gameName,
    }),
    locale: textValue(options.language),
    timezone: textValue(formValue(source, 'timezone')).slice(0, 80),
    entryMethod,
    status: 'submitted',
    stats,
    rolePreferences: !preferredRole || preferredRole === 'flexible' ? [] : [preferredRole],
    eligibleRoleIds: [],
    commitment: {
      availability,
      preferredRole,
      fightingTimeIds,
      unavailableTimes: textValue(formValue(source, 'unavailableTimes')).slice(0, 800),
      canTeleport: booleanValue(formValue(source, 'canTeleport')),
      canUseVoice: booleanValue(formValue(source, 'canUseVoice')),
      planCommitment: true,
      notes: textValue(formValue(source, 'playerNotes')).slice(0, 2000),
    },
    ocr: {
      used: entryMethod === 'ocr',
      valuesConfirmed: entryMethod === 'ocr' && options.ocrValuesConfirmed === true,
      confidence: Number.isFinite(confidence.overall) ? confidence.overall : null,
      warnings: entryMethod === 'ocr' ? [...(options.ocrReview?.warnings || [])].slice(0, 20) : [],
      fieldConfidence: entryMethod === 'ocr' ? fieldConfidence : {},
    },
    submittedAtMs: options.now ?? Date.now(),
  };

  const normalized =
    typeof options.model?.normalizeBohSignup === 'function'
      ? options.model.normalizeBohSignup(payload, {
          heroNames,
          researchTreeIds,
          requireFightingTimeIds: true,
        })
      : null;
  if (normalized) {
    payload.knownNames = normalized.knownNames;
    payload.preferredTeammates = [...(normalized.preferredTeammates || [])];
    payload.stats = { ...payload.stats, ...normalized.stats };
    payload.rolePreferences = [...(normalized.rolePreferences || [])];
    payload.commitment = { ...payload.commitment, ...normalized.commitment };
  }
  ensureNoPrivateValues(payload);
  return payload;
}

function publicationFlag(publication, type) {
  if (!publication) return false;
  if (type === 'announcement') {
    return (
      publication.announcementPublished === true ||
      ['announcement', 'plan', 'live'].includes(publication.status)
    );
  }
  return publication.planPublished === true || ['plan', 'live'].includes(publication.status);
}

/** Selects the four explicit player UI states without inferring backend access. */
export function selectBohPlayerStates(input = {}) {
  if (input.accessGranted !== true) return { announcement: 'locked', plan: 'locked' };
  const assigned = Boolean(input.personalPlan?.teamId);
  return {
    announcement: publicationFlag(input.publication, 'announcement')
      ? assigned
        ? 'assigned'
        : 'unassigned'
      : 'unpublished',
    plan: publicationFlag(input.publication, 'plan')
      ? assigned
        ? 'assigned'
        : 'unassigned'
      : 'unpublished',
  };
}

function phaseKey(entry) {
  return `${entry?.legionId || ''}:${entry?.phaseId || ''}`;
}

/** Chooses one Legion timeline plus the current/next cards from projected domain entries. */
export function selectBohTimelineView(entries = [], options = {}) {
  const list = Array.isArray(entries) ? entries.filter(Boolean) : [];
  const legionIds = [...new Set(list.map((entry) => textValue(entry.legionId)).filter(Boolean))];
  const legionId = legionIds.includes(options.legionId) ? options.legionId : legionIds[0] || '';
  const timeline = list
    .filter((entry) => !legionId || entry.legionId === legionId)
    .sort(
      (left, right) =>
        finiteInteger(left.startMinute) - finiteInteger(right.startMinute) ||
        phaseKey(left).localeCompare(phaseKey(right))
    );
  let index = timeline.findIndex((entry) => entry.phaseId === options.phaseId);
  if (index < 0) index = 0;
  const current = timeline[index] || null;
  return {
    legionId,
    legionIds,
    timeline,
    phaseId: current?.phaseId || '',
    current,
    next: timeline[index + 1] || null,
    index,
    hasRotation: timeline.some((entry) => entry.rotated === true),
  };
}

function teamForProjection(team) {
  if (!team) return null;
  return {
    ...team,
    id: team.id || team.teamId,
    players: (team.seats || team.players || []).map((seat) => ({
      playerId: seat.playerId,
      gameName: seat.displayName || seat.gameName,
      seatNumber: seat.seatNumber,
    })),
  };
}

export function projectBohPlayerPlan(input = {}) {
  if (Array.isArray(input.personalPlan?.timeline)) return input.personalPlan.timeline;
  const projector = input.model?.projectBohPlayerTimeline;
  if (typeof projector !== 'function' || !input.personalPlan?.plan || !input.team) return [];
  const seat = (input.team.seats || []).find(
    (entry) => entry.seatNumber === input.personalPlan.seatNumber
  );
  const playerId = input.playerId || seat?.playerId;
  if (!playerId) return [];
  return projector(input.personalPlan.plan, teamForProjection(input.team), playerId, {
    legionId: input.legionId || undefined,
  });
}

function instructionValue(entry, ...keys) {
  const instruction = entry?.instruction || {};
  for (const key of keys) {
    if (instruction[key] !== undefined && instruction[key] !== null && instruction[key] !== '') {
      return textValue(instruction[key]);
    }
  }
  return '';
}

function objectiveFor(plan, value) {
  const key =
    value && typeof value === 'object'
      ? textValue(value.id || value.objectiveId || value.code || value.label)
      : textValue(value);
  return (plan?.objectives || []).find(
    (objective) => objective.id === key || objective.code === key || objective.label === key
  );
}

function pointForObjective(objective) {
  if (!objective || !Number.isFinite(objective.x) || !Number.isFinite(objective.y)) return null;
  return [
    40 + (Math.max(0, Math.min(100, objective.x)) / 100) * 560,
    25 + (Math.max(0, Math.min(100, objective.y)) / 100) * 380,
  ];
}

function routeReference(plan, value) {
  if (value === undefined || value === null || value === '') return null;
  const authored = objectiveFor(plan, value);
  if (value && typeof value === 'object') {
    const id = textValue(value.id || value.objectiveId || value.code || value.label);
    return {
      ...(authored || {}),
      id: authored?.id || id,
      code: textValue(value.code || authored?.code),
      label: textValue(value.label || value.name || authored?.label || id),
      type: textValue(value.type || value.kind || authored?.type || 'objective'),
      x:
        value.x !== undefined &&
        value.x !== null &&
        value.x !== '' &&
        Number.isFinite(Number(value.x))
          ? Number(value.x)
          : authored?.x,
      y:
        value.y !== undefined &&
        value.y !== null &&
        value.y !== '' &&
        Number.isFinite(Number(value.y))
          ? Number(value.y)
          : authored?.y,
    };
  }
  if (authored) return authored;
  const label = textValue(value);
  return label ? { id: label, code: '', label, type: 'objective', x: null, y: null } : null;
}

function routeReferences(plan, value) {
  const values = Array.isArray(value)
    ? value
    : value === undefined || value === null
      ? []
      : [value];
  return values.map((entry) => routeReference(plan, entry)).filter(Boolean);
}

function authoredRoutePath(instruction, route) {
  const candidates = [
    instruction.pathObjectiveIds,
    instruction.routeObjectiveIds,
    route.pathObjectiveIds,
    route.path,
  ];
  return candidates.find((candidate) => Array.isArray(candidate) && candidate.length) || [];
}

export function buildBohRouteDescriptor(entry, plan = {}, options = {}) {
  const instruction = entry?.instruction || {};
  const route = instruction.route && typeof instruction.route === 'object' ? instruction.route : {};
  const explicitPath = authoredRoutePath(instruction, route);
  let routeNodes = routeReferences(plan, explicitPath);
  if (!routeNodes.length) {
    const inferredSpawn = (plan?.objectives || []).find((objective) =>
      ['spawn', 'start'].includes(textValue(objective.type).toLowerCase())
    );
    const startNode = routeReference(
      plan,
      route.startPoint ||
        route.start ||
        instruction.startObjective ||
        instruction.startObjectiveId ||
        inferredSpawn
    );
    const viaNodes = routeReferences(
      plan,
      route.viaPoints ||
        route.via ||
        instruction.viaObjectives ||
        instruction.viaObjectiveIds ||
        instruction.viaObjectiveId ||
        instruction.tower
    );
    const targetNode = routeReference(
      plan,
      route.targetPoint ||
        route.target ||
        instruction.targetObjective ||
        instruction.targetObjectiveId ||
        instruction.objectiveId ||
        objectiveFor(plan, instruction.target)
    );
    routeNodes = [startNode, ...viaNodes, targetNode].filter(Boolean);
  }
  const startNode = routeNodes.length > 1 ? routeNodes[0] : null;
  const targetNode = routeNodes.at(-1) || null;
  const viaNodes = routeNodes.length > 2 ? routeNodes.slice(1, -1) : [];
  const start = startNode?.label || textValue(route.startLabel) || options.startFallback || 'Start';
  const via =
    viaNodes
      .map((objective) => objective.label)
      .filter(Boolean)
      .join(' → ') ||
    options.viaFallback ||
    'Direct route';
  const target =
    targetNode?.label ||
    textValue(route.targetLabel || instruction.target || instruction.objectiveLabel) ||
    options.targetFallback ||
    'Current target';
  const points = routeNodes.map(pointForObjective);
  const hasCompleteRoute = points.length >= 2 && points.every(Boolean);
  const routeIds = new Set(routeNodes.map((objective) => objective.id).filter(Boolean));
  const allNodes = [...(plan?.objectives || []), ...routeNodes];
  const seenNodes = new Set();
  const nodes = allNodes
    .filter((objective) => {
      const id = textValue(objective?.id || objective?.code || objective?.label);
      const point = pointForObjective(objective);
      if (!id || !point || seenNodes.has(id)) return false;
      seenNodes.add(id);
      return true;
    })
    .map((objective) => {
      const point = pointForObjective(objective);
      const id = textValue(objective.id || objective.code || objective.label);
      return {
        id,
        code: (textValue(objective.code) || textValue(objective.label)).slice(0, 8),
        label: textValue(objective.label || objective.code || objective.id),
        type: textValue(objective.type || 'objective'),
        x: Math.round(point[0]),
        y: Math.round(point[1]),
        onRoute: routeIds.has(id),
        isStart: id === startNode?.id,
        isTarget: id === targetNode?.id,
      };
    });
  return {
    start,
    via,
    target,
    nodes,
    path: hasCompleteRoute
      ? points
          .map(([x, y], index) => `${index ? 'L' : 'M'} ${Math.round(x)} ${Math.round(y)}`)
          .join(' ')
      : '',
    description: `${start} → ${via} → ${target}`,
  };
}

function initialState(options) {
  return {
    options,
    root: options.root,
    store: options.store || null,
    ocr: options.ocrService || {},
    model: options.model || {},
    textSource: options.text,
    language: textValue(options.language || 'en') || 'en',
    tr: makeTranslator(options.text, options.language || 'en'),
    accessGranted: Boolean(options.store && options.store.accessGranted !== false),
    section: 'signup',
    entryMethod: 'manual',
    selectedPhaseId: '',
    selectedLegionId: '',
    selectedTeamId: '',
    submission: null,
    submissionFeedback: null,
    epicPreferences: null,
    publication: null,
    personalPlan: null,
    teams: new Map(),
    ocrFile: null,
    ocrPreviewUrl: '',
    ocrReview: null,
    ocrInvalidField: '',
    ocrBusy: false,
    saving: false,
    dirty: false,
    hydratedRevision: null,
    submissionEditBaseRevision: null,
    epicSaving: false,
    epicDirty: false,
    epicHydratedRevision: null,
    epicEditBaseRevision: null,
    renderedEpicTimeOptions: '',
    renderedHeroCatalog: '',
    renderedResearchCatalog: '',
    fightingTimeErrorKey: '',
    destroyed: false,
    subscriptions: [],
    teamSubscriptions: new Map(),
    eventsAbort: new AbortController(),
  };
}

function reportError(state, error, context = {}) {
  state.options.onError?.(error, context);
  const feedback = query(state.root, '[data-role="page-feedback"]');
  if (feedback) {
    feedback.hidden = false;
    feedback.dataset.tone = 'error';
    feedback.textContent = error?.message || String(error);
  }
}

function notice(state, key, fallback, context = {}) {
  const message = state.tr(key, fallback, context);
  state.options.onNotice?.(message, { key, ...context });
  const feedback = query(state.root, '[data-role="page-feedback"]');
  if (feedback) {
    feedback.hidden = false;
    feedback.dataset.tone = context.tone || 'success';
    feedback.textContent = message;
  }
}

function clearNotice(state) {
  const feedback = query(state.root, '[data-role="page-feedback"]');
  if (feedback) {
    feedback.hidden = true;
    feedback.textContent = '';
    delete feedback.dataset.tone;
  }
}

function activateSection(state, section, focus = false) {
  if (!SECTION_ORDER.includes(section)) return false;
  state.section = section;
  for (const tab of queryAll(state.root, '[data-role="section-tab"]')) {
    const selected = tab.dataset.section === section;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    tab.classList?.toggle('is-active', selected);
    if (selected && focus) tab.focus?.();
  }
  for (const panel of queryAll(state.root, '[data-role="section-panel"]')) {
    panel.hidden = panel.dataset.section !== section;
  }
  return true;
}

function setEntryMethod(state, method) {
  state.entryMethod = method === 'ocr' ? 'ocr' : 'manual';
  setHidden(query(state.root, '[data-role="ocr-upload-panel"]'), state.entryMethod !== 'ocr');
  for (const input of queryAll(state.root, '[data-role="entry-method"]')) {
    input.checked = input.value === state.entryMethod;
  }
  const confirmation = query(state.root, '[data-role="ocr-values-confirmed"]');
  if (state.entryMethod !== 'ocr' && confirmation) confirmation.checked = false;
  renderOcr(state);
}

function updateInput(form, name, value) {
  const control = query(form, `[name="${name}"]`);
  if (control) control.value = value ?? '';
}

function updateChecked(form, name, values) {
  const selected = new Set(Array.isArray(values) ? values : [values]);
  for (const control of queryAll(form, `[name="${name}"]`)) {
    control.checked = selected.has(control.value);
  }
}

function heroCatalogFor(state) {
  const seen = new Set();
  const heroes = [];
  for (const value of Array.isArray(state.options.heroes) ? state.options.heroes : []) {
    const name = textValue(value?.name);
    const key = comparableLabel(name);
    if (!name || seen.has(key)) continue;
    seen.add(key);
    heroes.push({
      name,
      troopType: textValue(value?.Type || value?.type || 'All') || 'All',
      season: textValue(value?.releaseSeason || value?.season || ''),
    });
  }
  return heroes;
}

function researchCatalogFor(state) {
  const seen = new Set();
  const trees = [];
  for (const value of Array.isArray(state.options.researchTrees)
    ? state.options.researchTrees
    : []) {
    const id = textValue(value?.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    trees.push({ ...value, id, season: textValue(value?.season || 'Other') || 'Other' });
  }
  return trees;
}

function heroTroopLabel(state, troopType) {
  const normalized = comparableLabel(troopType);
  if (normalized === 'cavalry') return state.tr('signup.t9Cavalry', 'Cavalry');
  if (normalized === 'archers') return state.tr('signup.t9Archers', 'Archers');
  if (normalized === 'footmen') return state.tr('signup.t9Footmen', 'Footmen');
  if (normalized === 'all') return state.tr('signup.heroAllTypes', 'All troops');
  return troopType;
}

function renderHeroCatalogStatus(state) {
  const selected = queryAll(state.root, '[name="usableHeroNames"]:checked').length;
  setText(
    query(state.root, '[data-role="hero-selected-count"]'),
    state.tr('signup.usableHeroesSelected', '{count} selected', { count: selected })
  );
  const search = comparableLabel(query(state.root, '[data-role="hero-search"]')?.value);
  const troopType = comparableLabel(query(state.root, '[data-role="hero-troop-filter"]')?.value);
  const season = comparableLabel(query(state.root, '[data-role="hero-season-filter"]')?.value);
  let shown = 0;
  for (const row of queryAll(state.root, '[data-role="hero-option"]')) {
    const matches =
      (!search || comparableLabel(row.dataset.search).includes(search)) &&
      (!troopType || comparableLabel(row.dataset.troopType) === troopType) &&
      (!season || comparableLabel(row.dataset.season) === season);
    row.hidden = !matches;
    if (matches) shown += 1;
  }
  const results = query(state.root, '[data-role="hero-results"]');
  if (shown === 1) {
    setText(results, state.tr('signup.heroResult', '1 hero shown'));
  } else {
    setText(results, state.tr('signup.heroResults', '{count} heroes shown', { count: shown }));
  }
  setHidden(query(state.root, '[data-role="hero-no-results"]'), shown !== 0);
}

function renderHeroCatalog(state) {
  const list = query(state.root, '[data-role="hero-list"]');
  if (!list) return;
  const heroes = heroCatalogFor(state);
  const renderKey = JSON.stringify([
    state.language,
    heroes.map(({ name, troopType, season }) => [name, troopType, season]),
  ]);
  if (state.renderedHeroCatalog !== renderKey) {
    const checked = new Set(
      queryAll(state.root, '[name="usableHeroNames"]:checked').map((input) => input.value)
    );
    const troopFilter = query(state.root, '[data-role="hero-troop-filter"]');
    const seasonFilter = query(state.root, '[data-role="hero-season-filter"]');
    const currentTroop = troopFilter?.value || '';
    const currentSeason = seasonFilter?.value || '';
    const rows = heroes.map((hero) => {
      const row = createElement(state.root, 'label', 'boh-catalog-row');
      row.dataset.role = 'hero-option';
      row.dataset.search = `${hero.name} ${hero.troopType} ${hero.season}`;
      row.dataset.troopType = hero.troopType;
      row.dataset.season = hero.season;
      const input = createElement(state.root, 'input');
      input.type = 'checkbox';
      input.name = 'usableHeroNames';
      input.value = hero.name;
      input.checked = checked.has(hero.name);
      const copy = createElement(state.root, 'span', 'boh-catalog-row__copy');
      const name = createElement(state.root, 'strong', '', hero.name);
      const metadata = createElement(
        state.root,
        'small',
        'boh-catalog-row__meta',
        [hero.season, heroTroopLabel(state, hero.troopType)].filter(Boolean).join(' · ')
      );
      append(copy, name, metadata);
      append(row, input, copy);
      return row;
    });
    replaceChildren(list, ...rows);

    if (troopFilter) {
      const troopTypes = [...new Set(heroes.map((hero) => hero.troopType))];
      const all = createElement(
        state.root,
        'option',
        '',
        state.tr('signup.heroAllTroops', 'All troop types')
      );
      all.value = '';
      const options = troopTypes.map((value) => {
        const option = createElement(state.root, 'option', '', heroTroopLabel(state, value));
        option.value = value;
        return option;
      });
      replaceChildren(troopFilter, all, ...options);
      troopFilter.value = troopTypes.includes(currentTroop) ? currentTroop : '';
    }
    if (seasonFilter) {
      const seasons = [...new Set(heroes.map((hero) => hero.season).filter(Boolean))];
      const all = createElement(
        state.root,
        'option',
        '',
        state.tr('signup.heroAllSeasons', 'All seasons')
      );
      all.value = '';
      const options = seasons.map((value) => {
        const option = createElement(state.root, 'option', '', value);
        option.value = value;
        return option;
      });
      replaceChildren(seasonFilter, all, ...options);
      seasonFilter.value = seasons.includes(currentSeason) ? currentSeason : '';
    }
    state.renderedHeroCatalog = renderKey;
  }
  renderHeroCatalogStatus(state);
}

function researchTreeLabel(state, tree) {
  if (typeof state.options.researchTreeText === 'function') {
    try {
      return textValue(state.options.researchTreeText(tree, 'name', state.language)) || tree.name;
    } catch {
      // Keep the canonical label when a partial locale pack cannot resolve a tree.
    }
  }
  return textValue(tree.name || tree.id);
}

function renderResearchStatus(state) {
  const inputs = queryAll(state.root, '[data-role="research-progress-input"]');
  const entered = inputs.filter((input) => String(input.value ?? '').trim() !== '').length;
  setText(
    query(state.root, '[data-role="research-entered-count"]'),
    state.tr('signup.researchEntered', '{count} of {total} trees entered', {
      count: entered,
      total: inputs.length,
    })
  );
}

function renderResearchCatalog(state) {
  const container = query(state.root, '[data-role="research-groups"]');
  if (!container) return;
  const trees = researchCatalogFor(state);
  const renderKey = JSON.stringify([
    state.language,
    trees.map((tree) => [tree.id, researchTreeLabel(state, tree), tree.season]),
  ]);
  if (state.renderedResearchCatalog !== renderKey) {
    const values = new Map(
      queryAll(state.root, '[data-role="research-progress-input"]').map((input) => [
        input.dataset.treeId,
        input.value,
      ])
    );
    const seasons = new Map();
    for (const tree of trees) {
      if (!seasons.has(tree.season)) seasons.set(tree.season, []);
      seasons.get(tree.season).push(tree);
    }
    const groups = [...seasons.entries()].map(([season, seasonTrees], seasonIndex) => {
      const group = createElement(state.root, 'section', 'boh-research-season');
      const headingId = `bohResearchSeason${seasonIndex}`;
      group.setAttribute('aria-labelledby', headingId);
      const heading = createElement(
        state.root,
        'h5',
        'boh-research-season__heading',
        state.tr('signup.researchSeason', '{season} research', { season })
      );
      heading.id = headingId;
      append(group, heading);
      for (const [treeIndex, tree] of seasonTrees.entries()) {
        const label = researchTreeLabel(state, tree);
        const inputId = `bohResearchProgress${seasonIndex}_${treeIndex}`;
        const row = createElement(state.root, 'div', 'boh-research-row');
        row.dataset.treeId = tree.id;
        const name = createElement(state.root, 'label', 'boh-research-row__name', label);
        name.htmlFor = inputId;
        const input = createElement(state.root, 'input');
        input.id = inputId;
        input.type = 'number';
        input.inputMode = 'numeric';
        input.min = '0';
        input.max = '100';
        input.step = '1';
        input.name = `researchProgressPct.${tree.id}`;
        input.dataset.role = 'research-progress-input';
        input.dataset.treeId = tree.id;
        input.value = values.get(tree.id) ?? '';
        input.setAttribute(
          'aria-label',
          `${label}: ${state.tr('signup.researchPercent', 'Completion percent')}`
        );
        const actions = createElement(state.root, 'div', 'boh-research-quick-actions');
        for (const value of ['25', '50', '75', '100', '']) {
          const buttonLabel =
            value === '100'
              ? state.tr('signup.researchMax', 'Max')
              : value === ''
                ? state.tr('signup.researchClear', 'Clear')
                : `${value}%`;
          const ariaLabel =
            value === '100'
              ? state.tr('signup.researchMaxLabel', 'Set {tree} to 100%', { tree: label })
              : value === ''
                ? state.tr('signup.researchClearLabel', 'Clear {tree}', { tree: label })
                : state.tr('signup.researchQuickSet', 'Set {tree} to {percent}%', {
                    tree: label,
                    percent: value,
                  });
          const button = createElement(state.root, 'button', '', buttonLabel);
          button.type = 'button';
          button.dataset.role = 'research-progress-action';
          button.dataset.treeId = tree.id;
          button.dataset.value = value;
          button.setAttribute('aria-label', ariaLabel);
          append(actions, button);
        }
        append(row, name, input, actions);
        append(group, row);
      }
      return group;
    });
    replaceChildren(container, ...groups);
    state.renderedResearchCatalog = renderKey;
  }
  renderResearchStatus(state);
}

function setFightingTimeError(state, key = '') {
  state.fightingTimeErrorKey = key;
  renderFightingTimes(state);
}

function renderFightingTimes(state) {
  const count = queryAll(state.root, '[name="fightingTimeIds"]:checked').length;
  setText(
    query(state.root, '[data-role="fighting-times-count"]'),
    state.tr('signup.fightingTimesCount', '{count} / 2 selected', { count })
  );
  const error = query(state.root, '[data-role="fighting-times-error"]');
  let message = '';
  if (state.fightingTimeErrorKey === 'signup.fightingTimesRequired') {
    message = state.tr(
      'signup.fightingTimesRequired',
      'Choose exactly two All-Star fighting times.'
    );
  } else if (state.fightingTimeErrorKey === 'signup.fightingTimesLimit') {
    message = state.tr(
      'signup.fightingTimesLimit',
      'Only two fighting times can be selected. Remove one before choosing another.'
    );
  }
  setText(error, message);
  setHidden(error, !message);
  query(state.root, '[data-role="fighting-times-fieldset"]')?.setAttribute?.(
    'aria-invalid',
    String(Boolean(message))
  );
}

function renderSignupPlanningControls(state) {
  renderHeroCatalog(state);
  renderResearchCatalog(state);
  renderFightingTimes(state);
}

function hydrateForm(state) {
  const submission = state.submission;
  const form = query(state.root, '[data-role="signup-form"]');
  if (!submission || !form || state.dirty) return;
  const revision = finiteInteger(submission.revision);
  if (state.hydratedRevision === revision) return;
  updateInput(form, 'gameName', submission.gameName);
  updateInput(form, 'timezone', submission.timezone);
  for (const field of POWER_FIELDS) updateInput(form, field, submission.stats?.[field]);
  updateInput(form, 'level50Heroes', submission.stats?.level50HeroCount);
  updateInput(form, 'rocLevel', submission.stats?.rocLevel);
  updateChecked(
    form,
    't9Types',
    submission.stats?.t9TroopTypes?.length ? submission.stats.t9TroopTypes : ['none']
  );
  updateChecked(form, 'speedHeroes', submission.stats?.readySpeedHeroes || []);
  updateChecked(form, 'usableHeroNames', submission.stats?.usableHeroNames || []);
  const researchProgress = submission.stats?.researchProgressPct || {};
  for (const input of queryAll(form, '[data-role="research-progress-input"]')) {
    input.value = Object.hasOwn(researchProgress, input.dataset.treeId)
      ? researchProgress[input.dataset.treeId]
      : '';
  }
  updateChecked(form, 'availability', submission.commitment?.availability);
  updateChecked(form, 'fightingTimeIds', submission.commitment?.fightingTimeIds || []);
  updateInput(form, 'preferredRole', submission.commitment?.preferredRole || '');
  updateInput(form, 'unavailableTimes', submission.commitment?.unavailableTimes);
  updateInput(form, 'preferredTeammates', (submission.preferredTeammates || []).join('\n'));
  updateChecked(form, 'canTeleport', submission.commitment?.canTeleport ? ['on'] : []);
  updateChecked(form, 'canUseVoice', submission.commitment?.canUseVoice ? ['on'] : []);
  updateChecked(form, 'planCommitment', submission.commitment?.planCommitment ? ['on'] : []);
  updateInput(form, 'playerNotes', submission.commitment?.notes);
  setEntryMethod(state, submission.entryMethod);
  if (submission.entryMethod === 'ocr') {
    const values = { ...submission.stats, gameName: submission.gameName };
    state.ocrReview = {
      ocrValues: Object.freeze({ ...values }),
      confirmedValues: { ...values },
      confidence: {
        overall: submission.ocr?.confidence,
        ...(submission.ocr?.fieldConfidence || {}),
      },
      warnings: [...(submission.ocr?.warnings || [])],
      fieldIssues: {},
      isComplete: true,
      correctionAudit: {
        correctedFields: [],
      },
      requestId: '',
    };
    const confirmed = query(state.root, '[data-role="ocr-values-confirmed"]');
    if (confirmed) confirmed.checked = submission.ocr?.valuesConfirmed === true;
  }
  state.hydratedRevision = revision;
  renderOcr(state);
  renderSignupPlanningControls(state);
}

function renderSubmissionState(state) {
  const label = query(state.root, '[data-role="signup-save-state"]');
  const submit = query(state.root, '[data-role="signup-submit"]');
  setBusy(submit, state.saving || !state.accessGranted);
  if (state.saving) setText(label, state.tr('signup.saving', 'Saving…'));
  else if (state.submission?.status === 'submitted') {
    setText(
      label,
      state.tr('signup.submitted', 'Submitted · revision {revision}', {
        revision: state.submission.revision || 1,
      })
    );
  } else setText(label, state.tr('signup.notSubmitted', 'Not submitted'));
  hydrateForm(state);
  renderSubmissionFeedback(state);
}

function feedbackCopy(state, status, stale) {
  if (stale) {
    return {
      title: state.tr('feedback.correctionResubmittedTitle', 'Signup updated — review pending'),
      description: state.tr(
        'feedback.correctionResubmittedDescription',
        'Your newer submission is waiting for leadership to review again.'
      ),
      tone: 'pending',
    };
  }
  if (status === 'needs_correction') {
    return {
      title: state.tr('feedback.correctionTitle', 'Leadership requested a correction'),
      description: state.tr(
        'feedback.correctionDescription',
        'Update the requested details below and submit again. For a name or identity issue, use your exact in-game name and contact R5.'
      ),
      tone: 'warning',
    };
  }
  if (status === 'confirmed') {
    return {
      title: state.tr('feedback.confirmedTitle', 'Leadership confirmed your signup'),
      description: state.tr(
        'feedback.confirmedDescription',
        'Your confirmed information is ready for team balancing.'
      ),
      tone: 'success',
    };
  }
  if (status === 'excluded') {
    return {
      title: state.tr('feedback.excludedTitle', 'This signup is not in the current pool'),
      description: state.tr(
        'feedback.excludedDescription',
        'Read the leadership note below. Contact R5 if you need help or believe this should be reviewed.'
      ),
      tone: 'warning',
    };
  }
  return {
    title: state.tr('feedback.pendingTitle', 'Leadership review pending'),
    description: state.tr(
      'feedback.pendingDescription',
      'Your latest signup is waiting for leadership review.'
    ),
    tone: 'pending',
  };
}

export function selectBohSubmissionFeedback(submission, feedback) {
  if (!feedback) return null;
  const submissionRevision = finiteInteger(submission?.revision);
  const reviewedSubmissionRevision = finiteInteger(feedback.submissionRevision);
  return {
    ...feedback,
    stale: Boolean(
      submissionRevision &&
      reviewedSubmissionRevision &&
      submissionRevision !== reviewedSubmissionRevision
    ),
  };
}

function renderSubmissionFeedback(state) {
  const region = query(state.root, '[data-role="submission-feedback"]');
  const feedback = selectBohSubmissionFeedback(state.submission, state.submissionFeedback);
  setHidden(region, !feedback);
  if (!region || !feedback) return;
  const copy = feedbackCopy(state, feedback.status, feedback.stale);
  region.dataset.tone = copy.tone;
  setText(
    query(region, '[data-role="submission-feedback-kicker"]'),
    state.tr('feedback.kicker', 'SIGNUP REVIEW')
  );
  setText(query(region, '[data-role="submission-feedback-title"]'), copy.title);
  setText(query(region, '[data-role="submission-feedback-description"]'), copy.description);
  const note = query(region, '[data-role="submission-feedback-note"]');
  const currentNote = feedback.stale ? '' : feedback.note;
  setHidden(note, !currentNote);
  setText(note, currentNote);
  setText(
    query(region, '[data-role="submission-feedback-revision"]'),
    state.tr(
      'feedback.revision',
      'Submission revision {submissionRevision} · review revision {reviewRevision}',
      {
        submissionRevision: feedback.submissionRevision,
        reviewRevision: feedback.reviewRevision,
      }
    )
  );
}

function ocrIssueText(state, field) {
  if (state.ocrInvalidField === field) {
    return state.tr(
      'signup.powerHint',
      'Enter the full values shown in-game. Do not shorten 250,000,000 to 250M.'
    );
  }
  const corrected = state.ocrReview?.correctionAudit?.correctedFields?.includes(field);
  if (corrected)
    return state.tr('signup.ocrIssueCorrected', 'Corrected manually — verify once more.');
  const issues = state.ocrReview?.fieldIssues?.[field] || [];
  return issues
    .map((issue) => {
      if (issue.code === 'missing') {
        return state.tr('signup.ocrIssueMissing', 'Missing — enter this value.');
      }
      if (issue.code === 'low_confidence') {
        return state.tr(
          'signup.ocrIssueLowConfidence',
          'Low OCR confidence — compare this field with the screenshot.'
        );
      }
      if (issue.code === 'missing_confidence') {
        return state.tr(
          'signup.ocrIssueMissingConfidence',
          'OCR confidence unavailable — verify this field carefully.'
        );
      }
      return '';
    })
    .filter(Boolean)
    .join(' ');
}

function renderOcrReviewAlert(state) {
  const alert = query(state.root, '[data-role="ocr-review-alert"]');
  setHidden(alert, !state.ocrReview);
  if (!alert || !state.ocrReview) return;
  const missingCount = POWER_FIELDS.filter(
    (field) => state.ocrReview.confirmedValues?.[field] === null
  ).length;
  const hasIssues = Object.values(state.ocrReview.fieldIssues || {}).some(
    (issues) => Array.isArray(issues) && issues.length
  );
  const warnings = Array.isArray(state.ocrReview.warnings) ? state.ocrReview.warnings : [];
  alert.dataset.tone = missingCount ? 'warning' : hasIssues || warnings.length ? 'review' : 'ready';
  setText(
    query(alert, '[data-role="ocr-review-alert-title"]'),
    state.tr('signup.ocrCheckTitle', 'Check the highlighted OCR fields')
  );
  setText(
    query(alert, '[data-role="ocr-review-alert-description"]'),
    missingCount
      ? state.tr(
          'signup.ocrMissingSummary',
          'OCR missed {count} required field(s). Enter them before confirming.',
          { count: missingCount }
        )
      : state.tr(
          'signup.ocrCheckDescription',
          'Compare every value with the screenshot before confirming the draft.'
        )
  );
  const list = query(alert, '[data-role="ocr-warning-list"]');
  const items = warnings.map((warning) => createElement(state.root, 'li', '', warning));
  replaceChildren(list, ...items);
  setHidden(list, items.length === 0);
}

function renderOcr(state) {
  const preview = query(state.root, '[data-role="ocr-preview"]');
  const previewImage = query(state.root, '[data-role="ocr-preview-image"]');
  const reviewBadge = query(state.root, '[data-role="ocr-review-badge"]');
  const reviewConfirmation = query(state.root, '[data-role="ocr-review-confirmation"]');
  const status = query(state.root, '[data-role="ocr-status"]');
  const process = query(state.root, '[data-role="ocr-process"]');
  setHidden(preview, !state.ocrFile);
  if (previewImage) {
    if (state.ocrPreviewUrl) previewImage.src = state.ocrPreviewUrl;
    else previewImage.removeAttribute?.('src');
  }
  setText(
    query(state.root, '[data-role="ocr-file-name"]'),
    state.ocrFile?.name || state.tr('signup.ocrSelected', 'Screenshot selected')
  );
  setText(
    query(state.root, '[data-role="ocr-file-meta"]'),
    state.ocrFile
      ? `${Math.max(1, Math.round(state.ocrFile.size / 1024))} KB`
      : state.tr('signup.ocrReady', 'Ready to process')
  );
  setHidden(reviewBadge, !state.ocrReview);
  setHidden(reviewConfirmation, !state.ocrReview);
  setBusy(process, state.ocrBusy || !state.ocrFile);
  if (status && state.ocrBusy)
    status.textContent = state.tr('signup.ocrProcessing', 'Reading screenshot…');
  renderOcrReviewAlert(state);
  for (const input of queryAll(state.root, '[data-stat]')) {
    const confidence = state.ocrReview?.confidence?.[input.dataset.stat];
    const field = input.dataset.stat;
    const parent = input.closest?.('.boh-field') || input.parentElement;
    const output = parent?.querySelector?.('[data-role="ocr-field-confidence"]');
    const issue = parent?.querySelector?.('[data-role="ocr-field-issue"]');
    const issueText = state.ocrReview ? ocrIssueText(state, field) : '';
    setText(
      output,
      Number.isFinite(confidence)
        ? state.tr('signup.ocrConfidence', 'OCR confidence: {percent}%', {
            percent: Math.round(confidence * 100),
          })
        : ''
    );
    setText(issue, issueText);
    if (issue?.id) {
      const describedBy = new Set(
        textValue(input.getAttribute?.('aria-describedby')).split(/\s+/u)
      );
      describedBy.delete('');
      describedBy.add(issue.id);
      input.setAttribute?.('aria-describedby', [...describedBy].join(' '));
    }
    const corrected = state.ocrReview?.correctionAudit?.correctedFields?.includes(field);
    const missing =
      state.ocrReview?.confirmedValues?.[field] === null || state.ocrInvalidField === field;
    if (parent?.dataset) {
      if (!state.ocrReview) delete parent.dataset.ocrState;
      else if (missing) parent.dataset.ocrState = 'missing';
      else if (corrected) parent.dataset.ocrState = 'corrected';
      else if (issueText) parent.dataset.ocrState = 'review';
      else parent.dataset.ocrState = 'ready';
    }
    if (missing) input.setAttribute?.('aria-invalid', 'true');
    else input.removeAttribute?.('aria-invalid');
  }
  const confirmation = query(state.root, '[data-role="ocr-values-confirmed"]');
  if (confirmation) {
    confirmation.disabled = Boolean(state.ocrReview && state.ocrReview.isComplete !== true);
    if (confirmation.disabled) confirmation.checked = false;
  }
}

function currentTeam(state) {
  const teamId = state.personalPlan?.teamId;
  return teamId ? state.teams.get(teamId) || null : null;
}

function renderPublicationStates(state) {
  const selected = selectBohPlayerStates({
    accessGranted: state.accessGranted,
    publication: state.publication,
    personalPlan: state.personalPlan,
    team: currentTeam(state),
  });
  const announcementMap = {
    locked: 'announcement-state-locked',
    unpublished: 'announcement-state-unpublished',
    unassigned: 'announcement-state-unassigned',
    assigned: 'announcement-state-assigned',
  };
  const planMap = {
    locked: 'plan-state-locked',
    unpublished: 'plan-state-unpublished',
    unassigned: 'plan-state-unassigned',
    assigned: 'plan-state-published',
  };
  for (const role of Object.values(announcementMap)) {
    setHidden(
      query(state.root, `[data-role="${role}"]`),
      announcementMap[selected.announcement] !== role
    );
  }
  for (const role of Object.values(planMap)) {
    setHidden(query(state.root, `[data-role="${role}"]`), planMap[selected.plan] !== role);
  }
  setText(
    query(state.root, '[data-role="announcement-version"]'),
    publicationFlag(state.publication, 'announcement')
      ? state.tr('status.publishedRevision', 'Published · revision {revision}', {
          revision: state.publication?.revision || 1,
        })
      : state.tr('status.awaitingPublication', 'Awaiting publication')
  );
  setText(
    query(state.root, '[data-role="plan-version"]'),
    publicationFlag(state.publication, 'plan')
      ? state.tr('status.publishedRevision', 'Published · revision {revision}', {
          revision: state.publication?.activePlanRevision || state.publication?.revision || 1,
        })
      : state.tr('status.awaitingPublication', 'Awaiting publication')
  );
  if (selected.announcement === 'assigned') renderTeam(state);
  if (selected.plan === 'assigned') renderPlan(state);
}

function localizedDefaultRole(state, roleId) {
  if (roleId === 'offensive') return state.tr('role.offensive', 'Offensive team');
  if (roleId === 'rune') return state.tr('role.rune', 'Rune team');
  if (roleId === 'top') return state.tr('role.top', 'Top side');
  if (roleId === 'bottom') return state.tr('role.bottom', 'Bottom side');
  if (roleId === 'backup') return state.tr('role.backup', 'Backup / rotating player');
  if (roleId === 'flexible') {
    return state.tr('role.flexible', 'Flexible — place me where needed');
  }
  return '';
}

function displayRoleLabel(state, roleIdInput, labelInput) {
  const roleId = textValue(roleIdInput).toLowerCase();
  const label = textValue(labelInput);
  const localized = localizedDefaultRole(state, roleId);
  if (localized && (!label || isCanonicalLabel(label, DEFAULT_ROLE_LABELS[roleId]))) {
    return localized;
  }
  return label || localized || state.tr('common.role', 'Role');
}

function displayTeamName(state, team, fallbackNumber) {
  const number = finiteInteger(team?.number, finiteInteger(fallbackNumber));
  const label = textValue(team?.name || team?.label);
  if (!label || (number && isCanonicalLabel(label, [`Team ${number}`]))) {
    return state.tr('common.teamNumber', 'Team {number}', { number: number || '—' });
  }
  return label;
}

function localizedDefaultPhase(state, phaseId) {
  if (phaseId === 'phase-0-5') return state.tr('phase.opening', 'Opening');
  if (phaseId === 'phase-5-10') return state.tr('phase.setup', 'Setup');
  if (phaseId === 'phase-10-15') return state.tr('phase.pressure', 'Pressure');
  if (phaseId === 'phase-15-30') return state.tr('phase.endgame', 'Endgame');
  return '';
}

function displayPhaseLabel(state, entry, index) {
  const phaseId = textValue(entry?.phaseId || entry?.id);
  const label = textValue(entry?.phaseLabel || entry?.label);
  const localized = localizedDefaultPhase(state, phaseId);
  if (localized && (!label || isCanonicalLabel(label, DEFAULT_PHASE_LABELS[phaseId]))) {
    return localized;
  }
  return (
    label ||
    localized ||
    state.tr('phase.number', 'Phase {number}', {
      number: index + 1,
    })
  );
}

function displayLegionLabel(state, legion, index) {
  const number = finiteInteger(legion?.order, index + 1);
  const label = textValue(legion?.label || legion?.name);
  if (!label || isCanonicalLabel(label, [`Legion ${number}`])) {
    return state.tr('common.legionNumber', 'Legion {number}', { number });
  }
  return label;
}

function renderRoster(state, target, team) {
  if (!target) return;
  const seats = [...(team?.seats || [])].sort((left, right) => left.seatNumber - right.seatNumber);
  const children = seats.map((seat) => {
    const item = createElement(state.root, 'li');
    item.dataset.seat = String(seat.seatNumber);
    const number = createElement(state.root, 'span', '', seat.seatNumber);
    const name = createElement(
      state.root,
      'strong',
      '',
      seat.displayName || state.tr('announcement.playerPlaceholder', 'Player assignment')
    );
    const role = createElement(
      state.root,
      'small',
      '',
      displayRoleLabel(state, seat.roleGroupId || seat.roleId, seat.roleLabel)
    );
    append(item, number, name, role);
    return item;
  });
  replaceChildren(target, ...children);
}

function renderTeam(state) {
  const plan = state.personalPlan || {};
  const team = currentTeam(state) || {};
  const seat = (team.seats || []).find((entry) => entry.seatNumber === plan.seatNumber);
  const captain = (team.seats || []).find((entry) => entry.playerId === team.captainId);
  setText(
    query(state.root, '[data-role="my-team-number"]'),
    state.tr('common.teamNumber', 'Team {number}', {
      number: plan.teamNumber || team.number || '—',
    })
  );
  setText(
    query(state.root, '[data-role="my-team-name"]'),
    displayTeamName(state, { ...team, name: plan.teamName || team.name }, plan.teamNumber)
  );
  setText(
    query(state.root, '[data-role="my-team-captain"]'),
    captain?.displayName || state.tr('status.toBeAnnounced', 'To be announced')
  );
  setText(query(state.root, '[data-role="my-seat-number"]'), plan.seatNumber || '—');
  setText(
    query(state.root, '[data-role="my-starting-role"]'),
    displayRoleLabel(
      state,
      plan.roleGroupId || plan.roleId || seat?.roleGroupId || seat?.roleId,
      plan.roleLabel || seat?.roleLabel
    )
  );
  renderRoster(state, query(state.root, '[data-role="my-team-roster"]'), team);
  renderTeamOverview(state);
}

function renderTeamOverview(state) {
  const target = query(state.root, '[data-role="team-overview"]');
  if (!target) return;
  const ids = state.publication?.teamIds?.length
    ? state.publication.teamIds
    : Array.from({ length: 6 }, (_, index) => `team-${index + 1}`);
  const buttons = ids.slice(0, 6).map((teamId, index) => {
    const team = state.teams.get(teamId);
    const button = createElement(state.root, 'button', 'boh-team-summary');
    button.type = 'button';
    button.dataset.teamId = teamId;
    button.setAttribute('aria-controls', 'bohTeamOverviewDetail');
    button.setAttribute('aria-expanded', String(teamId === state.selectedTeamId));
    button.classList.toggle('is-mine', teamId === state.personalPlan?.teamId);
    const number = createElement(
      state.root,
      'span',
      'boh-team-summary__number',
      String(team?.number || index + 1).padStart(2, '0')
    );
    const copy = createElement(state.root, 'span');
    append(
      copy,
      createElement(state.root, 'strong', '', displayTeamName(state, team, index + 1)),
      createElement(
        state.root,
        'small',
        '',
        state.tr('announcement.viewRosterHint', '12 players · View roster')
      )
    );
    append(button, number, copy);
    if (teamId === state.personalPlan?.teamId) {
      append(
        button,
        createElement(
          state.root,
          'span',
          'boh-chip boh-chip--success',
          state.tr('announcement.myTeam', 'My team')
        )
      );
    }
    return button;
  });
  replaceChildren(target, ...buttons);
  if (state.selectedTeamId) renderTeamDetail(state, state.selectedTeamId);
}

function renderTeamDetail(state, teamId) {
  const detail = query(state.root, '[data-role="team-overview-detail"]');
  const team = state.teams.get(teamId);
  for (const button of queryAll(state.root, '[data-role="team-overview"] .boh-team-summary')) {
    button.setAttribute('aria-expanded', String(Boolean(team) && button.dataset.teamId === teamId));
  }
  if (!detail || !team) {
    setHidden(detail, true);
    detail?.removeAttribute?.('aria-labelledby');
    return;
  }
  const title = createElement(state.root, 'h5', '', displayTeamName(state, team));
  title.id = 'bohTeamOverviewDetailTitle';
  detail.setAttribute('aria-labelledby', title.id);
  const list = createElement(state.root, 'ol', 'boh-roster-grid');
  renderRoster(state, list, team);
  replaceChildren(detail, title, list);
  detail.hidden = false;
}

function displayInstruction(entry) {
  return {
    action: instructionValue(entry, 'action', 'title', 'summary', 'instruction') || '—',
    target:
      instructionValue(
        entry,
        'target',
        'targetRoute',
        'routeText',
        'objectiveLabel',
        'objectiveId'
      ) || '—',
    loadout: instructionValue(entry, 'loadout', 'troopsHeroes', 'troops', 'heroes') || '—',
    teleport: instructionValue(entry, 'teleport', 'teleportNote') || '—',
    note: instructionValue(entry, 'note', 'leadershipNote'),
  };
}

function phaseTime(state, entry) {
  if (!entry) return '—';
  return state.tr('phase.minuteRange', '{start}–{end} min', {
    start: finiteInteger(entry.startMinute),
    end: finiteInteger(entry.endMinute),
  });
}

function renderNowNext(state, view) {
  const current = displayInstruction(view.current);
  const next = displayInstruction(view.next);
  setText(query(state.root, '[data-role="current-phase-time"]'), phaseTime(state, view.current));
  setText(query(state.root, '[data-role="current-action"]'), current.action);
  setText(query(state.root, '[data-role="current-target"]'), current.target);
  setText(
    query(state.root, '[data-role="current-loadout"]'),
    state.tr('plan.loadoutValue', 'Loadout: {value}', { value: current.loadout })
  );
  setText(
    query(state.root, '[data-role="current-teleport"]'),
    state.tr('plan.teleportValue', 'Teleport: {value}', { value: current.teleport })
  );
  setText(query(state.root, '[data-role="next-phase-time"]'), phaseTime(state, view.next));
  setText(
    query(state.root, '[data-role="next-action"]'),
    view.next ? next.action : state.tr('plan.noNextPhase', 'Final phase')
  );
  setText(
    query(state.root, '[data-role="next-target"]'),
    view.next ? next.target : state.tr('plan.noNextInstruction', 'No later instruction.')
  );
}

function buildPhasePanel(state, entry, index) {
  const display = displayInstruction(entry);
  const heading = createElement(state.root, 'div', 'boh-phase-panel__head');
  const headingCopy = createElement(state.root, 'div');
  append(
    headingCopy,
    createElement(
      state.root,
      'span',
      'boh-phase-number',
      state.tr('phase.numberLabel', 'PHASE {number}', {
        number: String(index + 1).padStart(2, '0'),
      })
    ),
    createElement(
      state.root,
      'h5',
      '',
      `${displayPhaseLabel(state, entry, index)} · ${phaseTime(state, entry)}`
    )
  );
  append(
    heading,
    headingCopy,
    createElement(
      state.root,
      'span',
      'boh-role-pill',
      displayRoleLabel(state, entry?.roleGroupId || entry?.roleId, entry?.roleLabel)
    )
  );
  const list = createElement(state.root, 'dl', 'boh-instruction-list');
  const rows = [
    [state.tr('plan.action', 'Action'), display.action],
    [state.tr('plan.targetRoute', 'Target / route'), display.target],
    [state.tr('plan.troopsHeroes', 'Troops & heroes'), display.loadout],
    [state.tr('plan.teleport', 'Teleport'), display.teleport],
  ];
  for (const [label, value] of rows) {
    const row = createElement(state.root, 'div');
    append(
      row,
      createElement(state.root, 'dt', '', label),
      createElement(state.root, 'dd', '', value)
    );
    append(list, row);
  }
  const note = createElement(state.root, 'aside', 'boh-command-note');
  note.hidden = !display.note;
  append(
    note,
    createElement(state.root, 'strong', '', state.tr('plan.leadershipNote', 'Leadership note')),
    createElement(state.root, 'p', '', display.note)
  );
  return [heading, list, note];
}

function renderTimeline(state, view) {
  const tabs = queryAll(state.root, '[data-role="phase-tabs"] [role="tab"]');
  const panels = queryAll(state.root, '[data-role="phase-panel"]');
  view.timeline.forEach((entry, index) => {
    const tab = tabs[index];
    const panel = panels[index];
    if (!tab || !panel) return;
    const selected = entry.phaseId === view.phaseId;
    tab.dataset.phaseId = entry.phaseId;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    replaceChildren(
      tab,
      createElement(state.root, 'span', '', String(index + 1).padStart(2, '0')),
      createElement(
        state.root,
        'strong',
        '',
        `${finiteInteger(entry.startMinute)}–${finiteInteger(entry.endMinute)}`
      ),
      createElement(state.root, 'small', '', displayPhaseLabel(state, entry, index))
    );
    panel.dataset.phaseId = entry.phaseId;
    panel.hidden = !selected;
    replaceChildren(panel, ...buildPhasePanel(state, entry, index));
  });
  for (let index = view.timeline.length; index < tabs.length; index += 1) {
    tabs[index].hidden = true;
    if (panels[index]) panels[index].hidden = true;
  }
  const summary = query(state.root, '[data-role="phase-summary-list"]');
  const items = view.timeline.map((entry) => {
    const item = createElement(state.root, 'li');
    item.dataset.phaseId = entry.phaseId;
    item.classList.toggle('is-current', entry.phaseId === view.phaseId);
    item.classList.toggle('has-rotation', entry.rotated === true);
    append(
      item,
      createElement(
        state.root,
        'span',
        '',
        `${finiteInteger(entry.startMinute)}–${finiteInteger(entry.endMinute)}`
      ),
      createElement(state.root, 'strong', '', displayInstruction(entry).action),
      createElement(
        state.root,
        'small',
        '',
        entry.rotated
          ? `↻ ${displayRoleLabel(state, entry.roleGroupId || entry.roleId, entry.roleLabel)}`
          : displayRoleLabel(state, entry.roleGroupId || entry.roleId, entry.roleLabel)
      )
    );
    return item;
  });
  replaceChildren(summary, ...items);
}

function renderMapObjectives(state, descriptor) {
  const layer = query(state.root, '[data-role="map-objectives"]');
  if (!layer) return;
  const nodes = (descriptor.nodes || []).map((node) => {
    const group = createSvgElement(state.root, 'g', {
      class: `boh-map__objective${node.isTarget ? ' is-target' : ''}${node.onRoute ? ' is-route' : ''}`,
      transform: `translate(${node.x} ${node.y})`,
      'data-objective-id': node.id,
      'aria-label': node.label,
    });
    const title = createSvgElement(state.root, 'title');
    if (title) title.textContent = node.label;
    const marker = createSvgElement(state.root, 'circle', { cx: 0, cy: 0, r: 23 });
    const code = createSvgElement(state.root, 'text', {
      x: 0,
      y: 6,
      'text-anchor': 'middle',
    });
    if (code) code.textContent = node.code;
    const label = createSvgElement(state.root, 'text', {
      class: 'boh-map__label',
      x: 0,
      y: 38,
      'text-anchor': 'middle',
    });
    if (label) label.textContent = node.label;
    append(group, title, marker, code, label);
    return group;
  });
  replaceChildren(layer, ...nodes);
}

function renderMap(state, entry) {
  const descriptor = buildBohRouteDescriptor(entry, state.personalPlan?.plan, {
    startFallback: state.tr('plan.routeStartFallback', 'Assigned start'),
    viaFallback: state.tr('plan.directRoute', 'Direct route'),
    targetFallback: state.tr('plan.currentTarget', 'Current target'),
  });
  const route = query(state.root, '[data-role="map-route"]');
  route?.setAttribute?.('d', descriptor.path);
  setHidden(route, !descriptor.path);
  renderMapObjectives(state, descriptor);
  setText(query(state.root, '[data-role="route-start"]'), descriptor.start);
  setText(query(state.root, '[data-role="route-via"]'), descriptor.via);
  setText(query(state.root, '[data-role="route-target"]'), descriptor.target);
  const description = query(state.root, '#bohMapSvgDesc');
  setText(
    description,
    state.tr('plan.mapRouteDescription', 'Highlighted personal route: {route}.', {
      route: descriptor.description,
    })
  );
  const svg = query(state.root, '[data-role="personal-map-svg"]');
  svg?.setAttribute?.('aria-label', descriptor.description);
}

function renderLegions(state, view) {
  const legions = state.personalPlan?.plan?.legions || [];
  const inputs = queryAll(state.root, '[name="bohLegion"]');
  inputs.forEach((input, index) => {
    const legion = legions[index];
    if (!legion) {
      input.disabled = true;
      return;
    }
    input.disabled = false;
    input.value = legion.id;
    input.checked = legion.id === view.legionId;
    const label = query(state.root, `label[for="${input.id}"]`);
    setText(label, displayLegionLabel(state, legion, index));
  });
}

function formatUpdatedAt(state, timestamp) {
  const milliseconds = finiteInteger(timestamp);
  if (!milliseconds) return state.tr('status.notAvailable', 'Not available');
  try {
    return new Intl.DateTimeFormat(state.language, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(milliseconds);
  } catch {
    return new Date(milliseconds).toLocaleString();
  }
}

function renderPlan(state) {
  const personal = state.personalPlan || {};
  const team = currentTeam(state);
  if (!team) return;
  let entries = [];
  try {
    entries = projectBohPlayerPlan({
      model: state.model,
      personalPlan: personal,
      team,
      playerId: state.store?.uid,
      legionId: state.selectedLegionId || undefined,
    });
  } catch (error) {
    reportError(state, error, { action: 'project-plan' });
    return;
  }
  const view = selectBohTimelineView(entries, {
    legionId: state.selectedLegionId,
    phaseId: state.selectedPhaseId,
  });
  state.selectedLegionId = view.legionId;
  state.selectedPhaseId = view.phaseId;
  setText(
    query(state.root, '[data-role="plan-team-number"]'),
    state.tr('common.teamNumber', 'Team {number}', {
      number: personal.teamNumber || team.number || '—',
    })
  );
  setText(
    query(state.root, '[data-role="plan-player-name"]'),
    personal.displayName || state.submission?.gameName || '—'
  );
  setText(
    query(state.root, '[data-role="plan-role"]'),
    displayRoleLabel(
      state,
      personal.roleGroupId || personal.roleId || view.timeline[0]?.roleGroupId,
      personal.roleLabel || view.timeline[0]?.roleLabel
    )
  );
  setText(query(state.root, '[data-role="plan-seat"]'), personal.seatNumber || '—');
  setText(
    query(state.root, '[data-role="plan-team-name"]'),
    displayTeamName(state, { ...team, name: personal.teamName || team.name }, personal.teamNumber)
  );
  setHidden(query(state.root, '[data-role="role-rotation-summary"]'), !view.hasRotation);
  setText(
    query(state.root, '[data-role="plan-updated-at"]'),
    formatUpdatedAt(state, personal.updatedAtMs || state.publication?.updatedAtMs)
  );
  renderLegions(state, view);
  renderNowNext(state, view);
  renderTimeline(state, view);
  renderMap(state, view.current);
}

function epicTimeSlotIdsFor(state) {
  const configured =
    state.options.epicTimeSlotIds ??
    state.options.config?.epicTimeSlotIds ??
    state.store?.epicTimeSlotIds ??
    state.model?.BOH_EPIC_SHOWDOWN_DEFAULT_TIME_SLOT_IDS;
  return normalizeEpicTimeSlotIds(configured);
}

function renderEpicTimeOptions(state, timeSlotIds) {
  const target = query(state.root, '[data-role="showdown-time-options"]');
  if (!target) return;
  const optionsKey = JSON.stringify(timeSlotIds);
  if (state.renderedEpicTimeOptions !== optionsKey) {
    const selected = new Set(
      queryAll(target, '[name="epicTimePreferences"]:checked').map((input) => input.value)
    );
    const labels = timeSlotIds.map((timeSlotId) => {
      const label = createElement(state.root, 'label', 'boh-check-card boh-showdown-option');
      const input = createElement(state.root, 'input');
      const text = createElement(state.root, 'span');
      if (!label || !input || !text) return null;
      input.type = 'checkbox';
      input.name = 'epicTimePreferences';
      input.value = timeSlotId;
      input.checked = selected.has(timeSlotId);
      label.dataset.timeSlotId = timeSlotId;
      append(label, input, text);
      return label;
    });
    replaceChildren(target, ...labels);
    state.renderedEpicTimeOptions = optionsKey;
    if (!state.epicDirty) state.epicHydratedRevision = null;
  }
  for (const label of queryAll(target, '[data-time-slot-id]')) {
    setText(
      query(label, 'span'),
      state.tr('showdown.timeOption', 'Game time {time}', { time: label.dataset.timeSlotId })
    );
  }
  setHidden(query(state.root, '[data-role="showdown-no-times"]'), timeSlotIds.length > 0);
}

function hydrateEpicPreferences(state) {
  const form = query(state.root, '[data-role="showdown-form"]');
  if (!form || state.epicDirty) return;
  const revision = state.epicPreferences ? finiteInteger(state.epicPreferences.revision) : -1;
  const gameName = state.epicPreferences?.gameName || state.submission?.gameName || '';
  const hydrationKey = `${revision}:${gameName}`;
  if (state.epicHydratedRevision === hydrationKey) return;
  updateInput(form, 'epicGameName', gameName);
  updateChecked(form, 'epicLanePreferences', state.epicPreferences?.lanePreferences || []);
  updateChecked(form, 'epicTimePreferences', state.epicPreferences?.timePreferences || []);
  state.epicHydratedRevision = hydrationKey;
}

function renderEpicSummary(state) {
  const form = query(state.root, '[data-role="showdown-form"]');
  const summary = query(state.root, '[data-role="showdown-summary"]');
  if (!form || !summary) return;
  const lanes = queryAll(form, '[name="epicLanePreferences"]:checked').length;
  const times = queryAll(form, '[name="epicTimePreferences"]:checked').length;
  setText(
    summary,
    lanes || times
      ? state.tr('showdown.summary', '{lanes} positions · {times} game times selected.', {
          lanes,
          times,
        })
      : state.tr('showdown.summaryNone', 'No preferences selected yet.')
  );
}

function renderEpicPreferences(state) {
  const locked = query(state.root, '[data-role="showdown-state-locked"]');
  const form = query(state.root, '[data-role="showdown-form"]');
  const saveState = query(state.root, '[data-role="showdown-save-state"]');
  const submit = query(state.root, '[data-role="showdown-submit"]');
  setHidden(locked, state.accessGranted);
  setHidden(form, !state.accessGranted);
  const timeSlotIds = epicTimeSlotIdsFor(state);
  renderEpicTimeOptions(state, timeSlotIds);
  hydrateEpicPreferences(state);
  renderEpicSummary(state);
  setBusy(
    submit,
    state.epicSaving ||
      !state.accessGranted ||
      typeof state.store?.saveEpicShowdownPreferences !== 'function'
  );
  if (state.epicSaving) setText(saveState, state.tr('showdown.saving', 'Saving…'));
  else if (state.epicPreferences) {
    setText(
      saveState,
      state.tr('showdown.saved', 'Saved · revision {revision}', {
        revision: state.epicPreferences.revision || 1,
      })
    );
  } else setText(saveState, state.tr('showdown.notSaved', 'Not saved'));
}

function render(state) {
  if (state.destroyed) return;
  activateSection(state, state.section);
  setEntryMethod(state, state.entryMethod);
  renderSignupPlanningControls(state);
  renderSubmissionState(state);
  renderPublicationStates(state);
  renderEpicPreferences(state);
  const statusLabel = query(state.root, '[data-role="event-status-label"]');
  setText(
    statusLabel,
    state.publication?.eventName ||
      state.publication?.title ||
      state.tr('status.preparing', 'Preparing this season')
  );
}

function revokePreview(state) {
  if (!state.ocrPreviewUrl) return;
  ownerWindow(state.root)?.URL?.revokeObjectURL?.(state.ocrPreviewUrl);
  state.ocrPreviewUrl = '';
}

function clearOcrFile(state) {
  revokePreview(state);
  state.ocrFile = null;
  state.ocrReview = null;
  state.ocrInvalidField = '';
  const input = query(state.root, '[data-role="ocr-file-input"]');
  if (input) input.value = '';
  const confirmation = query(state.root, '[data-role="ocr-values-confirmed"]');
  if (confirmation) confirmation.checked = false;
  const status = query(state.root, '[data-role="ocr-status"]');
  setText(status, '');
  renderOcr(state);
}

function selectOcrFile(state, files) {
  const select = state.ocr.getSingleBohStatsScreenshot || ((input) => Array.from(input || [])[0]);
  const file = select(files);
  revokePreview(state);
  state.ocrFile = file;
  state.ocrReview = null;
  state.ocrInvalidField = '';
  state.ocrPreviewUrl = ownerWindow(state.root)?.URL?.createObjectURL?.(file) || '';
  renderOcr(state);
}

async function processOcr(state) {
  const consent = query(state.root, '[data-role="ocr-consent"]');
  if (!state.ocrFile)
    throw new TypeError(state.tr('signup.ocrFileRequired', 'Choose one screenshot first.'));
  if (!consent?.checked)
    throw new TypeError(
      state.tr('signup.ocrConsentRequired', 'Confirm the OCR processing notice first.')
    );
  const prepare = state.ocr.prepareBohStatsScreenshot || state.ocr.prepareScreenshot;
  const buildRequest = state.ocr.buildBohStatsOcrRequest || ((value) => value);
  const transport =
    state.ocr.process || state.ocr.recognize || state.ocr.extractStats || state.ocr.request;
  const buildReview = state.ocr.buildBohStatsReviewModel;
  if (
    typeof prepare !== 'function' ||
    typeof transport !== 'function' ||
    typeof buildReview !== 'function'
  ) {
    throw new TypeError('Stats OCR service is not available.');
  }
  state.ocrBusy = true;
  renderOcr(state);
  try {
    const prepared = await prepare(state.ocrFile);
    const request = buildRequest({
      seasonId: state.store?.seasonId || state.options.seasonId,
      imageData: prepared.imageData,
    });
    const response = await transport(request);
    const review = buildReview(response?.result || response);
    state.ocrReview = review;
    state.ocrInvalidField = '';
    const values = review.confirmedValues || review.ocrValues || {};
    const form = query(state.root, '[data-role="signup-form"]');
    for (const field of POWER_FIELDS) updateInput(form, field, values[field] ?? '');
    if (values.gameName) updateInput(form, 'gameName', values.gameName);
    const confirmed = query(state.root, '[data-role="ocr-values-confirmed"]');
    if (confirmed) confirmed.checked = false;
    setText(
      query(state.root, '[data-role="ocr-status"]'),
      state.tr('signup.ocrReviewReady', 'OCR draft ready. Review every value before submitting.')
    );
  } finally {
    state.ocrBusy = false;
    renderOcr(state);
  }
}

function syncOcrReviewFromForm(state) {
  if (state.entryMethod !== 'ocr' || !state.ocrReview) return;
  const form = query(state.root, '[data-role="signup-form"]');
  const apply = state.ocr.applyBohStatsReviewCorrections;
  if (!form || typeof apply !== 'function') return;
  const edits = Object.fromEntries(
    [...POWER_FIELDS, 'gameName'].map((field) => [field, query(form, `[name="${field}"]`)?.value])
  );
  try {
    state.ocrReview = apply(state.ocrReview, edits);
    state.ocrInvalidField = '';
  } catch (error) {
    state.ocrReview = { ...state.ocrReview, isComplete: false };
    state.ocrInvalidField = textValue(error?.field);
  }
  const confirmation = query(state.root, '[data-role="ocr-values-confirmed"]');
  if (confirmation) confirmation.checked = false;
  renderOcr(state);
}

function formDataFor(form) {
  const FormDataConstructor = ownerWindow(form)?.FormData || globalThis.FormData;
  if (typeof FormDataConstructor !== 'function')
    throw new TypeError('This browser cannot collect the signup form.');
  return new FormDataConstructor(form);
}

function focusErrorField(state, field) {
  const selectors = {
    ocrValuesConfirmed: '[data-role="ocr-values-confirmed"]',
    t9Types: '[name="t9Types"]',
    fightingTimeIds: '[name="fightingTimeIds"]',
  };
  query(state.root, selectors[field] || `[name="${field}"]`)?.focus?.();
}

async function submitSignup(state, form) {
  if (!state.store?.saveSubmission)
    throw new TypeError('Member access is required before submitting.');
  if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;
  let data = formDataFor(form);
  if (state.entryMethod === 'ocr' && state.ocrReview) {
    const corrections = Object.fromEntries(
      POWER_FIELDS.map((field) => [field, formValue(data, field)]).concat([
        ['gameName', formValue(data, 'gameName')],
      ])
    );
    const apply = state.ocr.applyBohStatsReviewCorrections;
    if (typeof apply === 'function') state.ocrReview = apply(state.ocrReview, corrections);
  }
  let payload;
  try {
    payload = buildBohSubmissionPayload(data, {
      entryMethod: state.entryMethod,
      ocrReview: state.ocrReview,
      ocrValuesConfirmed: query(state.root, '[data-role="ocr-values-confirmed"]')?.checked === true,
      language: state.language,
      model: state.model,
      knownNames: state.submission?.knownNames,
      heroNames: heroCatalogFor(state).map((hero) => hero.name),
      researchTreeIds: researchCatalogFor(state).map((tree) => tree.id),
    });
    setFightingTimeError(state);
  } catch (error) {
    if (error?.i18nKey === 'signup.fightingTimesRequired') {
      setFightingTimeError(state, 'signup.fightingTimesRequired');
      error.message = state.tr(
        'signup.fightingTimesRequired',
        'Choose exactly two All-Star fighting times.'
      );
    }
    reportError(state, error, { action: 'save-submission' });
    focusErrorField(state, error?.field);
    return;
  }
  state.saving = true;
  clearNotice(state);
  renderSubmissionState(state);
  try {
    const expectedRevision = Number.isInteger(state.submissionEditBaseRevision)
      ? Math.max(0, state.submissionEditBaseRevision)
      : finiteInteger(state.submission?.revision);
    const saved = await state.store.saveSubmission(payload, { expectedRevision });
    if (saved) state.submission = saved;
    state.dirty = false;
    state.hydratedRevision = null;
    state.submissionEditBaseRevision = null;
    notice(state, 'signup.savedNotice', 'Your stats were submitted successfully.', {
      tone: 'success',
    });
  } catch (error) {
    if (/conflict/iu.test(error?.name || '') || Number.isInteger(error?.actualRevision)) {
      const latest = await state.store.getSubmission?.().catch(() => undefined);
      if (latest === undefined) {
        reportError(state, error, { action: 'reload-submission' });
      } else {
        state.submission = latest;
        state.dirty = false;
        state.hydratedRevision = null;
        state.submissionEditBaseRevision = null;
        notice(
          state,
          'signup.revisionConflict',
          'Your saved signup changed in another session. Review this form and submit again.',
          { tone: 'warning' }
        );
      }
    } else {
      reportError(state, error, { action: 'save-submission' });
      focusErrorField(state, error?.field);
    }
  } finally {
    state.saving = false;
    render(state);
    data = null;
  }
}

async function submitEpicPreferences(state, form) {
  if (typeof state.store?.saveEpicShowdownPreferences !== 'function') {
    throw new TypeError('Member access is required before saving Epic Showdown preferences.');
  }
  if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;
  const payload = buildBohEpicPreferencesPayload(formDataFor(form), {
    model: state.model,
    timeSlotIds: epicTimeSlotIdsFor(state),
  });
  state.epicSaving = true;
  clearNotice(state);
  renderEpicPreferences(state);
  try {
    const expectedRevision = resolveBohEpicExpectedRevision(
      state.epicPreferences,
      state.epicEditBaseRevision
    );
    const saved = await state.store.saveEpicShowdownPreferences(payload, { expectedRevision });
    if (saved) state.epicPreferences = saved;
    state.epicDirty = false;
    state.epicHydratedRevision = null;
    state.epicEditBaseRevision = null;
    notice(state, 'showdown.savedNotice', 'Your Epic Showdown preferences were saved.', {
      tone: 'success',
    });
  } catch (error) {
    if (/conflict/iu.test(error?.name || '') || Number.isInteger(error?.actualRevision)) {
      const latest = await state.store.getEpicShowdownPreferences?.().catch(() => undefined);
      if (latest === undefined) {
        reportError(state, error, { action: 'reload-epic-preferences' });
      } else {
        state.epicPreferences = latest;
        state.epicDirty = false;
        state.epicHydratedRevision = null;
        state.epicEditBaseRevision = null;
        notice(
          state,
          'showdown.revisionConflict',
          'Latest saved choices loaded—review and change them before saving.',
          { tone: 'warning' }
        );
      }
    } else {
      if (error?.i18nKey === 'showdown.laneRequired') {
        notice(
          state,
          'showdown.laneRequired',
          'Choose at least one position: South, Center, or North.',
          { tone: 'error' }
        );
      } else if (error?.i18nKey === 'showdown.timeRequired') {
        notice(state, 'showdown.timeRequired', 'Choose at least one available game time.', {
          tone: 'error',
        });
      } else {
        reportError(state, error, { action: 'save-epic-preferences' });
      }
      focusErrorField(state, error?.field);
    }
  } finally {
    state.epicSaving = false;
    renderEpicPreferences(state);
  }
}

function tabKeyMove(state, event, tabs, activeIndex, activate) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return false;
  event.preventDefault();
  const direction =
    ownerWindow(state.root)?.getComputedStyle?.(state.root)?.direction === 'rtl' ? -1 : 1;
  let index = activeIndex;
  if (event.key === 'Home') index = 0;
  if (event.key === 'End') index = tabs.length - 1;
  if (event.key === 'ArrowRight') index = (activeIndex + direction + tabs.length) % tabs.length;
  if (event.key === 'ArrowLeft') index = (activeIndex - direction + tabs.length) % tabs.length;
  activate(tabs[index]);
  tabs[index]?.focus?.();
  return true;
}

function handleKeydown(state, event) {
  const sectionTab = event.target?.closest?.('[data-role="section-tab"]');
  if (sectionTab) {
    const tabs = queryAll(state.root, '[data-role="section-tab"]');
    tabKeyMove(state, event, tabs, tabs.indexOf(sectionTab), (tab) =>
      activateSection(state, tab.dataset.section)
    );
    return;
  }
  const phaseTab = event.target?.closest?.('[data-role="phase-tabs"] [role="tab"]');
  if (phaseTab) {
    const tabs = queryAll(state.root, '[data-role="phase-tabs"] [role="tab"]:not([hidden])');
    tabKeyMove(state, event, tabs, tabs.indexOf(phaseTab), (tab) => {
      state.selectedPhaseId = tab.dataset.phaseId;
      renderPlan(state);
    });
  }
}

async function handleClick(state, event) {
  const target = event.target?.closest?.('button, [role="tab"]');
  if (!target || (state.root.contains && !state.root.contains(target))) return;
  if (target.matches?.('[data-role="research-progress-action"]')) {
    const input = queryAll(state.root, '[data-role="research-progress-input"]').find(
      (control) => control.dataset.treeId === target.dataset.treeId
    );
    if (input) {
      input.value = target.dataset.value ?? '';
      markSubmissionDirty(state);
      renderResearchStatus(state);
      input.focus?.();
    }
    return;
  }
  if (target.matches?.('[data-role="section-tab"]')) {
    activateSection(state, target.dataset.section);
    return;
  }
  if (target.matches?.('[data-role="unlock-request"]')) {
    state.options.onNotice?.(state.tr('access.enterPin', 'Enter member PIN'), {
      action: 'unlock-request',
    });
    return;
  }
  if (target.matches?.('[data-role="open-my-plan"]')) {
    activateSection(state, 'plan', true);
    return;
  }
  if (target.matches?.('[data-role="announcement-help"]')) {
    activateSection(state, 'signup', true);
    return;
  }
  if (target.matches?.('[data-role="ocr-remove"]')) {
    clearOcrFile(state);
    return;
  }
  if (target.matches?.('[data-role="ocr-process"]')) {
    try {
      await processOcr(state);
    } catch (error) {
      reportError(state, error, { action: 'process-ocr' });
    }
    return;
  }
  if (target.matches?.('.boh-team-summary')) {
    state.selectedTeamId = target.dataset.teamId;
    renderTeamDetail(state, state.selectedTeamId);
    return;
  }
  if (target.matches?.('[data-role="phase-tabs"] [role="tab"]')) {
    state.selectedPhaseId = target.dataset.phaseId;
    renderPlan(state);
  }
}

function handleChange(state, event) {
  const target = event.target;
  if (!target) return;
  if (target.matches?.('[data-role="hero-troop-filter"], [data-role="hero-season-filter"]')) {
    renderHeroCatalogStatus(state);
    return;
  }
  if (target.matches?.('[name="fightingTimeIds"]')) {
    const count = queryAll(state.root, '[name="fightingTimeIds"]:checked').length;
    if (target.checked && count > 2) {
      target.checked = false;
      setFightingTimeError(state, 'signup.fightingTimesLimit');
      target.focus?.();
      return;
    }
    setFightingTimeError(state);
  }
  if (target.matches?.('[data-role="entry-method"]')) {
    setEntryMethod(state, target.value);
  } else if (target.matches?.('[data-role="ocr-file-input"]')) {
    try {
      selectOcrFile(state, target.files);
    } catch (error) {
      clearOcrFile(state);
      reportError(state, error, { action: 'select-ocr-file' });
    }
  } else if (target.matches?.('[data-role="t9-none"]') && target.checked) {
    for (const input of queryAll(state.root, '[name="t9Types"]')) {
      if (input !== target) input.checked = false;
    }
  } else if (target.matches?.('[name="t9Types"]:not([data-role="t9-none"])') && target.checked) {
    const none = query(state.root, '[data-role="t9-none"]');
    if (none) none.checked = false;
  } else if (target.matches?.('[name="bohLegion"]')) {
    state.selectedLegionId = target.value;
    renderPlan(state);
  }
  if (target.matches?.('[name="usableHeroNames"]')) renderHeroCatalogStatus(state);
  if (target.matches?.('[data-role="research-progress-input"]')) renderResearchStatus(state);
  if (target.closest?.('[data-role="signup-form"]')) markSubmissionDirty(state);
  if (target.closest?.('[data-role="showdown-form"]')) {
    markEpicDirty(state);
    renderEpicSummary(state);
  }
}

function markSubmissionDirty(state) {
  if (!state.dirty) {
    state.submissionEditBaseRevision = finiteInteger(state.submission?.revision);
  }
  state.dirty = true;
}

function markEpicDirty(state) {
  if (!state.epicDirty) {
    state.epicEditBaseRevision = finiteInteger(state.epicPreferences?.revision);
  }
  state.epicDirty = true;
}

function handleSubmit(state, event) {
  const signupForm = event.target?.closest?.('[data-role="signup-form"]');
  const showdownForm = event.target?.closest?.('[data-role="showdown-form"]');
  if (!signupForm && !showdownForm) return;
  event.preventDefault();
  const action = signupForm
    ? submitSignup(state, signupForm)
    : submitEpicPreferences(state, showdownForm);
  action.catch((error) => reportError(state, error, { action: 'submit' }));
}

function bindEvents(state) {
  const signal = state.eventsAbort.signal;
  state.root.addEventListener?.('click', (event) => void handleClick(state, event), { signal });
  state.root.addEventListener?.('change', (event) => handleChange(state, event), { signal });
  state.root.addEventListener?.(
    'input',
    (event) => {
      if (event.target?.matches?.('[data-role="hero-search"]')) {
        renderHeroCatalogStatus(state);
        return;
      }
      if (event.target?.matches?.('[data-role="research-progress-input"]')) {
        renderResearchStatus(state);
      }
      if (event.target?.closest?.('[data-role="signup-form"]')) markSubmissionDirty(state);
      if (event.target?.closest?.('[data-role="showdown-form"]')) markEpicDirty(state);
      if (event.target?.matches?.('[data-stat]')) syncOcrReviewFromForm(state);
    },
    { signal }
  );
  state.root.addEventListener?.('submit', (event) => handleSubmit(state, event), { signal });
  state.root.addEventListener?.('keydown', (event) => handleKeydown(state, event), { signal });
  ownerWindow(state.root)?.addEventListener?.(
    'vts:language-change',
    (event) => {
      const detail = event.detail || {};
      setLanguage(
        state,
        detail.language || detail.locale || detail.languageCode || detail.lang,
        detail.text
      );
    },
    { signal }
  );
}

function unsubscribeAll(state) {
  for (const unsubscribe of state.subscriptions.splice(0)) unsubscribe?.();
  for (const unsubscribe of state.teamSubscriptions.values()) unsubscribe?.();
  state.teamSubscriptions.clear();
}

function subscriptionError(state, source) {
  return (error) => reportError(state, error, { action: 'subscribe', source });
}

function reconcileTeamSubscriptions(state) {
  if (!state.store) return;
  const ids = new Set(state.publication?.teamIds || []);
  if (state.personalPlan?.teamId) ids.add(state.personalPlan.teamId);
  for (const [teamId, unsubscribe] of state.teamSubscriptions) {
    if (ids.has(teamId)) continue;
    unsubscribe?.();
    state.teamSubscriptions.delete(teamId);
    state.teams.delete(teamId);
  }
  for (const teamId of ids) {
    if (state.teamSubscriptions.has(teamId)) continue;
    const update = (team) => {
      if (state.destroyed) return;
      if (team) state.teams.set(teamId, { ...team, teamId });
      else state.teams.delete(teamId);
      renderPublicationStates(state);
    };
    if (typeof state.store.subscribePublishedTeam === 'function') {
      const unsubscribe = state.store.subscribePublishedTeam(
        teamId,
        update,
        subscriptionError(state, `team:${teamId}`)
      );
      state.teamSubscriptions.set(teamId, unsubscribe || (() => {}));
    } else if (typeof state.store.getPublishedTeam === 'function') {
      state.teamSubscriptions.set(teamId, () => {});
      Promise.resolve(state.store.getPublishedTeam(teamId))
        .then(update)
        .catch(subscriptionError(state, `team:${teamId}`));
    }
  }
}

function subscribe(state, method, update, source) {
  if (typeof state.store?.[method] !== 'function') return;
  const unsubscribe = state.store[method](
    (value) => {
      if (!state.destroyed) update(value);
    },
    subscriptionError(state, source)
  );
  if (typeof unsubscribe === 'function') state.subscriptions.push(unsubscribe);
}

function startSubscriptions(state) {
  if (!state.store || !state.accessGranted) return;
  subscribe(
    state,
    'subscribeSubmission',
    (value) => {
      state.submission = value;
      renderSubmissionState(state);
    },
    'submission'
  );
  subscribe(
    state,
    'subscribeSubmissionFeedback',
    (value) => {
      state.submissionFeedback = value;
      renderSubmissionFeedback(state);
    },
    'submission-feedback'
  );
  subscribe(
    state,
    'subscribeEpicShowdownPreferences',
    (value) => {
      state.epicPreferences = value;
      renderEpicPreferences(state);
    },
    'epic-showdown-preferences'
  );
  subscribe(
    state,
    'subscribePublication',
    (value) => {
      state.publication = value;
      reconcileTeamSubscriptions(state);
      renderPublicationStates(state);
    },
    'publication'
  );
  subscribe(
    state,
    'subscribePersonalPlan',
    (value) => {
      state.personalPlan = value;
      reconcileTeamSubscriptions(state);
      renderPublicationStates(state);
    },
    'personal-plan'
  );
}

async function refreshState(state, snapshot) {
  if (snapshot && typeof snapshot === 'object') {
    if ('store' in snapshot && snapshot.store !== state.store) {
      unsubscribeAll(state);
      state.store?.stop?.();
      state.store = snapshot.store || null;
      state.accessGranted = Boolean(state.store && state.store.accessGranted !== false);
      state.renderedEpicTimeOptions = '';
      state.epicHydratedRevision = null;
      state.epicEditBaseRevision = null;
      startSubscriptions(state);
    } else if ('accessGranted' in snapshot) {
      state.accessGranted = snapshot.accessGranted === true && Boolean(state.store);
    }
    if ('submission' in snapshot) state.submission = snapshot.submission;
    if ('submissionFeedback' in snapshot) state.submissionFeedback = snapshot.submissionFeedback;
    if ('epicPreferences' in snapshot) state.epicPreferences = snapshot.epicPreferences;
    if ('publication' in snapshot) state.publication = snapshot.publication;
    if ('personalPlan' in snapshot) state.personalPlan = snapshot.personalPlan;
    if (snapshot.teams) {
      const entries =
        snapshot.teams instanceof Map ? snapshot.teams : Object.entries(snapshot.teams);
      state.teams = new Map(entries);
    }
    reconcileTeamSubscriptions(state);
    render(state);
    return;
  }
  if (!state.store || !state.accessGranted) {
    render(state);
    return;
  }
  const [submission, submissionFeedback, epicPreferences, publication, personalPlan] =
    await Promise.all([
      state.store.getSubmission?.(),
      state.store.getSubmissionFeedback?.(),
      state.store.getEpicShowdownPreferences?.(),
      state.store.getPublication?.(),
      state.store.getPersonalPlan?.(),
    ]);
  if (submission !== undefined) state.submission = submission;
  if (submissionFeedback !== undefined) state.submissionFeedback = submissionFeedback;
  if (epicPreferences !== undefined) state.epicPreferences = epicPreferences;
  if (publication !== undefined) state.publication = publication;
  if (personalPlan !== undefined) state.personalPlan = personalPlan;
  reconcileTeamSubscriptions(state);
  render(state);
}

function setLanguage(state, language, text) {
  if (text !== undefined) state.textSource = text;
  if (language) state.language = textValue(language) || state.language;
  state.tr = makeTranslator(state.textSource, state.language);
  render(state);
}

/**
 * Mounts the player-facing All-Star hub. Authentication and persistence are
 * injected; this controller only coordinates the existing DOM and contracts.
 */
export function initializeAllStarBoh(options = {}) {
  const root = options.root;
  if (!root || typeof root.addEventListener !== 'function') {
    throw new TypeError('All-Star BoH player root is required.');
  }
  const existing = controllers.get(root);
  if (existing) return existing;
  const state = initialState(options);
  bindEvents(state);
  startSubscriptions(state);
  render(state);
  refreshState(state).catch((error) => reportError(state, error, { action: 'refresh' }));

  const lifecycle = Object.freeze({
    destroy() {
      if (state.destroyed) return;
      state.destroyed = true;
      state.eventsAbort.abort();
      unsubscribeAll(state);
      revokePreview(state);
      state.store?.stop?.();
      controllers.delete(root);
    },
    setLanguage(language, text) {
      if (language && typeof language === 'object') {
        setLanguage(state, language.language || language.locale, language.text);
      } else setLanguage(state, language, text);
      return lifecycle;
    },
    async refresh(snapshot) {
      await refreshState(state, snapshot);
      return lifecycle;
    },
  });
  controllers.set(root, lifecycle);
  return lifecycle;
}

export const initAllStarBoh = initializeAllStarBoh;
