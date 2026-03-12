import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, AlertCircle, ShieldCheck, ShieldAlert, ShieldX,
  Leaf, Share2, ScanBarcode, CheckCircle2, HelpCircle, ExternalLink,
  FlaskConical, Sprout, Droplets as DropIcon, Factory, Star,
} from "lucide-react";
import SearchBar from "@/components/SearchBar";
import PetroloadMeter from "@/components/PetroloadMeter";
import ShareCard from "@/components/ShareCard";
import PurchaseImpact from "@/components/PurchaseImpact";
import {
  searchBioLens, getConfidenceLabel, getCategoryClass, getRiskConfig,
  saveScanToHistory, fetchAlternativeProducts, fetchProductSources,
} from "@/lib/biolens";

const RISK_ICONS = {
  High: ShieldX,
  Medium: ShieldAlert,
  Low: ShieldCheck,
};

function RiskSignalBar({ label, icon, value, color }) {
  if (value == null) return null;
  return (
    <div data-testid={`risk-signal-${label.toLowerCase().replace(/\s+/g, '-')}`} className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}12`, color }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium" style={{ fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>{label}</span>
          <span className="text-xs font-semibold tabular-nums" style={{ fontFamily: "'Inter', sans-serif", color }}>{value}/100</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#E5E5E5' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, backgroundColor: color }} />
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, sources }) {
  const isFf = product.isFiberFoundry;
  const score = product.transparencyScore ? Math.round(product.transparencyScore) : null;

  return (
    <div
      data-testid={`product-card-${product.productId}`}
      className="card-lift rounded-xl border p-5 flex flex-col gap-3"
      style={{ borderColor: isFf ? '#B45309' : '#E5E5E5', borderWidth: isFf ? '2px' : '1px' }}
    >
      {isFf && (
        <span className="self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.65rem] font-semibold uppercase tracking-wider" style={{ backgroundColor: 'rgba(180, 83, 9, 0.08)', color: '#B45309' }}>
          <Star className="w-3 h-3" /> FiberFoundry
        </span>
      )}
      <div>
        <p className="font-semibold text-sm" style={{ fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>{product.title}</p>
        <p className="text-xs mt-0.5" style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}>{product.brand}{product.category ? ` - ${product.category}` : ''}</p>
      </div>
      {product.alternativeMaterial && (
        <p className="text-xs leading-relaxed" style={{ color: '#15803d', fontFamily: "'Inter', sans-serif" }}>
          Made with {product.alternativeMaterial} {product.replacementReason ? `- ${product.replacementReason}` : ''}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 mt-1">
        {product.price != null && (
          <span className="text-lg font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: '#1D1D1F' }}>${product.price}</span>
        )}
        {score != null && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-medium" style={{ backgroundColor: score >= 80 ? 'rgba(21,128,61,0.08)' : score >= 50 ? 'rgba(245,158,11,0.08)' : 'rgba(190,18,60,0.08)', color: score >= 80 ? '#15803d' : score >= 50 ? '#B45309' : '#BE123C' }}>
            Transparency {score}%{product.transparencyGrade ? ` (${product.transparencyGrade})` : ''}
          </span>
        )}
        {product.trustScore != null && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-medium" style={{ backgroundColor: 'rgba(29,29,31,0.05)', color: '#86868B' }}>
            Trust {Math.round(product.trustScore * 100)}%
          </span>
        )}
        {product.petroloadScore != null && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-medium" style={{ backgroundColor: 'rgba(21,128,61,0.08)', color: '#15803d' }}>
            Petroload {product.petroloadScore}%
          </span>
        )}
      </div>
      {/* Purchase links */}
      {product.purchaseUrl && (
        <a
          href={product.purchaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`buy-link-${product.productId}`}
          className="mt-2 inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-medium transition-colors duration-200"
          style={{ backgroundColor: isFf ? '#B45309' : '#1D1D1F', color: 'white', fontFamily: "'Inter', sans-serif" }}
        >
          {isFf ? 'Buy on FiberFoundry' : 'View Product'}
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
      {/* Additional sources if not FiberFoundry-exclusive */}
      {sources && sources.length > 0 && !isFf && (
        <div className="flex flex-wrap gap-2 mt-1">
          {sources.filter(s => !s.is_fiberfoundry).slice(0, 3).map((s, i) => (
            <a key={i} href={s.source_url} target="_blank" rel="noopener noreferrer" className="text-[0.65rem] underline" style={{ color: '#86868B' }}>
              {s.source_name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

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
          // Fetch alternative products in parallel
          setAltLoading(true);
          try {
            const products = await fetchAlternativeProducts(query, 6);
            setAltProducts(products);
            // Fetch sources for non-FiberFoundry products
            const nonFf = products.filter(p => !p.isFiberFoundry);
            if (nonFf.length > 0) {
              const srcPromises = nonFf.map(p => fetchProductSources(p.productId).then(s => [p.productId, s]));
              const srcResults = await Promise.all(srcPromises);
              const srcMap = {};
              for (const [pid, srcs] of srcResults) { srcMap[pid] = srcs; }
              setProductSources(srcMap);
            }
          } catch (e) { console.error("Alt products fetch failed:", e); }
          finally { setAltLoading(false); }
        }
      } catch (err) {
        setError(err.message || "Something went wrong. Please try again.");
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
          <h1 className="text-3xl sm:text-4xl font-semibold mb-4" style={{ fontFamily: "'Playfair Display', serif", color: '#1D1D1F' }}>
            Search for a product
          </h1>
          <p className="mb-8 text-sm" style={{ color: '#86868B', fontFamily: "'Inter', sans-serif" }}>
            Enter a product name to see its material classification and petroload.
          </p>
          <div className="flex justify-center">
            <SearchBar size="large" autoFocus />
          </div>
        </div>
      </div>
    );
  }

  const riskConfig = result ? getRiskConfig(result.riskLevel) : null;
  const RiskIcon = result ? (RISK_ICONS[result.riskLevel] || ShieldCheck) : ShieldCheck;
  const categoryClass = result ? getCategoryClass(result.materialClass) : "cat-mixed";
  const confidenceLabel = result ? getConfidenceLabel(result.confidenceScore) : "";

  // Determine purchase display: FiberFoundry-only if available, else external sources
  const ffProducts = altProducts.filter(p => p.isFiberFoundry);
  const externalProducts = altProducts.filter(p => !p.isFiberFoundry);
  const showFfExclusive = ffProducts.length > 0;
  const displayProducts = showFfExclusive ? ffProducts : externalProducts.slice(0, 3);

  // Risk signals
  const riskSignals = result ? [
    { label: "Pesticide Risk", icon: <FlaskConical className="w-3.5 h-3.5" />, value: result.pesticideRisk, color: '#BE123C' },
    { label: "Synthetic Fertilizer", icon: <Sprout className="w-3.5 h-3.5" />, value: result.syntheticFertilizerRisk, color: '#EA580C' },
    { label: "Processing Chemicals", icon: <Factory className="w-3.5 h-3.5" />, value: result.processingChemicalRisk, color: '#B45309' },
    { label: "Herbicide Risk", icon: <DropIcon className="w-3.5 h-3.5" />, value: result.herbicideRisk, color: '#9333EA' },
  ].filter(s => s.value != null) : [];

  return (
    <div data-testid="results-page" className="pt-28 pb-24 px-6 md:px-12 lg:px-24 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Back + search */}
        <div className="mb-10 animate-fade-up">
          <button
            data-testid="back-button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm font-medium mb-6 transition-colors duration-200"
            style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#1D1D1F'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#86868B'}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to search
          </button>
          <SearchBar size="small" initialQuery={query} />
        </div>

        {/* Loading */}
        {loading && (
          <div data-testid="loading-state" className="mt-16 text-center">
            <div className="inline-block w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#E5E5E5', borderTopColor: '#B45309' }} />
            <p className="mt-4 text-sm" style={{ color: '#86868B', fontFamily: "'Inter', sans-serif" }}>Analyzing product...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div data-testid="error-state" className="mt-16 text-center">
            <AlertCircle className="w-10 h-10 mx-auto mb-4" style={{ color: '#BE123C' }} />
            <p className="text-sm" style={{ color: '#BE123C', fontFamily: "'Inter', sans-serif" }}>{error}</p>
            <button onClick={() => navigate("/")} className="btn-pill btn-secondary mt-6">Try another search</button>
          </div>
        )}

        {/* Not found */}
        {!result && !loading && !error && query && (
          <div data-testid="not-found-state" className="mt-16 animate-fade-up">
            <div className="bg-white rounded-2xl p-10 md:p-12 border text-center" style={{ borderColor: '#E5E5E5' }}>
              <AlertCircle className="w-10 h-10 mx-auto mb-4" style={{ color: '#86868B' }} />
              <h2 className="text-2xl font-semibold mb-3" style={{ fontFamily: "'Playfair Display', serif", color: '#1D1D1F' }}>Material not recognized</h2>
              <p className="text-sm mb-6 max-w-md mx-auto" style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}>
                We couldn't identify the primary material for "<strong style={{ color: '#1D1D1F' }}>{query}</strong>". Try being more specific about the material type.
              </p>
              <button data-testid="explore-materials-fallback" onClick={() => navigate("/explore")} className="btn-pill btn-secondary">
                Browse Materials <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* Found result */}
        {result && !loading && (
          <div data-testid="result-found" className="mt-4 space-y-8">
            {/* Main result card */}
            <div className="bg-white rounded-2xl p-8 md:p-12 border animate-fade-up" style={{ borderColor: '#E5E5E5' }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}>
                    {barcode ? 'Scanned Product' : 'Product searched'}
                  </p>
                  <h2 data-testid="result-product-name" className="text-3xl sm:text-4xl font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: '#1D1D1F' }}>
                    {query.charAt(0).toUpperCase() + query.slice(1)}
                  </h2>
                </div>
                <button data-testid="share-scan-button" onClick={() => setShowShare(true)} className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-colors duration-200" style={{ fontFamily: "'Inter', sans-serif", backgroundColor: 'rgba(29,29,31,0.05)', color: '#1D1D1F', border: '1px solid #E5E5E5', flexShrink: 0 }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#B45309'} onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E5E5E5'}>
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
              </div>

              {barcode && (
                <div className="flex items-center gap-2 mb-4">
                  <ScanBarcode className="w-3.5 h-3.5" style={{ color: '#86868B' }} />
                  <span className="text-xs" style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}>Barcode: {barcode}</span>
                </div>
              )}

              {/* Classification badges */}
              <div className="flex flex-wrap items-center gap-3 mt-4 mb-8">
                <span data-testid="result-category-badge" className={`category-badge ${categoryClass}`}>{result.materialClass}</span>
                {riskConfig && (
                  <span data-testid="result-risk-badge" className={`risk-badge ${riskConfig.className}`}>
                    <RiskIcon className="w-4 h-4" /> {riskConfig.label}
                  </span>
                )}
                <span data-testid="result-confidence-badge" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ fontFamily: "'Inter', sans-serif", backgroundColor: confidenceLabel === "Verified" ? 'rgba(21,128,61,0.08)' : 'rgba(29,29,31,0.05)', color: confidenceLabel === "Verified" ? '#15803d' : '#86868B' }}>
                  {confidenceLabel === "Verified" || confidenceLabel === "Strong Match" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <HelpCircle className="w-3.5 h-3.5" />}
                  {confidenceLabel}
                </span>
              </div>

              {/* Petroload + Material info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="rounded-xl p-6 flex flex-col items-center justify-center" style={{ backgroundColor: '#F5F5F7' }}>
                  <p className="text-xs font-medium uppercase tracking-wider mb-4" style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}>Petroload Score</p>
                  <PetroloadMeter score={result.petroloadScore} size="large" />
                </div>
                <div>
                  <div className="mb-6">
                    <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}>Material Identified</p>
                    <p data-testid="result-material-name" className="text-2xl font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: '#1D1D1F' }}>{result.materialName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}>Why it matters</p>
                    <p data-testid="result-explanation" className="text-sm leading-relaxed" style={{ fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>{result.explanation}</p>
                  </div>
                  {result.healthScore != null && (
                    <div className="mt-5 pt-5" style={{ borderTop: '1px solid #E5E5E5' }}>
                      <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}>Material Health Score</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E5E5E5' }}>
                          <div data-testid="health-score-bar" className="h-full rounded-full" style={{ width: `${result.healthScore}%`, backgroundColor: result.healthScore >= 60 ? '#15803d' : result.healthScore >= 40 ? '#F59E0B' : '#BE123C', transition: 'width 0.8s ease' }} />
                        </div>
                        <span data-testid="health-score-value" className="text-sm font-semibold tabular-nums" style={{ fontFamily: "'Inter', sans-serif", color: result.healthScore >= 60 ? '#15803d' : result.healthScore >= 40 ? '#F59E0B' : '#BE123C' }}>{result.healthScore}/100</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Risk Signals */}
            {riskSignals.length > 0 && (
              <div data-testid="risk-signals-section" className="bg-white rounded-2xl p-8 md:p-12 border animate-fade-up delay-100" style={{ borderColor: '#E5E5E5' }}>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-6" style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}>Risk Signals</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {riskSignals.map(s => <RiskSignalBar key={s.label} {...s} />)}
                </div>
              </div>
            )}

            {/* Better Alternatives (material-level) */}
            {result.alternatives && result.alternatives.length > 0 && (
              <div data-testid="alternatives-section" className="bg-white rounded-2xl p-8 md:p-12 border animate-fade-up delay-200" style={{ borderColor: '#E5E5E5' }}>
                <div className="flex items-center gap-2 mb-6">
                  <Leaf className="w-5 h-5" style={{ color: '#15803d' }} />
                  <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}>Better Alternatives</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {result.alternatives.map((alt, idx) => (
                    <div key={`${alt.name}-${idx}`} data-testid={`alternative-${alt.name.toLowerCase().replace(/\s+/g, '-')}`} className="card-lift rounded-xl p-5 border" style={{ borderColor: '#E5E5E5' }}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-sm" style={{ fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>{alt.name}</p>
                          {alt.materialClass && <p className="text-xs mt-1" style={{ color: '#15803d', fontFamily: "'Inter', sans-serif" }}>{alt.materialClass}</p>}
                          {alt.reason && <p className="text-xs mt-2 leading-relaxed" style={{ color: '#86868B', fontFamily: "'Inter', sans-serif" }}>{alt.reason}</p>}
                        </div>
                        <Leaf className="w-4 h-4 flex-shrink-0 ml-3" style={{ color: '#15803d' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Where to Buy — FiberFoundry-first product cards */}
            {(displayProducts.length > 0 || altLoading) && (
              <div data-testid="where-to-buy-section" className="bg-white rounded-2xl p-8 md:p-12 border animate-fade-up delay-300" style={{ borderColor: '#E5E5E5' }}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}>
                    Where to Buy Better
                  </h3>
                  {showFfExclusive && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.65rem] font-medium" style={{ backgroundColor: 'rgba(180,83,9,0.08)', color: '#B45309' }}>
                      <Star className="w-3 h-3" /> FiberFoundry Verified
                    </span>
                  )}
                </div>
                {altLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#E5E5E5', borderTopColor: '#B45309' }} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayProducts.map(p => (
                      <ProductCard key={p.productId} product={p} sources={productSources[p.productId]} />
                    ))}
                  </div>
                )}
                {!showFfExclusive && displayProducts.length > 0 && (
                  <p className="mt-4 text-xs" style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}>
                    Showing trusted external sources. FiberFoundry alternatives not yet available for this material.
                  </p>
                )}
              </div>
            )}

            {/* Purchase Impact */}
            <PurchaseImpact result={result} />

            {/* No alternatives — good material */}
            {result.alternatives && result.alternatives.length === 0 && (
              <div data-testid="no-alternatives-section" className="bg-white rounded-2xl p-8 md:p-12 border animate-fade-up delay-200" style={{ borderColor: '#E5E5E5' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(21,128,61,0.1)' }}>
                    <ShieldCheck className="w-5 h-5" style={{ color: '#15803d' }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}>This is already a great material choice</p>
                    <p className="text-xs mt-0.5" style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}>{result.materialName} is a responsible material. Keep choosing products like this.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Share Card Modal */}
        {showShare && result && (
          <ShareCard result={result} query={query} onClose={() => setShowShare(false)} />
        )}
      </div>
    </div>
  );
}
