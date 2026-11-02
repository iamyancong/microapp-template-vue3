#!/usr/bin/env node
/**
 * 全量质量门禁脚本（跨平台支持 Windows / macOS / Linux）
 * 1. 显式开启 ESLINT_CYCLE_CHECK=true 执行全量无缓存 ESLint（含完整深度循环依赖检查）
 * 2. 执行全量 Prettier 格式检查（format:check）
 * 3. 执行全量 TypeScript 类型检查（vue-tsc --noEmit）
 */

import { spawn } from 'node:child_process';

const isWin = process.platform === 'win32';

/**
 * 以子进程方式执行命令并透传终端输出。
 *
 * @param {string} command 可执行命令
 * @param {string[]} args 参数数组
 * @param {Record<string, string>} [extraEnv={}] 附加环境变量
 * @returns {Promise<void>}
 */
function runStep(command, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: isWin,
      env: { ...process.env, ...extraEnv },
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        process.exit(code ?? (signal ? 130 : 1));
      }
    });
  });
}

async function main() {
  console.log('🔍 [Verify 1/3] 正在执行全量 ESLint 检查（含循环依赖分析 ESLINT_CYCLE_CHECK=true）...');
  await runStep('pnpm', ['run', 'lint:check'], { ESLINT_CYCLE_CHECK: 'true' });

  console.log('🎨 [Verify 2/3] 正在执行全量 Prettier 格式检查（format:check）...');
  await runStep('pnpm', ['run', 'format:check']);

  console.log('🛡️ [Verify 3/3] 正在执行全量 TypeScript 类型检查（vue-tsc --noEmit）...');
  await runStep('pnpm', ['run', 'type-check']);

  console.log('✅ [Verify] 全量 Lint（含循环依赖）、格式与类型检查全部通过！');
}

main().catch(error => {
  console.error('❌ [Verify] 执行异常:', error);
  process.exit(1);
});
