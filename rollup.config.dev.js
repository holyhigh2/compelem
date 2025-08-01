/* eslint-disable max-len */
import json from '@rollup/plugin-json'
import replace from '@rollup/plugin-replace'
import banner2 from 'rollup-plugin-banner2'
import clear from 'rollup-plugin-clear'
import copy from 'rollup-plugin-copy'
import scss from 'rollup-plugin-scss'
import typescript from 'rollup-plugin-typescript2'
const pkg = require('./package.json')

export default [
  {
    input: 'src/index.ts',
    external: ['myfx'],
    plugins: [
      clear({
        targets: ['dist'],
      }),
      replace({
        preventAssignment: true,
        'process.env.DEV': true
      }),
      typescript(
        {
          compilerOptions: {
            target: "ES2017",
          },
          clean: true
        }),
      scss({ output: false }),
      banner2(
        () => `/**
   * ${pkg.name} v${pkg.version}.${Math.floor(Date.now() / 1000)}
   * ${pkg.description}
   * @${pkg.author}
   * ${pkg.repository.url}
   */
  `
      ),
      json(),
      copy({
        targets: [
          {
            src: [
              'CHANGELOG.md',
              'LICENSE',
              'README.md',
              'package.json',
              '.npmignore',
            ],
            dest: 'dist',
          },
        ],
      }),
    ],
    output: [
      {
        file: 'dist/index.js',
        format: 'esm'
      },
      {
        file: 'dist/compelem.umd.js',
        format: 'umd',
        name: 'compelem'
      }
    ],
  }
]