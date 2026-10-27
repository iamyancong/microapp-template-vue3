import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import qiankun from 'vite-plugin-qiankun';
import { viteMockServe } from 'vite-plugin-mock';
import { resolve } from 'path';
import { createYssUiPlugin } from './vite-plugins/yssUi';
import { createQiankunCssReusePlugin } from './vite-plugins/qiankunCssReuse';

const useDevMode = true; // 如果是在主应用中加载子应用vite,必须打开这个,否则vite加载不成功, 单独运行没影响

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, __dirname);
  const subAppName = env.VITE_SUB_APP_NAME;
  const activeRule = env.VITE_ACTIVE_RULE || `/${subAppName}`;
  const apiBase = env.VITE_API_BASE_URL || '/api';
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:3000';
  const isProd = command === 'build';

  // 判断是否独立部署
  const isStandalone = env.VITE_STANDALONE_DEPLOY === 'true';

  // 生产环境：独立部署时使用根路径 '/'，集成到主应用时使用去掉 subApp/ 前缀的子应用路径
  // 本地开发环境：统一使用完整 activeRule 路径作为 base，使本地 URL 与线上主应用菜单路由完全一致
  const cleanActiveRule = (activeRule || '').replace(/^\//, '').replace(/^subApp\//, '');
  const normalizeBase = (rule: string) => {
    const withLeading = rule.startsWith('/') ? rule : `/${rule}`;
    return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
  };
  const base = isProd ? (!isStandalone ? `/${cleanActiveRule}/` : '/') : normalizeBase(activeRule);

  return {
    base: base,
    plugins: [
      createYssUiPlugin(),
      createQiankunCssReusePlugin(),
      vue(),
      qiankun(subAppName, {
        useDevMode,
      }),
      viteMockServe({
        mockPath: 'mock',
        enable: !isProd,
        logger: true,
        watchFiles: true,
      }),
      // 本地开发独立运行时，访问根路径自动重定向至完整微应用 base
      {
        name: 'dev-root-redirect',
        apply: 'serve' as const,
        configureServer(server: any) {
          server.middlewares.use((req: any, res: any, next: any) => {
            const rawUrl = req.url || '';
            const pathname = rawUrl.split('?')[0];
            if (pathname === '/' || pathname === '') {
              const queryString = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?')) : '';
              res.writeHead(302, { Location: `${base}${queryString}` });
              res.end();
              return;
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@api': resolve(__dirname, 'src/api'),
        '@components': resolve(__dirname, 'src/components'),
        '@views': resolve(__dirname, 'src/views'),
        '@utils': resolve(__dirname, 'src/utils'),
        '@types': resolve(__dirname, 'src/types'),
        '@hooks': resolve(__dirname, 'src/hooks'),
        '@store': resolve(__dirname, 'src/store'),
        '@styles': resolve(__dirname, 'src/styles'),
      },
      // 本地 link 组件库时统一使用微应用的单例依赖，避免主题和上下文失效
      dedupe: [
        'vue',
        'vue-router',
        'pinia',
        'dayjs',
        'ant-design-vue',
        '@ant-design/icons-vue',
        '@formily/core',
        '@formily/vue',
      ],
    },
    css: {
      preprocessorOptions: {
        less: {
          additionalData: `@import (reference) "@/styles/variables.less";`,
          javascriptEnabled: true,
        },
      },
    },
    server: {
      port: 8081,
      host: '0.0.0.0',
      cors: true,
      origin: 'http://localhost:8081',
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      proxy: {
        [apiBase]: {
          target: proxyTarget,
          changeOrigin: true,
          cookieDomainRewrite: 'localhost',
          cookiePathRewrite: '/',
          // rewrite: (path) => path.replace(new RegExp(`^${apiBase}`), '')
        },
      },
    },
    // 依赖预构建优化（仅影响开发启动速度）
    optimizeDeps: {
      force: false,
      // 限制扫描范围为 src/，避免 Vite 扫描 dist-jsp-* 等构建产物
      entries: ['src/**/*.{vue,ts,tsx,js,jsx}'],
      // 根入口由隔离插件映射为轻量虚拟入口，保留 CJS -> ESM 预构建兼容。
      include: ['axios', 'ant-design-vue'],
      needsInterop: ['xe-utils'],
      // 其他包仍可排除；组件库不排除
      // exclude: ['@yss-ui/hooks', '@yss-ui/theme', '@yss-ui/utils'],
      exclude: ['@/api/generated/quality'],
    },
    build: {
      // 以当前最低兼容基线 Chrome 90 编译；现代浏览器同样受益于更小的产物。
      target: 'chrome90',
      manifest: true,
      // 关闭 Vite modulepreload polyfill，避免额外 legacy 入口代码；保留必要的预加载清单。
      modulePreload: { polyfill: false },
      rollupOptions: {
        output: {
          /**
           * 手动分包策略：只对"启动必然加载"的库做稳定分组（利于 HTTP 长缓存）。
           * 注意：不要把 @yss-ui / @formily / vxe 等按需库强行合并成单 chunk——
           * 那会把懒路由才用到的模块提前合并进首屏 chunk，导致 Chrome 90 首屏解析量暴涨。
           * 这些库交给 Rollup 按路由自动拆分到懒 chunk。
           * @param id 模块路径
           */
          manualChunks(id: string): string | undefined {
            // Vite 内部辅助模块（preload-helper 等）必须钉在首屏 vendor，
            // 防止 Rollup 把它分配进某个大懒 chunk 导致该 chunk 被入口静态拖入首屏
            if (id.includes('vite/preload-helper') || id.includes('vite/modulepreload-polyfill')) return 'vendor';
            // Vue 生态核心（入口必然加载，包含 vue-i18n 保证长期缓存）
            if (/\/node_modules\/(vue|vue-router|vue-i18n|pinia|dayjs)\//.test(id) || /\/node_modules\/@vue\//.test(id))
              return 'vendor';
            /** UI 组件按实际引用交给 Rollup，避免把懒页面组件合并到启动块。 */
          },
        },
      },
    },
  };
});
