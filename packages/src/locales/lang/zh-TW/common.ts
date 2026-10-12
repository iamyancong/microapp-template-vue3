/**
 * 繁體中文通用與系統基礎詞條
 * 包含：全域按鈕、基礎操作、應用資訊、路由、異常、選單與通用校驗提示
 */
export default {
  common: {
    switchLanguageTitle: '切換語言',
    switchLanguageConfirm: '切換語言將重新載入目前頁面，未儲存的內容可能遺失。是否繼續？',
    confirmReload: '確認並重新載入',
    defaultSpace: '預設空間',

    languageLoadFailed: '語言資源載入失敗，請重試',
    confirm: '確定',
    cancel: '取消',
    save: '儲存',
    search: '查詢',
    reset: '重設',
    add: '新增',
    edit: '編輯',
    delete: '刪除',
    submit: '提交',
    back: '返回',
    operation: '操作',
    status: '狀態',
    remark: '備註',
    createTime: '建立時間',
    updateTime: '更新時間',
    loading: '載入中...',
    noData: '暫無資料',
    success: '操作成功',
    failed: '操作失敗',
    confirmDelete: '確定刪除該記錄嗎？',
    execute: '執行',
    view: '查看',
    close: '關閉',
    select: '請選擇',
    input: '請輸入',
    total: '共 {total} 條',
    more: '更多',
  },
  app: {
    name: '微應用平臺',
  },
  route: {
    login: '登入',
    demoTable: '測試YSSUITable',
    notFound: '頁面不存在',
  },
  exception: {
    notFound: '頁面不存在',
    notFoundSubTitle: '抱歉，您存取的頁面不存在：{path}',
    backHome: '返回首頁',
  },
  menu: {
    help: '幫助文件',
    notifications: '訊息通知',
    profile: '個人中心',
    settings: '個人設定',
    logout: '退出登入',
  },
  validate: {
    required: '請輸入{field}',
    selectRequired: '請選擇{field}',
    email: '請輸入正確的電子郵件地址',
    phone: '請輸入正確的手機號碼',
  },
};
