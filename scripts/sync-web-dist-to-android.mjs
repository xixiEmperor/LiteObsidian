import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const webDistDir = path.join(repoRoot, 'web', 'dist')
const androidAssetsDistDir = path.join(
    repoRoot,
    'android',
    'app',
    'src',
    'main',
    'assets',
    'dist',
)

// 先检查前端产物是否存在，避免把空目录同步到 Android 端。
if (!fs.existsSync(webDistDir)) {
    console.error('[sync] 未找到 web/dist，请先执行 web 构建')
    process.exit(1)
}

// 每次同步前先清理旧产物，避免陈旧文件残留导致离线包行为异常。
if (fs.existsSync(androidAssetsDistDir)) {
    fs.rmSync(androidAssetsDistDir, { recursive: true, force: true })
}

fs.mkdirSync(androidAssetsDistDir, { recursive: true })
fs.cpSync(webDistDir, androidAssetsDistDir, { recursive: true })

const entryFile = path.join(androidAssetsDistDir, 'index.html')
if (!fs.existsSync(entryFile)) {
    console.error('[sync] 同步完成但缺少 index.html，请检查 web 构建结果')
    process.exit(1)
}

console.log('[sync] 已同步 web/dist -> android/app/src/main/assets/dist')
