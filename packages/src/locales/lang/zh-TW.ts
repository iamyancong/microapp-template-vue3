/**
 * 繁體中文語言包聚合入口
 *
 * 架構規範：
 * 1. 採用 Vite 的 import.meta.glob 自動掃描並裝配當前目錄（zh-TW 目錄）下的所有模組；
 * 2. 新增業務模組時，只需在 zh-TW/ 目錄下新建對應模組的 ts 檔案（如 demo.ts），自動裝配為 messages.demo；
 * 3. common.ts 作為系統與通用詞條模組，其導出的 common, app, route, exception, menu, validate 等屬性直接平鋪合併到頂層命名空間；
 * 4. 禁止在本檔案內直接維護業務詞條，所有新增詞條必須歸屬到 zh-TW/ 下的具體模組檔案。
 */
const modules = import.meta.glob<Record<string, any>>('./zh-TW/*.ts', { eager: true });

const messages: Record<string, any> = {};

for (const [path, mod] of Object.entries(modules)) {
  const content = mod?.default ?? mod;
  const match = path.match(/\/zh-TW\/(.+)\.ts$/);
  if (!match) continue;

  const moduleName = match[1];

  if (moduleName === 'common') {
    Object.assign(messages, content);
  } else {
    messages[moduleName] = content;
  }
}

export default messages;
