import type { GraphAlternative } from '@/types'
import { SectionHeading } from '@/app/scan/[barcode]/page'

export function AlternativesSection({ alternatives }: { alternatives: GraphAlternative[] }) {
  if (!alternatives.length) return null

  return (
    <div className="card">
      <SectionHeading>Better Alternatives</SectionHeading>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alternatives.slice(0, 6).map((a, i) => (
          <AlternativeRow key={i} a={a} />
        ))}
      </div>
    </div>
  )
}

function AlternativeRow({ a }: { a: GraphAlternative }) {
  const composite = Math.round((a.composite_score ?? 0) * 100)
  const color = composite > 65 ? '#22c55e' : composite > 40 ? '#f59e0b' : '#888'

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 12, padding: '10px 12px',
      background: '#141414', border: '1px solid #222', borderRadius: 8,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{a.alternative_material}</span>
          <span className={`badge ${a.alt_type === 'curated' ? 'badge-green' : 'badge-gray'}`}>
            {a.alt_type}
          </span>
          {a.availability === 'commercial' && (
            <span className="badge badge-blue">Available</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#666', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span>vs {a.original_material}</span>
          {a.reason && <span>· {a.reason.replace('_', ' ')}</span>}
          {a.similarity && <span>· {Math.round(a.similarity * 100)}% similar</span>}
        </div>
        <div style={{ fontSize: 11, color: '#555', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {a.toxicity_improvement > 0 && (
            <span style={{ color: '#22c55e' }}>↓ Toxicity {(a.toxicity_improvement * 100).toFixed(0)}%</span>
          )}
          {a.carbon_improvement > 0 && (
            <span style={{ color: '#22c55e' }}>↓ Carbon {(a.carbon_improvement * 100).toFixed(0)}%</span>
          )}
          {a.cost_delta_pct != null && (
            <span style={{ color: a.cost_delta_pct > 0 ? '#f59e0b' : '#22c55e' }}>
              {a.cost_delta_pct > 0 ? '+' : ''}{a.cost_delta_pct.toFixed(0)}% cost
            </span>
          )}
        </div>
        {a.marketplace_sku && (
          <div style={{ marginTop: 6 }}>
            <span style={{ fontSize: 11, padding: '2px 8px', background: '#14532d', color: '#86efac', borderRadius: 4 }}>
              ✦ Available on FiberFoundry · {a.marketplace_sku}
            </span>
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color }}>{composite}</div>
        <div style={{ fontSize: 10, color: '#555' }}>score</div>
      </div>
    </div>
  )
}
