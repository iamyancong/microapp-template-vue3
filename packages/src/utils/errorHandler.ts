import { t } from '@/locales';
/**
 * 错误处理工具
 */
import { customMessage } from './message';
import { clearAuthInfo } from '@yss-ui/utils';

// 错误消息映射
const ERROR_MESSAGES: Record<number, string> = {
  401: 'http.unauthorized',
  403: 'http.forbidden',
  404: 'http.notFound',
  500: 'http.serverError',
};

// 避免重复跳转登录页
let hasRedirectedFor401 = false;
let last401ToastTime = 0;

/**
 * 判断当前是否已经在登录页面
 */
const isAlreadyOnLoginPage = () => {
  const currentPath = window.location.pathname;
  const currentHash = window.location.hash;
  return currentPath.includes('/login') || currentHash.includes('/login');
};

const redirectToLogin = () => {
  // 如果已经在登录页，绝不重复重定向/刷页
  if (isAlreadyOnLoginPage() || hasRedirectedFor401) return;
  hasRedirectedFor401 = true;

  // 稍作延迟，确保提示能被用户看到
  const go = () => {
    const loginPath = '/login';
    if (isAlreadyOnLoginPage()) return;

    try {
      // 在微前端和独立运行场景，统一跳主窗口的登录页
      const topWindow: Window = window.top || window;
      if (topWindow.location.pathname.includes(loginPath)) return;
      topWindow.location.assign(loginPath);
    } catch {
      if (window.location.pathname.includes(loginPath)) return;
      window.location.assign(loginPath);
    }
  };

  // 使用较短延时，避免影响交互
  setTimeout(go, 500);
};

/**
 * 处理HTTP错误响应
 * @param status HTTP状态码
 * @param errorMessage 自定义错误消息
 */
export function handleHttpError(status: number, errorMessage?: string) {
  const defaultMessage = t(ERROR_MESSAGES[status] || 'http.unknown');
  const finalMessage = errorMessage || defaultMessage;

  if (status === 401) {
    // 401 提示进行 3 秒防抖，避免多个并发请求引发弹窗轰炸
    const now = Date.now();
    if (now - last401ToastTime > 3000) {
      last401ToastTime = now;
      customMessage.error(finalMessage);
    }

    if (!isAlreadyOnLoginPage()) {
      clearAuthInfo();
      redirectToLogin();
    }
    return;
  }

  // 显示错误消息
  customMessage.error(finalMessage);
}

/**
 * 检查响应状态并处理错误
 * @param response 响应对象
 * @param autoHandle 是否自动处理错误
 */
export function checkResponseStatus(response: any, autoHandle = true) {
  if (response?.status && response.status !== 200) {
    if (autoHandle) {
      handleHttpError(response.status, response.message);
    }
    return false;
  }
  return true;
}
/**
 * 从 HTTP 错误响应中提取错误消息
 * @param error 错误对象
 */
async function extractErrorMessage(error: any): Promise<string | undefined> {
  const responseData = error.response?.data;
  if (!responseData) return undefined;

  // 1. 如果是 Blob 对象（常见于 responseType: 'blob' 的导出/调试/上传接口报错）
  if (responseData instanceof Blob) {
    try {
      if (typeof responseData.text === 'function') {
        const text = await responseData.text();
        const parsed = JSON.parse(text);
        return parsed.message || parsed.msg || parsed.tips;
      }
    } catch (e) {
      console.warn('Failed to parse error Blob response as JSON:', e);
      return undefined;
    }
  }

  // 2. 如果已经是对象
  if (typeof responseData === 'object') {
    return responseData.message || responseData.msg || responseData.tips;
  }

  // 3. 如果是 JSON 字符串
  if (typeof responseData === 'string') {
    try {
      const parsed = JSON.parse(responseData);
      return parsed.message || parsed.msg || parsed.tips;
    } catch {
      return responseData;
    }
  }

  return undefined;
}

/**
 * 全局错误处理器
 * @param error 错误对象
 */
export async function globalErrorHandler(error: any) {
  // 网络错误
  if (!navigator.onLine) {
    customMessage.error(t('http.offline'));
    return;
  }

  // HTTP错误
  if (error.response?.status) {
    const errorMessage = await extractErrorMessage(error);
    handleHttpError(error.response.status, errorMessage);
    return;
  }

  // 其他错误
  const errorMessage = error.message || t('http.unknown');
  customMessage.error(errorMessage);
}

/**
 * 统一处理响应错误，保持与老项目一致的拦截行为
 */
export async function handleErrorResponse(error: any) {
  await globalErrorHandler(error);
  return Promise.reject(error);
}
