#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 清理生成的 schema 文件中的泛型类型
function cleanupSchemas() {
  const schemasDir = './packages/src/api/generated/quality/schemas';

  if (!fs.existsSync(schemasDir)) {
    console.log('Schemas directory not found:', schemasDir);
    return;
  }

  const files = fs.readdirSync(schemasDir);
  let cleanedCount = 0;
  const genericPattern = /export type (\w+) = \{ \[key: string\]: unknown \};/g;

  files.forEach((file) => {
    if (!file.endsWith('.ts')) {
      return;
    }

    const filePath = path.join(schemasDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    if (!genericPattern.test(content)) {
      return;
    }

    const updatedContent = content.replace(
      /export type (\w+) = \{ \[key: string\]: unknown \};/g,
      'export type $1 = Record<string, never>;'
    );

    fs.writeFileSync(filePath, updatedContent, 'utf8');
    cleanedCount++;
    console.log(`Cleaned: ${file}`);
  });

  console.log(`\nCleaned ${cleanedCount} schema files.`);

  if (cleanedCount > 0) {
    console.log('\nNote: These types represent empty request bodies or responses.');
    console.log('Consider updating the OpenAPI specification to include proper schema definitions.');
  }
}

cleanupSchemas();
