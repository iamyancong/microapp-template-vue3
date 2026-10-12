import { Modal } from 'ant-design-vue';
import { currentAppLocale, isSupportedLocale, LOCALE_STORAGE_KEY, type AppLocale } from './protocol';
import { prepareAppLocale, t } from './index';
import { createReloadTransaction } from './reloadTransaction';

/** 门户无法判断所有旧微应用的 dirty 状态，系统内统一提示数据丢失风险。 */
const confirmReload = (): Promise<boolean> =>
  new Promise(resolve => {
    Modal.confirm({
      title: t('common.switchLanguageTitle'),
      content: t('common.switchLanguageConfirm'),
      okText: t('common.confirmReload'),
      cancelText: t('common.cancel'),
      onOk: () => {
        resolve(true);
      },
      onCancel: () => {
        resolve(false);
      },
    });
  });

const reloadWithLocale = createReloadTransaction<AppLocale>({
  confirm: confirmReload,
  prepare: prepareAppLocale,
  show: locale => {
    if (!window.__YSS_LOCALE_RELOAD__) throw new Error('Locale reload bootstrap is unavailable');
    window.__YSS_LOCALE_RELOAD__.show(locale);
  },
  persist: locale => {
    const previous = localStorage.getItem(LOCALE_STORAGE_KEY);
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    if (localStorage.getItem(LOCALE_STORAGE_KEY) !== locale)
      throw new Error('Locale preference could not be persisted');
    return () => {
      if (localStorage.getItem(LOCALE_STORAGE_KEY) !== locale) return;
      if (previous === null) localStorage.removeItem(LOCALE_STORAGE_KEY);
      else localStorage.setItem(LOCALE_STORAGE_KEY, previous);
    };
  },
  /** 让遮罩至少完成一帧渲染；不用固定延迟假装已加载完成。 */
  beforeReload: () =>
    new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }),
  reload: () => window.location.reload(),
  cancel: () => window.__YSS_LOCALE_RELOAD__?.cancel(),
});

/** 系统内采用完整文档重载，保留当前 URL 的 path/query/hash，不改变现有有效语言。 */
export const requestLocaleReload = (locale: string): Promise<boolean> => {
  if (!isSupportedLocale(locale) || locale === currentAppLocale.value) return Promise.resolve(false);
  return reloadWithLocale(locale);
};
