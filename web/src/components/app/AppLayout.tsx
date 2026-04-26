import { Outlet } from 'react-router-dom'
import '../../styles/components/app/app-layout.scss'

// 全局面板：顶栏 + 主内容区，子路由由 <Outlet /> 渲染
export function AppLayout() {
    return (
        <div className="app">
            <header className="app__header">
                <h1 className="app__title">课程笔记</h1>
                <p className="app__sub">本地 Markdown 轻笔记（Web 端骨架）</p>
            </header>
            <main className="app__main">
                <Outlet />
            </main>
        </div>
    )
}
