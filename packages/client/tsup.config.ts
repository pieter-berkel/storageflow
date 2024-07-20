import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts", "src/react/index.ts"],
  format: ["esm"],
  dts: true,
  external: ["react"],
  clean: !options.watch,
  minify: !options.watch,
}));
