import '../../styles/components/home/bridge-hint.scss'

type BridgeHintProps = {
  label: string
}

// 展示当前是否具备 Android 桥接
export function BridgeHint({ label }: BridgeHintProps) {
  return (
    <p className="bridge-hint">
      桥接环境：<strong className="bridge-hint__accent">{label}</strong>
    </p>
  )
}
