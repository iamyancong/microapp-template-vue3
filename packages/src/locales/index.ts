import { createI18n } from 'vue-i18n';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { loadAntdLocale, antdAppLocale } from './antd';
import zhCN from './lang/zh-CN';
import { createLocaleTransaction } from './transaction';
import {
  currentAppLocale,
  localeRevision,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  isSupportedLocale,
  type AppLocale,
} from './protocol';
import { shallowRef, type App } from 'vue';
import { LOCALE_INJECTION_KEY, zhCN as yssZhCN, type YssLocale } from '@yss-ui/components/locale';
/** 每个 Vue 应用独立的组件语言，不改其他微应用的全局单例。 */
export const yssAppLocale = shallowRef<YssLocale>(yssZhCN);
/** 在 app.mount 前安装语言上下文。 */
export const installLocale = (app: App): void => {
  app.provide(LOCALE_INJECTION_KEY, yssAppLocale);
};

export * from './protocol';

/** 默认词典同步可用，其余按语言加载；模块聚合由 lang 各入口负责。 */
export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  messages: { 'zh-CN': zhCN, 'zh-TW': {} as typeof zhCN, 'en-US': {} as typeof zhCN },
});
export type I18nTranslate = (key: string, ...args: any[]) => string;
/** 非 setup 上下文使用的翻译入口；在事件执行时求值，热切换配置使用 computed，重载配置在初始化后求值。 */
export const t: I18nTranslate = (key, ...args) => (i18n.global as any).t(key, ...args);
/** Day.js 全局默认值供新实例使用，已有实例展示时应使用 formatDate。 */
const DAYJS_LOCALE_MAP: Record<AppLocale, string> = { 'zh-CN': 'zh-cn', 'zh-TW': 'zh-tw', 'en-US': 'en' };
/** 准备目标语言资源；热切换与重载预检共享，不产生可见副作用。 */
export const prepareAppLocale = async (locale: AppLocale) => {
  const [messages, antd, yss] = await Promise.all([
    locale === 'en-US'
      ? import('./lang/en-US').then(module => module.default)
      : locale === 'zh-TW'
        ? import('./lang/zh-TW').then(module => module.default)
        : Promise.resolve(zhCN),
    loadAntdLocale(locale),
    locale === 'en-US'
      ? import('@yss-ui/components/locale/en-US').then(module => module.default)
      : locale === 'zh-TW'
        ? import('@yss-ui/components/locale/zh-TW').then(module => module.default)
        : Promise.resolve(yssZhCN),
    locale === 'zh-TW' ? import('dayjs/locale/zh-tw') : Promise.resolve(),
  ]);
  return { messages, antd, yss };
};
const transaction = createLocaleTransaction({
  prepare: prepareAppLocale,
  commit: (locale, resources) => {
    i18n.global.setLocaleMessage(locale, resources.messages);
    antdAppLocale.value = resources.antd;
    yssAppLocale.value = resources.yss;
    dayjs.locale(DAYJS_LOCALE_MAP[locale]);
    i18n.global.locale.value = locale;
    currentAppLocale.value = locale;
    localeRevision.value += 1;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      /** 存储不可写时维持内存语言。 */
    }
  },
});

/** 切换语言：资源失败时保持完整旧状态并向调用方抛出错误。 */
export const setAppLocale = (locale: AppLocale | string): Promise<boolean> =>
  transaction.set(isSupportedLocale(locale) ? locale : DEFAULT_LOCALE);
/** 微应用卸载时取消未提交的语言操作。 */
export const cancelLocaleChange = (): void => transaction.cancel();
