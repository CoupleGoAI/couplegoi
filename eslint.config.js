const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // TypeScript strict hygiene
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

      // Security: no console.log (use structured logging)
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Code quality
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    // Ignore test files and generated files
    ignores: ['node_modules/**', '**/__tests__/**', '**/*.test.ts', '**/*.test.tsx'],
  },
];
