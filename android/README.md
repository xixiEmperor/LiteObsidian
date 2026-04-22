# Android 工程（课程骨架）

## 先决条件

- [Android Studio](https://developer.android.com/studio)（含 **Android SDK** 与 **JDK 17**）  
- 打开本目录 `android/` 作为 Gradle 工程，首次同步时配置 `local.properties` 中的 `sdk.dir`（也可复制 `local.properties.example` 为 `local.properties` 再改）

## 前端资源

1. 在仓库 `web/` 下执行 `pnpm build` 得到 `web/dist/`
2. 将 **`dist` 全目录** 覆盖到 `app/src/main/assets/dist/`（保持其中有 `index.html`）

不拷贝时，仓库里若已有一份占位 `assets/dist` 可至少验证壳与 WebView 白屏/脚本开关；**正式联调**务必使用 `pnpm build` 产物。

## 运行

- Android Studio 选择设备或模拟器，对 **:app** 点 **Run**  
- 主界面加载地址：`file:///android_asset/dist/index.html`；JS 中通过 `window.hybrid.invoke(methodName, paramsJson)` 与 Java `WebAppBridge#invoke` 对应（与开发文档 3.2.1 一致，注入名 `hybrid`）

## 命令行（可选）

在已存在 **Gradle Wrapper** 的前提下，可在本目录执行 `.\gradlew assembleDebug`；若缺少 `gradlew*`，用 Android Studio 打开工程，IDE 会提示或生成 Wrapper。
