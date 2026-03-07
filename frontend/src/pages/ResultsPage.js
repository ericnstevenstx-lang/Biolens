import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, AlertCircle, ShieldCheck, ShieldAlert, ShieldX, Leaf, Sparkles } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RISK_CONFIG = {
  High: { icon: ShieldX, className: "risk-high", label: "High Petro-Risk" },
  Medium: { icon: ShieldAlert, className: "risk-medium", label: "Medium Petro-Risk" },
  Low: { icon: ShieldCheck, className: "risk-low", label: "Low Petro-Risk" },
};

const CATEGORY_CLASS = {
  "petro-based": "cat-petro",
  "plant-based": "cat-plant",
  "transition": "cat-transition",
  "natural": "cat-natural",
  "mineral": "cat-mineral",
  "mixed": "cat-mixed",
};

export default function ResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query) return;
    const fetchResult = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.post(`${API}/search`, { query });
        setResult(res.data);
      } catch (err) {
        setError("Something went wrong. Please try again.");
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
          <h1
            className="text-3xl sm:text-4xl font-semibold mb-4"
            style={{ fontFamily: "'Playfair Display', serif", color: '#1D1D1F' }}
          >
            Search for a product
          </h1>
          <p className="mb-8 text-sm" style={{ color: '#86868B', fontFamily: "'Inter', sans-serif" }}>
            Enter a product name to see its material classification.
          </p>
          <div className="flex justify-center">
            <SearchBar size="large" autoFocus />
          </div>
        </div>
      </div>
    );
  }

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
        {error && (
          <div data-testid="error-state" className="mt-16 text-center">
            <AlertCircle className="w-10 h-10 mx-auto mb-4" style={{ color: '#BE123C' }} />
            <p className="text-sm" style={{ color: '#BE123C', fontFamily: "'Inter', sans-serif" }}>{error}</p>
          </div>
        )}

        {/* Not found */}
        {result && !result.found && !loading && (
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
                We couldn't identify the primary material for "<strong style={{ color: '#1D1D1F' }}>{query}</strong>". Try being more specific about the material (e.g., "polyester hoodie" or "bamboo cutting board").
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
        {result && result.found && !loading && (
          <div data-testid="result-found" className="mt-4 space-y-8">
            {/* Main result card */}
            <div
              className="bg-white rounded-2xl p-8 md:p-12 border animate-fade-up"
              style={{ borderColor: '#E5E5E5' }}
            >
              {/* Product searched */}
              <p
                className="text-xs font-medium uppercase tracking-wider mb-2"
                style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
              >
                Product searched
              </p>
              <h2
                data-testid="result-product-name"
                className="text-3xl sm:text-4xl font-semibold mb-6"
                style={{ fontFamily: "'Playfair Display', serif", color: '#1D1D1F' }}
              >
                {query.charAt(0).toUpperCase() + query.slice(1)}
              </h2>

              {/* Classification + Risk row */}
              <div className="flex flex-wrap items-center gap-3 mb-8">
                <span
                  data-testid="result-category-badge"
                  className={`category-badge ${CATEGORY_CLASS[result.category_key] || 'cat-mixed'}`}
                >
                  {result.category_label}
                </span>
                {(() => {
                  const risk = RISK_CONFIG[result.risk_level];
                  if (!risk) return null;
                  const RiskIcon = risk.icon;
                  return (
                    <span data-testid="result-risk-badge" className={`risk-badge ${risk.className}`}>
                      <RiskIcon className="w-4 h-4" />
                      {risk.label}
                    </span>
                  );
                })()}
              </div>

              {/* Divider */}
              <div className="w-full h-px mb-8" style={{ backgroundColor: '#E5E5E5' }} />

              {/* Explanation */}
              <div className="mb-8">
                <h3
                  className="text-sm font-semibold uppercase tracking-wider mb-3"
                  style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
                >
                  Why it matters
                </h3>
                <p
                  data-testid="result-explanation"
                  className="text-base leading-relaxed"
                  style={{ fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}
                >
                  {result.explanation}
                </p>
              </div>

              {/* Material identified */}
              <div
                className="rounded-xl p-5 mb-2"
                style={{ backgroundColor: '#F5F5F7' }}
              >
                <p
                  className="text-xs font-medium uppercase tracking-wider mb-1"
                  style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
                >
                  Material identified
                </p>
                <p
                  data-testid="result-material-name"
                  className="text-lg font-semibold"
                  style={{ fontFamily: "'Playfair Display', serif", color: '#1D1D1F' }}
                >
                  {result.material_name}
                </p>
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
                  <Sparkles className="w-5 h-5" style={{ color: '#B45309' }} />
                  <h3
                    className="text-sm font-semibold uppercase tracking-wider"
                    style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
                  >
                    Better Alternatives
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {result.alternatives.map((alt) => (
                    <div
                      key={alt.slug}
                      data-testid={`alternative-${alt.slug}`}
                      className="card-lift rounded-xl p-5 border"
                      style={{ borderColor: '#E5E5E5' }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p
                            className="font-semibold text-sm"
                            style={{ fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}
                          >
                            {alt.name}
                          </p>
                          <p
                            className="text-xs mt-1"
                            style={{ color: '#15803d', fontFamily: "'Inter', sans-serif" }}
                          >
                            {alt.category}
                          </p>
                        </div>
                        <Leaf className="w-4 h-4" style={{ color: '#15803d' }} />
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

            {/* No alternatives */}
            {result.alternatives && result.alternatives.length === 0 && (
              <div
                data-testid="no-alternatives-section"
                className="bg-white rounded-2xl p-8 md:p-12 border animate-fade-up delay-200"
                style={{ borderColor: '#E5E5E5' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
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
                      {result.material_name} is a responsible material. Keep choosing products like this.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
