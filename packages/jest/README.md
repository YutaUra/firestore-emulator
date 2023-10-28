# `@firestore-emulator/jest`

This package contains a [`Jest`](https://jestjs.io/) environment for setup `@firestore-emulator/server`.

## Installation

```sh
npm install @firestore-emulator/jest
```

## Usage

configure your `jest.config.js`:

```js
module.exports = {
  testEnvironment: '@firestore-emulator/jest/environment/node',
  // or "@firestore-emulator/jest/environment/quramy__jest-prisma" if you use prisma. you should install "@quramy/jest-prisma" too.
}
```

currently, other environments like `jsdom` are not supported yet.
if you need them, please open an issue.

if you use `TypeScript` you can also load `types` of your `tsconfig.json` from this package:

```json
{
  "compilerOptions": {
    "types": ["@firestore-emulator/jest"]
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
