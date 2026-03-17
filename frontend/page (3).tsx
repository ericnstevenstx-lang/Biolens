import type { ToxicityMaterial } from '@/types'
import { SectionHeading } from '@/app/scan/[barcode]/page'
import { ScoreBar } from '@/components/ui/ScoreBar'

export function ToxicitySection({ toxicity }: { toxicity: ToxicityMaterial[] }) {
  if (!toxicity.length) return null

  return (
    <div className="card">
      <SectionHeading>Toxicity &amp; Exposure</SectionHeading>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {toxicity.map((t, i) => <ToxicityRow key={i} t={t} />)}
      </div>
    </div>
  )
}

function ToxicityRow({ t }: { t: ToxicityMaterial }) {
  const concern = t.overall_concern ?? 0
  const pct = concern * 100
  const color = pct < 30 ? '#22c55e' : pct < 60 ? '#f59e0b' : '#ef4444'
  const tierBadge = tierClass(t.exposure_tier)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 500, fontSize: 13 }}>{t.material_name}</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {t.exposure_tier && (
            <span className={`badge ${tierBadge}`}>{t.exposure_tier}</span>
          )}
          {t.framework_tier && (
            <span className="badge badge-gray">{t.framework_tier}</span>
          )}
        </div>
      </div>
      <ScoreBar value={pct} color={color} />
      {t.consumer_summary && (
        <p style={{ marginTop: 6, fontSize: 12, color: '#888', lineHeight: 1.5 }}>
          {t.consumer_summary}
        </p>
      )}
      {t.highest_concern_dimension && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#666' }}>
          Highest concern: <span style={{ color: '#f87171' }}>{t.highest_concern_dimension}</span>
          {t.highest_concern_status && ` — ${t.highest_concern_status}`}
        </div>
      )}
      {(t.concern_counts.very_high > 0 || t.concern_counts.high > 0) && (
        <div style={{ marginTop: 6, display: 'flex', gap: 8, fontSize: 11 }}>
          {t.concern_counts.very_high > 0 && (
            <span style={{ color: '#ef4444' }}>Very High: {t.concern_counts.very_high}</span>
          )}
          {t.concern_counts.high > 0 && (
            <span style={{ color: '#f97316' }}>High: {t.concern_counts.high}</span>
          )}
          {t.concern_counts.moderate > 0 && (
            <span style={{ color: '#f59e0b' }}>Moderate: {t.concern_counts.moderate}</span>
          )}
        </div>
      )}
    </div>
  )
}

function tierClass(tier: string | null): string {
  if (!tier) return 'badge-gray'
  const t = tier.toLowerCase()
  if (t.includes('high')) return 'badge-red'
  if (t.includes('moderate') || t.includes('medium')) return 'badge-yellow'
  if (t.includes('low')) return 'badge-green'
  return 'badge-gray'
}
