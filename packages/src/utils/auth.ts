import { ref } from 'vue';
import type { MicroAppLifecycleProps } from '@/types/microAppBridge';

/** 认证架构模式：bff 模式（HttpOnly Cookie凭据）或 local_token 模式（localStorage Bearer token） */
export type AuthMode = 'bff' | 'local_token';

/** 响应式当前认证模式，默认 local_token 保障向后兼容 */
const currentAuthMode = ref<AuthMode>('local_token');

/**
 * 获取当前激活的认证模式
 * @returns 'bff' | 'local_token'
 */
export function getAuthMode(): AuthMode {
  return currentAuthMode.value;
}

/**
 * 显式设置认证模式
 * @param mode 目标模式
 */
export function setAuthMode(mode: AuthMode): void {
  currentAuthMode.value = mode;
}

/**
 * 判断当前是否为 BFF 架构会话模式
 */
export function isBffMode(): boolean {
  return currentAuthMode.value === 'bff';
}

/**
 * 判断当前是否为传统 LocalStorage Token 模式
 */
export function isLocalTokenMode(): boolean {
  return currentAuthMode.value === 'local_token';
}

/**
 * 获取当前存储的 access_token（剔除可能存在的双引号及无效空串/脏数据）
 */
export function getAccessToken(): string | null {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    const cleaned = token.replace(/^"|"$/g, '').trim();
    if (!cleaned || cleaned === 'null' || cleaned === 'undefined') return null;
    return cleaned;
  } catch {
    return null;
  }
}

/**
 * 将测试环境的 Cookie 字符串写入当前本地 localhost 域
 * @param cookieStr 形如 "SESSION=xxx; satoken=yyy" 的 Cookie 字符串
 */
export function applyDevCookie(cookieStr: string): void {
  if (!cookieStr) return;
  const items = cookieStr.split(';');
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    // 写入当前域，有效期 7 天
    document.cookie = `${trimmed}; path=/; max-age=604800; SameSite=Lax`;
  }
}

/**
 * 清除当前本地 localhost 域下的常见会话 Cookie
 */
export function clearDevCookie(): void {
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.slice(0, eqPos).trim() : cookie.trim();
      if (name) {
        document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
    }
  } catch {}
}

/**
 * 自适应决策当前应用运行所需的认证模式
 * 决策优先级链：
 * 1. 主应用通过 qiankun props 显式下发（props.authMode）
 * 2. 同源下主应用登录写入的 localStorage.getItem('auth_mode')（兼顾 iframe / Nginx 路由跨页面跳转）
 * 3. 检查 localStorage.getItem('access_token') 是否存在，若存在且有效则进入 local_token 模式
 * 4. 环境变量 VITE_APP_AUTH_MODE 指定模式
 * 5. 默认向后兼容兜底：local_token
 *
 * @param props 可选的微应用生命周期 Props
 * @returns 确定的认证模式
 */
export function resolveAuthMode(props?: MicroAppLifecycleProps): AuthMode {
  // 1. 优先读取主应用通过 props 显式下发的模式
  if (props?.authMode === 'bff' || props?.authMode === 'local_token') {
    setAuthMode(props.authMode);
    return props.authMode;
  }

  // 2. 读取主应用在 localStorage 中写入的全局认证模式标记
  try {
    const storedMode = localStorage.getItem('auth_mode');
    if (storedMode === 'bff' || storedMode === 'local_token') {
      setAuthMode(storedMode);
      return storedMode;
    }
  } catch {}

  // 3. 检查是否存在旧模式 access_token
  const localToken = getAccessToken();
  if (localToken) {
    setAuthMode('local_token');
    return 'local_token';
  }

  // 4. 读取环境变量指定模式
  const envMode = import.meta.env.VITE_APP_AUTH_MODE;
  if (envMode === 'bff' || envMode === 'local_token') {
    setAuthMode(envMode);
    return envMode;
  }

  // 5. 默认老模式向后兼容兜底
  setAuthMode('local_token');
  return 'local_token';
}

// 模块加载时执行自适应探测
try {
  resolveAuthMode();
} catch {}
