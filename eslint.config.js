import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/', 'node_modules/', 'scripts/', 'docs/'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Legacy-tolerant: the game core predates the lint setup
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Solid assigns `ref` variables from JSX, which ESLint cannot see.
    files: ['src/ui/**/*.tsx'],
    rules: {
      'no-unassigned-vars': 'off',
    },
  },
  {
    // Architecture rule: the game core must stay framework-free.
    // Nothing under src/game/ may import from src/ui/ (or any UI library).
    files: ['src/game/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/ui/*', '**/ui'], message: 'game/ must not depend on ui/ — invert the dependency (callback or EventBus).' },
            { group: ['solid-js', 'solid-js/*'], message: 'game/ must stay framework-free.' },
          ],
        },
      ],
    },
  },
);
