export * from "./types";
export { default as FirestoreEmulatorEnvironment } from "./environment/node";
import type { FirestoreState } from "@firestore-emulator/server";

declare global {
  var emulator: {
    host: string;
    port: number;
    state: FirestoreState;
  };
}
