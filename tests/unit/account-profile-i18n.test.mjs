import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  ACCOUNT_I18N_PACKS,
  accountErrorMessage,
  ACCOUNT_LANGUAGE_STORAGE_KEY,
  ACCOUNT_LOCALES,
  applyAccountDocumentPreferences,
  createAccountTranslator,
  normalizeAccountLocale,
  resolveAccountLocale,
} from '../../js/account-profile-i18n.js';

const ENGLISH_FALLBACK_KEYS = new Set([
  'action.continue',
  'action.finishProfile',
  'onboarding.step',
  'onboarding.title',
  'onboarding.lead',
  'referral.placeholder',
  'referral.youtube',
  'referral.in_game',
  'referral.vts_1097',
  'referral.alliance_friend',
  'referral.search',
  'referral.other',
  'status.authenticated',
  'status.dismiss',
]);

const placeholders = (value) =>
  [...String(value).matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

test('account locale normalization supports the exact standalone locale set', () => {
  assert.deepEqual(ACCOUNT_LOCALES, [
    'en',
    'es',
    'pt',
    'de',
    'fr',
    'hr',
    'tr',
    'ru',
    'id',
    'zh',
    'ar',
    'kr',
    'it',
  ]);
  assert.equal(ACCOUNT_LANGUAGE_STORAGE_KEY, 'vts_hero_lang');
  assert.equal(normalizeAccountLocale('PT-BR'), 'pt');
  assert.equal(normalizeAccountLocale('ar_EG'), 'ar');
  assert.equal(normalizeAccountLocale('ko'), 'kr');
  assert.equal(normalizeAccountLocale('ko-KR'), 'kr');
  assert.equal(normalizeAccountLocale('ko_KR'), 'kr');
  assert.equal(normalizeAccountLocale(''), 'en');
});

test('account packs are complete, deeply frozen, and preserve placeholder parity', () => {
  const englishKeys = Object.keys(ACCOUNT_I18N_PACKS.en).sort();
  assert.ok(englishKeys.length > 45);
  assert.ok(Object.isFrozen(ACCOUNT_I18N_PACKS));
  for (const locale of ACCOUNT_LOCALES) {
    const pack = ACCOUNT_I18N_PACKS[locale];
    assert.ok(Object.isFrozen(pack), `${locale} pack should be frozen`);
    assert.deepEqual(Object.keys(pack).sort(), englishKeys, `${locale} key parity`);
    for (const key of englishKeys) {
      assert.equal(typeof pack[key], 'string', `${locale}.${key}`);
      assert.ok(pack[key].length > 0, `${locale}.${key} should not be empty`);
      assert.doesNotMatch(key, /\uFFFD|Ã|Â|â€|ðŸ|Ð|Ñ/, `${locale}.${key} key encoding`);
      assert.doesNotMatch(
        pack[key],
        /\uFFFD|\u00C3|\u00C2|\u00E2\u20AC|\u00F0\u0178|\u00D0|\u00D1|\u00D8\u00A7|\u00D9\u201E|\u00E4\u00B8|\u00ED\u2022|\u00EC\u2013/,
        `${locale}.${key} value encoding`
      );
      assert.deepEqual(
        placeholders(pack[key]),
        placeholders(ACCOUNT_I18N_PACKS.en[key]),
        `${locale}.${key} placeholders`
      );
      if (locale !== 'en' && !ENGLISH_FALLBACK_KEYS.has(key)) {
        assert.notEqual(
          pack[key],
          ACCOUNT_I18N_PACKS.en[key],
          `${locale}.${key} should be localized`
        );
      }
    }
  }
  for (const locale of ACCOUNT_LOCALES) {
    const pack = ACCOUNT_I18N_PACKS[locale];
    for (const key of ['field.state', 'field.referralSource', 'field.comments']) {
      assert.doesNotMatch(pack[key], /^(?:State|Referral|Comments?)\s*\d+$/iu, `${locale}.${key}`);
    }
  }
  for (const locale of ACCOUNT_LOCALES.slice(1)) {
    const errors = Object.entries(ACCOUNT_I18N_PACKS[locale])
      .filter(([key]) => key.startsWith('error.'))
      .map(([, value]) => value);
    assert.equal(new Set(errors).size, errors.length, `${locale} errors should stay specific`);
  }
});

test('HTML and runtime account keys exist in every locale', () => {
  const html = readFileSync('profile.html', 'utf8');
  const page = readFileSync('js/account-profile-page.js', 'utf8');
  const htmlKeys = [
    ...html.matchAll(/data-i18n(?:-aria-label|-placeholder|-content)?="([^"]+)"/g),
  ].map((match) => match[1]);
  const dynamicKeys = [
    'action.create',
    'action.signin',
    'action.googleCreate',
    'action.googleSignin',
    'confirm.googleExistingAccount',
    'verification.google',
    'verification.verified',
    'verification.unverified',
    'status.created',
    'status.authenticated',
    'status.signedIn',
    'status.googleSwitchCanceled',
    'status.enterEmail',
    'status.resetSent',
    'status.verificationSent',
    'status.saved',
    'status.signedOut',
  ];
  for (const key of new Set([...htmlKeys, ...dynamicKeys])) {
    for (const locale of ACCOUNT_LOCALES) {
      assert.equal(typeof ACCOUNT_I18N_PACKS[locale][key], 'string', locale + '.' + key);
    }
  }
  assert.doesNotMatch(page, /\.innerHTML\b/);
  assert.doesNotMatch(page, /\btranslate\s*\(/);
  assert.match(page, /\baccountTr\s*\(/);
});

test('translator falls back to English and replaces named placeholders without HTML', () => {
  const accountTr = createAccountTranslator('unsupported');
  assert.equal(accountTr.locale, 'en');
  assert.equal(accountTr('action.save'), 'Save profile');
  assert.equal(accountTr('action.googleCreate'), 'Continue with Google');
  assert.equal(accountTr('action.googleSignin'), 'Sign in with Google');
  assert.equal(createAccountTranslator('de')('action.googleCreate'), 'Mit Google fortfahren');
  assert.equal(
    createAccountTranslator('ar')('action.googleSignin'),
    'تسجيل الدخول باستخدام Google'
  );
  assert.equal(createAccountTranslator('kr')('action.googleCreate'), 'Google로 계속');
  assert.equal(accountTr('missing.key'), 'missing.key');
  assert.equal(createAccountTranslator('es')('status.saved'), 'Perfil guardado.');
  for (const locale of ACCOUNT_LOCALES) {
    const translator = createAccountTranslator(locale);
    for (const key of ENGLISH_FALLBACK_KEYS) {
      assert.notEqual(translator(key), key, `${locale}.${key} should resolve`);
    }
  }
});

test('stored locale resolution and document preferences are deterministic', () => {
  const storage = { getItem: (key) => (key === 'vts_hero_lang' ? 'AR-eg' : null) };
  assert.equal(resolveAccountLocale(storage, { language: 'fr-FR' }), 'ar');
  assert.equal(resolveAccountLocale({ getItem: () => 'xx' }, { language: 'fr-FR' }), 'en');
  assert.equal(resolveAccountLocale({ getItem: () => '' }, { language: 'fr-FR' }), 'fr');
  assert.equal(
    resolveAccountLocale(
      {
        getItem: () => {
          throw new Error('blocked');
        },
      },
      { language: 'ko-KR' }
    ),
    'kr'
  );

  assert.equal(resolveAccountLocale({ getItem: () => '' }, { language: 'ko' }), 'kr');
  assert.equal(resolveAccountLocale({ getItem: () => 'kr' }, { language: 'en-US' }), 'kr');

  const documentRef = { documentElement: {} };
  assert.equal(applyAccountDocumentPreferences(documentRef, 'ar-EG'), 'ar');
  assert.deepEqual(documentRef.documentElement, { lang: 'ar', dir: 'rtl' });
  assert.equal(applyAccountDocumentPreferences(documentRef, 'ko-KR'), 'kr');
  assert.deepEqual(documentRef.documentElement, { lang: 'ko', dir: 'ltr' });
  applyAccountDocumentPreferences(documentRef, 'he');
  assert.deepEqual(documentRef.documentElement, { lang: 'en', dir: 'ltr' });
});

test('localized statuses are meaningful messages rather than labels or numbered placeholders', () => {
  for (const locale of ACCOUNT_LOCALES) {
    const pack = ACCOUNT_I18N_PACKS[locale];
    for (const [key, value] of Object.entries(pack)) {
      if (key.startsWith('error.')) assert.doesNotMatch(value, /^\s*\d+[.)]/u, `${locale}.${key}`);
    }
    assert.notEqual(pack['status.saved'], pack['action.save'], `${locale}.status.saved`);
    assert.notEqual(pack['status.signedIn'], pack['action.signin'], `${locale}.status.signedIn`);
    assert.notEqual(pack['status.created'], pack['action.create'], `${locale}.status.created`);
    assert.notEqual(pack['status.signedOut'], pack['action.signout'], `${locale}.status.signedOut`);
  }
});

test('account errors map deterministically and never expose raw Firebase messages', () => {
  assert.equal(
    accountErrorMessage({ code: 'auth/invalid-email', message: 'SECRET' }, 'es'),
    'Introduce un correo válido.'
  );
  assert.equal(
    accountErrorMessage({ code: 'auth/invalid-email', message: 'SECRET' }, 'zh'),
    '请输入有效的电子邮箱地址。'
  );
  assert.equal(
    accountErrorMessage({ code: 'unknown', message: 'SECRET' }, 'es'),
    'Algo salió mal. Inténtalo de nuevo.'
  );
  const supportedCodes = [
    'auth/email-already-in-use',
    'auth/credential-already-in-use',
    'auth/invalid-credential',
    'auth/invalid-email',
    'auth/popup-blocked',
    'auth/popup-closed-by-user',
    'auth/requires-recent-login',
    'auth/too-many-requests',
    'auth/weak-password',
    'auth/user-disabled',
    'auth/operation-not-allowed',
    'auth/network-request-failed',
    'auth/internal-error',
    'auth/account-exists-with-different-credential',
    'auth/invalid-password',
    'auth/wrong-password',
    'auth/user-not-found',
    'account/invalid-game-name',
    'account/invalid-state',
    'account/invalid-referral-source',
    'account/comments-too-long',
    'account/alliance-too-long',
    'account/bio-too-long',
    'account/invalid-country-code',
    'account/google-credential-unavailable',
  ];
  for (const code of supportedCodes) {
    const message = accountErrorMessage({ code, message: 'SECRET' }, 'zh');
    assert.doesNotMatch(message, /SECRET|auth\//, code);
    assert.notEqual(message, ACCOUNT_I18N_PACKS.zh['error.generic'], code);
  }
  assert.equal(
    accountErrorMessage(
      { code: 'account/google-credential-unavailable', message: 'FIREBASE INTERNAL SECRET' },
      'kr'
    ),
    ACCOUNT_I18N_PACKS.kr['error.googleCredentialUnavailable']
  );
  const page = readFileSync('js/account-profile-page.js', 'utf8');
  assert.match(page, /setItem\(ACCOUNT_LANGUAGE_STORAGE_KEY, locale\)/);
  const html = readFileSync('profile.html', 'utf8');
  assert.doesNotMatch(
    html,
    /\uFFFD|\u00C3|\u00C2|\u00E2\u20AC|\u00F0\u0178|\u00D0|\u00D1|\u00D8\u00A7|\u00D9\u201E|\u00E4\u00B8|\u00ED\u2022|\u00EC\u2013/
  );

  const keyTranslator = (key) => `translated:${key}`;
  assert.equal(
    accountErrorMessage({ code: 'auth/weak-password' }, keyTranslator),
    'translated:error.weakPassword'
  );
});
