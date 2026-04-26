import { memo } from 'react'
import { Link } from 'react-router-dom'
import type { Note } from '../../types/note'
import '../../styles/components/home/note-list-item.scss'

type NoteListItemProps = {
    note: Note
}

function formatUpdatedAt(ts: number): string {
    if (!Number.isFinite(ts) || ts <= 0) {
        return '未知时间'
    }
    return new Intl.DateTimeFormat('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(ts)
}

// 列表项在笔记增多时由 memo 避免与兄弟项无关的重复渲染
export const NoteListItem = memo(function NoteListItem({
    note,
}: NoteListItemProps) {
    const preview =
        note.contentMd.trim().length === 0 ? '空内容' : note.contentMd
    return (
        <li className="note-list-item">
            <Link
                to={`/note/${String(note.id)}`}
                className="note-list-item__link"
            >
                <div className="note-list-item__head">
                    <span className="note-list-item__title">{note.title}</span>
                    <time className="note-list-item__time">
                        更新于 {formatUpdatedAt(note.updatedAt)}
                    </time>
                </div>
                <pre className="note-list-item__pre">{preview}</pre>
            </Link>
        </li>
    )
})
