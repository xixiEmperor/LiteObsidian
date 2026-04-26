package com.liteobsidian.data;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * 笔记表 CRUD 以及标签、设置等扩展能力。
 */
public final class NoteRepository {
    private static final String DEFAULT_TITLE = "未命名";
    private final NoteDbHelper dbHelper;

    public NoteRepository(@NonNull Context context) {
        this.dbHelper = new NoteDbHelper(context);
    }

    public long insert(@Nullable String title, @Nullable String contentMd) {
        long now = System.currentTimeMillis();
        ContentValues v = new ContentValues();
        v.put(NoteDbHelper.COL_TITLE, title == null || title.trim().isEmpty() ? DEFAULT_TITLE : title.trim());
        v.put(NoteDbHelper.COL_CONTENT_MD, contentMd != null ? contentMd : "");
        v.put(NoteDbHelper.COL_UPDATED_AT, now);
        v.put(NoteDbHelper.COL_IS_DELETED, 0);
        v.put(NoteDbHelper.COL_IS_PINNED, 0);
        v.put(NoteDbHelper.COL_IS_FAVORITE, 0);
        v.put(NoteDbHelper.COL_LAST_OPENED_AT, now);
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        return db.insert(NoteDbHelper.TABLE_NOTES, null, v);
    }

    @NonNull
    public List<Note> listFiltered(int offset, int limit, @Nullable String keyword, @Nullable String tag, boolean favoritesOnly) {
        if (offset < 0) {
            offset = 0;
        }
        if (limit <= 0) {
            limit = 1000;
        }

        StringBuilder where = new StringBuilder(NoteDbHelper.COL_IS_DELETED + " = 0");
        List<String> args = new ArrayList<>();

        if (favoritesOnly) {
            where.append(" AND ").append(NoteDbHelper.COL_IS_FAVORITE).append(" = 1");
        }

        String q = keyword == null ? "" : keyword.trim();
        if (!q.isEmpty()) {
            where.append(" AND (")
                    .append(NoteDbHelper.COL_TITLE).append(" LIKE ? OR ")
                    .append(NoteDbHelper.COL_CONTENT_MD).append(" LIKE ?)");
            String like = "%" + q + "%";
            args.add(like);
            args.add(like);
        }

        String t = tag == null ? "" : tag.trim();
        if (!t.isEmpty()) {
            where.append(" AND ").append(NoteDbHelper.COL_ID).append(" IN (")
                    .append("SELECT nt.").append(NoteDbHelper.COL_NT_NOTE_ID)
                    .append(" FROM ").append(NoteDbHelper.TABLE_NOTE_TAGS).append(" nt ")
                    .append("JOIN ").append(NoteDbHelper.TABLE_TAGS).append(" t ON t.")
                    .append(NoteDbHelper.COL_TAG_ID).append(" = nt.")
                    .append(NoteDbHelper.COL_NT_TAG_ID)
                    .append(" WHERE t.").append(NoteDbHelper.COL_TAG_NAME).append(" = ?)");
            args.add(t);
        }

        String orderBy = NoteDbHelper.COL_IS_PINNED + " DESC, " + NoteDbHelper.COL_UPDATED_AT + " DESC";
        String limitClause = String.valueOf(limit) + " OFFSET " + String.valueOf(offset);

        List<Note> out = new ArrayList<>();
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        try (Cursor c = db.query(
                NoteDbHelper.TABLE_NOTES,
                null,
                where.toString(),
                args.toArray(new String[0]),
                null,
                null,
                orderBy,
                limitClause
        )) {
            while (c.moveToNext()) {
                Note n = rowToNote(c);
                n.tags = listTagsByNoteId(n.id);
                out.add(n);
            }
        }
        return out;
    }

    @Nullable
    public Note getById(long id) {
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        String sel = NoteDbHelper.COL_ID + " = ?";
        String[] args = new String[]{String.valueOf(id)};
        try (Cursor c = db.query(NoteDbHelper.TABLE_NOTES, null, sel, args, null, null, null)) {
            if (c.moveToFirst()) {
                Note n = rowToNote(c);
                n.tags = listTagsByNoteId(n.id);
                return n;
            }
        }
        return null;
    }

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

    public int deleteById(long id) {
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        String where = NoteDbHelper.COL_ID + " = ?";
        String[] whereArgs = new String[]{String.valueOf(id)};
        db.delete(NoteDbHelper.TABLE_NOTE_TAGS, NoteDbHelper.COL_NT_NOTE_ID + " = ?", whereArgs);
        return db.delete(NoteDbHelper.TABLE_NOTES, where, whereArgs);
    }

    public void setPinned(long id, boolean pinned) {
        ContentValues v = new ContentValues();
        v.put(NoteDbHelper.COL_IS_PINNED, pinned ? 1 : 0);
        v.put(NoteDbHelper.COL_UPDATED_AT, System.currentTimeMillis());
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        db.update(NoteDbHelper.TABLE_NOTES, v, NoteDbHelper.COL_ID + " = ?", new String[]{String.valueOf(id)});
    }

    public void setFavorite(long id, boolean favorite) {
        ContentValues v = new ContentValues();
        v.put(NoteDbHelper.COL_IS_FAVORITE, favorite ? 1 : 0);
        v.put(NoteDbHelper.COL_UPDATED_AT, System.currentTimeMillis());
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        db.update(NoteDbHelper.TABLE_NOTES, v, NoteDbHelper.COL_ID + " = ?", new String[]{String.valueOf(id)});
    }

    public void updateTags(long noteId, @NonNull List<String> tags) {
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        db.beginTransaction();
        try {
            String[] args = new String[]{String.valueOf(noteId)};
            db.delete(NoteDbHelper.TABLE_NOTE_TAGS, NoteDbHelper.COL_NT_NOTE_ID + " = ?", args);

            Set<String> uniq = new HashSet<>();
            for (String raw : tags) {
                String t = raw.trim();
                if (t.isEmpty()) {
                    continue;
                }
                String key = t.toLowerCase(Locale.ROOT);
                if (uniq.contains(key)) {
                    continue;
                }
                uniq.add(key);

                long tagId = findTagId(db, t);
                if (tagId <= 0) {
                    ContentValues tv = new ContentValues();
                    tv.put(NoteDbHelper.COL_TAG_NAME, t);
                    tagId = db.insert(NoteDbHelper.TABLE_TAGS, null, tv);
                    if (tagId <= 0) {
                        tagId = findTagId(db, t);
                    }
                }
                if (tagId > 0) {
                    ContentValues nt = new ContentValues();
                    nt.put(NoteDbHelper.COL_NT_NOTE_ID, noteId);
                    nt.put(NoteDbHelper.COL_NT_TAG_ID, tagId);
                    db.insert(NoteDbHelper.TABLE_NOTE_TAGS, null, nt);
                }
            }

            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    @NonNull
    public List<String> listTags() {
        List<String> out = new ArrayList<>();
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        try (Cursor c = db.query(
                NoteDbHelper.TABLE_TAGS,
                new String[]{NoteDbHelper.COL_TAG_NAME},
                null,
                null,
                null,
                null,
                NoteDbHelper.COL_TAG_NAME + " COLLATE NOCASE ASC"
        )) {
            while (c.moveToNext()) {
                out.add(c.getString(0));
            }
        }
        return out;
    }

    @NonNull
    public JSONObject getSettings() throws JSONException {
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        JSONObject out = new JSONObject();
        out.put("fontSize", getSettingInt(db, "fontSize", 16));
        out.put("lineWidth", getSettingInt(db, "lineWidth", 860));
        out.put("autoSaveMs", getSettingInt(db, "autoSaveMs", 1200));
        out.put("followSystemTheme", getSettingBool(db, "followSystemTheme", true));
        return out;
    }

    public void saveSettings(@NonNull JSONObject p) {
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        if (p.has("fontSize")) {
            putSetting(db, "fontSize", String.valueOf(p.optInt("fontSize", 16)));
        }
        if (p.has("lineWidth")) {
            putSetting(db, "lineWidth", String.valueOf(p.optInt("lineWidth", 860)));
        }
        if (p.has("autoSaveMs")) {
            putSetting(db, "autoSaveMs", String.valueOf(p.optInt("autoSaveMs", 1200)));
        }
        if (p.has("followSystemTheme")) {
            putSetting(db, "followSystemTheme", String.valueOf(p.optBoolean("followSystemTheme", true)));
        }
    }

    @NonNull
    public List<Note> listByIds(@NonNull List<Long> ids) {
        List<Note> out = new ArrayList<>();
        if (ids.isEmpty()) {
            return out;
        }
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        for (Long id : ids) {
            Note n = getById(id != null ? id : 0L);
            if (n != null) {
                out.add(n);
            }
        }
        return out;
    }

    private long findTagId(SQLiteDatabase db, String name) {
        String sel = NoteDbHelper.COL_TAG_NAME + " = ?";
        String[] args = new String[]{name};
        try (Cursor c = db.query(NoteDbHelper.TABLE_TAGS, new String[]{NoteDbHelper.COL_TAG_ID}, sel, args, null, null, null)) {
            if (c.moveToFirst()) {
                return c.getLong(0);
            }
        }
        return -1L;
    }

    @NonNull
    private List<String> listTagsByNoteId(long noteId) {
        List<String> out = new ArrayList<>();
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        String sql = "SELECT t." + NoteDbHelper.COL_TAG_NAME +
                " FROM " + NoteDbHelper.TABLE_TAGS + " t" +
                " JOIN " + NoteDbHelper.TABLE_NOTE_TAGS + " nt" +
                " ON nt." + NoteDbHelper.COL_NT_TAG_ID + " = t." + NoteDbHelper.COL_TAG_ID +
                " WHERE nt." + NoteDbHelper.COL_NT_NOTE_ID + " = ?" +
                " ORDER BY t." + NoteDbHelper.COL_TAG_NAME + " COLLATE NOCASE ASC";
        try (Cursor c = db.rawQuery(sql, new String[]{String.valueOf(noteId)})) {
            while (c.moveToNext()) {
                out.add(c.getString(0));
            }
        }
        return out;
    }

    private void putSetting(SQLiteDatabase db, String key, String value) {
        ContentValues v = new ContentValues();
        v.put(NoteDbHelper.COL_SETTING_KEY, key);
        v.put(NoteDbHelper.COL_SETTING_VALUE, value);
        db.insertWithOnConflict(
                NoteDbHelper.TABLE_APP_SETTINGS,
                null,
                v,
                SQLiteDatabase.CONFLICT_REPLACE
        );
    }

    private int getSettingInt(SQLiteDatabase db, String key, int fallback) {
        String raw = getSettingRaw(db, key);
        if (raw == null || raw.isEmpty()) {
            return fallback;
        }
        try {
            return Integer.parseInt(raw);
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private boolean getSettingBool(SQLiteDatabase db, String key, boolean fallback) {
        String raw = getSettingRaw(db, key);
        if (raw == null || raw.isEmpty()) {
            return fallback;
        }
        return "true".equalsIgnoreCase(raw) || "1".equals(raw);
    }

    @Nullable
    private String getSettingRaw(SQLiteDatabase db, String key) {
        String sel = NoteDbHelper.COL_SETTING_KEY + " = ?";
        String[] args = new String[]{key};
        try (Cursor c = db.query(
                NoteDbHelper.TABLE_APP_SETTINGS,
                new String[]{NoteDbHelper.COL_SETTING_VALUE},
                sel,
                args,
                null,
                null,
                null
        )) {
            if (c.moveToFirst()) {
                return c.getString(0);
            }
        }
        return null;
    }

    private static Note rowToNote(@NonNull Cursor c) {
        Note n = new Note();
        n.id = c.getLong(c.getColumnIndexOrThrow(NoteDbHelper.COL_ID));
        n.title = c.getString(c.getColumnIndexOrThrow(NoteDbHelper.COL_TITLE));
        n.contentMd = c.getString(c.getColumnIndexOrThrow(NoteDbHelper.COL_CONTENT_MD));
        n.updatedAt = c.getLong(c.getColumnIndexOrThrow(NoteDbHelper.COL_UPDATED_AT));
        n.isDeleted = c.getInt(c.getColumnIndexOrThrow(NoteDbHelper.COL_IS_DELETED));
        n.isPinned = c.getInt(c.getColumnIndexOrThrow(NoteDbHelper.COL_IS_PINNED));
        n.isFavorite = c.getInt(c.getColumnIndexOrThrow(NoteDbHelper.COL_IS_FAVORITE));
        n.lastOpenedAt = c.getLong(c.getColumnIndexOrThrow(NoteDbHelper.COL_LAST_OPENED_AT));
        return n;
    }
}
