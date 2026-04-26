import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Select, Switch, Tag, message } from 'antd'
import { getBridgeInfo, invoke } from '../../lib/bridge'
import type { Note } from '../../types/note'
import { BridgeHint } from './BridgeHint'
import { NoteList } from './NoteList'
import '../../styles/components/home/home-page.scss'

export function HomePage() {
    const bridge = getBridgeInfo()
    const navigate = useNavigate()
    const [notes, setNotes] = useState<Note[]>([])
    const [keyword, setKeyword] = useState('')
    const [activeTag, setActiveTag] = useState('')
    const [favoritesOnly, setFavoritesOnly] = useState(false)
    const [selectMode, setSelectMode] = useState(false)
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [loadError, setLoadError] = useState('')
    const [loading, setLoading] = useState(true)

    const allTags = useMemo(() => {
        return Array.from(
            new Set(notes.flatMap((n) => n.tags ?? [])),
        ).sort((a, b) => a.localeCompare(b, 'zh-CN'))
    }, [notes])

    const fetchNotes = useCallback(() => {
        setLoading(true)
        setLoadError('')
        invoke('listNotes', { keyword, tag: activeTag, favoritesOnly })
            .then((d) => {
                setNotes(d.notes)
            })
            .catch((e) => {
                setNotes([])
                setLoadError('加载失败，请检查桥接和数据库状态后重试')
                message.error(String(e))
            })
            .finally(() => setLoading(false))
    }, [activeTag, favoritesOnly, keyword])

    useEffect(() => {
        const timer = window.setTimeout(fetchNotes, 0)
        return () => {
            window.clearTimeout(timer)
        }
    }, [fetchNotes])

    const sortedNotes = useMemo(() => {
        return [...notes].sort((a, b) => {
            if ((b.isPinned ?? 0) !== (a.isPinned ?? 0)) {
                return (b.isPinned ?? 0) - (a.isPinned ?? 0)
            }
            return (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
        })
    }, [notes])

    const filteredNotes = useMemo(() => {
        const q = keyword.trim().toLowerCase()
        return sortedNotes.filter((n) => {
            if (favoritesOnly && (n.isFavorite ?? 0) !== 1) {
                return false
            }
            if (activeTag && !(n.tags ?? []).includes(activeTag)) {
                return false
            }
            if (q.length === 0) {
                return true
            }
            return (
                n.title.toLowerCase().includes(q) ||
                n.contentMd.toLowerCase().includes(q)
            )
        })
    }, [activeTag, favoritesOnly, keyword, sortedNotes])

    const togglePicked = useCallback((id: number, checked: boolean) => {
        setSelectedIds((prev) => {
            if (checked) {
                return prev.includes(id) ? prev : [...prev, id]
            }
            return prev.filter((x) => x !== id)
        })
    }, [])

    const onExport = useCallback(
        async () => {
            if (selectedIds.length === 0) {
                message.warning('请先勾选要导出的笔记')
                return
            }
            try {
                const res = await invoke('exportNotes', {
                    ids: selectedIds,
                    format: 'md',
                })
                if (res.text) {
                    const blob = new Blob([res.text], { type: 'text/plain;charset=utf-8' })
                    const a = document.createElement('a')
                    a.href = URL.createObjectURL(blob)
                    a.download = res.fileName ?? 'notes-export.md'
                    document.body.appendChild(a)
                    a.click()
                    a.remove()
                }
                message.success('导出成功')
            } catch (e) {
                message.error(String(e))
            }
        },
        [selectedIds],
    )

    const onImport = useCallback(async () => {
        const text = window.prompt('请输入要导入的 Markdown 内容')
        if (text == null) {
            return
        }
        const title = window.prompt('请输入导入笔记标题') ?? '导入笔记'
        try {
            await invoke('importMarkdown', { text, title })
            message.success('导入成功')
            fetchNotes()
        } catch (e) {
            message.error(String(e))
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
                <Button onClick={onImport}>导入 .md</Button>
                <Button onClick={() => navigate('/settings')}>设置中心</Button>
                <Button
                    onClick={() => {
                        // 常态列表不可选，只有进入导出模式后才显示勾选
                        setSelectMode((prev) => !prev)
                        setSelectedIds([])
                    }}
                >
                    {selectMode ? '取消选择' : '选择导出'}
                </Button>
                {selectMode && <Button onClick={onExport}>导出已选 .md</Button>}
                <Input
                    className="home-page__search"
                    allowClear
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="搜索标题或正文"
                />
                <Select
                    allowClear
                    className="home-page__tag-filter"
                    placeholder="标签筛选"
                    value={activeTag || undefined}
                    options={allTags.map((t) => ({ label: t, value: t }))}
                    onChange={(v) => setActiveTag(v ?? '')}
                />
                <label className="home-page__favorite-toggle">
                    <Switch
                        checked={favoritesOnly}
                        onChange={(checked) => setFavoritesOnly(checked)}
                    />
                    <span>仅收藏</span>
                </label>
            </div>
            {allTags.length > 0 && (
                <div className="home-page__tags-bar">
                    {allTags.map((tag) => (
                        <Tag
                            key={tag}
                            color={activeTag === tag ? 'blue' : 'default'}
                            onClick={() => setActiveTag((prev) => (prev === tag ? '' : tag))}
                        >
                            {tag}
                        </Tag>
                    ))}
                </div>
            )}
            {loadError ? (
                <p className="home-page__err">{loadError}</p>
            ) : loading && notes.length === 0 ? (
                <p className="home-page__hint">加载中...</p>
            ) : filteredNotes.length === 0 ? (
                <p className="home-page__hint">
                    {keyword.trim() || activeTag || favoritesOnly
                        ? '没有匹配到笔记，请换个筛选条件'
                        : '还没有笔记，先新建一篇'}
                </p>
            ) : (
                <NoteList
                    notes={filteredNotes}
                    selectable={selectMode}
                    selectedIds={selectedIds}
                    onToggleSelect={togglePicked}
                />
            )}
        </section>
    )
}
