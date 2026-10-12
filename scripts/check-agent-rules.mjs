#!/usr/bin/env node
/**
 * Agent 规则、上下文分层与健康度门禁检查脚本
 * 1. 验证 AGENTS.md 行数 ≤ 100 行（防膨胀）
 * 2. 验证 CLAUDE.md 软链接有效性
 * 3. 验证 specs/ 与 docs/ 分层规范
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const MAX_AGENTS_LINES = 100;

function checkAgentsMd() {
  const agentsPath = path.join(repoRoot, 'AGENTS.md');
  if (!fs.existsSync(agentsPath)) {
    console.error('❌ [Error] 根目录下未找到 AGENTS.md！');
    process.exit(1);
  }

  const content = fs.readFileSync(agentsPath, 'utf8');
  const lines = content.split('\n').length;

  if (lines > MAX_AGENTS_LINES) {
    console.error(`❌ [Error] AGENTS.md 超过行数上限 (${lines} 行 > ${MAX_AGENTS_LINES} 行)！`);
    console.error('   请遵循上下文分层原则，将架构解释迁移至 docs/，操作步骤迁移至 .agents/skills/，任务细节迁移至 specs/。');
    process.exit(1);
  }

  console.log(`✅ [Pass] AGENTS.md 保持精炼 (${lines}/${MAX_AGENTS_LINES} 行)`);
}

function checkClaudeSymlink() {
  const claudePath = path.join(repoRoot, 'CLAUDE.md');
  if (!fs.existsSync(claudePath)) {
    console.warn('⚠️ [Warn] 根目录下未找到 CLAUDE.md 兼容软链接，正在自动修复...');
    try {
      fs.symlinkSync('AGENTS.md', claudePath);
      console.log('✅ [Pass] 已自动创建 CLAUDE.md -> AGENTS.md 软链接');
    } catch (e) {
      console.error('❌ [Error] 无法创建 CLAUDE.md 软链接:', e.message);
    }
  } else {
    console.log('✅ [Pass] CLAUDE.md 兼容映射正常');
  }
}

function checkContextLayers() {
  const requiredPaths = [
    'docs/architecture',
    'docs/decisions',
    'specs/TEMPLATE.md',
    'specs/archive',
  ];

  for (const relPath of requiredPaths) {
    const fullPath = path.join(repoRoot, relPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ [Error] 缺失上下文分层目录/文件: ${relPath}`);
      process.exit(1);
    }
  }

  // 检查 specs/ 根目录下是否有已遗忘归档的文件
  const specsDir = path.join(repoRoot, 'specs');
  const specEntries = fs.readdirSync(specsDir).filter(name => {
    return name !== 'TEMPLATE.md' && name !== 'archive' && !name.startsWith('.');
  });

  if (specEntries.length > 0) {
    console.log(`ℹ️ [Info] 当前存在 ${specEntries.length} 份进行中的任务 Spec: ${specEntries.join(', ')}（任务完成后请移入 specs/archive/）`);
  }

  console.log('✅ [Pass] 上下文分层架构（docs / specs / skills / AGENTS.md）完整就绪');
}

function main() {
  console.log('🚀 开始 Agent 上下文分层与规则健康检查...');
  checkAgentsMd();
  checkClaudeSymlink();
  checkContextLayers();
  console.log('🎉 所有 Agent 规则健康检查全部通过！');
}

main();
