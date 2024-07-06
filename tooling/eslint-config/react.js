/** @type {import('eslint').Linter.Config} */
const config = {
  extends: ["plugin:react/recommended", "plugin:react-hooks/recommended"],
  env: {
    browser: true,
  },
  globals: {
    React: "writable",
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};

module.exports = config;
