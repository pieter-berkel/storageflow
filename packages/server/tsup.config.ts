import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts", "src/next/index.ts", "src/provider/aws/index.ts"],
  format: ["esm"],
  dts: true,
  clean: !options.watch,
  minify: !options.watch,
}));
