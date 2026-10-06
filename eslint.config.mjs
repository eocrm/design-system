import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import eocrm from './tools/eslint-plugin-eocrm/index.mjs';

// ESLint here enforces EOCRM policy rules (#617). Third-party plugins are
// registered only so existing `eslint-disable-next-line <plugin>/<rule>`
// comments resolve; their rules are deliberately OFF (enabling them is a
// separate decision).
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
  { linterOptions: { reportUnusedDisableDirectives: 'off' } },
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
    rules: {},
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
