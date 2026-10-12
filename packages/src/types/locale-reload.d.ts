/** HTML 引导脚本提供的过渡层；不依赖 Vue 或任何微应用实现。 */
interface LocaleReloadOverlay {
  show: (locale: string) => void;
  finish: () => void;
  fail: () => void;
  cancel: () => void;
}
interface Window {
  __YSS_LOCALE_RELOAD__?: LocaleReloadOverlay;
}
