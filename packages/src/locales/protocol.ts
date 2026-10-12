import { shallowRef } from 'vue';

/** 语言协议 v1；模板为标准实现，禁止根据区域子串猜测语言。 */
export const SUPPORTED_LOCALES = ['zh-CN', 'zh-TW', 'en-US'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = 'zh-CN';
export const LOCALE_STORAGE_KEY = 'locale';
/** 已生效语言与修订号，网络请求只读取此状态。 */
export const currentAppLocale = shallowRef<AppLocale>(DEFAULT_LOCALE);
export const localeRevision = shallowRef(0);

/** 判断外部 DTO 或持久化值是否为规范语言代码。 */
export const isSupportedLocale = (value: unknown): value is AppLocale =>
  typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);

/** 浏览器语言协商：先语言、再脚本和区域，en-HK 仍为英文。 */
export const detectBrowserLocale = (value: string): AppLocale | undefined => {
  const parts = value.toLowerCase().replace(/_/g, '-').split('-');
  if (parts[0] === 'en') return 'en-US';
  if (parts[0] !== 'zh') return undefined;
  if (parts.includes('hans')) return 'zh-CN';
  return parts.some(part => ['hant', 'tw', 'hk', 'mo'].includes(part)) ? 'zh-TW' : 'zh-CN';
};

/** 初始语言：持久化 > 简体中文；门户语言在 mount 时优先应用。 */
export const getInitialLocale = (): AppLocale => {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isSupportedLocale(stored)) return stored;
  } catch {
    /** 隐私模式下仍使用内存状态。 */
  }
  return DEFAULT_LOCALE;
};

/** 请求头与已提交的 UI 语言一致，不依赖可能写入失败或被其他页面改写的 storage。 */
export const getLocaleHeaders = (): Record<string, string> => ({
  Locale: currentAppLocale.value,
  'Accept-Language': `${currentAppLocale.value},${currentAppLocale.value.split('-')[0]};q=0.9`,
});
