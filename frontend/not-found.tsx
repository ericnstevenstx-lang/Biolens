import type { LifecycleMaterial } from '@/types'
import { SectionHeading } from '@/app/scan/[barcode]/page'
import { ScoreBar } from '@/components/ui/ScoreBar'

export function LifecycleSection({ lifecycle }: { lifecycle: LifecycleMaterial[] }) {
  if (!lifecycle.length) return null

  return (
    <div className="card">
      <SectionHeading>Lifecycle Intelligence</SectionHeading>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {lifecycle.map((l, i) => <LifecycleRow key={i} l={l} />)}
      </div>
    </div>
  )
}

function LifecycleRow({ l }: { l: LifecycleMaterial }) {
  const composite = (l.composite_score ?? 0) * 100
  const compositeColor = composite > 65 ? '#22c55e' : composite > 40 ? '#f59e0b' : '#ef4444'

  const metrics = [
    { label: 'Biodegradability', value: l.biodegradability, good: true },
    { label: 'Recyclability', value: l.recyclability, good: true },
    { label: 'Circular Recovery', value: l.circular_recovery, good: true },
    { label: 'Compostability', value: l.compostability, good: true },
    { label: 'Microplastic Risk', value: l.microplastic_risk, good: false },
    { label: 'Landfill Persistence', value: l.landfill_persistence, good: false },
    { label: 'Environmental Accum.', value: l.environmental_accumulation, good: false },
  ].filter((m) => m.value != null)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontWeight: 500, fontSize: 13 }}>{l.material_name}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: compositeColor }}>
          {composite.toFixed(0)}
        </span>
      </div>
      <ScoreBar value={composite} color={compositeColor} />
      {metrics.length > 0 && (
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '6px 12px' }}>
          {metrics.map(({ label, value, good }) => {
            const pct = (value ?? 0) * 100
            const color = good
              ? pct > 65 ? '#22c55e' : pct > 35 ? '#f59e0b' : '#ef4444'
              : pct < 30 ? '#22c55e' : pct < 60 ? '#f59e0b' : '#ef4444'
            return (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666', marginBottom: 2 }}>
                  <span>{label}</span>
                  <span style={{ color }}>{pct.toFixed(0)}</span>
                </div>
                <ScoreBar value={pct} color={color} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
