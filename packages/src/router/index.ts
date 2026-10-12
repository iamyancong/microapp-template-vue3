import type { RouteRecordRaw } from 'vue-router';
import { TableOutlined } from '@ant-design/icons-vue';
import { MENU_TYPE } from './utils';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/table',
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login/index.vue'),
    meta: { menuType: MENU_TYPE.INNER_MENU, title: '登录', keepAlive: false, hidden: true },
  },
  {
    path: '/table',
    name: 'TableDemo',
    component: () => import('@/views/Demo/index.vue'),
    meta: {
      title: '测试YSSUITable',
      i18nKey: 'route.demoTable',
      icon: TableOutlined,
      keepAlive: true,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'Exception404',
    component: () => import('@/views/Exception404/index.vue'),
    meta: {
      title: '页面不存在',
      hidden: true,
      // 内嵌页面，不显示在菜单中
      menuType: MENU_TYPE.INNER_MENU,
    },
  },
];

export { routes, MENU_TYPE };
export default routes;
