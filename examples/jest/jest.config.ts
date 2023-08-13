import { JestConfigWithTsJest } from "ts-jest";

export default {
  preset: "ts-jest",
  testEnvironment: "@firestore-emulator/jest/environment/node",
} satisfies JestConfigWithTsJest;
