/**
 * English language pack aggregator
 *
 * Architecture rules:
 * 1. Automatically scans en-US directory via Vite import.meta.glob;
 * 2. New modules created under en-US/ will be loaded automatically under messages.[moduleName];
 * 3. common.ts contents are flattened onto root namespace;
 * 4. Maintain structural and placeholder symmetry with zh-CN.
 */
const modules = import.meta.glob<Record<string, any>>('./en-US/*.ts', { eager: true });

const messages: Record<string, any> = {};

for (const [path, mod] of Object.entries(modules)) {
  const content = mod?.default ?? mod;
  const match = path.match(/\/en-US\/(.+)\.ts$/);
  if (!match) continue;

  const moduleName = match[1];

  if (moduleName === 'common') {
    Object.assign(messages, content);
  } else {
    messages[moduleName] = content;
  }
}

export default messages;
