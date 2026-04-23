import { memo } from 'react'
import { Link } from 'react-router-dom'
import type { Note } from '../../types/note'
import '../../styles/components/home/note-list-item.scss'

type NoteListItemProps = {
  note: Note
}

// 列表项在笔记增多时由 memo 避免与兄弟项无关的重复渲染
export const NoteListItem = memo(function NoteListItem({ note }: NoteListItemProps) {
  return (
    <li className="note-list-item">
      <Link to={`/note/${String(note.id)}`} className="note-list-item__link">
        <span className="note-list-item__title">{note.title}</span>
        <pre className="note-list-item__pre">{note.contentMd}</pre>
      </Link>
    </li>
  )
})
