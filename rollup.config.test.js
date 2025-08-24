import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
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
    replace({
      preventAssignment: true,
      'process.env.DEV': true
    }),
    typescript({
      clean: true,
      useTsconfigDeclarationDir: true,
    }),
    scss({ output: false }),
    serve({
      open: true,
      port: 8818,
      openPage: '/index.html',
      contentBase: 'test',
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    }),
    livereload({ watch: 'test' }),
    json(),
  ],
  watch: {
    include: 'test/**', // 监视 src 目录下的所有文件
  }
}
];
