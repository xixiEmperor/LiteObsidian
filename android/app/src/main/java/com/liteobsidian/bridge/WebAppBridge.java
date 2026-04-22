package com.liteobsidian.bridge;

import android.content.Context;
import android.util.Log;
import android.webkit.JavascriptInterface;

// WebView.addJavascriptInterface(本类实例, JS_INTERFACE_NAME) 之后，页面里的 JavaScript 可通过全局对象
// window.hybrid（与 JS_INTERFACE_NAME 一致）访问本类中被 @JavascriptInterface 标注的方法。
// 自 Android 4.2 起，供 JS 调用的方法必须带 @JavascriptInterface，否则不会暴露给 JS，这是安全基线。
// 从 JS 调用 invoke 时，代码运行在 WebView 的桥接线程上：不要在这里直接改 UI；耗时操作应放到后台并在主线程汇总结果。
// 与 H5 的契约：第一参为协议里的「方法名」字符串，第二参为该方法入参的 JSON 文本（无参可用 "{}" 或 ""，以团队约定为准）。

/**
 * 与 H5 约定的统一入口：仅暴露 invoke(methodName, paramsJson)。后续按方法名分派到 SQLite 等。
 */
public final class WebAppBridge {
    // 与开发文档 3.2.1 一致，便于在 Logcat 中过滤
    public static final String JS_INTERFACE_NAME = "hybrid";
    private static final String TAG = "WebAppBridge";
    // ApplicationContext 避免内存泄漏
    private final Context appContext;

    public WebAppBridge(Context context) {
        // 持有 ApplicationContext：避免间接长期引用 Activity 导致配置变更或旋转后仍持有已销毁的 Activity。
        this.appContext = context.getApplicationContext();
    }

    // 与前端 window.hybrid.invoke(端方法名, 传参) 对应；第二参一般为 JSON 字符串
    // 前端侧通常对对象做 JSON.stringify 后再传入；此处对 null 兜底为空串，避免原生解析前 NPE。
    @JavascriptInterface
    public void invoke(String methodName, String paramsJson) {
        if (methodName == null) {
            methodName = "";
        }
        if (paramsJson == null) {
            paramsJson = "";
        }
        Log.d(TAG, "invoke method=" + methodName + " params=" + paramsJson);
        // 后续: switch(methodName) 调 Repository 等
    }
}
