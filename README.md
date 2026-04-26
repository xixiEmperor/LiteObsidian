# LiteObsidian

本地 Markdown 轻笔记：React 业务在 `web/`，Android 壳在 `android/`，详见 [docs/课程设计开发文档.md](docs/课程设计开发文档.md)。

- 前端开发：
  - 进入 `web/`
  - 执行 `pnpm install`
  - 执行 `pnpm dev`
- Android 联调和打包：
  - 进入 `web/`
  - 执行 `pnpm build:android`
  - 用 Android Studio 打开 `android/` 后 Run 安装

`pnpm build:android` 会完成两件事：
1. 构建 `web/dist`
2. 同步到 `android/app/src/main/assets/dist/`

回归检查请看 [docs/最小回归检查清单.md](docs/最小回归检查清单.md)。
