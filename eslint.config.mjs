import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "node_modules",
      "build",
      "dist",
      ".vite",
      "coverage",
      "public",
      "*.min.js",
      "*.min.css",
    ],
  },

  // Base JS recommended rules (for config files such as this flat config)
  js.configs.recommended,

  // TypeScript recommended rules (applies to .ts/.tsx)
  ...tseslint.configs.recommended,

  // React + hooks + refresh for TypeScript source files
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "react/prop-types": "off",
    },
  },

  // Test files: enable Vitest/Jest globals
  {
    files: ["src/**/*.test.{ts,tsx}", "src/setupTests.ts"],
    languageOptions: {
      globals: {
        ...globals.jest,
        vi: "readonly",
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        beforeEach: "readonly",
        afterAll: "readonly",
        afterEach: "readonly",
      },
    },
  },

  // Node-context config files
  {
    files: ["*.config.{js,ts}", "vite.config.{js,ts}"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
