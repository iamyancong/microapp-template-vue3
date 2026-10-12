import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, posix, relative, resolve } from 'node:path';

const COMPRESSIBLE_EXTENSIONS = new Set(['.css', '.html', '.js', '.json', '.mjs', '.svg', '.txt', '.wasm', '.xml']);
const HEAVY_RUNTIME_MARKERS = [/monaco/i, /echarts/i, /@univerjs/i, /\buniver\b/i, /YMonaco/, /YSheet/, /YEcharts/];

/**
 * 递归收集构建目录中的文件。
 * @param directory 构建目录
 * @returns 文件路径列表
 */
const collectFiles = async directory => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(filePath)));
    } else if (entry.isFile()) {
      files.push(filePath);
    }
  }

  return files;
};

/**
 * 转义正则表达式中的特殊字符。
 * @param value 待转义文本
 * @returns 转义后的文本
 */
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * 获取最近生成的 JSP 主题构建目录。
 * @returns 最近更新的主题构建目录
 */
const resolveLatestJspThemeDirectory = async () => {
  const entries = await readdir(process.cwd(), { withFileTypes: true });
  const candidates = await Promise.all(
    entries
      .filter(entry => entry.isDirectory() && entry.name.startsWith('dist-jsp-'))
      .map(async entry => {
        const directory = join(process.cwd(), entry.name);
        const metadata = await stat(directory);
        return { directory, mtimeMs: metadata.mtimeMs };
      })
  );
  const latest = candidates.sort((left, right) => right.mtimeMs - left.mtimeMs)[0];
  if (!latest) throw new Error('未找到 dist-jsp-* 主题构建目录');
  return latest.directory;
};

/**
 * 读取构建目录并建立相对路径索引。
 * @param buildDirectory 构建目录
 * @returns 构建产物索引
 */
const readBuildAssets = async buildDirectory => {
  const root = resolve(buildDirectory);
  const filePaths = await collectFiles(root);
  const files = new Map();

  await Promise.all(
    filePaths.map(async filePath => {
      const relativePath = relative(root, filePath).split('/').join(posix.sep);
      const metadata = await stat(filePath);
      const extension = extname(relativePath).toLowerCase();
      const text = extension === '.js' || extension === '.html' ? await readFile(filePath, 'utf8') : undefined;
      files.set(relativePath, { filePath, relativePath, size: metadata.size, extension, text });
    })
  );

  return { root, files };
};

/**
 * 从 HTML 中提取资源引用。
 * @param html HTML 内容
 * @returns 资源 URL 列表
 */
const extractHtmlReferences = html => {
  const references = [];
  const attributePattern = /(?:src|href)=["']([^"']+\.(?:css|js)(?:\?[^"']*)?)["']/gi;
  const importPattern = /import\(\s*["']([^"']+\.js(?:\?[^"']*)?)["']\s*\)/gi;

  for (const pattern of [attributePattern, importPattern]) {
    for (const match of html.matchAll(pattern)) {
      references.push(match[1]);
    }
  }

  return references;
};

/**
 * 将 HTML 或模块中的相对 URL 解析为构建产物路径。
 * @param reference 资源引用
 * @param importerPath 引用方路径
 * @param files 构建产物索引
 * @returns 构建产物相对路径
 */
const resolveAssetPath = (reference, importerPath, files) => {
  const cleanReference = reference.split(/[?#]/, 1)[0];
  const candidates = [];

  if (cleanReference.startsWith('.')) {
    candidates.push(posix.normalize(posix.join(posix.dirname(importerPath), cleanReference)));
  } else {
    candidates.push(cleanReference.replace(/^\/+/, ''));
  }

  for (const candidate of candidates) {
    if (files.has(candidate)) return candidate;
    for (const filePath of files.keys()) {
      if (candidate.endsWith(filePath)) return filePath;
    }
  }

  return undefined;
};

/**
 * 提取 JavaScript 的静态模块依赖。
 * @param source JavaScript 内容
 * @returns 静态模块引用列表
 */
const extractStaticImports = source => {
  const imports = [];
  const pattern = /\bfrom\s*["']([^"']+\.js(?:\?[^"']*)?)["']|\bimport\s*["']([^"']+\.js(?:\?[^"']*)?)["']/g;

  for (const match of source.matchAll(pattern)) {
    imports.push(match[1] || match[2]);
  }

  return imports;
};

/**
 * 收集 JavaScript 的静态 import 闭包。
 * @param startPaths 起始模块
 * @param assets 构建产物索引
 * @returns 静态依赖模块路径集合
 */
const collectStaticJsClosure = (startPaths, assets) => {
  const closure = new Set();
  const pending = [...startPaths];

  while (pending.length > 0) {
    const currentPath = pending.pop();
    if (!currentPath || closure.has(currentPath)) continue;
    const asset = assets.files.get(currentPath);
    if (!asset || asset.extension !== '.js') continue;

    closure.add(currentPath);
    for (const reference of extractStaticImports(asset.text || '')) {
      const dependencyPath = resolveAssetPath(reference, currentPath, assets.files);
      if (dependencyPath && !closure.has(dependencyPath)) pending.push(dependencyPath);
    }
  }

  return closure;
};

/**
 * 读取 Vite 动态导入依赖表。
 * @param source JavaScript 内容
 * @returns Vite 依赖表中的资源路径
 */
const extractViteDependencyMap = source => {
  const definition = source.match(/m\.f\s*\|\|\s*\(m\.f\s*=\s*\[([^\]]+)\]\)/);
  if (!definition) return [];

  return [...definition[1].matchAll(/["']([^"']+)["']/g)].map(match => match[1]);
};

/**
 * 从根路由重定向中解析默认页面，允许脚手架生成项目替换示例路由。
 * @param assets 构建产物索引
 * @returns 默认路由路径
 */
const resolveDefaultRoutePath = assets => {
  const redirectPattern = /path\s*:\s*["']\/["']\s*,\s*redirect\s*:\s*["']([^"']+)["']/;
  for (const asset of assets.files.values()) {
    if (asset.extension !== '.js' || !asset.text) continue;
    const match = asset.text.match(redirectPattern);
    if (match) return match[1];
  }

  throw new Error('未解析到根路由默认页面，请通过 DEFAULT_ROUTE_PATH 或命令行参数指定');
};

/**
 * 解析默认路由对应的动态依赖闭包。
 * @param routePath 默认路由路径
 * @param assets 构建产物索引
 * @returns 默认路由资源集合和路由所在模块
 */
const resolveDefaultRouteAssets = (routePath, assets) => {
  const routePattern = new RegExp(
    `path\\s*:\\s*["']${escapeRegExp(routePath)}["'][\\s\\S]{0,1200}?import\\(\\s*["']([^"']+\\.js)["']\\s*\\)[\\s\\S]{0,240}?__vite__mapDeps\\s*\\(\\s*\\[([^\\]]*)\\]`,
    'm'
  );

  for (const asset of assets.files.values()) {
    if (asset.extension !== '.js' || !asset.text) continue;
    const match = asset.text.match(routePattern);
    if (!match) continue;

    const dependencyMap = extractViteDependencyMap(asset.text);
    const dependencyIndexes = [...match[2].matchAll(/\d+/g)].map(item => Number.parseInt(item[0], 10));
    const routeAssets = new Set();
    const routeModule = resolveAssetPath(match[1], asset.relativePath, assets.files);
    if (routeModule) routeAssets.add(routeModule);

    for (const index of dependencyIndexes) {
      const dependencyPath = dependencyMap[index];
      if (!dependencyPath) continue;
      const resolvedPath = resolveAssetPath(dependencyPath, asset.relativePath, assets.files);
      if (resolvedPath) routeAssets.add(resolvedPath);
    }

    return { routeAssets, routeSource: asset.relativePath };
  }

  throw new Error(`未找到默认路由 ${routePath} 的 Vite 动态依赖记录`);
};

/**
 * 汇总资源原始体积及预压缩体积。
 * @param paths 资源路径集合
 * @param assets 构建产物索引
 * @returns 体积汇总
 */
const summarize = (paths, assets) => {
  const summary = { raw: 0, gzip: 0, brotli: 0 };
  for (const path of paths) {
    const asset = assets.files.get(path);
    if (!asset) continue;
    summary.raw += asset.size;
    summary.gzip += assets.files.get(`${path}.gz`)?.size || 0;
    summary.brotli += assets.files.get(`${path}.br`)?.size || 0;
  }
  return summary;
};

/**
 * 校验资源已生成 gzip 和 Brotli 预压缩文件。
 * @param paths 资源路径集合
 * @param assets 构建产物索引
 */
const assertPrecompressed = (paths, assets) => {
  const missing = [];
  for (const path of paths) {
    const asset = assets.files.get(path);
    if (!asset || asset.size < 1024 || !COMPRESSIBLE_EXTENSIONS.has(asset.extension)) continue;
    if (!assets.files.has(`${path}.gz`) || !assets.files.has(`${path}.br`)) missing.push(path);
  }

  if (missing.length > 0) {
    throw new Error(`以下首屏资源缺少 .gz/.br 预压缩文件：${missing.join(', ')}`);
  }
};

/**
 * 检查重型运行时依赖是否进入首屏或默认路由闭包。
 * @param paths 资源路径集合
 * @param assets 构建产物索引
 * @param options 是否将发现的问题作为构建错误
 * @returns 命中的资源路径
 */
const checkHeavyRuntime = (paths, assets, { strict = false } = {}) => {
  const violations = [];
  for (const path of paths) {
    const asset = assets.files.get(path);
    if (!asset || asset.extension !== '.js' || !asset.text) continue;
    // 词典命名空间 monaco/sheet 是纯数据，不能据此判定加载了引擎。
    // 仅剔除对象键，保留导入路径、函数、组件名等真实运行时代码特征。
    const runtimeText = asset.text.replace(/\b(monaco|sheet)\s*:/g, 'localeNamespace:');
    if (HEAVY_RUNTIME_MARKERS.some(marker => marker.test(runtimeText))) violations.push(path);
  }

  if (violations.length > 0 && strict) {
    throw new Error(`首屏静态依赖包含重型运行时依赖：${violations.join(', ')}`);
  }

  return violations;
};

/**
 * 格式化字节数。
 * @param bytes 字节数
 * @returns MB 文本
 */
const formatBytes = bytes => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

/**
 * 执行构建产物账单检查。
 */
const main = async () => {
  const buildArgument = process.argv[2] || 'dist';
  const buildDirectory = buildArgument === '--latest-jsp-theme'
    ? await resolveLatestJspThemeDirectory()
    : buildArgument;
  const assets = await readBuildAssets(buildDirectory);
  const routePath = process.argv[3] || process.env.DEFAULT_ROUTE_PATH || resolveDefaultRoutePath(assets);
  const htmlAsset = assets.files.get('index.html');
  if (!htmlAsset?.text) throw new Error(`${buildDirectory}/index.html 不存在`);

  const htmlReferences = extractHtmlReferences(htmlAsset.text);
  const referencedAssets = htmlReferences
    .map(reference => resolveAssetPath(reference, 'index.html', assets.files))
    .filter(Boolean);
  const entryJs = referencedAssets.filter(path => assets.files.get(path)?.extension === '.js');
  const entryStaticJs = collectStaticJsClosure(entryJs, assets);
  const entryAssets = new Set(referencedAssets);
  entryStaticJs.forEach(path => entryAssets.add(path));

  const { routeAssets, routeSource } = resolveDefaultRouteAssets(routePath, assets);
  const routeJs = [...routeAssets].filter(path => assets.files.get(path)?.extension === '.js');
  const defaultAssets = new Set(entryAssets);
  routeAssets.forEach(path => defaultAssets.add(path));
  collectStaticJsClosure(routeJs, assets).forEach(path => defaultAssets.add(path));

  assertPrecompressed(entryAssets, assets);
  assertPrecompressed(defaultAssets, assets);
  checkHeavyRuntime(entryAssets, assets, { strict: true });
  const defaultHeavyRuntime = checkHeavyRuntime(defaultAssets, assets);
  if (defaultHeavyRuntime.length > 0) {
    console.warn(`[build-check] 注意：默认路由闭包命中组件库产物中的重型运行时标识：${defaultHeavyRuntime.join(', ')}`);
  }

  const modulePreloadTags = [...htmlAsset.text.matchAll(/<link\b[^>]*>/gi)]
    .filter(match => /rel=["']modulepreload["']/i.test(match[0]))
    .map(match => match[0].match(/href=["']([^"']+)["']/i)?.[1])
    .filter(Boolean)
    .map(reference => resolveAssetPath(reference, 'index.html', assets.files))
    .filter(Boolean);

  const entrySummary = summarize(entryAssets, assets);
  const defaultSummary = summarize(defaultAssets, assets);
  console.log(`[build-check] 入口静态依赖：${formatBytes(entrySummary.raw)} raw / ${formatBytes(entrySummary.gzip)} gzip / ${formatBytes(entrySummary.brotli)} Brotli`);
  console.log(`[build-check] 默认路由 ${routePath}（${routeSource}）依赖闭包：${formatBytes(defaultSummary.raw)} raw / ${formatBytes(defaultSummary.gzip)} gzip / ${formatBytes(defaultSummary.brotli)} Brotli`);
  console.log(`[build-check] modulepreload：${modulePreloadTags.join(', ') || '无'}`);
  console.log(`[build-check] 通过：首屏压缩文件完整，首屏静态依赖未包含 Monaco/ECharts/Univer 重型运行时`);
};

await main();
