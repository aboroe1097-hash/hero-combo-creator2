// Eden 2027 member signup: the revived form, its document contract, and the
// copy the page and the season prompt read from the site catalogue.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  BOH_DEFAULT_SCORING_PROFILE_ID,
  BOH_2025_SCORING_PROFILE,
  BOH_2027_SCORING_PROFILE,
  BOH_SCORING_PROFILES,
  getBohScoringProfile,
  isBohScoringProfileId,
} from '../../js/all-star-boh-model.js';
import {
  BOH_SIGNUP_FIELD_PATHS,
  BOH_SIGNUP_REQUIRED_DOCUMENT_KEYS,
  BohSignupDocumentError,
  buildBohSignupDocument,
  getBohSignupDocumentPath,
  mergeRetiredBohSignupFields,
  readBohSignupFormValues,
  readBohSignupSubmission,
  validateBohSignupDocument,
  writeBohSignupFormValues,
} from '../../js/boh-signup-document.js';
import { DEAD_TROOP_COUNT_KEYS } from '../../js/dead-troops.js';
import { VTS_SCORE_COPY_KEYS, VTS_SCORE_LANGUAGES } from '../../js/vts-score-i18n.js';
import {
  availableLanguages,
  loadTranslationsForLanguage,
  translations,
} from '../../js/translations.js';

await Promise.all(availableLanguages.map((lang) => loadTranslationsForLanguage(lang)));

const ACCOUNT = 'member-account-1';
const SEASON = '2027';
const CREATED_AT = { seconds: 1 };
const UPDATED_AT = { seconds: 2 };

/** The values the member form posts for a complete, valid signup. */
function signupValues(overrides = {}) {
  return {
    gameName: 'MalakAbo',
    stats: {
      totalCastlePower: 1_112_473_195,
      troopPower: 999_076_138,
      buildingPower: 6_477_467,
      technologyPower: 38_902_234,
      heroCombatPower: 30_585_714,
      dragonPower: 16_306_050,
      unitSpecialtyPower: 21_125_570,
      t9TroopTypes: ['Spearman', 'Archer'],
      readySpeedHeroes: ['Kika'],
      level50HeroCount: 12,
      rocLevel: 55,
    },
    commitment: {
      availability: 'all',
      preferredRole: 'offensive',
      secondaryRole: 'rune',
      fightingTimeIds: ['+12', '+14'],
      bohTimeSlots: ['+20', '+8'],
      epicTimeSlots: ['+10'],
      publicComparisonConsent: true,
      vts1097Member: true,
      contactNumber: '',
      joinReason: 'Team fight in Eden',
      notes: 'Mostly evenings',
    },
    ...overrides,
  };
}

function build(overrides = {}) {
  return buildBohSignupDocument({
    uid: ACCOUNT,
    seasonId: SEASON,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    ...overrides,
  });
}

/** A minimal stand-in for a form root: only what the field contract touches. */
function fakeRoot(elements) {
  const nodes = elements.map((element) => ({
    type: element.type || 'text',
    value: element.value ?? '',
    checked: element.checked ?? false,
    dataset: { ...(element.dataset || {}) },
  }));
  return {
    nodes,
    querySelectorAll(selector) {
      if (selector !== '[data-boh-field]') return [];
      return nodes.filter((node) => node.dataset.bohField);
    },
  };
}

test('scoring profile registry is the season version hook', () => {
  const ids = BOH_SCORING_PROFILES.map((profile) => profile.id);
  assert.deepEqual(ids, ['all-star-boh-2027-v1', 'all-star-boh-2025-v1']);
  assert.equal(BOH_DEFAULT_SCORING_PROFILE_ID, BOH_2027_SCORING_PROFILE.id);
  assert.equal(getBohScoringProfile('all-star-boh-2025-v1').id, BOH_2025_SCORING_PROFILE.id);
  // A season configured before a rename still renders: the fallback is the
  // current profile rather than a throw.
  assert.equal(getBohScoringProfile('all-star-boh-1999-v9').id, BOH_DEFAULT_SCORING_PROFILE_ID);
  assert.equal(getBohScoringProfile('').id, BOH_DEFAULT_SCORING_PROFILE_ID);
  assert.equal(isBohScoringProfileId('all-star-boh-2027-v1'), true);
  assert.equal(isBohScoringProfileId('all-star-boh-2027-v2'), false);
  assert.equal(isBohScoringProfileId(undefined), false);
  for (const profile of BOH_SCORING_PROFILES) {
    assert.ok(Number.isInteger(profile.version) && profile.version >= 1);
    assert.ok(String(profile.label).trim());
  }
  // The 2027 entry starts as the same formula as 2025: the owner asked for a
  // fresh form for the new season, not a new formula.
  assert.deepEqual(BOH_2027_SCORING_PROFILE.powerWeights, BOH_2025_SCORING_PROFILE.powerWeights);
  assert.deepEqual(BOH_2027_SCORING_PROFILE.bonusWeights, BOH_2025_SCORING_PROFILE.bonusWeights);
});

test('a filled signup round-trips into the document firestore.rules pins', () => {
  const document = build({ values: signupValues() });
  assert.deepEqual(validateBohSignupDocument(document), []);
  assert.deepEqual(
    Object.keys(document).sort(),
    [...BOH_SIGNUP_REQUIRED_DOCUMENT_KEYS, 'preferredTeammates'].sort()
  );
  assert.equal(document.uid, ACCOUNT);
  assert.equal(document.playerId, ACCOUNT, 'the rule binds playerId to the account');
  assert.equal(document.seasonId, SEASON);
  assert.equal(document.status, 'submitted');
  assert.equal(document.entryMethod, 'manual');
  assert.equal(document.schemaVersion, 1);
  assert.equal(document.revision, 1);
  assert.equal(document.createdAt, CREATED_AT);
  assert.equal(document.updatedAt, UPDATED_AT);
  assert.equal(document.updatedBy, ACCOUNT);
  assert.deepEqual(document.commitment.fightingTimeIds, ['+12', '+14']);
  assert.deepEqual(document.rolePreferences, ['offensive', 'rune']);
  assert.deepEqual(document.knownNames, ['MalakAbo']);
  assert.equal(document.ocr.used, false);
  assert.equal(document.submittedAtMs, null);
  assert.equal(
    getBohSignupDocumentPath(SEASON, ACCOUNT),
    `boh_allstar/${SEASON}/submissions/${ACCOUNT}`
  );
});

test('dead troop counts persist separately from the competition power totals', () => {
  const deadTroopCounts = Object.fromEntries(DEAD_TROOP_COUNT_KEYS.map((key) => [key, 0]));
  deadTroopCounts.FootmenLofty = 1000;
  const values = signupValues();
  values.stats.deadTroopCounts = deadTroopCounts;

  const document = build({ values });
  assert.deepEqual(validateBohSignupDocument(document), []);
  assert.deepEqual(document.stats.deadTroopCounts, deadTroopCounts);

  values.stats.deadTroopCounts = { UnknownTier: 1000 };
  assert.throws(
    () => build({ values }),
    (error) =>
      error instanceof BohSignupDocumentError &&
      error.reason === 'boh_signup_dead_troop_counts_invalid'
  );
});

test('the built document matches the shape firestore.rules enforces', () => {
  const rules = readFileSync('firestore.rules', 'utf8');
  const validator = rules.match(/function validAllStarBohSubmissionData\([\s\S]*?\n {4}\}/)?.[0];
  assert.ok(validator, 'validAllStarBohSubmissionData must exist');
  const quotedList = (block) => [...block.matchAll(/'([A-Za-z0-9_]+)'/g)].map((match) => match[1]);

  const dataHasOnly = quotedList(validator.match(/data\.keys\(\)\.hasOnly\(\[[\s\S]*?\]\)/)[0]);
  const dataHasAll = quotedList(validator.match(/data\.keys\(\)\.hasAll\(\[[\s\S]*?\]\)/)[0]);
  const statsHasOnly = quotedList(validator.match(/stats\.keys\(\)\.hasOnly\(\[[\s\S]*?\]\)/)[0]);
  const statsHasAll = quotedList(validator.match(/stats\.keys\(\)\.hasAll\(\[[\s\S]*?\]\)/)[0]);
  const commitmentHasOnly = quotedList(
    validator.match(/commitment\.keys\(\)\.hasOnly\(\[[\s\S]*?\]\)/)[0]
  );

  const document = build({ values: signupValues() });
  const documentKeys = Object.keys(document);
  // Every key the builder emits is allowed, and every required key is emitted.
  for (const key of documentKeys) assert.ok(dataHasOnly.includes(key), `${key} must be allowed`);
  for (const key of dataHasAll) assert.ok(documentKeys.includes(key), `${key} must be present`);

  const statsKeys = Object.keys(document.stats);
  for (const key of statsKeys) assert.ok(statsHasOnly.includes(key), `stats.${key} allowed`);
  for (const key of statsHasAll) assert.ok(statsKeys.includes(key), `stats.${key} present`);

  const commitmentKeys = Object.keys(document.commitment);
  for (const key of commitmentKeys) {
    assert.ok(commitmentHasOnly.includes(key), `commitment.${key} allowed`);
  }
  // Competition #12: the BoH and Epic Showdown slots keep the member's order,
  // and the growth-board consent is a real boolean.
  assert.deepEqual(document.commitment.bohTimeSlots, ['+20', '+8']);
  assert.deepEqual(document.commitment.epicTimeSlots, ['+10']);
  assert.equal(document.commitment.publicComparisonConsent, true);
  assert.ok(document.commitment.fightingTimeIds.length <= 2);
});

test('signup validation rejects what the rules would reject, with reasons', () => {
  assert.throws(
    () => build({ values: signupValues({ commitment: { fightingTimeIds: ['+12'] } }) }),
    (error) =>
      error instanceof BohSignupDocumentError &&
      error.code === 'values_invalid' &&
      error.reason === 'boh_signup_fighting_times_required'
  );
  assert.throws(
    () =>
      build({
        values: signupValues({
          commitment: { fightingTimeIds: ['+12', '+14'], preferredRole: 'sniper' },
        }),
      }),
    (error) => error instanceof BohSignupDocumentError
  );
  assert.throws(
    () => build({ uid: 'not a uid', values: signupValues() }),
    (error) => error.code === 'uid_invalid'
  );
  assert.throws(
    () =>
      build({
        values: signupValues({
          stats: { ...signupValues().stats, troopPower: 10 ** 16 },
        }),
      }),
    (error) => error instanceof BohSignupDocumentError
  );
  // The model clamps a negative number to zero rather than throwing, so the
  // document is always storable; the rules would reject a negative anyway.
  assert.equal(
    build({
      values: signupValues({
        stats: { ...signupValues().stats, totalCastlePower: -1 },
      }),
    }).stats.totalCastlePower,
    0
  );

  // A tampered document is reported problem by problem, not silently accepted.
  const document = build({ values: signupValues() });
  const problems = validateBohSignupDocument({ ...document, extra: 'nope', playerId: 'other' });
  assert.ok(problems.includes('unexpected:extra'));
  assert.ok(problems.includes('playerId:uid'));
  assert.deepEqual(validateBohSignupDocument(null).length > 0, true);
});

test('the form field contract round-trips through the DOM shape', () => {
  const root = fakeRoot([
    { dataset: { bohField: 'gameName' }, value: 'MalakAbo' },
    { type: 'number', dataset: { bohField: 'stats.totalCastlePower' }, value: '1112473195' },
    { type: 'number', dataset: { bohField: 'stats.level50HeroCount' }, value: '12' },
    { dataset: { bohField: 'stats.t9TroopTypes' }, value: 'Spearman, Archer' },
    { dataset: { bohField: 'commitment.preferredRole' }, value: 'offensive' },
    { dataset: { bohField: 'commitment.fightingTimeIds' }, value: '+12' },
    { dataset: { bohField: 'commitment.fightingTimeIds' }, value: '+14' },
    { dataset: { bohField: 'commitment.vts1097Member', bohBoolean: 'true' }, value: 'true' },
    { dataset: { bohField: 'commitment.notes' }, value: 'Evenings' },
  ]);
  const values = readBohSignupFormValues(root);
  assert.equal(values.gameName, 'MalakAbo');
  assert.equal(values.stats.totalCastlePower, '1112473195');
  assert.deepEqual(values.commitment.fightingTimeIds, ['+12', '+14']);
  assert.equal(values.commitment.preferredRole, 'offensive');
  assert.equal(values.commitment.vts1097Member, true);
  assert.equal(values.commitment.notes, 'Evenings');

  // The two fighting-time picks are the only repeated path, and they arrive as
  // the array `normalizeFightingTimeIds` requires — exactly two distinct ids.
  assert.deepEqual(values.commitment.fightingTimeIds, ['+12', '+14']);
  assert.equal(new Set(values.commitment.fightingTimeIds).size, 2);
});

test('loading a stored signup fills the same form fields', () => {
  const root = fakeRoot([
    { dataset: { bohField: 'gameName' }, value: '' },
    { type: 'number', dataset: { bohField: 'stats.troopPower' }, value: '' },
    { dataset: { bohField: 'commitment.fightingTimeIds' }, value: '+14' },
    { dataset: { bohField: 'commitment.fightingTimeIds' }, value: '+16' },
    { dataset: { bohField: 'commitment.vts1097Member', bohBoolean: 'true' }, value: 'false' },
  ]);
  const stored = build({ values: signupValues() });
  assert.ok(writeBohSignupFormValues(root, stored) >= 4);
  assert.equal(root.nodes[0].value, 'MalakAbo');
  assert.equal(root.nodes[1].value, String(stored.stats.troopPower));
  assert.deepEqual([root.nodes[2].value, root.nodes[3].value], ['+12', '+14']);
  assert.equal(root.nodes[4].value, 'true');

  const submission = readBohSignupSubmission(stored, { seasonId: SEASON, uid: ACCOUNT });
  assert.equal(submission.gameName, 'MalakAbo');
  assert.equal(submission.powerValues.totalCastlePower, 1_112_473_195);
  assert.equal(submission.status, 'submitted');
  // A row from another season or another account is never mistaken for this one.
  assert.equal(readBohSignupSubmission(stored, { seasonId: '2026', uid: ACCOUNT }), null);
  assert.equal(readBohSignupSubmission(stored, { uid: 'someone-else' }), null);
  assert.equal(readBohSignupSubmission(null), null);
});

test('the VtsScore page carries the revived signup as its first member step', () => {
  const page = readFileSync('vtsscore.html', 'utf8');
  assert.match(page, /id="vtsScoreSignup"[\s\S]*id="vtsScoreSignupForm"/);
  assert.match(page, /id="vtsScoreSignupSubmit"/);
  assert.match(page, /data-boh-field="gameName"/);
  assert.match(page, /data-boh-field="stats\.totalCastlePower"/);
  assert.match(page, /data-boh-field="stats\.unitSpecialtyPower"/);
  assert.match(page, /data-boh-list="true"\s+data-boh-field="commitment\.bohTimeSlots"/);
  assert.match(page, /data-boh-list="true"\s+data-boh-field="commitment\.epicTimeSlots"/);
  assert.match(page, /type="checkbox"\s+data-boh-field="commitment\.publicComparisonConsent"/);
  assert.doesNotMatch(page, /commitment\.fightingTimeIds/);
  // 16.5.9: questions the registration no longer asks. The document still
  // carries them (rule-valid placeholders, see mergeRetiredBohSignupFields).
  for (const retired of [
    'stats.t9TroopTypes',
    'stats.readySpeedHeroes',
    'stats.level50HeroCount',
    'commitment.preferredRole',
    'commitment.secondaryRole',
    'commitment.availability',
    'commitment.vts1097Member',
    'commitment.contactNumber',
    'commitment.joinReason',
    'commitment.notes',
  ]) {
    assert.doesNotMatch(page, new RegExp(`data-boh-field="${retired.replace('.', '\\.')}"`));
  }
  assert.match(page, /data-boh-field="stats\.rocLevel"/);
  assert.match(page, /data-vts-i18n="signupCommitmentTitle"/);
  const steps = [
    ...page
      .slice(page.indexOf('id="vtsScoreSignupForm"'), page.indexOf('id="vtsScoreSignupSubmit"'))
      .matchAll(/vts-score-step__number" aria-hidden="true">(\d+)</g),
  ].map((match) => Number(match[1]));
  assert.deepEqual(steps, [1, 2, 3], 'registration steps stay contiguous');
  // The Lord Info → Power screenshot upload sits at the top of the power step.
  const powerStep = page.indexOf('data-vts-i18n="signupPowerTitle"');
  assert.ok(powerStep > 0 && page.indexOf('id="vtsScoreSignupImage"') > powerStep);
  assert.ok(
    page.indexOf('id="vtsScoreSignupImage"') < page.indexOf('id="vtsScoreSignupTotalCastlePower"')
  );
  assert.doesNotMatch(page, /id="vtsScoreSignupOcrConsent"/);
  assert.match(page, /data-vts-i18n="signupOcrPrivacy"/);
  assert.match(page, /id="vtsScoreSignupReadButton"/);
  assert.match(page, /id="vtsScoreSignupOcrConfirm"/);
  // The signup step precedes the score upload, and the workspace still needs
  // the member grant the PIN form issues.
  assert.ok(
    page.indexOf('id="vtsScoreSignup"') < page.indexOf('id="vtsScoreWorkspace"'),
    'the registration step must come before the score upload'
  );
  assert.match(page, /id="vtsScoreGate"[\s\S]*id="vtsScoreSignup"/);

  // Every element id the controller reaches for exists in the markup.
  const controller = readFileSync('js/vts-score.js', 'utf8');
  const ids = [...controller.matchAll(/element\('(vtsScore[A-Za-z0-9]+)'\)/g)].map(
    (match) => match[1]
  );
  assert.ok(ids.length > 8);
  for (const id of new Set(ids)) {
    assert.ok(page.includes(`id="${id}"`), `vtsscore.html must contain #${id}`);
  }
});

test('every signup string on the page exists in all six VtsScore languages', () => {
  const page = readFileSync('vtsscore.html', 'utf8');
  const keys = new Set();
  for (const match of page.matchAll(/data-vts-i18n(?:-placeholder)?="([^"]+)"/g)) {
    keys.add(match[1]);
  }
  assert.ok(keys.size > 30);
  const missing = [...keys].filter((key) => !VTS_SCORE_COPY_KEYS.includes(key));
  assert.deepEqual(missing, [], 'page keys must be defined in the catalogue');
  for (const key of [
    'signupKicker',
    'signupSave',
    'signupErrorBohSlots',
    'signupErrorEpicSlots',
    'publicConsent',
    'signupStateSaved',
  ]) {
    assert.ok(VTS_SCORE_COPY_KEYS.includes(key), `${key} must exist`);
  }
  // Signup copy is complete in all six languages, not just English.
  const source = readFileSync('js/vts-score-i18n.js', 'utf8');
  const signupBlock = source.slice(
    source.indexOf('const SIGNUP_COPY'),
    source.indexOf('const COPY =')
  );
  for (const locale of ['en', 'ar', 'es', 'pt', 'fr', 'de']) {
    assert.ok(signupBlock.includes(`\n  ${locale}: {`), `${locale} signup copy`);
  }
  for (const key of ['signupStateSaved']) {
    const uses = signupBlock.split(`${key}:`).length - 1;
    assert.equal(uses, 6, `${key} must be translated in all six languages`);
  }
});

test('the active-season prompt and the admin tab read from the site catalogue', () => {
  const needed = [
    'edenX1SignupPromptKicker',
    'edenX1SignupPromptTitle',
    'edenX1SignupPromptCopy',
    'edenX1SignupPromptLinked',
    'edenX1SignupPromptCta',
    'adminBohSignupsTab',
    'adminBohSignupsTitle',
    'adminBohSignupsSubtitle',
    'adminBohSignupSeasonLabel',
    'adminBohSignupProfileLabel',
    'adminBohSignupOpenLabel',
    'adminBohSignupGrantLabel',
    'adminBohSignupSeasonSave',
    'adminBohSignupSeasonHelp',
    'adminBohSignupManualTitle',
    'adminBohSignupManualHelp',
    'adminBohSignupGameName',
    'adminBohSignupT9TroopTypes',
    'adminBohSignupReadySpeedHeroes',
    'adminBohSignupLevel50Heroes',
    'adminBohSignupRocLevel',
    'adminBohSignupFightingFirst',
    'adminBohSignupFightingSecond',
    'adminBohSignupPreferredRole',
    'adminBohSignupMember',
    'adminBohSignupYes',
    'adminBohSignupNo',
    'adminBohSignupNotes',
    'adminBohSignupSave',
    'adminBohSignupSaveUpdate',
    'adminBohSignupCancel',
    'adminBohSignupListTitle',
    'adminBohSignupListEmpty',
    'adminBohSignupSeasonSummary',
    'adminBohSignupNoSeason',
    'adminBohSignupEdit',
    'adminBohSignupManualChip',
    'adminBohSignupMemberChip',
    'adminBohSignupRevision',
    'adminBohSignupActions',
    'adminBohSignupsLoading',
    'adminBohSignupsUnavailable',
    'adminBohSignupSeasonSaved',
    'adminBohSignupSaving',
    'adminBohSignupSaved',
    'adminBohSignupErrorSession',
    'adminBohSignupErrorInvalid',
    'adminBohSignupErrorExists',
    'adminBohSignupErrorMissing',
    'adminBohSignupErrorSeason',
    'adminBohSignupErrorGeneric',
  ];
  const locales = ['ar', 'de', 'es', 'fr', 'id', 'it', 'kr', 'pt', 'ru', 'tr', 'zh'];
  // Reviewed cognates: German and French use the same table words as English,
  // Spanish and Italian answer "No" with "No", and Spanish keeps "Flexible".
  // Everything else must be a real translation.
  const sharedTerms = new Set([
    'adminBohSignupRevision',
    'adminBohSignupActions',
    'adminBohSignupNo',
    'adminBohSignupRoleFlexible',
  ]);
  const placeholders = (value) =>
    [...String(value).matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();
  for (const key of needed) {
    assert.ok(typeof translations.en[key] === 'string' && translations.en[key].trim(), `en.${key}`);
  }
  // Only the two keys with variables carry placeholders, and they must agree
  // with English in every pack.
  for (const key of needed) {
    const expected = placeholders(translations.en[key]);
    if (key === 'edenX1SignupPromptLinked') assert.deepEqual(expected, ['player']);
    else if (key === 'adminBohSignupSeasonSummary')
      assert.deepEqual(expected, ['season', 'version']);
    else assert.deepEqual(expected, [], `${key} must stay placeholder-free`);
    for (const locale of locales) {
      assert.deepEqual(
        placeholders(translations[locale][key]),
        expected,
        `${locale}.${key} placeholders`
      );
      if (sharedTerms.has(key)) continue;
      assert.notEqual(
        translations[locale][key],
        translations.en[key],
        `${locale}.${key} must be translated, not copied`
      );
    }
  }
});

test('the registration form collects Artifact Power, and Towers is named on the specialty row', () => {
  const page = readFileSync('vtsscore.html', 'utf8');
  const model = readFileSync('js/boh-signup-document.js', 'utf8');
  const copy = readFileSync('js/vts-score-i18n.js', 'utf8');

  // The artifact row is collected but remains optional under the existing
  // signup/rules contract.
  const artifact = page.match(/<label for="vtsScoreSignupArtifactPower">[\s\S]*?<\/label>/);
  assert.ok(artifact, 'the artifact power field is on the page');
  assert.match(artifact[0], /data-boh-field="stats\.artifactPower"/);
  // The sign-up label carries the "(optional)" marker; the OCR review rows keep
  // the plain fieldArtifactPower label through POWER_FIELD_I18N.
  assert.match(artifact[0], /data-vts-i18n="signupArtifactPower"/);
  assert.doesNotMatch(artifact[0], /\brequired\b/);

  // Filled back from a saved signup, which walks the declared paths.
  assert.match(model, /'stats\.unitSpecialtyPower',[\s\S]{0,220}'stats\.artifactPower',/);
  // Not required in the document contract either. Scope to the array body:
  // the string "artifactPower" appears later in the file for the optional
  // validation, so a loose pattern would match past the list.
  const requiredBlock = model.match(
    /BOH_SIGNUP_STAT_REQUIRED_FIELDS = Object\.freeze\(\[([\s\S]*?)\]\)/
  );
  assert.ok(requiredBlock, 'the required-field list is declared');
  assert.doesNotMatch(requiredBlock[1], /artifactPower/);
  assert.match(requiredBlock[1], /'unitSpecialtyPower'/);

  // The specialty row names Towers, in every page locale, with that locale's
  // own word for Towers (not just any parenthetical).
  const specialty = copy.match(/fieldUnitSpecialtyPower: '[^']+'/g) || [];
  assert.equal(specialty.length, 6, 'six page locales carry the label');
  const breakdown = copy.slice(
    copy.indexOf('const FULL_BREAKDOWN_COPY'),
    copy.indexOf('const SIGNUP_COPY')
  );
  const towersByLocale = {
    en: 'Towers',
    ar: 'الأبراج',
    es: 'Torres',
    pt: 'Torres',
    fr: 'Tours',
    de: 'Türme',
  };
  assert.deepEqual(Object.keys(towersByLocale).sort(), [...VTS_SCORE_LANGUAGES].sort());
  for (const [locale, towers] of Object.entries(towersByLocale)) {
    const block = breakdown.match(new RegExp(`\\n  ${locale}: \\{([\\s\\S]*?)\\n  \\}`))?.[1];
    assert.ok(block, `${locale} breakdown copy`);
    const label = block.match(/fieldUnitSpecialtyPower: '([^']+)'/)?.[1];
    assert.ok(label, `${locale}.fieldUnitSpecialtyPower`);
    assert.ok(label.endsWith(`(${towers})`), `${locale}: "${label}" names ${towers}`);
  }
});

test('optional Artifact Power stays absent when blank and round-trips when filled', () => {
  const field = (value) =>
    fakeRoot([
      {
        type: 'number',
        dataset: { bohField: 'stats.artifactPower' },
        value,
      },
    ]);
  const baseStats = signupValues().stats;

  const blankForm = readBohSignupFormValues(field(''));
  const blankSignup = build({
    values: signupValues({
      stats: { ...baseStats, artifactPower: blankForm.stats.artifactPower },
    }),
  });
  assert.equal(blankForm.stats.artifactPower, null);
  assert.equal(Object.hasOwn(blankSignup.stats, 'artifactPower'), false);

  for (const value of ['0', '12345']) {
    const filledForm = readBohSignupFormValues(field(value));
    const savedSignup = build({
      values: signupValues({
        stats: { ...baseStats, artifactPower: filledForm.stats.artifactPower },
      }),
    });
    assert.equal(savedSignup.stats.artifactPower, Number(value));

    const reopenedForm = field('');
    writeBohSignupFormValues(reopenedForm, savedSignup);
    assert.equal(reopenedForm.nodes[0].value, value);
  }
});

test('a slimmed registration builds a rule-valid document with neutral placeholders', () => {
  const slim = signupValues();
  delete slim.stats.t9TroopTypes;
  delete slim.stats.readySpeedHeroes;
  delete slim.stats.level50HeroCount;
  for (const key of ['availability', 'preferredRole', 'secondaryRole', 'vts1097Member']) {
    delete slim.commitment[key];
  }
  delete slim.commitment.contactNumber;
  delete slim.commitment.fightingTimeIds;
  const document = build({ values: mergeRetiredBohSignupFields(slim, null) });
  assert.deepEqual(validateBohSignupDocument(document), []);
  assert.deepEqual(document.stats.t9TroopTypes, []);
  assert.deepEqual(document.stats.readySpeedHeroes, []);
  assert.equal(document.stats.level50HeroCount, 0);
  assert.equal(document.commitment.availability, '');
  assert.equal(document.commitment.preferredRole, '');
  assert.equal(document.commitment.vts1097Member, true);
  assert.equal(document.commitment.contactNumber, '');

  // Same required-key shape the rules pin.
  const rules = readFileSync('firestore.rules', 'utf8');
  const validator = rules.match(/function validAllStarBohSubmissionData\([\s\S]*?\n {4}\}/)[0];
  const quoted = (block) => [...block.matchAll(/'([A-Za-z0-9_]+)'/g)].map((m) => m[1]);
  const statsHasAll = quoted(validator.match(/stats\.keys\(\)\.hasAll\(\[[\s\S]*?\]\)/)[0]);
  const commitmentHasOnly = quoted(
    validator.match(/commitment\.keys\(\)\.hasOnly\(\[[\s\S]*?\]\)/)[0]
  );
  for (const key of statsHasAll) assert.ok(key in document.stats, `stats.${key} present`);
  for (const key of Object.keys(document.commitment)) {
    assert.ok(commitmentHasOnly.includes(key), `commitment.${key} allowed`);
  }
  assert.equal(typeof document.commitment.vts1097Member, 'boolean');
  assert.ok(Number.isInteger(document.stats.level50HeroCount));
});

test('editing a registration keeps the retired answers it already stored', () => {
  const stored = build({ values: signupValues() });
  const slim = signupValues();
  delete slim.stats.t9TroopTypes;
  delete slim.stats.level50HeroCount;
  delete slim.commitment.preferredRole;
  delete slim.commitment.secondaryRole;
  delete slim.commitment.contactNumber;
  delete slim.commitment.vts1097Member;
  delete slim.commitment.joinReason;
  delete slim.commitment.notes;
  const merged = mergeRetiredBohSignupFields(slim, {
    ...stored,
    commitment: { ...stored.commitment, contactNumber: '+100', vts1097Member: false },
  });
  const document = build({ values: merged });
  assert.deepEqual(document.stats.t9TroopTypes, ['Spearman', 'Archer']);
  assert.equal(document.stats.level50HeroCount, 12);
  assert.equal(document.commitment.preferredRole, 'offensive');
  assert.equal(document.commitment.secondaryRole, 'rune');
  assert.equal(document.commitment.contactNumber, '+100');
  assert.equal(document.commitment.vts1097Member, false);
});

test('an OCR-filled registration saves only with the values confirmed', async () => {
  const { buildSignupOcrAudit } = await import('../../js/vts-score-signup-ocr.js');
  const review = { confidence: { overall: 0.9, troopPower: 0.8 }, warnings: [] };
  const confirmed = build({
    values: { ...signupValues(), entryMethod: 'ocr' },
    ocr: buildSignupOcrAudit(review, { confirmed: true }),
  });
  assert.deepEqual(validateBohSignupDocument(confirmed), []);
  assert.equal(confirmed.entryMethod, 'ocr');
  assert.equal(confirmed.ocr.used, true);
  assert.equal(confirmed.ocr.valuesConfirmed, true);
  assert.equal(confirmed.ocr.fieldConfidence.troopPower, 0.8);
});
