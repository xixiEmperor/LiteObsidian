import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Switch, message } from 'antd'
import { invoke } from '../../lib/bridge'
import '../../styles/components/settings/settings-page.scss'

export function SettingsPage() {
    const navigate = useNavigate()
    const [fontSize, setFontSize] = useState(16)
    const [lineWidth, setLineWidth] = useState(860)
    const [autoSaveMs, setAutoSaveMs] = useState(1200)
    const [followSystemTheme, setFollowSystemTheme] = useState(true)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        invoke('getSettings', {})
            .then((d) => {
                setFontSize(d.fontSize)
                setLineWidth(d.lineWidth)
                setAutoSaveMs(d.autoSaveMs)
                setFollowSystemTheme(d.followSystemTheme)
            })
            .catch((e) => {
                message.error(String(e))
            })
            .finally(() => setLoading(false))
    }, [])

    const onSave = async () => {
        try {
            await invoke('saveSettings', {
                fontSize,
                lineWidth,
                autoSaveMs,
                followSystemTheme,
            })
            message.success('设置已保存')
        } catch (e) {
            message.error(String(e))
        }
    }

    return (
        <section className="settings-page">
            <div className="settings-page__head">
                <Button onClick={() => navigate(-1)}>返回</Button>
                <h2 className="settings-page__title">设置中心</h2>
                <Button type="primary" onClick={onSave} loading={loading}>
                    保存
                </Button>
            </div>

            {/* 独立设置页避免占用编辑页主区域 */}
            <div className="settings-page__form">
                <label className="settings-page__item">
                    <span>字体大小</span>
                    <Input
                        value={String(fontSize)}
                        onChange={(e) => setFontSize(Number(e.target.value) || 16)}
                    />
                </label>

                <label className="settings-page__item">
                    <span>内容行宽</span>
                    <Input
                        value={String(lineWidth)}
                        onChange={(e) => setLineWidth(Number(e.target.value) || 860)}
                    />
                </label>

                <label className="settings-page__item">
                    <span>自动保存间隔(ms)</span>
                    <Input
                        value={String(autoSaveMs)}
                        onChange={(e) => setAutoSaveMs(Number(e.target.value) || 1200)}
                    />
                </label>

                <label className="settings-page__item settings-page__switch">
                    <span>跟随系统主题</span>
                    <Switch
                        checked={followSystemTheme}
                        onChange={(checked) => setFollowSystemTheme(checked)}
                    />
                </label>
            </div>
        </section>
    )
}
