import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Checkbox, Tag } from 'antd'
import type { Note } from '../../types/note'
import '../../styles/components/home/note-list-item.scss'

type NoteListItemProps = {
    note: Note
    selectable: boolean
    selected: boolean
    onToggleSelect: (id: number, checked: boolean) => void
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

export const NoteListItem = memo(function NoteListItem({
    note,
    selectable,
    selected,
    onToggleSelect,
}: NoteListItemProps) {
    const preview = note.contentMd.trim().length === 0 ? '空内容' : note.contentMd
    return (
        <li className="note-list-item">
            <div className="note-list-item__row">
                {selectable && (
                    <Checkbox
                        checked={selected}
                        onChange={(e) => onToggleSelect(note.id, e.target.checked)}
                    />
                )}
                {note.isPinned === 1 && <Tag color="blue">置顶</Tag>}
                {note.isFavorite === 1 && <Tag color="gold">收藏</Tag>}
                {(note.tags ?? []).slice(0, 3).map((t) => (
                    <Tag key={t}>{t}</Tag>
                ))}
            </div>
            <Link to={`/note/${String(note.id)}`} className="note-list-item__link">
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
