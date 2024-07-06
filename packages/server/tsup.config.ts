import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: [
    "src/index.ts",
    "src/adapter/next/app/index.ts",
    "src/provider/aws/index.ts",
    "src/router/next/app/index.ts",
  ],
  format: ["esm"],
  dts: true,
  clean: !options.watch,
  minify: !options.watch,
}));
