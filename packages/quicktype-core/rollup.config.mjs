// rollup.config.mjs
import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import { globSync } from 'glob';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import("rollup").RollupOptions[]} */
export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        sourcemap: true,
      },
      {
        file: 'dist/index.cjs.js',
        format: 'cjs',
        sourcemap: true,
      },
    ],
    plugins: [
        commonjs({ignoreDynamicRequires: true}),
        nodeResolve({preferBuiltins: true, modulesOnly: true}),
        typescript({}),
    ],
  },
];
