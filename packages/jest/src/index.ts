export * from "./types";
export * from "./environment/node";
import { FirestoreState } from "@firestore-emulator/server";

declare global {
  var emulator: {
    state: FirestoreState;
    host: string;
    port: number;
  };
}
