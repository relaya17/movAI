// Shared ESLint flat-config preset for MoVAI packages/apps.
// The single most important rule here: `any` is banned, no exceptions.
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import jsxA11y from "eslint-plugin-jsx-a11y";

const testFiles = ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/__tests__/**"];

const sharedPlugins = {
  "@typescript-eslint": tsPlugin,
  "jsx-a11y": jsxA11y
};

const syntaxRules = {
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/consistent-type-imports": "error",
  "jsx-a11y/alt-text": "error",
  "jsx-a11y/anchor-is-valid": "error",
  "jsx-a11y/no-autofocus": "warn"
};

/** @type {import('eslint').Linter.Config[]} */
export const baseConfig = [
  // Tests are excluded from package tsconfigs (keeps dist clean) but eslint .
  // still walks them — lint without projectService so we don't need a program.
  {
    files: testFiles,
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    plugins: sharedPlugins,
    rules: syntaxRules
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: testFiles,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: process.cwd(),
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: sharedPlugins,
    rules: {
      ...syntaxRules,

      // --- No `any`, anywhere, ever. Hard error, not a warning. ---
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unsafe-argument": "error",

      // --- Correctness ---
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error"
    }
  }
];

export default baseConfig;
