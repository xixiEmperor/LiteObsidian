package com.liteobsidian.bridge;

import android.content.Context;
import android.util.Base64;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.liteobsidian.data.Note;
import com.liteobsidian.data.NoteRepository;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

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
    // 与 H5 约定的全局回调：主线程 evaluateJavascript 调起，入参为 JSON 对象
    private static final String JS_CALLBACK_GLOBAL = "liteobsidianOnNative";
    // 单线程跑 Repository，避免与主线程 SQLite 争用；与桥接线程分离
    private static final ExecutorService DB_EXEC = Executors.newSingleThreadExecutor();
    // ApplicationContext 避免内存泄漏
    private final Context appContext;
    private final WebView webView;
    private final NoteRepository noteRepository;

    public WebAppBridge(Context context, WebView webView) {
        // 持有 ApplicationContext：避免间接长期引用 Activity 导致配置变更或旋转后仍持有已销毁的 Activity。
        this.appContext = context.getApplicationContext();
        this.webView = webView;
        this.noteRepository = new NoteRepository(this.appContext);
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
        final String m = methodName;
        final String json = paramsJson;
        DB_EXEC.execute(() -> handleInvokeOnWorker(m, json));
    }

    // 在 DB 线程解析分派，结果通过 deliver 切回主线程调 H5
    private void handleInvokeOnWorker(String methodName, String paramsJson) {
        JSONObject p;
        try {
            p = new JSONObject(paramsJson.isEmpty() ? "{}" : paramsJson);
        } catch (JSONException e) {
            Log.e(TAG, "params JSON parse error", e);
            return;
        }
        String callbackId = p.optString("callbackId", "");
        if (callbackId.isEmpty()) {
            Log.w(TAG, "missing callbackId, cannot deliver result");
            return;
        }
        try {
            switch (methodName) {
                case "listNotes":
                    doListNotes(callbackId, p);
                    break;
                case "getNoteById":
                    doGetNoteById(callbackId, p);
                    break;
                case "saveNote":
                    doSaveNote(callbackId, p);
                    break;
                case "deleteNote":
                    doDeleteNote(callbackId, p);
                    break;
                default:
                    deliverError(callbackId, "E_UNKNOWN_METHOD", "unknown method: " + methodName);
            }
        } catch (JSONException e) {
            Log.e(TAG, "invoke handler json", e);
            deliverError(callbackId, "E_BAD_PARAM", e.getMessage() != null ? e.getMessage() : "bad param");
        } catch (Exception e) {
            Log.e(TAG, "invoke handler", e);
            deliverError(callbackId, "E_DB", e.getMessage() != null ? e.getMessage() : "db error");
        }
    }

    private void doListNotes(String callbackId, JSONObject p) throws JSONException {
        int offset = p.optInt("offset", 0);
        int limit = p.optInt("limit", 1000);
        List<Note> list = noteRepository.list(offset, limit);
        JSONArray arr = new JSONArray();
        for (Note n : list) {
            arr.put(noteToJson(n));
        }
        JSONObject data = new JSONObject();
        data.put("notes", arr);
        deliverSuccess(callbackId, data);
    }

    private void doGetNoteById(String callbackId, JSONObject p) throws JSONException {
        if (!p.has("id")) {
            deliverError(callbackId, "E_BAD_PARAM", "missing id");
            return;
        }
        long id = p.getLong("id");
        Note n = noteRepository.getById(id);
        JSONObject data = new JSONObject();
        data.put("note", n == null ? JSONObject.NULL : noteToJson(n));
        deliverSuccess(callbackId, data);
    }

    private void doSaveNote(String callbackId, JSONObject p) throws JSONException {
        String title = p.optString("title", "");
        String contentMd = p.optString("content_md", "");
        if (contentMd.isEmpty() && p.has("contentMd")) {
            contentMd = p.optString("contentMd", "");
        }
        boolean hasId = p.has("id") && !p.isNull("id");
        long idArg = hasId ? p.getLong("id") : -1L;
        if (hasId && idArg > 0) {
            int n = noteRepository.update(idArg, title, contentMd);
            if (n <= 0) {
                deliverError(callbackId, "E_NOT_FOUND", "note not found for update");
                return;
            }
            JSONObject data = new JSONObject();
            data.put("ok", true);
            data.put("id", idArg);
            deliverSuccess(callbackId, data);
        } else {
            long newId = noteRepository.insert(title, contentMd);
            JSONObject data = new JSONObject();
            data.put("ok", true);
            data.put("id", newId);
            deliverSuccess(callbackId, data);
        }
    }

    private void doDeleteNote(String callbackId, JSONObject p) throws JSONException {
        if (!p.has("id")) {
            deliverError(callbackId, "E_BAD_PARAM", "missing id");
            return;
        }
        long id = p.getLong("id");
        int n = noteRepository.deleteById(id);
        if (n <= 0) {
            deliverError(callbackId, "E_NOT_FOUND", "note not found");
            return;
        }
        JSONObject data = new JSONObject();
        data.put("ok", true);
        deliverSuccess(callbackId, data);
    }

    private static JSONObject noteToJson(Note n) throws JSONException {
        JSONObject o = new JSONObject();
        o.put("id", n.id);
        o.put("title", n.title);
        o.put("contentMd", n.contentMd);
        // 与任务 W-4 一致：毫秒时间戳数字
        o.put("updatedAt", n.updatedAt);
        o.put("isDeleted", n.isDeleted);
        return o;
    }

    private void deliverSuccess(String callbackId, JSONObject data) throws JSONException {
        JSONObject env = new JSONObject();
        env.put("callbackId", callbackId);
        env.put("ok", true);
        env.put("data", data);
        deliver(env);
    }

    private void deliverError(String callbackId, String code, String message) {
        try {
            JSONObject env = new JSONObject();
            env.put("callbackId", callbackId);
            env.put("ok", false);
            env.put("code", code);
            env.put("error", message == null ? "" : message);
            deliver(env);
        } catch (JSONException e) {
            Log.e(TAG, "deliverError", e);
        }
    }

    // 经 Base64 传入整段 JSON，避免在 JS 字符串里手工转义引号与换行
    private void deliver(JSONObject envelope) {
        String json = envelope.toString();
        byte[] utf8 = json.getBytes(StandardCharsets.UTF_8);
        String b64 = Base64.encodeToString(utf8, Base64.NO_WRAP);
        String script = "try{window." + JS_CALLBACK_GLOBAL + "&&window." + JS_CALLBACK_GLOBAL
                + "(JSON.parse(atob('" + b64 + "')));}catch(e){console.error('native deliver',e);}";
        webView.post(() -> webView.evaluateJavascript(script, null));
    }
}
