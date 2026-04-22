// 与 Android WebView 的 JavascriptInterface 通信入口（浏览器开发时用 mock）
declare global {
  interface Window {
    /** 与 Java 层约定名：hybrid */
    hybrid?: {
      // 后续按开发文档增加方法，如 listNotes JSON 等
      invoke: (method: string, params: any) => void
    }
  }
}

export type BridgeInfo = { mode: 'android' | 'browser'; label: string }

// 是否运行在可调用原生的环境
export function isAndroidWebView(): boolean {
  return typeof window !== 'undefined' && window.hybrid != null
}

// 给 UI 展示当前环境
export function getBridgeInfo(): BridgeInfo {
  if (isAndroidWebView()) {
    return { mode: 'android', label: 'Android WebView' }
  }
  return { mode: 'browser', label: '浏览器（无 hybrid，使用 mock 数据）' }
}
