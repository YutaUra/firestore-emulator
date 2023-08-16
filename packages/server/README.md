# `@firestore-emulator/server`

This package is the implementation of the Firestore emulator. It is a Node.js

## Installation

```sh
npm install @firestore-emulator/server
```

## Usage

```ts
import { FirestoreServer } from "@firestore-emulator/server";

const server = new FirestoreServer();
await this.server.start(8080);
// now you can connect to the emulator at localhost:8080
```

## API

### `FirestoreServer`

#### `state`

The current state of the emulator.

see below: `FirestoreState`

### `FirestoreState`

### `toJSON()`

emits a JSON representation of the state.

for example, you can use the firestore data for snapshot testing:

```ts
expect(server.state.toJSON()).toMatchSnapshot();
```
