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
    return new Promise((resolve, reject) => {
      this.server.tryShutdown((err) => {
        if (err) {
          return reject(err);
        }
        resolve(undefined);
      });
    });
  }
}

// if (import.meta.vitest) {
//   const { ServerCredentials } = await import("@grpc/grpc-js");
//   const { Firestore } = await import("@google-cloud/firestore");
//   const { it, expect, beforeAll, beforeEach } = import.meta.vitest;

//   let server: FirestoreServer;
//   let client: import("@google-cloud/firestore").Firestore;

//   beforeAll(async () => {
//     server = new FirestoreServer();

//     await new Promise((resolve, reject) =>
//       server.bindAsync(
//         `localhost:23456`,
//         ServerCredentials.createInsecure(),
//         (err, port) => {
//           if (err) {
//             return reject(err);
//           }
//           server.start();
//           process.env["FIRESTORE_EMULATOR_HOST"] = `localhost:${port}`;
//           client = new Firestore();
//           resolve(null);
//         }
//       )
//     );
//   });

//   beforeEach(async () => {
//     server.state.clear();
//   });

//   it("can get document", async () => {
//     const doc = await client.collection("test").doc("test").get();
//     expect(doc.exists).toBe(false);
//     expect(server.state.toJSON()).matchSnapshot();
//   });

//   it("can create document", async () => {
//     const doc = await client
//       .collection("test")
//       .doc("test")
//       .create({ foo: "bar" });
//     expect(doc.writeTime).toBeDefined();
//     expect(server.state.toJSON()).matchSnapshot();
//   });

//   it("get document after create", async () => {
//     await client.collection("test").doc("test").create({ foo: "bar" });
//     const doc = await client.collection("test").doc("test").get();
//     expect(doc.exists).toBe(true);
//     expect(doc.data()).toEqual({ foo: "bar" });
//     expect(server.state.toJSON()).matchSnapshot();
//   });

//   it("can update document", async () => {
//     await client.collection("test").doc("test").create({ foo: "bar" });
//     const doc = await client
//       .collection("test")
//       .doc("test")
//       .update({ foo: "baz" });
//     expect(doc.writeTime).toBeDefined();

//     const doc2 = await client.collection("test").doc("test").get();
//     expect(doc2.exists).toBe(true);
//     expect(doc2.data()).toEqual({ foo: "baz" });
//     expect(server.state.toJSON()).matchSnapshot();
//   });

//   it("can delete document", async () => {
//     await client.collection("test").doc("test").create({ foo: "bar" });
//     const doc = await client.collection("test").doc("test").delete();
//     expect(doc.writeTime).toBeDefined();

//     const doc2 = await client.collection("test").doc("test").get();
//     expect(doc2.exists).toBe(false);
//     expect(server.state.toJSON()).matchSnapshot();
//   });

//   it("can set document", async () => {
//     await client.collection("test").doc("test").set({ foo: "bar" });
//     const doc = await client.collection("test").doc("test").get();
//     expect(doc.exists).toBe(true);
//     expect(doc.data()).toEqual({ foo: "bar" });
//     expect(server.state.toJSON()).matchSnapshot();
//   });

//   it("can set document with merge", async () => {
//     await client.collection("test").doc("test").set({ foo: "bar" });
//     await client
//       .collection("test")
//       .doc("test")
//       .set({ bar: "baz" }, { merge: true });
//     const doc = await client.collection("test").doc("test").get();
//     expect(doc.exists).toBe(true);
//     expect(doc.data()).toEqual({ foo: "bar", bar: "baz" });
//     expect(server.state.toJSON()).matchSnapshot();
//   });

//   it(
//     "can list documents",
//     async () => {
//       await client.collection("test").doc("test").set({ foo: "bar1" });
//       await client.collection("test").doc("test2").set({ foo: "bar2" });
//       await client.collection("test").doc("test3").set({ foo: "bar3" });
//       const query = await client.collection("test").get();
//       expect(query.docs.length).toBe(3);
//       expect(query.docs.map((doc) => doc.data())).toEqual(
//         expect.arrayContaining([
//           expect.objectContaining({ foo: "bar1" }),
//           expect.objectContaining({ foo: "bar2" }),
//           expect.objectContaining({ foo: "bar3" }),
//         ])
//       );
//       expect(server.state.toJSON()).matchSnapshot();
//     },
//     1000 * 30
//   );

//   it("can list documents with where", async () => {
//     await client.collection("test").doc("test").set({ foo: "bar1" });
//     await client.collection("test").doc("test2").set({ foo: "bar2" });
//     await client.collection("test").doc("test3").set({ foo: "bar3" });
//     const query = await client
//       .collection("test")
//       .where("foo", "==", "bar2")
//       .get();
//     expect(query.docs.length).toBe(1);
//     expect(query.docs.map((doc) => doc.data())).toEqual(
//       expect.arrayContaining([expect.objectContaining({ foo: "bar2" })])
//     );
//     expect(server.state.toJSON()).matchSnapshot();
//   });
// }
