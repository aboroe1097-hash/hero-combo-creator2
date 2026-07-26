export const ACCOUNT_PROFILE_LIMITS = Object.freeze({
  displayName: 50,
  gameName: 50,
  alliance: 50,
  bio: 280,
  state: 160,
  referralSource: 160,
  comments: 1000,
});

function cleanText(value) {
  return String(value ?? '').trim();
}

function hasNonemptyText(value) {
  return typeof value === 'string' && value.length > 0;
}

function validExistingName(value) {
  return hasNonemptyText(value) && value.length <= ACCOUNT_PROFILE_LIMITS.gameName;
}

function assertLength(name, value, minimum, maximum, code) {
  if (value.length < minimum || value.length > maximum) {
    const error = new RangeError(`${name} must be between ${minimum} and ${maximum} characters.`);
    error.code = code;
    throw error;
  }
}

export async function confirmExistingGoogleAccountSwitch(confirmExistingAccount) {
  if (typeof confirmExistingAccount !== 'function') return false;
  return (await confirmExistingAccount()) === true;
}

export function planExistingGoogleAccountRecovery(privateProfile, publicProfile, onboarding) {
  const initialProfile = normalizeAccountProfile({
    ...onboarding,
    alliance: '',
    countryCode: '',
    bio: '',
    isPublic: false,
  });

  if (privateProfile && typeof privateProfile === 'object') {
    const patch = {};
    const existingName = validExistingName(privateProfile.gameName)
      ? privateProfile.gameName
      : validExistingName(privateProfile.displayName)
        ? privateProfile.displayName
        : '';

    if (!hasNonemptyText(privateProfile.displayName) && existingName) {
      patch.displayName = existingName;
    }
    if (!hasNonemptyText(privateProfile.gameName) && existingName) {
      patch.gameName = existingName;
    }
    if (!hasNonemptyText(privateProfile.displayName) && !hasNonemptyText(privateProfile.gameName)) {
      patch.displayName = initialProfile.displayName;
      patch.gameName = initialProfile.gameName;
    }
    if (!hasNonemptyText(privateProfile.state)) patch.state = initialProfile.state;
    if (!hasNonemptyText(privateProfile.referralSource)) {
      patch.referralSource = initialProfile.referralSource;
    }

    return Object.keys(patch).length > 0 ? { kind: 'update', patch } : { kind: 'none' };
  }

  const publicName = validExistingName(publicProfile?.gameName)
    ? publicProfile.gameName
    : validExistingName(publicProfile?.displayName)
      ? publicProfile.displayName
      : initialProfile.gameName;

  return {
    kind: 'create',
    profile: {
      displayName: publicName,
      gameName: publicName,
      alliance: hasNonemptyText(publicProfile?.alliance) ? publicProfile.alliance : '',
      countryCode: hasNonemptyText(publicProfile?.countryCode) ? publicProfile.countryCode : '',
      bio: hasNonemptyText(publicProfile?.bio) ? publicProfile.bio : '',
      state: initialProfile.state,
      referralSource: initialProfile.referralSource,
      comments: '',
      isPublic: Boolean(publicProfile),
    },
  };
}

export function normalizeAccountProfile(input = {}) {
  const gameName = cleanText(input.gameName) || cleanText(input.displayName);
  const alliance = cleanText(input.alliance);
  const countryCode = cleanText(input.countryCode).toUpperCase();
  const bio = cleanText(input.bio);
  const state = cleanText(input.state);
  const referralSource = cleanText(input.referralSource);
  const comments = cleanText(input.comments);

  assertLength(
    'Game name',
    gameName,
    1,
    ACCOUNT_PROFILE_LIMITS.gameName,
    'account/invalid-game-name'
  );
  assertLength(
    'Alliance',
    alliance,
    0,
    ACCOUNT_PROFILE_LIMITS.alliance,
    'account/alliance-too-long'
  );
  assertLength('Bio', bio, 0, ACCOUNT_PROFILE_LIMITS.bio, 'account/bio-too-long');
  assertLength('Current state', state, 1, ACCOUNT_PROFILE_LIMITS.state, 'account/invalid-state');
  assertLength(
    'Referral source',
    referralSource,
    1,
    ACCOUNT_PROFILE_LIMITS.referralSource,
    'account/invalid-referral-source'
  );
  assertLength(
    'Comments',
    comments,
    0,
    ACCOUNT_PROFILE_LIMITS.comments,
    'account/comments-too-long'
  );
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
    const error = new TypeError('Country code must be empty or two letters.');
    error.code = 'account/invalid-country-code';
    throw error;
  }

  return {
    displayName: gameName,
    gameName,
    alliance,
    countryCode,
    bio,
    state,
    referralSource,
    comments,
    isPublic: input.isPublic === true,
  };
}
