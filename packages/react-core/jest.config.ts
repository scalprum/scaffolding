/* eslint-disable */
export default {
  displayName: '@scalprum/react-core',
  preset: '../../jest.preset.js',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleNameMapper: {
    '^@scalprum/core$': '<rootDir>/../core/src/index.ts',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'html'],
  coverageDirectory: '../../coverage/packages/react-core',
  testEnvironment: 'jsdom',
  testMatch: ['**/*.test.ts?(x)', '**/*.spec.ts?(x)'],
};
