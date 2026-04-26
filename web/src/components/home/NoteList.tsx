import type { Note } from '../../types/note'
import { NoteListItem } from './NoteListItem'
import '../../styles/components/home/note-list.scss'

type NoteListProps = {
    notes: Note[]
    selectable: boolean
    selectedIds: number[]
    onToggleSelect: (id: number, checked: boolean) => void
}

// 笔记列表：由单条 NoteListItem 组成
export function NoteList({
    notes,
    selectable,
    selectedIds,
    onToggleSelect,
}: NoteListProps) {
    return (
        <ul className="note-list">
            {notes.map((n) => (
                <NoteListItem
                    key={n.id}
                    note={n}
                    selectable={selectable}
                    selected={selectedIds.includes(n.id)}
                    onToggleSelect={onToggleSelect}
                />
            ))}
        </ul>
    )
}
