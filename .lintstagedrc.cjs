const path = require('node:path');

/**
 * 忽略自动生成及外部 AI 技能托管目录中的文件。
 * 注意：lint-staged 顶层配置对象不支持 `ignore` 键（会被当成文件名 glob），
 * 因此在任务函数内显式过滤，确保命中忽略规则的文件不会启动任何子进程。
 */
const IGNORED_PREFIXES = [
  'packages/src/api/generated/',
  '.agents/',
  '.agent/',
  '.cursor/',
  '.claude/',
  '.trae/',
  '.codex/',
];

const IGNORED_FILES = new Set(['.cursorrules']);

/**
 * 将 lint-staged 传入的绝对路径列表转换为相对路径，并剔除忽略目录中的文件。
 *
 * @param {string[]} filenames lint-staged 传入的暂存区文件绝对路径
 * @returns {string[]} 过滤并加引号转义后的相对路径参数数组
 */
function filterAndQuoteFiles(filenames) {
  const repoRoot = __dirname;
  const cwd = process.cwd();
  return filenames
    .filter(file => {
      const relFromRoot = path.relative(repoRoot, file).split(path.sep).join('/');
      if (!relFromRoot || relFromRoot.startsWith('..')) return false;
      if (IGNORED_FILES.has(relFromRoot)) return false;
      return !IGNORED_PREFIXES.some(prefix => relFromRoot === prefix || relFromRoot.startsWith(prefix));
    })
    .map(file => JSON.stringify(path.relative(cwd, file).split(path.sep).join('/')));
}

const ESLINT_CMD = 'eslint --fix --cache --cache-location node_modules/.cache/eslint/';
const PRETTIER_CMD = 'prettier --write --ignore-unknown --cache --cache-location node_modules/.cache/prettier/.prettier-cache';

/**
 * 生成先执行 ESLint 再执行 Prettier 的任务命令。
 * 以点开头的配置文件（如 .eslintrc.cjs、.lintstagedrc.cjs）跳过 ESLint，避免默认忽略警告噪音，仅执行 Prettier。
 *
 * @param {string[]} filenames 暂存区匹配文件列表
 * @returns {string[]} 待执行的命令数组
 */
const lintAndFormat = filenames => {
  const prettierTargets = filterAndQuoteFiles(filenames);
  if (prettierTargets.length === 0) return [];
  const eslintTargets = filterAndQuoteFiles(
    filenames.filter(file => !path.basename(file).startsWith('.'))
  );
  const commands = [];
  if (eslintTargets.length > 0) {
    commands.push(`${ESLINT_CMD} ${eslintTargets.join(' ')}`);
  }
  commands.push(`${PRETTIER_CMD} ${prettierTargets.join(' ')}`);
  return commands;
};

/**
 * 生成仅执行 Prettier 格式化的任务命令。
 *
 * @param {string[]} filenames 暂存区匹配文件列表
 * @returns {string[]} 待执行的命令数组
 */
const formatOnly = filenames => {
  const targets = filterAndQuoteFiles(filenames);
  if (targets.length === 0) return [];
  return [`${PRETTIER_CMD} ${targets.join(' ')}`];
};

module.exports = {
  // Vue 文件处理
  '*.vue': lintAndFormat,

  // TypeScript / JavaScript 文件处理（含 ESM / CommonJS 脚本）
  '*.{js,jsx,ts,tsx,mjs,cjs}': lintAndFormat,

  // 样式文件处理
  '*.{css,less,scss,sass}': formatOnly,

  // JSON 文件处理
  '*.{json,jsonc}': formatOnly,

  // Markdown 文件处理
  '*.md': formatOnly,

  // YAML 文件处理
  '*.{yml,yaml}': formatOnly,
};
