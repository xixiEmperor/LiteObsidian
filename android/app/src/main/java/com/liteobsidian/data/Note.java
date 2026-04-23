package com.liteobsidian.data;

/**
 * 单条笔记在 Repository 与上层之间的值对象；与表 notes 对应。
 */
public final class Note {
    public long id;
    public String title;
    public String contentMd;
    // Unix 毫秒，与 list 排序、显示「修改时间」一致
    public long updatedAt;
    public int isDeleted;

    public Note() {
        this.isDeleted = 0;
    }
}
