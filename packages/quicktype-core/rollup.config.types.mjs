// rollup.config.mjs
import { globSync } from 'glob';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import  dts from 'rollup-plugin-dts';

/** @type {import("rollup").RollupOptions[]} */
export default [
  {
    input: 'dist/types/index.d.ts',
    output: [{ file: "dist/quicktype.d.ts", format: "es" }],
    plugins: [dts()],
  }
];
