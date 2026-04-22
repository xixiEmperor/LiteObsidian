package com.liteobsidian.ui;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.ProgressBar;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import com.liteobsidian.R;

/**
 * 启动屏：短延迟后进入主 WebView 壳，并通过 Intent 证明启动链路可传参。
 */
public class SplashActivity extends AppCompatActivity {
    // 与 MainActivity 读取侧共用键名
    public static final String EXTRA_ENTRY_SOURCE = "extra_entry_source";
    // 与文档示例一致的延迟，避免白屏过短无感
    private static final int SPLASH_MS = 600;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);
        ProgressBar progress = findViewById(R.id.splashProgress);
        progress.setVisibility(View.VISIBLE);
        // 子线程/主线程均可：此处用主线程 postDelayed 进主壳
        new Handler(Looper.getMainLooper()).postDelayed(this::goMain, SPLASH_MS);
    }

    private void goMain() {
        Intent intent = new Intent(this, MainActivity.class);
        // 课程点：putExtra 供 Main 读取（可扩展 theme、noteId 等）
        intent.putExtra(EXTRA_ENTRY_SOURCE, "splash");
        startActivity(intent);
        finish();
    }
}
