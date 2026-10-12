/**
 * English - Login module language pack
 */
export default {
  title: '{app} - Access Authorization',
  expiredSubTitle: 'Session expired, please log in again',
  devSubTitle:
    'Session expired or Access Token not configured. Please inject Access Token below under local development mode.',
  tokenPlaceholder: 'Please enter or paste Bearer Access Token here...',
  saveAndEnter: 'Save Token & Enter',
  clearToken: 'Clear Existing Token',
  inputWarning: 'Please enter Access Token',
  saveSuccess: 'Token saved successfully, entering system...',
  saveError: 'Failed to save Token',
  clearedInfo: 'Current Access Token cleared',
  debugTitle: 'Local Debugging Notes:',
  debugTip1: "After saving, system stores Token in browser localStorage['access_token'].",
  debugTip2: 'Subsequent API requests will automatically carry Authorization: Bearer <Token> header.',
};
