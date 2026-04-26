import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, message } from 'antd'
import { getBridgeInfo, invoke } from '../../lib/bridge'
import type { Note } from '../../types/note'
import { BridgeHint } from './BridgeHint'
import { NoteList } from './NoteList'
import '../../styles/components/home/home-page.scss'

// 首页：进入时 listNotes，新建跳转 /note/new
export function HomePage() {
    const bridge = getBridgeInfo()
    const navigate = useNavigate()
    const [notes, setNotes] = useState<Note[]>([])
    const [keyword, setKeyword] = useState('')
    const [loadError, setLoadError] = useState('')
    // 首次 loading 为 true，仅在拉取完成后再置 false
    const [loading, setLoading] = useState(true)
    const filteredNotes = useMemo(() => {
        const q = keyword.trim().toLowerCase()
        if (q.length === 0) {
            return notes
        }
        return notes.filter((n) => {
            const inTitle = n.title.toLowerCase().includes(q)
            const inBody = n.contentMd.toLowerCase().includes(q)
            return inTitle || inBody
        })
    }, [keyword, notes])

    const fetchNotes = useCallback(() => {
        setLoading(true)
        setLoadError('')
        invoke('listNotes', {})
            .then((d) => {
                setNotes(d.notes)
            })
            .catch((e) => {
                setNotes([])
                setLoadError('加载失败，请检查桥接和数据库状态后重试')
                message.error(String(e))
            })
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        const timer = window.setTimeout(fetchNotes, 0)
        return () => {
            window.clearTimeout(timer)
        }
    }, [fetchNotes])

    return (
        <section className="home-page">
            <BridgeHint label={bridge.label} />
            <div className="home-page__toolbar">
                <Button type="primary" onClick={() => navigate('/note/new')}>
                    新建笔记
                </Button>
                <Button onClick={fetchNotes} loading={loading}>
                    刷新
                </Button>
                <Input
                    className="home-page__search"
                    allowClear
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="搜索标题或正文"
                />
            </div>
            {loadError ? (
                <p className="home-page__err">{loadError}</p>
            ) : loading && notes.length === 0 ? (
                <p className="home-page__hint">加载中…</p>
            ) : filteredNotes.length === 0 ? (
                <p className="home-page__hint">
                    {keyword.trim()
                        ? '没有匹配到笔记，请换个关键词'
                        : '还没有笔记，先新建一篇'}
                </p>
            ) : (
                <NoteList notes={filteredNotes} />
            )}
        </section>
    )
}
