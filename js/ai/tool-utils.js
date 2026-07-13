import { isPlainObject } from './contracts.js';

export class AiToolInputError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = 'AiToolInputError';
    this.code = code;
    this.options = options;
  }
}

export function requirePlainArguments(value) {
  if (value === undefined || value === null) return {};
  if (!isPlainObject(value)) {
    throw new AiToolInputError('malformed_arguments', 'Tool arguments must be an object.');
  }
  return value;
}

export function rejectUnknownArguments(value, allowedKeys) {
  const unknown = Object.keys(value).filter((key) => !allowedKeys.includes(key));
  if (unknown.length) {
    throw new AiToolInputError(
      'malformed_arguments',
      `Unsupported argument${unknown.length === 1 ? '' : 's'}: ${unknown.slice(0, 3).join(', ')}.`
    );
  }
}

export function boundedString(value, field, options = {}) {
  const text = typeof value === 'string' ? value.trim() : '';
  const minimum = options.minimum ?? 1;
  const maximum = options.maximum ?? 80;
  if (text.length < minimum || text.length > maximum) {
    throw new AiToolInputError(
      'malformed_arguments',
      `${field} must contain ${minimum}-${maximum} characters.`
    );
  }
  return text;
}

export function boundedStringArray(value, field, options = {}) {
  const minimum = options.minimum ?? 1;
  const maximum = options.maximum ?? 12;
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    throw new AiToolInputError(
      'malformed_arguments',
      `${field} must contain ${minimum}-${maximum} values.`
    );
  }
  return [...new Set(value.map((item) => boundedString(item, field, options.item || {})))];
}

export function boundedInteger(value, field, options = {}) {
  const minimum = options.minimum ?? 0;
  const maximum = options.maximum ?? Number.MAX_SAFE_INTEGER;
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new AiToolInputError(
      'malformed_arguments',
      `${field} must be an integer from ${minimum} to ${maximum}.`
    );
  }
  return number;
}

export function finiteNonNegative(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new AiToolInputError('malformed_arguments', `${field} must be a non-negative number.`);
  }
  return number;
}

export function normalizeLookupToken(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const HERO_ALIASES = Object.freeze({
  arthur: 'King Arthur',
  'king arthur': 'King Arthur',
  cleo: 'Cleopatra VII',
  cleopatra: 'Cleopatra VII',
  'cleopatra 7': 'Cleopatra VII',
  ramses: 'Ramses II',
  'ramses 2': 'Ramses II',
  charles: 'Charles the Great',
  'charles great': 'Charles the Great',
  elk: 'ELK',
  avalanche: 'The Avalanche',
  heroine: 'The Heroine',
  boneless: 'The Boneless',
});

export function createHeroResolver(heroes) {
  const byToken = new Map();
  for (const hero of heroes || []) byToken.set(normalizeLookupToken(hero?.name), hero?.name);
  for (const [alias, canonical] of Object.entries(HERO_ALIASES)) {
    if (byToken.has(normalizeLookupToken(canonical))) byToken.set(alias, canonical);
  }
  return (value) => byToken.get(normalizeLookupToken(value)) || null;
}

export function orderedFormation(heroes) {
  const list = Array.isArray(heroes) ? heroes.slice(0, 3) : [];
  return {
    heroes: list,
    positions: {
      Front: list[0] || null,
      Middle: list[1] || null,
      Back: list[2] || null,
    },
  };
}

export function setupRequiredData(category, action) {
  return {
    setupRequired: true,
    missingCategory: category,
    setupAction: { id: action.id, hash: action.hash },
  };
}

export function boolArgument(value, fallback = false) {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') {
    throw new AiToolInputError('malformed_arguments', 'Boolean argument expected.');
  }
  return value;
}
