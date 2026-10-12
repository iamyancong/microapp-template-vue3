import type { RouteRecordRaw } from 'vue-router';

/** 菜单类型 */
export const MENU_TYPE = {
  /** 菜单 */
  MENU: 'MENU',
  /** 内嵌菜单 */
  INNER_MENU: 'INNER_MENU',
};

/** 根路由路径。 */
export const ROOT_ROUTE_PATH = '/';

/**
 * 规范化子应用内部路径，兼容异常情况下传入了主应用 activeRule 前缀的路径。
 * @param path 当前待匹配路径
 * @returns 子应用内部路径
 */
export function normalizeMicroRoutePath(path: string): string {
  const activeRule = import.meta.env.VITE_ACTIVE_RULE || `/${import.meta.env.VITE_SUB_APP_NAME}`;
  const pathWithoutActiveRule = path.startsWith(activeRule) ? path.slice(activeRule.length) : path;
  const normalizedPath = pathWithoutActiveRule || '/';
  if (normalizedPath === '/') return '/';
  return `/${normalizedPath.replace(/^\/+/, '')}`;
}

/**
 * 规范化 Vue Router 路由路径。
 * @param path 路由路径
 * @returns 规范化后的路径
 */
export function normalizeRoutePath(path: string): string {
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
  return withLeadingSlash.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
}

/**
 * 拼接父子路由路径。
 * @param parentPath 父路由路径
 * @param childPath 子路由路径
 * @returns 完整子路由路径
 */
export function joinRoutePath(parentPath: string, childPath: string): string {
  if (childPath.startsWith('/')) return normalizeRoutePath(childPath);
  return normalizeRoutePath(`${parentPath}/${childPath}`);
}

/**
 * 从路由 redirect 配置中提取可跳转路径。
 * @param redirect 路由重定向配置
 * @returns 可跳转路径
 */
export function resolveRedirectPath(redirect: RouteRecordRaw['redirect']): string | null {
  if (typeof redirect === 'string') return normalizeRoutePath(redirect);
  if (redirect && typeof redirect === 'object' && 'path' in redirect && typeof redirect.path === 'string') {
    return normalizeRoutePath(redirect.path);
  }
  return null;
}

/**
 * 判断当前异常路径是否属于指定一级路由模块。
 * @param routePath 一级路由路径
 * @param normalizedPath 子应用内部路径
 * @returns 属于该模块返回 true
 */
function isModuleRouteMatched(routePath: string, normalizedPath: string): boolean {
  const normalizedRoutePath = normalizeRoutePath(routePath);
  if (normalizedRoutePath === '/' || normalizedRoutePath.includes(':')) return false;
  return normalizedPath === normalizedRoutePath || normalizedPath.startsWith(`${normalizedRoutePath}/`);
}

/**
 * 从路由配置本身推导模块默认页，优先使用 redirect，其次使用第一个真实页面子路由。
 * @param route 路由配置
 * @param parentPath 父级完整路径
 * @returns 模块默认页路径
 */
export function resolveRouteDefaultPath(route: RouteRecordRaw | undefined, parentPath = ''): string | null {
  if (!route) return null;

  const currentPath = route.path.startsWith('/')
    ? normalizeRoutePath(route.path)
    : joinRoutePath(parentPath, route.path);
  const redirectPath = resolveRedirectPath(route.redirect);
  if (redirectPath) return redirectPath;
  if (route.component || route.components) return currentPath;

  const children = route.children ?? [];
  for (const childRoute of children) {
    const childDefaultPath = resolveRouteDefaultPath(childRoute, currentPath);
    if (childDefaultPath) return childDefaultPath;
  }

  return null;
}

/**
 * 从根路由配置推导全局默认兜底页。
 * @param routesList 路由配置列表
 * @returns 全局默认兜底页
 */
export function resolveRootFallbackRoutePath(routesList: RouteRecordRaw[]): string {
  const rootRoute = routesList.find(route => normalizeRoutePath(route.path) === ROOT_ROUTE_PATH);
  return (rootRoute && resolveRouteDefaultPath(rootRoute)) || ROOT_ROUTE_PATH;
}

/**
 * 根据当前路径所属一级模块解析兜底路由，兜底目标从 routes 配置动态推导。
 * @param path 当前待兜底路径
 * @param routesList 路由配置列表
 * @returns 模块内默认路由
 */
export function resolveFallbackRoutePath(path: string, routesList: RouteRecordRaw[]): string {
  const normalizedPath = normalizeMicroRoutePath(path);
  const matchedRoutes = routesList
    .filter(route => isModuleRouteMatched(route.path, normalizedPath))
    .sort((routeA, routeB) => normalizeRoutePath(routeB.path).length - normalizeRoutePath(routeA.path).length);

  const matchedRoute = matchedRoutes[0];
  return (matchedRoute && resolveRouteDefaultPath(matchedRoute)) ?? resolveRootFallbackRoutePath(routesList);
}
