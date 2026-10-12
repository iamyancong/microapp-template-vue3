import { shallowRef } from 'vue';
import zhCN from 'ant-design-vue/es/locale/zh_CN';
import type { AppLocale } from './protocol';

/** Ant Design Vue 使用的已提交语言资源。 */
export const antdAppLocale = shallowRef(zhCN);
/** 仅准备资源，不能在异步加载完成时直接修改全局语言。 */
export const loadAntdLocale = async (locale: AppLocale): Promise<typeof zhCN> => {
  if (locale === 'en-US') return (await import('ant-design-vue/es/locale/en_US')).default;
  if (locale === 'zh-TW') return (await import('ant-design-vue/es/locale/zh_TW')).default;
  return zhCN;
};
