import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { scanBarcode, analyzeMaterial, analyzeTokens } from '../services/biolens';
import './ResultsPage.css';

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Utility helpers
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function fmt(val, digits = 0) {
  if (val == null) return 'â';
  const n = parseFloat(val);
  if (isNaN(n)) return 'â';
  return n.toFixed(digits);
}

function fmtPct(val, digits = 0) {
  if (val == null) return 'â';
  const n = parseFloat(val);
  if (isNaN(n)) return 'â';
  return n.toFixed(digits) + '%';
}

function fmtScore(val) {
  if (val == null) return 'â';
  return Math.round(parseFloat(val) * 100);
}

// ISO alpha-2 â flag emoji
function countryFlag(code) {
  if (!code || code.length !== 2) return 'ð';
  return code.toUpperCase().split('').map(c =>
    String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))
  ).join('');
}

function tierClass(tier) {
  const t = (tier || '').toLowerCase().replace(/[^a-z_]/g, '');
  if (['bio_pure', 'plant_based', 'natural_material'].includes(t)) return 'bio_pure';
  if (['bridge', 'transition_material'].includes(t)) return 'bridge';
  if (['petrochemical', 'petro_based'].includes(t)) return 'petrochemical';
  return 'unknown';
}

function tierLabel(tier) {
  const map = {
    bio_pure: 'Bio-Pure',
    bridge: 'Bridge',
    petrochemical: 'Petrochemical',
    mineral: 'Mineral',
    mixed: 'Mixed',
    unknown: 'Unknown',
  };
  return map[tierClass(tier)] ?? tier ?? 'Unknown';
}

function concernColor(tier) {
  const map = {
    minimal: '#22c55e',
    low: '#84cc16',
    moderate: '#f59e0b',
    elevated: '#f97316',
    high: '#ef4444',
  };
  return map[(tier || '').toLowerCase()] ?? '#6b7280';
}

function scoreColor(val, invert = false) {
  const n = parseFloat(val);
  if (isNaN(n)) return '#4a5568';
  const v = invert ? 1 - n : n;
  if (v >= 0.75) return '#22c55e';
  if (v >= 0.50) return '#f59e0b';
  if (v >= 0.25) return '#f97316';
  return '#ef4444';
}

function statusLabel(status) {
  const map = {
    regulatory_confirmed: 'Regulatory',
    academically_established: 'Established',
    academically_supported: 'Supported',
    emerging: 'Emerging',
    theoretical: 'Theoretical',
    no_concern_found: 'No concern',
    unassessed: 'Unassessed',
  };
  return map[status] ?? status ?? 'â';
}

function pathwayIcon(key) {
  const map = {
    mechanical_recycle: 'â»ï¸',
    chemical_recycle: 'ð§ª',
    industrial_compost: 'ð±',
    home_compost: 'ðª±',
    anaerobic_digestion: 'âï¸',
    landfill: 'ðï¸',
    incineration: 'ð¥',
    ocean: 'ð',
    open_environment: 'ð¿',
    wastewater: 'ð§',
  };
  return map[key] ?? 'ð¦';
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// ScoreBar â reusable horizontal bar
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function ScoreBar({ label, value, invert = false, pct = false }) {
  const display = value != null ? parseFloat(value) : null;
  const width = display != null ? Math.round(display * 100) : 0;
  const color = display != null ? scoreColor(display, invert) : '#4a5568';

  return (
    <div className="score-bar-row">
      <span className="score-bar-label">{label}</span>
      <div className="score-bar-track">
        <div
          className="score-bar-fill"
          style={{ width: `${width}%`, background: color }}
        />
      </div>
      <span className="score-bar-num">
        {display != null ? (pct ? fmtPct(display * 100) : Math.round(display * 100)) : 'â'}
      </span>
    </div>
  );
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Panel wrapper
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function Panel({ icon, label, badge, children }) {
  return (
    <div className="intel-panel">
      <div className="intel-panel-header">
        <span className="intel-panel-label">
          <span className="intel-panel-icon">{icon}</span>
          {label}
        </span>
        {badge}
      </div>
      <div className="intel-panel-body">{children}</div>
    </div>
  );
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Section 1: Product
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function ProductPanel({ scanData }) {
  if (!scanData) return null;
  const { title, brand, barcode, category, source, imageUrl } = scanData;

  return (
    <Panel icon="ð¦" label="Product Scanned">
      <div className="product-panel-main">
        <div className="product-image-wrap">
          {imageUrl
            ? <img src={imageUrl} alt={title || 'Product'} />
            : <span className="product-image-placeholder">ð¦</span>
          }
        </div>
        <div className="product-info">
          <h2 className="product-name">{title || 'Unknown Product'}</h2>
          {brand && <p className="product-brand">{brand}</p>}
          <div className="product-meta-row">
            {barcode && (
              <span className="product-meta-chip">{barcode}</span>
            )}
            {category && (
              <span className="product-meta-chip">{category}</span>
            )}
            {source && (
              <span className="product-meta-chip source">{source}</span>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Section 2: Material Intelligence
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function MaterialPanel({ materials, isLoading }) {
  if (isLoading) {
    return (
      <Panel icon="ð§¬" label="Material Intelligence">
        <div className="results-loading" style={{ minHeight: 80, gap: 8 }}>
          <div className="results-loading-spinner" style={{ width: 24, height: 24 }} />
          <span className="results-loading-text">Resolving materialsâ¦</span>
        </div>
      </Panel>
    );
  }

  if (!materials || materials.length === 0) {
    return (
      <Panel icon="ð§¬" label="Material Intelligence">
        <p className="material-no-results">
          No materials identified from this product's description.
        </p>
      </Panel>
    );
  }

  return (
    <Panel icon="ð§¬" label="Material Intelligence"
      badge={
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {materials.length} material{materials.length !== 1 ? 's' : ''}
        </span>
      }
    >
      {materials.map((m, i) => (
        <MaterialItem key={m.material_id || i} material={m} />
      ))}
    </Panel>
  );
}

function MaterialItem({ material: m }) {
  const tc = tierClass(m.framework_tier || m.material_class);
  const dotColors = {
    bio_pure: '#22c55e',
    bridge: '#f59e0b',
    petrochemical: '#ef4444',
    unknown: '#6b7280',
  };

  const petroScore = m.petroload_score != null ? parseFloat(m.petroload_score) : null;
  const healthScore = m.overall_material_health_score != null ? parseFloat(m.overall_material_health_score) : null;
  const confidenceScore = m.confidence_score != null ? parseFloat(m.confidence_score) : null;

  return (
    <div className="material-item">
      <div className="material-item-header">
        <div className="material-name-group">
          <div
            className="material-tier-dot"
            style={{ background: dotColors[tc] ?? dotColors.unknown }}
          />
          <span className="material-name">{m.material_name || m.query}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`material-tier-badge tier-${tc}`}>
            {tierLabel(m.framework_tier || m.material_class)}
          </span>
          {m.risk_label && (
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: m.risk_color || 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}>
              {m.risk_label}
            </span>
          )}
        </div>
      </div>

      {/* Score bars */}
      {(petroScore != null || healthScore != null || confidenceScore != null) && (
        <div className="material-score-bar-wrap">
          {petroScore != null && (
            <ScoreBar label="Petro load" value={petroScore} invert />
          )}
          {healthScore != null && (
            <ScoreBar label="Mat. health" value={healthScore} />
          )}
          {m.pesticide_risk_score != null && (
            <ScoreBar label="Pesticide" value={m.pesticide_risk_score} invert />
          )}
          {m.processing_chemical_risk_score != null && (
            <ScoreBar label="Processing" value={m.processing_chemical_risk_score} invert />
          )}
        </div>
      )}

      {/* Explanation */}
      {m.explanation && (
        <div style={{ padding: '0 16px 12px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {m.explanation}
        </div>
      )}

      {/* Alternatives */}
      {m.alternatives && m.alternatives.length > 0 && (
        <div className="material-alternatives">
          <div className="alternatives-label">Better alternatives</div>
          <div className="alternatives-list">
            {m.alternatives.slice(0, 4).map((alt, i) => (
              <span key={i} className="alternative-chip">{alt.name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Section 3: Exposure / Toxicity
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function ToxicityPanel({ materials, isLoading }) {
  if (isLoading) {
    return (
      <Panel icon="âï¸" label="Toxicity & Exposure">
        <div className="results-loading" style={{ minHeight: 80, gap: 8 }}>
          <div className="results-loading-spinner" style={{ width: 24, height: 24 }} />
          <span className="results-loading-text">Loading exposure dataâ¦</span>
        </div>
      </Panel>
    );
  }

  // Find first material with available exposure data
  const withExposure = (materials || []).filter(m => m.exposure?.available);

  if (withExposure.length === 0) {
    const hasAssessments = (materials || []).some(
      m => m.exposure?.reason === 'assessments_not_yet_published'
    );

    return (
      <Panel icon="âï¸" label="Toxicity & Exposure">
        <p className="toxicity-unavailable">
          {hasAssessments
            ? 'Assessments are in progress â not yet published.'
            : 'No toxicity assessment data available for these materials yet.'
          }
          <small>BioLens toxicity intelligence is built from peer-reviewed literature and regulatory sources. Coverage is expanding.</small>
        </p>
      </Panel>
    );
  }

  // Show the highest-concern exposure profile
  const sorted = [...withExposure].sort((a, b) => {
    const tierOrder = { high: 4, elevated: 3, moderate: 2, low: 1, minimal: 0 };
    return (tierOrder[b.exposure.exposure_tier] ?? 0) - (tierOrder[a.exposure.exposure_tier] ?? 0);
  });

  const primary = sorted[0];
  const exp = primary.exposure;

  const tierStr = (exp.exposure_tier || 'unknown').toLowerCase();
  const highCount = (exp.concern_count_very_high ?? 0) + (exp.concern_count_high ?? 0);
  const modCount = exp.concern_count_moderate ?? 0;

  return (
    <Panel icon="âï¸" label="Toxicity & Exposure"
      badge={
        sorted.length > 1 && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {primary.material_name}
          </span>
        )
      }
    >
      {/* Tier + quality */}
      <div className="toxicity-tier-row">
        <span className={`toxicity-tier-badge concern-${tierStr}`}>
          {tierStr.charAt(0).toUpperCase() + tierStr.slice(1)} Exposure
        </span>
        <span className="toxicity-confidence">
          {exp.evidence_quality ? `${exp.evidence_quality} evidence` : ''}
        </span>
      </div>

      {/* Concern counts */}
      {(highCount > 0 || modCount > 0) && (
        <div className="toxicity-counts-row">
          x(exp.concern_count_very_high ?? 0) > 0 && (
            <div className="concern-count-chip very-high">
              <span className="count-num">{exp.concern_count_very_high}</span>
              very high
            </div>
          )}
          {(exp.concern_count_high ?? 0) > 0 && (
            <div className="concern-count-chip high">
              <span className="count-num">{exp.concern_count_high}</span>
              high
            </div>
          )}
          {modCount > 0 && (
            <div className="concern-count-chip moderate">
              <span className="count-num">{modCount}</span>
              moderate
            </div>
          )}
        </div>
      )}

      {/* Highest concern status */}
      {exp.highest_concern_status && exp.highest_concern_status !== 'unassessed' && (
        <div className="toxicity-status-row">
          <div className={`status-dot status-${exp.highest_concern_status}`} />
          <span className="status-label">
            Highest status: <strong style={{ color: 'var(--text-primary)' }}>
              {statusLabel(exp.highest_concern_status)}
            </strong>
          </span>
          {exp.highest_concern_dimension && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {exp.highest_concern_dimension.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      )}

      {/* Evidence signals */}
      <div className="toxicity-signals-row">
        <span className={`toxicity-signal-chip ${exp.has_regulatory_classification ? 'active' : ''}`}>
          {exp.has_regulatory_classification ? 'â' : 'â'} Regulatory listing
        </span>
        <span className={`toxicity-signal-chip ${exp.has_biomonitoring_evidence ? 'active' : ''}`}>
          {exp.has_biomonitoring_evidence ? 'â' : 'â'} Biomonitoring
        </span>
        <span className={`toxicity-signal-chip ${exp.has_human_observational_evidence ? 'active' : ''}`}>
          {exp.has_human_observational_evidence ? 'â' : 'â'} Human observational
        </span>
        {exp.count_regulatory_confirmed > 0 && (
          <span className="toxicity-signal-chip active">
            {exp.count_regulatory_confirmed} regulatory confirmed
          </span>
        )}
        {exp.count_academically_established > 0 && (
          <span className="toxicity-signal-chip active">
            {exp.count_academically_established} academically established
          </span>
        )}
      </div>

      {/* Processing-only caveat */}
      {exp.primary_concerns_are_processing_only && (
        <div className="toxicity-caveat">
          â ï¸ Primary concerns are associated with manufacturing and processing chemistry, not the finished material in typical consumer use.
        </div>
      )}

      {/* Consumer summary */}
      {exp.consumer_summary && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {exp.consumer_summary}
        </div>
      )}

      {/* Additional materials with exposure data */}
      {sorted.length > 1 && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          {sorted.slice(1).map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)', flex: 1 }}>{m.material_name}</span>
              <span className={`toxicity-tier-badge concern-${(m.exposure.exposure_tier || '').toLowerCase()}`}
                style={{ fontSize: 10, padding: '1px 8px' }}>
                {m.exposure.exposure_tier}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="toxicity-disclaimer">
        BioLens toxicity intelligence is for informational purposes only. It is not medical advice. Concern levels reflect material-level evidence, not individual product formulations.
      </div>
    </Panel>
  );
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Section 4: Origin Intelligence
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function OriginPanel({ originData }) {
  if (!originData) {
    return (
      <Panel icon="ð" label="Origin Intelligence">
        <p className="origin-unavailable">Origin data not available for this product.</p>
      </Panel>
    );
  }

  if (!originData.origin_available) {
    return (
      <Panel icon="ð" label="Origin Intelligence">
        <p className="origin-unavailable">
          {originData.reason === 'no_origin_profile'
            ? 'Origin could not be determined from available data.'
            : 'Origin data unavailable.'}
        </p>
      </Panel>
    );
  }

  const origin = originData.origin ?? {};
  const tariff = originData.tariff ?? {};
  const transport = originData.transport ?? {};
  const importStatus = originData.import_status ?? {};
  const resilience = originData.resilience ?? {};

  const statusKey = (origin.status || importStatus.status || 'unknown').toLowerCase();
  const gradeKey = (resilience.grade || '').toUpperCase();

  return (
    <Panel icon="ð" label="Origin Intelligence">
      {/* Country header */}
      <div className="origin-main-row">
        <div className="origin-country-block">
          <span className="origin-country-flag">
            {countryFlag(origin.country_code)}
          </span>
          <div>
            <div className="origin-country-name">
              {origin.country || 'Unknown origin'}
            </div>
            {origin.region && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{origin.region}</div>
            )}
            <div className="origin-confidence">
              {origin.confidence != null ? `${Math.round(origin.confidence * 100)}% confidence` : ''}
              {origin.claim_count > 0 ? ` Â· ${origin.claim_count} claim${origin.claim_count !== 1 ? 's' : ''}` : ''}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span className={`origin-status-badge origin-status-${statusKey}`}>
            {importStatus.status || origin.status || 'unknown'}
          </span>
          {resilience.grade && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Resilience</span>
              <span className={`resilience-grade-badge grade-${gradeKey}`}>{resilience.grade}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stat grid */}
      <div className="origin-grid">
        {/* Tariff */}
        <div className="origin-stat-card">
          <div className="origin-stat-label">Tariff exposure</div>
          {tariff.available === false ? (
            <div className="origin-stat-value" style={{ color: 'var(--text-muted)', fontSize: 12 }}>Not available</div>
          ) : (
            <>
              <div className="origin-stat-value" style={{
                color: (tariff.typical_pct ?? 0) > 20 ? 'var(--concern-high)'
                  : (tariff.typical_pct ?? 0) > 10 ? 'var(--concern-moderate)'
                  : 'var(--concern-minimal)'
              }}>
                {tariff.typical_pct != null ? fmtPct(tariff.typical_pct) : 'â'}
              </div>
              {tariff.min_pct != null && tariff.max_pct != null && (
                <div className="origin-stat-sub">
                  range {fmtPct(tariff.min_pct)} â {fmtPct(tariff.max_pct)}
                </div>
              )}
              {tariff.target_market && (
                <div className="origin-stat-sub">{tariff.target_market} market</div>
              )}
            </>
          )}
        </div>

        {/* Transport */}
        <div className="origin-stat-card">
          <div className="origin-stat-label">Transport</div>
          {transport.available === false ? (
            <div className="origin-stat-value" style={{ color: 'var(--text-muted)', fontSize: 12 }}>Not available</div>
          ) : (
            <>
              <div className="origin-stat-value">
                {transport.distance_km_estimate != null
                  ? `${Number(transport.distance_km_estimate).toLocaleString()} km`
                  : (transport.distance_km_min != null
                    ? `${Number(transport.distance_km_min).toLocaleString()}+ km`
                    : 'â')}
              </div>
              {transport.mode && (
                <div className="origin-stat-sub">{transport.mode}</div>
              )}
              {transport.burden_score != null && (
                <div className="origin-stat-sub">
                  burden {Math.round(transport.burden_score * 100)}
                </div>
              )}
            </>
          )}
        </div>

        {/* Import status */}
        {importStatus.available !== false && importStatus.status && (
          <div className="origin-stat-card">
            <div className="origin-stat-label">Import status</div>
            <div className="origin-stat-value" style={{ textTransform: 'capitalize', fontSize: 13 }}>
              {importStatus.status}
            </div>
            {importStatus.market && (
              <div className="origin-stat-sub">{importStatus.market} market</div>
            )}
          </div>
        )}

        {/* Resilience score */}
        {resilience.available !== false && resilience.score != null && (
          <div className="origin-stat-card">
            <div className="origin-stat-label">Supply resilience</div>
            <div className="origin-stat-value">
              {Math.round(resilience.score * 100)} / 100
            </div>
            {resilience.components && (
              <div className="origin-stat-sub">
                geo risk {Math.round((resilience.components.geopolitical_risk ?? 0) * 100)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Claims */}
      {originData.claims && originData.claims.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {originData.claims.slice(0, 3).map((c, i) => (
            <div key={i} style={{
              fontSize: 11, color: 'var(--text-muted)', padding: '4px 0',
              borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
              lineHeight: 1.4,
            }}>
              <span style={{ color: 'var(--text-secondary)', marginRight: 6 }}>
                {c.evidence_type?.replace(/_/g, ' ')}
              </span>
              {c.claim_text}
            </div>
          ))}
        </div>
      )}

      <p className="origin-note">
        Origin intelligence is derived from product label parsing and trade data.
        Confidence reflects evidence quality, not guarantee of origin.
      </p>
    </Panel>
  );
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Section 5: Lifecycle Intelligence
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function LifecyclePanel({ materials, isLoading }) {
  if (isLoading) {
    return (
      <Panel icon="â»ï¸" label="Lifecycle Intelligence">
        <div className="results-loading" style={{ minHeight: 80, gap: 8 }}>
          <div className="results-loading-spinner" style={{ width: 24, height: 24 }} />
          <span className="results-loading-text">Loading lifecycle dataâ¦</span>
        </div>
      </Panel>
    );
  }

  const withLifecycle = (materials || []).filter(m => m.lifecycle?.available);

  if (withLifecycle.length === 0) {
    return (
      <Panel icon="â»ï¸" label="Lifecycle Intelligence">
        <p className="lifecycle-unavailable">
          No lifecycle data available for these materials yet.
        </p>
      </Panel>
    );
  }

  const primary = withLifecycle[0];
  const lc = primary.lifecycle;

  const compositeNum = lc.composite_score != null ? Math.round(parseFloat(lc.composite_score) * 100) : null;
  const compositeColor = compositeNum != null ? scoreColor(lc.composite_score) : 'var(--text-muted)';

  return (
    <Panel icon="â»ï¸" label="Lifecycle Intelligence"
      badge={
        withLifecycle.length > 1 && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {primary.material_name}
          </span>
        )
      }
    >
      {/* Summary row */}
      <div className="lifecycle-summary-row">
        {compositeNum != null && (
          <div className="lifecycle-composite">
            <div className="lifecycle-composite-ring" style={{ borderColor: compositeColor, color: compositeColor }}>
              {compositeNum}
            </div>
            <span className="lifecycle-composite-label">composite</span>
          </div>
        )}

        <div className="lifecycle-flags">
          <div className={`lifecycle-flag ${lc.is_biodegradable ? 'good' : 'bad'}`}>
            <span className="lifecycle-flag-icon">{lc.is_biodegradable ? 'ð±' : 'ð«'}</span>
            <span className="lifecycle-flag-text">
              {lc.is_biodegradable ? 'Biodegradable' : 'Not biodegradable'}
            </span>
          </div>
          <div className={`lifecycle-flag ${lc.produces_microplastics ? 'bad' : 'good'}`}>
            <span className="lifecycle-flag-icon">{lc.produces_microplastics ? 'â ï¸' : 'â'}</span>
            <span className="lifecycle-flag-text">
              {lc.produces_microplastics ? 'Produces microplastics' : 'No microplastic generation'}
            </span>
          </div>
          <div className={`lifecycle-flag ${lc.is_recoverable ? 'good' : 'warn'}`}>
            <span className="lifecycle-flag-icon">{lc.is_recoverable ? 'â»ï¸' : 'ðï¸'}</span>
            <span className="lifecycle-flag-text">
              {lc.is_recoverable
                ? `Recoverable${lc.best_end_of_life_pathway ? ` Â· ${lc.best_end_of_life_pathway.replace(/_/g, ' ')}` : ''}`
                : 'Not easily recoverable'
              }
            </span>
          </div>
        </div>
      </div>

      {/* Score bars */}
      {(lc.recyclability_score != null || lc.compostability_score != null ||
        lc.microplastic_risk_score != null || lc.landfill_persistence_score != null) && (
        <div className="lifecycle-scores-grid">
          {lc.recyclability_score != null && (
            <div className="lifecycle-score-item">
              <div className="score-label">Recyclability</div>
              <div className="lifecycle-bar-row">
                <div className="lifecycle-bar-track">
                  <div className="lifecycle-bar-fill" style={{
                    width: `${Math.round(parseFloat(lc.recyclability_score) * 100)}%`,
                    background: scoreColor(lc.recyclability_score),
                  }} />
                </div>
                <span className="lifecycle-bar-num">
                  {Math.round(parseFloat(lc.recyclability_score) * 100)}
                </span>
              </div>
            </div>
          )}
          {lc.compostability_score != null && (
            <div className="lifecycle-score-item">
              <div className="score-label">Compostability</div>
              <div className="lifecycle-bar-row">
                <div className="lifecycle-bar-track">
                  <div className="lifecycle-bar-fill" style={{
                    width: `${Math.round(parseFloat(lc.compostability_score) * 100)}%`,
                    background: scoreColor(lc.compostability_score),
                  }} />
                </div>
                <span className="lifecycle-bar-num">
                  {Math.round(parseFloat(lc.compostability_score) * 100)}
                </span>
              </div>
            </div>
          )}
          {lc.microplastic_risk_score != null && (
            <div className="lifecycle-score-item">
              <div className="score-label">Microplastic risk</div>
              <div className="lifecycle-bar-row">
                <div className="lifecycle-bar-track">
                  <div className="lifecycle-bar-fill" style={{
                    width: `${Math.round(parseFloat(lc.microplastic_risk_score) * 100)}%`,
                    background: scoreColor(lc.microplastic_risk_score, true),
                  }} />
                </div>
                <span className="lifecycle-bar-num">
                  {Math.round(parseFloat(lc.microplastic_risk_score) * 100)}
                </span>
              </div>
            </div>
          )}
          {lc.landfill_persistence_score != null && (
            <div className="lifecycle-score-item">
              <div className="score-label">Landfill persist.</div>
              <div className="lifecycle-bar-row">
                <div className="lifecycle-bar-track">
                  <div className="lifecycle-bar-fill" style={{
                    width: `${Math.round(parseFloat(lc.landfill_persistence_score) * 100)}%`,
                    background: scoreColor(lc.landfill_persistence_score, true),
                  }} />
                </div>
                <span className="lifecycle-bar-num">
                  {Math.round(parseFloat(lc.landfill_persistence_score) * 100)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pathway profiles */}
      {lc.pathway_profiles && lc.pathway_profiles.length > 0 && (
        <div className="lifecycle-pathways">
          <div className="lifecycle-pathways-title">End-of-life pathways</div>
          {lc.pathway_profiles.map((p, i) => (
            <div key={i} className="pathway-row">
              <span className="pathway-icon">{pathwayIcon(p.pathway_key)}</span>
              <span className="pathway-name">
                {p.pathway_key?.replace(/_/g, ' ') ?? 'Unknown pathway'}
              </span>
              {p.degrades != null && (
                <span className={`pathway-chip ${p.degrades ? 'yes' : 'no'}`}>
                  {p.degrades ? 'degrades' : 'persists'}
                </span>
              )}
              {p.recoverable != null && (
                <span className={`pathway-chip ${p.recoverable ? 'yes' : 'no'}`}>
                  {p.recoverable ? 'recoverable' : 'not recoverable'}
                </span>
              )}
              {p.produces_microplastics && (
                <span className="pathway-chip warn">microplastics</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Other materials brief */}
      {withLifecycle.length > 1 && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          {withLifecycle.slice(1).map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)', flex: 1 }}>{m.material_name}</span>
              {m.lifecycle.is_biodegradable && (
                <span style={{ fontSize: 10, color: 'var(--concern-minimal)' }}>biodegradable</span>
              )}
              {m.lifecycle.produces_microplastics && (
                <span style={{ fontSize: 10, color: 'var(--concern-high)' }}>microplastics</span>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Main ResultsPage component
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function ResultsPage({ initialScanData, initialBarcode, onBack }) {
  // ââ URL params (for ?q= and ?barcode= routing from SearchBar) ââââââââââââââ
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qParam = searchParams.get('q') || '';
  const barcodeParam = searchParams.get('barcode') || '';

  // ââ State ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const [scanData, setScanData] = useState(initialScanData || null);
  const [materials, setMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [error, setError] = useState(null);

  // Manual search â pre-fill from URL param
  const [searchQuery, setSearchQuery] = useState(qParam);

  // ââ Derived origin data ââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const originData = scanData?.origin_intelligence ?? null;

  // ââ Resolve materials from scan tokens ââââââââââââââââââââââââââââââââââââ
  const resolveMaterials = useCallback(async (tokens, inferredFromTitle) => {
    if (!tokens || tokens.length === 0) {
      setMaterials([]);
      return;
    }
    setLoadingMaterials(true);
    try {
      const resolved = await analyzeTokens(tokens);
      setMaterials(resolved);
    } catch (err) {
      console.warn('analyzeTokens error:', err);
      setMaterials([]);
    } finally {
      setLoadingMaterials(false);
    }
  }, []);

  // ââ Initial load ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  useEffect(() => {
    if (initialScanData) {
      setScanData(initialScanData);
      resolveMaterials(initialScanData.input_tokens || []);
      return;
    }

    const barcode = initialBarcode || barcodeParam;
    if (barcode) {
      setScanLoading(true);
      scanBarcode(barcode)
        .then(data => {
          setScanData(data);
          resolveMaterials(data.input_tokens || []);
        })
        .catch(err => {
          setError('Could not look up this barcode. Try searching by material name.');
          console.warn(err);
        })
        .finally(() => setScanLoading(false));
      return;
    }

    if (qParam) {
      setLoadingMaterials(true);
      analyzeMaterial(qParam)
        .then(result => {
          if (result && result.found) {
            setMaterials([result]);
          } else {
            setMaterials([]);
            setError(`No material data found for "${qParam}".`);
          }
        })
        .catch(err => {
          setError('Material lookup failed. Please try again.');
          console.warn(err);
        })
        .finally(() => setLoadingMaterials(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setLoadingMaterials(true);
    setError(null);
    try {
      const result = await analyzeMaterial(q);
      if (result.found) {
        setMaterials([result]);
      } else {
        setMaterials([]);
        setError(`No material found for "${q}".`);
      }
    } catch (err) {
      setError('Material lookup failed. Please try again.');
      console.warn(err);
    } finally {
      setLoadingMaterials(false);
    }
  }, [searchQuery]);

  const handleSearchKey = useCallback((e) => {
    if (e.key === 'Enter') handleSearch();
  }, [handleSearch]);

  if (scanLoading) {
    return (
      <div className="results-page">
        <div className="results-loading">
          <div className="results-loading-spinner" />
          <span className="results-loading-text">Scanning productâ¦</span>
        </div>
      </div>
    );
  }

  return (
    <div className="results-page">
      <div className="results-header">
        <button className="results-back-btn" onClick={onBack || (() => navigate(-1))}>
          â Back
        </button>
        <span className="results-header-title">
          {scanData?.title
            ? scanData.title.substring(0, 50)
            : 'Material Intelligence'}
        </span>
      </div>

      <div className="results-content">
        <div className="results-search-row">
          <input
            className="results-search-input"
            type="text"
            placeholder="Search by material name (e.g. polyester, hemp, pvc)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKey}
          />
          <button
            className="results-search-btn"
            onClick={handleSearch}
            disabled={loadingMaterials || !searchQuery.trim()}
          >
            Analyze
          </button>
        </div>

        {error && <div className="results-error">{error}</div>}

        {scanData && scanData.title && (
          <ProductPanel scanData={scanData} />
        )}

        <MaterialPanel
          materials={materials}
          isLoading={loadingMaterials}
        />

        <ToxicityPanel
          materials={materials}
          isLoading={loadingMaterials}
        />

        <OriginPanel originData={originData} />

        <LifecyclePanel
          materials={materials}
          isLoading={loadingMaterials}
        />
      </div>
    </div>
  );
}
