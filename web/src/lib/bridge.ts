// 与 Android WebView 的 JavascriptInterface 通信；浏览器中无 hybrid 时走 mock
import type { Note } from '../types/note'

// 与 Java 分派名对齐，可随协议扩展
export type BridgeMethod =
    | 'listNotes'
    | 'getNoteById'
    | 'saveNote'
    | 'deleteNote'

// 各 method 的入参（由 invoke 在发往原生前整体 JSON.stringify，并附带 callbackId）
export type BridgeParams = {
    listNotes: { offset?: number; limit?: number }
    getNoteById: { id: number }
    saveNote: {
        id?: number
        title?: string
        content_md?: string
        contentMd?: string
    }
    deleteNote: { id: number }
}

// 各 method 在 ok:true 时 data 段的形状；毫秒时间戳见主文档 W-4
export type BridgeData = {
    listNotes: { notes: Note[] }
    getNoteById: { note: Note | null }
    saveNote: { ok: true; id: number }
    deleteNote: { ok: true }
}

export type NativePayload =
    | { callbackId: string; ok: true; data: unknown }
    | { callbackId: string; ok: false; code: string; error: string }

export type BridgeInfo = { mode: 'android' | 'browser'; label: string }

// 对外的唯一调用面：在浏览器环境中挂到 window.invoke，与 hybrid.invoke(method, json) 一一对应
export type Invoke = <M extends BridgeMethod>(
    method: M,
    params: BridgeParams[M],
) => Promise<BridgeData[M]>

declare global {
    interface Window {
        /** 与 Java：WebAppBridge 注入的 hybrid 对象 */
        hybrid?: { invoke: (method: string, paramsJson: string) => void }
        /** 原生经 evaluateJavascript 回传 */
        liteobsidianOnNative?: (payload: NativePayload) => void
        /** 协议单入口，参数对象会在内部转 JSON 再交给 hybrid */
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

// 与 hybrid 约定两参，第二参为 JSON 字符串
export const invoke: Invoke = (method, params) => {
    return new Promise((resolve, reject) => {
        const callbackId = `cb_${++callbackSeq}_${Date.now()}`
        const onResult = (p: NativePayload) => {
            if (p.ok) {
                resolve(p.data as BridgeData[typeof method])
                return
            }
            // 与 ok: false 分支对应，便于收窄类型
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

function runMock(
    method: BridgeMethod,
    body: Record<string, unknown>,
    onResult: (p: NativePayload) => void,
) {
    const callbackId = String(body.callbackId ?? '')
    const ok = (data: unknown) => onResult({ callbackId, ok: true, data })
    const err = (code: string, message: string) =>
        onResult({ callbackId, ok: false, code, error: message })
    const now = Date.now()
    if (method === 'listNotes') {
        ok({
            notes: [
                {
                    id: 1,
                    title: 'Mock 示例 A',
                    contentMd: '# 标题\n\n在浏览器 mock 中查看。',
                    updatedAt: now,
                    isDeleted: 0,
                },
                {
                    id: 2,
                    title: 'Mock 示例 B',
                    contentMd: '正文 **粗体**',
                    updatedAt: now - 1000,
                    isDeleted: 0,
                },
            ],
        })
        return
    }
    if (method === 'getNoteById') {
        const id = Number(body.id)
        if (!Number.isFinite(id)) {
            err('E_BAD_PARAM', 'bad id')
            return
        }
        ok({
            note: {
                id,
                title: 'Mock 笔记 ' + id,
                contentMd:
                    `### 1.2 现在的主要短板

- 详情页还是纯文本编辑，没有 Markdown 预览体验。
- 首页没有搜索和排序切换，笔记多了以后不好找。
- 自动保存和编辑状态提示还没有，容易让人不确定有没有保存成功。
- 还没有一键同步 web/dist 到 Android assets 的脚本。
- 缺少最基本的联调自测清单和回归检查动作。` + id,
                updatedAt: now,
                isDeleted: 0,
            },
        })
        return
    }
    if (method === 'saveNote') {
        const hasId = body.id != null && Number(body.id) > 0
        const newId = hasId ? Number(body.id) : 9999
        ok({ ok: true, id: newId })
        return
    }
    if (method === 'deleteNote') {
        ok({ ok: true })
        return
    }
    const _m: never = method
    err('E_UNKNOWN_METHOD', 'unknown: ' + _m)
}
