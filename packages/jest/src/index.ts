export { default as FirestoreEmulatorEnvironment } from "./environment/node";
export * from "./types";

import type { FirestoreState } from "@firestore-emulator/server";

declare global {
  var emulator: {
    host: string;
    port: number;
    state: FirestoreState;
  };
}
