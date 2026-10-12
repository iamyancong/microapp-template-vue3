# 0001. 统一接入 YSS UI 官方 Vite 构建插件

## 状态

已接受 (Accepted) — 2026-09

## 背景

此前微应用模版针对 YSS UI 的组件隔离与预构建依赖本地自定义的适配器（`yssComponentsIsolation.ts` / `yssDevOptimizer.ts`）。随着 `@yss-ui/components` 升级至 1.7.0+，官方正式提供了 `@yss-ui/components/vite` 插件机制，原生支持按组件自动裁剪、动态注入依赖样式与重型引擎异步化。

## 决策

1. 所有微应用构建配置统一通过 `createYssUiPlugin` 接入官方插件。
2. 安装包公开 `@yss-ui/components/vite` 时优先使用官方插件；旧版（1.6.6/1.6.7）继续保留历史隔离兼容，不直接向浏览器分发未优化的重型模块。
3. 业务层统一使用根入口具名导入：`import { YTable, YCard, YFormily } from '@yss-ui/components'`，禁止改写为非常规内部路径。
4. 官方插件负责按需关联 JS/CSS，`main.ts` 中的全局样式导入由插件在官方模式下转换。

## 影响

- 减少了模版内黑盒适配脚本的维护负担。
- 业务代码无需侵入式改写导入路径即可享受构建体积裁剪。
- 需保持 `pnpm test:performance` 对入口与样式复用做持续自动化守护。
