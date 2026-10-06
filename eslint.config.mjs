import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import eocrm from './tools/eslint-plugin-eocrm/index.mjs';

// EOCRM policy rules (#617) plus the typescript-eslint and react-hooks
// recommended sets. Left off on purpose:
// - `@typescript-eslint/no-unused-vars`: tsc's noUnusedLocals/Parameters
//   already enforce it, and the `_`-prefixed rest-sibling strips are deliberate.
// - The React Compiler rules (`react-hooks/refs`, `set-state-in-effect`, …):
//   only worth it once a consumer adopts the compiler; the library ships
//   uncompiled source and keeps latest-value refs by design.
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/generated/**',
      '.worktrees/**',
      '.superpowers/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },
  {
    files: ['packages/*/src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react-hooks': reactHooks,
      eocrm,
    },
    rules: {
      ...tseslint.configs.recommended.reduce(
        (rules, config) => ({ ...rules, ...config.rules }),
        {},
      ),
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': [
        'error',
        { allowInterfaces: 'with-single-extends' },
      ],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    files: ['packages/design-system/src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', '**/*.testutil.{ts,tsx}'],
    rules: {
      'eocrm/no-nullish-accessible-name': 'error',
      'eocrm/no-nullish-translation-fallback': 'error',
      'eocrm/aria-busy-needs-announcement': 'error',
    },
  },
];
