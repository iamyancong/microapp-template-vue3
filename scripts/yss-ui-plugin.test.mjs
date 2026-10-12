import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import ts from 'typescript';

/** 用隔离安装包验证真实入口选择逻辑，旧插件内部行为由 yss-root-entry 测试覆盖。 */
const legacy = 'data:text/javascript,export const createYssComponentsIsolationPlugin=()=>({name:"legacy"})';
const source = (await readFile(new URL('../packages/vite-plugins/yssUi.ts', import.meta.url), 'utf8')).replace(
  "'./yssComponentsIsolation'",
  JSON.stringify(legacy)
);
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { createYssUiPlugin } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('按已安装 exports 选择官方或旧插件，入口损坏不静默降级', async () => {
  const cwd = process.cwd();
  const directory = await mkdtemp(join(tmpdir(), 'template-yss-plugin-'));
  try {
    for (const mode of ['official', 'legacy', 'broken', 'missing']) {
      const project = join(directory, mode);
      const packageRoot = join(project, 'node_modules/@yss-ui/components');
      await mkdir(packageRoot, { recursive: true });
      await writeFile(join(project, 'package.json'), '{"type":"module"}');
      if (mode !== 'missing') {
        await writeFile(
          join(packageRoot, 'package.json'),
          JSON.stringify({
            type: 'module',
            exports: mode === 'legacy' ? { '.': './index.mjs' } : { './vite': './vite.mjs' },
          })
        );
        await writeFile(
          join(packageRoot, 'vite.mjs'),
          mode === 'broken' ? 'throw new Error("broken official entry")' : 'export const yssUi=()=>({name:"official"})'
        );
      }
      process.chdir(project);
      if (mode === 'broken') await assert.rejects(createYssUiPlugin(), /broken official entry/);
      else if (mode === 'missing') await assert.rejects(createYssUiPlugin(), /Cannot find module/);
      else assert.equal((await createYssUiPlugin()).name, mode);
    }
  } finally {
    process.chdir(cwd);
    await rm(directory, { recursive: true, force: true });
  }
});
