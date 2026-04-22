import { getBridgeInfo } from '../../lib/bridge'
import type { Note } from '../../types/note'
import { BridgeHint } from './BridgeHint'
import { NoteList } from './NoteList'
import { Button } from 'antd'
import '../../styles/components/home/home-page.scss'

// 首屏占位：后续可替换为笔记列表/编辑
const mockNotes: Note[] = [
  { id: '1', title: '示例', content: '# 你好\n\n在 `pnpm dev` 下编辑页面即可热更新。' },
]

// 首页实际内容：子组件见同目录
export function HomePage() {
  const bridge = getBridgeInfo()

  return (
    <section className="home-page">
      <BridgeHint label={bridge.label} />
      <Button type="primary" onClick={() => window.hybrid?.invoke('click', JSON.stringify({
        name: 'John Doe',
        age: 30,
        email: 'john.doe@example.com'
      }))}>Test</Button>
      <NoteList notes={mockNotes} />
    </section>
  )
}
