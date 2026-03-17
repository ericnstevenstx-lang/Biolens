import type { GraphIntelligence } from '@/types'
import { SectionHeading } from '@/app/scan/[barcode]/page'
import { ScoreBar } from '@/components/ui/ScoreBar'

export function GraphSection({ graph }: { graph: GraphIntelligence }) {
  const { material_risk, supply_chain } = graph

  return (
    <div className="card">
      <SectionHeading>Graph Intelligence (Neo4j)</SectionHeading>

      {/* Material risk ledger */}
      {material_risk.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>Material Risk Ledger</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {material_risk.map((m, i) => (
              <MaterialRiskRow key={i} m={m} />
            ))}
          </div>
        </div>
      )}

      {/* Supply chain origins */}
      {supply_chain.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>Supply Chain Origins</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {supply_chain.slice(0, 6).map((o, i) => (
              <SupplyChainRow key={i} o={o} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MaterialRiskRow({ m }: { m: GraphIntelligence['material_risk'][0] }) {
  const risk = (m.overall_risk_score ?? 0) * 100
  const color = risk < 30 ? '#22c55e' : risk < 60 ? '#f59e0b' : '#ef4444'
  const trendIcon = m.confidence_trend === 'rising' ? '↑' : m.confidence_trend === 'declining' ? '↓' : '→'
  const trendColor = m.confidence_trend === 'rising' ? '#22c55e' : m.confidence_trend === 'declining' ? '#ef4444' : '#888'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{m.material_name}</span>
          {m.feoc_flag && <span className="badge badge-red">FEOC</span>}
          {m.sanctions_flag && <span className="badge badge-red">Sanctions</span>}
          {m.tariff_risk_score != null && m.tariff_risk_score > 0.4 && (
            <span className="badge badge-yellow">Tariff Risk</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {m.confidence_score != null && (
            <span style={{ fontSize: 11, color: trendColor }}>
              {trendIcon} conf {Math.round(m.confidence_score * 100)}%
            </span>
          )}
          <span style={{ fontSize: 15, fontWeight: 700, color }}>
            {risk.toFixed(0)}
          </span>
        </div>
      </div>
      <ScoreBar value={risk} color={color} />
      {m.supply_chain_resilience != null && (
        <div style={{ marginTop: 5, display: 'flex', gap: 12, fontSize: 11, color: '#666' }}>
          <span>Resilience: {Math.round(m.supply_chain_resilience * 100)}</span>
          {m.toxicity_score != null && (
            <span>Toxicity: {Math.round(m.toxicity_score * 100)}</span>
          )}
          {m.lifecycle_score != null && (
            <span>Lifecycle: {Math.round(m.lifecycle_score * 100)}</span>
          )}
        </div>
      )}
    </div>
  )
}

function SupplyChainRow({ o }: { o: GraphIntelligence['supply_chain'][0] }) {
  const feocColor = o.feoc_status === 'restricted'
    ? '#ef4444' : o.feoc_status === 'unknown'
    ? '#f59e0b' : '#22c55e'
  const isAlert = o.ofac_listed || o.entity_list_status === 'listed'

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px',
      background: isAlert ? '#1a0000' : '#141414',
      border: `1px solid ${isAlert ? '#450a0a' : '#222'}`,
      borderRadius: 6,
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: feocColor, marginTop: 5, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>{o.facility_name ?? o.facility_id}</span>
          {o.country && <span style={{ color: '#888' }}>{o.country_name ?? o.country}</span>}
          <span className={`badge ${pathBadge(o.path)}`}>{o.path.replace('_', ' ')}</span>
        </div>
        {o.corporate && (
          <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
            {o.corporate}
            {(o.ofac_listed || o.entity_list_status === 'listed') && (
              <span style={{ color: '#f87171', marginLeft: 6 }}>⚠ {o.entity_list_status ?? 'OFAC'}</span>
            )}
          </div>
        )}
        {(o.sovereign_risk != null || o.labor_risk != null) && (
          <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
            {o.sovereign_risk != null && `Sovereign: ${Math.round(o.sovereign_risk * 100)}`}
            {o.labor_risk != null && ` · Labor: ${Math.round(o.labor_risk * 100)}`}
          </div>
        )}
      </div>
    </div>
  )
}

function pathBadge(path: string): string {
  if (path === 'manufacturer') return 'badge-blue'
  if (path === 'material_source') return 'badge-gray'
  return 'badge-gray'
}
