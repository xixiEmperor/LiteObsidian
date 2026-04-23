import { useParams } from 'react-router-dom'
import { NotePageView } from '../components/note/NotePage'

// 以 noteId 为 key 切换时重置子组件内部 state，且子组件的 effect 内不再同步 setLoading
export function NotePage() {
  const { noteId = '' } = useParams()
  return <NotePageView key={noteId} />
}
