import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "firestore-emulator",
  },
});
