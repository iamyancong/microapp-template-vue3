# microapp-template-vue3

基于 Vue3 + TypeScript + Qiankun + YSS UI 的现代化企业级前端微应用脚手架模版

## 项目特性

- 🚀 **Vue 3** - 使用最新的 Vue 3 Composition API
- 🔥 **TypeScript** - 完整的 TypeScript 严格类型支持
- 🎯 **Qiankun** - 微前端架构，既可作为子应用集成，亦支持独立运行
- ⚡ **Vite** - 极速的现代前端构建工具
- 🎨 **YSS UI + Ant Design Vue** - 金融企业级 UI 组件库与开箱即用规范
- 🔧 **ESLint + Prettier** - 严格架构硬拦截规范与代码格式化
- 📱 **响应式与主题 Token** - 动态 Token 换肤与高密度业务支持
- 🌐 **API 自动生成** - 基于 OpenAPI 规范与 Orval 自动生成类型安全客户端
- 🔄 **性能与大数守护** - Chrome 90 兼容基线、长整型精度与首屏账单管控

## 项目结构

```
microapp-template-vue3/
├── openapi/                          # OpenAPI 规范文件（如: openapi.yaml）
├── packages/                         # 微应用源代码
│   ├── src/                          # 源代码目录
│   │   ├── api/                      # API 相关
│   │   │   ├── generated/            # 自动生成的 API 客户端（由 Orval 生成）
│   │   │   └── mutator.ts            # 自定义请求封装（如 axios 实例）
│   │   ├── components/               # 全局通用组件
│   │   │   └── ...                   # 如 Button, Modal 等
│   │   ├── views/                    # 页面视图目录
│   │   │   └── Remediation/          # Remediation 模块（页面示例）
│   │   │       ├── index.vue                     # 页面入口组件
│   │   │       ├── type.ts                       # 类型定义（DTO、Form、Table 等）
│   │   │       ├── constant.ts                   # 模块常量（状态码、标签、枚举等）
│   │   │       ├── hooks/                        # 业务专属 Hooks
│   │   │       │   ├── useRemediationList.ts     # 列表逻辑
│   │   │       │   └── useRemediationForm.ts     # 表单逻辑
│   │   │       ├── utils/                        # 模块私有业务工具函数（可选）
│   │   │       │   └── formatter.ts              # 格式化工具
│   │   │       ├── components/                   # 模块私有组件（不跨模块复用）
│   │   │       │   ├── RemediationTable.vue      # 整改列表组件
│   │   │       │   └── RemediationModal.vue      # 整改弹窗组件
│   │   │       └── assets/                       # 模块专属静态资源（可选）
│   │   │           └── images/                   # 图片资源
│   │   │               └── placeholder.png
│   │   ├── router/                   # 路由配置
│   │   │   └── index.ts
│   │   ├── store/                    # 状态管理（Pinia/Vuex）
│   │   │   └── modules/
│   │   ├── styles/                   # 全局样式
│   │   │   ├── vars.scss
│   │   │   └── reset.css
│   │   ├── types/                    # 全局类型定义
│   │   │   └── index.ts
│   │   ├── App.vue                   # 根组件
│   │   └── main.ts                   # 应用入口
│   ├── mock/                         # Mock 数据（开发环境使用）
│   ├── package.json                  # 微应用依赖配置
│   ├── vite.config.ts                # Vite 构建配置
│   └── tsconfig.json                 # TypeScript 配置
├── scripts/                          # 自定义脚本
│   ├── sync-openapi.js               # 同步 OpenAPI 并生成 API 客户端
│   └── micro-manager.js              # 微前端管理脚本
├── orval.micro.config.ts             # Orval 配置：用于生成 api/generated/
├── micro-config.json                 # 微应用注册配置（给主应用读取）
└── package.json                      # 根项目依赖（lerna/pnpm workspace 管理）
```

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装依赖

```bash
# 安装 pnpm（如果还没有安装）
npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 开发模式

```bash
# 启动微应用开发服务器
pnpm dev

# 或使用管理脚本启动
node scripts/micro-manager.js dev
```

### 构建项目

```bash
# # qiankun微应用方式构建
pnpm build

# 微应用单独构建访问（用于独立部署而非微前端集成）
pnpm build:standalone

# 或使用管理脚本构建
node scripts/micro-manager.js build
```

### 预览构建结果

```bash
# 预览构建后的应用
pnpm preview

# 或使用管理脚本预览
node scripts/micro-manager.js preview
```

### 代码检查和格式化

```bash
# 运行 ESLint 检查
pnpm lint

# 自动修复 ESLint 问题
pnpm lint:fix

# TypeScript 类型检查
pnpm type-check
```

### API 同步和生成

```bash
# 同步后端 OpenAPI 规范
pnpm sync:api

# 生成 API 客户端代码
pnpm generate:api
```

## 应用访问

- **微应用**: http://localhost:8081

## 技术栈

### 前端框架

- Vue 3 - 渐进式 JavaScript 框架
- TypeScript - JavaScript 的超集
- Vite - 下一代前端构建工具

### 微前端

- Qiankun - 基于 single-spa 的微前端实现库
- vite-plugin-qiankun - Vite 的 Qiankun 插件

### UI 组件库

- Ant Design Vue - 企业级 UI 设计语言和组件库
- Less - CSS 预处理器

### 状态管理

- Pinia - Vue 的状态管理库

### 路由

- Vue Router - Vue.js 官方路由管理器

### HTTP 客户端

- Axios - 基于 Promise 的 HTTP 库
- vue-hooks-plus - Vue 3 的 React hooks 风格工具库

### 开发工具

- ESLint - 代码质量检查工具
- Prettier - 代码格式化工具
- TypeScript - 静态类型检查
- Orval - OpenAPI 客户端生成器

### 包管理

- pnpm - 快速、节省磁盘空间的包管理器
- pnpm workspace - Monorepo 工作区管理

## 开发指南

### 集成到主应用

1. 在主应用中注册该微应用
2. 配置微应用的路由规则
3. 确保共享依赖的一致性
4. 设置正确的 publicPath 和 entry

### 环境变量配置

在 `packages/` 目录下创建 `.env` 文件：

```bash
# .env.development
VITE_API_BASE_URL = http://localhost:8081
VITE_APP_TITLE = 数据中台微应用 - 开发环境

# .env.production
VITE_API_BASE_URL = ''
VITE_APP_TITLE=数据中台微应用 - 生产环境
```

### API 接口开发

1. 配置后端 OpenAPI 规范 URL (在 `scripts/sync-openapi.js` 中)
2. 运行 `pnpm generate:api` 同步并生成客户端代码
3. 在组件中使用生成的 API 函数

```typescript
// 示例：使用生成的 API
// 方式1: 使用已实例化的API（推荐）
import { microappApi } from '@/api';
const response = await microappApi.getApiQualityIssueList({ page: 1, size: 10 });

// 方式2: 使用语义化的API（推荐）
import { qualityApi } from '@/api';
const issues = await qualityApi.getIssueList({ page: 1, size: 10 });

// 方式3: 使用工厂函数
import { getMicroappApi } from '@/api';
const api = getMicroappApi();
const data = await api().getApiQualityIssueList(params);
```

### API后期文件太大 > 300KB后 优化方案

```typescript
// 拆分 OpenAPI 文件
node scripts/split-openapi.js split

// 生成对应的 orval 配置
node scripts/split-openapi.js config

// 一键完成拆分和配置
node scripts/split-openapi.js all
```

## 部署

### 构建生产版本

```bash
pnpm build
```

### 部署到服务器

构建完成后，将 `packages/dist` 目录部署到对应的服务器路径。

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目基于 MIT 许可证开源 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

如有问题或建议，请提交 Issue 或联系项目维护者。

## 从模板创建微应用 (`scripts/create-microapp.mjs`)

推荐日常使用 [`@yss-ui/create`](https://github.com/iamyancong/yss-ui)（`npm create yss-app@latest`）。CLI 会从本仓库拉取模板并调用本脚本；也会把 skills 同步与结尾提示统一放在 CLI 侧处理。

直接在本仓库运行脚本时，常用参数见 `node scripts/create-microapp.mjs --help`。与 CLI 配合时额外支持：

| 参数 | 说明 |
| --- | --- |
| `--skip-skills` | 不在模板内同步 skills（由 `@yss-ui/create` 在生成后统一同步最新版） |
| `--no-summary` | 不打印 `Created microapp` / `Next steps`（由 CLI 输出「后续快速开始」） |

CLI 调用时会固定传入上述两个参数，并设置环境变量 `YSS_CREATE_DRIVER=cli`。不带这两个参数时，脚本行为与以前一致（模板内尝试同步 skills，并打印自己的下一步提示）。

## YSS UI 与 Skills 升级

- 模板已接入发布的 `@yss-ui/components@1.7.0` 同包 Vite 插件，业务继续根入口具名导入；普通、JSP、主题与独立构建共用版本检测适配器。
- 根目录安装依赖后执行 `pnpm sync:skills`，使用 `@yss-ui/skills-cli` 从 `@yss-ui/skills` 同步默认业务技能。不要安装旧的 `@yss/skills-cli`：它读取内网旧 Skills 包，会按旧清单删除国际化等较新技能。
- 同步后自动执行 `pnpm check:skills`，检查官方来源、关键技能、规则索引和 IDE 链接。`.agents/skills` 是发布包派生副本，不手工修改；提交钩子也不格式化这些副本。
- 通过 `@yss-ui/create` 创建的项目会在 CLI 侧自动同步最新 Skills；直接运行本脚本时仍可在模板内同步（除非传入 `--skip-skills`）。
- 根目录与 `packages` 各有独立依赖及 lockfile，升级后两处都需要安装；仅修改 `packages/package.json` 不会改变实际安装版本。
