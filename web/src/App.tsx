import { Suspense, lazy } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/app/AppLayout'

// 与路由入口 pages 解耦的懒加载，首屏只打首页 chunk
const HomePage = lazy(() =>
  import('./pages/HomePage').then((m) => ({ default: m.HomePage })),
)
const NotePage = lazy(() =>
  import('./pages/NotePage').then((m) => ({ default: m.NotePage })),
)

// 使用 HashRouter，便于 file:///android_asset/.../index.html 下离线访问（hash 不依赖 History API 的 pathname）
function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route
            index
            element={
              <Suspense fallback={<p className="app-route-fallback">加载中…</p>}>
                <HomePage />
              </Suspense>
            }
          />
          <Route
            path="note/:noteId"
            element={
              <Suspense fallback={<p className="app-route-fallback">加载中…</p>}>
                <NotePage />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
