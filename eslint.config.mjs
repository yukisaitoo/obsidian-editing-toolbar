import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["main.js", "node_modules/**", "*.config.js", "*.config.mjs"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      // High-volume in this (forked) codebase — surfaced as warnings, not blockers.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/ban-ts-comment": "warn",
      "no-empty": ["warn", { allowEmptyCatch: true }],
      // The codebase deliberately uses `guard && sideEffect()` and ternaries for
      // control flow — allow those rather than rewrite hundreds of call sites.
      "@typescript-eslint/no-unused-expressions": [
        "error",
        { allowShortCircuit: true, allowTernary: true },
      ],
      // Regex escapes are easy to break by bulk-stripping; surface as warnings.
      "no-useless-escape": "warn",
      // Behavior-sensitive `this`-forwarding utility (throttle) — warn, don't block.
      "@typescript-eslint/no-this-alias": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",
    },
  },
);
