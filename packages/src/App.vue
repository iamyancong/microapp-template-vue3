<script setup lang="ts">
import { currentAppLocale } from '@/locales/protocol';
import routes from './router';
import { useQiankun } from './hooks/useQiankun';
import { useRouteMenu } from './hooks/useRouteMenu';
import { usePageKeepAliveMax } from './hooks/usePageKeepAliveMax';
import { useThemeStore } from './store/theme';
import { computed, defineAsyncComponent } from 'vue';
import { ConfigProvider } from 'ant-design-vue';
import { antdAppLocale } from '@/locales/antd';
/** 仅独立运行需要导航布局，宿主挂载不下载其实现。 */
const MainLayout = defineAsyncComponent(() => import('@/layout/MainLayout.vue'));

const { isInQiankun } = useQiankun();
const pageKeepAliveMax = usePageKeepAliveMax();
const isDev = import.meta.env.MODE.includes('development');
// 是否在独立部署时强制显示导航布局
// 在packages/.env.production 里 VITE_STANDALONE_LAYOUT 改为false 单独部署之后，就不显示导航了
const showStandaloneLayout = import.meta.env.VITE_STANDALONE_LAYOUT === 'true';

// 是否显示导航布局：非 qiankun 环境下，开发模式或环境变量配置为 true 时显示
const showLayout = computed(() => !isInQiankun.value && (isDev || showStandaloneLayout));

// 本地服务 路由菜单
const { selectedKeys } = useRouteMenu(routes);

// 主题配置
const themeStore = useThemeStore();
const themeConfig = computed(() => themeStore.themeConfig);
</script>

<template>
  <ConfigProvider :theme="themeConfig" :locale="antdAppLocale">
    <div class="micro-app" :lang="currentAppLocale">
      <!-- 独立运行或本地开发模式 -->
      <MainLayout v-if="showLayout" :routes="routes" :selected-keys="selectedKeys" />

      <!-- qiankun 环境中运行 -->
      <!-- keep-alive 必须设置 max：缓存页的响应式副作用在失活后仍常驻，无上限缓存会随访问页数线性拖慢整个应用 -->
      <!-- 不使用 out-in 过渡：退场动画会把新页面挂载推迟 200ms，与门户切换动画叠加造成右侧空白闪烁 -->
      <div v-else class="micro-content">
        <router-view v-slot="{ Component, route }">
          <keep-alive :max="pageKeepAliveMax">
            <component :is="Component" v-if="route.meta.keepAlive === true" :key="route.name || route.fullPath" />
          </keep-alive>
          <component :is="Component" v-if="route.meta.keepAlive !== true" :key="route.fullPath" />
        </router-view>
      </div>
    </div>
  </ConfigProvider>
</template>

<style scoped lang="less">
@import './app.less';
</style>
