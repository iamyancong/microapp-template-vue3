import { computed } from 'vue';
import type { RouteRecordRaw } from 'vue-router';

/**
 * 路由缓存相关的 hook
 * @param routes 路由配置数组
 * @returns 返回缓存相关的响应式数据和方法
 */
export function useKeepAlive(routes: RouteRecordRaw[]) {
  /**
   * 递归遍历路由配置，找出所有配置了 keepAlive: true 的路由名称
   * @param routeList 路由配置列表
   * @returns 需要缓存的路由名称数组
   */
  const getKeepAliveRoutes = (routeList: RouteRecordRaw[]): string[] => {
    const result: string[] = [];

    routeList.forEach(route => {
      // 检查当前路由是否需要缓存
      if (route.meta && route.meta.keepAlive === true && route.name) {
        result.push(route.name as string);
      }

      // 递归检查子路由
      if (route.children && route.children.length > 0) {
        result.push(...getKeepAliveRoutes(route.children));
      }
    });

    return result;
  };

  /**
   * 需要缓存的路由组件名称 - 从路由配置自动获取
   */
  const cachedRoutes = computed(() => {
    return getKeepAliveRoutes(routes);
  });

  /**
   * 判断指定路由是否需要缓存
   * @param routeName 路由名称
   * @returns 是否需要缓存
   */
  const isRouteCached = (routeName: string): boolean => {
    return cachedRoutes.value.includes(routeName);
  };

  /**
   * 获取所有可缓存的路由信息
   * @returns 可缓存路由的详细信息
   */
  const getCacheableRoutes = () => {
    const cacheableRoutes: Array<{ name: string; title?: string; path?: string }> = [];

    const collectRoutes = (routeList: RouteRecordRaw[]) => {
      routeList.forEach(route => {
        if (route.meta && route.meta.keepAlive === true && route.name) {
          cacheableRoutes.push({
            name: route.name as string,
            title: route.meta.title as string,
            path: route.path,
          });
        }

        if (route.children && route.children.length > 0) {
          collectRoutes(route.children);
        }
      });
    };

    collectRoutes(routes);
    return cacheableRoutes;
  };

  return {
    cachedRoutes,
    isRouteCached,
    getCacheableRoutes,
  };
}
