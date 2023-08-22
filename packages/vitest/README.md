# `vitest-environment-firestore-emulator`

This package contains a [`vitest`](https://vitest.dev/) environment for setup `@firestore-emulator/server`.

## Installation

```sh
npm install vitest-environment-firestore-emulator
```

## Usage

configure your `vitest.config.js`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'firestore-emulator',
  },
})
```

if you want to use `jsdom` as the test environment, you can use:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'firestore-emulator',
    environmentOptions: {
      'firestore-emulator': {
        baseEnv: 'jsdom',
      },
    },
  },
})
```

if you use `TypeScript` you can also load `types` of your `tsconfig.json` from this package:

```json
{
  "compilerOptions": {
    "types": ["vitest-environment-firestore-emulator"]
  }
}
```

then, you can use the `emulator` global in your tests:

```ts
import { initializeApp, App } from 'firebase-admin/app'
import { Firestore, initializeFirestore } from 'firebase-admin/firestore'

let firestore: Firestore
process.env['GCLOUD_PROJECT'] = 'test-project'
beforeAll(() => {
  // for firebase-admin, you need to set the environment variable `FIRESTORE_EMULATOR_HOST`
  process.env['FIRESTORE_EMULATOR_HOST'] = emulator.host
  const app = initializeApp()
  firestore = initializeFirestore(firestoreEmulator)
})

// you can clear the state of the emulator before each test
beforeEach(() => {
  emulator.state.clear()
})

it('something test you want', async () => {
  await firestore.collection('users').doc('alice').create({ name: 'Alice' })

  // you can snapshot test the state of the emulator
  expect(emulator.state.toJSON()).toMatchSnapshot()
})
```
