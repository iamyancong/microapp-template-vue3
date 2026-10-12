import type { MockMethod, Recordable } from 'vite-plugin-mock';

export default [
  // 获取微应用数据
  {
    url: '/api/micro/data',
    method: 'get',
    response: () => {
      return {
        code: 200,
        message: 'success',
        data: {
          id: 1,
          name: '微应用数据',
          description: '这是来自微应用的模拟数据',
          items: [
            { id: 1, name: '项目1', status: '进行中' },
            { id: 2, name: '项目2', status: '已完成' },
            { id: 3, name: '项目3', status: '待开始' },
          ],
          timestamp: new Date().toISOString(),
        },
      };
    },
  },
  // 获取用户列表
  {
    url: '/api/micro/users',
    method: 'get',
    response: ({ query }: { query: Recordable }) => {
      const { page = 1, pageSize = 10 } = query;
      const total = 50;
      const users: Array<{
        id: number;
        name: string;
        email: string;
        status: string;
        createTime: string;
      }> = [];

      for (let i = 0; i < pageSize; i++) {
        const id = (page - 1) * pageSize + i + 1;
        if (id <= total) {
          users.push({
            id,
            name: `微应用用户${id}`,
            email: `microuser${id}@example.com`,
            status: Math.random() > 0.5 ? '激活' : '禁用',
            createTime: new Date().toLocaleDateString(),
          });
        }
      }

      return {
        code: 200,
        message: 'success',
        data: {
          list: users,
          total,
          page: Number(page),
          pageSize: Number(pageSize),
        },
      };
    },
  },
  // 获取用户详情
  {
    url: '/api/micro/user/:id',
    method: 'get',
    response: ({ query }: { query: Recordable }) => {
      const { id } = query;
      return {
        code: 200,
        message: 'success',
        data: {
          id: Number(id),
          name: `微应用用户${id}`,
          email: `microuser${id}@example.com`,
          phone: '13800138000',
          status: '激活',
          role: '普通用户',
          createTime: '2024-01-01 10:00:00',
          lastLogin: '2024-01-15 14:30:00',
          remark: '这是微应用的测试用户信息。',
        },
      };
    },
  },
] satisfies MockMethod[];
