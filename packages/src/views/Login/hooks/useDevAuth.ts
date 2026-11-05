import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import axios from 'axios';
import { message } from 'ant-design-vue';
import { applyDevCookie, clearDevCookie, setAuthMode, type AuthMode } from '@/utils/auth';

/**
 * 本地开发认证双模切换与凭据管理 Hook
 */
export function useDevAuth() {
  const router = useRouter();
  const { t } = useI18n();

  const activeMode = ref<AuthMode>('bff');
  const cookieInput = ref('');
  const tokenInput = ref('');
  const isSubmitting = ref(false);
  const showGuide = ref(false);

  const isDev = import.meta.env.MODE.includes('development') || import.meta.env.DEV;
  const appName = import.meta.env.VITE_SUB_APP_NAME || '微应用';
  const proxyTarget = import.meta.env.VITE_PROXY_TARGET || '';

  const modeOptions = computed(() => [
    { label: t('login.tabBff'), value: 'bff' },
    { label: t('login.tabToken'), value: 'local_token' },
  ]);

  /** 同步凭据给本地 Vite 中间件（在代理层注入双重保险） */
  const syncDevServerCookie = (cookie: string): void => {
    void axios.post('/__dev_auth/set-cookie', { cookie }, { timeout: 3000 }).catch(err => err);
  };

  onMounted(() => {
    const storedMode = localStorage.getItem('auth_mode');
    const storedCookie = localStorage.getItem('bff_cookie');
    const storedToken = localStorage.getItem('access_token');

    if (storedCookie) cookieInput.value = storedCookie;
    if (storedToken) tokenInput.value = storedToken.replace(/^"|"$/g, '');

    if (storedMode === 'bff' || storedMode === 'local_token') {
      activeMode.value = storedMode;
    } else if (storedToken) {
      activeMode.value = 'local_token';
    } else {
      activeMode.value = 'bff';
    }

    // 若当前为 BFF 模式且已有缓存 Cookie，自适应同步给本地 localhost 与 Vite Node 代理
    if (activeMode.value === 'bff' && cookieInput.value) {
      applyDevCookie(cookieInput.value);
      syncDevServerCookie(cookieInput.value);
    }
  });

  const handleSave = async () => {
    if (activeMode.value === 'bff') {
      const cookie = cookieInput.value.trim();
      if (!cookie) {
        message.warning(t('login.cookieInputWarning'));
        return;
      }
      isSubmitting.value = true;
      try {
        applyDevCookie(cookie);
        localStorage.setItem('auth_mode', 'bff');
        localStorage.setItem('bff_cookie', cookie);
        localStorage.removeItem('access_token');
        setAuthMode('bff');

        syncDevServerCookie(cookie);

        message.success(t('login.cookieSaveSuccess'));
        setTimeout(() => router.push('/'), 500);
      } catch {
        message.error(t('login.saveError'));
      } finally {
        isSubmitting.value = false;
      }
    } else {
      const token = tokenInput.value.trim();
      if (!token) {
        message.warning(t('login.inputWarning'));
        return;
      }
      isSubmitting.value = true;
      try {
        localStorage.setItem('auth_mode', 'local_token');
        localStorage.setItem('access_token', token);
        localStorage.removeItem('bff_cookie');
        clearDevCookie();
        setAuthMode('local_token');

        syncDevServerCookie('');

        message.success(t('login.saveSuccess'));
        setTimeout(() => router.push('/'), 500);
      } catch {
        message.error(t('login.saveError'));
      } finally {
        isSubmitting.value = false;
      }
    }
  };

  const handleClear = async () => {
    if (activeMode.value === 'bff') {
      clearDevCookie();
      localStorage.removeItem('bff_cookie');
      cookieInput.value = '';
      syncDevServerCookie('');
      message.info(t('login.cookieClearedInfo'));
    } else {
      localStorage.removeItem('access_token');
      tokenInput.value = '';
      message.info(t('login.clearedInfo'));
    }
  };

  return {
    activeMode,
    cookieInput,
    tokenInput,
    isSubmitting,
    showGuide,
    isDev,
    appName,
    proxyTarget,
    modeOptions,
    handleSave,
    handleClear,
  };
}
