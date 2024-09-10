import type { JestConfigWithTsJest } from "ts-jest";

export default {
  testEnvironment: "@firestore-emulator/jest/environment/node",
  transform: {
    "^.+\\.test.ts?$": [
      "ts-jest",
      {
        diagnostics: {
          exclude: ["**"],
        },
      },
    ],
  },
  watchman: false,
} satisfies JestConfigWithTsJest;
