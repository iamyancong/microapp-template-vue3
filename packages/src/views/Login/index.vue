<script setup lang="ts">
import { Textarea, Segmented } from 'ant-design-vue';
import { YButton } from '@yss-ui/components';
import {
  KeyOutlined,
  SafetyCertificateOutlined,
  ArrowRightOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons-vue';
import LocalePicker from '@/components/LocalePicker/index.vue';
import { useDevAuth } from './hooks/useDevAuth';

defineOptions({ name: 'LoginPage' });

const {
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
} = useDevAuth();
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
        <p class="subtitle">{{ isDev ? $t('login.devSubTitle') : $t('login.expiredSubTitle') }}</p>
      </div>

      <div class="mode-segmented-wrapper">
        <Segmented v-model:value="activeMode" block size="large" :options="modeOptions" />
      </div>

      <div class="form-body">
        <div class="input-group">
          <label for="auth-credential-input" class="input-label">
            <span class="label-left">
              <SafetyCertificateOutlined v-if="activeMode === 'bff'" />
              <KeyOutlined v-else />
              {{ activeMode === 'bff' ? $t('login.cookieLabel') : $t('login.tokenLabel') }}
            </span>
            <span v-if="activeMode === 'bff'" class="guide-trigger" @click="showGuide = !showGuide">
              <QuestionCircleOutlined /> {{ $t('login.howToGetCookie') }}
            </span>
          </label>

          <Textarea
            v-if="activeMode === 'bff'"
            id="auth-credential-input"
            v-model:value="cookieInput"
            :placeholder="$t('login.cookiePlaceholder')"
            :rows="4"
            class="credential-textarea"
            allow-clear
          />
          <Textarea
            v-else
            id="auth-credential-input"
            v-model:value="tokenInput"
            :placeholder="$t('login.tokenPlaceholder')"
            :rows="4"
            class="credential-textarea"
            allow-clear
          />
        </div>

        <div v-if="activeMode === 'bff' && (showGuide || !cookieInput)" class="cookie-guide-box">
          <div class="guide-title"><InfoCircleOutlined /> {{ $t('login.howToGetCookie') }}</div>
          <div class="guide-desc">{{ $t('login.cookieGuideDesc') }}</div>
          <div v-if="proxyTarget" class="proxy-info">
            {{ $t('login.proxyTargetLabel') }}: <code>{{ proxyTarget }}</code>
          </div>
        </div>

        <div class="action-buttons">
          <YButton type="primary" size="large" block :loading="isSubmitting" @click="handleSave">
            {{ activeMode === 'bff' ? $t('login.saveCookieAndEnter') : $t('login.saveAndEnter') }}
            <ArrowRightOutlined />
          </YButton>

          <YButton
            v-if="(activeMode === 'bff' && cookieInput) || (activeMode === 'local_token' && tokenInput)"
            danger
            type="text"
            block
            class="clear-btn"
            @click="handleClear"
          >
            <DeleteOutlined />
            {{ activeMode === 'bff' ? $t('login.clearCookie') : $t('login.clearToken') }}
          </YButton>
        </div>
      </div>

      <div v-if="isDev" class="footer-tips">
        <p class="tip-title">{{ $t('login.debugTitle') }}</p>
        <ul>
          <li>{{ $t('login.debugTipBff') }}</li>
          <li>{{ $t('login.debugTipToken') }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
@import './style.less';
</style>
