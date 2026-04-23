/* 与 com.liteobsidian.data.NoteDbHelper 中表名/列名常量一致；v1 首版。*/
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content_md TEXT,
  updated_at INTEGER NOT NULL,
  is_deleted INTEGER NOT NULL DEFAULT 0
);

/* 与 ORDER BY updated_at DESC 方向一致，便于走索引。*/
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes (updated_at DESC);
