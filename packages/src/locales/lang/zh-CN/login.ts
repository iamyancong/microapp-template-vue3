/**
 * 简体中文 - 登录模块语言包
 */
export default {
  title: '{app} - 访问认证',
  expiredSubTitle: '登录已过期，请重新登录系统',
  devSubTitle: '本地独立开发模式下，请配置测试环境认证凭据以访问联调后端',
  // Tab 切换
  tabBff: 'BFF 会话模式 (Cookie)',
  tabToken: '传统 Token 模式 (Bearer)',
  // BFF 模式
  cookieLabel: 'Cookie 凭据 (Cookie Header)',
  cookiePlaceholder: '请在此输入或粘贴测试环境 Cookie（例如：SESSION=xxxx-xxxx; satoken=yyyy...）',
  saveCookieAndEnter: '保存 Cookie 并进入系统',
  clearCookie: '清除现有 Cookie',
  cookieInputWarning: '请输入测试环境 Cookie 字符串',
  cookieSaveSuccess: 'Cookie 凭据保存成功，正在进入系统...',
  cookieClearedInfo: '已清除本地 Cookie 凭据',
  // 指引提示
  howToGetCookie: '如何获取测试环境 Cookie？',
  cookieGuideDesc: '按 F12 打开网络面板 (Network)，点击任意接口，复制请求标头中的 Cookie 字段并粘贴到上方。',
  proxyTargetLabel: '当前代理目标',
  // Token 模式
  tokenLabel: 'Access Token',
  tokenPlaceholder: '请在此输入或粘贴 Bearer Access Token...',
  saveAndEnter: '保存 Token 并进入系统',
  clearToken: '清除现有的 Token',
  inputWarning: '请输入 Access Token',
  saveSuccess: 'Token 保存成功，正在进入系统...',
  saveError: '凭据保存失败',
  clearedInfo: '已清除当前的 Access Token',
  debugTitle: '本地调试说明：',
  debugTipBff: 'BFF 模式：凭据会写入本地 localhost 域，后续 API 将携带 Cookie 会话且无需 Authorization 头。',
  debugTipToken:
    "Token 模式：凭据写入 localStorage['access_token']，后续 API 将自动携带 Authorization: Bearer <Token> 头。",
};
