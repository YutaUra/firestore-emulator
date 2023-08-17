import { JestConfigWithTsJest } from 'ts-jest'

export default {
  transform: {
    '^.+\\.test.ts?$': [
      'ts-jest',
      {
        diagnostics: {
          exclude: ['**'],
        },
      },
    ],
  },
  testEnvironment: '@firestore-emulator/jest/environment/node',
} satisfies JestConfigWithTsJest
