/**
 * 简体中文通用与系统基础词条
 * 包含：全局按钮、基础操作、应用信息、路由、异常、菜单与通用校验提示
 */
export default {
  common: {
    switchLanguageTitle: '切换语言',
    switchLanguageConfirm: '切换语言将重新加载当前页面，未保存的内容可能丢失。是否继续？',
    confirmReload: '确认并重新加载',
    defaultSpace: '默认空间',

    languageLoadFailed: '语言资源加载失败，请重试',
    confirm: '确定',
    cancel: '取消',
    save: '保存',
    search: '查询',
    reset: '重置',
    add: '新增',
    edit: '编辑',
    delete: '删除',
    submit: '提交',
    back: '返回',
    operation: '操作',
    status: '状态',
    remark: '备注',
    createTime: '创建时间',
    updateTime: '更新时间',
    loading: '加载中...',
    noData: '暂无数据',
    success: '操作成功',
    failed: '操作失败',
    confirmDelete: '确定删除该记录吗？',
    execute: '执行',
    view: '查看',
    close: '关闭',
    select: '请选择',
    input: '请输入',
    total: '共 {total} 条',
    more: '更多',
  },
  app: {
    name: '微应用平台',
  },
  route: {
    login: '登录',
    demoTable: '测试YSSUITable',
    notFound: '页面不存在',
  },
  exception: {
    notFound: '页面不存在',
    notFoundSubTitle: '抱歉，您访问的页面不存在：{path}',
    backHome: '返回首页',
  },
  menu: {
    help: '帮助文档',
    notifications: '消息通知',
    profile: '个人中心',
    settings: '个人设置',
    logout: '退出登录',
  },
  validate: {
    required: '请输入{field}',
    selectRequired: '请选择{field}',
    email: '请输入正确的邮箱地址',
    phone: '请输入正确的手机号码',
  },
};
