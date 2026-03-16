import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, AlertCircle, ShieldCheck, ShieldAlert, ShieldX,
  Leaf, Share2, ScanBarcode, CheckCircle2, HelpCircle,
  ChevronDown, ChevronUp, Droplets, Zap, Recycle, Building2,
  Package, Globe, Flame, MapPin, Truck, FlaskConical, Info,
  Sparkles, Box, ShoppingBag, Star
} from "lucide-react";
import SearchBar from "@/components/SearchBar";
import PetroloadMeter from "@/components/PetroloadMeter";
import ShareCard from "@/components/ShareCard";
import PurchaseImpact from "@/components/PurchaseImpact";
import MaterialDNA from "@/components/MaterialDNA";
import {
  searchBioLens,
  getConfidenceLabel,
  getCategoryClass,
  getRiskConfig,
  saveScanToHistory,
  fetchAlternativeProducts,
  fetchProductSources,
  getPetroloadLevel,
  lookupProductByBarcode,
} from "@/lib/biolens";

const RISK_ICONS = { High: ShieldX, Medium: ShieldAlert, Low: ShieldCheck };

const TIER_CONFIG = {
  bio_pure:      { label: "Bio-Pure",      bg: "rgba(34,197,94,0.08)",  border: "#22C55E40", color: "#15803D" },
  bridge:        { label: "Bridge",        bg: "rgba(234,179,8,0.08)",  border: "#EAB30840", color: "#A16207" },
  petrochemical: { label: "Petrochemical", bg: "rgba(239,68,68,0.08)",  border: "#EF444440", color: "#B91C1C" },
  unknown:       { label: "Unknown",       bg: "rgba(107,114,128,0.08)",border: "#6B728040", color: "#374151" },
};

const EXPOSURE_CONFIG = {
  high:     { color: "#EF4444", bg: "rgba(239,68,68,0.06)",   border: "#EF444440", label: "High Concern" },
  moderate: { color: "#F59E0B", bg: "rgba(245,158,11,0.06)",  border: "#F59E0B40", label: "Moderate Concern" },
  low:      { color: "#22C55E", bg: "rgba(34,197,94,0.06)",   border: "#22C55E40", label: "Low Concern" },
  minimal:  { color: "#22C55E", bg: "rgba(34,197,94,0.06)",   border: "#22C55E40", label: "Minimal Concern" },
  unknown:  { color: "#6B7280", bg: "rgba(107,114,128,0.06)", border: "#6B728040", label: "No Data" },
};

const RESILIENCE_COLORS = { A: "#22C55E", B: "#84CC16", C: "#F59E0B", D: "#F97316", F: "#EF4444" };

/* ── Collapsible section ──────────────────────────────────────── */
function Section({ icon: Icon, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {Icon && <Icon size={16} style={{ color: '#6B7280' }} />}
          <span className="font-semibold text-sm" style={{ color: '#1D1D1F' }}>{title}</span>
        </div>
        {open
          ? <ChevronUp size={14} style={{ color: '#9CA3AF' }} />
          : <ChevronDown size={14} style={{ color: '#9CA3AF' }} />}
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
}

/* ── Score bar row ────────────────────────────────────────────── */
function ScoreRow({ label, value, max = 100, color = "#22C55E" }) {
  if (value == null) return null;
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs" style={{ color: '#485563' }}>{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: pct + '%', backgroundColor: color }} />
        </div>
        <span className="text-xs font-bold tabular-nums w-8 text-right" style={{ color }}>{value}</span>
      </div>
    </div>
  );
}

/* ── Tag chip ─────────────────────────────────────────────────── */
function Chip({ label, color = "#EF4444" }) {
  return (
    <span className="inline-flex text-xs px-2 py-1 rounded-full font-medium"
      style={{ color, backgroundColor: color + '18', border: '1px solid ' + color + '40' }}>
      {label}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
export default function ResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const query    = searchParams.get("q") || searchParams.get("barcode") || "";
  const isBarcode = /^\d{8,14}$/.test(query.trim());

  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setError(null);
    setResult(null);
    searchBioLens(query)
      .then(data => {
        setResult(data);
        setLoading(false);
        if (data?.found) saveScanToHistory?.(data);
      })
      .catch(err => {
        setError(err?.message || "Lookup failed");
        setLoading(false);
      });
  }, [query]);

  /* ── Loading ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4"
        style={{ backgroundColor: '#F5F5F7' }}>
        <div className="w-12 h-12 rounded-full border-4 border-green-200 border-t-green-600 animate-spin" />
        <p className="text-sm" style={{ color: '#6B7280' }}>Analyzing material intelligence…</p>
      </div>
    );
  }

  /* ── Error ───────────────────────────────────────────────── */
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4"
        style={{ backgroundColor: '#F5F5F7' }}>
        <AlertCircle size={40} style={{ color: '#F87171' }} />
        <p className="text-sm text-center" style={{ color: '#DC2626' }}>{error}</p>
        <button onClick={() => navigate(-1)} className="text-sm underline" style={{ color: '#15803D' }}>Go back</button>
      </div>
    );
  }

  /* ── No query ────────────────────────────────────────────── */
  if (!query) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F5F7' }}>
        <div className="max-w-xl mx-auto w-full px-4 pt-6"><SearchBar /></div>
      </div>
    );
  }

  /* ── Not found ───────────────────────────────────────────── */
  if (result && !result.found) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4"
        style={{ backgroundColor: '#F5F5F7' }}>
        <ScanBarcode size={40} style={{ color: '#D1D5DB' }} />
        <p className="text-sm text-center" style={{ color: '#6B7280' }}>
          No material data found for <strong>{query}</strong>.
        </p>
        <button onClick={() => navigate(-1)} className="text-sm underline" style={{ color: '#15803D' }}>
          Try another search
        </button>
      </div>
    );
  }

  if (!result) return null;

  /* ── Destructure payload ─────────────────────────────────── */
  const {
    product_name, brand, barcode: resultBarcode, image_url,
    material_name, material_class, framework_tier,
    materials,
    petroload_score, petroload, risk_level, risk_label, risk_color,
    overall_material_health_score, confidence_score, match_source,
    pesticide_risk_score, petro_ag_dependency_score, processing_chemical_risk_score,
    explanation,
    alternatives,
    lifecycle,
    exposure,
    origin_intelligence,
    has_fiberfoundry_products,
  } = result;

  const displayScore    = petroload_score ?? petroload ?? null;
  const confLabel       = getConfidenceLabel?.(confidence_score) ?? null;
  const tier            = framework_tier || "unknown";
  const tierCfg         = TIER_CONFIG[tier] || TIER_CONFIG.unknown;
  const productDisplay  = product_name || material_name || query;

  const expKey    = (exposure?.exposure_tier || "unknown").toLowerCase();
  const expCfg    = EXPOSURE_CONFIG[expKey] || EXPOSURE_CONFIG.unknown;

  const resGrade  = origin_intelligence?.resilience_grade;
  const resColor  = resGrade ? (RESILIENCE_COLORS[resGrade] || "#6B7280") : null;

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: '#F5F5F7' }}>

      {/* ── Nav bar ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 border-b border-gray-200 px-4 py-3"
        style={{ backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
            <ArrowLeft size={18} style={{ color: '#374151' }} />
          </button>
          <div className="flex-1">
            <SearchBar compact initialValue={query} />
          </div>
          <button onClick={() => setShowShare(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
            <Share2 size={18} style={{ color: '#374151' }} />
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-4">

        {/* ══════════════════════════════════════════════════════
            1. PRODUCT SCANNED
        ══════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-3 flex gap-4">
          {image_url && (
            <img src={image_url} alt={productDisplay}
              className="w-20 h-20 rounded-xl object-cover border border-gray-100 flex-shrink-0"
              onError={e => { e.currentTarget.style.display = 'none'; }} />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base leading-snug" style={{ color: '#1D1D1F' }}>
              {productDisplay}
            </h1>
            {brand && (
              <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>{brand}</p>
            )}
            {(resultBarcode || isBarcode) && (
              <p className="text-xs mt-1 font-mono" style={{ color: '#9CA3AF' }}>
                {resultBarcode || query}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border"
                style={{ color: tierCfg.color, backgroundColor: tierCfg.bg, borderColor: tierCfg.border }}>
                {tierCfg.label}
              </span>
              {risk_label && (
                <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border"
                  style={{
                    color: risk_color || '#6B7280',
                    backgroundColor: (risk_color || '#6B7280') + '18',
                    borderColor: (risk_color || '#6B7280') + '40'
                  }}>
                  {risk_label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            2. MATERIAL INTELLIGENCE
        ══════════════════════════════════════════════════════ */}
        <Section icon={FlaskConical} title="Material Intelligence">
          <div className="mb-3">
            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>
              Identified Material
            </p>
            <p className="font-semibold" style={{ color: '#1D1D1F' }}>{material_name || "Unknown"}</p>
            {material_class && (
              <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{material_class}</p>
            )}
          </div>

          {Array.isArray(materials) && materials.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#9CA3AF' }}>Composition</p>
              <div className="space-y-1">
                {materials.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span style={{ color: '#374151' }}>{m.name || m.material_name}</span>
                    {m.fraction != null && (
                      <span className="tabular-nums" style={{ color: '#6B7280' }}>
                        {Math.round(m.fraction * 100)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {displayScore != null && (
            <div className="mb-3">
              <PetroloadMeter score={displayScore} riskLevel={risk_level} riskColor={risk_color} />
            </div>
          )}

          <div>
            <ScoreRow label="Petroload Score" value={displayScore} max={100} color="#EF4444" />
            <ScoreRow label="Overall Health Score" value={overall_material_health_score} max={100} color="#22C55E" />
            <ScoreRow label="Pesticide Risk" value={pesticide_risk_score} max={10} color="#F59E0B" />
            <ScoreRow label="Petro-Ag Dependency" value={petro_ag_dependency_score} max={10} color="#F97316" />
            <ScoreRow label="Processing Chemical Risk" value={processing_chemical_risk_score} max={10} color="#8B5CF6" />
          </div>

          {explanation && (
            <p className="mt-3 text-xs leading-relaxed pt-3 border-t border-gray-100"
              style={{ color: '#485563' }}>{explanation}</p>
          )}

          {confidence_score != null && (
            <div className="mt-2 flex items-center gap-1.5">
              <Info size={11} style={{ color: '#9CA3AF' }} />
              <span className="text-xs" style={{ color: '#9CA3AF' }}>
                Confidence: {confLabel || (Math.round(confidence_score * 100) + '%')}
                {match_source ? ' · ' + match_source : ''}
              </span>
            </div>
          )}
        </Section>

        {/* ══════════════════════════════════════════════════════
            3. TOXICITY & EXPOSURE INTELLIGENCE
        ══════════════════════════════════════════════════════ */}
        <Section icon={ShieldAlert} title="Toxicity & Exposure Intelligence">
          {exposure ? (
            <>
              <div className="rounded-xl p-3 mb-4 border"
                style={{ backgroundColor: expCfg.bg, borderColor: expCfg.border }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ color: expCfg.color }}>
                    {expCfg.label}
                  </span>
                  {exposure.confidence_label && (
                    <span className="text-xs" style={{ color: '#6B7280' }}>
                      {exposure.confidence_label}
                    </span>
                  )}
                </div>
                {exposure.caveat && (
                  <p className="text-xs mt-1.5 leading-relaxed" style={{ color: '#374151' }}>
                    {exposure.caveat}
                  </p>
                )}
              </div>

              {Array.isArray(exposure.concern_dimensions) && exposure.concern_dimensions.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium uppercase tracking-wider mb-2"
                    style={{ color: '#9CA3AF' }}>Highest Concern Dimensions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {exposure.concern_dimensions.slice(0, 10).map((dim, i) => (
                      <Chip key={i}
                        label={typeof dim === "string" ? dim : (dim.name || dim.dimension || dim)}
                        color={expCfg.color} />
                    ))}
                  </div>
                </div>
              )}

              {exposure.evidence_basis && (
                <p className="text-xs leading-relaxed pt-3 border-t border-gray-100"
                  style={{ color: '#485563' }}>{exposure.evidence_basis}</p>
              )}
            </>
          ) : (
            <p className="text-sm italic" style={{ color: '#9CA3AF' }}>
              Exposure data not available for this material.
            </p>
          )}
        </Section>

        {/* ══════════════════════════════════════════════════════
            4. ORIGIN INTELLIGENCE
        ══════════════════════════════════════════════════════ */}
        <Section icon={Globe} title="Origin Intelligence">
          {origin_intelligence ? (
            <div className="space-y-3">
              {origin_intelligence.origin_status && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl border"
                  style={{ backgroundColor: 'rgba(59,130,246,0.06)', borderColor: '#3B82F640' }}>
                  <MapPin size={15} style={{ color: '#3B82F6', marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: '#3B82F6' }}>Origin Status</p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: '#1E3A5F' }}>
                      {origin_intelligence.origin_status}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {origin_intelligence.best_origin_country && (
                  <div className="p-3 rounded-xl border border-gray-200" style={{ backgroundColor: '#F9FAFB' }}>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>Best Origin</p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: '#1D1D1F' }}>
                      {origin_intelligence.best_origin_country}
                    </p>
                  </div>
                )}

                {resGrade && (
                  <div className="p-3 rounded-xl border"
                    style={{ backgroundColor: resColor + '12', borderColor: resColor + '40' }}>
                    <p className="text-xs" style={{ color: resColor }}>Resilience</p>
                    <p className="text-2xl font-extrabold" style={{ color: resColor }}>{resGrade}</p>
                  </div>
                )}

                {origin_intelligence.tariff_exposure_range && (
                  <div className="p-3 rounded-xl border border-gray-200" style={{ backgroundColor: '#F9FAFB' }}>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>Tariff Exposure</p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: '#1D1D1F' }}>
                      {origin_intelligence.tariff_exposure_range}
                    </p>
                  </div>
                )}

                {origin_intelligence.transport_estimate && (
                  <div className="p-3 rounded-xl border border-gray-200" style={{ backgroundColor: '#F9FAFB' }}>
                    <div className="flex items-center gap-1 mb-0.5">
                      <Truck size={11} style={{ color: '#9CA3AF' }} />
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>Transport</p>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: '#1D1D1F' }}>
                      {origin_intelligence.transport_estimate}
                    </p>
                  </div>
                )}

                {origin_intelligence.market_import_status && (
                  <div className="p-3 rounded-xl border border-gray-200 col-span-2"
                    style={{ backgroundColor: '#F9FAFB' }}>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>Market Import Status</p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: '#1D1D1F' }}>
                      {origin_intelligence.market_import_status}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm italic" style={{ color: '#9CA3AF' }}>
              Origin data not available for this product.
            </p>
          )}
        </Section>

        {/* ══════════════════════════════════════════════════════
            5. LIFECYCLE INTELLIGENCE
        ══════════════════════════════════════════════════════ */}
        <Section icon={Recycle} title="Lifecycle Intelligence">
          {lifecycle ? (
            <>
              {lifecycle.composite_score != null && (
                <div className="p-3 rounded-xl border mb-4"
                  style={{ backgroundColor: 'rgba(34,197,94,0.06)', borderColor: '#22C55E40' }}>
                  <p className="text-xs font-medium" style={{ color: '#15803D' }}>Lifecycle Score</p>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-extrabold" style={{ color: '#15803D' }}>
                      {lifecycle.composite_score}
                    </span>
                    <span className="text-xs" style={{ color: '#16A34A' }}>/100</span>
                  </div>
                </div>
              )}

              <ScoreRow label="Recyclability" value={lifecycle.recyclability} max={10} color="#22C55E" />
              <ScoreRow label="Compostability" value={lifecycle.compostability} max={10} color="#84CC16" />
              <ScoreRow
                label="Microplastic Risk"
                value={lifecycle.microplastic_risk}
                max={10}
                color={
                  lifecycle.microplastic_risk > 6 ? "#EF4444"
                  : lifecycle.microplastic_risk > 3 ? "#F59E0B"
                  : "#22C55E"
                }
              />

              {lifecycle.landfill_persistence_years != null && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-xs" style={{ color: '#485563' }}>Landfill Persistence</span>
                  <span className="text-xs font-semibold" style={{ color: '#374151' }}>
                    {lifecycle.landfill_persistence_years === 0
                      ? "Biodegradable"
                      : lifecycle.landfill_persistence_years > 500
                      ? "500+ years"
                      : "~" + lifecycle.landfill_persistence_years + " years"}
                  </span>
                </div>
              )}

              {lifecycle.best_end_of_life && (
                <div className="mt-3 p-3 rounded-xl border"
                  style={{ backgroundColor: 'rgba(34,197,94,0.06)', borderColor: '#22C55E40' }}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Leaf size={13} style={{ color: '#15803D' }} />
                    <p className="text-xs font-medium" style={{ color: '#15803D' }}>Best End-of-Life</p>
                  </div>
                  <p className="text-sm" style={{ color: '#166534' }}>{lifecycle.best_end_of_life}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm italic" style={{ color: '#9CA3AF' }}>
              Lifecycle data not available for this material.
            </p>
          )}
        </Section>

        {/* ── MaterialDNA / alternatives ──────────────────────── */}
        {result && (
          <div className="mb-3">
            <MaterialDNA material={result} alternatives={alternatives} />
          </div>
        )}

        {/* ── FiberFoundry CTA ────────────────────────────────── */}
        {has_fiberfoundry_products && (
          <div className="rounded-2xl p-5 mb-3" style={{ backgroundColor: '#14532D' }}>
            <div className="flex items-center gap-2 mb-1">
              <Leaf size={15} style={{ color: '#86EFAC' }} />
              <span className="text-sm font-semibold text-white">Available on FiberFoundry</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#BBF7D0' }}>
              Better alternatives to this product are available in the FiberFoundry marketplace.
            </p>
            <button className="mt-3 text-xs font-bold px-4 py-2 rounded-full transition-colors"
              style={{ backgroundColor: 'white', color: '#14532D' }}>
              Shop Alternatives
            </button>
          </div>
        )}

        {/* ── Purchase Impact ──────────────────────────────────── */}
        {result && <PurchaseImpact result={result} />}

      </div>

      {/* ── Share modal ─────────────────────────────────────────── */}
      {showShare && result && (
        <ShareCard result={result} query={productDisplay} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}
