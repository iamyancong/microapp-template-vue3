import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { UserConfig } from 'vite';

/** 开发入口生成所需的已校验组件库信息。 */
interface Options {
  packageRoot: string;
  entry: string;
  commonEntry: string;
  reExports: string[];
  auxiliaryExports: string[];
  sharedFiles: string[];
}

/**
 * 将隔离入口纳入 Vite/esbuild 的依赖预构建，避免浏览器执行未经裁剪的库源码。
 * 普通与重型组件使用不同模块图；locale/VXE 上下文和第三方依赖仍共享实例。
 */
export const createYssDevOptimizer = ({
  packageRoot,
  entry,
  commonEntry,
  reExports,
  auxiliaryExports,
  sharedFiles,
}: Options): UserConfig => {
  const cache = resolve(packageRoot, 'node_modules/.cache/yss-entries');
  mkdirSync(cache, { recursive: true });
  const light = resolve(cache, 'light.mjs');
  const heavy = resolve(cache, 'heavy.mjs');
  /** 内容未变化时不写入，避免无意义的文件监听和缓存失效。 */
  const writeEntry = (file: string, content: string) => {
    try {
      if (readFileSync(file, 'utf8') === content) return;
    } catch {
      /* 首次生成。 */
    }
    writeFileSync(file, content);
  };
  writeEntry(
    light,
    [
      `export { ${reExports.join(', ')} } from ${JSON.stringify(commonEntry + '?yss-light')};`,
      ...auxiliaryExports,
    ].join('\n')
  );
  writeEntry(heavy, `export * from ${JSON.stringify(entry)};\n`);

  return {
    resolve: {
      alias: [
        { find: /^@yss-ui\/components$/, replacement: light },
        { find: /^yss-heavy-runtime$/, replacement: heavy },
      ],
    },
    optimizeDeps: {
      include: ['@yss-ui/components', 'yss-heavy-runtime'],
      esbuildOptions: {
        plugins: [
          {
            name: 'yss-isolated-prebundle',
            setup(build) {
              build.onResolve({ filter: /\?yss-light$/ }, args => ({
                path: args.path.slice(0, -'?yss-light'.length),
                namespace: 'yss-light',
              }));
              build.onLoad({ filter: /.*/, namespace: 'yss-light' }, args => ({
                contents: readFileSync(args.path, 'utf8').replace(
                  /^import\s+["']monaco-editor\/min\/vs\/editor\/editor\.main\.css["'];?\s*$/gm,
                  ''
                ),
                loader: 'js',
                resolveDir: dirname(args.path),
              }));
              build.onResolve(
                {
                  filter: /^(diff$|echarts(?:\/|$)|monaco-editor(?:-nls)?(?:\/|$)|sql-formatter$)/,
                  namespace: 'yss-light',
                },
                () => ({ path: 'stub', namespace: 'yss-stub' })
              );
              build.onLoad({ filter: /.*/, namespace: 'yss-stub' }, () => ({
                contents: `const unavailable = () => { throw new Error('[yss-ui] 重型组件必须使用重型入口'); }; export const init = unavailable, format = unavailable, diffLines = unavailable; export default {};`,
                loader: 'js',
              }));
              build.onResolve({ filter: /^\./, namespace: 'yss-light' }, args => {
                const file = resolve(args.resolveDir, args.path);
                if (sharedFiles.includes(file) || /\/(?:locale\/|(?:useLocale|vxeBridge|useVxeLocale)-)/.test(file))
                  return { path: file };
                return { path: file, namespace: 'yss-light' };
              });
            },
          },
        ],
      },
    },
  };
};
