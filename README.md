# LiteObsidian

本地 Markdown 轻笔记：React 业务在 `web/`，Android 壳在 `android/`，详见 [docs/课程设计开发文档.md](docs/课程设计开发文档.md)。

- 前端：进入 `web/`，`pnpm install`，`pnpm dev` / `pnpm build`
- Android：用 Android Studio 打开 `android/`，`pnpm build` 后将 `web/dist` 整目录覆盖到 `android/app/src/main/assets/dist/`（与开发文档 3.1 一致），再 Run 安装
