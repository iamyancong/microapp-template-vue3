import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { theme as antdTheme } from 'ant-design-vue';
import { applyYssTheme } from '@yss-ui/utils';
import { getCurrentTheme } from '@/config/themes';
import type { MicroAppThemeConfigDto } from '@/types/microAppBridge';

type ThemeConfig = {
  token?: Record<string, any>;
  components?: Record<string, any>;
  algorithm?: any[];
};

type ThemePersist = {
  primaryColor: string;
  isDarkMode: boolean;
  isCompactMode: boolean;
};

const STORAGE_KEY = 'micro_theme_v1';

/**
 * 获取基础主题配置
 * 优先使用 JSP 主题配置（如果设置了 VITE_JSP_THEME 环境变量）
 * 否则使用默认的 Ant Design 主题配置
 */
const getBaseThemeConfig = () => {
  const jspTheme = getCurrentTheme();

  if (jspTheme) {
    // 使用 JSP 主题配置
    return {
      token: jspTheme.token,
      components: jspTheme.components || {},
    };
  }

  // 默认的 Ant Design 主题配置
  return {
    token: {
      // 品牌色
      colorPrimary: '#3371ff',
      colorSuccess: '#52c41a',
      colorWarning: '#faad14',
      colorError: '#ff4d4f',
      colorInfo: '#3371ff',

      // 字体系统
      fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
        'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
        'Noto Color Emoji'`,
      fontSize: 14,
      fontSizeSM: 12,
      fontSizeLG: 16,

      // 尺寸系统
      controlHeight: 32,
      controlHeightSM: 24,
      controlHeightLG: 40,

      // 间距系统
      padding: 16,
      paddingSM: 12,
      paddingXS: 8,
      paddingLG: 24,

      // 圆角系统
      borderRadius: 6,
      borderRadiusSM: 4,
      borderRadiusLG: 8,
    },
    components: {
      Button: {
        borderRadius: 6,
        controlHeight: 32,
      },
      Input: {
        borderRadius: 6,
        controlHeight: 32,
      },
      Select: {
        borderRadius: 6,
        controlHeight: 32,
      },
      Card: {
        borderRadiusLG: 8,
        paddingLG: 24,
      },
      Table: {
        borderRadius: 6,
        padding: 16,
      },
    },
  };
};

// 获取基础主题配置
const baseAntdThemeConfig = getBaseThemeConfig();

/**
 * 同步 vxe-table / vxe-pc-ui 使用的主题变量。
 *
 * @param root CSS 变量写入目标
 * @param primaryPalette YSS 主色阶
 */
const syncVxeThemeVariables = (
  root: HTMLElement,
  primaryPalette: ReturnType<typeof applyYssTheme>['primary']
): void => {
  const primary = primaryPalette[6];
  const primaryLighten = primaryPalette[5];
  const primaryDarken = primaryPalette[7];
  /** 调色板输出十六进制色值；在主题层派生 Chrome 90 可用的 RGB 通道。 */
  const hex = primary.replace('#', '');
  const rgb = [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16)).join(', ');
  root.style.setProperty('--primary-color-rgb', rgb);
  root.style.setProperty('--primary-1', `rgba(${rgb}, 0.1)`);

  root.style.setProperty('--vxe-ui-font-primary-color', primary);
  root.style.setProperty('--vxe-ui-font-primary-lighten-color', primaryLighten);
  root.style.setProperty('--vxe-ui-font-primary-darken-color', primaryDarken);
  root.style.setProperty('--vxe-ui-font-primary-disabled-color', primaryLighten);
  root.style.setProperty('--vxe-ui-loading-color', primary);
  root.style.setProperty('--vxe-ui-status-info-color', primary);
  root.style.setProperty('--vxe-ui-toolbar-custom-active-background-color', `rgba(${rgb}, 0.12)`);
  root.style.setProperty('--vxe-ui-table-row-hover-background-color', `rgba(${rgb}, 0.08)`);
};

export const useThemeStore = defineStore('theme', () => {
  // 初始化主色：优先使用 JSP 主题的主色
  const jspTheme = getCurrentTheme();
  const initialPrimaryColor = jspTheme?.token?.colorPrimary || '#3371ff';

  const primaryColor = ref<string>(initialPrimaryColor);
  const isDarkMode = ref<boolean>(false);
  const isCompactMode = ref<boolean>(false);

  const algorithms = computed(() => {
    const algos = [] as any[];
    if (isDarkMode.value) algos.push(antdTheme.darkAlgorithm);
    if (isCompactMode.value) algos.push(antdTheme.compactAlgorithm);
    return algos;
  });

  const themeTokens = computed(() => ({
    ...baseAntdThemeConfig.token,
    colorPrimary: primaryColor.value,
    colorInfo: primaryColor.value,
  }));

  const themeConfig = computed<ThemeConfig>(() => ({
    ...baseAntdThemeConfig,
    token: themeTokens.value,
    algorithm: algorithms.value,
  }));

  const syncCssVariables = () => {
    const root = document.documentElement;

    // 统一注入 yss & 兼容变量
    const yssPalette = applyYssTheme({
      primary: primaryColor.value,
      mirrorToLegacy: true,
    });

    // vxe 默认 light 主题会把主色回落到 #409eff，需要在运行时桥接到当前主题色。
    syncVxeThemeVariables(root, yssPalette.primary);

    // 文本和背景色变量（保留暗色/紧凑模式逻辑）
    root.style.setProperty('--text-color-rgb', isDarkMode.value ? '232, 232, 232' : '0, 0, 0');
    root.style.setProperty('--text-color', isDarkMode.value ? '#e8e8e8' : 'rgba(0, 0, 0, 0.88)');
    root.style.setProperty('--text-color-secondary', isDarkMode.value ? '#a6a6a6' : 'rgba(0, 0, 0, 0.65)');
    root.style.setProperty('--bg-color', isDarkMode.value ? '#141414' : '#f0f2f5');
    root.style.setProperty('--bg-color-container', isDarkMode.value ? '#1f1f1f' : '#ffffff');
    root.style.setProperty('--border-color', isDarkMode.value ? '#424242' : '#d9d9d9');
    root.style.setProperty('--border-color-split', isDarkMode.value ? '#303030' : '#f0f0f0');
  };

  const init = (incoming?: MicroAppThemeConfigDto) => {
    // 检查是否有 JSP 主题配置
    const jspTheme = getCurrentTheme();

    if (jspTheme) {
      // 如果设置了 JSP 主题，强制使用 JSP 主题配置
      primaryColor.value = jspTheme.token.colorPrimary;
      console.log(`[主题系统] 应用 JSP 主题: ${jspTheme.name}`);
    } else {
      // 否则尝试从 localStorage 恢复或使用传入的配置
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as ThemePersist;
          if (saved.primaryColor) primaryColor.value = saved.primaryColor;
          if (typeof saved.isDarkMode === 'boolean') isDarkMode.value = saved.isDarkMode;
          if (typeof saved.isCompactMode === 'boolean') isCompactMode.value = saved.isCompactMode;
        }
      } catch {
        // ignore
      }

      // 优先使用主应用传递的主题配置
      if (typeof incoming?.token?.colorPrimary === 'string') {
        primaryColor.value = incoming.token.colorPrimary;
      }
      if (incoming?.mode) {
        isDarkMode.value = incoming.mode.dark;
        isCompactMode.value = incoming.mode.compact;
      }
    }

    // 初始化时同步CSS变量
    syncCssVariables();
  };

  const applyFromMain = (incoming?: MicroAppThemeConfigDto) => {
    if (!incoming) return;

    // 更新主题色
    if (typeof incoming.token?.colorPrimary === 'string') {
      primaryColor.value = incoming.token.colorPrimary;
    }

    // 新协议使用普通布尔值描述模式；旧门户仍可通过算法引用保持兼容。
    if (incoming.mode) {
      isDarkMode.value = incoming.mode.dark;
      isCompactMode.value = incoming.mode.compact;
    } else if (incoming.algorithm && Array.isArray(incoming.algorithm)) {
      isDarkMode.value = incoming.algorithm.includes(antdTheme.darkAlgorithm);
      isCompactMode.value = incoming.algorithm.includes(antdTheme.compactAlgorithm);
    }

    // 同步CSS变量
    syncCssVariables();
  };

  const persist = () => {
    const data: ThemePersist = {
      primaryColor: primaryColor.value,
      isDarkMode: isDarkMode.value,
      isCompactMode: isCompactMode.value,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const setPrimaryColor = (color: string) => {
    primaryColor.value = color;
  };

  const setDarkMode = (enabled: boolean) => {
    isDarkMode.value = enabled;
  };

  const setCompactMode = (enabled: boolean) => {
    isCompactMode.value = enabled;
  };

  // 监听主题变化，同步CSS变量和持久化
  watch([primaryColor, isDarkMode, isCompactMode], () => {
    persist();
    syncCssVariables();
  });

  return {
    // state
    primaryColor,
    isDarkMode,
    isCompactMode,
    // getters
    themeTokens,
    themeConfig,
    algorithms,
    // actions
    init,
    applyFromMain,
    setPrimaryColor,
    setDarkMode,
    setCompactMode,
  };
});
