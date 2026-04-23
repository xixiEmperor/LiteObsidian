import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, message } from 'antd'
import { getBridgeInfo, invoke } from '../../lib/bridge'
import type { Note } from '../../types/note'
import { BridgeHint } from './BridgeHint'
import { NoteList } from './NoteList'
import '../../styles/components/home/home-page.scss'

// 首次进页与点「刷新」共用的拉取逻辑（不在 effect 里同步 setState，避免与 eslint 推荐冲突）
function listNotesWithFeedback(
  onNotes: (list: Note[]) => void,
  onDone: () => void,
) {
  invoke('listNotes', {})
    .then((d) => onNotes(d.notes))
    .catch((e) => {
      message.error(String(e))
      onNotes([])
    })
    .finally(onDone)
}

// 首页：进入时 listNotes，新建跳转 /note/new
export function HomePage() {
  const bridge = getBridgeInfo()
  const navigate = useNavigate()
  const [notes, setNotes] = useState<Note[]>([])
  // 首次 loading 为 true，仅在拉取完成后再置 false
  const [loading, setLoading] = useState(true)

  // 只挂在 mount 上拉取；setState 仅出现在 Promise 链上，不触发 set-state-in-effect
  useEffect(() => {
    let cancelled = false
    listNotesWithFeedback(
      (list) => {
        if (!cancelled) setNotes(list)
      },
      () => {
        if (!cancelled) setLoading(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  // 显式点「刷新」时先关 loading 再拉取
  const handleRefresh = useCallback(() => {
    setLoading(true)
    listNotesWithFeedback(setNotes, () => setLoading(false))
  }, [])

  return (
    <section className="home-page">
      <BridgeHint label={bridge.label} />
      <div className="home-page__toolbar">
        <Button type="primary" onClick={() => navigate('/note/new')}>
          新建笔记
        </Button>
        <Button onClick={handleRefresh} loading={loading}>
          刷新
        </Button>
      </div>
      {loading && notes.length === 0 ? (
        <p className="home-page__hint">加载中…</p>
      ) : (
        <NoteList notes={notes} />
      )}
    </section>
  )
}
