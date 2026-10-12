import assert from 'node:assert/strict';
import { readFile, realpath, access } from 'node:fs/promises';
import { resolve } from 'node:path';

/** 校验同步来源、关键业务技能及受版本控制的 IDE 投影，阻止旧源静默删减技能。 */
const root = resolve(process.argv[2] ?? '.');
const primary = resolve(root, '.agents/skills');
const manifest = JSON.parse(await readFile(resolve(primary, '.yss-skills-manifest.json'), 'utf8'));
assert.equal(manifest.source, '@yss-ui/skills', 'Skills 来源不是当前官方发布包，请升级 @yss-ui/skills-cli');
const skills = new Set(manifest.skills);
for (const name of [
  'i18n-locale-management',
  'use-polling-task',
  'use-url-state',
  'ycondition-builder-usage',
  'yfile-import-usage',
  'ysheet-usage',
  'component-selection-imports',
  'yss-ui-business-page-generation',
]) {
  assert.ok(skills.has(name), `同步清单缺少业务技能 ${name}`);
}
for (const name of ['release-workflow', 'component-development', 'skill-development', 'sync-internal-dev']) {
  assert.ok(!skills.has(name), `模板不应默认同步组件库维护技能 ${name}`);
}
const rules = await readFile(resolve(root, '.agents/rules/yss-ai-skills.md'), 'utf8');
for (const name of skills) {
  await access(resolve(primary, name, 'SKILL.md'));
  assert.ok(rules.includes(`.agents/skills/${name}/SKILL.md`), `规则索引遗漏 ${name}`);
  for (const directory of ['.agent/skills', '.claude/skills']) {
    assert.equal(
      await realpath(resolve(root, directory, name)),
      await realpath(resolve(primary, name)),
      `${directory}/${name} 没有指向主目录`
    );
  }
}
console.log(`Skills 来源、${skills.size} 个业务技能、规则索引与 IDE 链接校验通过。`);
