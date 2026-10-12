import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { viteMockServe } from 'vite-plugin-mock';
import { resolve } from 'path';
import { createYssUiPlugin } from './vite-plugins/yssUi';

/**
 * JSP 集成专用构建配置
 * 用于将 Vue3 应用打包成可集成到 JSP 项目的静态资源
 *
 * 与默认 vite.config.ts 的区别：
 * 1. 移除了 qiankun 插件（不需要微前端功能）
 * 2. 使用相对路径 base: './'（避免部署路径问题）
 * 3. 静态资源输出到 static 目录
 * 4. 输出目录为 dist-jsp
 */
export default defineConfig(({ mode }) => {
  // 强制使用 production.jsp 模式的环境变量（包含 VITE_IS_JSP=true）
  const env = loadEnv('production.jsp', __dirname);
  const apiBase = env.VITE_API_BASE_URL || '/api';
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:3000';
  const isProd = mode === 'production';

  return {
    // 使用相对路径，避免部署路径问题
    base: './',

    plugins: [
      createYssUiPlugin(),
      vue(),
      // 开发模式启用 mock
      viteMockServe({
        mockPath: 'mock',
        enable: !isProd,
        logger: true,
        watchFiles: true,
      }),
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
      dedupe: ['vue', 'ant-design-vue', '@ant-design/icons-vue', '@formily/core', '@formily/vue'],
    },

    css: {
      preprocessorOptions: {
        less: {
          additionalData: `@import "@/styles/variables.less";`,
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
          rewrite: path => path.replace(new RegExp(`^${apiBase}`), ''),
        },
      },
    },

    // 依赖预构建优化
    optimizeDeps: {
      force: true,
      include: ['axios', 'ant-design-vue'],
      needsInterop: ['xe-utils'],
      exclude: ['@/api/generated/quality'],
    },

    build: {
      // 输出目录
      outDir: 'dist-jsp',
      // 静态资源目录
      assetsDir: 'static',
      // 小于此值的图片转为 base64
      assetsInlineLimit: 4096,
      // 目标浏览器
      // JSP 包同样以 Chrome 90 为最低兼容基线，避免额外下发现代语法。
      target: 'chrome90',
      modulePreload: { polyfill: false },
      // 清空输出目录
      emptyOutDir: true,
      // 生成 source map（可选，生产环境建议关闭）
      sourcemap: false,

      rollupOptions: {
        output: {
          // 移除 hash，使用固定文件名
          // 这样 JSP 中引用的文件名就不会变化
          chunkFileNames: 'static/js/[name].js',
          entryFileNames: 'static/js/index.js', // 固定为 index.js
          assetFileNames: assetInfo => {
            // CSS 文件
            if (assetInfo.name?.endsWith('.css')) {
              return 'static/css/index.css'; // 固定为 index.css
            }
            // 图片文件
            if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(assetInfo.name || '')) {
              return 'static/img/[name][extname]'; // 图片保留原名
            }
            // 字体文件
            if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name || '')) {
              return 'static/fonts/[name][extname]'; // 字体保留原名
            }
            // 其他文件
            return 'static/[name][extname]';
          },
          // 不进行手动分包，让 Vite 自动优化
          manualChunks: undefined,
        },
      },
    },
  };
});
