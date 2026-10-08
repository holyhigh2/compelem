import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import dts from 'vite-plugin-dts'

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8')
)

/**
 * myfx 在 UMD/全局环境下的实际挂载名
 */
const MYFX_GLOBAL = 'myff'

/** 与 rollup-plugin-banner2 等价的 banner（含构建时间戳） */
const makeBanner = () => `/**
 * ${pkg.name} v${pkg.version}.${Math.floor(Date.now() / 1000)}
 * ${pkg.description}
 * @${pkg.author}
 * ${pkg.repository.url}
 */
`

/**
 * 消除 process.env.DEV 引用
 */
const replaceDevFlag = (value: boolean): Plugin => {
  const target = 'process.env.DEV'
  const replacement = String(value)
  return {
    name: 'compelem:replace-dev-flag',
    enforce: 'pre',
    transform(code, id) {
      if (!code.includes(target)) return null
      if (id.includes('node_modules')) return null
      return { code: code.replaceAll(target, replacement), map: null }
    },
  }
}

/**
 * 压缩后注入 banner
 */
const bannerPlugin = (banner: string, outDir: string): Plugin => ({
  name: 'compelem:banner',
  enforce: 'post',
  writeBundle() {
    const dir = fileURLToPath(new URL(`./${outDir}/`, import.meta.url))
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.js')) continue
      const p = join(dir, name)
      const code = readFileSync(p, 'utf-8')
      if (code.startsWith(banner)) continue
      // 去掉可能残留的旧 banner / legal comments，再前置正确 banner
      const body = code.replace(/^\/\*\*[\s\S]*?\*\/\s*/, '')
      writeFileSync(p, banner + body, 'utf-8')
    }
  },
})

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'
  const outDir = isProd ? 'dist' : 'dist-dev'

  /** esm/cjs 通用输出项 */
  const baseOutput = [
    { format: 'es' as const, entryFileNames: 'index.esm.js' },
    { format: 'cjs' as const, entryFileNames: 'index.cjs.js' },
  ]

  /** dev 额外产出 UMD（与 rollup 原配置一致） */
  const devExtraOutput = {
    format: 'umd' as const,
    entryFileNames: 'compelem.umd.js',
    // 全局变量名：浏览器直连时挂到 window.compelem
    name: 'compelem',
    // myfx 为外部依赖，UMD 下需显式声明其全局名（myfx 实际挂载为 myff）
    globals: { myfx: MYFX_GLOBAL },
  }

  return {
    // 库构建不做语法降级，与 rollup 原配置一致（ESNext）
    target: 'esnext',
    build: {
      outDir,
      emptyOutDir: true,
      // 仅提供 entry；具体格式与文件名由 rollupOptions.output 决定（prod 2 种 / dev 3 种）
      lib: {
        entry: 'src/index.ts',
      },
      rollupOptions: {
        external: ['myfx'],
        output: isProd ? baseOutput : [...baseOutput, devExtraOutput],
      },
      // prod 用 terser 压缩并剔除调试日志（等价原 @rollup/plugin-terser 配置）
      minify: isProd ? 'terser' : false,
      terserOptions: isProd
        ? { compress: { drop_console: ['debug', 'info', 'log'] } }
        : undefined,
      sourcemap: false,
    },
    esbuild: {
      // 保留类名：@tag 依赖 target.name 注册 DefinitionTagMap
      keepNames: true,
      legalComments: 'none',
    },
    plugins: [
      replaceDevFlag(!isProd),
      bannerPlugin(makeBanner(), outDir),
      dts({
        outDir,
        // 与 tsc 的 declarationDir 行为对齐：逐个模块输出声明，不做 rollup 式打包
        rollupTypes: false,
        include: ['src'],
        copyDtsFiles: true,
      }),
    ],
    optimizeDeps: { exclude: ['myfx'] },
  }
})
