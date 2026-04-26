// 与 Android WebView 的 JavascriptInterface 通信；浏览器中无 hybrid 时走 mock
import type { Note } from '../types/note'

export type BridgeMethod =
    | 'listNotes'
    | 'getNoteById'
    | 'saveNote'
    | 'deleteNote'
    | 'setPinned'
    | 'setFavorite'
    | 'updateNoteTags'
    | 'listTags'
    | 'getSettings'
    | 'saveSettings'
    | 'importMarkdown'
    | 'exportNotes'
    | 'pickImage'

export type AppSettings = {
    fontSize: number
    lineWidth: number
    autoSaveMs: number
    followSystemTheme: boolean
}

export type BridgeParams = {
    listNotes: {
        offset?: number
        limit?: number
        keyword?: string
        tag?: string
        favoritesOnly?: boolean
    }
    getNoteById: { id: number }
    saveNote: {
        id?: number
        title?: string
        content_md?: string
        contentMd?: string
    }
    deleteNote: { id: number }
    setPinned: { id: number; pinned: boolean }
    setFavorite: { id: number; favorite: boolean }
    updateNoteTags: { id: number; tags: string[] }
    listTags: Record<string, never>
    getSettings: Record<string, never>
    saveSettings: Partial<AppSettings>
    importMarkdown: { text?: string; title?: string }
    exportNotes: { ids: number[]; format: 'md' }
    pickImage: { source: 'camera' | 'gallery' }
}

export type BridgeData = {
    listNotes: { notes: Note[] }
    getNoteById: { note: Note | null }
    saveNote: { ok: true; id: number }
    deleteNote: { ok: true }
    setPinned: { ok: true }
    setFavorite: { ok: true }
    updateNoteTags: { ok: true }
    listTags: { tags: string[] }
    getSettings: AppSettings
    saveSettings: AppSettings
    importMarkdown: { ok: true; id: number }
    exportNotes: { ok: true; text?: string; fileName?: string }
    pickImage: { ok: true; markdown: string }
}

export type NativePayload =
    | { callbackId: string; ok: true; data: unknown }
    | { callbackId: string; ok: false; code: string; error: string }

export type BridgeInfo = { mode: 'android' | 'browser'; label: string }

export type Invoke = <M extends BridgeMethod>(
    method: M,
    params: BridgeParams[M],
) => Promise<BridgeData[M]>

declare global {
    interface Window {
        hybrid?: { invoke: (method: string, paramsJson: string) => void }
        liteobsidianOnNative?: (payload: NativePayload) => void
        invoke: Invoke
    }
}

let callbackSeq = 0
const pending = new Map<string, (p: NativePayload) => void>()

function installNativeCallback() {
    if (typeof window === 'undefined') {
        return
    }
    window.liteobsidianOnNative = (p) => {
        const fn = pending.get(p.callbackId)
        if (fn) {
            pending.delete(p.callbackId)
            fn(p)
        }
    }
}
installNativeCallback()

export function isAndroidWebView(): boolean {
    return typeof window !== 'undefined' && window.hybrid != null
}

export function getBridgeInfo(): BridgeInfo {
    if (isAndroidWebView()) {
        return { mode: 'android', label: 'Android WebView' }
    }
    return { mode: 'browser', label: '浏览器（无 hybrid，使用 mock 数据）' }
}

export const invoke: Invoke = (method, params) => {
    return new Promise((resolve, reject) => {
        const callbackId = `cb_${++callbackSeq}_${Date.now()}`
        const onResult = (p: NativePayload) => {
            if (p.ok) {
                resolve(p.data as BridgeData[typeof method])
                return
            }
            const e = p as Extract<NativePayload, { ok: false }>
            reject(new Error(`${e.code}: ${e.error}`))
        }
        pending.set(callbackId, onResult)
        const body: Record<string, unknown> = { ...params, callbackId }
        const paramsJson = JSON.stringify(body)
        if (isAndroidWebView() && window.hybrid?.invoke) {
            window.hybrid.invoke(method, paramsJson)
        } else {
            window.setTimeout(() => runMock(method, body, onResult), 0)
        }
    })
}

if (typeof window !== 'undefined') {
    window.invoke = invoke
}

const mockSettings: AppSettings = {
    fontSize: 16,
    lineWidth: 860,
    autoSaveMs: 1200,
    followSystemTheme: true,
}

function nowNote(id: number, title: string, contentMd: string): Note {
    return {
        id,
        title,
        contentMd,
        updatedAt: Date.now(),
        isDeleted: 0,
        isPinned: 0,
        isFavorite: 0,
        lastOpenedAt: Date.now(),
        tags: [],
    }
}

let mockNotes: Note[] = [
    nowNote(1, '课程计划', '# 本周任务\n\n- 完成桥接接口'),
    nowNote(2, '会议纪要', '## 结论\n\n1. 先做离线能力'),
]

function runMock(
    method: BridgeMethod,
    body: Record<string, unknown>,
    onResult: (p: NativePayload) => void,
) {
    const callbackId = String(body.callbackId ?? '')
    const ok = (data: unknown) => onResult({ callbackId, ok: true, data })
    const err = (code: string, message: string) =>
        onResult({ callbackId, ok: false, code, error: message })

    if (method === 'listNotes') {
        const keyword = String(body.keyword ?? '').trim().toLowerCase()
        const tag = String(body.tag ?? '').trim().toLowerCase()
        const favoritesOnly = Boolean(body.favoritesOnly)
        const list = mockNotes
            .filter((n) => (favoritesOnly ? n.isFavorite === 1 : true))
            .filter((n) =>
                keyword
                    ? n.title.toLowerCase().includes(keyword) ||
                      n.contentMd.toLowerCase().includes(keyword)
                    : true,
            )
            .filter((n) =>
                tag ? (n.tags ?? []).some((t) => t.toLowerCase() === tag) : true,
            )
            .sort((a, b) => {
                if ((b.isPinned ?? 0) !== (a.isPinned ?? 0)) {
                    return (b.isPinned ?? 0) - (a.isPinned ?? 0)
                }
                return (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
            })
        ok({ notes: list })
        return
    }

    if (method === 'getNoteById') {
        const id = Number(body.id)
        const note = mockNotes.find((n) => n.id === id) ?? null
        ok({ note })
        return
    }

    if (method === 'saveNote') {
        const id = Number(body.id ?? 0)
        const title = String(body.title ?? '').trim() || '未命名'
        const contentMd =
            String(body.content_md ?? body.contentMd ?? '')
        if (id > 0) {
            mockNotes = mockNotes.map((n) =>
                n.id === id ? { ...n, title, contentMd, updatedAt: Date.now() } : n,
            )
            ok({ ok: true, id })
            return
        }
        const newId =
            mockNotes.length > 0 ? Math.max(...mockNotes.map((n) => n.id)) + 1 : 1
        mockNotes.unshift(
            nowNote(newId, title, contentMd),
        )
        ok({ ok: true, id: newId })
        return
    }

    if (method === 'deleteNote') {
        const id = Number(body.id)
        mockNotes = mockNotes.filter((n) => n.id !== id)
        ok({ ok: true })
        return
    }

    if (method === 'setPinned') {
        const id = Number(body.id)
        const pinned = body.pinned === true ? 1 : 0
        mockNotes = mockNotes.map((n) =>
            n.id === id ? { ...n, isPinned: pinned, updatedAt: Date.now() } : n,
        )
        ok({ ok: true })
        return
    }

    if (method === 'setFavorite') {
        const id = Number(body.id)
        const favorite = body.favorite === true ? 1 : 0
        mockNotes = mockNotes.map((n) =>
            n.id === id ? { ...n, isFavorite: favorite, updatedAt: Date.now() } : n,
        )
        ok({ ok: true })
        return
    }

    if (method === 'updateNoteTags') {
        const id = Number(body.id)
        const tags = Array.isArray(body.tags)
            ? body.tags.map((t) => String(t).trim()).filter((t) => t.length > 0)
            : []
        mockNotes = mockNotes.map((n) => (n.id === id ? { ...n, tags } : n))
        ok({ ok: true })
        return
    }

    if (method === 'listTags') {
        const tags = Array.from(
            new Set(mockNotes.flatMap((n) => n.tags ?? [])),
        ).sort((a, b) => a.localeCompare(b, 'zh-CN'))
        ok({ tags })
        return
    }

    if (method === 'getSettings') {
        ok({ ...mockSettings })
        return
    }

    if (method === 'saveSettings') {
        mockSettings.fontSize = Number(body.fontSize ?? mockSettings.fontSize)
        mockSettings.lineWidth = Number(body.lineWidth ?? mockSettings.lineWidth)
        mockSettings.autoSaveMs = Number(body.autoSaveMs ?? mockSettings.autoSaveMs)
        mockSettings.followSystemTheme = Boolean(
            body.followSystemTheme ?? mockSettings.followSystemTheme,
        )
        ok({ ...mockSettings })
        return
    }

    if (method === 'importMarkdown') {
        const title = String(body.title ?? '').trim() || '导入笔记'
        const text = String(body.text ?? '')
        const newId =
            mockNotes.length > 0 ? Math.max(...mockNotes.map((n) => n.id)) + 1 : 1
        mockNotes.unshift(nowNote(newId, title, text))
        ok({ ok: true, id: newId })
        return
    }

    if (method === 'exportNotes') {
        const ids = Array.isArray(body.ids) ? body.ids.map((x) => Number(x)) : []
        const selected = mockNotes.filter((n) => ids.includes(n.id))
        if (selected.length === 0) {
            err('E_BAD_PARAM', 'no notes selected')
            return
        }
        const merged = selected
            .map((n) => `# ${n.title}\n\n${n.contentMd}`)
            .join('\n\n---\n\n')
        ok({ ok: true, text: merged, fileName: 'notes-export.md' })
        return
    }

    if (method === 'pickImage') {
        const source = body.source === 'camera' ? 'camera' : 'gallery'
        ok({
            ok: true,
            markdown: `![${source}](/mock-images/${Date.now()}.jpg)`,
        })
        return
    }

    const _m: never = method
    err('E_UNKNOWN_METHOD', 'unknown: ' + _m)
}
