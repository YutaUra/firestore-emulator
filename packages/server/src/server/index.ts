import { Server, ServerCredentials } from "@grpc/grpc-js";
import { FirestoreServiceV1Impl } from "./FirestoreServiceV1Impl";
import { FirestoreState } from "../FirestoreState";

export class FirestoreServer {
  state: FirestoreState;
  private readonly server: Server;
  constructor() {
    this.server = new Server();

    this.state = new FirestoreState();
    this.server.addService(
      FirestoreServiceV1Impl.definition,
      new FirestoreServiceV1Impl(this.state)
    );
  }

  async start(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.bindAsync(
        `0.0.0.0:${port}`,
        ServerCredentials.createInsecure(),
        (err) => {
          if (err) {
            return reject(err);
          }
          this.server.start();
          resolve(undefined);
        }
      );
    });
  }

  async stop(): Promise<void> {
    this.server.forceShutdown();
  }
}
