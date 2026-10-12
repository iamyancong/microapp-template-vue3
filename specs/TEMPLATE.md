# Spec: [任务名称 / 模块重构 / 功能迭代]

> **生命周期说明**：Spec 是单次任务或迭代的“任务合同”，生命周期为数天至数周。
> 任务开始前创建并由人机对齐边界，任务全部完成且验收通过后，**必须移入 `specs/archive/` 归档**，避免长期常驻污染 Agent 上下文。

---

## 1. 任务背景与目标

简述本次需求、重构目标或要解决的核心问题。

## 2. 明确可修改范围 (白名单)

明确列出 Agent 允许修改的文件与目录路径：

- `packages/src/views/{ModuleName}/**`
- `packages/src/locales/lang/{locale}/{module}.ts`
- `packages/src/router/routes.ts`（若涉及路由注册）

## 3. 明确严禁修改范围 (黑名单)

明确列出绝对禁止碰触的底层与公共链路：

- ❌ `packages/src/api/mutator.ts`（全局网络与错误拦截器）
- ❌ `packages/vite.config*.ts`（构建与打包核心配置）
- ❌ `package.json` / `pnpm-lock.yaml`（除非有明确依赖变更申请）
- ❌ `packages/src/styles/`（公共全局变量文件）

## 4. 需人工确认的操作 (Hard Stops)

在执行以下动作前，必须停下向开发者确认方案：

- [ ] 调整接口 OpenAPI 规范或改变现有 API 契约
- [ ] 引入新的外部 npm 依赖库
- [ ] 修改涉及公共布局或路由守卫的逻辑

## 5. 验收标准清单 (Checklist)

- [ ] 业务功能逻辑与需求完全一致
- [ ] 涉及代码遵循关注点分离规范（`index.vue` ≤ 150 行，拆分 `hooks/`, `constant.ts`, `style.less`）
- [ ] 样式完全消费动态主题 Token，无硬编码色值
- [ ] 国际化文案三语对齐（`zh-CN`, `zh-TW`, `en-US`）
- [ ] 运行 `pnpm type-check` 类型检查 0 报错
- [ ] 运行 `pnpm lint:check` 语法门禁 0 报错
- [ ] 若涉及表格，高度自适应正常，无双滚动条
