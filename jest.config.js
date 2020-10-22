module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['**/?(*.)+(test).ts?(x)'],
  collectCoverageFrom: ['<rootDir>/packages/**/src/**/*.ts', '<rootDir>/packages/**/src/**/*.tsx'],
  moduleDirectories: ['<rootDir>/node_modules', '<rootDir>/packages/**/node_modules'],
};
