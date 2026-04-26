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
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * 与 H5 约定的统一入口：仅暴露 invoke(methodName, paramsJson)。
 */
public final class WebAppBridge {
    public static final String JS_INTERFACE_NAME = "hybrid";
    private static final String TAG = "WebAppBridge";
    private static final String JS_CALLBACK_GLOBAL = "liteobsidianOnNative";
    private static final ExecutorService DB_EXEC = Executors.newSingleThreadExecutor();

    private final Context appContext;
    private final WebView webView;
    private final NoteRepository noteRepository;

    public WebAppBridge(Context context, WebView webView) {
        this.appContext = context.getApplicationContext();
        this.webView = webView;
        this.noteRepository = new NoteRepository(this.appContext);
    }

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
                case "setPinned":
                    doSetPinned(callbackId, p);
                    break;
                case "setFavorite":
                    doSetFavorite(callbackId, p);
                    break;
                case "updateNoteTags":
                    doUpdateNoteTags(callbackId, p);
                    break;
                case "listTags":
                    doListTags(callbackId);
                    break;
                case "getSettings":
                    doGetSettings(callbackId);
                    break;
                case "saveSettings":
                    doSaveSettings(callbackId, p);
                    break;
                case "importMarkdown":
                    doImportMarkdown(callbackId, p);
                    break;
                case "exportNotes":
                    doExportNotes(callbackId, p);
                    break;
                case "pickImage":
                    doPickImage(callbackId, p);
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
        String keyword = p.optString("keyword", "").trim();
        String tag = p.optString("tag", "").trim();
        boolean favoritesOnly = p.optBoolean("favoritesOnly", false);
        int offset = p.optInt("offset", 0);
        int limit = p.optInt("limit", 1000);
        List<Note> list = noteRepository.listFiltered(offset, limit, keyword, tag, favoritesOnly);
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

    private void doSetPinned(String callbackId, JSONObject p) throws JSONException {
        long id = p.optLong("id", -1L);
        boolean pinned = p.optBoolean("pinned", false);
        if (id <= 0) {
            deliverError(callbackId, "E_BAD_PARAM", "missing id");
            return;
        }
        noteRepository.setPinned(id, pinned);
        JSONObject data = new JSONObject();
        data.put("ok", true);
        deliverSuccess(callbackId, data);
    }

    private void doSetFavorite(String callbackId, JSONObject p) throws JSONException {
        long id = p.optLong("id", -1L);
        boolean favorite = p.optBoolean("favorite", false);
        if (id <= 0) {
            deliverError(callbackId, "E_BAD_PARAM", "missing id");
            return;
        }
        noteRepository.setFavorite(id, favorite);
        JSONObject data = new JSONObject();
        data.put("ok", true);
        deliverSuccess(callbackId, data);
    }

    private void doUpdateNoteTags(String callbackId, JSONObject p) throws JSONException {
        long id = p.optLong("id", -1L);
        if (id <= 0) {
            deliverError(callbackId, "E_BAD_PARAM", "missing id");
            return;
        }
        JSONArray arr = p.optJSONArray("tags");
        List<String> tags = new ArrayList<>();
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                String t = arr.optString(i, "").trim();
                if (!t.isEmpty()) {
                    tags.add(t);
                }
            }
        }
        noteRepository.updateTags(id, tags);
        JSONObject data = new JSONObject();
        data.put("ok", true);
        deliverSuccess(callbackId, data);
    }

    private void doListTags(String callbackId) throws JSONException {
        List<String> tags = noteRepository.listTags();
        JSONObject data = new JSONObject();
        data.put("tags", new JSONArray(tags));
        deliverSuccess(callbackId, data);
    }

    private void doGetSettings(String callbackId) throws JSONException {
        JSONObject data = noteRepository.getSettings();
        deliverSuccess(callbackId, data);
    }

    private void doSaveSettings(String callbackId, JSONObject p) throws JSONException {
        noteRepository.saveSettings(p);
        JSONObject data = noteRepository.getSettings();
        deliverSuccess(callbackId, data);
    }

    private void doImportMarkdown(String callbackId, JSONObject p) throws JSONException {
        String title = p.optString("title", "");
        String text = p.optString("text", "");
        long id = noteRepository.insert(title, text);
        JSONObject data = new JSONObject();
        data.put("ok", true);
        data.put("id", id);
        deliverSuccess(callbackId, data);
    }

    private void doExportNotes(String callbackId, JSONObject p) throws JSONException {
        JSONArray ids = p.optJSONArray("ids");
        if (ids == null || ids.length() == 0) {
            deliverError(callbackId, "E_BAD_PARAM", "ids is empty");
            return;
        }
        String format = p.optString("format", "md");
        List<Long> idList = new ArrayList<>();
        for (int i = 0; i < ids.length(); i++) {
            idList.add(ids.optLong(i));
        }
        List<Note> notes = noteRepository.listByIds(idList);
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < notes.size(); i++) {
            Note n = notes.get(i);
            out.append("# ").append(n.title).append("\n\n").append(n.contentMd == null ? "" : n.contentMd);
            if (i < notes.size() - 1) {
                out.append("\n\n---\n\n");
            }
        }
        JSONObject data = new JSONObject();
        data.put("ok", true);
        data.put("text", out.toString());
        data.put("fileName", "notes-export." + ("zip".equals(format) ? "zip" : "md"));
        deliverSuccess(callbackId, data);
    }

    private void doPickImage(String callbackId, JSONObject p) throws JSONException {
        String source = p.optString("source", "gallery");
        String markdown = "![" + source + "](/mock-images/" + System.currentTimeMillis() + ".jpg)";
        JSONObject data = new JSONObject();
        data.put("ok", true);
        data.put("markdown", markdown);
        deliverSuccess(callbackId, data);
    }

    private static JSONObject noteToJson(Note n) throws JSONException {
        JSONObject o = new JSONObject();
        o.put("id", n.id);
        o.put("title", n.title);
        o.put("contentMd", n.contentMd);
        o.put("updatedAt", n.updatedAt);
        o.put("isDeleted", n.isDeleted);
        o.put("isPinned", n.isPinned);
        o.put("isFavorite", n.isFavorite);
        o.put("lastOpenedAt", n.lastOpenedAt);
        o.put("tags", new JSONArray(n.tags));
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

    private void deliver(JSONObject envelope) {
        String json = envelope.toString();
        byte[] utf8 = json.getBytes(StandardCharsets.UTF_8);
        String b64 = Base64.encodeToString(utf8, Base64.NO_WRAP);
        String script = "try{window." + JS_CALLBACK_GLOBAL + "&&window." + JS_CALLBACK_GLOBAL
                + "(JSON.parse(atob('" + b64 + "')));}catch(e){console.error('native deliver',e);}";
        webView.post(() -> webView.evaluateJavascript(script, null));
    }
}
