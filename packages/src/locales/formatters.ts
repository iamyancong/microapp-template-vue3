import dayjs, { type ConfigType } from 'dayjs';
import { currentAppLocale } from './protocol';

/** 格式化已有日期实例；保留原有时区和日期值，默认使用无歧义的业务日期格式。 */
export const formatDate = (value: ConfigType, format = 'YYYY-MM-DD'): string =>
  dayjs(value).locale({ 'zh-CN': 'zh-cn', 'zh-TW': 'zh-tw', 'en-US': 'en' }[currentAppLocale.value]).format(format);

/** 数字展示要求调用方明确小数位/币种，不将长整型或高精度金额字符串转换为 Number。 */
export const formatNumber = (value: number | bigint, options: Intl.NumberFormatOptions): string =>
  new Intl.NumberFormat(currentAppLocale.value, options).format(value);
