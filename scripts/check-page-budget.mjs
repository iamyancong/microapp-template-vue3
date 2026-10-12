import assert from 'node:assert/strict';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';

/** 根据 manifest 汇总明确指定的启动/页面闭包；动态功能不自动算入首屏。 */
const [directory = 'dist', ...argumentsList] = process.argv.slice(2);
/** 调用方必须明确页面与启动动态入口，缺少入口立即失败。 */
const entries = argumentsList.filter(value => value.startsWith('--entry=')).map(value => value.slice(8));
const budget = Number(argumentsList.find(value => value.startsWith('--max-bytes='))?.slice(12) ?? Infinity);
const root = resolve(directory);
const manifest = JSON.parse(await readFile(join(root, '.vite/manifest.json'), 'utf8'));
let sourceModules = {};
try {
  sourceModules = JSON.parse(await readFile(join(root, 'yss-consumption-modules.json'), 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const assets = new Set(['index.html']);
const visited = new Set();

/** 追踪静态 JS、关联 CSS、图片与字体，按文件去重。 */
const visit = key => {
  if (visited.has(key)) return;
  const chunk = manifest[key];
  assert.ok(chunk, `manifest 中不存在入口 ${key}`);
  visited.add(key);
  assets.add(chunk.file);
  [...(chunk.css ?? []), ...(chunk.assets ?? [])].forEach(file => assets.add(file));
  (chunk.imports ?? []).forEach(visit);
};
Object.entries(manifest)
  .filter(([, value]) => value.isEntry)
  .forEach(([key]) => visit(key));
entries.forEach(key => {
  if (manifest[key]) return visit(key);
  const files = sourceModules[key];
  assert.ok(files?.length, `manifest 中不存在入口 ${key}，也无官方源码归属记录`);
  for (const file of files) {
    const matches = Object.entries(manifest).filter(([, chunk]) => chunk.file === file);
    assert.ok(matches.length, `源码 ${key} 的产物 ${file} 未包含在 manifest 中`);
    matches.forEach(([entry]) => visit(entry));
  }
});
/** 共享启动模块可能被 Vite 改为匿名 manifest 键，按唯一 chunk 名显式选择。 */
for (const name of argumentsList.filter(value => value.startsWith('--chunk=')).map(value => value.slice(8))) {
  const matches = Object.entries(manifest).filter(([, value]) => value.name === name && /\.m?js$/.test(value.file));
  assert.equal(matches.length, 1, `启动 chunk ${name} 必须唯一`);
  visit(matches[0][0]);
}

/** HTML 中的 public 脚本/样式不在 manifest 内，也必须计入。 */
const html = await readFile(join(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
  if (/^(?:https?:|data:|\/\/)/.test(match[1])) continue;
  const parts = match[1].split(/[?#]/)[0].split('/').filter(Boolean);
  for (let index = 0; index < parts.length; index += 1) {
    const file = parts.slice(index).join('/');
    try {
      if ((await stat(join(root, file))).isFile()) {
        assets.add(file);
        break;
      }
    } catch {
      /* 部署 base 前缀不是本地目录。 */
    }
  }
}

/** 压缩量为文件估算，不冒充服务器的真实 transferred。 */
const rows = await Promise.all(
  [...assets].map(async file => {
    const data = await readFile(join(root, file));
    const compressible = /\.(?:html|js|mjs|css|svg|json|txt)$/.test(file);
    return {
      file,
      raw: data.length,
      gzip: compressible ? gzipSync(data, { level: 9 }).length : data.length,
      brotli: compressible
        ? brotliCompressSync(data, { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } }).length
        : data.length,
    };
  })
);
const totals = rows.reduce(
  (sum, row) => ({ raw: sum.raw + row.raw, gzip: sum.gzip + row.gzip, brotli: sum.brotli + row.brotli }),
  { raw: 0, gzip: 0, brotli: 0 }
);
const report = {
  entries,
  chunks: argumentsList.filter(value => value.startsWith('--chunk=')).map(value => value.slice(8)),
  totals,
  assets: rows.sort((a, b) => b.raw - a.raw),
};
await writeFile(join(root, 'page-budget.json'), JSON.stringify(report, null, 2));
console.log(
  `[page-budget] ${entries.join(' + ')}: ${totals.raw} bytes raw / ${totals.gzip} gzip / ${totals.brotli} Brotli (${rows.length} files)`
);
assert.ok(totals.raw <= budget, `页面原始资源 ${totals.raw} bytes 超过预算 ${budget} bytes`);
