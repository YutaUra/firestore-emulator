import packageJson from "./package.json" assert { type: "json" };
import { defineConfig } from "vite";
import { resolve, relative, dirname, join } from "node:path";
import { glob } from "glob";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      formats: ["es", "cjs"],
      entry: glob.sync(resolve(__dirname, "generated/**/*.ts")),
    },
    target: "esnext",
    minify: false,
    rollupOptions: {
      external: Object.keys(packageJson.dependencies),
      output: {
        preserveModules: true,
      },
    },
  },
  plugins: [dts()],
});
