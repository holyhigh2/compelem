import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { compelemCompiler } from '../compelem-compiler/dist/vite'

/** 仓库根目录（配置以 ESM 加载，需用 import.meta 取得） */
const root = fileURLToPath(new URL('.', import.meta.url))

/**
 * dev / test 调试服务器配置
 */
const replaceDevFlag = () => ({
  name: 'compelem:dev-flag',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (id.includes('node_modules')) return null
    if (!code.includes('process.env.DEV')) return null
    return { code: code.replaceAll('process.env.DEV', 'true'), map: null }
  },
})

export default defineConfig({
  root,
  // 允许访问仓库根目录（入口会 import ../src 与 node_modules/myfx）
  server: {
    port: 8818,
    open: '/dev/index.html',
    fs: { allow: [root] },
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
  resolve: {
    alias: {
      // 源码入口别名，方便 dev/test 页面统一引用
      compelem: resolve(root, 'src/index.ts'),
    },
  },
  plugins: [
    replaceDevFlag(),
    compelemCompiler({ verbose: true, debugSourceMap: true }),
  ],
  // myfx 是源码依赖，需要被预打包以走 ESM
  optimizeDeps: { include: ['myfx'] },
  // Vite 8 的转换层是 Rolldown(Oxc)，不是 esbuild。
  // legacy 装饰器（tsconfig experimentalDecorators: true）必须显式开启，
  // 否则 Oxc 会按标准装饰器处理，浏览器收到含 `export @tag(...) class` 的产物
  // 直接报 `Unexpected token 'export'`，dev 页面整体无法启动。
  oxc: {
    decorator: { legacy: true },
  },
  esbuild: {
    // 保留类名：@tag 依赖 target.name 注册 DefinitionTagMap
    keepNames: true,
    target: 'esnext',
  },
})
