package com.liteobsidian.data;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import com.liteobsidian.R;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

/**
 * 笔记库：建表、版本迁移与首启建库入口。
 */
public final class NoteDbHelper extends SQLiteOpenHelper {
    private final Context mContext;
    private static final String DB_NAME = "notes.db";
    private static final int DB_VERSION = 2;

    public static final String TABLE_NOTES = "notes";
    public static final String COL_ID = "id";
    public static final String COL_TITLE = "title";
    public static final String COL_CONTENT_MD = "content_md";
    public static final String COL_UPDATED_AT = "updated_at";
    public static final String COL_IS_DELETED = "is_deleted";
    public static final String COL_IS_PINNED = "is_pinned";
    public static final String COL_IS_FAVORITE = "is_favorite";
    public static final String COL_LAST_OPENED_AT = "last_opened_at";

    public static final String TABLE_TAGS = "tags";
    public static final String COL_TAG_ID = "id";
    public static final String COL_TAG_NAME = "name";

    public static final String TABLE_NOTE_TAGS = "note_tags";
    public static final String COL_NT_NOTE_ID = "note_id";
    public static final String COL_NT_TAG_ID = "tag_id";

    public static final String TABLE_APP_SETTINGS = "app_settings";
    public static final String COL_SETTING_KEY = "key";
    public static final String COL_SETTING_VALUE = "value";

    public NoteDbHelper(Context context) {
        super(context.getApplicationContext(), DB_NAME, null, DB_VERSION);
        this.mContext = context.getApplicationContext();
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        execRawSqlScript(db, R.raw.notes_schema_v1);
    }

    private void execRawSqlScript(SQLiteDatabase db, int rawResId) {
        String all = readRawUtf8AsString(rawResId);
        String[] parts = all.split(";");
        for (String part : parts) {
            String stmt = part.trim();
            if (stmt.isEmpty()) {
                continue;
            }
            db.execSQL(stmt);
        }
    }

    private String readRawUtf8AsString(int rawResId) {
        StringBuilder out = new StringBuilder();
        try (InputStream in = mContext.getResources().openRawResource(rawResId);
             InputStreamReader isr = new InputStreamReader(in, StandardCharsets.UTF_8);
             BufferedReader br = new BufferedReader(isr)) {
            char[] buf = new char[1024];
            int n;
            while ((n = br.read(buf)) >= 0) {
                out.append(buf, 0, n);
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to read raw sql resource: " + rawResId, e);
        }
        return out.toString();
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        if (oldVersion < 2) {
            db.execSQL("ALTER TABLE notes ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0");
            db.execSQL("ALTER TABLE notes ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0");
            db.execSQL("ALTER TABLE notes ADD COLUMN last_opened_at INTEGER NOT NULL DEFAULT 0");
            db.execSQL("CREATE INDEX IF NOT EXISTS idx_notes_pinned_updated ON notes (is_pinned DESC, updated_at DESC)");
            db.execSQL("CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE)");
            db.execSQL("CREATE TABLE IF NOT EXISTS note_tags (note_id INTEGER NOT NULL, tag_id INTEGER NOT NULL, PRIMARY KEY (note_id, tag_id), FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE, FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE)");
            db.execSQL("CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
            db.execSQL("INSERT OR IGNORE INTO app_settings(key, value) VALUES ('fontSize', '16')");
            db.execSQL("INSERT OR IGNORE INTO app_settings(key, value) VALUES ('lineWidth', '860')");
            db.execSQL("INSERT OR IGNORE INTO app_settings(key, value) VALUES ('autoSaveMs', '1200')");
            db.execSQL("INSERT OR IGNORE INTO app_settings(key, value) VALUES ('followSystemTheme', 'true')");
        }
    }
}
