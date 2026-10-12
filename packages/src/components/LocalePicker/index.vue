<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Dropdown, Menu, MenuItem } from 'ant-design-vue';
import { GlobalOutlined, CheckOutlined } from '@ant-design/icons-vue';
import { setAppLocale, type AppLocale, SUPPORTED_LOCALES } from '@/locales';

defineOptions({ name: 'LocalePicker' });

const { locale } = useI18n();

const localeOptions = [
  { key: 'zh-CN' as const, label: '简体中文' },
  { key: 'zh-TW' as const, label: '繁體中文' },
  { key: 'en-US' as const, label: 'English' },
];

const currentLocale = computed(() => locale.value as AppLocale);

const currentLocaleLabel = computed(() => {
  const found = localeOptions.find(item => item.key === currentLocale.value);
  return found?.label ?? '简体中文';
});

const handleSelect = async ({ key }: { key: string | number }) => {
  const target = String(key) as AppLocale;
  if (target === currentLocale.value || !(SUPPORTED_LOCALES as readonly string[]).includes(target)) {
    return;
  }
  await setAppLocale(target);
};
</script>

<template>
  <Dropdown placement="bottomRight" :trigger="['click']">
    <div class="locale-picker-btn" :title="currentLocaleLabel">
      <GlobalOutlined class="locale-icon" />
      <span class="locale-label">{{ currentLocaleLabel }}</span>
    </div>
    <template #overlay>
      <Menu :selected-keys="[currentLocale]" @click="handleSelect">
        <MenuItem v-for="item in localeOptions" :key="item.key">
          <div class="locale-menu-item">
            <span>{{ item.label }}</span>
            <CheckOutlined v-if="item.key === currentLocale" class="check-icon" />
          </div>
        </MenuItem>
      </Menu>
    </template>
  </Dropdown>
</template>

<style scoped lang="less">
.locale-picker-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  height: 100%;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-color, rgba(0, 0, 0, 0.65));
  transition: all 0.3s;

  &:hover {
    color: var(--primary-color, #1890ff);
    background: rgba(0, 0, 0, 0.025);
  }

  .locale-icon {
    font-size: 16px;
  }

  .locale-label {
    user-select: none;
  }
}

.locale-menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 90px;

  .check-icon {
    color: var(--primary-color, #1890ff);
    margin-left: 12px;
  }
}
</style>
