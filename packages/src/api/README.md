# API 模块化架构说明

## 📁 目录结构

```
packages/src/api/
├── generated/                 # 自动生成的API文件
│   ├── microapp/             # 微应用相关API
│   │   ├── index.ts          # 微应用API主文件
│   │   └── schemas/          # 微应用类型定义
│   ├── weiwai/              # 委外相关API
│   │   ├── index.ts          # 委外API主文件
│   │   └── schemas/          # 委外类型定义
│   └── common/              # 通用API（如有）
├── modules/                 # 业务模块封装
│   ├── call.ts           # 数据质量业务API
│   ├── lineage.ts           # 数据血缘业务API
│   └── outsourced.ts        # 委外业务API
├── mutator.ts              # Axios实例配置
├── index.ts                # 统一导出入口
└── README.md               # 本文件
```

## 🚀 使用方法

### 1. 推荐使用方式（具名 API 函数，tree-shaking 友好）

```typescript
import { pageQaDataSrcManagers, addQaDataSrcManager } from '@/api';
import type { QaDataSrcManagerPage } from '@/api/generated/quality/schemas';

const query: QaDataSrcManagerPage = { pageIndex: 1, pageSize: 20 };
const page = await pageQaDataSrcManagers(query);
await addQaDataSrcManager({ /* ... */ });
```

生成命令：`pnpm generate:api`（Orval → schema 清理 → **api-flatten-exports** → prettier）。

### 2. 兼容方式（不推荐新代码使用）

```typescript
import { getApi } from '@/api';

// getApi 仅返回已提升的具名函数引用，不再重复创建闭包
const api = getApi();
const page = await api.pageQaDataSrcManagers({ pageIndex: 1, pageSize: 20 });
```

### 3. 类型安全

```typescript
import type { QualityApiInterface, LineageApiInterface, OutsourcedApiInterface } from '@/api';

// 所有API都有完整的TypeScript类型支持
```

## 🛠 开发流程

### 1. API更新流程

```bash
# 1. 同步API文档
pnpm sync:api

# 2. 生成API代码
pnpm gen:api

# 3. 更新业务模块（如果需要）
# 编辑 modules/ 目录下的文件
```

### 2. 配置管理

- **API端点配置**: `scripts/sync-openapi.js` 中的 `API_ENDPOINTS`
- **代码生成配置**: `orval.config.ts`
- **业务模块配置**: `modules/` 目录下的各个文件

## 📋 配置说明

### API端点配置

```javascript
// scripts/sync-openapi.js
const API_ENDPOINTS = {
  microapp: {
    url: 'http://example.com/microapp-api',
    output: 'openapi/microapp.json',
    description: '微应用 API',
  },
  weiwai: {
    url: 'http://example.com/weiwai-api',
    output: 'openapi/weiwai.json',
    description: '委外 API',
  },
};
```

### Orval代码生成配置

```typescript
// orval.config.ts
export default defineConfig({
  microapp: {
    input: { target: './openapi/microapp.json' },
    output: {
      target: './packages/src/api/generated/microapp/index.ts',
      schemas: './packages/src/api/generated/microapp/schemas',
    },
  },
  weiwai: {
    input: { target: './openapi/weiwai.json' },
    output: {
      target: './packages/src/api/generated/weiwai/index.ts',
      schemas: './packages/src/api/generated/weiwai/schemas',
    },
  },
});
```

## ✅ 优势

1. **模块化分离**: 不同业务的API分开管理，避免单个巨大文件
2. **类型安全**: 完整的TypeScript类型支持
3. **语义化**: 业务模块提供更友好的方法名
4. **可维护性**: 清晰的目录结构和职责分离
5. **向后兼容**: 保留了对现有代码的兼容

## 🔄 迁移指南

### 从旧版本迁移

```typescript
// 旧方式
import { qualityApi } from '@/api';
qualityApi.getIssueList();

// 新方式（推荐）
import { qualityApi } from '@/api';
qualityApi.getIssueList();

// 或者使用原始API
import { get } from '@/api/generated/microapp';
const api = get();
api.getApiQualityIssueList();
```

## 🚨 注意事项

1. **不要手动编辑** `generated/` 目录下的文件，它们会被自动覆盖
2. **业务逻辑** 应该放在 `modules/` 目录下
3. **API更新** 后需要检查并更新对应的业务模块
4. **类型导入** 优先使用模块化的类型定义
