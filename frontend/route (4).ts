export function ScoreBar({
  value,
  color = '#22c55e',
  max = 100,
}: {
  value: number
  color?: string
  max?: number
}) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100)
  return (
    <div className="score-bar" style={{ marginTop: 4 }}>
      <div
        className="score-bar-fill"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}
