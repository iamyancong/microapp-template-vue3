/**
 * JSP 主题预设配置文件
 *
 * 用于集中管理所有 JSP 项目的主题配置
 * 添加新主题只需在此文件中新增配置，无需改动业务代码
 */

export interface ThemeConfig {
  /** 主题名称 */
  name: string;
  /** 主题描述 */
  description: string;
  /** Ant Design 主题 Token 配置 */
  token: {
    /** 主色 */
    colorPrimary: string;
    /** 链接色 */
    colorLink?: string;
    /** 成功色 */
    colorSuccess?: string;
    /** 警告色 */
    colorWarning?: string;
    /** 错误色 */
    colorError?: string;
    /** 信息色 */
    colorInfo?: string;
    /** 字体 */
    fontFamily?: string;
    /** 字体大小 */
    fontSize?: number;
    /** 控件高度 */
    controlHeight?: number;
    /** 小号控件高度 */
    controlHeightSM?: number;
    /** 大号控件高度 */
    controlHeightLG?: number;
    /** 圆角 */
    borderRadius?: number;
    /** 小号圆角 */
    borderRadiusSM?: number;
    /** 大号圆角 */
    borderRadiusLG?: number;
    [key: string]: any;
  };
  /** Ant Design 组件级配置 */
  components?: {
    [componentName: string]: Record<string, any>;
  };
  /** 主题样式文件名（相对于 src/styles/themes/ 目录） */
  styleFile: string;
}

/**
 * 主题预设配置映射
 * packages/src/styles/themes/ 目录下文件是修改 自定义组件样式
 */
export const themePresets: Record<string, ThemeConfig> = {
  /**
   * 经典蓝主题 - Element UI / 紧凑风格
   */
  'classic-blue': {
    name: '经典蓝主题',
    description: 'Element UI 风格（蓝色紧凑主题）',
    token: {
      // 品牌色
      colorPrimary: '#409eff',
      colorLink: '#409eff',
      colorSuccess: '#67c23a',
      colorWarning: '#e6a23c',
      colorError: '#f56c6c',
      colorInfo: '#409eff',

      // 字体系统
      fontFamily: `"Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif`,
      fontSize: 14,
      fontSizeSM: 12,
      fontSizeLG: 16,

      // 尺寸系统 - Element UI 标准
      controlHeight: 28,
      controlHeightSM: 24,
      controlHeightLG: 36,

      // 间距系统
      padding: 16,
      paddingSM: 12,
      paddingXS: 8,
      paddingLG: 20,

      // 圆角系统 - Element UI 标准
      borderRadius: 4,
      borderRadiusSM: 2,
      borderRadiusLG: 4,
    },
    components: {
      Button: {
        borderRadius: 4,
        controlHeight: 28,
      },
      Input: {
        borderRadius: 4,
        controlHeight: 28,
      },
      Select: {
        borderRadius: 4,
        controlHeight: 28,
      },
      DatePicker: {
        borderRadius: 4,
        controlHeight: 28,
      },
      Card: {
        borderRadiusLG: 4,
        paddingLG: 20,
      },
      Table: {
        borderRadius: 4,
        padding: 16,
      },
    },
    styleFile: 'classic-blue.less',
  },

  /**
   * 活力红主题
   */
  'crimson-red': {
    name: '活力红主题',
    description: '活力红色主题（预留配置）',
    token: {
      // 品牌色
      colorPrimary: '#d32f2f',
      colorLink: '#d32f2f',
      colorSuccess: '#4caf50',
      colorWarning: '#ff9800',
      colorError: '#f44336',
      colorInfo: '#d32f2f',

      // 尺寸系统
      controlHeight: 32,
      controlHeightSM: 24,
      controlHeightLG: 40,

      // 圆角系统
      borderRadius: 4,
      borderRadiusSM: 2,
      borderRadiusLG: 6,
    },
    components: {
      Button: {
        borderRadius: 4,
        controlHeight: 32,
      },
      Input: {
        borderRadius: 4,
        controlHeight: 32,
      },
      Select: {
        borderRadius: 4,
        controlHeight: 32,
      },
    },
    styleFile: 'crimson-red.less',
  },
};

/**
 * 获取当前激活的主题配置
 * @returns 主题配置对象，如果未配置则返回 null
 */
export const getCurrentTheme = (): ThemeConfig | null => {
  const jspTheme = import.meta.env.VITE_JSP_THEME;
  if (jspTheme && themePresets[jspTheme]) {
    return themePresets[jspTheme];
  }
  return null;
};

/**
 * 检查指定主题是否存在
 * @param themeName 主题名称
 * @returns 主题是否存在
 */
export const hasTheme = (themeName: string): boolean => {
  return themeName in themePresets;
};
