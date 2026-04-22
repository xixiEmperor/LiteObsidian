# web（课程笔记 H5 离线包）

- **技术栈**：Vite 8、React 19、TypeScript、**react-router-dom**（路由使用 **HashRouter**，兼容 `file://` 离线包）、**Sass（.scss）**，已配置 `base: './'` 便于 `file:///android_asset/.../index.html` 加载。未使用 Tailwind。

## 常用命令

```bash
cd web
pnpm install
pnpm dev
```

```bash
pnpm build
# 将 dist/ 整目录复制到 android/app/src/main/assets/dist/ 后再在 Android Studio 中运行
```

## 目录说明

- `src/styles/global.scss`：全局与主题 CSS 自定义属性
- `src/styles/components/<名>/`：与 `src/components/<名>/` **一一映射** 的局部样式，**不要**在 `pages/` 下放样式文件
- `src/pages/`：仅**导出**页面入口（`export { X } from '../components/...'`），不承载大块业务实现
- `src/components/<pageKey>/`：该页下各子组件（如 `components/home/BridgeHint.tsx` 对应 `styles/components/home/bridge-hint.scss`）
- `src/lib/bridge.ts`：与 `AndroidHost` 桥接；浏览器中无桥时使用 mock
- `src/types/`：与笔记/SQLite 对齐的类型

更多流程见仓库根目录 `docs/课程设计开发文档.md`。
