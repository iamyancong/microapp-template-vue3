import { readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { createYssDevOptimizer } from './yssDevOptimizer';
import { createYssRootEntryPlugin } from './yssRootEntry';

/** 普通页面使用的轻量 YSS UI 虚拟入口。 */
const YSS_LIGHT_COMPONENTS_ID = 'virtual:yss-light-components';
/** Vite 内部轻量虚拟模块标识。 */
const YSS_LIGHT_COMPONENTS_RESOLVED_ID = `\0${YSS_LIGHT_COMPONENTS_ID}`;
/** 重型组件使用的完整 YSS UI 虚拟入口。 */
const YSS_HEAVY_COMPONENTS_ID = 'virtual:yss-heavy-components';
/** Vite 内部重型虚拟模块标识。 */
const YSS_HEAVY_COMPONENTS_RESOLVED_ID = `\0${YSS_HEAVY_COMPONENTS_ID}`;
/** 轻量入口模块查询标记。 */
const YSS_LIGHT_MODULE_QUERY = '?yss-light-components';
/** 重型入口模块查询标记。 */
const YSS_HEAVY_MODULE_QUERY = '?yss-heavy-components';
/** 普通入口中需要隔离的 YSS 重型依赖。 */
const YSS_HEAVY_DEPENDENCY_PATTERN = /^(?:diff$|echarts(?:\/|$)|monaco-editor(?:-nls)?(?:\/|$)|sql-formatter$)/;
/** 普通入口中需要移除的 Monaco 全局样式副作用。 */
const YSS_HEAVY_SIDE_EFFECT_IMPORT_PATTERN = /^import\s+["']monaco-editor\/min\/vs\/editor\/editor\.main\.css["'];?$/;
/** 不应从普通入口暴露的重型组件。 */
const YSS_HEAVY_EXPORTS = new Set([
  'DEFAULT_CONFIG',
  'DEFAULT_WORKBOOK_DATA',
  'LOCALE_MAP',
  'YEcharts',
  'YMonaco',
  'YMonacoDiff',
  'YSheet',
]);

/**
 * 从 YSS UI 公开入口解析公共实现文件和导出映射。
 * @param entryPath YSS UI ESM 入口
 * @returns 公共实现文件和可导出符号
 */
const parseYssEntry = (
  entryPath: string
): { commonEntry: string; reExports: string[]; auxiliaryExports: string[]; sharedFiles: string[] } => {
  const entrySource = readFileSync(entryPath, 'utf8');
  const commonImportPattern = /import\s*\{([^}]+)\}\s*from\s*(['"])(\.\/main-exports-[^'"]+\.mjs)\2/g;
  const exportMatch = entrySource.match(/export\s*\{([\s\S]+)\};?\s*$/);
  const localToImported = new Map<string, string>();
  const auxiliaryImports = new Map<string, { imported: string; file: string }>();
  const auxiliaryExports: string[] = [];
  /** 保留独立模块提供的 YConfigProvider、locale 等公开导出，不能仅扫描公共大块。 */
  for (const match of entrySource.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"](\.[^'"]+)['"]/g)) {
    if (match[2].includes('/main-exports-')) continue;
    for (const specifier of match[1].split(',')) {
      const [imported, local = imported] = specifier.trim().split(/\s+as\s+/);
      auxiliaryImports.set(local, { imported, file: resolve(dirname(entryPath), match[2]) });
    }
  }
  let commonImportPath = '';
  let importMatch: RegExpExecArray | null;

  while ((importMatch = commonImportPattern.exec(entrySource))) {
    commonImportPath ||= importMatch[3];
    importMatch[1].split(',').forEach(specifier => {
      const [importedName, localName = importedName] = specifier.trim().split(/\s+as\s+/);
      if (importedName) localToImported.set(localName, importedName);
    });
  }

  if (!commonImportPath || !exportMatch) {
    throw new Error('[vite] 无法解析 @yss-ui/components ESM 入口，已阻止退化为全量公共块');
  }

  const reExports = exportMatch[1]
    .split(',')
    .map(specifier => specifier.trim())
    .map(specifier => {
      const [localName, publicName = localName] = specifier.split(/\s+as\s+/);
      const importedName = localToImported.get(localName);
      const auxiliary = auxiliaryImports.get(localName);
      if (auxiliary && !YSS_HEAVY_EXPORTS.has(publicName)) {
        auxiliaryExports.push(
          `export { ${auxiliary.imported} as ${publicName} } from ${JSON.stringify(auxiliary.file)};`
        );
      }
      if (!importedName || YSS_HEAVY_EXPORTS.has(publicName)) return null;
      return importedName === publicName ? publicName : `${importedName} as ${publicName}`;
    })
    .filter((specifier): specifier is string => Boolean(specifier));

  if (!reExports.length) throw new Error('[vite] @yss-ui/components 轻量导出为空，已终止构建');
  return {
    commonEntry: resolve(dirname(entryPath), commonImportPath),
    reExports,
    auxiliaryExports,
    sharedFiles: [...auxiliaryImports.values()].map(item => item.file),
  };
};

/**
 * 移除只服务于 Monaco 的顶层 CSS 副作用。
 * @param source 公共实现源码
 * @returns 轻量实现源码
 */
const stripHeavySideEffectImports = (source: string): string =>
  source
    .split('\n')
    .filter(line => !YSS_HEAVY_SIDE_EFFECT_IMPORT_PATTERN.test(line.trim()))
    .join('\n');

/**
 * 创建 YSS UI 普通/重型组件模块隔离插件。
 * @returns Vite 插件
 */
export const createYssComponentsIsolationPlugin = (): Plugin => {
  // Vite 会将配置依赖临时编译到 node_modules/.vite-temp，不能用插件文件的 __dirname 定位项目根目录。
  const packageRoot = resolve(process.cwd());
  const yssComponentsEntry = realpathSync(resolve(packageRoot, 'node_modules/@yss-ui/components/dist/index.mjs'));
  const yssComponentsPackageRoot = realpathSync(resolve(dirname(yssComponentsEntry), '..'));
  const manifest = JSON.parse(readFileSync(resolve(yssComponentsPackageRoot, 'package.json'), 'utf8'));
  if (manifest.yssUi?.treeShakableRoot === true) {
    return createYssRootEntryPlugin(() => {
      const parsed = parseYssEntry(yssComponentsEntry);
      return createYssDevOptimizer({ packageRoot, entry: yssComponentsEntry, ...parsed });
    });
  }
  const sharedFiles = new Set(parseYssEntry(realpathSync(yssComponentsEntry)).sharedFiles);
  const sourceRoot = resolve(packageRoot, 'src');
  const findIsolationQuery = (id: string): string | undefined =>
    [YSS_LIGHT_MODULE_QUERY, YSS_HEAVY_MODULE_QUERY].find(query => id.endsWith(query));
  let isDev = false;

  return {
    name: 'yss-components-isolation',
    enforce: 'pre',
    config(_config, env) {
      isDev = env.command === 'serve';
      if (!isDev) return;
      const { commonEntry, reExports, auxiliaryExports } = parseYssEntry(yssComponentsEntry);
      return createYssDevOptimizer({
        packageRoot,
        entry: realpathSync(yssComponentsEntry),
        commonEntry: realpathSync(commonEntry),
        reExports,
        auxiliaryExports,
        sharedFiles: [...sharedFiles],
      });
    },
    async resolveId(source, importer) {
      if (isDev) {
        if (source === '@yss-ui/components') return null;
        if (source === YSS_LIGHT_COMPONENTS_ID) return this.resolve('@yss-ui/components', importer, { skipSelf: true });
        if (source === YSS_HEAVY_COMPONENTS_ID) return this.resolve('yss-heavy-runtime', importer, { skipSelf: true });
      }
      if (source === '@yss-ui/components' && importer?.startsWith(sourceRoot)) {
        return YSS_LIGHT_COMPONENTS_RESOLVED_ID;
      }
      if (source === YSS_LIGHT_COMPONENTS_ID) return YSS_LIGHT_COMPONENTS_RESOLVED_ID;
      if (source === YSS_HEAVY_COMPONENTS_ID) return YSS_HEAVY_COMPONENTS_RESOLVED_ID;
      if (importer?.endsWith(YSS_LIGHT_MODULE_QUERY) && YSS_HEAVY_DEPENDENCY_PATTERN.test(source)) {
        return '\0virtual:yss-heavy-dependency-stub';
      }

      const isolationQuery = importer ? findIsolationQuery(importer) : undefined;
      if (!importer || !isolationQuery || !source.startsWith('.')) return null;

      const importerPath = importer.slice(0, -isolationQuery.length);
      const resolved = resolve(dirname(importerPath), source);
      // locale 上下文必须和公开子路径使用同一模块，避免复制 Symbol/Ref 导致注入失效。
      if (
        sharedFiles.has(resolved) ||
        resolved.includes('/locale/') ||
        /^(useLocale|vxeBridge|useVxeLocale)-/.test(basename(resolved))
      ) {
        return resolved;
      }
      return `${resolved}${isolationQuery}`;
    },
    load(id) {
      if (id === YSS_LIGHT_COMPONENTS_RESOLVED_ID) {
        const { commonEntry, reExports, auxiliaryExports } = parseYssEntry(yssComponentsEntry);
        return [
          `export { ${reExports.join(', ')} } from ${JSON.stringify(`${commonEntry}${YSS_LIGHT_MODULE_QUERY}`)};`,
          ...auxiliaryExports,
        ].join('\n');
      }
      if (id === YSS_HEAVY_COMPONENTS_RESOLVED_ID) {
        return `export * from ${JSON.stringify(`${yssComponentsEntry}${YSS_HEAVY_MODULE_QUERY}`)}`;
      }
      if (id === '\0virtual:yss-heavy-dependency-stub') {
        return `
          const unavailable = () => {
            throw new Error('[yss-ui] 普通组件入口不能调用重型组件依赖');
          };
          export const init = unavailable;
          export const format = unavailable;
          export const diffLines = unavailable;
          export default Object.freeze({});
        `;
      }

      const isolationQuery = findIsolationQuery(id);
      if (!isolationQuery) return null;
      const modulePath = id.slice(0, -isolationQuery.length);
      const moduleSource = readFileSync(modulePath, 'utf8');
      return isolationQuery === YSS_LIGHT_MODULE_QUERY ? stripHeavySideEffectImports(moduleSource) : moduleSource;
    },
    configResolved() {
      // 通过 realpath 校验安装包确实存在，依赖版本变化时尽早失败而不是静默回退全量入口。
      if (!yssComponentsPackageRoot) throw new Error('[vite] @yss-ui/components 安装目录不存在');
    },
    configureServer(server) {
      /** 本地 link 重新构建后哈希路径会改变，重启模块图以清理所有旧虚拟模块。 */
      const entry = realpathSync(yssComponentsEntry);
      let restartTimer: ReturnType<typeof setTimeout> | undefined;
      const onEntryChange = (file: string): void => {
        if (file !== entry) return;
        clearTimeout(restartTimer);
        restartTimer = setTimeout(() => {
          void server.restart();
        }, 300);
      };
      server.watcher.add(entry);
      server.watcher.on('change', onEntryChange);
      server.watcher.on('add', onEntryChange);
      server.httpServer?.once('close', () => {
        clearTimeout(restartTimer);
        server.watcher.off('change', onEntryChange);
        server.watcher.off('add', onEntryChange);
      });
    },
  };
};
