<script setup lang="ts">
import { computed, h } from 'vue';
import { RouterLink } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { Menu, type ItemType } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';

interface Props {
  routes: RouteRecordRaw[];
  selectedKeys?: string[];
  theme?: 'dark' | 'light';
  mode?: 'horizontal' | 'vertical' | 'inline';
}

const props = withDefaults(defineProps<Props>(), {
  selectedKeys: () => [],
  theme: 'dark',
  mode: 'horizontal',
});

const { t, te } = useI18n();

const resolveMenuPath = (path: string, parentPath = '') => {
  if (path.startsWith('/')) return path;
  const normalizedParent = parentPath.endsWith('/') ? parentPath.slice(0, -1) : parentPath;
  return `${normalizedParent}/${path}` || '/';
};

/**
 * 解析路由项国际化标题，优先取 i18nKey，若不存在或未配置则取 title。
 * @param route 路由记录
 */
const resolveRouteTitle = (route: RouteRecordRaw): string => {
  const i18nKey = route.meta?.i18nKey as string | undefined;
  if (i18nKey && te(i18nKey)) {
    return t(i18nKey);
  }
  const title = (route.meta?.title as string) || '';
  if (title && te(title)) {
    return t(title);
  }
  return title;
};

// Transform routes to Ant Design Vue menu items
const transformRoutesToItems = (routes: RouteRecordRaw[], parentPath = ''): ItemType[] => {
  return routes
    .filter(
      route =>
        (!route.redirect || (route.children && route.children.length > 0)) && (route.meta?.title || route.meta?.i18nKey)
    )
    .map(route => {
      const fullPath = resolveMenuPath(route.path, parentPath);
      const hasChildren = route.children && route.children.length > 0;
      const children = hasChildren ? transformRoutesToItems(route.children!, fullPath) : undefined;

      const key = (route.name as string) || route.path;
      const displayTitle = resolveRouteTitle(route);

      const label = hasChildren || !route.path ? displayTitle : h(RouterLink, { to: fullPath }, () => displayTitle);

      const icon = route.meta?.icon ? () => h(route.meta!.icon as any) : undefined;

      return {
        key,
        label,
        title: displayTitle,
        icon,
        children,
      } as ItemType;
    });
};

const menuItems = computed(() => transformRoutesToItems(props.routes));
</script>

<template>
  <Menu :selected-keys="selectedKeys" :theme="theme" :mode="mode" :items="menuItems" class="recursive-menu" />
</template>

<style scoped lang="less">
.recursive-menu {
  background: transparent;
  border-bottom: none;
  line-height: 64px;

  :deep(.ant-menu-item),
  :deep(.ant-menu-submenu-title) {
    padding: 0 16px;

    &:hover {
      color: v-bind('theme === "dark" ? "#fff" : "var(--ant-primary-color)"');
    }
  }

  :deep(.ant-menu-item-selected) {
    font-weight: 500;
  }
}
</style>
