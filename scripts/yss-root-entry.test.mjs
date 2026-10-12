import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

/** 验证模板不会再改写根入口，历史虚拟导入仍有兼容映射。 */
const source = (await readFile(new URL('../packages/vite-plugins/yssRootEntry.ts', import.meta.url), 'utf8')).replace(
  "from 'vite'",
  `from ${JSON.stringify(import.meta.resolve('vite'))}`
);
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { createYssRootEntryPlugin } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);

test('具名、默认与动态根入口保持原样，兼容层不提供源码变换', () => {
  const plugin = createYssRootEntryPlugin();
  assert.equal(plugin.transform, undefined);
  assert.equal(plugin.resolveId, undefined);
  const config = plugin.config({}, { command: 'build' });
  assert.ok(config.resolve.alias.every(alias => !alias.find.test('@yss-ui/components')));
  assert.ok(config.resolve.alias.every(alias => alias.replacement === '@yss-ui/components'));
  assert.deepEqual(config.optimizeDeps.include, ['@yss-ui/components', '@yss-ui/components/locale']);
});

test('生产不执行开发配置工厂，开发保留现有隔离配置', () => {
  let calls = 0;
  const plugin = createYssRootEntryPlugin(() => {
    calls += 1;
    return { optimizeDeps: { include: ['legacy-dev-entry'] } };
  });
  plugin.config({}, { command: 'build' });
  assert.equal(calls, 0);
  const config = plugin.config({}, { command: 'serve' });
  assert.equal(calls, 1);
  assert.ok(config.optimizeDeps.include.includes('legacy-dev-entry'));
});
