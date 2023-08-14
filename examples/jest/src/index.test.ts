import { Firestore } from "@google-cloud/firestore";

describe("can create document", () => {
  process.env["GOOGLE_CLOUD_PROJECT"] = "test-project";
  process.env["FIRESTORE_EMULATOR_HOST"] = emulator.host;
  const db = new Firestore();

  it("can create document", async () => {
    await db.collection("users").doc("alice").set({
      name: "Alice",
    });

    const doc = await db.collection("users").doc("alice").get();

    expect(doc.exists).toBe(true);
    expect(doc.data()).toEqual({
      name: "Alice",
    });
    expect(emulator.state.toJSON()).toMatchSnapshot();

    emulator.state.emitter.removeAllListeners();
  });
});
