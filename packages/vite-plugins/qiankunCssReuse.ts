import type { Plugin } from 'vite';

/** 识别 import-html-entry 已加载并内联的同源样式，避免动态页面重复下载公共 CSS。 */
export const hasInlineStylesheet = (href: string): boolean => {
  const target = new URL(href, document.baseURI).href;
  return Array.from(document.querySelectorAll('style')).some(style => {
    if (!style.isConnected || !style.sheet || style.sheet.disabled) return false;
    const marker = style.textContent?.match(/^\s*\/\*\s*(https?:\/\/[^\s*]+)\s*\*\//)?.[1];
    return marker === target;
  });
};

/** 补充 Vite 的样式去重判断；独立运行、未加载及已卸载的样式仍走原始加载流程。 */
export const createQiankunCssReusePlugin = (): Plugin => ({
  name: 'qiankun-reuse-inline-stylesheets',
  apply: 'build',
  enforce: 'post',
  transform(code, id) {
    if (!id.includes('vite/preload-helper')) return;
    const anchor = 'const isCss = dep.endsWith(".css");';
    if (code.split(anchor).length !== 2) {
      this.error('Vite preload-helper 已变化，请复核 qiankun CSS 去重适配后再构建。');
    }
    return {
      code: `const __hasQiankunInlineStylesheet = ${hasInlineStylesheet.toString()};\n${code.replace(anchor, `${anchor}\nif (isCss && __hasQiankunInlineStylesheet(dep)) return;`)}`,
      map: null,
    };
  },
});
