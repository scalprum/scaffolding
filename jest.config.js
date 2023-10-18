const transformIgnorePatterns = ['node_modules/(?!(uuid)/)'];

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['**/?(*.)+(test).ts?(x)', '**/?(*.)+(test).js?(x)'],
  collectCoverageFrom: [
    '<rootDir>/packages/**/src/**/*.ts',
    '<rootDir>/packages/**/src/**/*.tsx',
    '!<rootDir>/packages/test-app/**/*.{ts,tsx,js,jsx}',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns,
  // needs to fix the memory leak errors
  coverageProvider: 'v8',
  setupFilesAfterEnv: ['<rootDir>/config/jest.setup.js'],
};
