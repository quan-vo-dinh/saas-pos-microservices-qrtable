module.exports = {
  displayName: 'management-app',
  preset: '../../jest.preset.js',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/apps/management-app',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@einvoice/frontend-utils$': '<rootDir>/../../libs/frontend/utils/src/index.ts',
    '^@einvoice/types$': '<rootDir>/../../libs/shared/types/src/index.ts',
  },
};
