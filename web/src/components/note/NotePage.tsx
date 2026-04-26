import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    Button,
    Drawer,
    FloatButton,
    Input,
    Modal,
    Segmented,
    Select,
    message,
} from 'antd'
import { invoke } from '../../lib/bridge'
import { renderSimpleMarkdown } from '../../lib/simpleMarkdown'
import '../../styles/components/note/note-page.scss'

const TOOLBAR_ITEMS = [
    { label: 'H1', action: '# 标题\n' },
    { label: '粗体', action: '**粗体文本**' },
    { label: '斜体', action: '*斜体文本*' },
    { label: '列表', action: '- 列表项\n' },
    { label: '引用', action: '> 引用内容\n' },
    { label: '链接', action: '[链接标题](https://example.com)' },
] as const

const TEMPLATE_MAP: Record<string, string> = {
    meeting: '# 会议纪要\n\n## 结论\n\n## 待办\n- [ ] ',
    study: '# 学习笔记\n\n## 今日收获\n\n## 关键代码\n```ts\n\n```',
    daily: '# 日报\n\n## 今日完成\n\n## 明日计划\n',
}

export function NotePageView() {
    const { noteId = '' } = useParams()
    const navigate = useNavigate()
    const isNew = noteId === 'new' || noteId === ''
    const idNum = isNew ? NaN : Number(noteId)

    const [title, setTitle] = useState('')
    const [contentMd, setContentMd] = useState('')
    const [mode, setMode] = useState<'edit' | 'preview'>('edit')
    const [templateType, setTemplateType] = useState('')
    const [codeLang, setCodeLang] = useState('ts')
    const [toolsOpen, setToolsOpen] = useState(false)

    const [isPinned, setIsPinned] = useState(false)
    const [isFavorite, setIsFavorite] = useState(false)
    const [tagsInput, setTagsInput] = useState('')

    const [fontSize, setFontSize] = useState(16)
    const [lineWidth, setLineWidth] = useState(860)
    const [autoSaveMs, setAutoSaveMs] = useState(1200)

    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
    const [loadError, setLoadError] = useState('')
    const [initialSnapshot, setInitialSnapshot] = useState({
        title: '',
        contentMd: '',
        tagsInput: '',
    })

    // 仅在编辑已有笔记时进入初始 loading，新建页直接可编辑
    const [loading, setLoading] = useState(() => (isNew ? false : Number.isFinite(idNum)))
    const savingRef = useRef(false)
    const autoTimerRef = useRef<number | null>(null)

    const isDirty =
        title !== initialSnapshot.title ||
        contentMd !== initialSnapshot.contentMd ||
        tagsInput !== initialSnapshot.tagsInput

    const previewHtml = useMemo(() => renderSimpleMarkdown(contentMd), [contentMd])

    const savedTimeLabel = useMemo(() => {
        if (lastSavedAt == null) {
            return '尚未保存'
        }
        return new Intl.DateTimeFormat('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }).format(lastSavedAt)
    }, [lastSavedAt])

    const appendText = useCallback((text: string) => {
        setContentMd((prev) => (prev.trim().length === 0 ? text : `${prev}\n${text}`))
    }, [])

    useEffect(() => {
        invoke('getSettings', {})
            .then((d) => {
                setFontSize(d.fontSize)
                setLineWidth(d.lineWidth)
                setAutoSaveMs(d.autoSaveMs)
            })
            .catch(() => {
                // 设置读取失败时保留默认值，不中断主流程
            })
    }, [])

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
                setLoadError('')
                setTitle(n.title)
                setContentMd(n.contentMd)
                setIsPinned((n.isPinned ?? 0) === 1)
                setIsFavorite((n.isFavorite ?? 0) === 1)
                const tags = (n.tags ?? []).join(', ')
                setTagsInput(tags)
                setInitialSnapshot({ title: n.title, contentMd: n.contentMd, tagsInput: tags })
                setLastSavedAt(n.updatedAt)
                setSaveState('idle')
            })
            .catch((e) => {
                if (!cancelled) {
                    message.error(String(e))
                    setLoadError('加载失败，请稍后重试')
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [idNum, isNew, navigate])

    const saveNote = useCallback(
        async (source: 'manual' | 'auto') => {
            if (savingRef.current || !isDirty) {
                return
            }
            if (source === 'auto' && title.trim() === '' && contentMd.trim() === '') {
                return
            }
            savingRef.current = true
            setSaveState('saving')
            const payload = isNew
                ? { title, content_md: contentMd }
                : { id: idNum, title, content_md: contentMd }
            try {
                const d = await invoke('saveNote', payload)
                const finalId = isNew ? d.id : idNum
                const tags = tagsInput
                    .split(',')
                    .map((x) => x.trim())
                    .filter((x) => x.length > 0)
                if (finalId > 0) {
                    await invoke('updateNoteTags', { id: finalId, tags })
                }
                setInitialSnapshot({ title, contentMd, tagsInput })
                setLastSavedAt(Date.now())
                setSaveState('saved')
                if (source === 'manual') {
                    message.success('已保存')
                }
                if (isNew) {
                    navigate(`/note/${d.id}`, { replace: true })
                }
            } catch (e) {
                setSaveState('error')
                message.error(String(e))
            } finally {
                savingRef.current = false
            }
        },
        [contentMd, idNum, isDirty, isNew, navigate, tagsInput, title],
    )

    const onTogglePinned = useCallback(async () => {
        if (isNew || !Number.isFinite(idNum)) {
            return
        }
        const next = !isPinned
        setIsPinned(next)
        try {
            await invoke('setPinned', { id: idNum, pinned: next })
        } catch (e) {
            setIsPinned(!next)
            message.error(String(e))
        }
    }, [idNum, isNew, isPinned])

    const onToggleFavorite = useCallback(async () => {
        if (isNew || !Number.isFinite(idNum)) {
            return
        }
        const next = !isFavorite
        setIsFavorite(next)
        try {
            await invoke('setFavorite', { id: idNum, favorite: next })
        } catch (e) {
            setIsFavorite(!next)
            message.error(String(e))
        }
    }, [idNum, isFavorite, isNew])

    const onInsertImage = useCallback(
        async (source: 'camera' | 'gallery') => {
            try {
                const d = await invoke('pickImage', { source })
                appendText(d.markdown)
                setToolsOpen(false)
            } catch (e) {
                message.error(String(e))
            }
        },
        [appendText],
    )

    const onDelete = useCallback(() => {
        if (isNew) {
            return
        }
        Modal.confirm({
            title: '确认删除这篇笔记吗？',
            content: '删除后不可恢复',
            okText: '删除',
            cancelText: '取消',
            okButtonProps: { danger: true },
            onOk: () =>
                invoke('deleteNote', { id: idNum })
                    .then(() => {
                        message.success('已删除')
                        navigate('/')
                    })
                    .catch((e) => message.error(String(e))),
        })
    }, [idNum, isNew, navigate])

    const confirmLeave = useCallback(() => {
        if (!isDirty || saveState === 'saving') {
            return true
        }
        return window.confirm('当前有未保存修改，确定离开吗？')
    }, [isDirty, saveState])

    useEffect(() => {
        if (!isDirty) {
            return
        }
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault()
            e.returnValue = ''
        }
        window.addEventListener('beforeunload', handler)
        return () => {
            window.removeEventListener('beforeunload', handler)
        }
    }, [isDirty])

    useEffect(() => {
        if (loading || !isDirty) {
            if (autoTimerRef.current != null) {
                window.clearTimeout(autoTimerRef.current)
                autoTimerRef.current = null
            }
            return
        }
        if (autoTimerRef.current != null) {
            window.clearTimeout(autoTimerRef.current)
        }
        autoTimerRef.current = window.setTimeout(() => {
            saveNote('auto')
            autoTimerRef.current = null
        }, autoSaveMs)
        return () => {
            if (autoTimerRef.current != null) {
                window.clearTimeout(autoTimerRef.current)
                autoTimerRef.current = null
            }
        }
    }, [autoSaveMs, isDirty, loading, saveNote])

    if (!isNew && !Number.isFinite(idNum)) {
        return <p className="note-page__err">无效 id</p>
    }

    if (loading) {
        return <p className="note-page__hint">加载中...</p>
    }

    if (loadError) {
        return <p className="note-page__err">{loadError}</p>
    }

    return (
        <div className="note-page" style={{ maxWidth: `${lineWidth}px` }}>
            <div className="note-page__bar">
                <Button
                    onClick={() => {
                        if (confirmLeave()) {
                            navigate(-1)
                        }
                    }}
                >
                    返回
                </Button>
                <Button
                    type="primary"
                    onClick={() => saveNote('manual')}
                    loading={saveState === 'saving'}
                >
                    保存
                </Button>
                {!isNew && (
                    <Button danger onClick={onDelete} loading={saveState === 'saving'}>
                        删除
                    </Button>
                )}
                <Button onClick={onTogglePinned} disabled={isNew}>
                    {isPinned ? '取消置顶' : '置顶'}
                </Button>
                <Button onClick={onToggleFavorite} disabled={isNew}>
                    {isFavorite ? '取消收藏' : '收藏'}
                </Button>
                <Segmented<'edit' | 'preview'>
                    value={mode}
                    onChange={(v) => setMode(v)}
                    options={[
                        { label: '编辑', value: 'edit' },
                        { label: '预览', value: 'preview' },
                    ]}
                />
            </div>

            <p className={`note-page__status note-page__status--${saveState}`}>
                {saveState === 'saving' && '保存中...'}
                {saveState === 'saved' && `已保存 ${savedTimeLabel}`}
                {saveState === 'error' && '保存失败，请重试'}
                {saveState === 'idle' && (isDirty ? '有未保存修改' : `已同步 ${savedTimeLabel}`)}
            </p>

            <Input
                className="note-page__title"
                placeholder="标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />

            <Input
                className="note-page__title"
                placeholder="标签，使用逗号分隔"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
            />

            {mode === 'edit' ? (
                <Input.TextArea
                    className="note-page__body"
                    placeholder="Markdown 正文"
                    value={contentMd}
                    style={{ fontSize: `${fontSize}px` }}
                    onChange={(e) => setContentMd(e.target.value)}
                    rows={16}
                    autoSize={{ minRows: 12, maxRows: 32 }}
                />
            ) : (
                <article
                    className="note-page__preview"
                    style={{ fontSize: `${fontSize}px` }}
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
            )}

            {isDirty && (
                <p className="note-page__leave-hint">你有未保存内容，离开页面前会再次提醒。</p>
            )}

            {/* 编辑增强放入悬浮入口，避免长期占用正文区域 */}
            <FloatButton
                description="增强"
                type="primary"
                onClick={() => setToolsOpen(true)}
            />

            <Drawer
                title="编辑增强"
                placement="bottom"
                height={340}
                open={toolsOpen}
                onClose={() => setToolsOpen(false)}
            >
                <div className="note-page__tools">
                    {TOOLBAR_ITEMS.map((item) => (
                        <Button key={item.label} onClick={() => appendText(item.action)}>
                            {item.label}
                        </Button>
                    ))}
                    <Select
                        className="note-page__lang-select"
                        value={codeLang}
                        onChange={setCodeLang}
                        options={[
                            { label: 'TypeScript', value: 'ts' },
                            { label: 'Java', value: 'java' },
                            { label: 'Kotlin', value: 'kotlin' },
                            { label: 'JSON', value: 'json' },
                            { label: 'Bash', value: 'bash' },
                        ]}
                    />
                    <Button onClick={() => appendText(`\`\`\`${codeLang}\n\n\`\`\``)}>
                        插入代码块
                    </Button>
                    <Select
                        className="note-page__template-select"
                        placeholder="快捷模板"
                        value={templateType || undefined}
                        onChange={(v) => {
                            setTemplateType(v)
                            appendText(TEMPLATE_MAP[v])
                        }}
                        options={[
                            { label: '会议纪要', value: 'meeting' },
                            { label: '学习笔记', value: 'study' },
                            { label: '日报', value: 'daily' },
                        ]}
                    />
                    <Button onClick={() => onInsertImage('camera')}>拍照插图</Button>
                    <Button onClick={() => onInsertImage('gallery')}>相册插图</Button>
                </div>
            </Drawer>
        </div>
    )
}
