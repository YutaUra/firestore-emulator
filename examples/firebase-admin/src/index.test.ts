import { initializeApp } from "firebase-admin/app";
import {
  Firestore,
  initializeFirestore,
  Timestamp,
  GeoPoint,
} from "firebase-admin/firestore";
import fetch from "node-fetch";
import { getSeconds } from "date-fns";
import assert from "assert";

expect.extend({
  toBeCloseToTimestamp(
    received: Timestamp | undefined,
    expected: Timestamp | undefined
  ) {
    if (!received)
      return { pass: false, message: () => "received is undefined" };
    if (!expected)
      return { pass: false, message: () => "expected is undefined" };
    return {
      pass:
        Math.abs(
          getSeconds(received.toDate()) - getSeconds(expected.toDate())
        ) < 5,
      message: () =>
        `expected ${received.toDate().getTime() / 1000} to be close to ${
          expected.toDate().getTime() / 1000
        }`,
    };
  },
});

let realFirestore: Firestore;
let firestore: Firestore;
process.env["GCLOUD_PROJECT"] = "test-project";

beforeAll(() => {
  const realEmulator = initializeApp(
    { projectId: process.env["GCLOUD_PROJECT"] },
    "firebase-emulator"
  );
  const firestoreEmulator = initializeApp(
    { projectId: process.env["GCLOUD_PROJECT"] },
    "firestore-emulator"
  );

  process.env["FIRESTORE_EMULATOR_HOST"] = "localhost:8081";
  realFirestore = initializeFirestore(realEmulator);
  process.env["FIRESTORE_EMULATOR_HOST"] = emulator.host;
  firestore = initializeFirestore(firestoreEmulator);
});

beforeEach(async () => {
  emulator.state.clear();

  await fetch(
    `http://localhost:8081/emulator/v1/projects/${process.env["GCLOUD_PROJECT"]}/databases/(default)/documents`,
    { method: "DELETE" }
  );
});

const testCase = async <T>(
  handler: (db: Firestore, isEmulator: boolean) => Promise<T>
) => {
  return await Promise.allSettled([
    handler(realFirestore, false),
    handler(firestore, true),
  ]);
};

it(
  "can create document",
  async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      const result = await db.collection("users").doc("alice").create({
        name: "Alice",
      });
      return result;
    });
    if (realResult.status === "rejected") throw realResult.reason;
    if (emulatorResult.status === "rejected") throw emulatorResult.reason;

    expect(emulatorResult.value.writeTime).toBeCloseToTimestamp(
      realResult.value.writeTime
    );
    expect(emulator.state.toJSON()).toMatchSnapshot();

    const [realDoc, emulatorDoc] = await testCase(async (db) => {
      const doc = await db.collection("users").doc("alice").get();
      return doc;
    });
    if (realDoc.status === "rejected") throw realDoc.reason;
    if (emulatorDoc.status === "rejected") throw emulatorDoc.reason;

    expect(emulatorDoc.value.data()).toEqual(realDoc.value.data());
    expect(emulatorDoc.value.exists).toEqual(realDoc.value.exists);
    expect(emulatorDoc.value.createTime).toBeCloseToTimestamp(
      realDoc.value.createTime
    );
    expect(emulatorDoc.value.updateTime).toBeCloseToTimestamp(
      realDoc.value.updateTime
    );
  },
  1000 * 60
);

it("can update document", async () => {
  const [realResult, emulatorResult] = await testCase(async (db) => {
    await db.collection("users").doc("alice").create({
      name: "Alice",
    });
    const result = await db.collection("users").doc("alice").update({
      name: "Bob",
    });
    return result;
  });
  if (realResult.status === "rejected") throw realResult.reason;
  if (emulatorResult.status === "rejected") throw emulatorResult.reason;

  expect(emulatorResult.value.writeTime).toBeCloseToTimestamp(
    realResult.value.writeTime
  );
  expect(emulator.state.toJSON()).toMatchSnapshot();

  const [realDoc, emulatorDoc] = await testCase(async (db) => {
    const doc = await db.collection("users").doc("alice").get();
    return doc;
  });
  if (realDoc.status === "rejected") throw realDoc.reason;
  if (emulatorDoc.status === "rejected") throw emulatorDoc.reason;

  expect(emulatorDoc.value.data()).toEqual(realDoc.value.data());
  expect(emulatorDoc.value.exists).toEqual(realDoc.value.exists);
  expect(emulatorDoc.value.createTime).toBeCloseToTimestamp(
    realDoc.value.createTime
  );
  expect(emulatorDoc.value.updateTime).toBeCloseToTimestamp(
    realDoc.value.updateTime
  );
});

it("could not update document if it does not exist", async () => {
  const [realResult, emulatorResult] = await testCase(async (db) => {
    const result = await db.collection("users").doc("alice").update({
      name: "Alice",
    });
    return result;
  });
  assert(emulatorResult.status === "rejected");
  assert(realResult.status === "rejected");
  expect(emulatorResult.reason).toStrictEqual(realResult.reason);
});

it("can delete document", async () => {
  const [realCreateResult, emulatorCreateResult] = await testCase(
    async (db, isEmulator) => {
      await db.collection("users").doc("alice").create({
        name: "Alice",
      });
      if (isEmulator) {
        console.log("\n\n\n");
        console.log(JSON.stringify(emulator.state.toJSON(), null, 4));
      }
      return db.collection("users").doc("alice").get();
    }
  );
  assert(realCreateResult.status === "fulfilled");
  assert(emulatorCreateResult.status === "fulfilled");
  console.log(emulatorCreateResult.value.data());
  expect(emulatorCreateResult.value.data()).toEqual(
    realCreateResult.value.data()
  );

  expect(emulator.state.toJSON()).toMatchSnapshot();

  const [realDeleteResult, emulatorDeleteResult] = await testCase(
    async (db) => {
      await db.collection("users").doc("alice").delete();
      return db.collection("users").doc("alice").get();
    }
  );
  assert(realDeleteResult.status === "fulfilled");
  assert(emulatorDeleteResult.status === "fulfilled");

  expect(emulator.state.toJSON()).toMatchSnapshot();
  expect(emulatorDeleteResult.value.exists).toBe(realDeleteResult.value.exists);
  expect(emulatorDeleteResult.value.data()).toEqual(
    realDeleteResult.value.data()
  );
  expect(emulatorDeleteResult.value.createTime).toBe(
    realDeleteResult.value.createTime
  );
  expect(emulatorDeleteResult.value.updateTime).toBe(
    realDeleteResult.value.updateTime
  );
});

it("can set document", async () => {
  const [realResult, emulatorResult] = await testCase(async (db) => {
    const result = await db.collection("users").doc("alice").set({
      name: "Alice",
    });
    return result;
  });
  assert(realResult.status === "fulfilled");
  assert(emulatorResult.status === "fulfilled");
  expect(emulatorResult.value.writeTime).toBeCloseToTimestamp(
    realResult.value.writeTime
  );
  expect(emulator.state.toJSON()).toMatchSnapshot();

  const [realDoc, emulatorDoc] = await testCase(async (db) => {
    const doc = await db.collection("users").doc("alice").get();
    return doc;
  });
  if (realDoc.status === "rejected") throw realDoc.reason;
  if (emulatorDoc.status === "rejected") throw emulatorDoc.reason;

  expect(emulatorDoc.value.data()).toEqual(realDoc.value.data());
  expect(emulatorDoc.value.exists).toEqual(realDoc.value.exists);
  expect(emulatorDoc.value.createTime).toBeCloseToTimestamp(
    realDoc.value.createTime
  );
  expect(emulatorDoc.value.updateTime).toBeCloseToTimestamp(
    realDoc.value.updateTime
  );
});

describe("field type", () => {
  it("string", async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db.collection("users").doc("alice").set({
        name: "Alice",
      });
      return db.collection("users").doc("alice").get();
    });
    assert(realResult.status === "fulfilled");
    assert(emulatorResult.status === "fulfilled");
    expect(emulatorResult.value.data()).toEqual(realResult.value.data());
    expect(emulator.state.toJSON()).toMatchSnapshot();
  });

  it("number", async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db.collection("users").doc("alice").set({
        age: 20,
      });
      return db.collection("users").doc("alice").get();
    });
    assert(realResult.status === "fulfilled");
    assert(emulatorResult.status === "fulfilled");
    expect(emulatorResult.value.data()).toEqual(realResult.value.data());
    expect(emulator.state.toJSON()).toMatchSnapshot();
  });

  it("boolean", async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db.collection("users").doc("alice").set({
        isAdult: true,
      });
      return db.collection("users").doc("alice").get();
    });
    assert(realResult.status === "fulfilled");
    assert(emulatorResult.status === "fulfilled");
    expect(emulatorResult.value.data()).toEqual(realResult.value.data());
    expect(emulator.state.toJSON()).toMatchSnapshot();
  });

  it("null", async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db.collection("users").doc("alice").set({
        address: null,
      });
      return db.collection("users").doc("alice").get();
    });
    assert(realResult.status === "fulfilled");
    assert(emulatorResult.status === "fulfilled");
    expect(emulatorResult.value.data()).toEqual(realResult.value.data());
    expect(emulator.state.toJSON()).toMatchSnapshot();
  });

  it("array", async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db
        .collection("users")
        .doc("alice")
        .set({
          favoriteFruits: ["apple", "banana"],
        });
      return db.collection("users").doc("alice").get();
    });
    assert(realResult.status === "fulfilled");
    assert(emulatorResult.status === "fulfilled");
    expect(emulatorResult.value.data()).toEqual(realResult.value.data());
    expect(emulator.state.toJSON()).toMatchSnapshot();
  });

  it("map", async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db
        .collection("users")
        .doc("alice")
        .set({
          address: {
            zipCode: "123-4567",
            city: "Tokyo",
          },
        });
      return db.collection("users").doc("alice").get();
    });
    assert(realResult.status === "fulfilled");
    assert(emulatorResult.status === "fulfilled");
    expect(emulatorResult.value.data()).toEqual(realResult.value.data());
    expect(emulator.state.toJSON()).toMatchSnapshot();
  });

  it("timestamp", async () => {
    const date = new Date("2020-01-01T00:00:00.000Z");
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db.collection("users").doc("alice").set({
        createdAt: date,
      });
      return db.collection("users").doc("alice").get();
    });
    assert(realResult.status === "fulfilled");
    if (emulatorResult.status === "rejected") throw emulatorResult.reason;
    assert(emulatorResult.status === "fulfilled");
    expect(emulatorResult.value.data()).toEqual(realResult.value.data());
    expect(emulator.state.toJSON()).toMatchSnapshot();
  });

  it("geopoint", async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db
        .collection("users")
        .doc("alice")
        .set({
          location: new GeoPoint(35.681236, 139.767125),
        });
      return db.collection("users").doc("alice").get();
    });
    assert(realResult.status === "fulfilled");
    assert(emulatorResult.status === "fulfilled");
    expect(emulatorResult.value.data()).toEqual(realResult.value.data());
    expect(emulator.state.toJSON()).toMatchSnapshot();
  });

  it("reference", async () => {
    const [realResult, emulatorResult] = await testCase(
      async (db, isEmulator) => {
        await db
          .collection("users")
          .doc("alice")
          .set({
            friend: db.collection("users").doc("bob"),
          });
        if (isEmulator) {
          expect(emulator.state.toJSON()).toMatchSnapshot();
        }
        return db.collection("users").doc("alice").get();
      }
    );
    assert(realResult.status === "fulfilled");
    assert(emulatorResult.status === "fulfilled");
    // reference type cannot be compared, so convert to JSON and compare
    expect(JSON.stringify(emulatorResult.value.data())).toStrictEqual(
      JSON.stringify(realResult.value.data())
    );
    expect(emulator.state.toJSON()).toMatchSnapshot();
  });

  it("map in map", async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db
        .collection("users")
        .doc("alice")
        .set({
          address: {
            zipCode: {
              prefix: "123",
              postfix: "4567",
            },
          },
        });
      return db.collection("users").doc("alice").get();
    });
    assert(realResult.status === "fulfilled");
    assert(emulatorResult.status === "fulfilled");
    expect(emulatorResult.value.data()).toEqual(realResult.value.data());
    expect(emulator.state.toJSON()).toMatchSnapshot();
  });

  it("map in array", async () => {
    const [realResult, emulatorResult] = await testCase(async (db) => {
      await db
        .collection("users")
        .doc("alice")
        .set({
          favoriteFruits: [
            {
              name: "apple",
              color: "red",
            },
            {
              name: "banana",
              color: "yellow",
            },
          ],
        });
      return db.collection("users").doc("alice").get();
    });
    assert(realResult.status === "fulfilled");
    assert(emulatorResult.status === "fulfilled");

    expect(emulatorResult.value.data()).toEqual(realResult.value.data());
    expect(emulator.state.toJSON()).toMatchSnapshot();
  });
});
