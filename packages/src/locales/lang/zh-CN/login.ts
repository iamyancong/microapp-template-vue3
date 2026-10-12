/**
 * 简体中文 - 登录模块语言包
 */
export default {
  title: '{app} - 访问认证',
  expiredSubTitle: '登录已过期，请重新登录系统',
  devSubTitle: '登录已过期或未配置授权 Token。本地开发模式下请在下方注入 Access Token 登录系统',
  tokenPlaceholder: '请在此输入或粘贴 Bearer Access Token...',
  saveAndEnter: '保存 Token 并进入系统',
  clearToken: '清除现有的 Token',
  inputWarning: '请输入 Access Token',
  saveSuccess: 'Token 保存成功，正在进入系统...',
  saveError: 'Token 保存失败',
  clearedInfo: '已清除当前的 Access Token',
  debugTitle: '本地调试说明：',
  debugTip1: "保存后，系统会将 Token 写入浏览器的 localStorage['access_token']。",
  debugTip2: '后续 API 请求将自动携带 Authorization: Bearer <Token> 请求头。',
};
