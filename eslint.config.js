import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["dist", "node_modules", ".wrangler", "playwright-report", "test-results"] },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}", "ui-test/**/*.{js,jsx}"],
    plugins: { react, "react-hooks": reactHooks },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      "react/prop-types": "off",
    },
  },
  {
    files: ["functions/**/*.js", "test/**/*.js", "e2e/**/*.js", "*.config.js"],
    languageOptions: { globals: { ...globals.node, ...globals.browser, ...globals.serviceworker } },
  },
];
