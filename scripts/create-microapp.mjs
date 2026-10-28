#!/usr/bin/env node
// Minimal organization CLI to scaffold a new microapp from the current repo template
// Usage example:
// node scripts/create-microapp.mjs \
//   --name microapp-demo \
//   --target-dir ../ \
//   --port 8082 \
//   --active-rule /subApp/microapp-demo \
//   --api-base /api \
//   [--openapi-url http://host/openapi.json]

import fs from 'fs/promises'
import path from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { exec as execCb, spawn } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execCb)
const require = createRequire(import.meta.url)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const next = argv[i + 1]
      if (!next || next.startsWith('--')) {
        args[key] = true
      } else {
        args[key] = next
        i++
      }
    }
  }
  return args
}

async function pathExists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

function printHelp() {
  const help = `
用法: node scripts/create-microapp.mjs [选项]

选项:
  --name <string>                微应用名称 (默认: microapp-<timestamp>)
  --target-dir <path>            目标目录 (默认: 上级目录 ../)
  --port <number>                本地开发端口 (默认: 8081)
  --active-rule <path>           微应用激活路由前缀 (默认: /subApp/<name>)
  --api-base <path>              接口 Base 地址 (默认: /api)
  --openapi-url <url>            OpenAPI 地址 (可选)
  --latest-deps                  显式追最新依赖并刷新锁文件（默认沿用模板版本）
  --skip-skills                  不同步 skills（由调用方负责，如 @yss-ui/create）
  --no-summary                   不打印结尾的 Created microapp / Next steps（由调用方负责）
  --interactive                  进入交互式模式 (如不带任何参数也会进入)
  --help, -h                     显示帮助

示例(参数化):
  node scripts/create-microapp.mjs \\
    --name your-app \\
    --target-dir ../ \\
    --port 8083 \\
    --active-rule /subApp/your-app \\
    --api-base /api \\
    --openapi-url http://your-host/v3/api-docs

示例(交互式):
  node scripts/create-microapp.mjs --interactive
`
  console.log(help)
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

/**
 * Recursively copy directory with ignore rules
 */
async function copyDir(src, dest, options = {}, rootSrc = src) {
  const { ignore = [] } = options
  await ensureDir(dest)
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    // Calculate path relative to the root copy directory
    const relPath = path.relative(rootSrc, srcPath)

    if (ignore.some(rule => matchIgnore(rule, relPath))) {
      continue
    }
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, options, rootSrc)
    } else if (entry.isFile()) {
      await fs.copyFile(srcPath, destPath)
    }
  }
}

function matchIgnore(rule, relPath) {
  // Normalize paths to ignore platform differences
  const normalizedRel = relPath.split(path.sep).join('/')
  const normalizedRule = rule.split(path.sep).join('/')

  // exact match
  if (normalizedRule === normalizedRel) return true

  /** 构建主题目录使用段内通配符，仍按完整路径段匹配。 */
  if (normalizedRule.includes('*/')) {
    const pattern = normalizedRule
      .split('/')
      .map(segment => (segment === '**' ? '.*' : segment.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')))
      .join('/')
    const directoryPattern = pattern.replace(/\/\.\*$/, '(?:/.*)?')
    return new RegExp(`^${directoryPattern}$`).test(normalizedRel)
  }

  // directory glob support (endsWith /**)
  if (normalizedRule.endsWith('/**')) {
    const base = normalizedRule.slice(0, -3)
    // Match exact directory OR file within directory
    // Ensure we match "base" as a complete path segment
    return normalizedRel === base || normalizedRel.startsWith(base + '/')
  }

  // existing single-level wildcard support (endsWith /*)
  if (normalizedRule.endsWith('/*')) {
    const base = normalizedRule.slice(0, -2)
    return normalizedRel.startsWith(base + '/')
  }

  return false
}

async function replaceInFile(filePath, replacements) {
  const exists = await pathExists(filePath)
  if (!exists) return
  const content = await fs.readFile(filePath, 'utf8')
  const next = replacements.reduce((acc, [search, replace]) => acc.replace(search, replace), content)
  if (next !== content) {
    await fs.writeFile(filePath, next, 'utf8')
  }
}

async function deletePath(targetPath) {
  try {
    await fs.rm(targetPath, { recursive: true, force: true })
  } catch {}
}

async function updateJson(filePath, updater) {
  const exists = await pathExists(filePath)
  if (!exists) return
  const text = await fs.readFile(filePath, 'utf8')
  const json = JSON.parse(text)
  const updated = await updater(json)
  await fs.writeFile(filePath, JSON.stringify(updated, null, 2) + '\n', 'utf8')
}

function normalizeFullActiveRule(rule, appName) {
  const targetRule = rule ? String(rule).trim() : `/subApp/${appName}`
  const withLeading = targetRule.startsWith('/') ? targetRule : `/${targetRule}`
  return withLeading.startsWith('/subApp/') ? withLeading : `/subApp${withLeading}`
}

async function writeEnvFiles(targetRoot, appName, apiBase, activeRule, proxyTarget) {
  const fullActiveRule = normalizeFullActiveRule(activeRule, appName)
  const subAppName = fullActiveRule.replace(/^\/subApp\//, '') || appName

  const devEnv = `VITE_SUB_APP_NAME=${subAppName}\nVITE_API_BASE_URL=${apiBase}\nVITE_ACTIVE_RULE=${fullActiveRule}\nVITE_PROXY_TARGET=${proxyTarget}\n`
  const prodEnv = `VITE_SUB_APP_NAME=${subAppName}\nVITE_API_BASE_URL=${apiBase}\nVITE_ACTIVE_RULE=${fullActiveRule}\nVITE_PROXY_TARGET=${proxyTarget}\nVITE_STANDALONE_DEPLOY=false\nVITE_STANDALONE_LAYOUT=true\n`
  const prodJspEnv = `VITE_SUB_APP_NAME=${subAppName}\nVITE_API_BASE_URL=${apiBase}\nVITE_ACTIVE_RULE=${fullActiveRule}\nVITE_PROXY_TARGET=${proxyTarget}\nVITE_IS_JSP=true\nVITE_STANDALONE_DEPLOY=false\n`

  // JSP 主题环境
  const devJspThemeEnv = `VITE_SUB_APP_NAME=${subAppName}\nVITE_API_BASE_URL=${apiBase}\nVITE_ACTIVE_RULE=${fullActiveRule}\nVITE_PROXY_TARGET=${proxyTarget}\nVITE_JSP_THEME=classic-blue\n`
  const prodJspThemeEnv = `VITE_SUB_APP_NAME=${subAppName}\nVITE_API_BASE_URL=${apiBase}\nVITE_ACTIVE_RULE=${fullActiveRule}\nVITE_PROXY_TARGET=${proxyTarget}\nVITE_IS_JSP=true\nVITE_JSP_THEME=classic-blue\n`

  // 独立部署生产环境
  const standaloneEnv = `# 独立部署专用环境变量\n# 通过 pnpm build:standalone 触发\n\nVITE_SUB_APP_NAME=${subAppName}\nVITE_API_BASE_URL=${apiBase}\nVITE_ACTIVE_RULE=${fullActiveRule}\nVITE_PROXY_TARGET=${proxyTarget}\n\n# 独立部署标志\nVITE_STANDALONE_DEPLOY=true\n# 独立部署时是否强制显示布局菜单\nVITE_STANDALONE_LAYOUT=true\n`

  const pkgRoot = path.join(targetRoot, 'packages')
  await ensureDir(pkgRoot)
  await fs.writeFile(path.join(pkgRoot, '.env.development'), devEnv, 'utf8')
  await fs.writeFile(path.join(pkgRoot, '.env.production'), prodEnv, 'utf8')
  await fs.writeFile(path.join(pkgRoot, '.env.production.jsp'), prodJspEnv, 'utf8')
  await fs.writeFile(path.join(pkgRoot, '.env.development.jsp-theme'), devJspThemeEnv, 'utf8')
  await fs.writeFile(path.join(pkgRoot, '.env.production.jsp-theme'), prodJspThemeEnv, 'utf8')
  await fs.writeFile(path.join(pkgRoot, '.env.production.standalone'), standaloneEnv, 'utf8')
}

async function writeNpmrc(targetRoot) {
  const sourceNpmrc = path.resolve(path.join(__dirname, '..', '.npmrc'))
  if (await pathExists(sourceNpmrc)) {
    const content = await fs.readFile(sourceNpmrc, 'utf8')
    await fs.writeFile(path.join(targetRoot, '.npmrc'), content, 'utf8')
  }
}

async function resolveSkillsCliBin() {
  const candidates = [process.env.YSS_SKILLS_CLI_BIN];

  try {
    candidates.push(require.resolve('@yss-ui/skills-cli/bin/yss-skills.js'));
  } catch {}

  candidates.push(path.resolve(__dirname, '../node_modules/@yss-ui/skills-cli/bin/yss-skills.js'));

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return '';
}

function compareStableVersions(a, b) {
  const parse = version =>
    String(version)
      .replace(/^v/, '')
      .split('-')[0]
      .split('.')
      .map(part => Number(part))
  const [aMajor = 0, aMinor = 0, aPatch = 0] = parse(a)
  const [bMajor = 0, bMinor = 0, bPatch = 0] = parse(b)

  if (aMajor !== bMajor) return aMajor - bMajor
  if (aMinor !== bMinor) return aMinor - bMinor
  return aPatch - bPatch
}

async function getLatestVersion(packageName) {
  try {
    const { stdout } = await exec(`npm view ${packageName} versions --json --registry=https://registry.npmmirror.com/`, { timeout: 6000 })
    const rawVersions = JSON.parse(stdout)
    const versions = (Array.isArray(rawVersions) ? rawVersions : [rawVersions]).filter(
      version => typeof version === 'string' && /^\d+\.\d+\.\d+$/.test(version)
    )

    if (versions.length === 0) {
      return null
    }

    return versions.sort(compareStableVersions).at(-1)
  } catch (error) {
    console.warn(`[WARN] 无法获取 ${packageName} 的最新版本:`, error.message)
    return null
  }
}

async function getLatestPublishedVersion(packageName) {
  return getLatestVersion(packageName)
}

async function getLatestYssVersions() {
  const packages = ['@yss-ui/components', '@yss-ui/hooks', '@yss-ui/utils']

  console.log('正在获取 @yss-ui 系列包的最新版本...')

  const versions = {}

  for (const pkg of packages) {
    const version = await getLatestVersion(pkg)
    if (version) {
      versions[pkg] = `^${version}`
      console.log(`  ✓ ${pkg}: ${version}`)
    } else {
      console.warn(`  ✗ ${pkg}: 获取失败，将保持原版本`)
    }
  }

  return versions
}

function updateYssDependencies(packageJson, versions) {
  if (!packageJson.dependencies) {
    return packageJson
  }

  let updated = false
  for (const [pkg, newVersion] of Object.entries(versions)) {
    if (packageJson.dependencies[pkg]) {
      const oldVersion = packageJson.dependencies[pkg]
      packageJson.dependencies[pkg] = newVersion
      if (oldVersion !== newVersion) {
        console.log(`  更新 ${pkg}: ${oldVersion} -> ${newVersion}`)
        updated = true
      }
    }
  }

  if (!updated) {
    console.log('  所有 @yss-ui 依赖已是最新版本')
  }

  return packageJson
}

async function downloadOpenapi(openapiUrl, destFile) {
  const res = await fetch(openapiUrl)
  if (!res.ok) {
    throw new Error(`Failed to download OpenAPI: ${res.status} ${res.statusText}`)
  }
  const body = await res.text()
  await ensureDir(path.dirname(destFile))
  await fs.writeFile(destFile, body, 'utf8')
}

async function runCommand(command, args, cwd, { timeout = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    let timer = null
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true
    })

    if (timeout > 0) {
      timer = setTimeout(() => {
        try {
          child.kill('SIGTERM')
        } catch {}
        reject(new Error(`命令执行超时（${timeout}ms）：${command} ${args.join(' ')}`))
      }, timeout)
    }

    child.on('error', err => {
      if (timer) clearTimeout(timer)
      reject(err)
    })
    child.on('exit', code => {
      if (timer) clearTimeout(timer)
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
      }
    })
  })
}

async function askQuestions(defaults) {
  const rl = readline.createInterface({ input, output })
  const answers = {}
  try {
    answers.appName = (await rl.question(`请输入微应用名称 [${defaults.appName}]: `)) || defaults.appName
    answers.targetDir = (await rl.question(`请输入目标目录 [${defaults.targetDir}]: `)) || defaults.targetDir
    const portStr = (await rl.question(`请输入本地端口 [${defaults.port}]: `)) || String(defaults.port)
    answers.port = Number(portStr)
    const defaultActiveRule = `/subApp/${answers.appName}`
    answers.activeRule =
      (await rl.question(`请输入激活路由前缀(如 /subApp/my-app) [${defaultActiveRule}]: `)) || defaultActiveRule
    answers.apiBase = (await rl.question(`请输入接口 Base(如 /api) [${defaults.apiBase}]: `)) || defaults.apiBase
    answers.proxyTarget =
      (await rl.question(`请输入代理目标(如 http://127.0.0.1:3000) [${defaults.proxyTarget}]: `)) ||
      defaults.proxyTarget
    answers.openapiUrl = (await rl.question(`OpenAPI 地址(可留空): `)) || ''

    const gitInit = (await rl.question(`是否初始化 Git 并创建/关联远程仓库? (y/N): `)).trim().toLowerCase() === 'y'
    answers.git = { enable: gitInit }
    if (gitInit) {
      const createRemote = (await rl.question(`需要自动在 GitLab 创建远程仓库吗? (Y/n): `)).trim().toLowerCase()
      answers.git.createRemote = createRemote !== 'n'
      if (answers.git.createRemote) {
        answers.git.host = (await rl.question(`GitLab 地址(如 http://gitlab.company.com): `)).trim()
        answers.git.token = (await rl.question(`GitLab Token(仅用于本次创建，不会写入仓库): `)).trim()
        answers.git.namespaceId = (await rl.question(`GitLab 组ID(namespace_id，可留空): `)).trim()
        answers.git.visibility =
          (await rl.question(`仓库可见性(private/internal/public) [private]: `)).trim() || 'private'
      } else {
        answers.git.remoteUrl = (await rl.question(`请输入已有远程仓库 URL: `)).trim()
      }
    }
    console.log('')
    return answers
  } finally {
    await rl.close()
  }
}

async function createGitlabProject({ host, token, name, pathName, namespaceId, visibility = 'private' }) {
  const base = host.replace(/\/$/, '')
  const url = `${base}/api/v4/projects`
  const payload = {
    name,
    path: pathName || name,
    visibility
  }
  if (namespaceId) {
    payload.namespace_id = Number(namespaceId)
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'PRIVATE-TOKEN': token },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`GitLab 创建项目失败: ${res.status} ${res.statusText} ${text}`)
  }
  const data = await res.json()
  return {
    httpUrl: data.http_url_to_repo,
    sshUrl: data.ssh_url_to_repo,
    webUrl: data.web_url,
    id: data.id
  }
}

async function gitInitAndPush(cwd, remoteUrl) {
  try {
    await exec('git --version')
  } catch {
    console.warn('[WARN] 未检测到 git，已跳过仓库初始化。')
    return
  }
  try {
    await exec('git init', { cwd })
    await exec('git add .', { cwd })
    await exec('git commit -m "feat: init microapp"', { cwd })
    await exec('git branch -M main', { cwd })
    if (remoteUrl) {
      await exec(`git remote add origin ${remoteUrl}`, { cwd })
      try {
        await exec('git push -u origin main', { cwd })
      } catch (e) {
        console.warn(`[WARN] 首次推送失败: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  } catch (e) {
    console.warn(`[WARN] Git 初始化失败: ${e instanceof Error ? e.message : String(e)}`)
  }
}

async function main() {
  const args = parseArgs(process.argv)
  if (args.help || args.h) {
    printHelp()
    return
  }

  const defaults = {
    appName: 'microapp-' + Date.now(),
    targetDir: path.resolve(process.cwd(), '..'),
    port: 8081,
    apiBase: '/api',
    proxyTarget: 'http://localhost:3000'
  }

  const interactive =
    !!args.interactive ||
    (!args.name &&
      !args['target-dir'] &&
      !args.port &&
      !args['active-rule'] &&
      !args['api-base'] &&
      !args['openapi-url'])

  let appName, targetDir, port, activeRule, apiBase, proxyTarget, openapiUrl, gitAnswers
  if (interactive) {
    const a = await askQuestions(defaults)
    appName = String(a.appName)
    targetDir = path.resolve(String(a.targetDir))
    port = Number(a.port)
    activeRule = String(a.activeRule)
    apiBase = String(a.apiBase)
    proxyTarget = String(a.proxyTarget)
    openapiUrl = a.openapiUrl ? String(a.openapiUrl) : ''
    gitAnswers = a.git
  } else {
    appName = String(args.name || defaults.appName)
    targetDir = path.resolve(String(args['target-dir'] || defaults.targetDir))
    port = Number(args.port || defaults.port)
    activeRule = String(args['active-rule'] || `/subApp/${appName}`)
    apiBase = String(args['api-base'] || defaults.apiBase)
    proxyTarget = String(args['proxy-target'] || defaults.proxyTarget)
    openapiUrl = args['openapi-url'] ? String(args['openapi-url']) : ''
    gitAnswers = { enable: false }
  }

  const repoRoot = path.resolve(path.join(__dirname, '..'))
  const targetRoot = path.join(targetDir, appName)

  if (await pathExists(targetRoot)) {
    throw new Error(`Target directory already exists: ${targetRoot}`)
  }

  // Copy template (current repo) to target, excluding non-template dirs
  await copyDir(repoRoot, targetRoot, {
    ignore: [
      '.git',
      '.git/**',
      '.agent/skills/**',
      '.cursor/skills/**',
      '.claude/skills/**',
      '.trae/skills/**',
      '.DS_Store',
      'node_modules/**',
      'packages/node_modules/**',
      'packages/dist/**',
      'packages/dist-jsp/**',
      'packages/dist-jsp-*/**',
      '.codegraph/**',
      'specs/archive/**',
      'dist/**',
    ],
  })

  // 只移除脚手架专用脚本，保留项目运行时依赖的脚本
  await deletePath(path.join(targetRoot, 'scripts/create-microapp.mjs'))
  await deletePath(path.join(targetRoot, 'scripts/update-yss-versions.mjs'))

  // Ensure .gitlab-ci.yml exists in target (some environments may skip hidden files)
  const srcCi = path.join(repoRoot, '.gitlab-ci.yml')
  const dstCi = path.join(targetRoot, '.gitlab-ci.yml')
  if (!(await pathExists(dstCi)) && (await pathExists(srcCi))) {
    await fs.copyFile(srcCi, dstCi)
  }

  // Ensure pnpm workspace and lockfile exist
  const srcWorkspace = path.join(repoRoot, 'pnpm-workspace.yaml')
  const dstWorkspace = path.join(targetRoot, 'pnpm-workspace.yaml')
  if (!(await pathExists(dstWorkspace)) && (await pathExists(srcWorkspace))) {
    await fs.copyFile(srcWorkspace, dstWorkspace)
  }

  // Ensure pnpm lockfiles exist for CI with --frozen-lockfile
  const srcRootLock = path.join(repoRoot, 'pnpm-lock.yaml')
  const dstRootLock = path.join(targetRoot, 'pnpm-lock.yaml')
  if (!(await pathExists(dstRootLock)) && (await pathExists(srcRootLock))) {
    await fs.copyFile(srcRootLock, dstRootLock)
  }

  // Replace index.html container id with appName
  await replaceInFile(path.join(targetRoot, 'packages/index.html'), [[/%VITE_SUB_APP_NAME%/g, appName]])

  // Update vite server port and origin
  const viteConfigPath = path.join(targetRoot, 'packages/vite.config.ts')
  await replaceInFile(viteConfigPath, [
    [/port:\s*\d+/g, `port: ${port}`],
    [/origin:\s*'http:\/\/localhost:\d+'/g, `origin: 'http://localhost:${port}'`]
  ])

  // Update micro-config.json
  const fullActiveRule = normalizeFullActiveRule(activeRule, appName)
  await updateJson(path.join(targetRoot, 'micro-config.json'), json => {
    json.app = json.app || {}
    json.app.name = appName
    json.app.port = port
    json.app.entry = `http://localhost:${port}${fullActiveRule}/`
    json.app.activeRule = fullActiveRule
    return json
  })

  // Write env files
  await writeEnvFiles(targetRoot, appName, apiBase, fullActiveRule, proxyTarget)

  // Write .npmrc from current repo if exists
  await writeNpmrc(targetRoot)

  // Optionally download OpenAPI
  if (openapiUrl) {
    const openapiDest = path.join(targetRoot, 'openapi/openapi.json')
    try {
      await downloadOpenapi(openapiUrl, openapiDest)
    } catch (e) {
      console.warn(`[WARN] OpenAPI 下载失败，已跳过。原因: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // @yss-ui/create 等调用方传 --skip-skills 时由其自行同步，这里不再同步也不告警
  const skipSkills = Boolean(args['skip-skills'])
  let skillsSynced = false
  if (!skipSkills) {
    // 直接使用当前仓库已安装的 skills-cli（Node）同步最新 skills，避免在新项目里先执行 pnpm install
    console.log('\n📦 同步最新 skills...')
    const skillsCliBin = await resolveSkillsCliBin()
    if (skillsCliBin) {
      try {
        await runCommand('node', [skillsCliBin, 'sync'], targetRoot)
        await runCommand('node', ['scripts/check-skills.mjs'], targetRoot)
        skillsSynced = true
        console.log('  ✓ skills 同步完成（Node CLI）')
      } catch (e) {
        console.warn(`[WARN] Node 方式同步 skills 失败：${e instanceof Error ? e.message : String(e)}`)
      }
    } else {
      console.warn('[WARN] 未找到可执行的 @yss-ui/skills-cli，跳过 Node 同步。')
    }

    if (!skillsSynced) {
      console.warn('[WARN] skills 未自动同步，请确认仓库已安装 @yss-ui/skills-cli 或通过环境变量指定 YSS_SKILLS_CLI_BIN')
    }
  }

  // Remove scaffold UI & api in generated project
  await deletePath(path.join(targetRoot, 'packages/src/views/Scaffold'))
  await deletePath(path.join(targetRoot, 'packages/src/api/scaffold.ts'))
  // Remove scaffold route from router
  const routerPath = path.join(targetRoot, 'packages/src/router/index.ts')
  await replaceInFile(routerPath, [[/\s*,\s*\{\s*path:\s*['\"]\/scaffold['\"][\s\S]*?\}\s*,?\s*/m, '']])
  // 兜底：若未匹配到前置逗号的场景，尝试移除对象及其后逗号
  await replaceInFile(routerPath, [[/\{\s*path:\s*['\"]\/scaffold['\"][\s\S]*?\}\s*,?/m, '']])
  // 清理可能残留的 "}},]" 之类语法
  await replaceInFile(routerPath, [
    [/\}\},\s*\]/m, '}\]'],
    [/\},\s*\]/m, '}\]']
  ])
  // Remove scaffold proxy from vite config if present
  await replaceInFile(path.join(targetRoot, 'packages/vite.config.ts'), [
    [/,\s*['\"]\/scaffold-api['\"]:\s*\{[\s\S]*?\}\s*/m, '']
  ])

  // Update .gitlab-ci.yml image name and local deploy dir if present
  const ciFile = path.join(targetRoot, '.gitlab-ci.yml')
  const kebabApp = String(appName)
  const camelFromActive =
    String(activeRule || '').replace(/^\//, '') || kebabApp.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
  const imageName = `yss-frontend-${kebabApp}`
  const deployDir = `/opt/html/vue3/${camelFromActive}`
  await replaceInFile(ciFile, [[/IMAGE_NAME:\s*"[^"]+"/g, `IMAGE_NAME: "${imageName}"`]])
  await replaceInFile(ciFile, [[/LOCAL_DEPLOY_DIR:\s*"[^"]+"/g, `LOCAL_DEPLOY_DIR: "${deployDir}"`]])

  // Update package.json names and @yss-ui dependencies
  const latestSkillsCliVersion = args['latest-deps'] ? await getLatestPublishedVersion('@yss-ui/skills-cli') : null
  await updateJson(path.join(targetRoot, 'package.json'), json => {
    if (json && typeof json === 'object') {
      json.name = `${appName}-workspace`
      if (latestSkillsCliVersion) {
        json.devDependencies = json.devDependencies || {}
        const newVersion = `^${latestSkillsCliVersion}`
        const oldVersion = json.devDependencies['@yss-ui/skills-cli']
        json.devDependencies['@yss-ui/skills-cli'] = newVersion
        if (oldVersion !== newVersion) {
          console.log(`  更新 @yss-ui/skills-cli: ${oldVersion} -> ${newVersion}`)
        }
      }
    }
    return json
  })

  // 获取并更新 @yss-ui 依赖的最新版本
  console.log(args['latest-deps'] ? '\n📦 更新 @yss-ui 依赖版本...' : '\n📦 沿用模板已验证的依赖与锁文件')
  const latestVersions = args['latest-deps'] ? await getLatestYssVersions() : {}

  await updateJson(path.join(targetRoot, 'packages/package.json'), json => {
    if (json && typeof json === 'object') {
      json.name = appName
      // 更新 @yss-ui 依赖到最新版本
      if (Object.keys(latestVersions).length > 0) {
        updateYssDependencies(json, latestVersions)
      }
    }
    return json
  })

  /** 显式升级后同步工作区锁文件，禁止生成 manifest/lock 不一致的项目。 */
  if (args['latest-deps']) {
    await runCommand('pnpm', ['install', '--lockfile-only', '--ignore-scripts'], targetRoot)
  }

  // 如果后续会走 Git 流程，先初始化本地仓库，避免后续 git 操作缺少 .git
  if (gitAnswers && gitAnswers.enable) {
    try {
      await exec('git init', { cwd: targetRoot })
    } catch (e) {
      console.warn(`[WARN] 提前初始化 Git 失败：${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // Git init & remote
  if (gitAnswers && gitAnswers.enable) {
    let remoteUrl = gitAnswers.remoteUrl || ''
    if (gitAnswers.createRemote) {
      try {
        const created = await createGitlabProject({
          host: gitAnswers.host,
          token: gitAnswers.token,
          name: appName,
          pathName: appName,
          namespaceId: gitAnswers.namespaceId,
          visibility: gitAnswers.visibility || 'private'
        })
        remoteUrl = created.httpUrl
        console.log(`GitLab 项目已创建: ${created.webUrl}`)
      } catch (e) {
        console.warn(`[WARN] 远程创建失败，继续进行本地初始化。原因: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    await gitInitAndPush(targetRoot, remoteUrl)
  }

  // 调用方传 --no-summary 时由其输出后续步骤，避免出现两份不一致的提示
  if (args['no-summary']) return

  // Print next steps
  const steps = [
    `cd ${targetRoot}`,
    ...(skipSkills
      ? []
      : [skillsSynced ? '(skills 已自动同步)' : '(skills 未自动同步，请检查 @yss-ui/skills-cli 安装或 YSS_SKILLS_CLI_BIN)']),
    openapiUrl ? 'pnpm generate:api' : '(optional) pnpm generate:api',
    'pnpm install --frozen-lockfile',
    'pnpm dev'
  ].join('\n')
  console.log(`\nCreated microapp at: ${targetRoot}\n\nNext steps:\n${steps}\n`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
