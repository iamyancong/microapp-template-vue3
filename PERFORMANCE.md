# 微应用加载性能与兼容性

## 统计口径

以生产构建、首次打开默认 `/table` 页面为基线。raw 是资源原始字节，gzip/Brotli 是离线压缩估算，均不等于部署服务器实际传输量。开发模式保留未压缩依赖和调试模块，不能使用生产 4 MB 标准验收。本文 MB = 1,000,000 bytes。

构建账单读取 Vite manifest，覆盖 HTML、启动动态块 App/router、默认 Demo 页面及其静态 JS/CSS/图片依赖，并对重复文件去重。独立构建另计 MainLayout。新增或替换默认业务页后，必须更新 `packages/package.json` 的 `--entry` 参数；账单无法推断运行时按条件导入的所有功能，仍需浏览器验收。

## 当前架构

- 页面保留 `import { YTable, YCard } from '@yss-ui/components'`，Antd、图标与工具在使用位置精确导入。
- 安装旧版组件库时，由 `yssComponentsIsolation.ts` / `yssDevOptimizer.ts` 保持原隔离与预构建流程。
- `virtual:yss-heavy-components` 保留向后兼容。自组件库 `@yss-ui/components@1.6.6` 起，Monaco / ECharts 重型依赖已在底层全面异步化并提供官方子路径（`@yss-ui/components/monaco`、`@yss-ui/components/echarts`），Monaco 样式亦改为动态按需注入。普通业务页面天然不再加载重型引擎，无需黑魔法即可保持轻量首屏。
- `MainLayout` 只在独立布局需要时加载；Antd 不再按整个包强行合并到启动块。
- Less 变量采用 reference 导入，`:root` 默认主题只注入一次；运行时同步 RGB Token，避免使用 Chrome 90 不支持的 color-mix。
- `qiankunCssReuse.ts` 识别 import-html-entry 已内联且仍生效的同 URL CSS，避免 Vite 重复下载。没有匹配、样式禁用或已经卸载时，保留原加载流程。Vite helper 格式变化会使构建失败，要求复核此适配。
- 脚手架默认沿用模板依赖版本和锁文件；只有显式 `--latest-deps` 才更新依赖及锁文件。生成结果不复制 `.codegraph`、构建产物和阶段规划文件。
- 普通与独立部署保留 Chrome 90 构建目标。JSP/主题 JSP 本轮没有新增改造，也未列入本轮回归。

## 2026-09-10 实测

| 场景                                          |       raw | gzip 估算 | Brotli 估算 |
| --------------------------------------------- | --------: | --------: | ----------: |
| 当前已发布库 + 默认页构建闭包                 | 3,512,440 |   984,272 |     855,118 |
| 当前已发布库 + 独立布局完整闭包               | 3,547,427 |   997,682 |     867,613 |
| 未发布模块入口实验 + 默认页（CSS 去重适配前） | 3,604,879 | 1,016,399 |     881,289 |

新模块入口目前主要改善组件边界和可维护性，没有显著缩小同时使用 YTable 与 YFormily 的复杂页。公共样式、Formily 控件注册和表格实现仍是成本；不能通过删除组件 API 或破坏旧全量入口来换取账面体积。

主应用和微应用一起运行时，还需计入约 1.15–1.20 MB 的门户框架。真实 qiankun 组合测试确认公共 CSS 曾重复下载约 668 KB，修复后当前已发布库组合页面约 4.69–4.74 MB，仍没有达到合计 raw 4 MB。压缩估算不能当作已经启用 Content-Encoding 的证据。

本轮生产浏览器回归使用本机 Chrome 152、模拟登录/API、本地静态服务，阻止外部 HTTPS 头像等请求；不是实际 Chrome 90 引擎、真实后端或完整生产部署验收。资源统计不包括操作后才打开的重型功能。三分支认证和首页配置分别保留。另在国寿宿主验证旧库及新入口两种组合退出至 404 再返回：表格恢复可见，运行时错误为零；此次发现并修复了主应用复用已销毁容器的旧 mounted 实例问题。

## 验证命令

```sh
pnpm type-check
pnpm test:performance
pnpm build
pnpm build:standalone
python3 scripts/check-page-loading.py --url http://localhost:8081/table --assert-dev-isolation
```

浏览器脚本依赖 Python Playwright 与本机 Chrome。可通过 `--timeout-ms` 调整测试等待上限；该参数不是性能目标。脚本检查真实表格 DOM、运行时异常、公开导出与 locale 单例；`--max-mb` 和 `--max-requests` 必须按开发/生产分别设置。

部署后再检查 Network 中的 transferred、Content-Encoding、入口 HTML 与资产原子发布、首次进入和退出后重新进入页面。构建生成 `.gz/.br` 不代表 Nginx 已经实际使用；Brotli 仍取决于部署镜像模块能力。

## 发布边界

模板现已升级至已发布的 components 1.7.0，开发与生产自动启用同包官方插件；旧安装包仍保留兼容路径。旧根入口、全量安装、CSS 路径和组件 API 保留；旧全量安装写法升级后可以继续使用，但不会自动获得按页面裁剪的收益。组件库真实 tarball 的旧入口、新入口、类型和浏览器构建均已通过消费验证。

## 根入口方案修正与验收

业务统一保持：

```ts
import { YCard, YTable, YFormily } from '@yss-ui/components';
```

组件库公开 exports/module/main 已指向按组件拆分的根入口；全量安装独立成模块，避免只用 YCard 也引入 VXE。已移除未发布的 modular/light 方案和模板业务 import 改写。旧 dist/index 等内部文件继续保留供历史插件使用。

不带任何模板隔离/导入插件的真实 tarball 消费者，对同一份 YCard + YTable + YFormily 页面和完整 CSS 做新旧构建对照：传统根入口 4,736,765 bytes raw / 1,375,495 gzip，优化根入口 3,338,158 raw / 912,468 gzip。该数据是独立消费者基准，不是上文包含主应用的业务组合页，也不是线上实际传输量。gzip 为离线估算。

静态图验证：表格/表单页无 Monaco、ECharts、Univer；只引用 YCard 的 JS 图还不包含 Formily/VXE。浏览器实际渲染、root/lite 身份、语言单例、历史表单别名与 app.use 全量安装通过。模板当前安装的旧包和模拟升级的新包分别构建通过；旧隔离插件读取传统文件的兼容构建也通过。

## 同包官方插件接入（已发布 components 1.7.0）

模板普通、JSP 和主题构建统一使用 `createYssUiPlugin`。组件包公开 `./vite` 时自动采用官方实现；尚未升级的安装包仍走旧兼容路径。旧解析文件只用于旧版本，不与官方插件同时运行。模板依赖现为 ^1.7.0，必须实际安装后核对公开 ./vite 入口，不能只修改 package.json。

业务仍采用 `import { YButton, YTable, YFormily } from '@yss-ui/components'`，无需新增功能包或手动维护样式清单。子路径不减少安装树。AI 生成前先查 MCP `get_consumption_contract`，确认精确安装版本与 exports。

## 2026-09-15 发布包接入复核

- 实际安装 components 1.7.0、Vite 6.0.5；普通、JSP、主题与 standalone 四种构建及 gzip/Brotli 产物检查通过，预算未放宽。
- 普通默认页账单：2,867,883 bytes raw / 877,618 gzip / 765,702 Brotli；standalone：2,903,122 raw / 891,172 gzip / 778,251 Brotli。两者页面闭包不同，不作为同条件性能对比。
- 浏览器开发模式确认为 official，公开导出缺失为 0，locale 单例共享；开发 85 个请求、11.342 MB decodedBodySize，standalone preview 30 个请求、2.930 MB decodedBodySize，运行时错误均为 0。上述是资源解码量，不是网络传输量；使用本机 Chrome 与模拟 API，不是 Chrome 90 或真实后端验收。
- Skills 由 @yss-ui/skills-cli 1.0.13 同步公开 @yss-ui/skills 1.5.0：29 个默认业务技能、49 个文件与发布包逐字节一致，重复同步无漂移；国际化缺失的反向用例能被校验阻止。
- 项目仍有既存的 TypeScript 6 与部分上游声明 peer 范围、Formily Vue 2 peer 警告；本轮项目 type-check 通过，不代表所有上游 peer 契约均已兼容。
