import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/app/AppLayout'
import { HomePage } from './pages/HomePage'

// 使用 HashRouter，便于 file:///android_asset/.../index.html 下离线访问（hash 不依赖 History API 的 pathname）
function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<HomePage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
