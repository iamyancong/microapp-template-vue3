#!/usr/bin/env node

/**
 * 将 Orval axios single 模式生成的 getApi() 工厂函数扁平化为顶层具名导出。
 *
 * 转换前（每次 getApi() 都会重新创建数百个闭包）:
 *   export const getApi = () => {
 *     const page = (...) => customInstance(...);
 *     return { page, ... };
 *   };
 *
 * 转换后（函数只创建一次，getApi 仅返回引用对象）:
 *   export const page = (...) => customInstance(...);
 *   export const getApi = () => ({ page, ... });
 */

const fs = require('fs');
const path = require('path');

const API_INDEX = path.resolve(__dirname, '../packages/src/api/generated/quality/index.ts');
const GET_API_MARKER = 'export const getApi = () => {';

/**
 * 去掉行首固定数量的空格（用于将 getApi 内部缩进还原为模块级缩进）。
 *
 * @param {string} line
 * @param {number} spaces
 * @returns {string}
 */
const dedentLine = (line, spaces) => {
  if (!line.startsWith(' '.repeat(spaces))) {
    return line;
  }

  return line.slice(spaces);
};

/**
 * 扁平化 getApi 工厂为顶层导出。
 *
 * @param {string} content
 * @returns {string}
 */
const flattenGetApi = (content) => {
  const getApiStart = content.indexOf(GET_API_MARKER);
  if (getApiStart === -1) {
    console.log('[api-flatten] getApi factory not found, skip.');
    return content;
  }

  // 已扁平化：顶层存在 export const xxx =，且 getApi 为箭头返回对象
  if (/export const \w+ = \([^)]*\) => \{[\s\S]*?return customInstance/m.test(content.slice(0, getApiStart))) {
    console.log('[api-flatten] already flattened, skip.');
    return content;
  }

  const before = content.slice(0, getApiStart);
  const afterGetApiStart = content.slice(getApiStart + GET_API_MARKER.length);

  const returnIndex = afterGetApiStart.indexOf('\n  return {');
  if (returnIndex === -1) {
    throw new Error('[api-flatten] return block not found inside getApi');
  }

  const functionsBlock = afterGetApiStart.slice(0, returnIndex);
  const returnAndClose = afterGetApiStart.slice(returnIndex);

  const returnCloseIndex = returnAndClose.lastIndexOf('\n  };');
  if (returnCloseIndex === -1) {
    throw new Error('[api-flatten] return block closing not found');
  }

  const returnBlock = returnAndClose.slice(0, returnCloseIndex + '\n  };'.length);
  const afterGetApi = returnAndClose.slice(returnCloseIndex + '\n  };'.length).replace(/^\n\};\n?/, '\n');

  const functionLines = functionsBlock.split('\n').map(line => {
    if (line.startsWith('  const ')) {
      return line.replace(/^  const /, 'export const ');
    }

    return dedentLine(line, 2);
  });

  const returnBodyMatch = returnBlock.match(/\n  return \{([\s\S]*)\n  \};/);
  if (!returnBodyMatch) {
    throw new Error('[api-flatten] unable to parse return members from getApi');
  }

  const returnLines = `export const getApi = () => ({${returnBodyMatch[1]}\n});`;

  const flattened = `${before}${functionLines.join('\n')}\n${returnLines}${afterGetApi}`;

  const withFnTypes = flattened.replace(
    /ReturnType<ReturnType<typeof getApi>\['([^']+)'\]>/g,
    'ReturnType<typeof $1>'
  );

  return resolveResultTypeConflicts(withFnTypes);
};

/**
 * 若 Result 类型名与 schemas 导入重名，则重命名为 {Name}ApiResult，避免与 DTO 冲突。
 *
 * @param {string} content
 * @returns {string}
 */
const resolveResultTypeConflicts = (content) => {
  const importBlockMatch = content.match(/import type \{([\s\S]*?)\} from '\.\/schemas';/);
  if (!importBlockMatch) {
    return content;
  }

  const importedTypes = new Set(
    importBlockMatch[1]
      .split(',')
      .map(item => item.trim().split(/\s+as\s+/)[0].trim())
      .filter(Boolean)
  );

  return content.replace(
    /^export type (\w+) = NonNullable<Awaited<ReturnType<typeof (\w+)>>>;$/gm,
    (line, typeName, fnName) => {
      if (!importedTypes.has(typeName)) {
        return line;
      }

      return `export type ${typeName}ApiResult = NonNullable<Awaited<ReturnType<typeof ${fnName}>>>;`;
    }
  );
};

const main = () => {
  if (!fs.existsSync(API_INDEX)) {
    console.log('[api-flatten] API index not found:', API_INDEX);
    process.exit(0);
  }

  const original = fs.readFileSync(API_INDEX, 'utf8');
  const flattened = flattenGetApi(original);

  if (flattened === original) {
    return;
  }

  fs.writeFileSync(API_INDEX, flattened, 'utf8');
  console.log('[api-flatten] flattened getApi exports in', API_INDEX);
};

main();
