// Flat config for ESLint 9+, translated one-for-one from the retired
// .eslintrc.json: the recommended rule set, browser ES2022 modules everywhere,
// and Node globals for build scripts, tests, workers and root-level configs.
import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/',
      'docs/',
      'node_modules/',
      'coverage/',
      'playwright-report/',
      'test-results/',
    ],
  },
  js.configs.recommended,
  {
    // ESLint 8 never reported disable comments for rules that are not enabled;
    // ESLint 9+ warns by default. Keep the old behaviour for this upgrade.
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        firebase: 'readonly',
      },
    },
    rules: {
      'no-empty': 'off',
      'no-inner-declarations': 'off',
      'no-unused-vars': 'off',
      // Added to `recommended` after ESLint 8. This upgrade keeps the lint policy
      // it inherited. The 27 no-useless-assignment hits are the defensive
      // "initialise, then assign in every branch" pattern rather than dead code,
      // and preserve-caught-error would change the shape of ten thrown errors;
      // either is worth adopting on its own, not as a side effect of a version bump.
      'no-useless-assignment': 'off',
      'preserve-caught-error': 'off',
    },
  },
  {
    // The eslintrc override listed "*.js" and "*.mjs". In eslintrc a pattern
    // with no slash matches the basename at any depth, so Node globals applied
    // to every file in the project, browser modules included. Flat config
    // anchors patterns to the project root, so keep that scope with "**/".
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
