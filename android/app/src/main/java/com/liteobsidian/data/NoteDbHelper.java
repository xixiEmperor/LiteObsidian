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
    // 库文件位于应用私有 databases 目录，外置存储不可见
    private static final String DB_NAME = "notes.db";
    // 表结构有变更时递增，并在 onUpgrade 中写迁移
    private static final int DB_VERSION = 1;

    public static final String TABLE_NOTES = "notes";
    public static final String COL_ID = "id";
    public static final String COL_TITLE = "title";
    public static final String COL_CONTENT_MD = "content_md";
    public static final String COL_UPDATED_AT = "updated_at";
    // 0 表示正常；为后续软删、回收站等预留
    public static final String COL_IS_DELETED = "is_deleted";

    public NoteDbHelper(Context context) {
        super(context.getApplicationContext(), DB_NAME, null, DB_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        // 主表与建索引语句集中在 res/raw/notes_schema_v1.sql，审阅/答辩可直接打开该文件
        execRawSqlScript(db, R.raw.notes_schema_v1);
    }

    // 从 raw 读入整段文本，按分号切条后逐条 execSQL（与安卓「一次一条」约定一致；DDL 中勿在字符串里含分号）
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
        Context ctx = getContext();
        if (ctx == null) {
            throw new IllegalStateException("getContext() is null in NoteDbHelper");
        }
        StringBuilder out = new StringBuilder();
        try (InputStream in = ctx.getResources().openRawResource(rawResId);
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
        // 首版无迁移；后续增列/改表在此按 oldVersion 分分支处理
    }
}
