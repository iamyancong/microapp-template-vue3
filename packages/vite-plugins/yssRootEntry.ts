import { mergeConfig, type Plugin, type UserConfig } from 'vite';

/**
 * 生产直接消费公开根入口；开发复用已有预构建，避免根 barrel 的全部导出进入浏览器。
 * @param getDevelopmentConfig 旧版开发隔离配置工厂，仅在 serve 时执行
 */
export const createYssRootEntryPlugin = (getDevelopmentConfig?: () => UserConfig): Plugin => ({
  name: 'yss-public-root-entry',
  config(_config, { command }) {
    const development = command === 'serve' ? getDevelopmentConfig?.() : undefined;
    return mergeConfig(development ?? {}, {
      resolve: {
        alias: [
          {
            find: /^virtual:yss-heavy-components$/,
            replacement: development ? 'yss-heavy-runtime' : '@yss-ui/components',
          },
          { find: /^virtual:yss-light-components$/, replacement: '@yss-ui/components' },
        ],
      },
      optimizeDeps: { include: ['@yss-ui/components', '@yss-ui/components/locale'] },
    });
  },
});
