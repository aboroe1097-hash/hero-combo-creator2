export const ACCOUNT_PROFILE_LIMITS = Object.freeze({
  displayName: 50,
  gameName: 50,
  alliance: 50,
  bio: 280,
});

function cleanText(value) {
  return String(value ?? '').trim();
}

function assertLength(name, value, minimum, maximum) {
  if (value.length < minimum || value.length > maximum) {
    throw new RangeError(`${name} must be between ${minimum} and ${maximum} characters.`);
  }
}

export function normalizeAccountProfile(input = {}) {
  const displayName = cleanText(input.displayName);
  const gameName = cleanText(input.gameName);
  const alliance = cleanText(input.alliance);
  const countryCode = cleanText(input.countryCode).toUpperCase();
  const bio = cleanText(input.bio);

  assertLength('Display name', displayName, 1, ACCOUNT_PROFILE_LIMITS.displayName);
  assertLength('Game name', gameName, 0, ACCOUNT_PROFILE_LIMITS.gameName);
  assertLength('Alliance', alliance, 0, ACCOUNT_PROFILE_LIMITS.alliance);
  assertLength('Bio', bio, 0, ACCOUNT_PROFILE_LIMITS.bio);
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
    throw new TypeError('Country code must be empty or two letters.');
  }

  return {
    displayName,
    gameName,
    alliance,
    countryCode,
    bio,
    isPublic: input.isPublic === true,
  };
}
