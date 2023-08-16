# Firestore Emulator implementation in Node.js

Tired of testing Firestore using the Firebase emulator?

Using the Firebase emulator requires Java environment, which is cumbersome, and you can't specify ports, so you can't run them in parallel.

When using Docker, the overhead becomes significant, making it very slow.

This package implements Firestore emulator using Node.js, aiming to accelerate testing.

Since this package is tested using the Firebase emulator, it aims to behave the same way as the Firebase emulator.

## Installation

```sh
npm install @firestore-emulator/jest
```

## Usage

Configure your `jest.config.js` as follows:

```js
module.exports = {
  testEnvironment: "@firestore-emulator/jest/environment/node",
};
```

If you're using TypeScript, configure your `tsconfig.json` like this:

```json
{
  "compilerOptions": {
    "types": ["@firestore-emulator/jest"]
  }
}
```

You'll have access to the global variable `emulator` within your tests.

```ts
import { initializeApp, App } from "firebase-admin/app";
import { Firestore, initializeFirestore } from "firebase-admin/firestore";

let firestore: Firestore;
process.env["GCLOUD_PROJECT"] = "test-project";
beforeAll(() => {
  // for firebase-admin, you need to set the environment variable `FIRESTORE_EMULATOR_HOST`
  process.env["FIRESTORE_EMULATOR_HOST"] = emulator.host;
  const app = initializeApp();
  firestore = initializeFirestore(firestoreEmulator);
});

// you can clear the state of the emulator before each test
beforeEach(() => {
  emulator.state.clear();
});
```

## Miscellaneous

This package is still in development.
If you encounter issues or have requests, please open an issue to let us know!

If you find this helpful, consider giving it a star.
Also, since I'm developing this while sipping coffee, I'd appreciate your support on [GitHub Sponsors]() if you're willing.
