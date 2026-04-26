import { Suspense, lazy } from 'react'
import { App as AntdApp, ConfigProvider, theme } from 'antd'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/app/AppLayout'

// 涓庤矾鐢卞叆鍙?pages 瑙ｈ€︾殑鎳掑姞杞斤紝棣栧睆鍙墦棣栭〉 chunk
const HomePage = lazy(() =>
    import('./pages/HomePage').then((m) => ({ default: m.HomePage })),
)
const NotePage = lazy(() =>
    import('./pages/NotePage').then((m) => ({ default: m.NotePage })),
)
const SettingsPage = lazy(() =>
    import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)

// 缁熶竴绗笁鏂圭粍浠朵富棰橈紝閬垮厤榛樿浜壊鏍峰紡鍜屽綋鍓嶆殫鑹查〉闈㈠啿绐?
const antdTheme = {
    algorithm: theme.darkAlgorithm,
    token: {
        colorPrimary: '#58a6ff',
        colorBgBase: '#0f1419',
        colorBgContainer: '#1a222c',
        colorBgElevated: '#212d39',
        colorText: '#e6edf3',
        colorTextSecondary: '#8b9bab',
        colorBorder: '#2a3643',
        borderRadius: 12,
        controlHeight: 40,
        fontFamily:
            "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', -apple-system, 'Segoe UI', sans-serif",
        boxShadowSecondary: '0 16px 28px -22px rgba(0, 0, 0, 0.9)',
    },
    components: {
        Button: { primaryShadow: 'none', controlHeight: 40 },
        Input: { activeShadow: '0 0 0 2px rgba(88, 166, 255, 0.2)' },
        Segmented: {
            trackBg: '#1a222c',
            itemSelectedBg: '#26384a',
            itemSelectedColor: '#e6edf3',
        },
        Modal: { contentBg: '#1a222c', headerBg: '#1a222c' },
    },
}

// 浣跨敤 HashRouter锛屼究浜?file:///android_asset/.../index.html 涓嬬绾胯闂紙hash 涓嶄緷璧?History API 鐨?pathname锛?
function App() {
    return (
        <ConfigProvider theme={antdTheme}>
            {/* 用 AntdApp 包一层，让 message 和 modal 等反馈组件继承主题上下文 */}
            <AntdApp>
                <HashRouter>
                    <Routes>
                        <Route path="/" element={<AppLayout />}>
                            <Route
                                index
                                element={
                                    <Suspense
                                        fallback={
                                            <p className="app-route-fallback">
                                                鍔犺浇涓€?
                                            </p>
                                        }
                                    >
                                        <HomePage />
                                    </Suspense>
                                }
                            />
                            <Route
                                path="note/:noteId"
                                element={
                                    <Suspense
                                        fallback={
                                            <p className="app-route-fallback">
                                                鍔犺浇涓€?
                                            </p>
                                        }
                                    >
                                        <NotePage />
                                    </Suspense>
                                }
                            />
                            <Route
                                path="settings"
                                element={
                                    <Suspense
                                        fallback={
                                            <p className="app-route-fallback">
                                                鍔犺浇涓€?
                                            </p>
                                        }
                                    >
                                        <SettingsPage />
                                    </Suspense>
                                }
                            />
                        </Route>
                    </Routes>
                </HashRouter>
            </AntdApp>
        </ConfigProvider>
    )
}

export default App
