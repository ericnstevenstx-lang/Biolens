import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Scan, AlertTriangle, Leaf, ArrowRight, ChevronDown, ScanBarcode, Globe, ShoppingBag, BarChart3, Droplets } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import BarcodeScanner from "@/components/BarcodeScanner";
import ScanHistory from "@/components/ScanHistory";
import { getScanHistory, clearScanHistory, fetchGlobalImpact } from "@/lib/biolens";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EXAMPLE_SEARCHES = [
  "poly hoodie",
  "bamboo sheets",
  "pet bottle",
  "vegan leather bag",
  "plastic cutting board",
  "nylon rope",
];

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

  const scrollToCards = () => {
    document.getElementById("how-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleBarcodeScan = async (barcode) => {
    setShowScanner(false);
    setScanLoading(true);
    try {
      // Lookup barcode via backend proxy
      const res = await axios.post(`${API}/barcode/lookup`, { barcode });
      const product = res.data;
      if (product && product.title) {
        navigate(`/results?q=${encodeURIComponent(product.title)}&barcode=${encodeURIComponent(barcode)}`);
      } else {
        // Fallback: use barcode number as query
        navigate(`/results?q=${encodeURIComponent(barcode)}&barcode=${encodeURIComponent(barcode)}`);
      }
    } catch (err) {
      // Fallback: use barcode number
      navigate(`/results?q=${encodeURIComponent(barcode)}&barcode=${encodeURIComponent(barcode)}`);
    } finally {
      setScanLoading(false);
    }
  };

  return (
    <div data-testid="home-page">
      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Hero */}
      <section
        data-testid="hero-section"
        className="pt-32 pb-24 md:pt-44 md:pb-32 px-6 md:px-12 lg:px-24"
      >
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight animate-fade-up"
              style={{ fontFamily: "'Playfair Display', serif", color: '#1D1D1F' }}
            >
              See what your products are{" "}
              <span style={{ color: '#B45309' }}>really</span> made of.
            </h1>

            <p
              className="mt-6 text-base md:text-lg leading-relaxed animate-fade-up delay-100 max-w-xl"
              style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
            >
              Search or scan everyday products and instantly learn their petrochemical dependency,
              material classification, and better alternatives.
            </p>

            {/* Search bar */}
            <div className="mt-10 animate-fade-up delay-200">
              <SearchBar size="large" />
            </div>

            {/* Scan button */}
            <div className="mt-4 animate-fade-up delay-300">
              <button
                data-testid="scan-product-button"
                onClick={() => setShowScanner(true)}
                disabled={scanLoading}
                className="btn-pill btn-accent flex items-center gap-2"
              >
                <ScanBarcode className="w-4 h-4" />
                {scanLoading ? "Looking up product..." : "Scan Product"}
              </button>
            </div>

            {/* Quick examples */}
            <div className="mt-6 flex flex-wrap gap-2 animate-fade-up delay-400">
              <span
                className="text-xs font-medium mr-1 self-center"
                style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
              >
                Try:
              </span>
              {EXAMPLE_SEARCHES.map((term) => (
                <button
                  key={term}
                  data-testid={`example-search-${term.replace(/\s+/g, '-')}`}
                  onClick={() => navigate(`/results?q=${encodeURIComponent(term)}`)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    backgroundColor: 'rgba(29, 29, 31, 0.05)',
                    color: '#1D1D1F',
                    border: '1px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = '#B45309';
                    e.target.style.color = '#B45309';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = 'transparent';
                    e.target.style.color = '#1D1D1F';
                  }}
                >
                  {term}
                </button>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-10 flex flex-wrap gap-4 animate-fade-up delay-500">
              <button
                data-testid="cta-how-it-works"
                onClick={scrollToCards}
                className="btn-pill btn-secondary flex items-center gap-2"
              >
                How it Works
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Scan History */}
      {history.length > 0 && (
        <section
          data-testid="scan-history-section"
          className="pb-8 px-6 md:px-12 lg:px-24"
        >
          <div className="max-w-7xl mx-auto">
            <ScanHistory history={history} onClear={handleClearHistory} />
          </div>
        </section>
      )}

      {/* Explainer cards */}
      <section
        id="how-section"
        data-testid="explainer-cards-section"
        className="py-24 md:py-32 px-6 md:px-12 lg:px-24"
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: <Scan className="w-6 h-6" />,
                title: "Material Check",
                description: "Find out whether a product is petroleum-based, plant-based, or transitional. See its Petroload score instantly.",
                color: "#B45309",
                delay: "delay-100",
              },
              {
                icon: <AlertTriangle className="w-6 h-6" />,
                title: "Why It Matters",
                description: "Understand petrochemical dependency in everyday products and its environmental impact.",
                color: "#BE123C",
                delay: "delay-200",
              },
              {
                icon: <Leaf className="w-6 h-6" />,
                title: "Better Alternatives",
                description: "Discover materials that can replace petroleum-heavy products with lower environmental impact.",
                color: "#15803d",
                delay: "delay-300",
              },
            ].map((card) => (
              <div
                key={card.title}
                data-testid={`explainer-card-${card.title.toLowerCase().replace(/\s+/g, '-')}`}
                className={`card-lift bg-white rounded-2xl p-8 md:p-10 border animate-fade-up ${card.delay}`}
                style={{ borderColor: '#E5E5E5' }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                  style={{ backgroundColor: `${card.color}10`, color: card.color }}
                >
                  {card.icon}
                </div>
                <h3
                  className="text-xl font-semibold mb-3"
                  style={{ fontFamily: "'Playfair Display', serif", color: '#1D1D1F' }}
                >
                  {card.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
                >
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Global Impact Counters */}
      {globalImpact && (
        <section
          data-testid="global-impact-section"
          className="py-16 md:py-24 px-6 md:px-12 lg:px-24"
        >
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10 animate-fade-up">
              <h2
                className="text-3xl sm:text-4xl font-semibold mb-3"
                style={{ fontFamily: "'Playfair Display', serif", color: '#1D1D1F' }}
              >
                Community Impact
              </h2>
              <p
                className="text-sm max-w-lg mx-auto"
                style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
              >
                Every scan and conscious purchase contributes to a cleaner material economy.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[
                { label: "Total Scans", value: globalImpact.scans_total, icon: <BarChart3 className="w-5 h-5" />, color: "#B45309" },
                { label: "Purchases", value: globalImpact.purchases_total, icon: <ShoppingBag className="w-5 h-5" />, color: "#15803d" },
                { label: "Petro $ Replaced", value: globalImpact.petro_dollars_replaced != null ? `$${Number(globalImpact.petro_dollars_replaced).toLocaleString()}` : "0", icon: <Globe className="w-5 h-5" />, color: "#BE123C" },
                { label: "Microplastic Avoided", value: globalImpact.microplastic_avoidance_units || 0, icon: <Droplets className="w-5 h-5" />, color: "#EA580C" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  data-testid={`impact-stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}
                  className="card-lift bg-white rounded-2xl p-6 border text-center animate-fade-up"
                  style={{ borderColor: '#E5E5E5' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                    style={{ backgroundColor: `${stat.color}10`, color: stat.color }}
                  >
                    {stat.icon}
                  </div>
                  <p
                    className="text-2xl font-semibold tabular-nums"
                    style={{ fontFamily: "'Playfair Display', serif", color: '#1D1D1F' }}
                  >
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </p>
                  <p
                    className="text-xs mt-1 font-medium"
                    style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA section */}
      <section
        data-testid="cta-section"
        className="py-24 md:py-32 px-6 md:px-12 lg:px-24"
      >
        <div className="max-w-7xl mx-auto">
          <div
            className="rounded-2xl p-12 md:p-16 text-center"
            style={{ backgroundColor: '#1D1D1F' }}
          >
            <h2
              className="text-3xl sm:text-4xl font-semibold mb-4 animate-fade-up"
              style={{ fontFamily: "'Playfair Display', serif", color: '#F5F5F7' }}
            >
              Explore the materials around you
            </h2>
            <p
              className="text-base mb-8 animate-fade-up delay-100 max-w-lg mx-auto"
              style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
            >
              Browse our growing library of materials and learn what makes each one unique.
            </p>
            <button
              data-testid="cta-explore-materials"
              onClick={() => navigate("/explore")}
              className="btn-pill btn-accent animate-fade-up delay-200"
            >
              Explore Materials
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
