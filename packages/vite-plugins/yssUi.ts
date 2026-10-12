import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Plugin } from 'vite';

/**
 * 优先采用同包官方插件；已安装旧版本时保留旧适配，避免未发布版本阻断模板。
 * 官方入口存在但加载失败时直接报错，不静默退回旧产物解析。
 */
export const createYssUiPlugin = async (): Promise<Plugin> => {
  const resolveFromProject = createRequire(resolve(process.cwd(), 'package.json'));
  let entry: string;
  try {
    entry = resolveFromProject.resolve('@yss-ui/components/vite');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw error;
    const { createYssComponentsIsolationPlugin } = await import('./yssComponentsIsolation');
    return createYssComponentsIsolationPlugin();
  }
  const { yssUi } = await import(pathToFileURL(entry).href);
  return yssUi();
};
