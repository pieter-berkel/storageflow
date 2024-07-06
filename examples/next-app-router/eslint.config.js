/** @type {import("eslint").Linter.Config} */
const config = {
  root: true,
  extends: [
    "@storageflow/eslint-config/base",
    "@storageflow/eslint-config/nextjs",
  ],
};

module.exports = config;
