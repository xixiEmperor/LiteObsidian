package com.liteobsidian.data;

import java.util.ArrayList;
import java.util.List;

/**
 * 单条笔记在 Repository 与上层之间的值对象；与表 notes 对应。
 */
public final class Note {
    public long id;
    public String title;
    public String contentMd;
    public long updatedAt;
    public int isDeleted;
    public int isPinned;
    public int isFavorite;
    public long lastOpenedAt;
    public List<String> tags;

    public Note() {
        this.isDeleted = 0;
        this.isPinned = 0;
        this.isFavorite = 0;
        this.lastOpenedAt = 0L;
        this.tags = new ArrayList<>();
    }
}
