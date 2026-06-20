const path = require('path');

module.exports = {
  displayName: 'customer-pwa',
  preset: '../../jest.preset.js',
  testEnvironment: 'allure-jest/jsdom',
  testEnvironmentOptions: {
    resultsDir: path.resolve(__dirname, '../../allure-results'),
  },
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  setupFiles: ['<rootDir>/src/test/setup.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/apps/customer-pwa',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@einvoice/frontend-utils$': '<rootDir>/../../libs/frontend/utils/src/index.ts',
    '^@einvoice/types$': '<rootDir>/../../libs/shared/types/src/index.ts',
  },
};
