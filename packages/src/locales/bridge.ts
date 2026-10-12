import { ref, watch } from 'vue';
import { cancelLocaleChange, setAppLocale, t } from './index';
import { currentAppLocale, DEFAULT_LOCALE, getInitialLocale, isSupportedLocale, LOCALE_STORAGE_KEY } from './protocol';

/** 同一挂载周期内，门户修订号只前进。 */
let hostRevision = -1;
/** 独立启动失败时保持可交互默认界面，选择器展示错误并允许重试。 */
export const initialLocaleFailed = ref(false);
/** 门户更新仅接受标准语言及非过期修订号，兼容未带 revision 的旧门户。 */
export const applyHostLocale = async (props: { locale?: string; localeRevision?: number }): Promise<void> => {
  if (!isSupportedLocale(props.locale)) return;
  if (props.localeRevision !== undefined) {
    if (!Number.isSafeInteger(props.localeRevision) || props.localeRevision < 0 || props.localeRevision < hostRevision)
      return;
    hostRevision = props.localeRevision;
  }
  await setAppLocale(props.locale);
};
/** 每次 mount 重新建立门户优先级，在页面及请求启动之前完成初始化。 */
export const initializeLocale = async (
  props: { locale?: string; localeRevision?: number },
  standalone = true
): Promise<void> => {
  cancelLocaleChange();
  hostRevision = -1;
  initialLocaleFailed.value = false;
  try {
    if (isSupportedLocale(props.locale)) await applyHostLocale(props);
    else await setAppLocale(getInitialLocale());
  } catch (error) {
    if (!standalone) throw error;
    await setAppLocale(DEFAULT_LOCALE);
    initialLocaleFailed.value = true;
    console.error('[i18n] 初始语言加载失败，已回退默认语言', error);
  }
};
/** 独立运行监听跨页语言；嵌入模式只接受门户 DTO，避免 storage 抢占门户语言。 */
export const startLocaleSync = (standalone: boolean): (() => void) => {
  const stop = standalone
    ? watch(
        currentAppLocale,
        locale => {
          document.documentElement.lang = locale;
          document.title = t('app.name');
        },
        { immediate: true }
      )
    : undefined;
  const onStorage = (event: StorageEvent): void => {
    if (
      event.key === LOCALE_STORAGE_KEY &&
      isSupportedLocale(event.newValue) &&
      event.newValue !== currentAppLocale.value
    ) {
      const target = event.newValue;
      const change =
        location.pathname === '/login' || location.hash.startsWith('#/login')
          ? setAppLocale(target)
          : import('./reload').then(({ requestLocaleReload }) => requestLocaleReload(target));
      void change.catch(error => {
        console.error('[i18n] 跨页语言同步失败', error);
        window.dispatchEvent(new CustomEvent('app-locale-error', { detail: error }));
      });
    }
  };
  if (standalone) window.addEventListener('storage', onStorage);
  return () => {
    stop?.();
    window.removeEventListener('storage', onStorage);
    cancelLocaleChange();
  };
};
