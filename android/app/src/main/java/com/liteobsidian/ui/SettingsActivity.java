package com.liteobsidian.ui;

import android.os.Bundle;
import android.view.MenuItem;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.liteobsidian.R;

/**
 * 设置/关于：演示第二个 Intent 与 Toolbar 回退。
 */
public class SettingsActivity extends AppCompatActivity {
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_settings);
        Toolbar toolbar = findViewById(R.id.settingsToolbar);
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setTitle(R.string.settings_title);
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        }
        TextView info = findViewById(R.id.settingsInfo);
        if (getIntent() != null && getIntent().hasExtra(MainActivity.EXTRA_OPENED_FROM)) {
            String from = getIntent().getStringExtra(MainActivity.EXTRA_OPENED_FROM);
            // 与 Main -> Settings 的 putExtra 展示在同一屏，便于说明 Intent 带参
            info.setText(getString(R.string.settings_hint) + "\n\nopenedFrom=" + from);
        }
        findViewById(R.id.settingsBack).setOnClickListener(v -> finish());
    }

    @Override
    public boolean onOptionsItemSelected(@NonNull MenuItem item) {
        if (item.getItemId() == android.R.id.home) {
            finish();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }
}
