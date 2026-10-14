# AGENTS.md — 前端微应用项目宪法与路由指南

> 本仓库为 **Vue3 + TypeScript + Vite + YSS UI + Orval** 标准微应用脚手架模版。
> 本文件为 Coding Agent 的常驻工程宪法与上下文路由器，行数严格受控（≤ 100 行）。

---

## 1. 角色与核心技术栈

- **角色**：本微应用仓库的前端资深 Coding Agent，负责在明确的工程边界内完成高质量代码研发、重构与验证。
- **技术栈**：Vue 3.x (SFC `<script setup lang="ts">`) + TypeScript 5.x + Vite + pnpm。
- **UI 与表单方案**：**YSS UI 优先** (`@yss-ui/components` / `@yss-ui/hooks`) + Ant Design Vue 补齐；表单统一使用 `YFormily` + JSON Schema（`YssFormily` 仅为历史兼容别名，新代码不用）。
- **接口与数据流**：OpenAPI / Orval 自动生成 API + `mutator.ts` 响应拦截；雪花 ID 与大数字全局字符串化。
- **Skills 约定**：实体主目录为 `.agents/skills`，IDE 兼容链接自动映射，通过 `pnpm sync:skills` 与 `pnpm check:skills` 统一维护。

---

## 2. 页面与组件目录规范 (关注点分离)

主组件 `index.vue` 仅负责组合 Hooks 和渲染视图，**代码量必须 ≤ 150 行**，超过必须执行模块化拆分：

```text
packages/src/views/{ModuleName}/
├── index.vue                 # 主组件：仅负责组合 Hooks 和渲染视图模板 (≤150行)
├── constant.ts               # 表格列配置、createActionConfig、枚举映射、静态 Formily Schema
├── hooks/                    # 业务逻辑 Composables (useXxxList.ts / useXxxForm.ts)
├── components/               # 页面私有弹窗/抽屉/拆分子组件
└── style.less                # 模块独立样式文件 (@import './style.less';)
```

SFC 代码块强制顺序：`1. <script setup lang="ts">` -> `2. <template>` -> `3. <style scoped lang="less">`。

---

## 3. 核心工程硬约束 (Mandatory Boundaries)

- **工具契约先行**：代码级禁令（禁止直接使用 `a-table`、禁止引入 `@formily/antdv`、禁止原生 `fetch`）已接入 ESLint 硬门禁拦截。
- **表格操作列**：强制优先使用 `YTable` 的 `:action-config`（在 `constant.ts` 中通过 `createActionConfig` 导出），禁止手搓模板操作插槽。
- **接口防御与错误**：信赖 `mutator.ts` 全局拦截器（接口成功解析即保证成功），业务 Hook 内**严禁**编写冗余 `if (res?.success)` 或在 catch 块中重复 `message.error`。
- **大数字精度保护**：长整型与雪花 ID 在底层通过 `json-bigint` 全局转为字符串，**严禁使用 `Number()` / `parseInt()` 强制类型转换**，一律透传原始字符串。
- **动态主题 Token**：**严禁硬编码颜色**（如 `#hex` 或交互色阶），必须使用项目语义 Token（如 `--primary-color`），主色透明态必须动态派生。
- **打包与首屏底线**：严禁在 `manualChunks` 合并按需库；严禁在首屏静态链路（main/App/layout/store）引入 Monaco/ECharts/Univer 重型引擎；禁止全量注册组件库。
- **高危操作确认**：禁止修改 `mutator.ts` 核心拦截逻辑；禁止执行 `git push --force`；修改构建配置前必须先输出 dry-run 方案确认。

---

## 4. 修改后必须执行的质量门禁

每次完成代码编写或重构后，必须按序执行自动化检查：

1. `pnpm type-check`：TypeScript 类型检查（0 错误）。
2. `pnpm lint:check`：ESLint 语法与架构硬约束门禁（0 错误）。
3. `pnpm check:skills`：业务技能与路由一致性检查。
4. 涉及打包配置、组件库升级或构建优化时：执行 `pnpm test:performance` 与 `pnpm build`。

---

## 5. Context Routing (按需上下文路由器)

遇到具体业务或专项任务时，必须主动按需加载对应层级，禁止依赖常驻记忆猜测：

- **业务列表 / CRUD / 表格开发**：加载 `.agents/skills/page-list-module/SKILL.md` 与 `.agents/skills/ytable-usage/SKILL.md`
- **表单 / 联动 / 弹窗抽屉开发**：加载 `.agents/skills/page-form-module/SKILL.md` 与 `.agents/skills/yss-formily/SKILL.md`
- **页面主题与 Token 换肤规范**：加载 `.agents/skills/theme-token-usage/SKILL.md`
- **国际化多语言字典维护**：加载 `.agents/skills/i18n-locale-management/SKILL.md`
- **文件导出与下载流处理**：加载 `.agents/skills/file-export-download/SKILL.md`
- **Chrome 90 兼容、分包机理与首屏守护**：查阅 `docs/architecture/performance-and-compatibility.md`
- **架构决策与演进历史**：查阅 `docs/decisions/`（ADR 记录）
- **复杂迭代 / 跨模块重构任务**：先在 `specs/` 编写任务合同（参考 `specs/TEMPLATE.md`），明确白名单边界；任务完成后归档至 `specs/archive/`
