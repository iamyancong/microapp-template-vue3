import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { brotliCompress, constants, gzip } from 'node:zlib';
import { extname, join, resolve } from 'node:path';

const gzipAsync = promisify(gzip);
const brotliCompressAsync = promisify(brotliCompress);
const COMPRESSIBLE_EXTENSIONS = new Set(['.css', '.html', '.js', '.json', '.mjs', '.svg', '.txt', '.wasm', '.xml']);
const MIN_COMPRESS_SIZE = 1024;
const CONCURRENCY = 4;

/**
 * 递归收集构建目录中的文件。
 * @param directory 构建输出目录
 * @returns 可压缩的源文件列表
 */
const collectFiles = async directory => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
    } else if (entry.isFile() && COMPRESSIBLE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push(entryPath);
    }
  }

  return files;
};

/**
 * 获取 JSP 主题构建最近一次生成的输出目录。
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
  if (!latest) {
    throw new Error('未找到 dist-jsp-* 主题构建目录');
  }

  return latest.directory;
};

/**
 * 为单个文件生成 gzip 和 Brotli 静态压缩文件。
 * @param filePath 源文件路径
 * @returns 实际生成的压缩文件数量
 */
const compressFile = async filePath => {
  const source = await readFile(filePath);
  if (source.byteLength < MIN_COMPRESS_SIZE) return 0;

  const [gzipBuffer, brotliBuffer] = await Promise.all([
    gzipAsync(source, { level: 9 }),
    brotliCompressAsync(source, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 9,
      },
    }),
  ]);
  let generated = 0;

  if (gzipBuffer.byteLength < source.byteLength) {
    await writeFile(`${filePath}.gz`, gzipBuffer);
    generated += 1;
  }
  if (brotliBuffer.byteLength < source.byteLength) {
    await writeFile(`${filePath}.br`, brotliBuffer);
    generated += 1;
  }

  return generated;
};

/**
 * 限制并发执行文件压缩，避免构建机同时压缩大量大文件时占满 CPU。
 * @param files 待处理文件
 * @returns 生成的压缩文件数量
 */
const compressFiles = async files => {
  let nextIndex = 0;
  const worker = async () => {
    let workerGenerated = 0;
    while (nextIndex < files.length) {
      const filePath = files[nextIndex];
      nextIndex += 1;
      workerGenerated += await compressFile(filePath);
    }
    return workerGenerated;
  };

  const generatedByWorker = await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker));
  return generatedByWorker.reduce((total, count) => total + count, 0);
};

/**
 * 执行构建产物预压缩。
 */
const main = async () => {
  const targetArgument = process.argv[2];
  const targetDirectory = targetArgument === '--latest-jsp-theme'
    ? await resolveLatestJspThemeDirectory()
    : resolve(process.cwd(), targetArgument || 'dist');
  const files = await collectFiles(targetDirectory);
  const generated = await compressFiles(files);

  console.log(`[precompress] ${targetDirectory}: ${files.length} 个文件，生成 ${generated} 个静态压缩文件`);
};

await main();
