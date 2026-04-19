module.exports = {
  displayName: 'mock-data',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  moduleNameMapper: {
    '^@einvoice/types$': '<rootDir>/../types/src/index.ts',
  },
  coverageDirectory: '../../../coverage/libs/shared/mock-data',
};
