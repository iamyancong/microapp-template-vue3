/**
 * 繁體中文 - 登入模組語言包
 */
export default {
  title: '{app} - 存取認證',
  expiredSubTitle: '登入已過期，請重新登入系統',
  devSubTitle: '登入已過期或未配置授權 Token。本地開發模式下請在下方注入 Access Token 登入系統',
  tokenPlaceholder: '請在此輸入或貼上 Bearer Access Token...',
  saveAndEnter: '儲存 Token 並進入系統',
  clearToken: '清除現有的 Token',
  inputWarning: '請輸入 Access Token',
  saveSuccess: 'Token 儲存成功，正在進入系統...',
  saveError: 'Token 儲存失敗',
  clearedInfo: '已清除當前的 Access Token',
  debugTitle: '本地除錯說明：',
  debugTip1: "儲存後，系統會將 Token 寫入瀏覽器的 localStorage['access_token']。",
  debugTip2: '後續 API 請求將自動攜帶 Authorization: Bearer <Token> 請求標頭。',
};
