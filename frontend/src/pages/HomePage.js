import { lookupProductByBarcode } from "@/lib/biolens";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Scan, AlertTriangle, Leaf, ArrowRight, ScanBarcode, Search, BarChart3, Layers, Flag } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import BarcodeScanner from "@/components/BarcodeScanner";
import ScanHistory from "@/components/ScanHistory";
import { getScanHistory, clearScanHistory, fetchGlobalImpact, getPetroloadLevel } from "@/lib/biolens";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EXAMPLE_SEARCHES = [
  "poly hoodie",
  "bamboo sheets",
  "pet bottle",
  "vegan leather bag",
  "nylon rope",
  "hemp shirt",
];

const RECENT_KEY = "biolens_recent_searches";

function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").slice(0, 5);
  } catch { return []; }
}

function addRecentSearch(term) {
  try {
    const list = getRecentSearches().filter(t => t.toLowerCase() !== term.toLowerCase());
    list.unshift(term);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)));
  } catch {}
}

/* ── Large Example Scan Card ── */
function ExampleScanCard() {
  const level = getPetroloadLevel(95);
  return (
    <div
      data-testid="example-scan-card"
      className="mt-10 rounded-2xl border overflow-hidden animate-fade-up delay-300"
      style={{ backgroundColor: 'white', borderColor: '#E5E5E5', maxWidth: 520 }}
    >
      <div className="p-6 pb-4">
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] mb-4" style={{ color: '#86868B' }}>
          Example Scan
        </p>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-extrabold" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
              Polyester Hoodie
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#86868B' }}>Material: Polyester</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="category-badge cat-petro">Petro-Based</span>
              <span className="risk-badge risk-high" style={{ padding: '3px 10px', fontSize: '0.65rem' }}>High Petro-Risk</span>
            </div>
          </div>
          <div className="text-right ml-4">
            <p className="text-[2.75rem] font-extrabold tabular-nums leading-none" style={{ fontFamily: "'Manrope', sans-serif", color: level.color }}>
              95
            </p>
            <p className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] mt-0.5" style={{ color: level.color }}>
              Petroload
            </p>
          </div>
        </div>
      </div>
      <div className="px-6 py-3" style={{ backgroundColor: 'rgba(34,197,94,0.04)', borderTop: '1px solid #F3F4F6' }}>
        <p className="text-xs" style={{ color: '#86868B' }}>
          Better Option: <span style={{ color: '#22C55E', fontWeight: 700 }}>Hemp</span>
        </p>
      </div>
    </div>
  );
}

/* ── Trust Counter ── */
function TrustCounter({ label, value, icon }) {
  return (
    <div data-testid={`trust-stat-${label.toLowerCase().replace(/\s+/g, '-')}`} className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F3F4F6', color: '#86868B' }}>
        {icon}
      </div>
      <div>
        <p className="text-base font-extrabold tabular-nums" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
          {value}
        </p>
        <p className="text-[0.6rem] font-medium uppercase tracking-wider" style={{ color: '#86868B' }}>
          {label}
        </p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [showScanner, setShowScanner] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [globalImpact, setGlobalImpact] = useState(null);

  useEffect(() => {
    setHistory(getScanHistory());
    setRecentSearches(getRecentSearches());
    fetchGlobalImpact().then(data => { if (data) setGlobalImpact(data); }).catch(() => {});
  }, []);

  const handleClearHistory = () => {
    clearScanHistory();
    setHistory([]);
  };

  const handleSearch = (term) => {
    addRecentSearch(term);
    navigate(`/results?q=${encodeURIComponent(term)}`);
  };

  const handleBarcodeScan = async (barcode) => {
  console.log("📸 Scanned barcode:", barcode);
  setShowScanner(false);
  setScanLoading(true);
  
  try {
    // ✅ Use FREE Open Beauty Facts / Open Food Facts lookup
    const result = await lookupProductByBarcode(barcode);
    
    if (result.success) {
      console.log("✅ Product found:", result.product.name);
      
      // Log company info if available
      if (result.companyInfo) {
        console.log("🏢 Company:", result.companyInfo.name, "-", result.companyInfo.sector);
      }
      
      // Add to recent searches
      addRecentSearch(result.product.name);
      
      // Navigate with both product name and barcode
      navigate(`/results?q=${encodeURIComponent(result.product.name)}&barcode=${encodeURIComponent(barcode)}`);
    } else {
      // Product not found - navigate with barcode as fallback
      console.log("❌ Not found:", result.message);
      navigate(`/results?q=${encodeURIComponent(barcode)}&barcode=${encodeURIComponent(barcode)}`);
    }
  } catch (error) {
    console.error("💥 Barcode lookup error:", error);
    // Fallback: navigate with barcode
    navigate(`/results?q=${encodeURIComponent(barcode)}&barcode=${encodeURIComponent(barcode)}`);
  } finally {
    setScanLoading(false);
  }
};

  return (
    <div data-testid="home-page">
      {showScanner && (
        <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />
      )}

      {/* ── Hero ── */}
      <section data-testid="hero-section" className="pt-28 pb-10 md:pt-36 md:pb-14 px-6 md:px-12 lg:px-24">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl">
            <h1
              className="text-[2.8rem] md:text-[3.5rem] font-extrabold leading-[1.08] tracking-tight animate-fade-up"
              style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}
            >
              See what your products are{" "}
              <span style={{ color: '#B45309' }}>really</span> made of.
            </h1>

            <p className="mt-4 text-base leading-relaxed animate-fade-up delay-100" style={{ color: '#6B7280', maxWidth: 480 }}>
              Search or scan everyday products to uncover petrochemical dependency, material classification, and better alternatives.
            </p>

            <div className="mt-8 animate-fade-up delay-200">
              <SearchBar size="large" />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 animate-fade-up delay-300">
              <button
                data-testid="scan-product-button"
                onClick={() => setShowScanner(true)}
                disabled={scanLoading}
                className="btn-pill btn-accent flex items-center gap-2"
                style={{ padding: '10px 24px', fontSize: '0.8rem' }}
              >
                <ScanBarcode className="w-4 h-4" />
                {scanLoading ? "Looking up..." : "Scan Product"}
              </button>
            </div>

            {/* Example chips */}
            <div className="mt-4 flex flex-wrap gap-1.5 animate-fade-up delay-400">
              <span className="text-[0.65rem] font-medium mr-0.5 self-center" style={{ color: '#86868B' }}>Try:</span>
              {EXAMPLE_SEARCHES.map((term) => (
                <button
                  key={term}
                  data-testid={`example-search-${term.replace(/\s+/g, '-')}`}
                  onClick={() => handleSearch(term)}
                  className="px-2.5 py-0.5 rounded-full text-[0.65rem] font-medium transition-all duration-200 border"
                  style={{ backgroundColor: 'white', color: '#1D1D1F', borderColor: '#E5E5E5' }}
                  onMouseEnter={(e) => { e.target.style.borderColor = '#B45309'; e.target.style.color = '#B45309'; }}
                  onMouseLeave={(e) => { e.target.style.borderColor = '#E5E5E5'; e.target.style.color = '#1D1D1F'; }}
                >
                  {term}
                </button>
              ))}
            </div>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="mt-4 animate-fade-up delay-500">
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: '#86868B' }}>Recent Searches</p>
                <div className="flex flex-wrap gap-1.5">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      data-testid={`recent-search-${term.replace(/\s+/g, '-')}`}
                      onClick={() => handleSearch(term)}
                      className="px-2.5 py-0.5 rounded-full text-[0.65rem] font-medium transition-all duration-200 border flex items-center gap-1"
                      style={{ backgroundColor: '#F9FAFB', color: '#6B7280', borderColor: '#F3F4F6' }}
                      onMouseEnter={(e) => { e.target.style.color = '#1D1D1F'; }}
                      onMouseLeave={(e) => { e.target.style.color = '#6B7280'; }}
                    >
                      <Search className="w-2.5 h-2.5" />
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Example Scan Card */}
            <ExampleScanCard />
          </div>
        </div>
      </section>

      {/* ── Trust Counters ── */}
      <section data-testid="trust-counters-section" className="py-8 md:py-12 px-6 md:px-12 lg:px-24">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-xl border p-5 md:p-7" style={{ backgroundColor: 'white', borderColor: '#E5E5E5' }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <TrustCounter label="Products Analyzed" value="2,300+" icon={<BarChart3 className="w-4 h-4" />} />
              <TrustCounter label="Materials Mapped" value="120+" icon={<Layers className="w-4 h-4" />} />
              <TrustCounter label="High Petro-Risk Flags" value="1,640+" icon={<Flag className="w-4 h-4" />} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Scan History ── */}
      {history.length > 0 && (
        <section data-testid="scan-history-section" className="pb-6 px-6 md:px-12 lg:px-24">
          <div className="max-w-5xl mx-auto">
            <ScanHistory history={history} onClear={handleClearHistory} />
          </div>
        </section>
      )}

      {/* ── How BioLens Works Strip ── */}
      <section data-testid="how-strip-section" className="py-14 md:py-20 px-6 md:px-12 lg:px-24">
        <div className="max-w-5xl mx-auto">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-center mb-8" style={{ color: '#86868B' }}>
            How BioLens Works
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { num: "1", title: "Search or Scan", desc: "Enter a product name or scan its barcode", icon: <Scan className="w-5 h-5" /> },
              { num: "2", title: "Identify Material", desc: "We detect the likely material composition", icon: <Layers className="w-5 h-5" /> },
              { num: "3", title: "Score Dependence", desc: "Petrochemical dependency scored 0-100", icon: <AlertTriangle className="w-5 h-5" /> },
              { num: "4", title: "Better Alternatives", desc: "We suggest lower-impact materials", icon: <Leaf className="w-5 h-5" /> },
            ].map((step) => (
              <div key={step.num} className="text-center animate-fade-up" style={{ animationDelay: `${Number(step.num) * 0.1}s` }}>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: '#F3F4F6', color: '#B45309' }}
                >
                  {step.icon}
                </div>
                <p className="text-sm font-bold mb-1" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>{step.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: '#86868B' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Global Impact from Supabase ── */}
      {globalImpact && (globalImpact.scans_total > 0 || globalImpact.purchases_total > 0) && (
        <section data-testid="global-impact-section" className="pb-8 px-6 md:px-12 lg:px-24">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-xl border p-5 md:p-7 text-center" style={{ backgroundColor: 'white', borderColor: '#E5E5E5' }}>
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] mb-4" style={{ color: '#86868B' }}>
                Live Community Impact
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Scans", value: globalImpact.scans_total || 0 },
                  { label: "Purchases", value: globalImpact.purchases_total || 0 },
                  { label: "Petro $ Replaced", value: globalImpact.petro_dollars_replaced != null ? `$${Number(globalImpact.petro_dollars_replaced).toLocaleString()}` : "$0" },
                  { label: "Microplastic Avoided", value: globalImpact.microplastic_avoidance_units || 0 },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-xl font-extrabold tabular-nums" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
                      {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
                    </p>
                    <p className="text-[0.55rem] font-medium uppercase tracking-wider mt-0.5" style={{ color: '#86868B' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section data-testid="cta-section" className="py-14 md:py-20 px-6 md:px-12 lg:px-24">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl p-10 md:p-14 text-center" style={{ backgroundColor: '#1D1D1F' }}>
            <h2 className="text-2xl md:text-3xl font-extrabold mb-3 animate-fade-up" style={{ fontFamily: "'Manrope', sans-serif", color: '#F5F5F7' }}>
              Explore the materials around you
            </h2>
            <p className="text-sm mb-6 animate-fade-up delay-100 max-w-md mx-auto" style={{ color: '#86868B' }}>
              Browse our growing library of materials and learn what makes each one unique.
            </p>
            <button data-testid="cta-explore-materials" onClick={() => navigate("/explore")} className="btn-pill btn-accent animate-fade-up delay-200" style={{ padding: '10px 28px', fontSize: '0.8rem' }}>
              Explore Materials <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Floating mobile scan button ── */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <button
          data-testid="floating-scan-button"
          onClick={() => setShowScanner(true)}
          disabled={scanLoading}
          className="flex items-center gap-2 px-6 py-3.5 rounded-full shadow-xl text-sm font-semibold transition-transform duration-200 active:scale-95"
          style={{ backgroundColor: '#B45309', color: 'white', fontFamily: "'Manrope', sans-serif" }}
        >
          <ScanBarcode className="w-4.5 h-4.5" />
          Scan Product
        </button>
      </div>
    </div>
  );
}
