// rollup.config.mjs
import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import { globSync } from 'glob';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import terser from '@rollup/plugin-terser';
import  dts from 'rollup-plugin-dts';
import nodePolyfills from 'rollup-plugin-polyfill-node';

/** @type {import("rollup").RollupOptions[]} */
export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.browser.js',
        format: 'iife',
        name: 'quicktype',
        intro: 'var global = window; var process = {env:{}};',
      },
    ],
    plugins: [
        commonjs({esmExternals:true}),
        nodePolyfills({
            include: ['buffer', 'stream', 'util', 'events', 'assert', 'http', 'https', 'url', 'zlib', 'os', 'path', 'fs', 'tty', 'net', 'crypto', 'dns', 'querystring', 'string_decoder', 'punycode', 'process', 'timers', 'console', 'constants', 'vm', 'domain', 'http2', 'perf_hooks', 'worker_threads', 'async_hooks', 'trace_events', ],
        }),
        nodeResolve({
            allowExportsFolderMapping: true,
            browser: true,
        }),
        typescript({declaration:true, declarationDir:'types'}),
    ],
  },
];
