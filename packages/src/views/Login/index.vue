<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { message, Textarea } from 'ant-design-vue';
import { YButton } from '@yss-ui/components';
import { KeyOutlined, SafetyCertificateOutlined, ArrowRightOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import LocalePicker from '@/components/LocalePicker/index.vue';

defineOptions({ name: 'LoginPage' });

const { t } = useI18n();
const router = useRouter();
const tokenInput = ref('');
const isSubmitting = ref(false);
const isDev = import.meta.env.MODE.includes('development') || import.meta.env.DEV;
const appName = import.meta.env.VITE_SUB_APP_NAME || '微应用';

onMounted(() => {
  const currentToken = localStorage.getItem('access_token');
  if (currentToken) {
    tokenInput.value = currentToken.replace(/^"|"$/g, '');
  }
});

const handleSaveToken = () => {
  const token = tokenInput.value.trim();
  if (!token) {
    message.warning(t('login.inputWarning'));
    return;
  }

  isSubmitting.value = true;
  try {
    localStorage.setItem('access_token', token);
    message.success(t('login.saveSuccess'));
    setTimeout(() => {
      router.push('/');
    }, 500);
  } catch {
    message.error(t('login.saveError'));
  } finally {
    isSubmitting.value = false;
  }
};

const handleClearToken = () => {
  localStorage.removeItem('access_token');
  tokenInput.value = '';
  message.info(t('login.clearedInfo'));
};
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header-actions">
        <LocalePicker />
      </div>
      <div class="header">
        <div class="icon-wrapper">
          <SafetyCertificateOutlined class="brand-icon" />
        </div>
        <h2 class="title">{{ $t('login.title', { app: appName }) }}</h2>
        <p class="subtitle">
          {{ isDev ? $t('login.devSubTitle') : $t('login.expiredSubTitle') }}
        </p>
      </div>

      <div class="form-body">
        <div class="input-group">
          <label for="access-token-input" class="input-label"> <KeyOutlined /> Access Token </label>
          <Textarea
            id="access-token-input"
            v-model:value="tokenInput"
            :placeholder="$t('login.tokenPlaceholder')"
            :rows="4"
            class="token-textarea"
            allow-clear
          />
        </div>

        <div class="action-buttons">
          <YButton type="primary" size="large" block :loading="isSubmitting" @click="handleSaveToken">
            {{ $t('login.saveAndEnter') }}
            <ArrowRightOutlined />
          </YButton>

          <YButton v-if="tokenInput" danger type="text" block class="clear-btn" @click="handleClearToken">
            <DeleteOutlined /> {{ $t('login.clearToken') }}
          </YButton>
        </div>
      </div>

      <div v-if="isDev" class="footer-tips">
        <p class="tip-title">{{ $t('login.debugTitle') }}</p>
        <ul>
          <li>{{ $t('login.debugTip1') }}</li>
          <li>{{ $t('login.debugTip2') }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--bg-color, #f0f2f5);
  padding: 24px;
}

.login-card {
  position: relative;
  width: 100%;
  max-width: 480px;
  background: var(--bg-color-container, #ffffff);
  border-radius: 12px;
  border: 1px solid var(--border-color-split, #f0f0f0);
  box-shadow: 0 10px 25px rgba(var(--text-color-rgb), 0.08);
  padding: 36px 32px;
  transition: all 0.3s ease;
}

.login-header-actions {
  position: absolute;
  top: 16px;
  right: 16px;
}

.header {
  text-align: center;
  margin-bottom: 28px;

  .icon-wrapper {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    background: rgba(var(--primary-color-rgb), 0.1);
    border-radius: 50%;
    margin-bottom: 16px;

    .brand-icon {
      font-size: 28px;
      color: var(--primary-color, #3371ff);
    }
  }

  .title {
    font-size: 22px;
    font-weight: 600;
    color: var(--text-color, rgba(0, 0, 0, 0.88));
    margin: 0 0 8px 0;
  }

  .subtitle {
    font-size: 13px;
    color: var(--text-color-secondary, rgba(0, 0, 0, 0.65));
    margin: 0;
    line-height: 1.5;
  }
}

.form-body {
  .input-group {
    margin-bottom: 20px;

    .input-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-color, rgba(0, 0, 0, 0.88));
      margin-bottom: 8px;

      .anticon {
        color: var(--primary-color, #3371ff);
        margin-right: 4px;
      }
    }

    .token-textarea {
      font-family: monospace;
      font-size: 13px;
      border-radius: 6px;
      resize: vertical;
    }
  }

  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .clear-btn {
      margin-top: 4px;
    }
  }
}

.footer-tips {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px dashed var(--border-color, #d9d9d9);

  .tip-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-color, rgba(0, 0, 0, 0.88));
    margin-bottom: 6px;
  }

  ul {
    margin: 0;
    padding-left: 18px;

    li {
      font-size: 12px;
      color: var(--text-color-secondary, rgba(0, 0, 0, 0.65));
      line-height: 1.6;

      code {
        background: var(--bg-color, #f0f2f5);
        color: var(--text-color, rgba(0, 0, 0, 0.88));
        padding: 2px 4px;
        border-radius: 4px;
        font-family: monospace;
      }
    }
  }
}
</style>
