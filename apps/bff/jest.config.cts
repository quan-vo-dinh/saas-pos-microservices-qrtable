const path = require('path');

module.exports = {
  displayName: 'bff',
  preset: '../../jest.preset.js',
  testEnvironment: 'allure-jest/node',
  testEnvironmentOptions: {
    resultsDir: path.resolve(__dirname, '../../allure-results'),
  },
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/bff',
};
