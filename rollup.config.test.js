import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';
import scss from 'rollup-plugin-scss';
import serve from 'rollup-plugin-serve';
import typescript from 'rollup-plugin-typescript2';
const pkg = require('./package.json');

export default [{
  input: 'test/index.ts',
  output: {
    file: 'test/compelem.js',
    format: 'umd',
    name: 'compelem',
    banner: `/* ${pkg.name} ${pkg.version} @${pkg.author} ${pkg.repository.url} */`,
  },
  plugins: [
    nodeResolve(),
    typescript({
      clean: true,
      useTsconfigDeclarationDir: true,
    }),
    scss({ output: false }),
    serve({
      open: true,
      port: 8818,
      openPage: '/test/index.html',
      host: 'localhost',
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    }),
    livereload('test'),
    json(),
  ],
}
];
