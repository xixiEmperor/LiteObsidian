import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Input, message } from 'antd'
import { invoke } from '../../lib/bridge'
import '../../styles/components/note/note-page.scss'

// 单篇：新建 /note/new；编辑 /note/:id（由 pages/NotePage 以 key 区分路由，切 id 时整树重置）
export function NotePageView() {
  const { noteId = '' } = useParams()
  const navigate = useNavigate()
  const isNew = noteId === 'new' || noteId === ''
  const idNum = isNew ? NaN : Number(noteId)
  const [title, setTitle] = useState('')
  const [contentMd, setContentMd] = useState('')
  const [saving, setSaving] = useState(false)
  // 仅在有合法数字 id 的编辑态一开始为 true；非法 id 直接 false，与首屏 err 一致
  const [loading, setLoading] = useState(() => (isNew ? false : Number.isFinite(idNum)))

  useEffect(() => {
    if (isNew || !Number.isFinite(idNum)) {
      return
    }
    let cancelled = false
    invoke('getNoteById', { id: idNum })
      .then((d) => {
        if (cancelled) return
        const n = d.note
        if (!n) {
          message.error('笔记不存在')
          navigate('/', { replace: true })
          return
        }
        setTitle(n.title)
        setContentMd(n.contentMd)
      })
      .catch((e) => {
        if (!cancelled) message.error(String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isNew, idNum, navigate])

  const onSave = () => {
    setSaving(true)
    const p = isNew
      ? { title, content_md: contentMd }
      : { id: idNum, title, content_md: contentMd }
    invoke('saveNote', p)
      .then((d) => {
        message.success('已保存')
        if (isNew) {
          navigate(`/note/${d.id}`, { replace: true })
        }
      })
      .catch((e) => message.error(String(e)))
      .finally(() => setSaving(false))
  }

  const onDelete = () => {
    if (isNew) {
      return
    }
    setSaving(true)
    invoke('deleteNote', { id: idNum })
      .then(() => {
        message.success('已删除')
        navigate('/')
      })
      .catch((e) => message.error(String(e)))
      .finally(() => setSaving(false))
  }

  if (!isNew && !Number.isFinite(idNum)) {
    return <p className="note-page__err">无效 id</p>
  }

  if (loading) {
    return <p className="note-page__hint">加载中…</p>
  }

  return (
    <div className="note-page">
      <div className="note-page__bar">
        <Button onClick={() => navigate(-1)}>返回</Button>
        <Button type="primary" onClick={onSave} loading={saving}>
          保存
        </Button>
        {!isNew && (
          <Button danger onClick={onDelete} loading={saving}>
            删除
          </Button>
        )}
      </div>
      <Input
        className="note-page__title"
        placeholder="标题"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Input.TextArea
        className="note-page__body"
        placeholder="Markdown 正文"
        value={contentMd}
        onChange={(e) => setContentMd(e.target.value)}
        rows={16}
        autoSize={{ minRows: 12, maxRows: 32 }}
      />
    </div>
  )
}
