import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Scan, AlertTriangle, Leaf, ArrowRight, ScanBarcode, BarChart3, ShoppingBag, Globe, Droplets } from "lucide-react";
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

function ExampleScanCard() {
  const level = getPetroloadLevel(95);
  return (
    <div
      data-testid="example-scan-card"
      className="mt-8 p-5 rounded-2xl border max-w-md animate-fade-up delay-300"
      style={{ backgroundColor: 'white', borderColor: '#E5E5E5' }}
    >
      <p className="text-[0.65rem] font-semibold uppercase tracking-widest mb-3" style={{ color: '#86868B' }}>
        Example Scan
      </p>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-bold" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
            Polyester Hoodie
          </p>
          <p className="text-xs mt-1" style={{ color: '#86868B' }}>
            Better Material: <span style={{ color: '#22C55E', fontWeight: 600 }}>Hemp</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-extrabold tabular-nums" style={{ fontFamily: "'Manrope', sans-serif", color: level.color }}>
            95
          </p>
          <p className="text-[0.6rem] font-medium uppercase tracking-wider" style={{ color: level.color }}>
            Petroload
          </p>
        </div>
      </div>
    </div>
  );
}

function ImpactCounter({ label, value, icon, color }) {
  return (
    <div
      data-testid={`impact-stat-${label.toLowerCase().replace(/\s+/g, '-')}`}
      className="text-center"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: `${color}12`, color }}>
        {icon}
      </div>
      <p className="text-2xl md:text-3xl font-extrabold tabular-nums" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-[0.65rem] font-medium uppercase tracking-wider mt-0.5" style={{ color: '#86868B' }}>
        {label}
      </p>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [showScanner, setShowScanner] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [globalImpact, setGlobalImpact] = useState(null);

  useEffect(() => {
    setHistory(getScanHistory());
    fetchGlobalImpact().then(data => { if (data) setGlobalImpact(data); }).catch(() => {});
  }, []);

  const handleClearHistory = () => {
    clearScanHistory();
    setHistory([]);
  };

  const handleBarcodeScan = async (barcode) => {
    setShowScanner(false);
    setScanLoading(true);
    try {
      const res = await axios.post(`${API}/barcode/lookup`, { barcode });
      const product = res.data;
      if (product && product.title) {
        navigate(`/results?q=${encodeURIComponent(product.title)}&barcode=${encodeURIComponent(barcode)}`);
      } else {
        navigate(`/results?q=${encodeURIComponent(barcode)}&barcode=${encodeURIComponent(barcode)}`);
      }
    } catch {
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

      {/* Hero */}
      <section data-testid="hero-section" className="pt-32 pb-16 md:pt-44 md:pb-24 px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <h1
              className="text-5xl md:text-6xl font-extrabold leading-[1.08] tracking-tight animate-fade-up"
              style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}
            >
              See what your products are{" "}
              <span style={{ color: '#B45309' }}>really</span> made of.
            </h1>

            <p
              className="mt-5 text-base md:text-lg leading-relaxed animate-fade-up delay-100 max-w-xl"
              style={{ color: '#6B7280' }}
            >
              Search or scan everyday products and instantly learn their petrochemical dependency,
              material classification, and better alternatives.
            </p>

            <div className="mt-10 animate-fade-up delay-200">
              <SearchBar size="large" />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 animate-fade-up delay-300">
              <button
                data-testid="scan-product-button"
                onClick={() => setShowScanner(true)}
                disabled={scanLoading}
                className="btn-pill btn-accent flex items-center gap-2"
              >
                <ScanBarcode className="w-4 h-4" />
                {scanLoading ? "Looking up..." : "Scan Product"}
              </button>
            </div>

            {/* Quick examples */}
            <div className="mt-5 flex flex-wrap gap-2 animate-fade-up delay-400">
              <span className="text-xs font-medium mr-1 self-center" style={{ color: '#86868B' }}>Try:</span>
              {EXAMPLE_SEARCHES.map((term) => (
                <button
                  key={term}
                  data-testid={`example-search-${term.replace(/\s+/g, '-')}`}
                  onClick={() => navigate(`/results?q=${encodeURIComponent(term)}`)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 border"
                  style={{ backgroundColor: 'white', color: '#1D1D1F', borderColor: '#E5E5E5' }}
                  onMouseEnter={(e) => { e.target.style.borderColor = '#B45309'; e.target.style.color = '#B45309'; }}
                  onMouseLeave={(e) => { e.target.style.borderColor = '#E5E5E5'; e.target.style.color = '#1D1D1F'; }}
                >
                  {term}
                </button>
              ))}
            </div>

            {/* Example Scan Card */}
            <ExampleScanCard />
          </div>
        </div>
      </section>

      {/* Global Impact Counters — trust signal */}
      {globalImpact && (
        <section data-testid="global-impact-section" className="py-12 md:py-16 px-6 md:px-12 lg:px-24">
          <div className="max-w-7xl mx-auto">
            <div className="rounded-2xl border p-8 md:p-10" style={{ backgroundColor: 'white', borderColor: '#E5E5E5' }}>
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-center mb-6" style={{ color: '#86868B' }}>
                Community Impact
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <ImpactCounter label="Total Scans" value={globalImpact.scans_total || 0} icon={<BarChart3 className="w-5 h-5" />} color="#B45309" />
                <ImpactCounter label="Purchases" value={globalImpact.purchases_total || 0} icon={<ShoppingBag className="w-5 h-5" />} color="#22C55E" />
                <ImpactCounter label="Petro $ Replaced" value={globalImpact.petro_dollars_replaced != null ? `$${Number(globalImpact.petro_dollars_replaced).toLocaleString()}` : "$0"} icon={<Globe className="w-5 h-5" />} color="#EF4444" />
                <ImpactCounter label="Microplastic Avoided" value={globalImpact.microplastic_avoidance_units || 0} icon={<Droplets className="w-5 h-5" />} color="#F97316" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Scan History */}
      {history.length > 0 && (
        <section data-testid="scan-history-section" className="pb-8 px-6 md:px-12 lg:px-24">
          <div className="max-w-7xl mx-auto">
            <ScanHistory history={history} onClear={handleClearHistory} />
          </div>
        </section>
      )}

      {/* Explainer cards */}
      <section id="how-section" data-testid="explainer-cards-section" className="py-20 md:py-28 px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              { icon: <Scan className="w-6 h-6" />, title: "Material Check", description: "Find out whether a product is petroleum-based, plant-based, or transitional. See its Petroload score instantly.", color: "#B45309", delay: "delay-100" },
              { icon: <AlertTriangle className="w-6 h-6" />, title: "Why It Matters", description: "Understand petrochemical dependency in everyday products and its environmental impact.", color: "#EF4444", delay: "delay-200" },
              { icon: <Leaf className="w-6 h-6" />, title: "Better Alternatives", description: "Discover materials that can replace petroleum-heavy products with lower environmental impact.", color: "#22C55E", delay: "delay-300" },
            ].map((card) => (
              <div
                key={card.title}
                data-testid={`explainer-card-${card.title.toLowerCase().replace(/\s+/g, '-')}`}
                className={`card-lift bg-white rounded-2xl p-8 md:p-10 border animate-fade-up ${card.delay}`}
                style={{ borderColor: '#E5E5E5' }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: `${card.color}12`, color: card.color }}>
                  {card.icon}
                </div>
                <h3 className="text-lg font-bold mb-3" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
                  {card.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section data-testid="cta-section" className="py-20 md:py-28 px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-2xl p-12 md:p-16 text-center" style={{ backgroundColor: '#1D1D1F' }}>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4 animate-fade-up" style={{ fontFamily: "'Manrope', sans-serif", color: '#F5F5F7' }}>
              Explore the materials around you
            </h2>
            <p className="text-base mb-8 animate-fade-up delay-100 max-w-lg mx-auto" style={{ color: '#86868B' }}>
              Browse our growing library of materials and learn what makes each one unique.
            </p>
            <button data-testid="cta-explore-materials" onClick={() => navigate("/explore")} className="btn-pill btn-accent animate-fade-up delay-200">
              Explore Materials <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </section>

      {/* Floating mobile scan button */}
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
