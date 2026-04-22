import type { Note } from '../../types/note'
import '../../styles/components/home/note-list-item.scss'

type NoteListItemProps = {
  note: Note
}

export function NoteListItem({ note }: NoteListItemProps) {
  return (
    <li className="note-list-item">
      <span className="note-list-item__title">{note.title}</span>
      <pre className="note-list-item__pre">{note.content}</pre>
    </li>
  )
}
