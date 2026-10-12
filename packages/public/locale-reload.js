/** 跨文档语言过渡层；在 Vue 启动前执行，自适应当前项目主题色，不保存业务输入或认证数据。 */
(() => {
  if (window.__YSS_LOCALE_RELOAD__) return;
  const markerKey = 'yss:locale-reload-transition';
  const supported = ['zh-CN', 'zh-TW', 'en-US'];
  const texts = {
    'zh-CN': {
      title: '正在切换语言…',
      subtitle: '正在同步系统多语言配置与界面资源…',
      slow: '页面加载时间较长，请稍候或重试。',
      slowHint: '您可以尝试重新加载，或直接显示当前页面。',
      retry: '重新加载',
      dismiss: '显示当前页面',
      failed: '语言初始化失败，请检查网络后重试。',
      failedHint: '网络连接异常或资源加载中断。',
    },
    'zh-TW': {
      title: '正在切換語言…',
      subtitle: '正在同步系統多語言配置與介面資源…',
      slow: '頁面載入時間較長，請稍候或重試。',
      slowHint: '您可以嘗試重新載入，或直接顯示目前頁面。',
      retry: '重新載入',
      dismiss: '顯示目前頁面',
      failed: '語言初始化失敗，請檢查網路後重試。',
      failedHint: '網路連線異常或資源載入中斷。',
    },
    'en-US': {
      title: 'Switching language…',
      subtitle: 'Synchronizing localization and interface resources…',
      slow: 'Loading is taking longer than expected. Please wait or retry.',
      slowHint: 'You can try reloading the page, or view the current page.',
      retry: 'Reload',
      dismiss: 'Show current page',
      failed: 'Language initialization failed. Check your connection and retry.',
      failedHint: 'Network connection anomaly or resource loading interrupted.',
    },
  };

  /** 颜色工具：十六进制转 RGB */
  const hexToRgb = hex => {
    let c = (hex || '').replace('#', '').trim();
    if (c.length === 3)
      c = c
        .split('')
        .map(x => x + x)
        .join('');
    const num = parseInt(c, 16);
    if (isNaN(num) || (c.length !== 6 && c.length !== 8)) return { r: 51, g: 113, b: 255 };
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  };

  /** 颜色工具：RGB 转 HSL */
  const rgbToHsl = (r, g, b) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h = 0,
      s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  };

  /** 颜色工具：HSL 转 RGB */
  const hslToRgb = (h, s, l) => {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;
    if (s === 0) {
      const val = Math.round(l * 255);
      return { r: val, g: val, b: val };
    }
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return {
      r: Math.round(hue2rgb(p, q, h / 360 + 1 / 3) * 255),
      g: Math.round(hue2rgb(p, q, h / 360) * 255),
      b: Math.round(hue2rgb(p, q, h / 360 - 1 / 3) * 255),
    };
  };

  /** 根据当前主色生成配套的 3D 水晶球与光效调色板 */
  const generatePalette = hexColor => {
    const { r, g, b } = hexToRgb(hexColor);
    const [h, s, l] = rgbToHsl(r, g, b);
    const toRgbStr = c => `rgb(${c.r}, ${c.g}, ${c.b})`;
    const toRgbaStr = (c, a) => `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`;

    const primaryLight = hslToRgb(h, s, Math.min(l + 18, 90));
    const primaryPale = hslToRgb(h, Math.max(s - 15, 10), Math.min(l + 32, 95));
    const alt = hslToRgb((h + 26) % 360, s, l);
    const altLight = hslToRgb((h + 26) % 360, s, Math.min(l + 18, 90));
    const orbDark = hslToRgb(h, Math.min(s + 15, 100), Math.max(l * 0.45, 14));
    const orbDeep = hslToRgb(h, Math.min(s + 20, 100), Math.max(l * 0.25, 6));

    return {
      primary: toRgbStr({ r, g, b }),
      primaryLight: toRgbStr(primaryLight),
      primaryPale: toRgbStr(primaryPale),
      alt: toRgbStr(alt),
      altLight: toRgbStr(altLight),
      orbDark: toRgbStr(orbDark),
      orbDeep: toRgbStr(orbDeep),
      glow1: toRgbaStr({ r, g, b }, 0.32),
      glow2: toRgbaStr({ r, g, b }, 0.16),
      altGlow1: toRgbaStr(alt, 0.28),
      altGlow2: toRgbaStr(alt, 0.14),
      shadow: toRgbaStr({ r, g, b }, 0.35),
      cardShadow: toRgbaStr({ r, g, b }, 0.12),
    };
  };

  /** 获取当前环境生效的主题色 */
  const getThemeColor = () => {
    // 1. 优先从 sessionStorage marker 中获取（重载后的第一帧）
    try {
      const marker = JSON.parse(sessionStorage.getItem(markerKey) || 'null');
      if (marker && marker.themeColor) return marker.themeColor;
    } catch {}

    // 2. 尝试从 documentElement 真实计算样式读取
    if (typeof window !== 'undefined' && document.documentElement) {
      const cssColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
      if (cssColor) return cssColor;
    }

    // 3. 尝试从 localStorage 的 micro_theme_v1 读取
    try {
      const saved = JSON.parse(localStorage.getItem('micro_theme_v1') || 'null');
      if (saved && saved.primaryColor) return saved.primaryColor;
    } catch {}

    // 4. 尝试从根节点内联样式匹配
    const rootStyle = document.documentElement?.getAttribute('style') || '';
    const match = rootStyle.match(/--primary-color:\s*([^;]+)/);
    if (match && match[1]) return match[1].trim();

    // 5. 探测项目类型兜底
    if (location.pathname.includes('rbc') || location.href.includes('rbc')) {
      return '#009b62';
    }
    return '#3371ff';
  };

  let overlay;
  let timer;
  let current = 'zh-CN';
  let closing = 0;

  const style = document.createElement('style');
  style.textContent = `
#yss-locale-transition {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 50% 40%, rgba(243, 246, 253, 0.52) 0%, rgba(235, 240, 250, 0.38) 100%);
  backdrop-filter: blur(16px) saturate(170%);
  -webkit-backdrop-filter: blur(16px) saturate(170%);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  transition: opacity 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  --yss-primary: #3371ff;
  --yss-primary-light: #60a5fa;
  --yss-primary-pale: #a5b4fc;
  --yss-alt: #06b6d4;
  --yss-alt-light: #67e8f9;
  --yss-orb-dark: #1e3a8a;
  --yss-orb-deep: #1e1b4b;
  --yss-glow-1: rgba(59, 130, 246, 0.32);
  --yss-glow-2: rgba(59, 130, 246, 0.16);
  --yss-alt-glow-1: rgba(6, 182, 212, 0.28);
  --yss-alt-glow-2: rgba(6, 182, 212, 0.14);
  --yss-shadow: rgba(37, 99, 235, 0.35);
  --yss-card-shadow: rgba(30, 58, 138, 0.12);
}
.locale-ambient-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(75px);
  pointer-events: none;
  opacity: 0.65;
  will-change: transform, opacity;
}
.locale-ambient-glow.glow-1 {
  width: 440px;
  height: 440px;
  background: radial-gradient(circle, var(--yss-glow-1) 0%, var(--yss-glow-2) 50%, transparent 70%);
  top: 15%;
  left: 18%;
  animation: yss-aurora-float-1 9s ease-in-out infinite alternate;
}
.locale-ambient-glow.glow-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, var(--yss-alt-glow-1) 0%, var(--yss-alt-glow-2) 50%, transparent 70%);
  bottom: 15%;
  right: 18%;
  animation: yss-aurora-float-2 8s ease-in-out infinite alternate;
}
@keyframes yss-aurora-float-1 {
  0% { transform: translate(0, 0) scale(1); opacity: 0.5; }
  100% { transform: translate(45px, 35px) scale(1.15); opacity: 0.75; }
}
@keyframes yss-aurora-float-2 {
  0% { transform: translate(0, 0) scale(1); opacity: 0.45; }
  100% { transform: translate(-40px, -30px) scale(1.12); opacity: 0.7; }
}
#yss-locale-transition .locale-transition-card {
  position: relative;
  z-index: 2;
  width: 380px;
  max-width: calc(100vw - 32px);
  padding: 38px 28px 32px;
  border-radius: 28px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.45) 100%);
  backdrop-filter: blur(28px) saturate(190%);
  -webkit-backdrop-filter: blur(28px) saturate(190%);
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow:
    0 24px 48px -12px var(--yss-card-shadow),
    0 12px 24px -8px rgba(15, 23, 42, 0.05),
    inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.95),
    inset 0 -1.5px 2px 0 rgba(0, 0, 0, 0.02);
  text-align: center;
  box-sizing: border-box;
  animation: yss-card-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes yss-card-in {
  from { opacity: 0; transform: scale(0.94) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.c4d-stage {
  position: relative;
  width: 92px;
  height: 92px;
  margin: 0 auto 20px;
  perspective: 600px;
  transform-style: preserve-3d;
  display: flex;
  align-items: center;
  justify-content: center;
}
.orbit-ring {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.orbit-ring-1 {
  width: 86px;
  height: 86px;
  border: 2px solid transparent;
  border-top-color: var(--yss-primary);
  border-right-color: var(--yss-primary-light);
  transform: rotateX(68deg) rotateY(15deg);
  animation: yss-orbit-spin-1 2.2s linear infinite;
  box-shadow: 0 0 10px var(--yss-shadow);
}
.orbit-ring-1 .orbit-particle {
  position: absolute;
  top: 1px;
  right: 14px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 8px 2px var(--yss-primary-light);
}
.orbit-ring-2 {
  width: 76px;
  height: 76px;
  border: 2px solid transparent;
  border-bottom-color: var(--yss-alt);
  border-left-color: var(--yss-alt-light);
  transform: rotateX(68deg) rotateY(-25deg);
  animation: yss-orbit-spin-2 2.8s linear infinite reverse;
  box-shadow: 0 0 8px var(--yss-alt-glow-1);
}
.orbit-ring-2 .orbit-particle {
  position: absolute;
  bottom: 2px;
  left: 12px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 6px 2px var(--yss-alt-light);
}
@keyframes yss-orbit-spin-1 {
  0% { transform: rotateX(68deg) rotateY(15deg) rotateZ(0deg); }
  100% { transform: rotateX(68deg) rotateY(15deg) rotateZ(360deg); }
}
@keyframes yss-orbit-spin-2 {
  0% { transform: rotateX(68deg) rotateY(-25deg) rotateZ(0deg); }
  100% { transform: rotateX(68deg) rotateY(-25deg) rotateZ(360deg); }
}
.crystal-orb-wrapper {
  position: absolute;
  z-index: 3;
  animation: yss-orb-levitate 3s ease-in-out infinite;
}
.crystal-orb {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 26%, #ffffff 0%, var(--yss-primary-pale) 22%, var(--yss-primary-light) 58%, var(--yss-primary) 82%, var(--yss-orb-dark) 100%);
  box-shadow:
    0 10px 22px -4px var(--yss-shadow),
    0 0 16px 2px var(--yss-glow-1),
    inset 0 0 12px rgba(255, 255, 255, 0.85),
    inset -2px -4px 8px var(--yss-orb-deep);
  overflow: hidden;
}
.orb-specular {
  position: absolute;
  top: 6px;
  left: 8px;
  width: 14px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0) 100%);
  transform: rotate(-30deg);
}
.orb-inner-glow {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 70% 75%, var(--yss-alt-light) 0%, transparent 60%);
  animation: yss-inner-pulse 2.5s ease-in-out infinite alternate;
}
@keyframes yss-orb-levitate {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}
@keyframes yss-inner-pulse {
  0% { opacity: 0.4; }
  100% { opacity: 0.9; }
}
.orb-shadow {
  position: absolute;
  bottom: 4px;
  width: 36px;
  height: 10px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, var(--yss-shadow) 0%, transparent 70%);
  animation: yss-shadow-scale 3s ease-in-out infinite;
  pointer-events: none;
}
@keyframes yss-shadow-scale {
  0%, 100% { transform: scale(1); opacity: 0.75; }
  50% { transform: scale(0.72); opacity: 0.35; }
}
.locale-content-area {
  margin-top: 4px;
}
.locale-title {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.4px;
  background: linear-gradient(135deg, #0f172a 0%, var(--yss-primary) 50%, #0f172a 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: yss-text-shimmer 3s ease-in-out infinite;
  line-height: 1.5;
}
@keyframes yss-text-shimmer {
  0% { background-position: 0% center; }
  50% { background-position: 100% center; }
  100% { background-position: 0% center; }
}
.locale-subtitle {
  margin-top: 8px;
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
  font-weight: 400;
}
.locale-pulse-dots {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
}
.locale-pulse-dots span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  opacity: 0.3;
  animation: yss-dot-pulse 1.4s infinite ease-in-out both;
}
.locale-pulse-dots span:nth-child(1) { animation-delay: -0.32s; background: var(--yss-primary); }
.locale-pulse-dots span:nth-child(2) { animation-delay: -0.16s; background: var(--yss-primary-light); }
.locale-pulse-dots span:nth-child(3) { animation-delay: 0s; background: var(--yss-alt); }
@keyframes yss-dot-pulse {
  0%, 80%, 100% { transform: scale(0.8); opacity: 0.25; }
  40% { transform: scale(1.35); opacity: 1; }
}
.locale-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 22px;
}
.locale-actions[hidden] {
  display: none !important;
}
.locale-actions button {
  padding: 8px 18px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;
  outline: none;
}
.locale-actions .btn-retry {
  background: linear-gradient(135deg, var(--yss-primary-light) 0%, var(--yss-primary) 100%);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 14px -2px var(--yss-shadow);
}
.locale-actions .btn-retry:hover {
  transform: translateY(-1.5px);
  box-shadow: 0 6px 18px -2px var(--yss-shadow);
}
.locale-actions .btn-retry:active {
  transform: translateY(0);
}
.locale-actions .btn-dismiss {
  background: rgba(255, 255, 255, 0.7);
  color: #334155;
  border: 1px solid rgba(203, 213, 225, 0.85);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
}
.locale-actions .btn-dismiss:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(148, 163, 184, 0.9);
  color: #0f172a;
  transform: translateY(-1.5px);
}
.locale-actions .btn-dismiss:active {
  transform: translateY(0);
}
@media (prefers-reduced-motion: reduce) {
  #yss-locale-transition,
  #yss-locale-transition .locale-transition-card,
  .locale-ambient-glow,
  .orbit-ring,
  .crystal-orb-wrapper,
  .crystal-orb,
  .orb-inner-glow,
  .orb-shadow,
  .locale-title,
  .locale-pulse-dots span {
    animation: none !important;
    transition: none !important;
  }
}
`;
  document.head.appendChild(style);

  /** 删除单次过渡标记，失败时由 TTL 防止旧标记永久遮挡。 */
  const clearMarker = () => {
    try {
      sessionStorage.removeItem(markerKey);
    } catch {
      /** 隐私模式降级。 */
    }
  };

  /** 展示延迟或失败反馈，让用户可主动重试，不无限阻挡页面。 */
  const showFeedback = (failed = false) => {
    if (!overlay) return;
    const copy = texts[current];
    const msgEl = overlay.querySelector('[data-message]');
    const subEl = overlay.querySelector('[data-submessage]');
    const actionsEl = overlay.querySelector('[data-actions]');
    const dotsEl = overlay.querySelector('[data-dots]');

    if (msgEl) msgEl.textContent = failed ? copy.failed : copy.slow;
    if (subEl) subEl.textContent = failed ? copy.failedHint : copy.slowHint;
    if (dotsEl) dotsEl.hidden = true;
    if (actionsEl) actionsEl.hidden = false;
  };

  /** 创建当前文档中的过渡层。 */
  const render = (locale, themeColor) => {
    current = supported.includes(locale) ? locale : 'zh-CN';
    clearTimeout(timer);
    clearTimeout(closing);
    overlay?.remove();

    const activeTheme = themeColor || getThemeColor();
    const palette = generatePalette(activeTheme);

    overlay = document.createElement('div');
    overlay.id = 'yss-locale-transition';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');

    // 动态注入匹配当前主题的 CSS 变量
    overlay.style.setProperty('--yss-primary', palette.primary);
    overlay.style.setProperty('--yss-primary-light', palette.primaryLight);
    overlay.style.setProperty('--yss-primary-pale', palette.primaryPale);
    overlay.style.setProperty('--yss-alt', palette.alt);
    overlay.style.setProperty('--yss-alt-light', palette.altLight);
    overlay.style.setProperty('--yss-orb-dark', palette.orbDark);
    overlay.style.setProperty('--yss-orb-deep', palette.orbDeep);
    overlay.style.setProperty('--yss-glow-1', palette.glow1);
    overlay.style.setProperty('--yss-glow-2', palette.glow2);
    overlay.style.setProperty('--yss-alt-glow-1', palette.altGlow1);
    overlay.style.setProperty('--yss-alt-glow-2', palette.altGlow2);
    overlay.style.setProperty('--yss-shadow', palette.shadow);
    overlay.style.setProperty('--yss-card-shadow', palette.cardShadow);

    // 环境光斑
    const glow1 = document.createElement('div');
    glow1.className = 'locale-ambient-glow glow-1';
    glow1.setAttribute('aria-hidden', 'true');

    const glow2 = document.createElement('div');
    glow2.className = 'locale-ambient-glow glow-2';
    glow2.setAttribute('aria-hidden', 'true');

    // 玻璃拟态卡片
    const card = document.createElement('div');
    card.className = 'locale-transition-card';

    // C4D 3D 舞台
    const stage = document.createElement('div');
    stage.className = 'c4d-stage';
    stage.setAttribute('aria-hidden', 'true');

    // 3D 轨道 1
    const ring1 = document.createElement('div');
    ring1.className = 'orbit-ring orbit-ring-1';
    const particle1 = document.createElement('span');
    particle1.className = 'orbit-particle';
    ring1.appendChild(particle1);

    // 3D 轨道 2
    const ring2 = document.createElement('div');
    ring2.className = 'orbit-ring orbit-ring-2';
    const particle2 = document.createElement('span');
    particle2.className = 'orbit-particle';
    ring2.appendChild(particle2);

    // 水晶球与内部高光
    const orbWrapper = document.createElement('div');
    orbWrapper.className = 'crystal-orb-wrapper';
    const orb = document.createElement('div');
    orb.className = 'crystal-orb';
    const specular = document.createElement('div');
    specular.className = 'orb-specular';
    const innerGlow = document.createElement('div');
    innerGlow.className = 'orb-inner-glow';
    orb.append(specular, innerGlow);
    orbWrapper.appendChild(orb);

    // 动态接触投影
    const shadow = document.createElement('div');
    shadow.className = 'orb-shadow';

    stage.append(ring1, ring2, orbWrapper, shadow);

    // 文案排版区
    const contentArea = document.createElement('div');
    contentArea.className = 'locale-content-area';

    const message = document.createElement('div');
    message.className = 'locale-title';
    message.dataset.message = '';
    message.textContent = texts[current].title;

    const subMessage = document.createElement('div');
    subMessage.className = 'locale-subtitle';
    subMessage.dataset.submessage = '';
    subMessage.textContent = texts[current].subtitle;

    const pulseDots = document.createElement('div');
    pulseDots.className = 'locale-pulse-dots';
    pulseDots.dataset.dots = '';
    pulseDots.setAttribute('aria-hidden', 'true');
    pulseDots.append(document.createElement('span'), document.createElement('span'), document.createElement('span'));

    contentArea.append(message, subMessage, pulseDots);

    // 操作按钮
    const actions = document.createElement('div');
    actions.className = 'locale-actions';
    actions.dataset.actions = '';
    actions.hidden = true;

    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'btn-retry';
    retry.textContent = texts[current].retry;
    retry.addEventListener('click', () => {
      try {
        show(current);
        location.reload();
      } catch {
        showFeedback(true);
      }
    });

    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'btn-dismiss';
    dismiss.textContent = texts[current].dismiss;
    dismiss.addEventListener('click', finish);

    actions.append(retry, dismiss);

    card.append(stage, contentArea, actions);
    overlay.append(glow1, glow2, card);
    document.body.append(overlay);

    timer = setTimeout(showFeedback, 15000);
  };

  /** 持久化短期过渡标记（携带当前主题色），供重载后的 HTML 恢复；不是第二份语言偏好。 */
  const show = locale => {
    const themeColor = getThemeColor();
    try {
      sessionStorage.setItem(
        markerKey,
        JSON.stringify({ locale, themeColor, path: location.pathname, createdAt: Date.now() })
      );
    } catch {}
    render(locale, themeColor);
  };

  /** 等页面完成渲染后淡出；取消也会删除单次标记。 */
  function finish() {
    clearTimeout(timer);
    clearMarker();
    const target = overlay;
    overlay = undefined;
    if (!target) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        target.style.opacity = '0';
        closing = setTimeout(() => target.remove(), 280);
      });
    });
  }

  window.__YSS_LOCALE_RELOAD__ = {
    show,
    finish,
    cancel: finish,
    fail: () => {
      if (!overlay) render(current);
      showFeedback(true);
    },
  };

  try {
    const marker = JSON.parse(sessionStorage.getItem(markerKey) || 'null');
    clearMarker();
    if (
      marker &&
      supported.includes(marker.locale) &&
      marker.path === location.pathname &&
      Date.now() - marker.createdAt >= 0 &&
      Date.now() - marker.createdAt < 60000
    ) {
      render(marker.locale, marker.themeColor);
    }
  } catch {
    clearMarker();
  }

  window.addEventListener('microapp-loading-end', event => {
    const appName = location.pathname.match(/^\/subApp\/([^/]+)/)?.[1];
    if (appName && event.detail?.appName === appName) finish();
  });
})();
