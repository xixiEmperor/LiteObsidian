package com.liteobsidian.data;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import java.util.ArrayList;
import java.util.List;

/**
 * 笔记表 CRUD 放置处：后续接 SQLiteOpenHelper 与游标/值对象映射。
 */
public final class NoteRepository {
    // 与开发任务 R-C1 一致：无标题时占位
    private static final String DEFAULT_TITLE = "未命名";
    // 应用级 Context，不持有 Activity
    private final NoteDbHelper dbHelper;

    public NoteRepository(@NonNull Context context) {
        this.dbHelper = new NoteDbHelper(context);
    }

    /**
     * 新建一条笔记，返回自增 id。
     */
    public long insert(@Nullable String title, @Nullable String contentMd) {
        long now = System.currentTimeMillis();
        ContentValues v = new ContentValues();
        v.put(NoteDbHelper.COL_TITLE, title == null || title.trim().isEmpty() ? DEFAULT_TITLE : title.trim());
        v.put(NoteDbHelper.COL_CONTENT_MD, contentMd != null ? contentMd : "");
        v.put(NoteDbHelper.COL_UPDATED_AT, now);
        v.put(NoteDbHelper.COL_IS_DELETED, 0);
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        return db.insert(NoteDbHelper.TABLE_NOTES, null, v);
    }

    /**
     * 未删除笔记按更新时间倒序；占位分页 offset/limit 供后续 H5 列表使用。
     */
    @NonNull
    public List<Note> list(int offset, int limit) {
        if (offset < 0) {
            offset = 0;
        }
        if (limit <= 0) {
            limit = 1000;
        }
        String orderBy = NoteDbHelper.COL_UPDATED_AT + " DESC";
        // 占位：仅显示未软删
        String where = NoteDbHelper.COL_IS_DELETED + " = 0";
        List<Note> out = new ArrayList<>();
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        // Android 的 limit 为 SQL 的 LIMIT 子句，如 "20" 或 "20 OFFSET 10"
        String limitClause = String.valueOf(limit) + " OFFSET " + String.valueOf(offset);
        // try-with 关闭 Cursor
        try (Cursor c = db.query(
                NoteDbHelper.TABLE_NOTES,
                null,
                where,
                null,
                null,
                null,
                orderBy,
                limitClause
        )) {
            while (c.moveToNext()) {
                out.add(rowToNote(c));
            }
        }
        return out;
    }

    @NonNull
    public List<Note> list() {
        return list(0, 10_000);
    }

    /**
     * 主键查询；无记录时返回 null。
     */
    @Nullable
    public Note getById(long id) {
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        String sel = NoteDbHelper.COL_ID + " = ?";
        String[] args = new String[]{String.valueOf(id)};
        try (Cursor c = db.query(NoteDbHelper.TABLE_NOTES, null, sel, args, null, null, null)) {
            if (c.moveToFirst()) {
                return rowToNote(c);
            }
        }
        return null;
    }

    /**
     * 按 id 更新标题、正文，并刷新 updated_at。
     */
    public int update(long id, @Nullable String title, @Nullable String contentMd) {
        long now = System.currentTimeMillis();
        ContentValues v = new ContentValues();
        v.put(NoteDbHelper.COL_TITLE, title == null || title.trim().isEmpty() ? DEFAULT_TITLE : title.trim());
        v.put(NoteDbHelper.COL_CONTENT_MD, contentMd != null ? contentMd : "");
        v.put(NoteDbHelper.COL_UPDATED_AT, now);
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        String where = NoteDbHelper.COL_ID + " = ?";
        String[] whereArgs = new String[]{String.valueOf(id)};
        return db.update(NoteDbHelper.TABLE_NOTES, v, where, whereArgs);
    }

    /**
     * 硬删单条，返回受影响的行数（0 表示无此 id）。
     */
    public int deleteById(long id) {
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        String where = NoteDbHelper.COL_ID + " = ?";
        String[] whereArgs = new String[]{String.valueOf(id)};
        return db.delete(NoteDbHelper.TABLE_NOTES, where, whereArgs);
    }

    private static Note rowToNote(@NonNull Cursor c) {
        Note n = new Note();
        n.id = c.getLong(c.getColumnIndexOrThrow(NoteDbHelper.COL_ID));
        n.title = c.getString(c.getColumnIndexOrThrow(NoteDbHelper.COL_TITLE));
        n.contentMd = c.getString(c.getColumnIndexOrThrow(NoteDbHelper.COL_CONTENT_MD));
        n.updatedAt = c.getLong(c.getColumnIndexOrThrow(NoteDbHelper.COL_UPDATED_AT));
        n.isDeleted = c.getInt(c.getColumnIndexOrThrow(NoteDbHelper.COL_IS_DELETED));
        return n;
    }
}
