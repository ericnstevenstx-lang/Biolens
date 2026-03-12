import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, AlertCircle, ShieldCheck, ShieldAlert, ShieldX,
  Leaf, Share2, ScanBarcode, CheckCircle2, HelpCircle,
} from "lucide-react";
import SearchBar from "@/components/SearchBar";
import PetroloadMeter from "@/components/PetroloadMeter";
import ShareCard from "@/components/ShareCard";
import {
  searchBioLens, getConfidenceLabel, getCategoryClass, getRiskConfig,
  saveScanToHistory,
} from "@/lib/biolens";

const RISK_ICONS = {
  High: ShieldX,
  Medium: ShieldAlert,
  Low: ShieldCheck,
};

export default function ResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const barcode = searchParams.get("barcode") || "";
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    if (!query) return;
    const fetchResult = async () => {
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const data = await searchBioLens(query);
        setResult(data);
        if (data) {
          saveScanToHistory(query, data);
        }
      } catch (err) {
        setError(err.message || "Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [query]);

  // No query state
  if (!query) {
    return (
      <div className="pt-32 pb-24 px-6 md:px-12 lg:px-24 min-h-screen">
        <div className="max-w-3xl mx-auto text-center">
          <h1
            className="text-3xl sm:text-4xl font-semibold mb-4"
            style={{ fontFamily: "'Playfair Display', serif", color: '#1D1D1F' }}
          >
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
            <div
              className="inline-block w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: '#E5E5E5', borderTopColor: '#B45309' }}
            />
            <p className="mt-4 text-sm" style={{ color: '#86868B', fontFamily: "'Inter', sans-serif" }}>
              Analyzing product...
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div data-testid="error-state" className="mt-16 text-center">
            <AlertCircle className="w-10 h-10 mx-auto mb-4" style={{ color: '#BE123C' }} />
            <p className="text-sm" style={{ color: '#BE123C', fontFamily: "'Inter', sans-serif" }}>{error}</p>
            <button
              onClick={() => navigate("/")}
              className="btn-pill btn-secondary mt-6"
            >
              Try another search
            </button>
          </div>
        )}

        {/* Not found */}
        {!result && !loading && !error && query && (
          <div data-testid="not-found-state" className="mt-16 animate-fade-up">
            <div
              className="bg-white rounded-2xl p-10 md:p-12 border text-center"
              style={{ borderColor: '#E5E5E5' }}
            >
              <AlertCircle className="w-10 h-10 mx-auto mb-4" style={{ color: '#86868B' }} />
              <h2
                className="text-2xl font-semibold mb-3"
                style={{ fontFamily: "'Playfair Display', serif", color: '#1D1D1F' }}
              >
                Material not recognized
              </h2>
              <p
                className="text-sm mb-6 max-w-md mx-auto"
                style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
              >
                We couldn't identify the primary material for "<strong style={{ color: '#1D1D1F' }}>{query}</strong>". Try being more specific about the material type.
              </p>
              <button
                data-testid="explore-materials-fallback"
                onClick={() => navigate("/explore")}
                className="btn-pill btn-secondary"
              >
                Browse Materials
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* Found result */}
        {result && !loading && (
          <div data-testid="result-found" className="mt-4 space-y-8">
            {/* Main result card */}
            <div
              className="bg-white rounded-2xl p-8 md:p-12 border animate-fade-up"
              style={{ borderColor: '#E5E5E5' }}
            >
              {/* Header row: product name + share button */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p
                    className="text-xs font-medium uppercase tracking-wider mb-2"
                    style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
                  >
                    {barcode ? `Scanned Product` : `Product searched`}
                  </p>
                  <h2
                    data-testid="result-product-name"
                    className="text-3xl sm:text-4xl font-semibold"
                    style={{ fontFamily: "'Playfair Display', serif", color: '#1D1D1F' }}
                  >
                    {query.charAt(0).toUpperCase() + query.slice(1)}
                  </h2>
                </div>
                <button
                  data-testid="share-scan-button"
                  onClick={() => setShowShare(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-colors duration-200"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    backgroundColor: 'rgba(29, 29, 31, 0.05)',
                    color: '#1D1D1F',
                    border: '1px solid #E5E5E5',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#B45309'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E5E5E5'}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </button>
              </div>

              {barcode && (
                <div className="flex items-center gap-2 mb-4">
                  <ScanBarcode className="w-3.5 h-3.5" style={{ color: '#86868B' }} />
                  <span className="text-xs" style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}>
                    Barcode: {barcode}
                  </span>
                </div>
              )}

              {/* Classification + Risk + Confidence row */}
              <div className="flex flex-wrap items-center gap-3 mt-4 mb-8">
                <span
                  data-testid="result-category-badge"
                  className={`category-badge ${categoryClass}`}
                >
                  {result.materialClass}
                </span>
                {riskConfig && (
                  <span data-testid="result-risk-badge" className={`risk-badge ${riskConfig.className}`}>
                    <RiskIcon className="w-4 h-4" />
                    {riskConfig.label}
                  </span>
                )}
                <span
                  data-testid="result-confidence-badge"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    backgroundColor: confidenceLabel === "Verified" ? 'rgba(21, 128, 61, 0.08)' : 'rgba(29, 29, 31, 0.05)',
                    color: confidenceLabel === "Verified" ? '#15803d' : '#86868B',
                  }}
                >
                  {confidenceLabel === "Verified" || confidenceLabel === "Strong Match"
                    ? <CheckCircle2 className="w-3.5 h-3.5" />
                    : <HelpCircle className="w-3.5 h-3.5" />
                  }
                  {confidenceLabel}
                </span>
              </div>

              {/* Petroload + Material info side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Petroload Meter */}
                <div
                  className="rounded-xl p-6 flex flex-col items-center justify-center"
                  style={{ backgroundColor: '#F5F5F7' }}
                >
                  <p
                    className="text-xs font-medium uppercase tracking-wider mb-4"
                    style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
                  >
                    Petroload Score
                  </p>
                  <PetroloadMeter score={result.petroloadScore} size="large" />
                </div>

                {/* Material info */}
                <div>
                  <div className="mb-6">
                    <p
                      className="text-xs font-medium uppercase tracking-wider mb-1"
                      style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
                    >
                      Material Identified
                    </p>
                    <p
                      data-testid="result-material-name"
                      className="text-2xl font-semibold"
                      style={{ fontFamily: "'Playfair Display', serif", color: '#1D1D1F' }}
                    >
                      {result.materialName}
                    </p>
                  </div>

                  {/* Explanation */}
                  <div>
                    <p
                      className="text-xs font-medium uppercase tracking-wider mb-2"
                      style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
                    >
                      Why it matters
                    </p>
                    <p
                      data-testid="result-explanation"
                      className="text-sm leading-relaxed"
                      style={{ fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}
                    >
                      {result.explanation}
                    </p>
                  </div>

                  {/* Material Health Score */}
                  {result.healthScore != null && (
                    <div className="mt-5 pt-5" style={{ borderTop: '1px solid #E5E5E5' }}>
                      <p
                        className="text-xs font-medium uppercase tracking-wider mb-2"
                        style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
                      >
                        Material Health Score
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E5E5E5' }}>
                          <div
                            data-testid="health-score-bar"
                            className="h-full rounded-full"
                            style={{
                              width: `${result.healthScore}%`,
                              backgroundColor: result.healthScore >= 60 ? '#15803d' : result.healthScore >= 40 ? '#F59E0B' : '#BE123C',
                              transition: 'width 0.8s ease',
                            }}
                          />
                        </div>
                        <span
                          data-testid="health-score-value"
                          className="text-sm font-semibold tabular-nums"
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            color: result.healthScore >= 60 ? '#15803d' : result.healthScore >= 40 ? '#F59E0B' : '#BE123C',
                          }}
                        >
                          {result.healthScore}/100
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Alternatives card */}
            {result.alternatives && result.alternatives.length > 0 && (
              <div
                data-testid="alternatives-section"
                className="bg-white rounded-2xl p-8 md:p-12 border animate-fade-up delay-200"
                style={{ borderColor: '#E5E5E5' }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <Leaf className="w-5 h-5" style={{ color: '#15803d' }} />
                  <h3
                    className="text-sm font-semibold uppercase tracking-wider"
                    style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
                  >
                    Better Alternatives
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {result.alternatives.map((alt, idx) => (
                    <div
                      key={`${alt.name}-${idx}`}
                      data-testid={`alternative-${alt.name.toLowerCase().replace(/\s+/g, '-')}`}
                      className="card-lift rounded-xl p-5 border"
                      style={{ borderColor: '#E5E5E5' }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p
                            className="font-semibold text-sm"
                            style={{ fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}
                          >
                            {alt.name}
                          </p>
                          {alt.materialClass && (
                            <p
                              className="text-xs mt-1"
                              style={{ color: '#15803d', fontFamily: "'Inter', sans-serif" }}
                            >
                              {alt.materialClass}
                            </p>
                          )}
                          {alt.reason && (
                            <p
                              className="text-xs mt-2 leading-relaxed"
                              style={{ color: '#86868B', fontFamily: "'Inter', sans-serif" }}
                            >
                              {alt.reason}
                            </p>
                          )}
                        </div>
                        <Leaf className="w-4 h-4 flex-shrink-0 ml-3" style={{ color: '#15803d' }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="mt-8">
                  <Link
                    to="/explore"
                    data-testid="find-better-materials-cta"
                    className="btn-pill btn-accent inline-flex"
                  >
                    Find Better Materials
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              </div>
            )}

            {/* No alternatives — good material */}
            {result.alternatives && result.alternatives.length === 0 && (
              <div
                data-testid="no-alternatives-section"
                className="bg-white rounded-2xl p-8 md:p-12 border animate-fade-up delay-200"
                style={{ borderColor: '#E5E5E5' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(21, 128, 61, 0.1)' }}
                  >
                    <ShieldCheck className="w-5 h-5" style={{ color: '#15803d' }} />
                  </div>
                  <div>
                    <p
                      className="font-semibold text-sm"
                      style={{ fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}
                    >
                      This is already a great material choice
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
                    >
                      {result.materialName} is a responsible material. Keep choosing products like this.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Share Card Modal */}
        {showShare && result && (
          <ShareCard
            result={result}
            query={query}
            onClose={() => setShowShare(false)}
          />
        )}
      </div>
    </div>
  );
}
