# 基础 CRUD 开发任务清单

本文档在「笔记主表 + Java 落库 + `WebView` 桥接」架构下，把**可分工、可验收**的 CRUD 相关任务从底到上列出，与《课程设计开发文档》中 `notes` 表及 `invoke` 两参协议一致。实现顺序建议：**数据库与 Repository → 桥接分派与线程 → H5 调用与联调**。

**数据主表（最小）**：`notes(id, title, content_md, updated_at, …扩展字段)`。字段名在 SQL、Java 模型、桥接 JSON 中保持同一套命名。

---

## 1. 数据层：SQLite 与建表

| 任务编号 | 任务 | 说明 / 完成标准 |
|----------|------|------------------|
| C-1 | 实现 `SQLiteOpenHelper` 子类 | 指定库名/版本；`onCreate` 中执行建表 SQL；`onUpgrade` 预留迁移或占位逻辑。 |
| C-2 | 创建 `notes` 表 | 含 `id` 自增主键、`title`、`content_md`、`updated_at`；可附加 `is_deleted` 等。 |
| C-3 | 建立列表常用索引 | 如 `updated_at` 降序查询所需索引，避免大表全表扫（课设数据量小也可先实现再验证）。 |
| C-4 | 单测或手动验证 | 在设备/模拟器上能打开库文件路径逻辑正确，**安装后首次启动建表不崩溃**。 |

---

## 2. `NoteRepository`：四类操作

| 操作 | 任务编号 | 任务 | 说明 / 完成标准 |
|------|----------|------|------------------|
| **C** Create | R-C1 | `insert` 新笔记 | 可仅填 `title` 默认值 + 空 `content_md`；写入时刷新 `updated_at`；返回新 `id`。 |
| **R** Read | R-R1 | `list` 全部或分页 | `ORDER BY updated_at DESC`；`Cursor` 转列表 DTO/Map，供 JSON 序列化。 |
| **R** Read | R-R2 | `getById` | 主键查询；无记录时约定返回 `null` 或空对象，**与 H5 约定一致**。 |
| **U** Update | R-U1 | `update` 保存 | 按 `id` 更新 `title`/`content_md`，并**总是更新** `updated_at`。 |
| **D** Delete | R-D1 | `delete` 单条 | 按 `id` **硬删**；若采用软删则改为更新 `is_deleted` 与列表过滤条件。 |

**横向任务**

| 任务编号 | 任务 | 说明 / 完成标准 |
|----------|------|------------------|
| R-X1 | 所有 SQL 使用 **`?` 占位符**，禁止用户输入直拼进 SQL 字符串。 |
| R-X2 | 批量或关联操作需时用 **事务**（`beginTransaction` / `endTransaction`）。 |
| R-X3 | 对外只暴露 **Repository** 方法，不在 `WebAppBridge` 中散落 `rawQuery` 等。 |

---

## 3. `WebAppBridge`：`invoke` 分派

与前端约定**方法名 + JSON 参数**（见主文档 3.2.1）。建议最小协议：

| 方法名（示例） | 作用 | 入参（JSON 示例） | 出参/回调约定 |
|----------------|------|------------------|----------------|
| `listNotes` | 读列表 | `{}` 或 `{ "offset", "limit" }` | 返回笔记数组（含 `id, title, updated_at` 等） |
| `getNoteById` | 读单条 | `{ "id": 1 }` | 返回单条对象或空 |
| `saveNote` | 新建或更新 | `{ "id"?, "title", "content_md" }`：无 `id` 为新建，有 `id` 为更新 | 返回 `{ "id", "ok": true }` 等 |
| `deleteNote` | 删除 | `{ "id": 1 }` | 返回 `{ "ok": true }` 等 |

| 任务编号 | 任务 | 完成标准 |
|----------|------|----------|
| B-1 | 在 `invoke` 内按 `methodName` **分派**到 `NoteRepository` 对应方法。 |
| B-2 | 解析 `paramsJson` 为键值；**异常路径**不崩溃（日志 + 回传错误结构，与前端对齐）。 |
| B-3 | 结果回传 H5：通过主线程 `evaluateJavascript` 或已约定回调名（若采用回调 ID，需在协议中写死）。 |
| B-4 | 耗时/大查询在**后台线程**执行，**UI/WebView 回调**回到主线程（与主文档 4.5 一致）。 |

---

## 4. 前端（`web/`）与 `JSBridge`

| 任务编号 | 任务 | 完成标准 |
|----------|------|----------|
| W-1 | 在 `lib/` 中封装与原生一致的 **`invoke(方法名, 参数对象)`**；无 `window.hybrid` 时 **Mock** 同签名。 |
| W-2 | 列表页：进入时调 `listNotes`，渲染列表。 |
| W-3 | 详情/编辑：打开时 `getNoteById`；保存时 `saveNote`；删除时 `deleteNote` 并回列表。 |
| W-4 | 与原生对一下 **日期格式**（`updated_at` 用数字时间戳或 ISO 字符串，二选一全链路统一）。 |

---

## 5. 联调与验收

| 任务编号 | 任务 | 完成标准 |
|----------|------|----------|
| V-1 | 新建 → 列表可见 → 再打开内容一致。 |
| V-2 | 修改 → 重进或返回列表，**`updated_at` 与内容**已更新。 |
| V-3 | 删除 → 列表不再出现，**无残留崩溃**。 |
| V-4 | **强杀进程**后再进，数据仍在（证明持久化在 SQLite）。 |

---

## 6. 建议分工参考

- **同学 A（Android）**：C-1～C-4、R- *（Repository）*、B-1～B-4 中与 Java/线程相关部分。  
- **同学 B（前端）**：W-1～W-4 与 UI 主流程。  
- **联调**：协议表冻结后，按「方法名 + JSON」逐条对 `listNotes` / `getNoteById` / `saveNote` / `deleteNote` 过 V-1～V-4。

*若表结构或方法名有变更，请同步修改《课程设计开发文档》附录与本文档，避免 H5 与 Java 各写一套。*
