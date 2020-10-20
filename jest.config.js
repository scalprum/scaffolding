module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(test).ts?(x)'],
  collectCoverageFrom: ['<rootDir>/packages/**/src/**/*.ts', '<rootDir>/packages/**/src/**/*.tsx'],
};
