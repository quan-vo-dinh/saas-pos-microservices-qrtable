const path = require('path');

module.exports = {
  displayName: 'user-access',
  preset: '../../jest.preset.js',
  testEnvironment: 'allure-jest/node',
  testEnvironmentOptions: {
    resultsDir: path.resolve(__dirname, '../../allure-results'),
  },
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'html'],
  coverageDirectory: '../../coverage/apps/user-access',
};
