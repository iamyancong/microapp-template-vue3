import '@/polyfills/chrome90';
import { createApp } from 'vue';
import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'; // Hash 模式用于 JSP,History 模式用于 qiankun
import { createPinia } from 'pinia';
import 'ant-design-vue/dist/reset.css';
import '@/styles/index.less';

// 同步加载 JSP 主题样式（确保在 ConfigProvider 初始化前加载）
// 使用 Vite 的条件编译，由 Vite 在构建时确定导入
const jspTheme = import.meta.env.VITE_JSP_THEME;
if (jspTheme === 'classic-blue' || jspTheme === 'guangda') {
  import('./styles/themes/classic-blue.less');
  console.log('[主题系统] 加载经典蓝主题样式');
} else if (jspTheme === 'crimson-red' || jspTheme === 'renbao') {
  import('./styles/themes/crimson-red.less');
  console.log('[主题系统] 加载活力红主题样式');
}
import '@yss-ui/components/dist/style.css';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { useThemeStore } from './store/theme';
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
// import { setupIconfont } from './plugins/iconfont';
import { createStyleManager } from './utils/styleManager';
import { resolveMicroAppFullPath, setupMicroAppRouterBridge } from './utils/microAppRouterBridge';
import type { MicroAppLifecycleProps } from './types/microAppBridge';
import { i18n, installLocale } from '@/locales';
import { initializeLocale, applyHostLocale, startLocaleSync } from '@/locales/bridge';

dayjs.locale('zh-cn');

// 子应用名称
const SUB_APP_NAME = import.meta.env.VITE_SUB_APP_NAME;

// 创建样式管理器（自动注册事件监听）
const styleManager = createStyleManager(SUB_APP_NAME);

let app: any;
let router: any;
let history: any;
let routerBridgeCleanup: (() => void) | undefined;
let localeEventCleanup: (() => void) | undefined;
let currentActiveRule = import.meta.env.VITE_ACTIVE_RULE || `/${SUB_APP_NAME}`;

/**
 * 获取当前挂载使用的路由前缀，优先采用门户下发的契约值。
 * @param props 微应用生命周期 Props
 * @returns 当前微应用路由前缀
 */
function resolveActiveRule(props: MicroAppLifecycleProps): string {
  return props.routerBase || import.meta.env.VITE_ACTIVE_RULE || `/${SUB_APP_NAME}`;
}

/**
 * 渲染微应用。
 * @param props 微应用生命周期 Props
 */
async function render(props: MicroAppLifecycleProps = {}) {
  localeEventCleanup?.();
  localeEventCleanup = undefined;
  await initializeLocale(props, !qiankunWindow.__POWERED_BY_QIANKUN__);
  /** 目标语言就绪后再求值静态 Schema、columns 和路由依赖。 */
  const [{ default: App }, { default: routes }] = await Promise.all([import('./App.vue'), import('./router')]);
  const subAppName = import.meta.env.VITE_SUB_APP_NAME;
  const activeRule = resolveActiveRule(props);
  currentActiveRule = activeRule;
  const { container } = props;

  // 判断运行环境：
  // 1. qiankun环境（被主应用加载）
  // 2. JSP环境（打包后嵌入JSP页面）
  // 3. 独立部署生产环境（单体独立部署）
  // 4. 本地开发环境（独立运行，统一使用 activeRule 完整前缀）
  const isJSP = import.meta.env.VITE_IS_JSP === 'true';
  const isInQiankun = qiankunWindow.__POWERED_BY_QIANKUN__;
  const isStandaloneDeploy = import.meta.env.VITE_STANDALONE_DEPLOY === 'true';

  const normalizeBase = (v: string) => (v.endsWith('/') ? v : `${v}/`);

  if (isInQiankun) {
    // qiankun 环境（优先级最高，即使是 standalone 产物嵌入也以主应用路由为准）：使用 History 模式，带子应用路径前缀
    const base = normalizeBase(activeRule);
    history = createWebHistory(base);
  } else if (isJSP) {
    // JSP 打包环境：使用 Hash 模式
    history = createWebHashHistory();
  } else if (isStandaloneDeploy) {
    // 独立部署生产环境（非 qiankun 嵌入）：使用 History 模式，根路径
    history = createWebHistory('/');
  } else {
    // 本地开发独立运行环境：使用 History 模式，带子应用路径前缀
    const base = normalizeBase(activeRule);
    history = createWebHistory(base);
  }

  router = createRouter({
    history,
    routes,
  });

  /**
   * 初始导航矫正守卫（qiankun 环境及本地开发独立运行环境生效）
   *
   * 问题：子应用首次挂载时，Vue Router 的初始路由解析可能因
   * 时序问题无法正确匹配浏览器 URL 对应的子路径，导致 catch-all 路由触发并
   * 重定向到默认工作台页面。
   *
   * 原理：beforeEach 在 Vue Router 调用 history.replaceState 之前执行，
   * 此时 window.location.pathname 仍然是导航设置的正确 URL。
   * 守卫从中提取子应用子路径，与 Vue Router 解析的目标路径对比，
   * 若不一致则覆盖为正确路径。
   */
  if (isInQiankun || (!isJSP && !isStandaloneDeploy)) {
    let isFirstNavigation = true;
    router.beforeEach((to: any) => {
      if (!isFirstNavigation) return true;
      isFirstNavigation = false;

      const expectedFullPath = resolveMicroAppFullPath(activeRule, window.location);

      if (expectedFullPath && expectedFullPath !== '/' && to.fullPath !== expectedFullPath) {
        return expectedFullPath;
      }

      return true;
    });
  }

  app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.use(i18n);
  installLocale(app);
  // 禁止全量 app.use(YSSUI)：全量安装的 install 会引用组件库全部组件，
  // 把 YSheet(Univer)、YMonaco(Monaco) 等重组件拖进首屏 bundle（实测 +8MB），
  // 且 Chrome 90 等低版本浏览器解析超大 JS 会直接卡顿白屏。
  // 业务页面一律显式按需导入：import { YTable } from '@yss-ui/components'。

  // 初始化主题（来自主应用的 props.themeConfig）
  const themeStore = useThemeStore();
  themeStore.init(props.themeConfig);

  // 初始化国际化：门户下发的 locale 优先，否则读取本地持久化/浏览器语言

  const containerEl = container ? container.querySelector('#app') || container.querySelector(`#${subAppName}`) : '#app';

  // 注册 Iconfont（CDN + 本地回退） 用法：在页面直接使用 YIcon 组件 <YIcon type="iconI1093-nianjinzuhe" />
  // setupIconfont(app, {
  //   scriptUrls: [
  //     'https://at.alicdn.com/t/c/font_3948833_yhvtfgdjw7.js',
  //     'https://at.alicdn.com/t/c/font_1854291_cbm1e4kr0jf.js',
  //     '/iconfont/local-iconfont.js',
  //   ],
  //   extraCommonProps: { style: { fontSize: '16px', marginRight: '0' } },
  // });
  app.mount(containerEl);
  localeEventCleanup = startLocaleSync(!isInQiankun);
  await router.isReady();
  if (!isInQiankun) {
    requestAnimationFrame(() => window.__YSS_LOCALE_RELOAD__?.finish());
  }

  // 从 JSP 传递的初始路由跳转
  if (!isInQiankun && (window as any).initialRoute && router) {
    router.push((window as any).initialRoute);
  }
}

renderWithQiankun({
  async mount(props) {
    // 先执行 render，确保路由就绪且样式注入完成
    await render(props as MicroAppLifecycleProps);

    // render 完成后立即记录和启用样式，消除 100ms 延迟带来的样式闪烁
    styleManager.recordStyles();
    styleManager.enableStyles();
    routerBridgeCleanup?.();
    routerBridgeCleanup = setupMicroAppRouterBridge({
      router,
      appName: import.meta.env.VITE_SUB_APP_NAME,
      activeRule: currentActiveRule,
    });
  },
  bootstrap() {},
  unmount() {
    localeEventCleanup?.();
    localeEventCleanup = undefined;
    // 清理路由、浏览器历史和 Vite 预加载错误监听
    routerBridgeCleanup?.();
    routerBridgeCleanup = undefined;

    // 卸载时：禁用 Vite 注入的样式，避免污染其他子应用
    styleManager.disableStyles();

    app?.unmount();
    app = null;
    router = null;
    history?.destroy?.();
  },
  async update(props) {
    // 主应用主题更新时，同步到子应用
    const lifecycleProps = props as MicroAppLifecycleProps;
    const themeStore = useThemeStore();
    themeStore.applyFromMain(lifecycleProps.themeConfig);

    // 主应用语言切换时，同步子应用国际化
    await applyHostLocale(lifecycleProps);
  },
});

// 独立运行时
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  void render().catch(error => {
    console.error('[i18n] 应用初始化失败', error);
  });
}

/** 热重载同样清理语言监听和在途操作。 */
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    localeEventCleanup?.();
  });
