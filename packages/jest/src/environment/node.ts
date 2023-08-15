import { TestEnvironment } from "jest-environment-node";
import { EnvironmentContext } from "@jest/environment";
import { FirestoreServer } from "@firestore-emulator/server";
import { FirestoreEmulatorEnvironmentOptions } from "../types";
import { findFreePorts } from "find-free-ports";

export default class FirestoreEmulatorEnvironment extends TestEnvironment {
  private server: FirestoreServer;

  constructor(
    config: FirestoreEmulatorEnvironmentOptions,
    context: EnvironmentContext
  ) {
    super(config, context);
    this.server = new FirestoreServer();
  }

  override async setup() {
    await super.setup();

    const tryCount = 0;
    while (tryCount < 50) {
      const [port] = await findFreePorts(1);
      if (!port) throw new Error("Could not find a free port");
      try {
        await this.server.start(port);
        this.global.emulator = {
          state: this.server.state,
          host: `0.0.0.0:${port}`,
          port,
        };
        return;
      } catch (err) {
        if (!(err instanceof Error)) throw err;
        if (!err.message.startsWith("No address added out of total")) throw err;
        continue;
      }
    }
    throw new Error("Could not find a free port");
  }

  override async teardown() {
    await this.server.stop();
    await super.teardown();
  }
}
