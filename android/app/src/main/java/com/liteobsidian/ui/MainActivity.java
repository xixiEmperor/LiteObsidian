package com.liteobsidian.ui;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.liteobsidian.BuildConfig;
import com.liteobsidian.R;
import com.liteobsidian.bridge.WebAppBridge;

// 本 Activity 作为「混合壳」：原生负责 Toolbar、系统菜单、WebView 容器与 JSBridge 注入；
// 业务界面主要由 assets 内离线 H5（React 构建产物）渲染，通过 file:///android_asset/... 加载。

/**
 * 主壳：WebView 加载 assets/dist，并注入桥接；菜单跳转设置页并传参。
 */
public class MainActivity extends AppCompatActivity {
    // 设置页可读的来源标记
    public static final String EXTRA_OPENED_FROM = "extra_opened_from";
    // 本地离线包（由 web pnpm build 后拷贝到 assets/dist）
    // file:///android_asset/ 是 WebView 访问应用 assets 目录的固定 URL 前缀，对应源码目录 android/app/src/main/assets/；
    // 其后的 dist/index.html 即该目录下的相对路径，与构建拷贝目标一致；前端构建需 base 为相对路径，否则子资源会 404。
    private static final String H5_URL = "file:///android_asset/dist/index.html";
    private static final String TAG = "MainActivity";
    // 与布局 activity_main.xml 中 @id/mainWebView 绑定；生命周期内用于 loadUrl、返回栈与后续可能的 evaluateJavascript。
    private WebView webView;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        Toolbar toolbar = findViewById(R.id.mainToolbar);
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setTitle(R.string.app_name);
        }
        if (getIntent() != null && getIntent().hasExtra(SplashActivity.EXTRA_ENTRY_SOURCE)) {
            String from = getIntent().getStringExtra(SplashActivity.EXTRA_ENTRY_SOURCE);
            Log.d(TAG, "entry: " + from);
        }
        // Debug 下允许 Chrome remote debugging（chrome://inspect），便于在桌面端调试壳内 H5 的 Console 与 DOM。
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
        webView = findViewById(R.id.mainWebView);
        setupWebView(webView);
        // WebViewClient：页面导航、错误、shouldOverrideUrlLoading 等回调；当前使用空实现，按需可重写以拦截外链等。
        webView.setWebViewClient(new WebViewClient() {
        });
        // WebChromeClient：进度、标题、onConsoleMessage、权限请求（如 H5 音视频）等；当前空实现占位。
        webView.setWebChromeClient(new WebChromeClient() {
        });
        // 加载打包进 APK 的本地入口页；相对路径脚本/样式由该 HTML 与前端构建的 base 共同决定能否正确解析。
        webView.loadUrl(H5_URL);
    }

    private void setupWebView(WebView w) {
        WebSettings s = w.getSettings();
        // H5 业务依赖 JS 执行；关闭则 React 等脚本无法运行。
        s.setJavaScriptEnabled(true);
        // 开启 DOM Storage（localStorage/sessionStorage）；若 H5 或依赖库使用 Web Storage，需为 true。
        s.setDomStorageEnabled(true);
        // 允许 file scheme 访问 assets 等本地内容；与 loadUrl(file:///android_asset/...) 配合使用。
        s.setAllowFileAccess(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            // 允许从 file URL 访问同源 file 内容；旧版 WebView 加载本地包时常需开启，否则子资源加载失败。
            s.setAllowFileAccessFromFileURLs(true);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
            // 允许本地页面向 file/http 等跨源访问（风险更高，仅适合受信任的离线包）；课程壳场景常用于本地 index 拉取 chunk。
            s.setAllowUniversalAccessFromFileURLs(true);
        }
        // 注入名与开发文档 3.2.1 的 hybrid 方案一致，避免 $ 在部分注入场景的问题
        // 第二个参数为 JS 全局对象名：页面内即 window[JS_INTERFACE_NAME]，与 WebAppBridge 中 @JavascriptInterface 方法绑定。
        w.addJavascriptInterface(new WebAppBridge(this, w), WebAppBridge.JS_INTERFACE_NAME);
    }

    @Override
    public boolean onCreateOptionsMenu(@NonNull Menu menu) {
        getMenuInflater().inflate(R.menu.main_toolbar, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(@NonNull MenuItem item) {
        int id = item.getItemId();
        if (id == R.id.action_open_settings) {
            Intent i = new Intent(this, SettingsActivity.class);
            // 课程点：向设置页传参
            i.putExtra(EXTRA_OPENED_FROM, "main_menu");
            startActivity(i);
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    @Override
    public void onBackPressed() {
        // 优先回退 WebView 历史栈（H5 内路由前进过则先退页面），否则再交给系统结束 Activity。
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
