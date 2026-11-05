/**
 * English - Login module language pack
 */
export default {
  title: '{app} - Access Authorization',
  expiredSubTitle: 'Session expired, please log in again',
  devSubTitle:
    'Under local standalone development mode, please configure test environment credentials to access backend services.',
  // Tab switch
  tabBff: 'BFF Session Mode (Cookie)',
  tabToken: 'Legacy Token Mode (Bearer)',
  // BFF Mode
  cookieLabel: 'Cookie Credentials (Cookie Header)',
  cookiePlaceholder: 'Please enter or paste test environment Cookie here (e.g. SESSION=xxxx; satoken=yyyy...)',
  saveCookieAndEnter: 'Save Cookie & Enter',
  clearCookie: 'Clear Existing Cookie',
  cookieInputWarning: 'Please enter test environment Cookie string',
  cookieSaveSuccess: 'Cookie credentials saved successfully, entering system...',
  cookieClearedInfo: 'Local Cookie credentials cleared',
  // Guide tips
  howToGetCookie: 'How to obtain test environment Cookie?',
  cookieGuideDesc: 'Press F12 to open Network panel, click any request, copy Cookie header and paste it above.',
  proxyTargetLabel: 'Current Proxy Target',
  // Token Mode
  tokenLabel: 'Access Token',
  tokenPlaceholder: 'Please enter or paste Bearer Access Token here...',
  saveAndEnter: 'Save Token & Enter',
  clearToken: 'Clear Existing Token',
  inputWarning: 'Please enter Access Token',
  saveSuccess: 'Token saved successfully, entering system...',
  saveError: 'Failed to save credentials',
  clearedInfo: 'Current Access Token cleared',
  debugTitle: 'Local Debugging Notes:',
  debugTipBff:
    'BFF Mode: Credentials are saved into localhost domain. Subsequent APIs will carry Cookie session without Authorization header.',
  debugTipToken:
    "Token Mode: Credentials are saved into localStorage['access_token']. Subsequent APIs will automatically carry Authorization: Bearer <Token> header.",
};
