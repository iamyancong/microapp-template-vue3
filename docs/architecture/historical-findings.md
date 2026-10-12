# 微应用模板性能审计发现

## 初步发现

- 模板当前使用 Vue 3 + Vite + `vite-plugin-qiankun`，同时支持普通 qiankun、独立部署和 JSP 构建。
- `AGENTS.md` 已禁止恢复 YSS UI 全量注册，并已规定路由懒加载和 `manualChunks` 边界。
- 实际 `packages/src/main.ts` 仍执行 `app.use(Antd)`；模板页面使用的 Ant Design Vue 标签可以改为精确组件注册。
- 普通 `packages/vite.config.ts` 仍使用 `target: 'es2020'`、`modulePreload.polyfill: true`，与 Chrome 90 定向兼容策略不一致。
- `packages/src/App.vue` 的 KeepAlive 上限固定为 8，`MainLayout.vue` 内部 KeepAlive 没有 `max`。
- 普通、JSP 和主题 JSP 构建均未接入 gzip/Brotli 预压缩脚本。
- 当前模板没有 ECharts、Monaco、Univer 运行时导入；这类按需拆分应作为规则和验收守护，不应为模板预先引入重型依赖。
- `.gitlab-ci.yml` 生成的 Nginx 配置开启 gzip，但没有配置 `gzip_static` 或 Brotli 静态文件协商；后续若接入预压缩，需要同步部署配置。
- 脚手架 `scripts/create-microapp.mjs` 会复制模板配置，因此模板层的性能规则会自然传递到新项目；JSP 配置也需要明确是否与普通构建采用同一兼容策略。

## 改造前构建基线

- 使用 Node 22.17.1 + pnpm 10.15.0 执行普通 `pnpm build` 成功。
- 当前普通构建首屏静态集合（入口脚本、modulepreload、首屏 CSS）约为 2,600,516 bytes raw / 811,390 bytes gzip-5 / 653,219 bytes Brotli-9。
- 其中 `antd` JS 约 1,417,162 bytes raw，说明当前模板的 `app.use(Antd)` 会把 Ant Design Vue 全量实现放入启动依赖。
- 当前 `dist/index.html` 的 modulepreload 只有 `vendor` 和 `antd` 两个 JS，未发现 YSS UI、Monaco 或 ECharts 被模板当前示例拖入首屏。
- 当前构建未生成 `.gz` 或 `.br` 文件。
- JSP 构建 `pnpm --dir packages build:jsp` 成功，但固定文件名的 `static/js/index.js` 与 `static/css/index.css` 合计约 2,611,143 bytes raw / 814,663 bytes gzip-5 / 654,894 bytes Brotli-9，同样没有预压缩副本。

## 改造前质量基线

- `pnpm lint:check` 通过但有 12 条既有 warning。
- `pnpm type-check` 当前失败于 `packages/src/views/Demo/index.vue:153` 的 `YTableActionConfig.align` 类型推断，属于模板现有示例类型问题，不是性能改造引入。

## 适用性判断

- 按需注册、路由懒加载、重型依赖隔离、稳定基础分包、静态压缩、HTTP 缓存和有上限的 KeepAlive 都是与浏览器版本无关的架构优化，新旧浏览器都能受益。
- `target: chrome90`、最小运行时 polyfill 和 `modulePreload` 处理属于最低支持浏览器策略；只要模板仍需支持 Chrome 90，就应作为统一产物基线。未来若放弃 Chrome 90，再单独提高 target，不应按“新版浏览器很快”提前回退。
- 模板当前没有 ECharts、Monaco、Univer 运行时导入，不应为了演示优化而引入这些依赖；应把它们的首屏静态链路禁止规则、精确导入规则和默认路由闭包检查写入模板规范。

## AGENTS.md 待补强点

- 现有 3.7 已禁止 `app.use(YSSUI)`，但实际 `main.ts` 仍有 `app.use(Antd)`；需要新增 Ant Design Vue 全量注册禁用和精确组件注册模板。
- 当前首屏账单只要求 modulepreload 仅有 vendor + antd，仍需增加默认路由动态 import 闭包和默认业务页完整资源闭包检查。
- 当前规则没有要求普通构建、JSP 构建和主题 JSP 构建生成 `.gz/.br`，也没有把 Nginx 的 `gzip_static`/Brotli 静态协商写为部署前置条件。
- 当前规则没有说明 KeepAlive 必须按设备能力设置 `max`，且 `App.vue` 与 `MainLayout.vue` 都要接线。
- 当前规则将 `antd` 描述为“全量注册”分组；精确注册后应改成“启动必需的 Ant Design Vue 实际组件分组”，并禁止用固定文件大小代替依赖闭包验收。
- 应增加“公共依赖 external 默认不启用”的边界：必须先统一 Vue/UI 版本、定义宿主注入契约并通过独立运行与集成运行验收。

## 实施结果

- `main.ts` 已移除 Ant Design Vue 全局注册；App、布局、菜单、登录和 404 页面分别精确导入实际使用的 Ant Design Vue 组件，保留 `@yss-ui/components` 页面级按需导入。
- 普通、JSP、JSP 主题构建已统一使用 `target: 'chrome90'` 和 `modulePreload.polyfill: false`；入口增加轻量 `src/polyfills/chrome90.ts`，只补齐运行环境缺失的方法。
- `App.vue` 与 `MainLayout.vue` 已接入统一的设备感知 KeepAlive 上限：低配/Chrome 90/Win7 上限 2，现代设备上限 6。
- 新增 `scripts/precompress-dist.mjs` 和 `scripts/check-build-bundle.mjs`，四类构建自动生成 `.gz/.br` 并核对入口静态依赖、默认 `/table` 动态依赖闭包和预压缩完整性。
- `.gitlab-ci.yml` 已启用 `gzip_static`；Brotli 通过 `ENABLE_BROTLI_STATIC=true` 可选开启，避免基础镜像未安装模块时直接破坏部署。
- 当前已发布 `@yss-ui/components@1.6.0` 的稳定公共入口仍是根入口（另有 `lite`、`sheet` 和 locale 入口），模板和既有微应用可以继续使用根具名导入。模板通过 `yss-components-isolation` 将根入口映射为轻量虚拟入口，重型组件及其 `diff`、ECharts、Monaco、SQL formatter 依赖不进入普通页面闭包；模板不要求业务代码改成尚未发布的组件子路径。

## 实施后测量

- 普通构建入口静态依赖应以最终 `dist/index.html` 的静态闭包统计为准；YSS UI 的重型 `main-exports` 共享实现不应直接出现在入口 HTML，只有进入对应重型业务路由后才加载。
- JSP/主题 JSP 构建同样接入隔离插件；固定文件名不改变按路由动态加载的边界，仍需在实际部署侧结合 `Content-Encoding` 验证压缩传输。
- 当前已发布包未暴露 `@yss-ui/components/tree` 等组件子路径，因此不把组件子路径作为模板或存量微应用的必改项。
- `pnpm build`、`pnpm build:standalone`、`pnpm build:jsp`、`pnpm build:jsp-theme`、`pnpm type-check` 和 `pnpm format:check` 均通过；`pnpm lint:check` 0 error、12 条既有 warning。

## 2026-09-10 当前证据

模板旧账单默认页 3.41 MiB raw / 0.96 MiB gzip；脚本漏掉部分启动动态资源。YSS 1.6.0 将普通组件合并，需从发布边界解决，同时保持根入口、lite、sheet、locale 和旧 CSS 路径。主应用三个分支首页与认证不同，必须按目标分支实施。

## 2026-09-10 最终补充

- 不能改旧组件库主构建的 chunk 结构来强推升级：旧隔离插件依赖发布包内部 main-exports，实验已复现重复导出错误。最终保留旧流程，另建 modular/light 公开入口，并以 tarball 消费及旧插件构建验证兼容。
- 新入口在完整 YTable + YFormily 示例页并没有体积优势；主要成本仍是普通组件公共实现和全局样式，不虚报收益。
- qiankun 的 import-html-entry 将 link CSS 内联成带 URL 注释的 style；Vite 异步 preload 只认 link，导致约 668 KB CSS 重复请求。已补充生效样式匹配并在三分支浏览器中验证 CSS URL 无重复。
- dev/dev-hgrs 本地分支原先各落后一个已存在的远端授权/i18n 修复提交，已分别快进至 551d863 / 83c5291 并重跑构建和全部测试。没有跨分支合并业务逻辑。
- 最终字节口径、部署限制、旧包/新包边界均见 PERFORMANCE.md。

- 补充发现：主应用退出布局再返回时，mounted 缓存可能指向已经销毁的容器。三分支均增加容器有效性检查，并移除“同名激活应用即使失效也直接复用”的例外；新增回归用例通过。

# Vue3 微应用模板性能架构评估

## 结论

业务项目中已经验证的这套方案，不是只对 Chrome 90 有效。按需引入、路由懒加载、重型依赖隔离、合理分包、预压缩、缓存和 KeepAlive 上限，属于微应用通用架构优化，新版浏览器同样会减少下载、解析、执行和内存占用。

Chrome 90 相关的是“最低兼容基线”：`build.target`、运行时 polyfill 和 `modulepreload` 策略。只要内网仍有 Chrome 90，就建议模板统一产出兼容 Chrome 90 的版本；新版浏览器直接使用该产物即可。未来如果最低浏览器版本提高，再单独调整 target，不建议因为新版浏览器可用就恢复全量注册或首屏静态引入重型依赖。

## 改造前模板基线

模板当前技术栈为 Vue 3 + Vite 6 + qiankun，并同时支持普通微应用、独立运行和 JSP 集成。

使用 Node 22.17.1 + pnpm 10.15.0 构建得到：

| 场景                        | 当前测量结果                                       | 说明                                           |
| --------------------------- | -------------------------------------------------- | ---------------------------------------------- |
| 普通构建首屏静态集合        | 约 2.60 MB raw / 0.81 MB gzip-5 / 0.65 MB Brotli-9 | 入口脚本、modulepreload 和首屏 CSS             |
| 普通构建 Ant Design Vue     | 约 1.42 MB raw / 0.43 MB gzip-5                    | 改造前 `app.use(Antd)` 全量注册导致            |
| 默认 `/table` Demo 异步页面 | 约 2.62 MB raw / 0.81 MB gzip                      | 根路由重定向后仍会加载，不能只看 modulepreload |
| JSP 集成静态集合            | 约 2.61 MB raw / 0.81 MB gzip-5 / 0.65 MB Brotli-9 | 当前固定文件名构建，尚无预压缩副本             |

当前普通构建的 modulepreload 虽然只有 `vendor` 和 `antd`，但默认路由会继续拉取 Demo 页面 chunk。因此模板验收必须同时看“入口静态集合”和“默认路由完整依赖闭包”。

## 建议下沉到模板的内容

### P0：建议直接纳入模板默认实现

1. **所有组件与依赖按需引入**
   - 规则不应只针对 YSS UI 或 Ant Design Vue；所有组件库、业务组件、图标、工具函数和第三方库都应使用精确导入，禁止命名空间导入、默认总入口全量安装和无边界全局注册。
   - 路由页面统一懒加载；页面内部静态导入的基础组件属于页面级按需加载，不建议为了每个小组件都额外拆分网络请求。
   - named import 仍需结合构建产物验证；如果组件库发布包本身是 monolithic bundle，应推动组件库拆包/升级。

2. **Ant Design Vue 精确注册**
   - 删除 `main.ts` 的 `app.use(Antd)`。
   - 不新增统一的 Antd 注册文件，改为在实际使用组件的 Vue 页面/组件内精确导入 `ConfigProvider`、Layout、Menu、Dropdown、Tooltip、Badge、Avatar、Result、Textarea 等组件。
   - 图标继续保持具体命名导入，禁止 namespace 或动态全量导入。

3. **统一 Chrome 90 构建基线**
   - 普通 Vite 配置将 `target` 调整为 `chrome90`。
   - 关闭 Chrome 90 已支持的 modulepreload polyfill。
   - 增加轻量条件式运行时兼容层；不要引入完整 legacy bundle。
   - 普通构建、JSP 构建、主题 JSP 构建是否都服务 Chrome 90，需要在模板中明确；如果 JSP 也支持 Chrome 90，建议保持同一兼容基线。

4. **构建后预压缩**
   - 为普通、JSP、主题 JSP 构建接入统一的 gzip/Brotli 预压缩脚本。
   - 同步更新模板 CI 生成的 Nginx 配置，确认 `gzip_static`；如果镜像包含 `ngx_brotli`，启用 Brotli 静态直出。
   - 若部署环境无法保证 Brotli 模块，至少保证 gzip 预压缩和原文件回退可用。

5. **默认页面依赖闭包账单**
   - 构建后检查 `dist/index.html` 的 modulepreload 清单。
   - 继续解析入口脚本的静态 import 和默认路由的动态 import，统计默认业务页 raw/gzip/Brotli 总量。
   - 设置“发现非业务必要的 YSS UI、Monaco、ECharts、Univer 等重型资源进入默认页闭包即阻断交付”的规则；若组件库发布包自身携带残留标识，则必须在账单中告警并推动组件库升级/拆包。

6. **KeepAlive 上限统一接线**
   - 抽出模板级 `resolvePageKeepAliveMax`：Chrome <100、Win7、CPU <=4 核或内存 <=4 GB 时使用较小上限，例如 2；现代设备可使用更高但有界的上限。
   - `packages/src/App.vue` 和 `packages/src/layout/MainLayout.vue` 都要绑定同一个 `max`，不能一个固定 8、一个无限缓存。

### P1：适合写入模板规范和脚手架检查

1. **重型组件守护**
   - 模板当前没有 ECharts、Monaco、Univer，不建议引入示例依赖。
   - 在 `AGENTS.md` 中明确：重型组件只能出现在懒加载 `views/` 子树，不得出现在 `main.ts`、`App.vue`、layout、全局 store 或路由顶层静态 import。
   - 对 ECharts 明确要求 `echarts/core` + 实际 chart/component/renderer 精确注册。

2. **分包边界守护**
   - `manualChunks` 只分组启动必需的 Vite helper、Vue 生态和实际首屏 Ant Design Vue 组件。
   - 禁止把 `@yss-ui`、`@formily`、VXE、Monaco、ECharts 等按需依赖按包名强制合并。
   - 这条规则要同时覆盖普通 Vite 配置；JSP 固定文件名构建可以有独立策略，但仍需进行默认页面闭包验收。

3. **脚手架生成后自检**
   - `scripts/create-microapp.mjs` 会复制模板，因此上述构建配置和 AGENTS 规则会自动传递给新项目。
   - 建议脚手架增加一次非交互式 `build`/账单检查入口，至少在模板仓库 CI 中执行，防止模板自身规则失效。

### P2：暂不建议默认落地

- **Vue、Ant Design Vue、YSS UI external 化**：模板同时支持独立运行和 qiankun 集成，且宿主版本、依赖版本和注入协议未必一致。应先定义共享依赖契约和版本矩阵，再单独做可选模式。
- **模板预置 ECharts/Monaco/Univer 的轻量封装**：当前模板没有这些业务能力，预置会增加依赖复杂度；只需提供规范和检查脚本。
- **组件级 CSS/PurgeCSS**：当前 YSS UI 主要提供全局样式出口，贸然清理可能误删运行时样式；应等待组件库提供稳定 CSS exports。

## `AGENTS.md` 是否需要写清楚

需要，而且当前文件已经有较好的基础，但仍需补充以下四个边界：

1. 优化是“通用架构优化 + Chrome 90 兼容基线”，不是只针对旧浏览器。
2. 禁止 `app.use(Antd)` 全量注册，要求在实际使用组件的 Vue 页面/组件内精确导入。
3. 首屏验收必须覆盖默认路由动态依赖闭包，不仅是 modulepreload。
4. 预压缩文件生成与 Nginx 静态协商必须同时验收，KeepAlive 必须有统一上限。

另外，现有规则中的“modulepreload 正常只有 vendor 约 130KB + antd 约 1.4MB”不建议继续写成固定体积承诺。组件版本、模板示例和业务页面会改变体积，更稳妥的写法是：只允许启动必需依赖，并通过当前构建产物和默认页面闭包设置基线阈值。

## 实施结果与验证状态

- 已完成删除全局 Ant Design Vue 注册文件，改为 Vue 页面/组件内精确导入，并完成 Chrome 90 构建基线、轻量运行时兼容层、统一 KeepAlive 上限、普通/JSP/主题预压缩和构建账单检查。
- 普通/独立构建入口静态依赖约 `2.22 MB raw / 0.68 MB gzip / 0.56 MB Brotli`；JSP/主题 JSP 入口静态依赖约 `1.46 MB raw / 0.46 MB gzip / 0.36 MB Brotli`。
- 默认 `/table` 依赖闭包约 `4.68 MB raw / 1.44 MB gzip / 1.22 MB Brotli`，包含示例页所需的 YSS Table 共享 chunk；当前组件库 `@yss-ui/components@1.1.42` 发布包会在该共享 chunk 中留下 ECharts、Monaco、Univer 标识，构建账单会告警但不误判为入口静态依赖。
- `pnpm build`、`pnpm build:standalone`、`pnpm build:jsp`、`pnpm build:jsp-theme`、`pnpm type-check`、`pnpm format:check` 均通过；`pnpm lint:check` 0 error、12 条既有 warning。
- 已更新 `AGENTS.md` 与 `.gitlab-ci.yml`；审计过程新增的 `task_plan.md`、`findings.md`、`progress.md` 用于保留证据，未提交、未推送。
