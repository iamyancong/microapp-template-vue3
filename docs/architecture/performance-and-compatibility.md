# 微应用加载性能、首屏体积与兼容性架构指南

本文档记录微应用模版的性能基线、首屏打包策略与低配浏览器（Chrome 90）兼容架构设计。

---

## 1. 运行环境与目标基线

- **目标硬件与浏览器**：云内低配机器（典型配置 8GB 内存）+ **Chrome 90**（云内环境不可自主升级）。
- **性能痛点**：旧版 V8 引擎解析超大 JS 脚本耗时极长，首屏 JS 每增加 1MB 都会直接放大卡顿与白屏时长。历史上曾因配置不当导致首屏达到 10.5MB，经系统性重构后降至 1.5MB 左右。
- **构建目标**：`vite.config*.ts` 统一以 `target: 'chrome90'` 构建，并通过 `src/polyfills/chrome90.ts` 定向补齐环境缺失方法。

---

## 2. 核心打包与加载策略

### 2.1 精确按需引入 (On-Demand Imports)

- **组件与依赖**：所有 UI 组件、业务组件、图标、工具函数与第三方库必须具名或按需引入。
- **严禁全量注册**：禁止 `app.use(YSSUI)`、`app.use(Antd)` 或 `import * as UI from 'xxx'`。全量安装会导致 Tree-shaking 失效，将未使用的表格引擎、编辑器、图表等打进首屏 bundle。
- **页面级按需加载**：页面通过路由懒加载（`() => import('@/views/Xxx/index.vue')`）；页面内部的静态组件导入属于页面级加载，不要求把每个微小组件单独拆分网络请求。
- **样式入口**：`main.ts` 仅引入组件库基础样式，重型组件依赖与业务组件通过路由边界切分，禁止混入首屏入口链路。

### 2.2 manualChunks 分包策略（规避 Rollup 陷阱）

- **白名单规则**：`vite.config.ts` 的 `manualChunks` **仅允许合并启动必然加载的核心库**：
  - `vite/preload-helper`（避免被分入大懒 chunk 后拖垮首屏）
  - Vue 生态核心（`vendor`：vue, vue-router, pinia 等）
  - 启动阶段实际使用的 Ant Design Vue 组件（由 Rollup 依赖图自然抽取，严禁强行全量打包）
- **规避经典 Rollup 陷阱**：
  - ❌ **严禁把 `@yss-ui`、`@formily`、`vxe-table`、`monaco`、`echarts` 等按需库加入 manualChunks 合并成单一命名 chunk**。
  - 原因：Rollup 会将不同懒加载路由中引用的该库模块合并到同一个 chunk 中，一旦某路由被触发或静态分析引用，可能将高达数 MB 的重型依赖提前下载解析。这些库必须交给 Rollup 随路由自动切分。
  - ❌ 严禁设置 `manualChunks: undefined`（关闭分包会导致单一大 bundle）。

### 2.3 路由与重型组件隔离

- **路由懒加载**：所有视图组件一律动态加载，禁止在 `router/index.ts` 顶部静态 import 页面组件。
- **首屏禁入重组件**：在 `main.ts`、`App.vue`、`layout/`、全局 store 等启动静态链路上，严禁导入 `YMonaco`、`YSheet`、`YEcharts` 或直接导入 `monaco-editor`、`echarts`、`@univerjs`。
- **延迟挂载**：首屏以下或次要看板组件建议使用 `useVisibleOnce` 视口延迟挂载。

---

## 3. 页面缓存、预压缩与部署

### 3.1 统一 KeepAlive 上限

- `App.vue` 与 `layout/MainLayout.vue` 的 `<keep-alive>` 必须使用统一的设备感知缓存上限（低配环境设置较小上限，防止内存泄漏或撑爆 8GB 内存）。

### 3.2 静态预压缩 (.gz / .br)

- 构建产物自动生成 `.gz` 与 `.br` 预压缩文件。
- Nginx 默认开启 `gzip_static`；Brotli 在部署镜像支持时通过 `ENABLE_BROTLI_STATIC=true` 协商开启。

---

## 4. 生产发版首屏账单验收 (Bill of Materials)

每次执行生产构建后，执行首屏账单核查：

1. 检查 `dist/index.html` 的 `modulepreload` 和入口静态依赖清单。
2. 追踪默认路由（当前 `/table`）动态加载的依赖闭包。
3. 若首屏静态依赖或默认路由依赖中出现非业务必要的大体积 JS（如 Monaco, Univer, ECharts），必须定位修复后方可交付。
