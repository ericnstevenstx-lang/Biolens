import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, AlertCircle, ShieldCheck, ShieldAlert, ShieldX,
  Leaf, Share2, ScanBarcode, CheckCircle2, HelpCircle, ExternalLink,
  FlaskConical, Sprout, Droplets as DropIcon, Factory, Star, ArrowDown,
} from "lucide-react";
import SearchBar from "@/components/SearchBar";
import PetroloadMeter from "@/components/PetroloadMeter";
import ShareCard from "@/components/ShareCard";
import PurchaseImpact from "@/components/PurchaseImpact";
import {
  searchBioLens, getConfidenceLabel, getCategoryClass, getRiskConfig,
  saveScanToHistory, fetchAlternativeProducts, fetchProductSources, getPetroloadLevel,
} from "@/lib/biolens";

const RISK_ICONS = { High: ShieldX, Medium: ShieldAlert, Low: ShieldCheck };

/* ─── Risk Signal Bar ────────────────────────────── */
function RiskSignalBar({ label, value, color }) {
  if (value == null) return null;
  return (
    <div data-testid={`risk-signal-${label.toLowerCase().replace(/\s+/g, '-')}`} className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium" style={{ color: '#1D1D1F' }}>{label}</span>
          <span className="text-xs font-bold tabular-nums" style={{ fontFamily: "'Manrope', sans-serif", color }}>{value}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, backgroundColor: color }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Split Comparison Card ──────────────────────── */
function ComparisonCard({ query, result }) {
  const currentLevel = getPetroloadLevel(result.petroloadScore);
  const bestAlt = result.alternatives?.[0];
  if (!bestAlt) return null;

  // Estimate better petroload based on material class
  const altPetro = bestAlt.materialClass === "Plant-Based" ? 12
    : bestAlt.materialClass === "Natural Material" ? 15
    : bestAlt.materialClass === "Transition Material" ? 35 : 20;
  const altLevel = getPetroloadLevel(altPetro);

  return (
    <div data-testid="comparison-card" className="bg-white rounded-2xl border overflow-hidden animate-fade-up delay-100" style={{ borderColor: '#E5E5E5' }}>
      <div className="grid grid-cols-1 md:grid-cols-2 relative">
        {/* Current product */}
        <div className="p-6 md:p-8" style={{ backgroundColor: `${currentLevel.color}06` }}>
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest mb-3" style={{ color: '#86868B' }}>This Product</p>
          <p className="text-lg font-bold mb-1" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
            {query.charAt(0).toUpperCase() + query.slice(1)}
          </p>
          <p className="text-xs mb-4" style={{ color: '#86868B' }}>{result.materialName} - {result.materialClass}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold tabular-nums" style={{ fontFamily: "'Manrope', sans-serif", color: currentLevel.color }}>
              {result.petroloadScore ?? "—"}
            </span>
            <span className="text-xs font-medium" style={{ color: '#86868B' }}>Petroload</span>
          </div>
          <span className="inline-block mt-2 px-2.5 py-1 rounded-full text-[0.65rem] font-semibold" style={{ backgroundColor: `${currentLevel.color}15`, color: currentLevel.color }}>
            {currentLevel.label} Petro Risk
          </span>
        </div>

        {/* Center arrow (desktop) */}
        <div className="hidden md:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border shadow-sm z-10" style={{ borderColor: '#E5E5E5' }}>
          <ArrowRight className="w-4 h-4" style={{ color: '#22C55E' }} />
        </div>

        {/* Center arrow (mobile) */}
        <div className="md:hidden flex justify-center -my-3 relative z-10">
          <div className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center" style={{ borderColor: '#E5E5E5' }}>
            <ArrowDown className="w-3.5 h-3.5" style={{ color: '#22C55E' }} />
          </div>
        </div>

        {/* Better option */}
        <div className="p-6 md:p-8" style={{ backgroundColor: `${altLevel.color}06` }}>
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest mb-3" style={{ color: '#22C55E' }}>Better Option</p>
          <p className="text-lg font-bold mb-1" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
            {bestAlt.name} {query.split(' ').slice(-1)[0]}
          </p>
          <p className="text-xs mb-4" style={{ color: '#86868B' }}>{bestAlt.materialClass || "Plant-Based"}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold tabular-nums" style={{ fontFamily: "'Manrope', sans-serif", color: altLevel.color }}>
              {altPetro}
            </span>
            <span className="text-xs font-medium" style={{ color: '#86868B' }}>Petroload</span>
          </div>
          <span className="inline-block mt-2 px-2.5 py-1 rounded-full text-[0.65rem] font-semibold" style={{ backgroundColor: `${altLevel.color}15`, color: altLevel.color }}>
            {altLevel.label} Petro Risk
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Placeholder Product Card ───────────────────── */
function PlaceholderProductCard({ title, material, petroload }) {
  const level = getPetroloadLevel(petroload);
  return (
    <div className="card-lift rounded-xl border p-5" style={{ borderColor: '#E5E5E5' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="px-2 py-0.5 rounded-full text-[0.6rem] font-semibold" style={{ backgroundColor: `${level.color}12`, color: level.color }}>
          Petroload {petroload}
        </span>
        <Leaf className="w-3.5 h-3.5" style={{ color: '#22C55E' }} />
      </div>
      <p className="text-sm font-bold mb-0.5" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>{title}</p>
      <p className="text-xs" style={{ color: '#86868B' }}>Made with {material}</p>
    </div>
  );
}

/* ─── Live Product Card (FiberFoundry data, simplified) ── */
function LiveProductCard({ product }) {
  const level = getPetroloadLevel(product.petroloadScore);
  return (
    <div data-testid={`product-card-${product.productId}`} className="card-lift rounded-xl border p-5" style={{ borderColor: '#E5E5E5' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="px-2 py-0.5 rounded-full text-[0.6rem] font-semibold" style={{ backgroundColor: `${level.color}12`, color: level.color }}>
          Petroload {product.petroloadScore ?? '—'}%
        </span>
        {product.isFiberFoundry && <Star className="w-3.5 h-3.5" style={{ color: '#B45309' }} />}
      </div>
      <p className="text-sm font-bold mb-0.5" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>{product.title}</p>
      <p className="text-xs mb-1" style={{ color: '#86868B' }}>{product.brand}{product.alternativeMaterial ? ` - ${product.alternativeMaterial}` : ''}</p>
      {product.transparencyScore != null && (
        <p className="text-[0.65rem] mt-2" style={{ color: '#22C55E' }}>
          Transparency {Math.round(product.transparencyScore)}%{product.transparencyGrade ? ` (${product.transparencyGrade})` : ''}
        </p>
      )}
      {product.purchaseUrl && (
        <a href={product.purchaseUrl} target="_blank" rel="noopener noreferrer" data-testid={`buy-link-${product.productId}`}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium transition-colors duration-200"
          style={{ color: '#B45309' }}
        >
          View Product <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

/* ─── Main Results Page ──────────────────────────── */
export default function ResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const barcode = searchParams.get("barcode") || "";
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [altProducts, setAltProducts] = useState([]);
  const [altLoading, setAltLoading] = useState(false);
  const [productSources, setProductSources] = useState({});

  useEffect(() => {
    if (!query) return;
    const fetchResult = async () => {
      setLoading(true);
      setError(null);
      setResult(null);
      setAltProducts([]);
      setProductSources({});
      try {
        const data = await searchBioLens(query);
        setResult(data);
        if (data) {
          saveScanToHistory(query, data);
          setAltLoading(true);
          try {
            const products = await fetchAlternativeProducts(query, 6);
            setAltProducts(products);
            const nonFf = products.filter(p => !p.isFiberFoundry);
            if (nonFf.length > 0) {
              const srcResults = await Promise.all(nonFf.map(p => fetchProductSources(p.productId).then(s => [p.productId, s])));
              const srcMap = {};
              for (const [pid, srcs] of srcResults) { srcMap[pid] = srcs; }
              setProductSources(srcMap);
            }
          } catch (e) { console.error("Alt products fetch failed:", e); }
          finally { setAltLoading(false); }
        }
      } catch (err) {
        setError(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [query]);

  if (!query) {
    return (
      <div className="pt-32 pb-24 px-6 md:px-12 lg:px-24 min-h-screen">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
            Search for a product
          </h1>
          <p className="mb-8 text-sm" style={{ color: '#86868B' }}>
            Enter a product name to see its material classification and petroload.
          </p>
          <div className="flex justify-center"><SearchBar size="large" autoFocus /></div>
        </div>
      </div>
    );
  }

  const riskConfig = result ? getRiskConfig(result.riskLevel) : null;
  const RiskIcon = result ? (RISK_ICONS[result.riskLevel] || ShieldCheck) : ShieldCheck;
  const categoryClass = result ? getCategoryClass(result.materialClass) : "cat-mixed";
  const confidenceLabel = result ? getConfidenceLabel(result.confidenceScore) : "";

  // Product display — keep FiberFoundry plumbing, present subtly
  const ffProducts = altProducts.filter(p => p.isFiberFoundry);
  const externalProducts = altProducts.filter(p => !p.isFiberFoundry);
  const hasLiveProducts = ffProducts.length > 0 || externalProducts.length > 0;
  const displayProducts = ffProducts.length > 0 ? ffProducts : externalProducts.slice(0, 3);

  // Risk signals
  const riskSignals = result ? [
    { label: "Pesticide Risk", value: result.pesticideRisk, color: '#EF4444' },
    { label: "Synthetic Fertilizer", value: result.syntheticFertilizerRisk, color: '#F97316' },
    { label: "Processing Chemicals", value: result.processingChemicalRisk, color: '#B45309' },
    { label: "Herbicide Risk", value: result.herbicideRisk, color: '#9333EA' },
  ].filter(s => s.value != null) : [];

  // Generate placeholder product examples from alternatives
  const placeholderProducts = (result?.alternatives || []).slice(0, 3).map(alt => ({
    title: `${alt.name} ${query.split(' ').slice(-1)[0] || 'Product'}`,
    material: alt.name,
    petroload: alt.materialClass === "Plant-Based" ? 10 + Math.floor(Math.random() * 8)
      : alt.materialClass === "Natural Material" ? 12 + Math.floor(Math.random() * 10)
      : 25 + Math.floor(Math.random() * 15),
  }));

  return (
    <div data-testid="results-page" className="pt-28 pb-24 px-6 md:px-12 lg:px-24 min-h-screen">
      <div className="max-w-4xl mx-auto">

        {/* Back + search */}
        <div className="mb-10 animate-fade-up">
          <button data-testid="back-button" onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm font-medium mb-6 transition-colors duration-200"
            style={{ color: '#86868B' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#1D1D1F'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#86868B'}
          >
            <ArrowLeft className="w-4 h-4" /> Back to search
          </button>
          <SearchBar size="small" initialQuery={query} />
        </div>

        {/* Loading */}
        {loading && (
          <div data-testid="loading-state" className="mt-16 text-center">
            <div className="inline-block w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#E5E5E5', borderTopColor: '#B45309' }} />
            <p className="mt-4 text-sm" style={{ color: '#86868B' }}>Analyzing product...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div data-testid="error-state" className="mt-16 text-center">
            <AlertCircle className="w-10 h-10 mx-auto mb-4" style={{ color: '#EF4444' }} />
            <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>
            <button onClick={() => navigate("/")} className="btn-pill btn-secondary mt-6">Try another search</button>
          </div>
        )}

        {/* Not found */}
        {!result && !loading && !error && query && (
          <div data-testid="not-found-state" className="mt-16 animate-fade-up">
            <div className="bg-white rounded-2xl p-10 md:p-12 border text-center" style={{ borderColor: '#E5E5E5' }}>
              <AlertCircle className="w-10 h-10 mx-auto mb-4" style={{ color: '#86868B' }} />
              <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>Material not recognized</h2>
              <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: '#86868B' }}>
                We couldn't identify the primary material for "<strong style={{ color: '#1D1D1F' }}>{query}</strong>".
              </p>
              <button data-testid="explore-materials-fallback" onClick={() => navigate("/explore")} className="btn-pill btn-secondary">
                Browse Materials <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* ════════════════ RESULT FOUND ════════════════ */}
        {result && !loading && (
          <div data-testid="result-found" className="mt-4 space-y-6">

            {/* ── SECTION 1: Product Scanned ── */}
            <div className="bg-white rounded-2xl p-8 md:p-10 border animate-fade-up" style={{ borderColor: '#E5E5E5' }}>
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-widest mb-2" style={{ color: '#86868B' }}>
                    {barcode ? 'Scanned Product' : 'Product Searched'}
                  </p>
                  <h2 data-testid="result-product-name" className="text-2xl md:text-3xl font-extrabold" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
                    {query.charAt(0).toUpperCase() + query.slice(1)}
                  </h2>
                </div>
                <button data-testid="share-scan-button" onClick={() => setShowShare(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium border transition-colors duration-200"
                  style={{ color: '#1D1D1F', borderColor: '#E5E5E5', flexShrink: 0 }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#B45309'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E5E5E5'}
                >
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
              </div>

              {barcode && (
                <div className="flex items-center gap-2 mb-3">
                  <ScanBarcode className="w-3.5 h-3.5" style={{ color: '#86868B' }} />
                  <span className="text-xs" style={{ color: '#86868B' }}>Barcode: {barcode}</span>
                </div>
              )}

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2.5 mt-3 mb-8">
                <span data-testid="result-category-badge" className={`category-badge ${categoryClass}`}>{result.materialClass}</span>
                {riskConfig && (
                  <span data-testid="result-risk-badge" className={`risk-badge ${riskConfig.className}`}>
                    <RiskIcon className="w-4 h-4" /> {riskConfig.label}
                  </span>
                )}
                <span data-testid="result-confidence-badge" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: confidenceLabel === "Verified" ? 'rgba(34,197,94,0.08)' : '#F3F4F6', color: confidenceLabel === "Verified" ? '#22C55E' : '#86868B' }}
                >
                  {confidenceLabel === "Verified" || confidenceLabel === "Strong Match" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <HelpCircle className="w-3.5 h-3.5" />}
                  {confidenceLabel}
                </span>
              </div>

              {/* Petroload gauge centered */}
              <div className="flex justify-center mb-6">
                <div className="text-center">
                  <PetroloadMeter score={result.petroloadScore} size="large" />
                  <p className="text-xs mt-2 font-medium" style={{ color: '#86868B' }}>
                    {result.petroloadScore != null && result.petroloadScore >= 50 ? 'Very High Petro Dependence' : result.petroloadScore != null && result.petroloadScore >= 25 ? 'Moderate Petro Dependence' : 'Low Petro Dependence'}
                  </p>
                </div>
              </div>
            </div>

            {/* ── SECTION 2: Material Analysis ── */}
            <div className="bg-white rounded-2xl p-8 md:p-10 border animate-fade-up delay-100" style={{ borderColor: '#E5E5E5' }}>
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest mb-1" style={{ color: '#86868B' }}>Material Identified</p>
              <h3 data-testid="result-material-name" className="text-xl font-bold mb-3" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
                {result.materialName}
              </h3>
              <p data-testid="result-explanation" className="text-sm leading-relaxed mb-6" style={{ color: '#4B5563' }}>
                {result.explanation}
              </p>

              {/* Health Score */}
              {result.healthScore != null && (
                <div className="mb-6 pb-6" style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium" style={{ color: '#86868B' }}>Material Health Score</span>
                    <span data-testid="health-score-value" className="text-sm font-bold tabular-nums" style={{ fontFamily: "'Manrope', sans-serif", color: result.healthScore >= 60 ? '#22C55E' : result.healthScore >= 40 ? '#EAB308' : '#EF4444' }}>
                      {result.healthScore}/100
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
                    <div data-testid="health-score-bar" className="h-full rounded-full" style={{ width: `${result.healthScore}%`, backgroundColor: result.healthScore >= 60 ? '#22C55E' : result.healthScore >= 40 ? '#EAB308' : '#EF4444', transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              )}

              {/* Risk Signals */}
              {riskSignals.length > 0 && (
                <div data-testid="risk-signals-section">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-widest mb-4" style={{ color: '#86868B' }}>Risk Signals</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {riskSignals.map(s => <RiskSignalBar key={s.label} {...s} />)}
                  </div>
                </div>
              )}
            </div>

            {/* ── SECTION 2.5: Split Comparison Card ── */}
            {result.alternatives && result.alternatives.length > 0 && (
              <ComparisonCard query={query} result={result} />
            )}

            {/* ── SECTION 3: Better Materials ── */}
            {result.alternatives && result.alternatives.length > 0 && (
              <div data-testid="alternatives-section" className="bg-white rounded-2xl p-8 md:p-10 border animate-fade-up delay-200" style={{ borderColor: '#E5E5E5' }}>
                <p className="text-[0.65rem] font-semibold uppercase tracking-widest mb-1" style={{ color: '#86868B' }}>
                  Replace {result.materialName} With
                </p>
                <div className="flex items-center gap-2 mb-6">
                  <Leaf className="w-5 h-5" style={{ color: '#22C55E' }} />
                  <h3 className="text-lg font-bold" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>Better Materials</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {result.alternatives.map((alt, idx) => (
                    <div key={`${alt.name}-${idx}`} data-testid={`alternative-${alt.name.toLowerCase().replace(/\s+/g, '-')}`}
                      className="card-lift rounded-xl p-5 border" style={{ borderColor: '#E5E5E5' }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-sm" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>{alt.name}</p>
                          {alt.materialClass && <p className="text-xs mt-0.5" style={{ color: '#22C55E' }}>{alt.materialClass}</p>}
                          {alt.reason && <p className="text-xs mt-2 leading-relaxed" style={{ color: '#86868B' }}>{alt.reason}</p>}
                        </div>
                        <Leaf className="w-4 h-4 flex-shrink-0 ml-3" style={{ color: '#22C55E' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── SECTION 4: Better Product Examples ── */}
            <div data-testid="where-to-buy-section" className="bg-white rounded-2xl p-8 md:p-10 border animate-fade-up delay-300" style={{ borderColor: '#E5E5E5' }}>
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest mb-1" style={{ color: '#86868B' }}>Curated Examples</p>
              <h3 className="text-lg font-bold mb-6" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>Better Product Examples</h3>

              {altLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#E5E5E5', borderTopColor: '#B45309' }} />
                </div>
              ) : hasLiveProducts ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayProducts.map(p => <LiveProductCard key={p.productId} product={p} />)}
                  </div>
                  <p className="mt-5 text-xs text-center" style={{ color: '#86868B' }}>
                    Available on FiberFoundry (coming soon)
                  </p>
                </>
              ) : placeholderProducts.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {placeholderProducts.map((p, i) => <PlaceholderProductCard key={i} {...p} />)}
                  </div>
                  <p className="mt-5 text-xs text-center" style={{ color: '#86868B' }}>
                    Available on FiberFoundry (coming soon)
                  </p>
                </>
              ) : null}
            </div>

            {/* Purchase Impact */}
            <PurchaseImpact result={result} />

            {/* No alternatives — good material */}
            {result.alternatives && result.alternatives.length === 0 && (
              <div data-testid="no-alternatives-section" className="bg-white rounded-2xl p-8 md:p-10 border animate-fade-up delay-200" style={{ borderColor: '#E5E5E5' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(34,197,94,0.1)' }}>
                    <ShieldCheck className="w-5 h-5" style={{ color: '#22C55E' }} />
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>This is already a great material choice</p>
                    <p className="text-xs mt-0.5" style={{ color: '#86868B' }}>{result.materialName} is a responsible material. Keep choosing products like this.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {showShare && result && <ShareCard result={result} query={query} onClose={() => setShowShare(false)} />}
      </div>
    </div>
  );
}
