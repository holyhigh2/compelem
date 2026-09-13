/* eslint-disable max-len */
import json from '@rollup/plugin-json'
import replace from '@rollup/plugin-replace'
import terser from '@rollup/plugin-terser'
import banner2 from 'rollup-plugin-banner2'
import clear from 'rollup-plugin-clear'
import scss from 'rollup-plugin-scss'
import typescript from 'rollup-plugin-typescript2'
const pkg = require('./package.json')

const shared = {
  input: 'src/index.ts',
  external: ['myfx'],
}

const makeBanner = () =>
  banner2(
    () => `/**
 * ${pkg.name} v${pkg.version}.${Math.floor(Date.now() / 1000)}
 * ${pkg.description}
 * @${pkg.author}
 * ${pkg.repository.url}
 */
  `
  )

export default [
  // ===== prod =====
  {
    ...shared,
    plugins: [
      clear({ targets: ['dist'] }),
      replace({ preventAssignment: true, 'process.env.DEV': false }),
      typescript({
        tsconfigOverride: {
          compilerOptions: {
            declaration: true,
            declarationDir: 'dist',
          },
        },
      }),
      scss({ output: false }),
      terser({ compress: { drop_console: ['debug', 'info', 'log'] } }),
      makeBanner(),
      json(),
    ],
    output: [
      { file: 'dist/index.esm.js', format: 'esm' },
      { file: 'dist/index.cjs.js', format: 'cjs' },
    ],
  },

  // ===== dev =====
  {
    ...shared,
    plugins: [
      clear({ targets: ['dist-dev'] }),
      replace({ preventAssignment: true, 'process.env.DEV': true }),
      typescript({
        tsconfigOverride: {
          compilerOptions: {
            declaration: true,
            declarationDir: 'dist-dev',
          },
        },
        clean: true,
      }),
      scss({ output: false }),
      makeBanner(),
      json(),
    ],
    output: [
      { file: 'dist-dev/index.esm.js', format: 'esm' },
      { file: 'dist-dev/index.cjs.js', format: 'cjs' },
      { file: 'dist-dev/compelem.umd.js', format: 'umd', name: 'compelem' },
    ],
  },
]
