import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: [
    "src/index.ts",
    "src/adapters/index.ts",
    "src/providers/index.ts",
    "src/clients/index.ts",
  ],
  format: ["esm", "cjs"],
  dts: true,
  clean: !options.watch,
  minify: !options.watch,
}));
