import { currentAppLocale } from '@/locales/protocol';

/**
 * 多语言 Map 结构定义
 */
export interface I18nValueMap {
  'zh-CN': string;
  'zh-TW'?: string;
  'en-US'?: string;
  [key: string]: string | undefined;
}

/**
 * 安全提取语言项文本字符串，防止嵌套对象导致 Cannot convert object to primitive value
 * @param val 可能是 string、number、或者包含 name/spaceName/resourceName/label 等字段的对象
 * @param fallback 兜底字符串
 * @returns 确保为 string 原始类型
 */
export function extractLocaleString(val: unknown, fallback = ''): string {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed ? val : fallback;
  }
  if (typeof val === 'number') {
    return String(val);
  }
  if (val && typeof val === 'object') {
    const obj = val as Record<string, any>;
    const candidate =
      obj.name ??
      obj.tagName ??
      obj.dicName ??
      obj.className ??
      obj.spaceName ??
      obj.resourceName ??
      obj.menuName ??
      obj.btnName ??
      obj.label ??
      obj.value ??
      obj.title;
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      return trimmed ? candidate : fallback;
    }
    if (typeof candidate === 'number') {
      return String(candidate);
    }
  }
  return fallback;
}

/**
 * 规范化多语言对象，具备高容错能力：
 * 兼容纯字符串、JSON 字符串、扁平字典、以及后端嵌套对象
 *
 * @param val 输入值
 * @param fallbackZh 无法提取出有效简体中文时的兜底文本
 * @returns 规范且每一项均保证为 string 的 I18nValueMap
 */
export function normalizeI18nValue(val: unknown, fallbackZh = ''): I18nValueMap {
  const fallback = typeof fallbackZh === 'string' ? fallbackZh.trim() : '';

  if (!val) {
    return { 'zh-CN': fallback || '', 'zh-TW': '', 'en-US': '' };
  }

  // 若传入的是 JSON 字符串，尝试解析
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeI18nValue(parsed, fallback);
      } catch {
        // 解析失败则直接作为普通字符串处理
      }
    }
    return { 'zh-CN': trimmed || fallback, 'zh-TW': '', 'en-US': '' };
  }

  if (typeof val === 'object') {
    const obj = val as Record<string, any>;
    const targetObj = obj.translations ?? obj.menuNameI18n ?? obj.resourceNameI18n ?? obj;
    const targetRecord = typeof targetObj === 'object' && targetObj !== null ? (targetObj as Record<string, any>) : obj;

    const fallbackFromObj =
      obj.tagName ??
      obj.dicName ??
      obj.className ??
      obj.menuName ??
      obj.resourceName ??
      obj.spaceName ??
      obj.name ??
      targetRecord.tagName ??
      targetRecord.dicName ??
      targetRecord.className ??
      targetRecord.menuName ??
      targetRecord.resourceName ??
      targetRecord.spaceName ??
      targetRecord.name ??
      fallback;

    const resolvedFallback =
      typeof fallbackFromObj === 'string' && fallbackFromObj.trim() ? fallbackFromObj.trim() : fallback;

    const zhRaw = targetRecord['zh-CN'] ?? targetRecord['zh_CN'] ?? targetRecord['zh'] ?? targetRecord['cn'];
    const twRaw = targetRecord['zh-TW'] ?? targetRecord['zh_TW'] ?? targetRecord['tw'] ?? targetRecord['hk'];
    const enRaw = targetRecord['en-US'] ?? targetRecord['en_US'] ?? targetRecord['en'] ?? targetRecord['us'];

    const zhVal = extractLocaleString(zhRaw, resolvedFallback);
    const twVal = extractLocaleString(twRaw, '');
    const enVal = extractLocaleString(enRaw, '');

    return {
      'zh-CN': zhVal || resolvedFallback || '',
      'zh-TW': twVal,
      'en-US': enVal,
    };
  }

  return { 'zh-CN': fallback || '', 'zh-TW': '', 'en-US': '' };
}

/**
 * 依据当前系统语言提取国际化展示文本，具备高容错与降级回退能力：
 * 1. 优先匹配当前已生效语言 (currentAppLocale.value，例如 'zh-TW', 'en-US', 'zh-CN')；
 * 2. 当前语言无有效文本或为 null 时，自动回退到默认简体中文 ('zh-CN')；
 * 3. 若仍无有效文本，回退到传入的 fallback (如历史扁平字段 spaceName / resourceName 等)；
 * 4. 确保返回值永远为 string 原始类型，绝不返回对象，彻底杜绝 [Object: null prototype] 或 DOM setAttribute 崩溃。
 *
 * @param val 可能是 translations 字典、嵌套对象、纯字符串、或 null/undefined
 * @param fallback 兜底文本（如原名称）
 * @param locale 可选指定的语言，未传时默认使用 currentAppLocale.value
 */
export function getI18nText(val?: unknown, fallback = '', locale: string = currentAppLocale.value): string {
  const norm = normalizeI18nValue(val, fallback);
  // 1. 当前语言
  const cur = norm[locale]?.trim();
  if (cur) return cur;
  // 2. 默认语言 zh-CN
  const zh = norm['zh-CN']?.trim();
  if (zh) return zh;
  // 3. 兜底回退
  return typeof fallback === 'string' ? fallback.trim() : '';
}
