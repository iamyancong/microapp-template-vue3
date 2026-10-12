const LOW_END_KEEP_ALIVE_MAX = 2;
const MODERN_KEEP_ALIVE_MAX = 6;

/**
 * 按浏览器和设备能力解析页面缓存上限。
 * @returns keep-alive 最大缓存页面数量
 */
export const resolvePageKeepAliveMax = (): number => {
  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const chromeMatched = userAgent.match(/Chrome\/(\d+)/i);
  const chromeMajor = chromeMatched?.[1] ? Number.parseInt(chromeMatched[1], 10) : 0;
  const cores = typeof navigator === 'undefined' ? 8 : navigator.hardwareConcurrency || 8;
  const memory =
    typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { deviceMemory?: number }).deviceMemory;

  if (
    /Windows NT 6\.1/i.test(userAgent) ||
    (chromeMajor > 0 && chromeMajor < 100) ||
    cores <= 4 ||
    (memory !== undefined && memory <= 4)
  ) {
    return LOW_END_KEEP_ALIVE_MAX;
  }

  return MODERN_KEEP_ALIVE_MAX;
};

/**
 * 获取当前微应用页面缓存上限。
 * @returns 当前设备适用的 keep-alive 最大缓存页面数量
 */
export const usePageKeepAliveMax = (): number => resolvePageKeepAliveMax();
