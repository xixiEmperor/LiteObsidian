// 与 SQLite / 桥接 对齐的笔记结构（可随表结构增删字段）
export type Note = {
    id: number
    title: string
    contentMd: string
    updatedAt: number
    isDeleted?: number
}
