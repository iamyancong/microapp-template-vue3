import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';

/** 基于项目实际聚合入口检查词典和事务，不需要额外测试框架。 */
const sourceRoot = path.resolve(existsSync('packages/mainapp/src') ? 'packages/mainapp/src' : 'packages/src');
const server = await createServer({ configFile: false, root: sourceRoot, server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
/** 展开叶子键，包含数组项。 */
const flatten = (value, prefix = '', output = {}) => {
  for (const [key, item] of Object.entries(value)) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (item && typeof item === 'object') flatten(item, name, output);
    else output[name] = item;
  }
  return output;
};
/** 检查业务调用，跳过词典、生成产物与测试。 */
const sourceFiles = async directory => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['locales', '__tests__', 'generated', 'node_modules'].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(full));
    else if (/\.(vue|tsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
};
try {
  const dictionaries = {};
  for (const locale of ['zh-CN', 'zh-TW', 'en-US']) dictionaries[locale] = flatten((await server.ssrLoadModule(`/locales/lang/${locale}.ts`)).default);
  const base = dictionaries['zh-CN'];
  for (const [locale, dictionary] of Object.entries(dictionaries)) {
    assert.deepEqual(Object.keys(dictionary).sort(), Object.keys(base).sort(), `${locale} 词条键不一致`);
    for (const key of Object.keys(base)) {
      const parameters = value => [...String(value).matchAll(/\{([\w]+)\}/g)].map(match => match[1]).sort();
      assert.deepEqual(parameters(dictionary[key]), parameters(base[key]), `${locale}:${key} 占位符不一致`);
    }
  }
  const missing = [];
  for (const file of await sourceFiles(sourceRoot)) {
    const content = await readFile(file, 'utf8');
    for (const match of content.matchAll(/\b(?:t|translate|\$t)\(\s*(['"])([\w.\-]+)\1/g)) {
      if (!(match[2] in base) && !Object.keys(base).some(key => key.startsWith(`${match[2]}.`))) missing.push(`${path.relative(sourceRoot, file)}: ${match[2]}`);
    }
  }
  assert.deepEqual(missing, [], '存在缺失的静态词条调用');
  const protocol = await server.ssrLoadModule('/locales/protocol.ts');
  assert.equal(protocol.detectBrowserLocale('en-HK'), 'en-US');
  assert.equal(protocol.detectBrowserLocale('zh-Hant-HK'), 'zh-TW');
  assert.equal(protocol.detectBrowserLocale('zh-Hans-TW'), 'zh-CN');
  assert.equal(protocol.detectBrowserLocale('fr-MO'), undefined);
  assert.equal(protocol.isSupportedLocale('toString'), false);
  protocol.currentAppLocale.value = 'en-US';
  assert.equal(protocol.getLocaleHeaders().Locale, 'en-US');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('storage disabled'); } });
  assert.doesNotThrow(() => protocol.getInitialLocale());
  assert.equal(protocol.getLocaleHeaders().Locale, 'en-US');
  delete globalThis.localStorage;
  const { createReloadTransaction } = await server.ssrLoadModule('/locales/reloadTransaction.ts');
  const steps = [];
  const baseReload = {
    confirm: async () => true, prepare: async () => { steps.push('prepare'); },
    show: () => { steps.push('show'); }, persist: () => { steps.push('persist'); return () => steps.push('rollback'); },
    beforeReload: async () => { steps.push('paint'); }, reload: () => { steps.push('reload'); }, cancel: () => { steps.push('cancel'); },
  };
  assert.equal(await createReloadTransaction({ ...baseReload, confirm: async () => false })('en-US'), false);
  assert.deepEqual(steps, [], '取消切换不能写偏好、展示遮罩或重载');
  await assert.rejects(createReloadTransaction({ ...baseReload, prepare: async () => { throw new Error('offline'); } })('en-US'), /offline/);
  assert.deepEqual(steps.splice(0), ['cancel'], '预检失败不能持久化或重载');
  await createReloadTransaction(baseReload)('zh-TW');
  assert.deepEqual(steps.splice(0), ['prepare', 'show', 'persist', 'paint', 'reload']);
  await assert.rejects(createReloadTransaction({ ...baseReload, reload: () => { throw new Error('navigation failed'); } })('zh-TW'), /navigation failed/);
  assert.deepEqual(steps.splice(0), ['prepare', 'show', 'persist', 'paint', 'rollback', 'cancel']);
  const { createLocaleTransaction } = await server.ssrLoadModule('/locales/transaction.ts');
  const deferred = [];
  const commits = [];
  const transaction = createLocaleTransaction({ prepare: () => new Promise((resolve, reject) => deferred.push({ resolve, reject })), commit: (locale, resource) => commits.push([locale, resource]) });
  const old = transaction.set('en-US');
  const latest = transaction.set('zh-TW');
  deferred[1].resolve('TW'); await latest;
  deferred[0].resolve('EN'); assert.equal(await old, false);
  assert.deepEqual(commits, [['zh-TW', 'TW']]);
  const failed = transaction.set('en-US');
  deferred[2].reject(new Error('offline'));
  await assert.rejects(failed, /offline/);
  assert.equal(commits.length, 1);
  const cancelled = transaction.set('zh-CN'); transaction.cancel(); deferred[3].resolve('CN');
  assert.equal(await cancelled, false);
  assert.equal(commits.length, 1);
  const retried = transaction.set('en-US'); deferred[4].resolve('EN'); assert.equal(await retried, true);
  console.log(`国际化检查通过：三语 ${Object.keys(base).length} 个词条、静态调用、协商、存储禁用、竞态、失败重试、卸载取消和确认重载事务。`);
} finally { await server.close(); }
