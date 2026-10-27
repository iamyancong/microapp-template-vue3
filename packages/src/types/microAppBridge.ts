/** 当前模板支持的门户桥接协议版本。 */
export const MICRO_APP_BRIDGE_VERSION = 1 as const;

/** 主题模式的可序列化描述。 */
export interface MicroAppThemeModeDto {
  readonly dark: boolean;
  readonly compact: boolean;
}

/** 门户传入的只读主题 DTO；旧门户可以不提供 mode。 */
export interface MicroAppThemeConfigDto {
  readonly token?: Readonly<Record<string, unknown>>;
  readonly components?: Readonly<Record<string, unknown>>;
  readonly algorithm?: readonly unknown[];
  readonly mode?: MicroAppThemeModeDto;
}

/** 微应用可识别的版本化桥接 Props；字段保持可选以兼容旧门户。 */
export interface MicroAppBridgeProps {
  readonly bridgeVersion?: typeof MICRO_APP_BRIDGE_VERSION;
  readonly routerBase?: string;
  readonly themeConfig?: MicroAppThemeConfigDto;
  /** 门户可选下发的语言标识（如 'zh-CN' | 'en-US'）；缺省时子应用读取本地/浏览器语言 */
  readonly locale?: string;
  /** 门户语言修订号，用于忽略过期更新。 */
  readonly localeRevision?: number;
  /** 认证架构模式：bff 模式（HttpOnly Cookie凭据）或 local_token 模式（localStorage Bearer token） */
  readonly authMode?: 'bff' | 'local_token';
}

/** qiankun 生命周期额外提供的容器字段。 */
export interface MicroAppLifecycleProps extends MicroAppBridgeProps {
  readonly container?: Element | ShadowRoot;
}
