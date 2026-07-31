import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from '@rollup/plugin-terser';

export default {
  input: "src/plugin/main.ts",
  output: {
    dir: "./dist",
    format: "cjs",
    exports: "default",
  },
  external: [
    "obsidian",
    "@codemirror/state",
    "@codemirror/view",
    "@codemirror/language",
    "@codemirror/autocomplete",
    "@codemirror/commands",
    "@codemirror/search",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
  ],
  plugins: [
    // Rollup 4's @rollup/plugin-typescript requires rootDir/outDir to line up
    // with the output `dir`; keep them here rather than in tsconfig so the
    // `tsc --noEmit` typecheck script stays emit-agnostic.
    typescript({ rootDir: "src", outDir: "./dist" }),
    nodeResolve({
      browser: true,
    }),
    commonjs({ include: "node_modules/**" }),
    terser(),
  ],
};
