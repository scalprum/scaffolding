module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['**/?(*.)+(test).ts?(x)'],
  collectCoverageFrom: [
    '<rootDir>/packages/**/src/**/*.ts',
    '<rootDir>/packages/**/src/**/*.tsx',
    '!<rootDir>/packages/test-app/**/*.{ts,tsx,js,jsx}',
  ],
  moduleDirectories: ['<rootDir>/node_modules', '<rootDir>/packages/**/node_modules'],
};
