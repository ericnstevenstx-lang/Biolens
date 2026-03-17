import type { ProductMaterial } from '@/types'
import { SectionHeading } from '@/app/scan/[barcode]/page'

export function MaterialsSection({ materials }: { materials: ProductMaterial[] }) {
  if (!materials.length) return null
  return (
    <div className="card">
      <SectionHeading>Material Composition</SectionHeading>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {materials.map((m, i) => (
          <MaterialRow key={i} material={m} />
        ))}
      </div>
    </div>
  )
}

function MaterialRow({ material: m }: { material: ProductMaterial }) {
  const riskColor = m.petro_based ? '#ef4444' : m.bio_based ? '#22c55e' : '#888'
  const petroPct = m.petroload_score != null ? Math.round(m.petroload_score * 100) : null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 500, fontSize: 14 }}>{m.name}</span>
          {m.is_primary && (
            <span className="badge badge-gray">Primary</span>
          )}
          {m.bio_based && (
            <span className="badge badge-green">Bio-based</span>
          )}
          {m.petro_based && (
            <span className="badge badge-red">Petro</span>
          )}
          {m.material_class && (
            <span className="badge badge-gray">{m.material_class}</span>
          )}
        </div>
        <div style={{ marginTop: 4, display: 'flex', gap: 12, fontSize: 11, color: '#666' }}>
          {m.percentage != null && (
            <span>{m.percentage}%</span>
          )}
          {petroPct != null && (
            <span style={{ color: petroPct > 50 ? '#f87171' : '#888' }}>
              Petroload: {petroPct}
            </span>
          )}
          {m.confidence != null && (
            <span>Confidence: {Math.round(m.confidence * 100)}%</span>
          )}
        </div>
      </div>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: riskColor, flexShrink: 0 }} />
    </div>
  )
}
