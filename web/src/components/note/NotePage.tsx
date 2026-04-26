import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Input, Modal, Segmented, message } from 'antd'
import { invoke } from '../../lib/bridge'
import { renderSimpleMarkdown } from '../../lib/simpleMarkdown'
import '../../styles/components/note/note-page.scss'

// 单篇：新建 /note/new；编辑 /note/:id（由 pages/NotePage 以 key 区分路由，切 id 时整树重置）
export function NotePageView() {
    const { noteId = '' } = useParams()
    const navigate = useNavigate()
    const isNew = noteId === 'new' || noteId === ''
    const idNum = isNew ? NaN : Number(noteId)
    const [title, setTitle] = useState('')
    const [contentMd, setContentMd] = useState('')
    const [mode, setMode] = useState<'edit' | 'preview'>('edit')
    const [saveState, setSaveState] = useState<
        'idle' | 'saving' | 'saved' | 'error'
    >('idle')
    const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
    const [loadError, setLoadError] = useState('')
    const [initialSnapshot, setInitialSnapshot] = useState({
        title: '',
        contentMd: '',
    })
    // 仅在有合法数字 id 的编辑态一开始为 true；非法 id 直接 false，与首屏 err 一致
    const [loading, setLoading] = useState(() =>
        isNew ? false : Number.isFinite(idNum),
    )
    const savingRef = useRef(false)
    const autoTimerRef = useRef<number | null>(null)
    const isDirty =
        title !== initialSnapshot.title ||
        contentMd !== initialSnapshot.contentMd
    const previewHtml = useMemo(
        () => renderSimpleMarkdown(contentMd),
        [contentMd],
    )
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
                // 加载完成后把快照对齐，后续才以此判断是否未保存。
                setInitialSnapshot({ title: n.title, contentMd: n.contentMd })
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
    }, [isNew, idNum, navigate])

    const saveNote = useCallback(
        (source: 'manual' | 'auto') => {
            if (savingRef.current || !isDirty) {
                return
            }
            // 新建空白页不触发自动落库，避免进页面就生成无意义空笔记。
            if (
                source === 'auto' &&
                title.trim() === '' &&
                contentMd.trim() === ''
            ) {
                return
            }
            savingRef.current = true
            setSaveState('saving')
            const p = isNew
                ? { title, content_md: contentMd }
                : { id: idNum, title, content_md: contentMd }
            invoke('saveNote', p)
                .then((d) => {
                    setInitialSnapshot({ title, contentMd })
                    setLastSavedAt(Date.now())
                    setSaveState('saved')
                    if (source === 'manual') {
                        message.success('已保存')
                    }
                    if (isNew) {
                        navigate(`/note/${d.id}`, { replace: true })
                    }
                })
                .catch((e) => {
                    setSaveState('error')
                    message.error(String(e))
                })
                .finally(() => {
                    savingRef.current = false
                })
        },
        [contentMd, idNum, isDirty, isNew, navigate, title],
    )

    const onSave = useCallback(() => {
        saveNote('manual')
    }, [saveNote])

    const onDelete = () => {
        if (isNew) {
            return
        }
        Modal.confirm({
            title: '确认删除这篇笔记吗',
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
    }

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
            // 浏览器和 WebView 的 beforeunload 文案通常由系统统一，不使用自定义文本。
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
        }, 1200)
        return () => {
            if (autoTimerRef.current != null) {
                window.clearTimeout(autoTimerRef.current)
                autoTimerRef.current = null
            }
        }
    }, [contentMd, isDirty, loading, saveNote, title])

    if (!isNew && !Number.isFinite(idNum)) {
        return <p className="note-page__err">无效 id</p>
    }

    if (loading) {
        return <p className="note-page__hint">加载中…</p>
    }

    if (loadError) {
        return <p className="note-page__err">{loadError}</p>
    }

    return (
        <div className="note-page">
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
                    onClick={onSave}
                    loading={saveState === 'saving'}
                >
                    保存
                </Button>
                {!isNew && (
                    <Button
                        danger
                        onClick={onDelete}
                        loading={saveState === 'saving'}
                    >
                        删除
                    </Button>
                )}
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
                {saveState === 'idle' &&
                    (isDirty ? '有未保存修改' : `已同步 ${savedTimeLabel}`)}
            </p>
            <Input
                className="note-page__title"
                placeholder="标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />
            {mode === 'edit' ? (
                <Input.TextArea
                    className="note-page__body"
                    placeholder="Markdown 正文"
                    value={contentMd}
                    onChange={(e) => setContentMd(e.target.value)}
                    rows={16}
                    autoSize={{ minRows: 12, maxRows: 32 }}
                />
            ) : (
                <article
                    className="note-page__preview"
                    // 仅使用 renderSimpleMarkdown 产出的已转义 HTML，避免把用户原始输入直接注入。
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
            )}
            {isDirty && (
                <p className="note-page__leave-hint">
                    你有未保存内容，离开页面前会再次提醒。
                </p>
            )}
        </div>
    )
}
