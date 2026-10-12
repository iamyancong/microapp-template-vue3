import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

/** 编译真实插件，验证内联样式识别与 Vite 升级保护。 */
const source = await readFile(new URL('../packages/vite-plugins/qiankunCssReuse.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { hasInlineStylesheet, createQiankunCssReusePlugin } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);

test('仅复用已连接、启用且 URL 完全匹配的内联样式', () => {
  const style = {
    isConnected: true,
    sheet: { disabled: false },
    textContent: '/* http://localhost/system/assets/page.css */body{color:red}',
  };
  const original = globalThis.document;
  globalThis.document = { baseURI: 'http://localhost/subApp/system/table', querySelectorAll: () => [style] };
  try {
    assert.equal(hasInlineStylesheet('/system/assets/page.css'), true);
    assert.equal(hasInlineStylesheet('/system/assets/other.css'), false);
    style.isConnected = false;
    assert.equal(hasInlineStylesheet('/system/assets/page.css'), false);
    style.isConnected = true;
    style.sheet.disabled = true;
    assert.equal(hasInlineStylesheet('/system/assets/page.css'), false);
    style.sheet = null;
    assert.equal(hasInlineStylesheet('/system/assets/page.css'), false);
  } finally {
    globalThis.document = original;
  }
});

test('仅修改构建辅助模块，匹配失效时阻止静默发布', () => {
  const plugin = createQiankunCssReusePlugin();
  const context = {
    error: message => {
      throw new Error(message);
    },
  };
  assert.equal(plugin.transform.call(context, 'normal code', '/src/main.ts'), undefined);
  const output = plugin.transform.call(context, 'const isCss = dep.endsWith(".css");', '\0vite/preload-helper.js');
  assert.match(output.code, /isCss && __hasQiankunInlineStylesheet\(dep\)/);
  assert.throws(
    () => plugin.transform.call(context, 'changed helper', '\0vite/preload-helper.js'),
    /preload-helper 已变化/
  );
});
