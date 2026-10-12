/**
 * 简体中文语言包聚合入口
 *
 * 架构规范：
 * 1. 采用 Vite 的 import.meta.glob 自动扫描并装配当前目录（zh-CN 目录）下的所有模块；
 * 2. 新增业务模块时，只需在 zh-CN/ 目录下新建对应模块的 ts 文件（如 demo.ts），自动装配为 messages.demo；
 * 3. common.ts 作为系统与通用词条模块，其导出的 common, app, route, exception, menu, validate 等属性直接平铺合并到顶层命名空间；
 * 4. 禁止在本文件内直接维护业务词条，所有新增词条必须归属到 zh-CN/ 下的具体模块文件。
 */
const modules = import.meta.glob<Record<string, any>>('./zh-CN/*.ts', { eager: true });

const messages: Record<string, any> = {};

for (const [path, mod] of Object.entries(modules)) {
  const content = mod?.default ?? mod;
  const match = path.match(/\/zh-CN\/(.+)\.ts$/);
  if (!match) continue;

  const moduleName = match[1];

  if (moduleName === 'common') {
    Object.assign(messages, content);
  } else {
    messages[moduleName] = content;
  }
}

export default messages;
