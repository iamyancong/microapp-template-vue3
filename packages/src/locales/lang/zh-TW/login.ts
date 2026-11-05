/**
 * 繁體中文 - 登入模組語言包
 */
export default {
  title: '{app} - 存取認證',
  expiredSubTitle: '登入已過期，請重新登入系統',
  devSubTitle: '本地獨立開發模式下，請配置測試環境認證憑據以存取聯調後端',
  // Tab 切換
  tabBff: 'BFF 會話模式 (Cookie)',
  tabToken: '傳統 Token 模式 (Bearer)',
  // BFF 模式
  cookieLabel: 'Cookie 憑據 (Cookie Header)',
  cookiePlaceholder: '請在此輸入或貼上測試環境 Cookie（例如：SESSION=xxxx-xxxx; satoken=yyyy...）',
  saveCookieAndEnter: '儲存 Cookie 並進入系統',
  clearCookie: '清除現有 Cookie',
  cookieInputWarning: '請輸入測試環境 Cookie 字串',
  cookieSaveSuccess: 'Cookie 憑據儲存成功，正在進入系統...',
  cookieClearedInfo: '已清除本地 Cookie 憑據',
  // 指引提示
  howToGetCookie: '如何獲取測試環境 Cookie？',
  cookieGuideDesc: '按 F12 打開網路面板 (Network)，點擊任意介面，複製請求標頭中的 Cookie 欄位並貼上到上方。',
  proxyTargetLabel: '當前代理目標',
  // Token 模式
  tokenLabel: 'Access Token',
  tokenPlaceholder: '請在此輸入或貼上 Bearer Access Token...',
  saveAndEnter: '儲存 Token 並進入系統',
  clearToken: '清除現有的 Token',
  inputWarning: '請輸入 Access Token',
  saveSuccess: 'Token 儲存成功，正在進入系統...',
  saveError: '憑據儲存失敗',
  clearedInfo: '已清除當前的 Access Token',
  debugTitle: '本地除錯說明：',
  debugTipBff: 'BFF 模式：憑據會寫入本地 localhost 域，後續 API 將攜帶 Cookie 會話且無需 Authorization 標頭。',
  debugTipToken:
    "Token 模式：憑據寫入 localStorage['access_token']，後續 API 將自動攜帶 Authorization: Bearer <Token> 標頭。",
};
