<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { Dropdown, Menu, MenuItem, message } from 'ant-design-vue';
import { GlobalOutlined, DownOutlined, CheckOutlined, LoadingOutlined } from '@ant-design/icons-vue';
import { requestLocaleReload } from '@/locales/reload';
import { initialLocaleFailed } from '@/locales/bridge';
import { currentAppLocale, setAppLocale, t, type AppLocale } from '@/locales';

/** 独立运行模式的语言选择器，采用现代互联网后台通用的 Dropdown 下拉菜单设计 */
defineOptions({ name: 'LocaleSelect' });

const route = useRoute();
const pending = ref(false);
const isOpen = ref(false);

const localeOptions = [
  { key: 'zh-CN' as AppLocale, label: '简体中文' },
  { key: 'zh-TW' as AppLocale, label: '繁體中文' },
  { key: 'en-US' as AppLocale, label: 'English' },
];

const currentLocaleLabel = computed(() => {
  const found = localeOptions.find(item => item.key === currentAppLocale.value);
  return found?.label ?? '简体中文';
});

/** 切换语言 */
const handleSelect = async ({ key }: { key: string | number }): Promise<void> => {
  const target = String(key) as AppLocale;
  if (target === currentAppLocale.value || pending.value) {
    isOpen.value = false;
    return;
  }

  pending.value = true;
  isOpen.value = false;
  try {
    if (route.path === '/login') {
      await setAppLocale(target);
    } else {
      await requestLocaleReload(target);
    }
  } catch (error) {
    console.error('[i18n] 语言切换失败', error);
    message.error(t('common.languageLoadFailed'));
  } finally {
    pending.value = false;
  }
};

/** 跨标签页或底层失败错误捕获 */
const reportFailure = (): void => {
  message.error(t('common.languageLoadFailed'));
};

onMounted(() => {
  if (initialLocaleFailed.value) {
    reportFailure();
  }
  window.addEventListener('app-locale-error', reportFailure);
});

onUnmounted(() => {
  window.removeEventListener('app-locale-error', reportFailure);
});
</script>

<template>
  <Dropdown v-model:open="isOpen" placement="bottomRight" :trigger="['click']" :disabled="pending">
    <div
      class="action-item locale-dropdown-trigger"
      :class="{ 'is-open': isOpen, disabled: pending }"
      :title="currentLocaleLabel"
    >
      <LoadingOutlined v-if="pending" class="locale-icon spin" />
      <GlobalOutlined v-else class="locale-icon" />
      <span class="locale-text">{{ currentLocaleLabel }}</span>
      <DownOutlined class="arrow-icon" />
    </div>

    <template #overlay>
      <Menu
        :selected-keys="[currentAppLocale]"
        class="locale-dropdown-menu"
        style="min-width: 120px"
        @click="handleSelect"
      >
        <MenuItem v-for="item in localeOptions" :key="item.key">
          <div class="locale-menu-item">
            <span class="item-label">{{ item.label }}</span>
            <CheckOutlined v-if="item.key === currentAppLocale" class="check-icon" />
          </div>
        </MenuItem>
      </Menu>
    </template>
  </Dropdown>
</template>

<style scoped lang="less">
@import './style.less';
</style>
