/**
 * Jest configuration for CoupleGoAI.
 *
 * Uses babel-jest (already a transitive dep) with the project's babel.config.js
 * and a node environment — suitable for pure TypeScript domain tests that have
 * no React Native / Expo runtime dependencies.
 */

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.[jt]sx?$': [
      'babel-jest',
      {
        configFile: './babel.config.js',
        caller: { name: 'jest', bundler: 'jest', platform: 'node' },
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    // Mirror the path aliases from tsconfig.json / babel.config.js
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@data/(.*)$': '<rootDir>/src/data/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@navigation/(.*)$': '<rootDir>/src/navigation/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
  },
  // Only collect coverage for domain logic (pure functions)
  collectCoverageFrom: ['src/domain/**/*.ts', '!src/domain/**/__tests__/**'],
};
