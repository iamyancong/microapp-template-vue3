# 微应用模板性能架构审计计划

## 目标

评估当前业务项目中已经验证有效的加载优化，哪些适合下沉到 Vue3 微应用模板，哪些需要保留为业务项目按需处理，并检查 `AGENTS.md` 是否能约束新项目不回退。

## 范围

- 模板入口、Vite 配置、JSP 配置、路由、KeepAlive 和脚手架生成脚本。
- 当前模板构建产物与首屏静态依赖。
- `AGENTS.md` 中的规则与实际代码一致性。

## 阶段

- [x] 读取模板工程规范和现有性能规则
- [x] 检查 Vue/Vite/qiankun 入口与路由架构
- [x] 检查普通构建、JSP 构建和脚手架生成链路
- [x] 完成当前产物构建与体积基线
- [x] 输出适合改造项、暂不建议改造项和 AGENTS 更新建议
- [x] 接入精确 Antd、Chrome 90 基线、KeepAlive 上限和预压缩
- [x] 增加构建账单检查并同步 CI/AGENTS 约束
- [x] 完成普通、独立、JSP、主题 JSP、类型和格式验证

## 完成结论

模板当前已实施 P0：精确 Antd 注册、Chrome 90 构建基线、普通/JSP 预压缩、默认路由依赖闭包账单和统一 KeepAlive 上限。ECharts/Monaco/Univer 仍以规则守护为主，当前 `@yss-ui/components@1.1.42` 的 monolithic 发布包会在默认 YTable 示例共享 chunk 留下重型代码标识，需后续推动组件库升级/拆包；external 化暂不作为模板默认方案。

## 当前结论

模板整体方向已落实首屏体积守护规则；当前剩余风险集中在组件库发布包自身的共享 chunk，不是模板入口全量注册造成。后续优先级是升级/拆分组件库并复测默认 `/table` 闭包。

# 审计进度

## 2026-09-03

- 已读取并核对 `AGENTS.md`、普通 Vite 配置、JSP 配置、Vue 入口、App、路由、KeepAlive、脚手架生成脚本和 CI 配置。
- 已通过 CodeGraph 定位入口和性能相关符号；模板存在 `.codegraph/`，后续继续优先使用 CodeGraph。
- 已确认当前模板工作区起始状态干净。
- 首次构建因默认 Node 12 不满足模板 Node >=18 要求失败；切换 Node 22 后普通 Vite 构建和 JSP 构建均成功。
- 普通构建基线为约 2.60 MB raw / 0.81 MB gzip-5 / 0.65 MB Brotli-9 的首屏静态集合，其中 Ant Design Vue JS 约 1.42 MB。
- `lint:check` 无 error；`type-check` 被现有 Demo 页 `YTableActionConfig.align` 类型推断错误阻断。
- 已完成模板适用性判断：通用加载架构可下沉到新版和旧版浏览器，Chrome 90 target/polyfill 属于最低兼容基线。
- 已完成 `AGENTS.md` 差距审计：现有规则方向正确，但缺少精确 Antd 注册、默认路由闭包、预压缩部署和 KeepAlive 统一上限等约束。
- 已完成精确 Ant Design Vue 注册、Chrome 90 构建目标、轻量运行时兼容层、统一 KeepAlive 上限和普通/JSP/主题预压缩接入。
- 已新增构建账单检查：入口静态依赖、默认 `/table` 动态依赖闭包、modulepreload 和 `.gz/.br` 完整性均自动检查；首屏命中重型运行时会阻断，默认示例页中的组件库残留标识会告警。
- 已更新 `.gitlab-ci.yml` 的 `gzip_static` 与可选 Brotli 配置，并补强 `AGENTS.md` 的通用浏览器基线、Antd 精确注册、external 边界和体积验收规则。
- 最终验证：四种构建均通过，`type-check`、`format:check` 通过，`lint:check` 0 error、12 条既有 warning；未提交、未推送。
- 根据复核意见，已将 `AGENTS.md` 的按需规则从“YSS UI/Antd 示例”提升为所有组件、图标、工具和第三方依赖的通用规则，并补充“页面级懒加载不等于每个小组件各发一个请求”的边界。
- 根据进一步确认，已删除 `packages/src/plugins/antDesign.ts`，移除全局 Antd 注册，改为 `App.vue`、`MainLayout.vue`、`RecursiveMenu.vue`、登录页和 404 页分别按需导入所用组件。
