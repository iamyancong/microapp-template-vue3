import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

test('账单覆盖启动动态块、CSS/图片/public 文件且去重，超预算或漏入口时失败', async () => {
  const root = await mkdtemp(join(tmpdir(), 'yss-page-budget-'));
  try {
    await mkdir(join(root, '.vite'));
    const files = {
      'index.html': '<script src="/app/locale.js"></script>',
      'entry.js': 'entry',
      'boot.js': 'boot',
      'page.js': 'page',
      'style.css': 'style',
      'logo.svg': '<svg/>',
      'locale.js': 'locale',
    };
    for (const [name, value] of Object.entries(files)) await writeFile(join(root, name), value);
    const manifest = {
      'index.html': { isEntry: true, file: 'entry.js', imports: ['boot'] },
      boot: { name: 'bootstrap', file: 'boot.js', css: ['style.css'] },
      page: { file: 'page.js', imports: ['boot'], assets: ['logo.svg'] },
    };
    await writeFile(join(root, '.vite/manifest.json'), JSON.stringify(manifest));
    const script = fileURLToPath(new URL('./check-page-budget.mjs', import.meta.url));
    const args = [script, root, '--chunk=bootstrap', '--entry=page'];
    execFileSync(process.execPath, args, { stdio: 'pipe' });
    const report = JSON.parse(await readFile(join(root, 'page-budget.json'), 'utf8'));
    assert.equal(
      report.totals.raw,
      Object.values(files).reduce((sum, value) => sum + Buffer.byteLength(value), 0)
    );
    assert.equal(report.assets.length, Object.keys(files).length);
    assert.throws(() => execFileSync(process.execPath, [...args, '--max-bytes=1'], { stdio: 'pipe' }));
    assert.throws(() => execFileSync(process.execPath, [...args, '--entry=missing'], { stdio: 'pipe' }));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('官方源码归属记录恢复合并页面的完整闭包，未知源码继续失败', async () => {
  const root = await mkdtemp(join(tmpdir(), 'yss-page-map-'));
  try {
    await mkdir(join(root, '.vite'));
    await writeFile(join(root, 'index.html'), '');
    await writeFile(join(root, 'shared.js'), 'shared-page');
    await writeFile(join(root, '.vite/manifest.json'), JSON.stringify({ shared: { file: 'shared.js' } }));
    await writeFile(
      join(root, 'yss-consumption-modules.json'),
      JSON.stringify({ 'src/views/Demo/index.vue': ['shared.js'] })
    );
    const script = fileURLToPath(new URL('./check-page-budget.mjs', import.meta.url));
    execFileSync(process.execPath, [script, root, '--entry=src/views/Demo/index.vue']);
    const report = JSON.parse(await readFile(join(root, 'page-budget.json'), 'utf8'));
    assert.equal(report.totals.raw, Buffer.byteLength('shared-page'));
    assert.throws(() => execFileSync(process.execPath, [script, root, '--entry=unknown'], { stdio: 'pipe' }));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
