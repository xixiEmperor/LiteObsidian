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
```

```bash
pnpm sync:android
```

```bash
pnpm build:android
# 一条命令完成构建和同步，适合日常联调
```

## 目录说明

- `src/styles/global.scss`：全局与主题 CSS 自定义属性
- `src/styles/components/<名>/`：与 `src/components/<名>/` **一一映射** 的局部样式，**不要**在 `pages/` 下放样式文件
- `src/pages/`：仅**导出**页面入口或极薄包装（`NotePage` 为 `key={noteId}`），不承载大块业务实现
- `src/components/home/`：对应路由 **`/`**（首页：列表、桥接提示、工具栏等），样式在 `styles/components/home/`
- `src/components/note/`：对应路由 **`/note/:noteId`**（单篇新建/编辑），样式在 `styles/components/note/`
- `src/components/app/`：壳层（如 `AppLayout`），与具体业务路由无强绑定时可独立放
- `src/lib/bridge.ts`：与 `AndroidHost` 桥接；浏览器中无桥时使用 mock
- `src/types/`：与笔记/SQLite 对齐的类型

更多流程见仓库根目录 `docs/课程设计开发文档.md`。
回归步骤见仓库根目录 `docs/最小回归检查清单.md`。

## 开发规范

### 按路由划分组件

- **子目录名与 URL 段对齐**：`/` 下的页面与附属 UI 进 **`components/home/`**；**`/note/...`** 进 **`components/note/`**。新增路由（如未来 `/settings`）则建 **`components/settings/`** 与 **`styles/components/settings/`**，保持 **组件子目录与样式子目录同名**。
- 路由级**页面组件**文件名与导出名一致（如 `HomePage.tsx` → `HomePage`），**不要**用 `Index.tsx` 当页面入口主文件。
- `src/pages/` 只做 re-export 或**仅为路由服务的薄包装**（如 `key`），实现放在上面对应的 `components/<routeSegment>/`。
- 同一路由下的小组件可平铺在 `home/` 里（如 `NoteList` 与首页同属 `/`；跳转到单篇的 Link 在列表项中仍指向 `/note/...`）。

### 样式

- 局部样式与组件**按路径一一对应**，写在 `src/styles/components/<与路由/组件目录同名>/`；**禁止**在 `pages/` 下新增样式文件，以免与「页面仅导出」约定冲突。
- 使用 **CSS 自定义属性**（`var(--…)`）做主题与间距；**不要**在 SCSS 中使用以 `$` 开头的变量。样式文件使用**嵌套**组织选择器，与 BEM 类名（如 `home-page__toolbar`）一致即可。
- 同目录相对 import **省略**扩展名（如 `./NoteList`），与 `App.tsx` 等一致；部分 IDE 在写 `./NoteList.tsx` 时反而会报「找不到模块」，以当前能稳定通过 `tsc` 与本地语言服务为准。

### 性能与工程习惯

- 路由级页面在 `App` 中通过 `React.lazy` 与 `Suspense` 懒加载，减少首包体积；子路由的 fallback 样式类名为 `app-route-fallback`（见 `global.scss`）。
- 长列表中的**单条**展示组件在列表可能变大时，对纯展示子项使用 `React.memo` 等控制重渲染，避免在父级更新时无差别刷新全部条目。
- 条件渲染在 JSX 中优先使用**三元表达式**表达「二选一或空」，避免在边界情况下把数字 `0` 渲染为可见节点。
- 包管理统一使用 **pnpm**（`pnpm add`、`pnpm install`），与仓库约定一致即可。

### 与原生桥接

- 与 WebView/原生通信**只**通过 `lib/bridge.ts` 暴露的 `invoke` 等接口，**不要**在组件里直接依赖 `window.hybrid` 等全局，便于浏览器 mock 与类型收敛。

### TypeScript 与可维护性

- 与 SQLite/协议对齐的结构体放在 `src/types/`，import 使用 `import type` 以减轻运行时开销。
- 可复用的请求或状态机若在同一路由下重复出现，可抽到 `src/hooks/` 或 `src/lib/` 下的小模块，再被路由组件引用；**先**保持简单，避免过早抽象。
